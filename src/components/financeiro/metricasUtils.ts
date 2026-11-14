import type {
  ContaFinanceira,
  MovimentacaoCaixa,
  NotaCompraEstoque,
  PagamentoGarcom,
  Produto,
  VendaFechada
} from '../../types';
import {
  obterDataLocalYYYYMMDD,
  resolverContaIdDaVenda,
  resolverContaPadraoVendas
} from './financeiroUtils';

export type PresetPeriodo = 'hoje' | 'ontem' | '7dias' | 'mes' | '30dias' | 'custom';
export type MetodoPagamentoChave = 'todos' | 'pix' | 'credito' | 'debito' | 'dinheiro' | 'outros';

export interface IntervaloDatas {
  inicio: string;
  fim: string;
}

export interface OpcaoMetodoEmoji {
  chave: MetodoPagamentoChave;
  emoji: string;
  label: string;
}

export interface OpcaoPeriodoEmoji {
  chave: PresetPeriodo;
  emoji: string;
  label: string;
}

export const OPCOES_PERIODO_HERO: OpcaoPeriodoEmoji[] = [
  { chave: 'hoje', emoji: '☀️', label: 'Hoje' },
  { chave: 'ontem', emoji: '⏪', label: 'Ontem' },
  { chave: '7dias', emoji: '📅', label: 'Últimos 7 dias' },
  { chave: 'mes', emoji: '🗓️', label: 'Este mês' },
  { chave: 'custom', emoji: '🎛️', label: 'Período personalizado' }
];

export const OPCOES_PERIODO_GLOBAL: OpcaoPeriodoEmoji[] = [
  { chave: 'hoje', emoji: '☀️', label: 'Hoje' },
  { chave: 'ontem', emoji: '⏪', label: 'Ontem' },
  { chave: '7dias', emoji: '📅', label: 'Últimos 7 dias' },
  { chave: 'mes', emoji: '🗓️', label: 'Este mês' },
  { chave: '30dias', emoji: '📊', label: 'Últimos 30 dias' },
  { chave: 'custom', emoji: '🎛️', label: 'Personalizado' }
];

export const OPCOES_METODO_EMOJI: OpcaoMetodoEmoji[] = [
  { chave: 'todos', emoji: '💠', label: 'Todas as formas' },
  { chave: 'pix', emoji: '⚡', label: 'PIX' },
  { chave: 'credito', emoji: '💳', label: 'Crédito' },
  { chave: 'debito', emoji: '🏦', label: 'Débito' },
  { chave: 'dinheiro', emoji: '💵', label: 'Dinheiro' },
  { chave: 'outros', emoji: '🧾', label: 'Boleto / Outros' }
];

/**
 * Converte YYYY-MM-DD para Date ancorado ao meio-dia de São Paulo (-03:00),
 * evitando deslocamentos de fuso ao somar ou subtrair dias.
 */
function paraDataMeioDiaSP(ymd: string): Date {
  const dt = new Date(`${ymd}T12:00:00-03:00`);
  if (Number.isNaN(dt.getTime())) {
    return new Date(`${obterDataLocalYYYYMMDD()}T12:00:00-03:00`);
  }
  return dt;
}

export function somarDiasYYYYMMDD(ymd: string, deltaDias: number): string {
  const dt = paraDataMeioDiaSP(ymd);
  dt.setDate(dt.getDate() + deltaDias);
  return obterDataLocalYYYYMMDD(dt);
}

export function calcularDiasNoIntervalo(inicio: string, fim: string): number {
  const dIni = paraDataMeioDiaSP(inicio);
  const dFim = paraDataMeioDiaSP(fim);
  return Math.max(1, Math.round((dFim.getTime() - dIni.getTime()) / 86400000) + 1);
}

export function calcularIntervaloPreset(
  preset: Exclude<PresetPeriodo, 'custom'>,
  referenciaYmd?: string
): IntervaloDatas {
  const hoje = referenciaYmd || obterDataLocalYYYYMMDD();
  if (preset === 'hoje') {
    return { inicio: hoje, fim: hoje };
  }
  if (preset === 'ontem') {
    const ontem = somarDiasYYYYMMDD(hoje, -1);
    return { inicio: ontem, fim: ontem };
  }
  if (preset === '7dias') {
    return { inicio: somarDiasYYYYMMDD(hoje, -6), fim: hoje };
  }
  if (preset === '30dias') {
    return { inicio: somarDiasYYYYMMDD(hoje, -29), fim: hoje };
  }
  // 'mes'
  return { inicio: `${hoje.slice(0, 7)}-01`, fim: hoje };
}

export function calcularPeriodoAnteriorEquivalente(inicio: string, fim: string): IntervaloDatas {
  const totalDias = calcularDiasNoIntervalo(inicio, fim);
  const prevFim = somarDiasYYYYMMDD(inicio, -1);
  const prevInicio = somarDiasYYYYMMDD(prevFim, -(totalDias - 1));
  return { inicio: prevInicio, fim: prevFim };
}

export function formatarDataCurtaBR(ymd: string): string {
  const partes = ymd.split('-');
  if (partes.length !== 3) return ymd;
  return `${partes[2]}/${partes[1]}`;
}

export function formatarRotuloIntervalo(inicio: string, fim: string, hojeYmd: string): string {
  const ontemYmd = somarDiasYYYYMMDD(hojeYmd, -1);
  if (inicio === hojeYmd && fim === hojeYmd) return 'Hoje';
  if (inicio === ontemYmd && fim === ontemYmd) return 'Ontem';
  if (inicio === fim) return formatarDataCurtaBR(inicio);
  return `${formatarDataCurtaBR(inicio)} – ${formatarDataCurtaBR(fim)}`;
}

