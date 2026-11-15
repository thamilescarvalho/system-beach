import { useEffect, useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { formatarMoeda } from './financeiroUtils';
import type {
  ResumoExecutivoBI,
  ResumoGuardaSolPeriodo,
  ResumoLucroPeriodo,
  ResumoRecebimentosPorMetodo,
  ResumoVendasPeriodo
} from './metricasUtils';

export type TipoMetricaModal = 'vendas' | 'recebido' | 'lucro' | 'guardasol' | 'resultado';

interface ModalDetalheMetricaProps {
  tipo: TipoMetricaModal | null;
  onClose: () => void;
  ocultarValores: boolean;
  contaRotulo: string;
  rotulosPeriodo: {
    global: string;
    vendas: string;
    recebido: string;
    lucro: string;
    guardasol: string;
  };
  metodoLabel: string;
  resumoVendas: ResumoVendasPeriodo;
  resumoRecebimentos: ResumoRecebimentosPorMetodo;
  resumoLucro: ResumoLucroPeriodo;
  resumoGuardaSol: ResumoGuardaSolPeriodo;
  resumoBI: ResumoExecutivoBI;
  saldoConsolidadoContas: number;
}

function formatarDataHoraBR(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
}

function BadgeDeltaModal({
  delta,
  atualZero = false
}: {
  delta: number | null;
  atualZero?: boolean;
}) {
  if (delta === null || (atualZero && delta === -100)) {
    return <span className="text-[11px] font-medium text-slate-400">Estável vs. ant.</span>;
  }

  const arredondado = Number(delta.toFixed(1));
  const neutro = Math.abs(arredondado) < 0.2;
  const positivo = arredondado > 0;
  const cor = neutro
    ? 'bg-slate-100 text-slate-500'
    : positivo
      ? 'bg-sky-50 text-sky-600'
      : 'bg-rose-50 text-rose-600';
  const seta = neutro ? '•' : positivo ? '↑' : '↓';
  const sinal = positivo ? '+' : '';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${cor}`}>
      {`${sinal}${arredondado.toFixed(1).replace('.', ',')}% ${seta} vs. ant.`}
    </span>
  );
}

function CaixaIndicadorModal({
  label,
  valor,
  detalhe,
  destaque = 'padrao'
}: {
  label: string;
  valor: string;
  detalhe?: string;
  destaque?: 'padrao' | 'positivo' | 'negativo' | 'alerta';
}) {
  const corValor =
    destaque === 'positivo'
      ? 'text-emerald-600'
      : destaque === 'negativo'
        ? 'text-rose-600'
        : destaque === 'alerta'
          ? 'text-amber-600'
          : 'text-slate-900';

  return (
    <div className="p-3 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col justify-between gap-1 min-w-0">
      <span className="text-[10px] font-medium text-slate-400 truncate">{label}</span>
      <span className={`text-sm sm:text-base font-bold tabular-nums truncate ${corValor}`}>
        {valor}
      </span>
      {detalhe && <span className="text-[10px] text-slate-400 truncate">{detalhe}</span>}
    </div>
  );
}

function ModalDetalheConteudo({
  tipo,
  onClose,
  ocultarValores,
  contaRotulo,
  rotulosPeriodo,
  metodoLabel,
  resumoVendas,
  resumoRecebimentos,
  resumoLucro,
  resumoGuardaSol,
  resumoBI,
  saldoConsolidadoContas
}: Omit<ModalDetalheMetricaProps, 'tipo'> & { tipo: TipoMetricaModal }) {
  const [abaLucro, setAbaLucro] = useState<'comandas' | 'produtos'>('comandas');
  const [busca, setBusca] = useState('');

  const mascarar = (valor: string) => (ocultarValores ? 'R$ ••••' : valor);
  const termo = busca.trim().toUpperCase();

  const cabecalho = useMemo(() => {
    if (tipo === 'vendas') {
      return {
        titulo: 'Análise de Vendas',
        periodo: rotulosPeriodo.vendas,
        bgIcone: 'bg-sky-50 border-sky-100 text-sky-500',
        Icone: LucideIcons.ShoppingBag
      };
    }
    if (tipo === 'recebido') {
      return {
        titulo: 'Análise de Recebimentos',
        periodo: `${rotulosPeriodo.recebido} · ${metodoLabel}`,
        bgIcone: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        Icone: LucideIcons.Wallet
      };
    }
    if (tipo === 'lucro') {
      return {
        titulo: 'Análise de Lucro',
        periodo: rotulosPeriodo.lucro,
        bgIcone: 'bg-teal-50 border-teal-100 text-teal-600',
        Icone: LucideIcons.BadgeDollarSign
      };
    }
    if (tipo === 'guardasol') {
      return {
        titulo: 'Análise de Guarda-Sol',
        periodo: rotulosPeriodo.guardasol,
        bgIcone: 'bg-amber-50 border-amber-100 text-amber-600',
        Icone: LucideIcons.Umbrella
      };
    }
    return {
      titulo: 'Resultado Líquido',
      periodo: rotulosPeriodo.global,
      bgIcone: 'bg-indigo-50 border-indigo-100 text-indigo-500',
      Icone: LucideIcons.TrendingUp
    };
  }, [tipo, rotulosPeriodo, metodoLabel]);

  const vendasFiltradas = useMemo(() => {
    if (!termo) return resumoVendas.vendasPeriodo;
    return resumoVendas.vendasPeriodo.filter((v) => {
      const alvo = `MESA ${v.numeroMesa} ${v.nomeCliente || ''} ${v.garcomNome || ''} ${v.itens
        .map((i) => i.produto?.nome || '')
        .join(' ')}`.toUpperCase();
      return alvo.includes(termo);
    });
  }, [resumoVendas.vendasPeriodo, termo]);

  const recebimentosFiltrados = useMemo(() => {
    if (!termo) return resumoRecebimentos.lancamentosPeriodo;
    return resumoRecebimentos.lancamentosPeriodo.filter((l) =>
      `${l.titulo} ${l.subtitulo} ${l.metodoLabel}`.toUpperCase().includes(termo)
    );
  }, [resumoRecebimentos.lancamentosPeriodo, termo]);

  const vendasLucroFiltradas = useMemo(() => {
    if (!termo) return resumoLucro.vendasLucro;
    return resumoLucro.vendasLucro.filter((v) => {
      const alvo = `MESA ${v.numeroMesa} ${v.nomeCliente || ''} ${v.garcomNome || ''} ${v.itens
        .map((i) => i.nome)
        .join(' ')}`.toUpperCase();
      return alvo.includes(termo);
    });
  }, [resumoLucro.vendasLucro, termo]);

  const produtosLucroFiltrados = useMemo(() => {
    if (!termo) return resumoLucro.produtosLucro;
    return resumoLucro.produtosLucro.filter((p) =>
      `${p.nome} ${p.categoria}`.toUpperCase().includes(termo)
    );
  }, [resumoLucro.produtosLucro, termo]);

  const guardaSolFiltrados = useMemo(() => {
    if (!termo) return resumoGuardaSol.registrosGuardaSol;
    return resumoGuardaSol.registrosGuardaSol.filter((g) =>
      `${g.titulo} ${g.subtitulo}`.toUpperCase().includes(termo)
    );
  }, [resumoGuardaSol.registrosGuardaSol, termo]);

  const IconeCabecalho = cabecalho.Icone;

  return (
    <div
      className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 max-h-[88dvh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 font-sans"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Alça visual mobile */}
      <div className="sm:hidden flex justify-center pt-2.5 pb-1">
        <span className="w-10 h-1 rounded-full bg-slate-200" />
      </div>

      {/* Cabeçalho */}
      <div className="px-4 sm:px-6 pt-3 sm:pt-5 pb-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${cabecalho.bgIcone}`}
          >
            <IconeCabecalho size={18} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {cabecalho.titulo}
            </h2>
            <p className="text-[11px] text-slate-400 truncate">
              {cabecalho.periodo} · {contaRotulo}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar análise"
          className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <LucideIcons.X size={15} />
        </button>
      </div>

      {/* Corpo com rolagem */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* RESUMO EXECUTIVO DO CARD */}
        {tipo === 'vendas' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Resumo do período
              </span>
              <BadgeDeltaModal
                delta={resumoVendas.deltaQuantidadePct}
                atualZero={resumoVendas.quantidadeConcluidas === 0}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <CaixaIndicadorModal
                label="Vendas Concluídas"
                valor={String(resumoVendas.quantidadeConcluidas)}
                detalhe={`${resumoVendas.quantidadeCanceladas} cancelada(s)`}
              />
              <CaixaIndicadorModal
                label="Faturamento PDV"
                valor={mascarar(formatarMoeda(resumoVendas.faturamentoConcluidas))}
                detalhe={`Taxa canc. ${resumoVendas.taxaCancelamentoPct.toFixed(1)}%`}
              />
              <CaixaIndicadorModal
                label="Ticket Médio"
                valor={mascarar(formatarMoeda(resumoVendas.ticketMedio))}
                detalhe={
                  resumoVendas.picoHorarioLabel
                    ? `Pico ${resumoVendas.picoHorarioLabel}`
                    : 'Sem pico'
                }
              />
              <CaixaIndicadorModal
                label="Itens Vendidos"
                valor={String(resumoVendas.totalItensVendidos)}
                detalhe={`${resumoVendas.itensPorVenda.toFixed(1).replace('.', ',')} itens/venda`}
              />
            </div>
          </div>
        )}

        {tipo === 'recebido' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Resumo dos recebimentos
              </span>
              <BadgeDeltaModal
                delta={resumoRecebimentos.deltaTotalPct}
                atualZero={resumoRecebimentos.totalSelecionado === 0}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <CaixaIndicadorModal
                label="Total Selecionado"
                valor={mascarar(formatarMoeda(resumoRecebimentos.totalSelecionado))}
                detalhe={metodoLabel}
                destaque="positivo"
              />
              <CaixaIndicadorModal
                label="Recebido via PDV"
                valor={mascarar(formatarMoeda(resumoRecebimentos.valorVendasSelecionado))}
                detalhe={`${resumoRecebimentos.qtdVendasSelecionado} comanda(s)`}
              />
              <CaixaIndicadorModal
                label="Entradas Financeiro"
                valor={mascarar(formatarMoeda(resumoRecebimentos.valorEntradasManuaisSelecionado))}
                detalhe={`${resumoRecebimentos.qtdEntradasManuaisSelecionado} lançamento(s)`}
              />
              <CaixaIndicadorModal
                label="Geral (Todas Formas)"
                valor={mascarar(formatarMoeda(resumoRecebimentos.totalGeralPeriodo))}
                detalhe={rotulosPeriodo.recebido}
              />
            </div>
          </div>
        )}

        {tipo === 'lucro' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Composição do Lucro
              </span>
              <BadgeDeltaModal
                delta={resumoLucro.deltaLucroPct}
                atualZero={resumoLucro.receitaBrutaProdutos === 0 && resumoLucro.custoTotal === 0}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <CaixaIndicadorModal
                label="Lucro Líquido"
                valor={mascarar(formatarMoeda(resumoLucro.lucroTotal))}
                detalhe={`Margem ${resumoLucro.margemLucroPct.toFixed(1).replace('.', ',')}%`}
                destaque={resumoLucro.lucroTotal < 0 ? 'negativo' : 'positivo'}
              />
              <CaixaIndicadorModal
                label="Venda de Produtos"
                valor={mascarar(formatarMoeda(resumoLucro.receitaBrutaProdutos))}
                detalhe={`${resumoLucro.qtdItensVendidos} item(ns)`}
              />
              <CaixaIndicadorModal
                label="Custo Total (CMV)"
                valor={mascarar(formatarMoeda(resumoLucro.custoTotal))}
                detalhe="Custo dos produtos"
              />
              <CaixaIndicadorModal
                label="Descontos Aplicados"
                valor={mascarar(formatarMoeda(resumoLucro.descontoTotal))}
                detalhe={`${resumoLucro.qtdComandasComDesconto} comanda(s) c/ desc.`}
                destaque={resumoLucro.descontoTotal > 0 ? 'alerta' : 'padrao'}
              />
            </div>
          </div>
        )}

        {tipo === 'guardasol' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Resumo de Guarda-Sol
              </span>
              <BadgeDeltaModal
                delta={resumoGuardaSol.deltaValorPct}
                atualZero={resumoGuardaSol.valorTotal === 0}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <CaixaIndicadorModal
                label="Total Recebido"
                valor={mascarar(formatarMoeda(resumoGuardaSol.valorTotal))}
                detalhe={rotulosPeriodo.guardasol}
                destaque="positivo"
              />
              <CaixaIndicadorModal
                label="Comandas / Lanç."
                valor={String(resumoGuardaSol.qtdVendasComGuardaSol)}
                detalhe="Registros no período"
              />
              <CaixaIndicadorModal
                label="Unidades"
                valor={String(resumoGuardaSol.qtdUnidades)}
                detalhe="Guarda-sóis cobrados"
              />
              <CaixaIndicadorModal
                label="Média por Registro"
                valor={mascarar(formatarMoeda(resumoGuardaSol.ticketMedioGuardaSol))}
                detalhe="Ticket guarda-sol"
              />
            </div>
          </div>
        )}

        {tipo === 'resultado' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Saúde Financeira ({rotulosPeriodo.global})
              </span>
              <BadgeDeltaModal
                delta={resumoBI.deltaResultadoPct}
                atualZero={resumoBI.entradasTotal === 0 && resumoBI.saidasTotal === 0}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <CaixaIndicadorModal
                label="Resultado Líquido"
                valor={mascarar(formatarMoeda(resumoBI.resultadoLiquido))}
                detalhe={`Margem ${resumoBI.margemLiquidaCaixaPct.toFixed(1).replace('.', ',')}%`}
                destaque={resumoBI.resultadoLiquido < 0 ? 'negativo' : 'positivo'}
              />
              <CaixaIndicadorModal
                label="Entradas Totais"
                valor={mascarar(formatarMoeda(resumoBI.entradasTotal))}
                detalhe={`PDV ${mascarar(formatarMoeda(resumoBI.entradasPdv))}`}
              />
              <CaixaIndicadorModal
                label="Saídas Totais"
                valor={mascarar(formatarMoeda(resumoBI.saidasTotal))}
                detalhe={`Vales ${mascarar(formatarMoeda(resumoBI.saidasVales))}`}
                destaque={resumoBI.saidasTotal > 0 ? 'negativo' : 'padrao'}
              />
              <CaixaIndicadorModal
                label="Saldo em Contas"
                valor={mascarar(formatarMoeda(saldoConsolidadoContas))}
                detalhe={`${resumoBI.qtdNotasAtivas} nota(s) no período`}
              />
            </div>
          </div>
        )}

        {/* CONTROLES DE BUSCA / ABAS DE ANÁLISE */}
        {tipo !== 'resultado' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            {tipo === 'lucro' && (
              <div className="inline-flex p-1 rounded-xl bg-slate-100 self-start">
                <button
                  type="button"
                  onClick={() => setAbaLucro('comandas')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    abaLucro === 'comandas'
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  Por Comanda ({resumoLucro.vendasLucro.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAbaLucro('produtos')}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                    abaLucro === 'produtos'
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  Por Produto ({resumoLucro.produtosLucro.length})
                </button>
              </div>
            )}

            <div className="relative flex-1 sm:max-w-xs ml-auto w-full">
              <LucideIcons.Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar mesa, item ou cliente..."
                className="w-full h-8 pl-8 pr-3 rounded-xl bg-[#f8fafc] border border-slate-200/80 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all"
              />
            </div>
          </div>
        )}

        {/* LISTA DETALHADA: VENDAS */}
        {tipo === 'vendas' && (
          <div className="space-y-2.5">
            {vendasFiltradas.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-[#f8fafc] rounded-2xl border border-slate-100">
                Nenhuma venda encontrada para este recorte.
              </div>
            ) : (
              vendasFiltradas.map((v) => {
                const cancelada = v.status === 'cancelada';
                const itensReais = Array.isArray(v.itens)
                  ? v.itens.filter((i) => i.id !== 'taxa-servico-10')
                  : [];
                const metodos = Array.isArray(v.pagamentos)
                  ? v.pagamentos.map((p) => String(p.metodo || '').toUpperCase()).join(' · ')
                  : '';

                return (
                  <div
                    key={v.id}
                    className={`p-3.5 rounded-2xl border transition-colors ${
                      cancelada
                        ? 'bg-rose-50/40 border-rose-100'
                        : 'bg-[#f8fafc] border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">
                            {`Mesa ${v.numeroMesa}`}
                          </span>
                          {v.nomeCliente && (
                            <span className="text-xs font-medium text-slate-600 truncate max-w-44">
                              · {v.nomeCliente}
                            </span>
                          )}
                          {cancelada && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold">
                              Cancelada
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {formatarDataHoraBR(v.dataFechamento)}
                          {v.garcomNome ? ` · ${v.garcomNome}` : ''}
                          {metodos ? ` · ${metodos}` : ''}
                        </p>
                      </div>

                      <span
                        className={`text-sm font-bold tabular-nums shrink-0 ${
                          cancelada ? 'text-rose-500 line-through' : 'text-slate-900'
                        }`}
                      >
                        {mascarar(formatarMoeda(Number(v.total) || 0))}
                      </span>
                    </div>

                    {itensReais.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {itensReais.slice(0, 6).map((item, idx) => {
                          const ehDesconto =
                            item.produto?.id === 998 ||
                            String(item.id || '').startsWith('desconto-') ||
                            (Number(item.produto?.preco) || 0) < 0;
                          return (
                            <span
                              key={`${v.id}-item-${idx}`}
                              className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium ${
                                ehDesconto
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                  : 'bg-white text-slate-600 border border-slate-200/70'
                              }`}
                            >
                              {ehDesconto
                                ? `DESCONTO (${mascarar(formatarMoeda(Math.abs(Number(item.produto?.preco) || 0)))})`
                                : `${item.quantidade}x ${(item.produto?.nome || 'PRODUTO').toUpperCase()}`}
                            </span>
                          );
                        })}
                        {itensReais.length > 6 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-medium">
                            +{itensReais.length - 6} itens
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* LISTA DETALHADA: RECEBIMENTOS */}
        {tipo === 'recebido' && (
          <div className="space-y-2.5">
            {recebimentosFiltrados.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-[#f8fafc] rounded-2xl border border-slate-100">
                Nenhum recebimento encontrado para este filtro.
              </div>
            ) : (
              recebimentosFiltrados.map((l) => (
                <div
                  key={l.id}
                  className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          l.origem === 'pdv'
                            ? 'bg-sky-50 text-sky-700 border border-sky-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        {l.origem === 'pdv' ? 'PDV' : 'Financeiro'}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {l.titulo}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {formatarDataHoraBR(l.dataHora)} · {l.metodoLabel} · {l.subtitulo}
                    </p>
                  </div>

                  <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                    {mascarar(formatarMoeda(l.valor))}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* LISTA DETALHADA: LUCRO POR COMANDA OU PRODUTO */}
        {tipo === 'lucro' && abaLucro === 'comandas' && (
          <div className="space-y-2.5">
            {vendasLucroFiltradas.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-[#f8fafc] rounded-2xl border border-slate-100">
                Nenhuma venda de produto registrada neste período.
              </div>
            ) : (
              vendasLucroFiltradas.map((v) => (
                <div
                  key={v.id}
                  className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {`Mesa ${v.numeroMesa}`}
                        </span>
                        {v.nomeCliente && (
                          <span className="text-xs font-medium text-slate-600 truncate max-w-40">
                            · {v.nomeCliente}
                          </span>
                        )}
                        {v.desconto > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[10px] font-semibold tabular-nums">
                            {`Desc. -${mascarar(formatarMoeda(v.desconto))}`}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {formatarDataHoraBR(v.dataFechamento)}
                        {v.garcomNome ? ` · ${v.garcomNome}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-bold tabular-nums block ${
                          v.lucroLiquido < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {mascarar(formatarMoeda(v.lucroLiquido))}
                      </span>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {`Margem ${v.margemPct.toFixed(0)}%`}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-[11px] tabular-nums">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Venda Prod.</span>
                      <span className="font-semibold text-slate-700">
                        {mascarar(formatarMoeda(v.receitaBruta))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Custo</span>
                      <span className="font-semibold text-slate-700">
                        {mascarar(formatarMoeda(v.custoTotal))}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Desconto</span>
                      <span
                        className={`font-semibold ${
                          v.desconto > 0 ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        {mascarar(formatarMoeda(v.desconto))}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tipo === 'lucro' && abaLucro === 'produtos' && (
          <div className="space-y-2">
            {produtosLucroFiltrados.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-[#f8fafc] rounded-2xl border border-slate-100">
                Nenhum produto vendido neste período.
              </div>
            ) : (
              produtosLucroFiltrados.map((p) => (
                <div
                  key={`${p.nome}-${p.categoria}`}
                  className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{p.nome}</div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {`${p.categoria} · ${p.quantidade} unid. · Venda ${mascarar(formatarMoeda(p.receitaBruta))} · Custo ${mascarar(formatarMoeda(p.custoTotal))}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-sm font-bold tabular-nums block ${
                        p.lucroBruto < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {mascarar(formatarMoeda(p.lucroBruto))}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {`Margem ${p.margemPct.toFixed(0)}%`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LISTA DETALHADA: GUARDA-SOL */}
        {tipo === 'guardasol' && (
          <div className="space-y-2.5">
            {guardaSolFiltrados.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-[#f8fafc] rounded-2xl border border-slate-100">
                Nenhuma taxa de guarda-sol registrada neste período.
              </div>
            ) : (
              guardaSolFiltrados.map((g) => (
                <div
                  key={g.id}
                  className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          g.origem === 'pdv'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        {`${g.quantidade} unid.`}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {g.titulo}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {formatarDataHoraBR(g.dataHora)} · {g.subtitulo}
                    </p>
                  </div>

                  <span className="text-sm font-bold text-slate-900 tabular-nums shrink-0">
                    {mascarar(formatarMoeda(g.valor))}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* DETALHAMENTO DE RESULTADO LÍQUIDO */}
        {tipo === 'resultado' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-2.5">
              <span className="text-xs font-semibold text-slate-800 block">
                Composição Entradas × Saídas
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Vendas PDV</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {mascarar(formatarMoeda(resumoBI.entradasPdv))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Entradas Manuais</span>
                  <span className="font-semibold text-emerald-600 tabular-nums">
                    {mascarar(formatarMoeda(resumoBI.entradasManuais))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Saídas Operacionais</span>
                  <span className="font-semibold text-rose-500 tabular-nums">
                    -{mascarar(formatarMoeda(resumoBI.saidasManuais))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pagamentos Equipe / Vales</span>
                  <span className="font-semibold text-rose-500 tabular-nums">
                    -{mascarar(formatarMoeda(resumoBI.saidasVales))}
                  </span>
                </div>
              </div>
            </div>

            {resumoBI.rankingSaidasCategorias.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-[#f8fafc] border border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Principais Categorias de Saída
                </span>
                <div className="space-y-2">
                  {resumoBI.rankingSaidasCategorias.map((cat) => (
                    <div key={cat.nome} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-medium text-slate-700 truncate block">
                          {cat.nome.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-400">{cat.subtitulo}</span>
                      </div>
                      <span className="font-bold text-rose-600 tabular-nums shrink-0">
                        {mascarar(formatarMoeda(cat.valor))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalDetalheMetrica(props: ModalDetalheMetricaProps) {
  const { tipo, onClose } = props;

  useEffect(() => {
    if (!tipo) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [tipo, onClose]);

  if (!tipo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detalhamento da métrica"
      onClick={onClose}
      className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-150"
    >
      <ModalDetalheConteudo key={tipo} {...props} tipo={tipo} />
    </div>
  );
}
