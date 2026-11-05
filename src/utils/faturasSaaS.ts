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

/**
 * Registra formalmente uma fatura como Paga (após confirmação no Mercado Pago).
 */
export async function registrarFaturaPaga(dados: {
  empresaId: string;
  valor: number;
  planoNome: string;
  cicloNome: string;
  paymentIdMp?: string;
  formaPagamento?: string;
  dataVencimento?: string;
}): Promise<FaturaAssinatura> {
  const agora = new Date();
  const competencia = formatarCompetencia(agora);
  const mesAno = formatarMesAno(agora);
  const idFatura = `FAT-${mesAno.replace('-', '')}-${dados.empresaId.substring(0, 6).toUpperCase()}`;

  const novaFatura: FaturaAssinatura = {
    id: idFatura,
    empresaId: dados.empresaId,
    competencia,
    mesAnoReferencia: mesAno,
    valor: Number(dados.valor.toFixed(2)),
    dataEmissao: agora.toISOString(),
    dataVencimento: dados.dataVencimento || agora.toISOString(),
    dataPagamento: agora.toISOString(),
    status: 'paga',
    formaPagamento: dados.formaPagamento || 'PIX Mercado Pago',
    paymentIdMp: dados.paymentIdMp,
    planoNome: dados.planoNome,
    cicloNome: dados.cicloNome
  };

  // 1. Atualiza cache local
  const existentes = obterFaturasCache(dados.empresaId);
  const filtradas = existentes.filter((f) => f.id !== idFatura && f.mesAnoReferencia !== mesAno);
  const atualizadas = [novaFatura, ...filtradas];
  salvarFaturasCache(dados.empresaId, atualizadas);

  // 2. Tenta persistir no Supabase (se a tabela faturas_assinatura existir)
  try {
    await supabase.from('faturas_assinatura').upsert(
      [
        {
          id: novaFatura.id,
          empresa_id: novaFatura.empresaId,
          competencia: novaFatura.competencia,
          mes_ano_referencia: novaFatura.mesAnoReferencia,
          valor: novaFatura.valor,
          data_emissao: novaFatura.dataEmissao,
          data_vencimento: novaFatura.dataVencimento,
          data_pagamento: novaFatura.dataPagamento,
          status: novaFatura.status,
          forma_pagamento: novaFatura.formaPagamento,
          payment_id_mp: novaFatura.paymentIdMp,
          plano_nome: novaFatura.planoNome,
          ciclo_nome: novaFatura.cicloNome
        }
      ],
      { onConflict: 'id' }
    );
  } catch {
    // Falha silenciosa caso a tabela ainda não tenha sido criada no banco
  }

  return novaFatura;
}