export function calcularVariacaoPercentual(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior)) return null;
  if (anterior === 0) return atual === 0 ? 0 : null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}

export function normalizarMetodoPagamento(raw?: string | null): Exclude<MetodoPagamentoChave, 'todos'> {
  const texto = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (texto.includes('PIX')) return 'pix';
  if (texto.includes('CRED')) return 'credito';
  if (texto.includes('DEB')) return 'debito';
  if (texto.includes('DINHEIRO') || texto.includes('ESPECIE')) return 'dinheiro';
  return 'outros';
}

export function extrairHoraSaoPaulo(isoString: string): number {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return 12;
  const horaStr = dt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo'
  });
  const hora = parseInt(horaStr, 10);
  return Number.isFinite(hora) ? Math.min(23, Math.max(0, hora)) : 12;
}

function criarMapaContaVenda(
  contasFinanceiras: ContaFinanceira[]
): {
  mapaContas: Map<string, ContaFinanceira>;
  contaPadraoId?: string;
} {
  const mapaContas = new Map<string, ContaFinanceira>();
  contasFinanceiras.forEach((c) => mapaContas.set(c.id, c));
  const contaPadrao = resolverContaPadraoVendas(contasFinanceiras);
  return { mapaContas, contaPadraoId: contaPadrao?.id };
}

function vendaPertenceConta(
  venda: VendaFechada,
  contaFiltroId: string | null,
  mapaContas: Map<string, ContaFinanceira>,
  contaPadraoId?: string
): boolean {
  if (!contaFiltroId) return true;
  return resolverContaIdDaVenda(venda, mapaContas, contaPadraoId) === contaFiltroId;
}

function obterContaDoVale(
  vale: PagamentoGarcom,
  contasFinanceiras: ContaFinanceira[],
  contaPadraoId?: string
): string | undefined {
  if (vale.contaId) return vale.contaId;
  if (contaPadraoId) return contaPadraoId;
  const ativo = contasFinanceiras.filter((c) => c.ativo);
  const emDinheiro = String(vale.metodoPagamento || '').toLowerCase().includes('dinheiro');
  if (emDinheiro) {
    return (
      ativo.find((c) => c.recebeDinheiroPdv)?.id ||
      ativo.find((c) => c.tipo === 'dinheiro')?.id ||
      ativo[0]?.id
    );
  }
  return (
    ativo.find((c) => c.recebeDigitalPdv)?.id ||
    ativo.find((c) => c.tipo === 'banco' || c.tipo === 'maquininha')?.id ||
    ativo[0]?.id
  );
}

export interface ResumoVendasPeriodo {
  quantidadeConcluidas: number;
  quantidadeCanceladas: number;
  faturamentoConcluidas: number;
  valorCanceladas: number;
  ticketMedio: number;
  totalItensVendidos: number;
  itensPorVenda: number;
  taxaCancelamentoPct: number;
  deltaQuantidadePct: number | null;
  deltaTicketPct: number | null;
  ritmoBuckets: { label: string; quantidade: number; valor: number }[];
  picoHorarioLabel: string | null;
  picoHorarioQtd: number;
}

