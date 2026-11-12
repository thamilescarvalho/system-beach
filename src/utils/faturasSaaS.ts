// src/utils/faturasSaaS.ts
import { supabase } from '../lib/supabase';
import type { EmpresaSaaS } from '../context/AppContext';

export type StatusFatura = 'paga' | 'pendente' | 'em_atraso' | 'cancelada';

export interface FaturaAssinatura {
  id: string;
  empresaId: string;
  competencia: string; // Ex: "Novembro/2026"
  mesAnoReferencia: string; // "2026-11"
  valor: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  status: StatusFatura;
  formaPagamento?: string; // "PIX Mercado Pago", "Cartão de Crédito", etc.
  paymentIdMp?: string;
  planoNome: string;
  cicloNome: string;
  parcelaNumero?: number; // Ex: 1 (de 3)
  totalParcelasCiclo?: number; // Ex: 3 (Trimestral), 6 (Semestral), 12 (Anual)
  codigoFiscalSerie?: string; // Preparado para conformidade fiscal SaaS (NFS-e / RPS)
  regimeTributarioSaaS?: string;
}

const STORAGE_FATURAS_PREFIX = 'tsystem_faturas_v1_';

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function formatarCompetencia(dataIsoOuData: string | Date): string {
  const d = typeof dataIsoOuData === 'string' ? new Date(dataIsoOuData) : dataIsoOuData;
  if (Number.isNaN(d.getTime())) return 'Período Atual';
  return `${NOMES_MESES[d.getMonth()]}/${d.getFullYear()}`;
}

export function formatarMesAno(dataIsoOuData: string | Date): string {
  const d = typeof dataIsoOuData === 'string' ? new Date(dataIsoOuData) : dataIsoOuData;
  if (Number.isNaN(d.getTime())) return '';
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mes}`;
}

/**
 * Adiciona meses a uma data preservando o mesmo dia do mês selecionado pelo cliente
 * (respeitando o último dia válido de meses mais curtos como Fevereiro).
 */
export function adicionarMesesNoMesmoDia(
  dataBase: Date,
  mesesParaAdicionar: number,
  diaReferencia?: number
): Date {
  const diaAlvo = diaReferencia || dataBase.getDate();
  const anoDestino = dataBase.getFullYear();
  const mesDestino = dataBase.getMonth() + mesesParaAdicionar;

  const primeiroDoMes = new Date(anoDestino, mesDestino, 1, 12, 0, 0, 0);
  const ultimoDiaMes = new Date(
    primeiroDoMes.getFullYear(),
    primeiroDoMes.getMonth() + 1,
    0
  ).getDate();

  const diaFinal = Math.min(diaAlvo, ultimoDiaMes);
  return new Date(
    primeiroDoMes.getFullYear(),
    primeiroDoMes.getMonth(),
    diaFinal,
    12,
    0,
    0,
    0
  );
}

function obterFaturasCache(empresaId: string): FaturaAssinatura[] {
  if (typeof window === 'undefined') return [];
  try {
    const salvo = localStorage.getItem(`${STORAGE_FATURAS_PREFIX}${empresaId}`);
    if (!salvo) return [];
    return JSON.parse(salvo) as FaturaAssinatura[];
  } catch {
    return [];
  }
}

function salvarFaturasCache(empresaId: string, faturas: FaturaAssinatura[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_FATURAS_PREFIX}${empresaId}`, JSON.stringify(faturas));
  } catch {
    // Ignora
  }
}

function obterQuantidadeMesesCiclo(cicloNomeOuId?: string, mesesExplicito?: number): number {
  if (typeof mesesExplicito === 'number' && mesesExplicito > 0) return mesesExplicito;
  const norm = (cicloNomeOuId || '').toLowerCase();
  if (norm.includes('anual')) return 12;
  if (norm.includes('semestral')) return 6;
  if (norm.includes('trimestral')) return 3;
  return 1;
}

