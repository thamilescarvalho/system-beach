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

function formatarHoraCurtaBR(iso: string): string {
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

function Indicador5DModal({
  label,
  valor,
  destaque = 'padrao'
}: {
  label: string;
  valor: string;
  destaque?: 'padrao' | 'positivo' | 'negativo' | 'alerta';
}) {
  const corValor =
    destaque === 'positivo'
      ? 'text-emerald-600'
      : destaque === 'negativo'
        ? 'text-rose-500'
        : destaque === 'alerta'
          ? 'text-amber-600'
          : 'text-slate-600';

  return (
    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 shadow-2xs flex flex-col justify-between gap-0.5 min-w-0">
      <span className="text-[10px] font-medium text-slate-400 truncate">{label}</span>
      <span className={`text-xs sm:text-sm font-semibold tabular-nums truncate ${corValor}`}>
        {valor}
      </span>
    </div>
  );
}

function EstadoVazioCompacto({ mensagem = 'Nenhum registro neste período.' }: { mensagem?: string }) {
  return (
    <div className="py-5 px-3 text-center text-xs text-slate-400 rounded-2xl bg-slate-50 border border-slate-100">
      {mensagem}
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
        titulo: 'Vendas',
        periodo: rotulosPeriodo.vendas,
        bgIcone: 'bg-sky-50 border-sky-100 text-sky-500',
        Icone: LucideIcons.ShoppingBag
      };
    }
    if (tipo === 'recebido') {
      return {
        titulo: 'Recebimentos',
        periodo: `${rotulosPeriodo.recebido} · ${metodoLabel}`,
        bgIcone: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        Icone: LucideIcons.Wallet
      };
    }
    if (tipo === 'lucro') {
      return {
        titulo: 'Lucro',
        periodo: rotulosPeriodo.lucro,
        bgIcone: 'bg-teal-50 border-teal-100 text-teal-600',
        Icone: LucideIcons.BadgeDollarSign
      };
    }
    if (tipo === 'guardasol') {
      return {
        titulo: 'Guarda-Sol',
        periodo: rotulosPeriodo.guardasol,
        bgIcone: 'bg-amber-50 border-amber-100 text-amber-600',
        Icone: LucideIcons.Umbrella
      };
    }
    return {
      titulo: 'Resultado',
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

  const totalItensLista = useMemo(() => {
    if (tipo === 'vendas') return resumoVendas.vendasPeriodo.length;
    if (tipo === 'recebido') return resumoRecebimentos.lancamentosPeriodo.length;
    if (tipo === 'lucro') {
      return abaLucro === 'comandas'
        ? resumoLucro.vendasLucro.length
        : resumoLucro.produtosLucro.length;
    }
    if (tipo === 'guardasol') return resumoGuardaSol.registrosGuardaSol.length;
    return 0;
  }, [
    tipo,
    abaLucro,
    resumoVendas.vendasPeriodo.length,
    resumoRecebimentos.lancamentosPeriodo.length,
    resumoLucro.vendasLucro.length,
    resumoLucro.produtosLucro.length,
    resumoGuardaSol.registrosGuardaSol.length
  ]);

  const IconeCabecalho = cabecalho.Icone;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-xs sm:max-w-md bg-white rounded-3xl border border-slate-100 ring-1 ring-slate-900/5 shadow-2xl shadow-slate-900/15 max-h-[80dvh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-150 font-sans"
    >
      {/* Brilho especular 5D superior */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-slate-50/70 to-transparent"
      />

      {/* Cabeçalho compacto */}
      <div className="relative z-10 px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-9 h-9 rounded-2xl border shadow-2xs flex items-center justify-center shrink-0 ${cabecalho.bgIcone}`}
          >
            <IconeCabecalho size={17} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate leading-tight">
              {cabecalho.titulo}
            </h2>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {cabecalho.periodo} · {contaRotulo}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <LucideIcons.X size={14} />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3">
        {/* FAIXA DE INDICADORES ESSENCIAIS (3 COLUNAS) */}
        {tipo === 'vendas' && (
          <div className="grid grid-cols-3 gap-2">
            <Indicador5DModal label="Vendas" valor={String(resumoVendas.quantidadeConcluidas)} />
            <Indicador5DModal
              label="Faturamento"
              valor={mascarar(formatarMoeda(resumoVendas.faturamentoConcluidas))}
              destaque="positivo"
            />
            <Indicador5DModal
              label="Ticket Médio"
              valor={mascarar(formatarMoeda(resumoVendas.ticketMedio))}
            />
          </div>
        )}

        {tipo === 'recebido' && (
          <div className="grid grid-cols-3 gap-2">
            <Indicador5DModal
              label="Total"
              valor={mascarar(formatarMoeda(resumoRecebimentos.totalSelecionado))}
              destaque="positivo"
            />
            <Indicador5DModal
              label="Via PDV"
              valor={mascarar(formatarMoeda(resumoRecebimentos.valorVendasSelecionado))}
            />
            <Indicador5DModal
              label="Financeiro"
              valor={mascarar(formatarMoeda(resumoRecebimentos.valorEntradasManuaisSelecionado))}
            />
          </div>
        )}

        {tipo === 'lucro' && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Indicador5DModal
                label="Lucro Real"
                valor={mascarar(formatarMoeda(resumoLucro.lucroTotal))}
                destaque={resumoLucro.lucroTotal < 0 ? 'negativo' : 'positivo'}
              />
              <Indicador5DModal
                label="Custo Prod."
                valor={mascarar(formatarMoeda(resumoLucro.custoTotal))}
              />
              {resumoLucro.descontoTotal > 0 ? (
                <Indicador5DModal
                  label="Descontos"
                  valor={mascarar(formatarMoeda(resumoLucro.descontoTotal))}
                  destaque="alerta"
                />
              ) : (
                <Indicador5DModal
                  label="Margem"
                  valor={`${resumoLucro.margemLucroPct.toFixed(0)}%`}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="inline-flex p-0.5 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setAbaLucro('comandas')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                    abaLucro === 'comandas'
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  Comandas ({resumoLucro.vendasLucro.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAbaLucro('produtos')}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                    abaLucro === 'produtos'
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  Produtos ({resumoLucro.produtosLucro.length})
                </button>
              </div>

              {resumoLucro.descontoTotal > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-semibold tabular-nums">
                  {`Margem ${resumoLucro.margemLucroPct.toFixed(0)}%`}
                </span>
              )}
            </div>
          </div>
        )}

        {tipo === 'guardasol' && (
          <div className="grid grid-cols-3 gap-2">
            <Indicador5DModal
              label="Total"
              valor={mascarar(formatarMoeda(resumoGuardaSol.valorTotal))}
              destaque="positivo"
            />
            <Indicador5DModal
              label="Comandas"
              valor={String(resumoGuardaSol.qtdVendasComGuardaSol)}
            />
            <Indicador5DModal label="Unidades" valor={String(resumoGuardaSol.qtdUnidades)} />
          </div>
        )}

        {tipo === 'resultado' && (
          <div className="grid grid-cols-3 gap-2">
            <Indicador5DModal
              label="Entradas"
              valor={mascarar(formatarMoeda(resumoBI.entradasTotal))}
              destaque="positivo"
            />
            <Indicador5DModal
              label="Saídas"
              valor={mascarar(formatarMoeda(resumoBI.saidasTotal))}
              destaque={resumoBI.saidasTotal > 0 ? 'negativo' : 'padrao'}
            />
            <Indicador5DModal
              label="Em Contas"
              valor={mascarar(formatarMoeda(saldoConsolidadoContas))}
            />
          </div>
        )}

        {/* BUSCA DISCRETA APENAS QUANDO HOUVER MAIS DE 4 REGISTROS */}
        {tipo !== 'resultado' && totalItensLista > 4 && (
          <div className="relative">
            <LucideIcons.Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar..."
              className="w-full h-8 pl-8 pr-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:bg-white transition-all"
            />
          </div>
        )}

        {/* LISTA: VENDAS */}
        {tipo === 'vendas' && (
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
            {vendasFiltradas.length === 0 ? (
              <EstadoVazioCompacto />
            ) : (
              vendasFiltradas.map((v) => {
                const cancelada = v.status === 'cancelada';
                const metodos = Array.isArray(v.pagamentos)
                  ? v.pagamentos.map((p) => String(p.metodo || '').toUpperCase()).join(' · ')
                  : '';

                return (
                  <div
                    key={v.id}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2.5 ${
                      cancelada
                        ? 'bg-rose-50/40 border-rose-100'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          {`Mesa ${v.numeroMesa}`}
                        </span>
                        {v.nomeCliente && (
                          <span className="text-[11px] text-slate-500 truncate">
                            · {v.nomeCliente}
                          </span>
                        )}
                        {cancelada && (
                          <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-semibold">
                            Cancelada
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {formatarHoraCurtaBR(v.dataFechamento)}
                        {metodos ? ` · ${metodos}` : ''}
                      </p>
                    </div>

                    <span
                      className={`text-xs font-semibold tabular-nums shrink-0 ${
                        cancelada ? 'text-rose-400 line-through' : 'text-slate-600'
                      }`}
                    >
                      {mascarar(formatarMoeda(Number(v.total) || 0))}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* LISTA: RECEBIMENTOS */}
        {tipo === 'recebido' && (
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
            {recebimentosFiltrados.length === 0 ? (
              <EstadoVazioCompacto />
            ) : (
              recebimentosFiltrados.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold shrink-0 ${
                          l.origem === 'pdv'
                            ? 'bg-sky-50 text-sky-700 border border-sky-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}
                      >
                        {l.origem === 'pdv' ? 'PDV' : 'Fin.'}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {l.titulo}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {formatarHoraCurtaBR(l.dataHora)} · {l.metodoLabel}
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                    {mascarar(formatarMoeda(l.valor))}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* LISTA: LUCRO POR COMANDA */}
        {tipo === 'lucro' && abaLucro === 'comandas' && (
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
            {vendasLucroFiltradas.length === 0 ? (
              <EstadoVazioCompacto />
            ) : (
              vendasLucroFiltradas.map((v) => (
                <div
                  key={v.id}
                  className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {`Mesa ${v.numeroMesa}`}
                      </span>
                      {v.desconto > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-[9px] font-semibold tabular-nums shrink-0">
                          {`-${mascarar(formatarMoeda(v.desconto))}`}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 tabular-nums">
                      {`Venda ${mascarar(formatarMoeda(v.receitaBruta))} · Custo ${mascarar(formatarMoeda(v.custoTotal))}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold tabular-nums block ${
                        v.lucroLiquido < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {mascarar(formatarMoeda(v.lucroLiquido))}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {`${v.margemPct.toFixed(0)}%`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LISTA: LUCRO POR PRODUTO */}
        {tipo === 'lucro' && abaLucro === 'produtos' && (
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
            {produtosLucroFiltrados.length === 0 ? (
              <EstadoVazioCompacto />
            ) : (
              produtosLucroFiltrados.map((p) => (
                <div
                  key={`${p.nome}-${p.categoria}`}
                  className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{p.nome}</div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 tabular-nums">
                      {`${p.quantidade}x · Custo ${mascarar(formatarMoeda(p.custoTotal))}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`text-xs font-bold tabular-nums block ${
                        p.lucroBruto < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {mascarar(formatarMoeda(p.lucroBruto))}
                    </span>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {`${p.margemPct.toFixed(0)}%`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* LISTA: GUARDA-SOL */}
        {tipo === 'guardasol' && (
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
            {guardaSolFiltrados.length === 0 ? (
              <EstadoVazioCompacto />
            ) : (
              guardaSolFiltrados.map((g) => (
                <div
                  key={g.id}
                  className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-semibold shrink-0">
                        {`${g.quantidade}x`}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate">
                        {g.titulo}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {formatarHoraCurtaBR(g.dataHora)}
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">
                    {mascarar(formatarMoeda(g.valor))}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* DETALHAMENTO: RESULTADO LÍQUIDO */}
        {tipo === 'resultado' && (
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
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
                <span className="text-slate-500">Pagamentos / Vales</span>
                <span className="font-semibold text-rose-500 tabular-nums">
                  -{mascarar(formatarMoeda(resumoBI.saidasVales))}
                </span>
              </div>
            </div>

            {resumoBI.rankingSaidasCategorias.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-700 block">
                  Saídas por Categoria
                </span>
                {resumoBI.rankingSaidasCategorias.slice(0, 4).map((cat) => (
                  <div key={cat.nome} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 truncate">{cat.nome.toUpperCase()}</span>
                    <span className="font-bold text-rose-600 tabular-nums shrink-0">
                      {mascarar(formatarMoeda(cat.valor))}
                    </span>
                  </div>
                ))}
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
      className="fixed inset-0 z-70 bg-slate-900/35 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <ModalDetalheConteudo key={tipo} {...props} tipo={tipo} />
    </div>
  );
}