export function calcularResumoVendasPeriodo(params: {
  vendas: VendaFechada[];
  contasFinanceiras: ContaFinanceira[];
  inicio: string;
  fim: string;
  contaFiltroId?: string | null;
}): ResumoVendasPeriodo {
  const { vendas, contasFinanceiras, inicio, fim, contaFiltroId = null } = params;
  const { mapaContas, contaPadraoId } = criarMapaContaVenda(contasFinanceiras);
  const prev = calcularPeriodoAnteriorEquivalente(inicio, fim);

  let quantidadeConcluidas = 0;
  let quantidadeCanceladas = 0;
  let faturamentoConcluidas = 0;
  let valorCanceladas = 0;
  let totalItensVendidos = 0;

  let prevQtdConcluidas = 0;
  let prevFaturamento = 0;

  const vendasAtuaisValidas: VendaFechada[] = [];

  for (const v of vendas) {
    if (!vendaPertenceConta(v, contaFiltroId, mapaContas, contaPadraoId)) continue;
    const dt = obterDataLocalYYYYMMDD(v.dataFechamento);

    if (dt >= inicio && dt <= fim) {
      if (v.status === 'cancelada') {
        quantidadeCanceladas += 1;
        valorCanceladas += Number(v.total) || 0;
      } else {
        quantidadeConcluidas += 1;
        faturamentoConcluidas += Number(v.total) || 0;
        vendasAtuaisValidas.push(v);

        if (Array.isArray(v.itens)) {
          for (const item of v.itens) {
            if (item.id === 'taxa-servico-10') continue;
            totalItensVendidos += Number(item.quantidade) || 0;
          }
        }
      }
    } else if (dt >= prev.inicio && dt <= prev.fim && v.status !== 'cancelada') {
      prevQtdConcluidas += 1;
      prevFaturamento += Number(v.total) || 0;
    }
  }

  const ticketMedio = quantidadeConcluidas > 0 ? faturamentoConcluidas / quantidadeConcluidas : 0;
  const prevTicket = prevQtdConcluidas > 0 ? prevFaturamento / prevQtdConcluidas : 0;
  const itensPorVenda = quantidadeConcluidas > 0 ? totalItensVendidos / quantidadeConcluidas : 0;
  const totalVendasGeral = quantidadeConcluidas + quantidadeCanceladas;
  const taxaCancelamentoPct = totalVendasGeral > 0 ? (quantidadeCanceladas / totalVendasGeral) * 100 : 0;

  // Buckets para ritmo (6 janelas horárias se 1 dia; até 14 dias diário; senão semanal/mensal)
  let ritmoBuckets: { label: string; quantidade: number; valor: number }[];
  let picoHorarioLabel: string | null = null;
  let picoHorarioQtd = 0;

  if (inicio === fim) {
    const janelas = [
      { label: '08h–11h', short: '09h', minH: 0, maxH: 11, quantidade: 0, valor: 0 },
      { label: '12h–13h', short: '12h', minH: 12, maxH: 13, quantidade: 0, valor: 0 },
      { label: '14h–15h', short: '15h', minH: 14, maxH: 15, quantidade: 0, valor: 0 },
      { label: '16h–17h', short: '17h', minH: 16, maxH: 17, quantidade: 0, valor: 0 },
      { label: '18h–20h', short: '19h', minH: 18, maxH: 20, quantidade: 0, valor: 0 },
      { label: '21h–23h', short: '22h', minH: 21, maxH: 24, quantidade: 0, valor: 0 }
    ];

    for (const v of vendasAtuaisValidas) {
      const h = extrairHoraSaoPaulo(v.dataFechamento);
      const alvo = janelas.find((j) => h >= j.minH && h <= j.maxH) || janelas[janelas.length - 1];
      alvo.quantidade += 1;
      alvo.valor += Number(v.total) || 0;
    }

    janelas.forEach((j) => {
      if (j.quantidade > picoHorarioQtd) {
        picoHorarioQtd = j.quantidade;
        picoHorarioLabel = j.label;
      }
    });

    ritmoBuckets = janelas.map((j) => ({ label: j.short, quantidade: j.quantidade, valor: j.valor }));
  } else {
    const dias = calcularDiasNoIntervalo(inicio, fim);
    if (dias <= 14) {
      const mapa = new Map<string, { label: string; quantidade: number; valor: number }>();
      for (let i = 0; i < dias; i++) {
        const key = somarDiasYYYYMMDD(inicio, i);
        mapa.set(key, { label: formatarDataCurtaBR(key), quantidade: 0, valor: 0 });
      }
      for (const v of vendasAtuaisValidas) {
        const key = obterDataLocalYYYYMMDD(v.dataFechamento);
        const slot = mapa.get(key);
        if (slot) {
          slot.quantidade += 1;
          slot.valor += Number(v.total) || 0;
        }
      }
      ritmoBuckets = Array.from(mapa.values());
    } else {
      // Agrupa em até 7 blocos proporcionais para manter a visualização limpa
      const blocos = 7;
      const tamBloco = Math.ceil(dias / blocos);
      const lista = Array.from({ length: blocos }, (_, idx) => {
        const bIni = somarDiasYYYYMMDD(inicio, idx * tamBloco);
        const bFim = somarDiasYYYYMMDD(inicio, Math.min(dias - 1, (idx + 1) * tamBloco - 1));
        return { ini: bIni, fim: bFim, label: formatarDataCurtaBR(bIni), quantidade: 0, valor: 0 };
      }).filter((b) => b.ini <= fim);

      for (const v of vendasAtuaisValidas) {
        const key = obterDataLocalYYYYMMDD(v.dataFechamento);
        const alvo = lista.find((b) => key >= b.ini && key <= b.fim);
        if (alvo) {
          alvo.quantidade += 1;
          alvo.valor += Number(v.total) || 0;
        }
      }
      ritmoBuckets = lista.map((b) => ({ label: b.label, quantidade: b.quantidade, valor: b.valor }));
    }
  }

  return {
    quantidadeConcluidas,
    quantidadeCanceladas,
    faturamentoConcluidas,
    valorCanceladas,
    ticketMedio,
    totalItensVendidos,
    itensPorVenda,
    taxaCancelamentoPct,
    deltaQuantidadePct: calcularVariacaoPercentual(quantidadeConcluidas, prevQtdConcluidas),
    deltaTicketPct: calcularVariacaoPercentual(ticketMedio, prevTicket),
    ritmoBuckets,
    picoHorarioLabel,
    picoHorarioQtd
  };
}

export interface DetalheMetodoRecebido {
  chave: Exclude<MetodoPagamentoChave, 'todos'>;
  emoji: string;
  label: string;
  total: number;
  valorVendas: number;
  valorEntradasManuais: number;
  qtdVendas: number;
  qtdEntradasManuais: number;
  participacaoPct: number;
}

export interface ResumoRecebimentosPorMetodo {
  totalSelecionado: number;
  valorVendasSelecionado: number;
  valorEntradasManuaisSelecionado: number;
  qtdVendasSelecionado: number;
  qtdEntradasManuaisSelecionado: number;
  totalGeralPeriodo: number;
  deltaTotalPct: number | null;
  detalhesPorMetodo: DetalheMetodoRecebido[];
}

/**
 * Calcula recebimentos reais (Vendas PDV válidas + Entradas manuais do financeiro)
 * segmentados por forma de pagamento e período, com comparativo equivalente.
 */