/**
 * Carrega a linha do tempo de faturas de uma empresa combinando banco de dados,
 * transações locais e projeções reais de competência.
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
      .order('data_vencimento', { ascending: false });

    if (!error && Array.isArray(data)) {
      data.forEach((row: Record<string, unknown>) => {
        const id = String(row.id || '');
        if (id) {
          mapaFaturas.set(id, {
            id,
            empresaId: String(row.empresa_id || empresaId),
            competencia: String(row.competencia || 'Período Atual'),
            mesAnoReferencia: String(row.mes_ano_referencia || ''),
            valor: Number(row.valor || 0),
            dataEmissao: String(row.data_emissao || new Date().toISOString()),
            dataVencimento: String(row.data_vencimento || new Date().toISOString()),
            dataPagamento: row.data_pagamento ? String(row.data_pagamento) : undefined,
            status: (row.status as StatusFatura) || 'pendente',
            formaPagamento: row.forma_pagamento ? String(row.forma_pagamento) : undefined,
            paymentIdMp: row.payment_id_mp ? String(row.payment_id_mp) : undefined,
            planoNome: String(row.plano_nome || 'Assinatura Premium'),
            cicloNome: String(row.ciclo_nome || 'Mensal')
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

  // 3. Projeção Sintética Inteligente de Faturas
  // Se a empresa está ativa e possui vencimento, garante que os meses cobertos apareçam como PAGOS
  if (dadosEmpresa) {
    const statusEmpresa = dadosEmpresa.status_assinatura;
    const dataVencStr = dadosEmpresa.data_vencimento;

    // Se o valor_mensalidade cadastrado for <= 0, adota o valor da última fatura real ou R$ 40,00
    const valorCadastrado = Number(dadosEmpresa.valor_mensalidade);
    let valorMensalidade = valorCadastrado > 0 ? valorCadastrado : 0;
    if (valorMensalidade <= 0) {
      const faturaValida = faturasCache.find((f) => f.valor > 0);
      valorMensalidade = faturaValida?.valor || 40.0;
    }

    const planoNome = dadosEmpresa.plano_nome || 'Assinatura Premium';
    const cicloNome = dadosEmpresa.ciclo_cobranca || 'Mensal';

    const agora = new Date();

    if (dataVencStr) {
      const dataVenc = new Date(dataVencStr);
      const isAtiva = statusEmpresa === 'ativa';
      const isVencida = dataVenc.getTime() < agora.getTime();

      // Mês atual
      const mesAnoAtual = formatarMesAno(agora);
      const competenciaAtual = formatarCompetencia(agora);
      const idAtual = `FAT-${mesAnoAtual.replace('-', '')}-${empresaId.substring(0, 6).toUpperCase()}`;

      if (!mapaFaturas.has(idAtual)) {
        if (isAtiva && !isVencida) {
          // O estabelecimento está com o mês atual rigorosamente pago!
          mapaFaturas.set(idAtual, {
            id: idAtual,
            empresaId,
            competencia: competenciaAtual,
            mesAnoReferencia: mesAnoAtual,
            valor: valorMensalidade,
            dataEmissao: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(),
            dataVencimento: dataVenc.toISOString(),
            dataPagamento: agora.toISOString(),
            status: 'paga',
            formaPagamento: 'PIX Mercado Pago',
            planoNome,
            cicloNome: cicloNome.charAt(0).toUpperCase() + cicloNome.slice(1)
          });
        } else if (isVencida) {
          // O vencimento já passou e não foi renovado
          mapaFaturas.set(idAtual, {
            id: idAtual,
            empresaId,
            competencia: competenciaAtual,
            mesAnoReferencia: mesAnoAtual,
            valor: valorMensalidade,
            dataEmissao: new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString(),
            dataVencimento: dataVenc.toISOString(),
            status: 'em_atraso',
            planoNome,
            cicloNome: cicloNome.charAt(0).toUpperCase() + cicloNome.slice(1)
          });
        } else if (statusEmpresa === 'pendente') {
          mapaFaturas.set(idAtual, {
            id: idAtual,
            empresaId,
            competencia: competenciaAtual,
            mesAnoReferencia: mesAnoAtual,
            valor: valorMensalidade,
            dataEmissao: agora.toISOString(),
            dataVencimento: dataVenc.toISOString(),
            status: 'pendente',
            planoNome,
            cicloNome: cicloNome.charAt(0).toUpperCase() + cicloNome.slice(1)
          });
        }
      }

      // Projeção da Próxima Fatura caso o vencimento esteja se aproximando (nos próximos 15 dias)
      const diffDias = Math.ceil((dataVenc.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
      if (isAtiva && diffDias >= 0 && diffDias <= 15) {
        const proxData = new Date(dataVenc.getTime());
        proxData.setDate(proxData.getDate() + 1);
        const mesAnoProx = formatarMesAno(proxData);
        const compProx = formatarCompetencia(proxData);
        const idProx = `FAT-${mesAnoProx.replace('-', '')}-${empresaId.substring(0, 6).toUpperCase()}`;

        if (!mapaFaturas.has(idProx)) {
          mapaFaturas.set(idProx, {
            id: idProx,
            empresaId,
            competencia: compProx,
            mesAnoReferencia: mesAnoProx,
            valor: valorMensalidade,
            dataEmissao: agora.toISOString(),
            dataVencimento: dataVenc.toISOString(),
            status: 'pendente',
            planoNome,
            cicloNome: cicloNome.charAt(0).toUpperCase() + cicloNome.slice(1)
          });
        }
      }
    }
  }

  // Sanitiza a lista final garantindo que nenhum item fique com valor R$ 0,00
  const valorPadrao = Number(dadosEmpresa?.valor_mensalidade) > 0 ? Number(dadosEmpresa?.valor_mensalidade) : 40.0;
  const lista = Array.from(mapaFaturas.values()).map((f) => {
    if (!f.valor || f.valor <= 0) {
      return { ...f, valor: valorPadrao };
    }
    return f;
  });

  // Ordena por data de vencimento decrescente (mais recente primeiro)
  lista.sort((a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime());

  // Salva no cache local o resultado consolidado e sanitizado
  salvarFaturasCache(empresaId, lista);

  return lista;
}