/**
 * Gera ou atualiza o cronograma de faturas mensais vinculadas ao PIX para o ciclo escolhido
 * (ex: Trimestral = 3 faturas mensais, Semestral = 6 faturas mensais, Anual = 12 faturas mensais),
 * cada uma com vencimento exatamente no mesmo dia do mês selecionado, sem uso de boleto.
 */
export async function gerarCronogramaFaturasCicloPix(dados: {
  empresaId: string;
  valorMensalEquivalente: number;
  valorTotalCiclo: number;
  mesesCiclo: number;
  planoNome: string;
  cicloNome: string;
  statusFaturas: StatusFatura;
  paymentIdMp?: string;
  dataBaseSelecao?: Date;
}): Promise<FaturaAssinatura[]> {
  const agora = dados.dataBaseSelecao || new Date();
  const diaBase = agora.getDate();
  const qtdMeses = Math.max(1, dados.mesesCiclo);
  const valorMensal =
    dados.valorMensalEquivalente > 0
      ? Number(dados.valorMensalEquivalente.toFixed(2))
      : Number((dados.valorTotalCiclo / qtdMeses).toFixed(2));

  const novasFaturas: FaturaAssinatura[] = [];

  for (let i = 0; i < qtdMeses; i += 1) {
    const dataVencMes = adicionarMesesNoMesmoDia(agora, i, diaBase);
    const competencia = formatarCompetencia(dataVencMes);
    const mesAno = formatarMesAno(dataVencMes);
    const prefixoEmpresa = dados.empresaId.substring(0, 6).toUpperCase();
    const idFatura = `FAT-${mesAno.replace('-', '')}-${prefixoEmpresa}`;
    const codigoFiscal = `NFS-PIX-${mesAno.replace('-', '')}-${String(i + 1).padStart(2, '0')}`;

    novasFaturas.push({
      id: idFatura,
      empresaId: dados.empresaId,
      competencia: qtdMeses > 1 ? `${competencia} (${i + 1}/${qtdMeses})` : competencia,
      mesAnoReferencia: mesAno,
      valor: valorMensal,
      dataEmissao: agora.toISOString(),
      dataVencimento: dataVencMes.toISOString(),
      dataPagamento: dados.statusFaturas === 'paga' ? agora.toISOString() : undefined,
      status: dados.statusFaturas,
      formaPagamento: 'PIX Mercado Pago',
      paymentIdMp: dados.paymentIdMp,
      planoNome: dados.planoNome,
      cicloNome: dados.cicloNome,
      parcelaNumero: i + 1,
      totalParcelasCiclo: qtdMeses,
      codigoFiscalSerie: codigoFiscal,
      regimeTributarioSaaS: 'Serviço de Software SaaS (ISS / PIX)'
    });
  }

  // 1. Mescla no cache local preservando histórico pago anterior de outros meses
  const existentes = obterFaturasCache(dados.empresaId);
  const mesesNovos = new Set(novasFaturas.map((f) => f.mesAnoReferencia));
  const preservadas = existentes.filter((f) => {
    if (mesesNovos.has(f.mesAnoReferencia)) {
      // Se já estava paga e estamos apenas pré-gerando pendentes, mantém a paga
      if (f.status === 'paga' && dados.statusFaturas !== 'paga') return true;
      return false;
    }
    return true;
  });

  const mescladas = [
    ...novasFaturas.filter(
      (nf) => !preservadas.some((p) => p.mesAnoReferencia === nf.mesAnoReferencia)
    ),
    ...preservadas
  ];
  mescladas.sort(
    (a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime()
  );
  salvarFaturasCache(dados.empresaId, mescladas);

  // 2. Persiste no Supabase
  try {
    const rows = novasFaturas.map((nf) => ({
      id: nf.id,
      empresa_id: nf.empresaId,
      competencia: nf.competencia,
      mes_ano_referencia: nf.mesAnoReferencia,
      valor: nf.valor,
      data_emissao: nf.dataEmissao,
      data_vencimento: nf.dataVencimento,
      data_pagamento: nf.dataPagamento || null,
      status: nf.status,
      forma_pagamento: nf.formaPagamento || 'PIX Mercado Pago',
      payment_id_mp: nf.paymentIdMp || null,
      plano_nome: nf.planoNome,
      ciclo_nome: nf.cicloNome
    }));

    await supabase.from('faturas_assinatura').upsert(rows, { onConflict: 'id' });
  } catch {
    // Falha silenciosa caso tabela ainda não exista
  }

  return novasFaturas;
}

/**
 * Registra formalmente a(s) fatura(s) como Paga(s) após confirmação no Mercado Pago.
 * Caso o ciclo seja Trimestral, Semestral ou Anual, gera uma fatura mensal ligada ao PIX
 * para cada mês referente àquele ciclo, com vencimento no mesmo dia selecionado.
 */
export async function registrarFaturaPaga(dados: {
  empresaId: string;
  valor: number;
  valorMensalEquivalente?: number;
  mesesCiclo?: number;
  planoNome: string;
  cicloNome: string;
  paymentIdMp?: string;
  formaPagamento?: string;
  dataVencimento?: string;
}): Promise<FaturaAssinatura> {
  const qtdMeses = obterQuantidadeMesesCiclo(dados.cicloNome, dados.mesesCiclo);
  const valorMensal =
    dados.valorMensalEquivalente && dados.valorMensalEquivalente > 0
      ? dados.valorMensalEquivalente
      : Number((dados.valor / qtdMeses).toFixed(2));

  const geradas = await gerarCronogramaFaturasCicloPix({
    empresaId: dados.empresaId,
    valorMensalEquivalente: valorMensal,
    valorTotalCiclo: dados.valor,
    mesesCiclo: qtdMeses,
    planoNome: dados.planoNome,
    cicloNome: dados.cicloNome,
    statusFaturas: 'paga',
    paymentIdMp: dados.paymentIdMp
  });

  return geradas[0];
}

/**
 * Carrega a linha do tempo de faturas de uma empresa combinando banco de dados,
 * transações locais e projeções mensais por ciclo vinculadas ao PIX.
 */
export async function carregarFaturasEmpresa(
  empresaId: string,
  dadosEmpresa?: EmpresaSaaS | null
): Promise<FaturaAssinatura[]> {
  const mapaFaturas = new Map<string, FaturaAssinatura>();

  // 1. Lê faturas do banco de dados (se existirem)
  try {
    const { data, error } = await supabase
      .from('faturas_assinatura')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_vencimento', { ascending: true });

    if (!error && Array.isArray(data)) {
      data.forEach((row: Record<string, unknown>) => {
        const id = String(row.id || '');
        if (id) {
          const mesAno = String(row.mes_ano_referencia || '');
          mapaFaturas.set(id, {
            id,
            empresaId: String(row.empresa_id || empresaId),
            competencia: String(row.competencia || 'Período Atual'),
            mesAnoReferencia: mesAno,
            valor: Number(row.valor || 0),
            dataEmissao: String(row.data_emissao || new Date().toISOString()),
            dataVencimento: String(row.data_vencimento || new Date().toISOString()),
            dataPagamento: row.data_pagamento ? String(row.data_pagamento) : undefined,
            status: (row.status as StatusFatura) || 'pendente',
            formaPagamento: row.forma_pagamento ? String(row.forma_pagamento) : 'PIX Mercado Pago',
            paymentIdMp: row.payment_id_mp ? String(row.payment_id_mp) : undefined,
            planoNome: String(row.plano_nome || 'Assinatura Premium'),
            cicloNome: String(row.ciclo_nome || 'Mensal'),
            codigoFiscalSerie: `NFS-PIX-${mesAno.replace('-', '')}`,
            regimeTributarioSaaS: 'Serviço de Software SaaS (ISS / PIX)'
          });
        }
      });
    }
  } catch {
    // Tabela pode ainda não ter sido criada
  }

  // 2. Lê do cache local
  const faturasCache = obterFaturasCache(empresaId);
  faturasCache.forEach((f) => {
    if (!mapaFaturas.has(f.id)) {
      mapaFaturas.set(f.id, f);
    }
  });

  // 3. Projeção Sintética Inteligente de Faturas Mensais do Ciclo
  if (dadosEmpresa) {
    const statusEmpresa = dadosEmpresa.status_assinatura;
    const dataVencStr = dadosEmpresa.data_vencimento;

    const valorCadastrado = Number(dadosEmpresa.valor_mensalidade);
    let valorMensalidade = valorCadastrado > 0 ? valorCadastrado : 0;
    if (valorMensalidade <= 0) {
      const faturaValida = faturasCache.find((f) => f.valor > 0);
      valorMensalidade = faturaValida?.valor || 149.9;
    }

    const planoNome = dadosEmpresa.plano_nome || 'Assinatura Premium';
    const cicloRaw = dadosEmpresa.ciclo_cobranca || 'Mensal';
    const cicloNome = cicloRaw.charAt(0).toUpperCase() + cicloRaw.slice(1);
    const qtdMesesCiclo = obterQuantidadeMesesCiclo(cicloRaw);

    const agora = new Date();

    if (dataVencStr) {
      const dataVenc = new Date(dataVencStr);
      const diaVencimentoEscolhido = dataVenc.getDate() || agora.getDate();
      const isAtiva = statusEmpresa === 'ativa';
      const isVencida = dataVenc.getTime() < agora.getTime();

      for (let i = 0; i < qtdMesesCiclo; i += 1) {
        const dataRefMes = adicionarMesesNoMesmoDia(agora, i, diaVencimentoEscolhido);
        const mesAnoRef = formatarMesAno(dataRefMes);
        const compBase = formatarCompetencia(dataRefMes);
        const competenciaLabel =
          qtdMesesCiclo > 1 ? `${compBase} (${i + 1}/${qtdMesesCiclo})` : compBase;
        const idMes = `FAT-${mesAnoRef.replace('-', '')}-${empresaId.substring(0, 6).toUpperCase()}`;

        if (!mapaFaturas.has(idMes)) {
          const statusMes: StatusFatura =
            isAtiva && !isVencida
              ? 'paga'
              : isVencida && i === 0
                ? 'em_atraso'
                : 'pendente';

          mapaFaturas.set(idMes, {
            id: idMes,
            empresaId,
            competencia: competenciaLabel,
            mesAnoReferencia: mesAnoRef,
            valor: valorMensalidade,
            dataEmissao: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(),
            dataVencimento: dataRefMes.toISOString(),
            dataPagamento: statusMes === 'paga' ? agora.toISOString() : undefined,
            status: statusMes,
            formaPagamento: 'PIX Mercado Pago',
            planoNome,
            cicloNome,
            parcelaNumero: i + 1,
            totalParcelasCiclo: qtdMesesCiclo,
            codigoFiscalSerie: `NFS-PIX-${mesAnoRef.replace('-', '')}-${String(i + 1).padStart(2, '0')}`,
            regimeTributarioSaaS: 'Serviço de Software SaaS (ISS / PIX)'
          });
        }
      }
    }
  }

  // Sanitiza a lista final garantindo que nenhum item fique com valor R$ 0,00
  const valorPadrao =
    Number(dadosEmpresa?.valor_mensalidade) > 0 ? Number(dadosEmpresa?.valor_mensalidade) : 149.9;
  const lista = Array.from(mapaFaturas.values()).map((f) => {
    if (!f.valor || f.valor <= 0) {
      return { ...f, valor: valorPadrao };
    }
    return f;
  });

  // Ordena por data de vencimento crescente para fácil leitura do cronograma mensal
  lista.sort((a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime());

  salvarFaturasCache(empresaId, lista);

  return lista;
}

/**
 * Carrega exclusivamente as faturas geradas e persistidas no banco de dados
 * para um estabelecimento (usado no painel SuperAdmin).
 */
export async function carregarFaturasGeradasBancoEmpresa(
  empresaId: string
): Promise<FaturaAssinatura[]> {
  const { data, error } = await supabase
    .from('faturas_assinatura')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('data_vencimento', { ascending: false });

  if (error || !Array.isArray(data)) {
    return [];
  }

  const agoraMs = Date.now();

  return data
    .filter((row: Record<string, unknown>) => Boolean(row.id))
    .map((row: Record<string, unknown>) => {
      const id = String(row.id);
      const mesAno = String(row.mes_ano_referencia || '');
      const statusBruto = (row.status as StatusFatura) || 'pendente';
      const dataVencStr = String(row.data_vencimento || new Date().toISOString());
      const vencimentoMs = new Date(dataVencStr).getTime();
      const statusEfetivo: StatusFatura =
        statusBruto === 'pendente' && !Number.isNaN(vencimentoMs) && vencimentoMs < agoraMs
          ? 'em_atraso'
          : statusBruto;

      return {
        id,
        empresaId: String(row.empresa_id || empresaId),
        competencia: String(row.competencia || 'Período Atual'),
        mesAnoReferencia: mesAno,
        valor: Number(row.valor || 0),
        dataEmissao: String(row.data_emissao || new Date().toISOString()),
        dataVencimento: dataVencStr,
        dataPagamento: row.data_pagamento ? String(row.data_pagamento) : undefined,
        status: statusEfetivo,
        formaPagamento: row.forma_pagamento ? String(row.forma_pagamento) : 'PIX Mercado Pago',
        paymentIdMp: row.payment_id_mp ? String(row.payment_id_mp) : undefined,
        planoNome: String(row.plano_nome || 'Assinatura Premium'),
        cicloNome: String(row.ciclo_nome || 'Mensal'),
        codigoFiscalSerie: `NFS-PIX-${mesAno.replace('-', '')}`,
        regimeTributarioSaaS: 'Serviço de Software SaaS (ISS / PIX)'
      };
    });
}

/**
 * Exclui uma fatura gerada que ainda NÃO foi paga.
 * Faturas com status 'paga' são bloqueadas tanto na camada de aplicação quanto via RLS.
 */
export async function excluirFaturaNaoPaga(
  faturaId: string,
  empresaId: string
): Promise<{ ok: boolean; erro?: string }> {
  const { data: atual, error: erroConsulta } = await supabase
    .from('faturas_assinatura')
    .select('id, status')
    .eq('id', faturaId)
    .eq('empresa_id', empresaId)
    .maybeSingle();

  if (erroConsulta) {
    return { ok: false, erro: erroConsulta.message || 'Não foi possível validar a fatura.' };
  }

  if (!atual) {
    return { ok: false, erro: 'Fatura não encontrada no banco de dados.' };
  }

  if (atual.status === 'paga') {
    return {
      ok: false,
      erro: 'Faturas já pagas não podem ser excluídas pelo painel. Remoção permitida apenas diretamente no banco de dados.'
    };
  }

  const { data: removidas, error: erroDelete } = await supabase
    .from('faturas_assinatura')
    .delete()
    .eq('id', faturaId)
    .eq('empresa_id', empresaId)
    .neq('status', 'paga')
    .select('id');

  if (erroDelete) {
    return { ok: false, erro: erroDelete.message || 'Erro ao excluir fatura.' };
  }

  if (!removidas || removidas.length === 0) {
    return {
      ok: false,
      erro: 'Exclusão bloqueada: verifique se a fatura já foi paga ou se você possui permissão.'
    };
  }

  const cacheAtual = obterFaturasCache(empresaId);
  if (cacheAtual.length > 0) {
    salvarFaturasCache(
      empresaId,
      cacheAtual.filter((f) => f.id !== faturaId)
    );
  }

  return { ok: true };
}