export function calcularRecebimentosPorMetodo(params: {
  vendas: VendaFechada[];
  movimentacoes: MovimentacaoCaixa[];
  contasFinanceiras: ContaFinanceira[];
  inicio: string;
  fim: string;
  metodoSelecionado: MetodoPagamentoChave;
  contaFiltroId?: string | null;
}): ResumoRecebimentosPorMetodo {
  const {
    vendas,
    movimentacoes,
    contasFinanceiras,
    inicio,
    fim,
    metodoSelecionado,
    contaFiltroId = null
  } = params;
  const { mapaContas, contaPadraoId } = criarMapaContaVenda(contasFinanceiras);
  const prev = calcularPeriodoAnteriorEquivalente(inicio, fim);

  const acumuladores = new Map<
    Exclude<MetodoPagamentoChave, 'todos'>,
    Omit<DetalheMetodoRecebido, 'participacaoPct'>
  >();

  OPCOES_METODO_EMOJI.forEach((opt) => {
    if (opt.chave === 'todos') return;
    acumuladores.set(opt.chave, {
      chave: opt.chave,
      emoji: opt.emoji,
      label: opt.label,
      total: 0,
      valorVendas: 0,
      valorEntradasManuais: 0,
      qtdVendas: 0,
      qtdEntradasManuais: 0
    });
  });

  let prevTotalSelecionado = 0;

  const processarVenda = (v: VendaFechada, ehAtual: boolean) => {
    if (v.status === 'cancelada') return;
    if (!vendaPertenceConta(v, contaFiltroId, mapaContas, contaPadraoId)) return;

    const pags =
      Array.isArray(v.pagamentos) && v.pagamentos.length > 0
        ? v.pagamentos
        : [{ metodo: 'Não Especificado', valor: v.total }];

    const metodosVistosNaVenda = new Set<Exclude<MetodoPagamentoChave, 'todos'>>();

    for (const pag of pags) {
      const val = Number(pag.valor) || 0;
      if (val <= 0) continue;
      const chave = normalizarMetodoPagamento(pag.metodo);

      if (ehAtual) {
        const entry = acumuladores.get(chave);
        if (entry) {
          entry.valorVendas += val;
          entry.total += val;
          if (!metodosVistosNaVenda.has(chave)) {
            entry.qtdVendas += 1;
            metodosVistosNaVenda.add(chave);
          }
        }
      } else if (metodoSelecionado === 'todos' || metodoSelecionado === chave) {
        prevTotalSelecionado += val;
      }
    }
  };

  for (const v of vendas) {
    const dt = obterDataLocalYYYYMMDD(v.dataFechamento);
    if (dt >= inicio && dt <= fim) processarVenda(v, true);
    else if (dt >= prev.inicio && dt <= prev.fim) processarVenda(v, false);
  }

  for (const m of movimentacoes) {
    if (m.tipo !== 'entrada') continue;
    if (contaFiltroId && m.contaId !== contaFiltroId) continue;

    const dt = obterDataLocalYYYYMMDD(m.dataMovimentacao);
    const val = Number(m.valor) || 0;
    if (val <= 0) continue;

    const chave = normalizarMetodoPagamento(m.metodoPagamento);

    if (dt >= inicio && dt <= fim) {
      const entry = acumuladores.get(chave);
      if (entry) {
        entry.valorEntradasManuais += val;
        entry.total += val;
        entry.qtdEntradasManuais += 1;
      }
    } else if (dt >= prev.inicio && dt <= prev.fim) {
      if (metodoSelecionado === 'todos' || metodoSelecionado === chave) {
        prevTotalSelecionado += val;
      }
    }
  }

  const listaBruta = Array.from(acumuladores.values());
  const totalGeralPeriodo = listaBruta.reduce((acc, item) => acc + item.total, 0);

  const detalhesPorMetodo: DetalheMetodoRecebido[] = listaBruta
    .map((item) => ({
      ...item,
      participacaoPct: totalGeralPeriodo > 0 ? (item.total / totalGeralPeriodo) * 100 : 0
    }))
    .sort((a, b) => b.total - a.total);

  if (metodoSelecionado === 'todos') {
    const valorVendasSelecionado = detalhesPorMetodo.reduce((acc, i) => acc + i.valorVendas, 0);
    const valorEntradasManuaisSelecionado = detalhesPorMetodo.reduce(
      (acc, i) => acc + i.valorEntradasManuais,
      0
    );
    const qtdVendasSelecionado = detalhesPorMetodo.reduce((acc, i) => acc + i.qtdVendas, 0);
    const qtdEntradasManuaisSelecionado = detalhesPorMetodo.reduce(
      (acc, i) => acc + i.qtdEntradasManuais,
      0
    );

    return {
      totalSelecionado: totalGeralPeriodo,
      valorVendasSelecionado,
      valorEntradasManuaisSelecionado,
      qtdVendasSelecionado,
      qtdEntradasManuaisSelecionado,
      totalGeralPeriodo,
      deltaTotalPct: calcularVariacaoPercentual(totalGeralPeriodo, prevTotalSelecionado),
      detalhesPorMetodo
    };
  }

  const alvo = detalhesPorMetodo.find((d) => d.chave === metodoSelecionado);
  const totalSelecionado = alvo?.total ?? 0;

  return {
    totalSelecionado,
    valorVendasSelecionado: alvo?.valorVendas ?? 0,
    valorEntradasManuaisSelecionado: alvo?.valorEntradasManuais ?? 0,
    qtdVendasSelecionado: alvo?.qtdVendas ?? 0,
    qtdEntradasManuaisSelecionado: alvo?.qtdEntradasManuais ?? 0,
    totalGeralPeriodo,
    deltaTotalPct: calcularVariacaoPercentual(totalSelecionado, prevTotalSelecionado),
    detalhesPorMetodo
  };
}

export interface PontoComparativoFluxo {
  label: string;
  entradas: number;
  saidas: number;
  liquido: number;
}

export interface ItemRanking {
  nome: string;
  subtitulo: string;
  valor: number;
  quantidade: number;
  participacaoPct: number;
  margemPct?: number | null;
}

