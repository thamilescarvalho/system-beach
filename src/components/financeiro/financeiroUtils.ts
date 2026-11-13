import type {
  ContaFinanceira,
  MovimentacaoCaixa,
  PagamentoGarcom,
  VendaFechada
} from '../../types';

export const METODOS_PAGAMENTO_PDV = ['PIX', 'Crédito', 'Débito', 'Dinheiro'] as const;

export const METODOS_PAGAMENTO_SAIDA = [
  'PIX',
  'Dinheiro',
  'Débito',
  'Crédito',
  'Boleto / Outros'
] as const;

export const CATEGORIAS_ENTRADA_CAIXA = [
  'Reforço de Caixa',
  'Aporte de Sócio',
  'Eventos / Delivery',
  'Reembolso',
  'Outros'
] as const;

export const CATEGORIAS_SAIDA_CAIXA = [
  'Compras / Estoque',
  'Gelo / Gás / Insumos',
  'Equipe / Diária Extra',
  'Aluguel / Contas',
  'Manutenção / Equip.',
  'Sangria / Retirada',
  'Outros'
] as const;

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function obterDataLocalYYYYMMDD(dataInput?: string | Date): string {
  if (typeof dataInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataInput.trim())) {
    return dataInput.trim();
  }
  const dt = dataInput ? new Date(dataInput) : new Date();
  if (Number.isNaN(dt.getTime())) {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  }
  return dt.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function formatarMascaraValorDigitado(valorStr: string): { texto: string; numero: number } {
  const digitos = valorStr.replace(/\D/g, '');
  if (!digitos) return { texto: '', numero: 0 };
  const numero = Number(digitos) / 100;
  return {
    texto: numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    numero
  };
}

export interface ResumoSaldoConta {
  conta: ContaFinanceira;
  saldoAtual: number;
  entradasPdv: number;
  entradasManuais: number;
  saidasTotal: number;
}

export function resolverContaPadraoVendas(contas: ContaFinanceira[]): ContaFinanceira | undefined {
  const contasAtivas = contas.filter((c) => c.ativo);
  return contasAtivas.find((c) => c.padrao) || contasAtivas[0];
}

export function resolverContaIdDaVenda(
  venda: Pick<VendaFechada, 'contaId'>,
  contasDisponiveis: Map<string, unknown>,
  contaPadraoId?: string
): string | undefined {
  if (venda.contaId && contasDisponiveis.has(venda.contaId)) {
    return venda.contaId;
  }
  return contaPadraoId;
}

export function calcularSaldosPorConta(
  contas: ContaFinanceira[],
  vendas: VendaFechada[],
  movimentacoes: MovimentacaoCaixa[],
  pagamentos: PagamentoGarcom[]
): {
  porConta: Map<string, ResumoSaldoConta>;
  saldoConsolidado: number;
  idContaPadrao?: string;
  idContaDinheiroPadrao?: string;
  idContaDigitalPadrao?: string;
} {
  const contasAtivas = contas.filter((c) => c.ativo);
  const porConta = new Map<string, ResumoSaldoConta>();

  for (const c of contas) {
    porConta.set(c.id, {
      conta: c,
      saldoAtual: c.saldoInicial,
      entradasPdv: 0,
      entradasManuais: 0,
      saidasTotal: 0
    });
  }

  const contaPadrao = resolverContaPadraoVendas(contas);

  const contaDinheiro =
    contasAtivas.find((c) => c.recebeDinheiroPdv) ||
    contaPadrao ||
    contasAtivas.find((c) => c.tipo === 'dinheiro') ||
    contasAtivas[0];

  const contaDigital =
    contasAtivas.find((c) => c.recebeDigitalPdv) ||
    contaPadrao ||
    contasAtivas.find((c) => c.tipo === 'banco' || c.tipo === 'maquininha') ||
    contasAtivas[0];

  // 1. Vendas das mesas não canceladas entram na conta registrada na venda (ou na conta padrão vigente)
  for (const venda of vendas) {
    if (venda.status === 'cancelada') continue;
    const targetId = resolverContaIdDaVenda(venda, porConta, contaPadrao?.id);
    if (!targetId) continue;
    const entry = porConta.get(targetId);
    if (!entry) continue;

    const pags = Array.isArray(venda.pagamentos) ? venda.pagamentos : [];
    const somaPags = pags.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    const valorVenda = pags.length > 0 && somaPags > 0 ? somaPags : Number(venda.total) || 0;
    entry.entradasPdv += valorVenda;
    entry.saldoAtual += valorVenda;
  }

  // 2. Movimentações manuais de caixa e compras vinculadas
  for (const mov of movimentacoes) {
    const val = Number(mov.valor) || 0;
    if (mov.tipo === 'entrada') {
      const origem = porConta.get(mov.contaId);
      if (origem) {
        origem.entradasManuais += val;
        origem.saldoAtual += val;
      }
    } else if (mov.tipo === 'saida') {
      const origem = porConta.get(mov.contaId);
      if (origem) {
        origem.saidasTotal += val;
        origem.saldoAtual -= val;
      }
    } else if (mov.tipo === 'transferencia') {
      const origem = porConta.get(mov.contaId);
      if (origem) {
        origem.saldoAtual -= val;
      }
      if (mov.contaDestinoId) {
        const destino = porConta.get(mov.contaDestinoId);
        if (destino) {
          destino.saldoAtual += val;
        }
      }
    }
  }

  // 3. Pagamentos / Vales já pagos (status === 'pago')
  for (const pg of pagamentos) {
    if (pg.status !== 'pago') continue;
    const targetId =
      (pg.contaId && porConta.has(pg.contaId) ? pg.contaId : undefined) ||
      contaPadrao?.id ||
      (String(pg.metodoPagamento || '').toLowerCase().includes('dinheiro')
        ? contaDinheiro?.id
        : contaDigital?.id || contaDinheiro?.id);
    if (!targetId) continue;
    const entry = porConta.get(targetId);
    if (entry) {
      const val = Number(pg.valor) || 0;
      entry.saidasTotal += val;
      entry.saldoAtual -= val;
    }
  }

  let saldoConsolidado = 0;
  for (const item of porConta.values()) {
    if (item.conta.ativo) {
      saldoConsolidado += item.saldoAtual;
    }
  }

  return {
    porConta,
    saldoConsolidado,
    idContaPadrao: contaPadrao?.id,
    idContaDinheiroPadrao: contaDinheiro?.id,
    idContaDigitalPadrao: contaDigital?.id
  };
}