export interface ResumoExecutivoBI {
  entradasPdv: number;
  entradasManuais: number;
  entradasTotal: number;
  saidasManuais: number;
  saidasVales: number;
  saidasTotal: number;
  resultadoLiquido: number;
  margemLiquidaCaixaPct: number;
  indiceComprometimentoSaidasPct: number;
  deltaEntradasPct: number | null;
  deltaSaidasPct: number | null;
  deltaResultadoPct: number | null;
  // CMV & Margem Bruta (Produtos)
  receitaProdutos: number;
  cmvEstimado: number;
  lucroBrutoEstimado: number;
  margemBrutaProdutosPct: number | null;
  coberturaCustoPct: number;
  taxaServicoTotal: number;
  // Notas de Compra no Período
  totalNotasAtivas: number;
  qtdNotasAtivas: number;
  // Série temporal Entradas x Saídas
  serieTemporal: PontoComparativoFluxo[];
  picoEntradaLabel: string | null;
  picoEntradaValor: number;
  // Rankings
  rankingProdutos: ItemRanking[];
  rankingCategorias: ItemRanking[];
  rankingGarcons: ItemRanking[];
  rankingSaidasCategorias: ItemRanking[];
  // Insights executivos determinísticos
  insights: string[];
}

export function calcularResumoExecutivoBI(params: {
  vendas: VendaFechada[];
  movimentacoes: MovimentacaoCaixa[];
  pagamentos: PagamentoGarcom[];
  notasCompra: NotaCompraEstoque[];
  contasFinanceiras: ContaFinanceira[];
  produtos: Produto[];
  inicio: string;
  fim: string;
  contaFiltroId?: string | null;
}): ResumoExecutivoBI {
  const {
    vendas,
    movimentacoes,
    pagamentos,
    notasCompra,
    contasFinanceiras,
    produtos,
    inicio,
    fim,
    contaFiltroId = null
  } = params;

  const { mapaContas, contaPadraoId } = criarMapaContaVenda(contasFinanceiras);
  const prev = calcularPeriodoAnteriorEquivalente(inicio, fim);

  const mapaCustoProduto = new Map<number, { custo: number; categoria: string }>();
  produtos.forEach((p) => {
    mapaCustoProduto.set(p.id, {
      custo: Number(p.precoCusto) || 0,
      categoria: p.categoria || 'Geral'
    });
  });

  let entradasPdv = 0;
  let entradasManuais = 0;
  let saidasManuais = 0;
  let saidasVales = 0;

  let prevEntradas = 0;
  let prevSaidas = 0;

  let receitaProdutos = 0;
  let receitaProdutosComCusto = 0;
  let cmvEstimado = 0;
  let taxaServicoTotal = 0;

  const prodMap = new Map<
    string,
    { nome: string; categoria: string; valor: number; quantidade: number; custoTotal: number; temCusto: boolean }
  >();
  const catMap = new Map<string, { valor: number; quantidade: number }>();
  const garcomMap = new Map<string, { valor: number; quantidade: number }>();
  const saidaCatMap = new Map<string, { valor: number; quantidade: number }>();

  const vendasValidasPeriodo: VendaFechada[] = [];
  const movsPeriodo: MovimentacaoCaixa[] = [];
  const valesPeriodo: PagamentoGarcom[] = [];

  for (const v of vendas) {
    if (v.status === 'cancelada') continue;
    if (!vendaPertenceConta(v, contaFiltroId, mapaContas, contaPadraoId)) continue;

    const dt = obterDataLocalYYYYMMDD(v.dataFechamento);
    const valTotal = Number(v.total) || 0;

    if (dt >= inicio && dt <= fim) {
      entradasPdv += valTotal;
      vendasValidasPeriodo.push(v);

      const gNome = (v.garcomNome || 'Equipe').trim() || 'Equipe';
      const gEntry = garcomMap.get(gNome) || { valor: 0, quantidade: 0 };
      gEntry.valor += valTotal;
      gEntry.quantidade += 1;
      garcomMap.set(gNome, gEntry);

      if (Array.isArray(v.itens)) {
        for (const item of v.itens) {
          const qtd = Number(item.quantidade) || 0;
          const precoUnit = Number(item.produto?.preco) || 0;
          const subtotalItem = precoUnit * qtd;

          if (item.id === 'taxa-servico-10') {
            taxaServicoTotal += subtotalItem;
            continue;
          }

          receitaProdutos += subtotalItem;

          const infoCatalogo = item.produto?.id ? mapaCustoProduto.get(item.produto.id) : undefined;
          const custoUnit = Number(item.produto?.precoCusto) || infoCatalogo?.custo || 0;
          const catNome = (item.produto?.categoria || infoCatalogo?.categoria || 'OUTROS').trim().toUpperCase();

          if (custoUnit > 0) {
            receitaProdutosComCusto += subtotalItem;
            cmvEstimado += custoUnit * qtd;
          }

          const prodNome = (item.produto?.nome || 'PRODUTO').trim().toUpperCase();
          const pKey = `${item.produto?.id ?? prodNome}`;
          const pEntry = prodMap.get(pKey) || {
            nome: prodNome,
            categoria: catNome,
            valor: 0,
            quantidade: 0,
            custoTotal: 0,
            temCusto: false
          };
          pEntry.valor += subtotalItem;
          pEntry.quantidade += qtd;
          if (custoUnit > 0) {
            pEntry.custoTotal += custoUnit * qtd;
            pEntry.temCusto = true;
          }
          prodMap.set(pKey, pEntry);

          const cEntry = catMap.get(catNome) || { valor: 0, quantidade: 0 };
          cEntry.valor += subtotalItem;
          cEntry.quantidade += qtd;
          catMap.set(catNome, cEntry);
        }
      }
    } else if (dt >= prev.inicio && dt <= prev.fim) {
      prevEntradas += valTotal;
    }
  }

  for (const m of movimentacoes) {
    const dt = obterDataLocalYYYYMMDD(m.dataMovimentacao);
    const val = Number(m.valor) || 0;

    if (m.tipo === 'transferencia') {
      if (!contaFiltroId) continue;
      const ehEntradaConta = m.contaDestinoId === contaFiltroId;
      const ehSaidaConta = m.contaId === contaFiltroId;
      if (!ehEntradaConta && !ehSaidaConta) continue;

      if (dt >= inicio && dt <= fim) {
        if (ehEntradaConta) entradasManuais += val;
        if (ehSaidaConta) saidasManuais += val;
        movsPeriodo.push(m);
      } else if (dt >= prev.inicio && dt <= prev.fim) {
        if (ehEntradaConta) prevEntradas += val;
        if (ehSaidaConta) prevSaidas += val;
      }
      continue;
    }

    if (contaFiltroId && m.contaId !== contaFiltroId) continue;

    if (dt >= inicio && dt <= fim) {
      movsPeriodo.push(m);
      if (m.tipo === 'entrada') {
        entradasManuais += val;
      } else if (m.tipo === 'saida') {
        saidasManuais += val;
        const cat = (m.categoria || 'Outros').trim();
        const sEntry = saidaCatMap.get(cat) || { valor: 0, quantidade: 0 };
        sEntry.valor += val;
        sEntry.quantidade += 1;
        saidaCatMap.set(cat, sEntry);
      }
    } else if (dt >= prev.inicio && dt <= prev.fim) {
      if (m.tipo === 'entrada') prevEntradas += val;
      else if (m.tipo === 'saida') prevSaidas += val;
    }
  }

  for (const p of pagamentos) {
    if (p.status !== 'pago') continue;
    const contaVale = obterContaDoVale(p, contasFinanceiras, contaPadraoId);
    if (contaFiltroId && contaVale !== contaFiltroId) continue;

    const dt = obterDataLocalYYYYMMDD(p.data);
    const val = Number(p.valor) || 0;

    if (dt >= inicio && dt <= fim) {
      saidasVales += val;
      valesPeriodo.push(p);
      const sEntry = saidaCatMap.get('Vales / Equipe') || { valor: 0, quantidade: 0 };
      sEntry.valor += val;
      sEntry.quantidade += 1;
      saidaCatMap.set('Vales / Equipe', sEntry);
    } else if (dt >= prev.inicio && dt <= prev.fim) {
      prevSaidas += val;
    }
  }

  let totalNotasAtivas = 0;
  let qtdNotasAtivas = 0;
  for (const n of notasCompra) {
    if (n.status === 'estornada') continue;
    if (contaFiltroId && n.contaId !== contaFiltroId) continue;
    const dt = obterDataLocalYYYYMMDD(n.dataCompra);
    if (dt >= inicio && dt <= fim) {
      totalNotasAtivas += Number(n.valorTotal) || 0;
      qtdNotasAtivas += 1;
    }
  }

  const entradasTotal = entradasPdv + entradasManuais;
  const saidasTotal = saidasManuais + saidasVales;
  const resultadoLiquido = entradasTotal - saidasTotal;
  const prevResultado = prevEntradas - prevSaidas;

  const margemLiquidaCaixaPct = entradasTotal > 0 ? (resultadoLiquido / entradasTotal) * 100 : 0;
  const indiceComprometimentoSaidasPct = entradasTotal > 0 ? (saidasTotal / entradasTotal) * 100 : 0;

  const coberturaCustoPct =
    receitaProdutos > 0 ? (receitaProdutosComCusto / receitaProdutos) * 100 : 0;
  const lucroBrutoEstimado = receitaProdutosComCusto - cmvEstimado;
  const margemBrutaProdutosPct =
    receitaProdutosComCusto > 0 ? (lucroBrutoEstimado / receitaProdutosComCusto) * 100 : null;

  // Série Temporal Comparativa Entradas x Saídas
  const serieTemporal: PontoComparativoFluxo[] = [];
  if (inicio === fim) {
    const slots = [
      { label: '08h', maxH: 10, ent: 0, sai: 0 },
      { label: '12h', maxH: 13, ent: 0, sai: 0 },
      { label: '15h', maxH: 16, ent: 0, sai: 0 },
      { label: '18h', maxH: 19, ent: 0, sai: 0 },
      { label: '21h', maxH: 22, ent: 0, sai: 0 },
      { label: '23h', maxH: 24, ent: 0, sai: 0 }
    ];
    const acharSlot = (iso: string) => {
      const h = extrairHoraSaoPaulo(iso);
      return slots.find((s) => h <= s.maxH) || slots[slots.length - 1];
    };
    vendasValidasPeriodo.forEach((v) => {
      acharSlot(v.dataFechamento).ent += Number(v.total) || 0;
    });
    movsPeriodo.forEach((m) => {
      const s = acharSlot(m.dataMovimentacao);
      if (m.tipo === 'entrada') s.ent += Number(m.valor) || 0;
      else if (m.tipo === 'saida') s.sai += Number(m.valor) || 0;
      else if (m.tipo === 'transferencia' && contaFiltroId) {
        if (m.contaDestinoId === contaFiltroId) s.ent += Number(m.valor) || 0;
        if (m.contaId === contaFiltroId) s.sai += Number(m.valor) || 0;
      }
    });
    valesPeriodo.forEach((p) => {
      slots[1].sai += Number(p.valor) || 0;
    });
    slots.forEach((s) => {
      serieTemporal.push({ label: s.label, entradas: s.ent, saidas: s.sai, liquido: s.ent - s.sai });
    });
  } else {
    const dias = calcularDiasNoIntervalo(inicio, fim);
    if (dias <= 31) {
      const mapa = new Map<string, { label: string; ent: number; sai: number }>();
      for (let i = 0; i < dias; i++) {
        const key = somarDiasYYYYMMDD(inicio, i);
        mapa.set(key, { label: formatarDataCurtaBR(key), ent: 0, sai: 0 });
      }
      vendasValidasPeriodo.forEach((v) => {
        const s = mapa.get(obterDataLocalYYYYMMDD(v.dataFechamento));
        if (s) s.ent += Number(v.total) || 0;
      });
      movsPeriodo.forEach((m) => {
        const s = mapa.get(obterDataLocalYYYYMMDD(m.dataMovimentacao));
        if (!s) return;
        if (m.tipo === 'entrada') s.ent += Number(m.valor) || 0;
        else if (m.tipo === 'saida') s.sai += Number(m.valor) || 0;
        else if (m.tipo === 'transferencia' && contaFiltroId) {
          if (m.contaDestinoId === contaFiltroId) s.ent += Number(m.valor) || 0;
          if (m.contaId === contaFiltroId) s.sai += Number(m.valor) || 0;
        }
      });
      valesPeriodo.forEach((p) => {
        const s = mapa.get(obterDataLocalYYYYMMDD(p.data));
        if (s) s.sai += Number(p.valor) || 0;
      });
      mapa.forEach((s) => {
        serieTemporal.push({ label: s.label, entradas: s.ent, saidas: s.sai, liquido: s.ent - s.sai });
      });
    } else {
      const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const mapaMes = new Map<string, { label: string; ent: number; sai: number }>();
      const garantir = (yyyyMm: string) => {
        if (!mapaMes.has(yyyyMm)) {
          const [, mm] = yyyyMm.split('-');
          const idx = Math.max(0, Math.min(11, parseInt(mm, 10) - 1));
          mapaMes.set(yyyyMm, { label: NOMES_MESES[idx], ent: 0, sai: 0 });
        }
        return mapaMes.get(yyyyMm)!;
      };
      vendasValidasPeriodo.forEach((v) => {
        garantir(obterDataLocalYYYYMMDD(v.dataFechamento).slice(0, 7)).ent += Number(v.total) || 0;
      });
      movsPeriodo.forEach((m) => {
        const s = garantir(obterDataLocalYYYYMMDD(m.dataMovimentacao).slice(0, 7));
        if (m.tipo === 'entrada') s.ent += Number(m.valor) || 0;
        else if (m.tipo === 'saida') s.sai += Number(m.valor) || 0;
        else if (m.tipo === 'transferencia' && contaFiltroId) {
          if (m.contaDestinoId === contaFiltroId) s.ent += Number(m.valor) || 0;
          if (m.contaId === contaFiltroId) s.sai += Number(m.valor) || 0;
        }
      });
      valesPeriodo.forEach((p) => {
        garantir(obterDataLocalYYYYMMDD(p.data).slice(0, 7)).sai += Number(p.valor) || 0;
      });
      mapaMes.forEach((s) => {
        serieTemporal.push({ label: s.label, entradas: s.ent, saidas: s.sai, liquido: s.ent - s.sai });
      });
    }
  }

  let picoEntradaLabel: string | null = null;
  let picoEntradaValor = 0;
  serieTemporal.forEach((p) => {
    if (p.entradas > picoEntradaValor) {
      picoEntradaValor = p.entradas;
      picoEntradaLabel = p.label;
    }
  });

  const rankingProdutos: ItemRanking[] = Array.from(prodMap.values())
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8)
    .map((p) => ({
      nome: p.nome,
      subtitulo: p.categoria,
      valor: p.valor,
      quantidade: p.quantidade,
      participacaoPct: receitaProdutos > 0 ? (p.valor / receitaProdutos) * 100 : 0,
      margemPct: p.temCusto && p.valor > 0 ? ((p.valor - p.custoTotal) / p.valor) * 100 : null
    }));

  const rankingCategorias: ItemRanking[] = Array.from(catMap.entries())
    .sort(([, a], [, b]) => b.valor - a.valor)
    .slice(0, 8)
    .map(([nome, info]) => ({
      nome,
      subtitulo: `${info.quantidade} un.`,
      valor: info.valor,
      quantidade: info.quantidade,
      participacaoPct: receitaProdutos > 0 ? (info.valor / receitaProdutos) * 100 : 0
    }));

  const rankingGarcons: ItemRanking[] = Array.from(garcomMap.entries())
    .sort(([, a], [, b]) => b.valor - a.valor)
    .slice(0, 8)
    .map(([nome, info]) => ({
      nome,
      subtitulo: `${info.quantidade} ${info.quantidade === 1 ? 'venda' : 'vendas'}`,
      valor: info.valor,
      quantidade: info.quantidade,
      participacaoPct: entradasPdv > 0 ? (info.valor / entradasPdv) * 100 : 0
    }));

  const rankingSaidasCategorias: ItemRanking[] = Array.from(saidaCatMap.entries())
    .sort(([, a], [, b]) => b.valor - a.valor)
    .slice(0, 8)
    .map(([nome, info]) => ({
      nome,
      subtitulo: `${info.quantidade} ${info.quantidade === 1 ? 'lançamento' : 'lançamentos'}`,
      valor: info.valor,
      quantidade: info.quantidade,
      participacaoPct: saidasTotal > 0 ? (info.valor / saidasTotal) * 100 : 0
    }));

  // Insights determinísticos
  const insights: string[] = [];
  if (rankingProdutos[0]) {
    insights.push(
      `Campeão de receita: ${rankingProdutos[0].nome} (${rankingProdutos[0].participacaoPct.toFixed(0)}% das vendas de itens).`
    );
  }
  if (picoEntradaLabel && picoEntradaValor > 0) {
    insights.push(`Maior concentração de entradas registrada em ${picoEntradaLabel}.`);
  }
  if (entradasTotal > 0) {
    if (saidasTotal === 0) {
      insights.push('Operação sem saídas registradas neste recorte (100% de eficiência de caixa).');
    } else {
      insights.push(
        `Saídas consumiram ${indiceComprometimentoSaidasPct.toFixed(1)}% do total de entradas no período.`
      );
    }
  }
  if (rankingGarcons[0] && rankingGarcons.length > 1) {
    insights.push(
      `Maior volume fechado por ${rankingGarcons[0].nome} (${rankingGarcons[0].quantidade} atendimentos).`
    );
  }

  return {
    entradasPdv,
    entradasManuais,
    entradasTotal,
    saidasManuais,
    saidasVales,
    saidasTotal,
    resultadoLiquido,
    margemLiquidaCaixaPct,
    indiceComprometimentoSaidasPct,
    deltaEntradasPct: calcularVariacaoPercentual(entradasTotal, prevEntradas),
    deltaSaidasPct: calcularVariacaoPercentual(saidasTotal, prevSaidas),
    deltaResultadoPct: calcularVariacaoPercentual(resultadoLiquido, prevResultado),
    receitaProdutos,
    cmvEstimado,
    lucroBrutoEstimado,
    margemBrutaProdutosPct,
    coberturaCustoPct,
    taxaServicoTotal,
    totalNotasAtivas,
    qtdNotasAtivas,
    serieTemporal,
    picoEntradaLabel,
    picoEntradaValor,
    rankingProdutos,
    rankingCategorias,
    rankingGarcons,
    rankingSaidasCategorias,
    insights
  };
}

export interface ResumoGuardaSolPeriodo {
  valorTotal: number;
  qtdVendasComGuardaSol: number;
  qtdUnidades: number;
  ticketMedioGuardaSol: number;
  deltaValorPct: number | null;
}

function ehTextoGuardaSol(texto?: string | null): boolean {
  const t = String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return t.includes('guarda-sol') || t.includes('guarda sol') || t.includes('guardasol');
}

export function calcularResumoGuardaSolPeriodo(params: {
  vendas: VendaFechada[];
  movimentacoes?: MovimentacaoCaixa[];
  contasFinanceiras: ContaFinanceira[];
  inicio: string;
  fim: string;
  contaFiltroId?: string | null;
}): ResumoGuardaSolPeriodo {
  const {
    vendas,
    movimentacoes = [],
    contasFinanceiras,
    inicio,
    fim,
    contaFiltroId = null
  } = params;
  const { mapaContas, contaPadraoId } = criarMapaContaVenda(contasFinanceiras);
  const prev = calcularPeriodoAnteriorEquivalente(inicio, fim);

  let valorTotal = 0;
  let qtdVendasComGuardaSol = 0;
  let qtdUnidades = 0;
  let prevValorTotal = 0;

  for (const v of vendas) {
    if (v.status === 'cancelada') continue;
    if (!vendaPertenceConta(v, contaFiltroId, mapaContas, contaPadraoId)) continue;
    const dt = obterDataLocalYYYYMMDD(v.dataFechamento);
    const noAtual = dt >= inicio && dt <= fim;
    const noPrev = !noAtual && dt >= prev.inicio && dt <= prev.fim;
    if (!noAtual && !noPrev) continue;

    let somaVenda = 0;
    let unidadesVenda = 0;
    if (Array.isArray(v.itens)) {
      for (const item of v.itens) {
        if (ehTextoGuardaSol(item.produto?.nome)) {
          const qtd = Number(item.quantidade) || 0;
          const preco = Number(item.produto?.preco) || 0;
          somaVenda += preco * qtd;
          unidadesVenda += qtd;
        }
      }
    }

    if (somaVenda > 0 || unidadesVenda > 0) {
      if (noAtual) {
        valorTotal += somaVenda;
        qtdVendasComGuardaSol += 1;
        qtdUnidades += unidadesVenda;
      } else if (noPrev) {
        prevValorTotal += somaVenda;
      }
    }
  }

  for (const m of movimentacoes) {
    if (m.tipo !== 'entrada') continue;
    if (contaFiltroId && m.contaId !== contaFiltroId) continue;
    if (!ehTextoGuardaSol(m.descricao) && !ehTextoGuardaSol(m.categoria)) continue;
    const dt = obterDataLocalYYYYMMDD(m.dataMovimentacao);
    const val = Number(m.valor) || 0;
    if (val <= 0) continue;
    if (dt >= inicio && dt <= fim) {
      valorTotal += val;
      qtdVendasComGuardaSol += 1;
      qtdUnidades += 1;
    } else if (dt >= prev.inicio && dt <= prev.fim) {
      prevValorTotal += val;
    }
  }

  const ticketMedioGuardaSol = qtdVendasComGuardaSol > 0 ? valorTotal / qtdVendasComGuardaSol : 0;

  return {
    valorTotal,
    qtdVendasComGuardaSol,
    qtdUnidades,
    ticketMedioGuardaSol,
    deltaValorPct: calcularVariacaoPercentual(valorTotal, prevValorTotal)
  };
}

