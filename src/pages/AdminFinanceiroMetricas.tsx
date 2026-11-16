import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import { Card5D } from '../components/financeiro/Card5D';
import {
  MenuContaDropdown,
  MenuFiltroMetricaDropdown,
  MenuSimplesDropdown
} from '../components/financeiro/BotaoEmojiFiltro';
import { GraficoComparativoBarras } from '../components/financeiro/GraficoComparativoBarras';
import {
  ModalDetalheMetrica,
  type TipoMetricaModal
} from '../components/financeiro/ModalDetalheMetrica';
import {
  calcularSaldosPorConta,
  formatarMoeda,
  obterDataLocalYYYYMMDD
} from '../components/financeiro/financeiroUtils';
import {
  calcularIntervaloPreset,
  calcularResumoExecutivoBI,
  calcularResumoGuardaSolPeriodo,
  calcularResumoLucroPeriodo,
  calcularResumoVendasPeriodo,
  calcularRecebimentosPorMetodo,
  formatarRotuloIntervalo,
  OPCOES_METODO_EMOJI,
  OPCOES_PERIODO_GLOBAL,
  type IntervaloDatas,
  type ItemRanking,
  type MetodoPagamentoChave,
  type PresetPeriodo
} from '../components/financeiro/metricasUtils';

type AbaRanking = 'produtos' | 'categorias' | 'equipe' | 'saidas' | 'contas';

const OPCOES_ABA_RANKING: { chave: AbaRanking; label: string }[] = [
  { chave: 'produtos', label: 'Produtos + vendidos' },
  { chave: 'categorias', label: 'Categorias de Venda' },
  { chave: 'equipe', label: 'Atendimentos' },
  { chave: 'saidas', label: 'Maiores Saídas' },
  { chave: 'contas', label: 'Saldos por Conta' }
];

const TITULOS_ABA_RANKING: Record<AbaRanking, string> = {
  produtos: 'Produtos + vendidos',
  categorias: 'Receita por Categoria',
  equipe: 'Atendimentos por Operador',
  saidas: 'Saídas por Categoria',
  contas: 'Saldos por Conta Financeira'
};

interface EstadoFiltroPeriodo {
  preset: PresetPeriodo;
  custom: IntervaloDatas;
}

function resolverIntervaloEstado(estado: EstadoFiltroPeriodo, hoje: string): IntervaloDatas {
  if (estado.preset === 'custom') {
    const inicio = estado.custom.inicio || hoje;
    const fim = estado.custom.fim || inicio;
    return inicio <= fim ? { inicio, fim } : { inicio: fim, fim: inicio };
  }
  return calcularIntervaloPreset(estado.preset, hoje);
}

function MoedaSutil({
  valor,
  ocultar = false,
  classNamePrefixo = 'text-[0.65em] font-normal text-slate-400 mr-0.5'
}: {
  valor: number;
  ocultar?: boolean;
  classNamePrefixo?: string;
}) {
  if (ocultar) {
    return (
      <>
        <span className={classNamePrefixo}>R$</span>
        <span>••••</span>
      </>
    );
  }

  const negativo = valor < 0;
  const formatadoAbs = formatarMoeda(Math.abs(valor)).replace(/^R\$\s?/i, '');

  return (
    <>
      {negativo && <span>-</span>}
      <span className={classNamePrefixo}>R$</span>
      <span>{formatadoAbs}</span>
    </>
  );
}

function AnelProgressoCircular({
  percentual,
  corHex
}: {
  percentual: number;
  corHex: string;
}) {
  const pctLimpo = Math.min(100, Math.max(0, Number.isFinite(percentual) ? percentual : 0));
  const tamanho = 120;
  const espessura = 9;
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia - (pctLimpo / 100) * circunferencia;

  return (
    <div className="relative inline-flex items-center justify-center my-1 sm:my-2">
      <svg
        viewBox={`0 0 ${tamanho} ${tamanho}`}
        className="w-20 h-20 sm:w-28 sm:h-28 -rotate-90"
      >
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={espessura}
        />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={corHex}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base sm:text-xl font-medium text-slate-500 tabular-nums tracking-tight">
          {Math.round(pctLimpo)}
          <span className="text-[0.68em] font-normal text-slate-400 ml-0.5">%</span>
        </span>
      </div>
    </div>
  );
}

export function AdminFinanceiroMetricas() {
  const navigate = useNavigate();
  const contexto = useAppContext();

  const dataHoje = useMemo(() => obterDataLocalYYYYMMDD(), []);
  const historicoVendas = useMemo(() => contexto?.historicoVendas ?? [], [contexto?.historicoVendas]);
  const movimentacoesCaixa = useMemo(() => contexto?.movimentacoesCaixa ?? [], [contexto?.movimentacoesCaixa]);
  const historicoPagamentos = useMemo(() => contexto?.historicoPagamentos ?? [], [contexto?.historicoPagamentos]);
  const contasFinanceiras = useMemo(() => contexto?.contasFinanceiras ?? [], [contexto?.contasFinanceiras]);
  const notasCompraEstoque = useMemo(() => contexto?.notasCompraEstoque ?? [], [contexto?.notasCompraEstoque]);
  const produtos = useMemo(() => contexto?.produtos ?? [], [contexto?.produtos]);
  const mesas = useMemo(() => contexto?.mesas ?? [], [contexto?.mesas]);

  const [ocultarValores, setOcultarValores] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [contaFiltroId, setContaFiltroId] = useState<string>('todas');

  const [periodoGlobal, setPeriodoGlobal] = useState<EstadoFiltroPeriodo>({
    preset: 'hoje',
    custom: { inicio: dataHoje, fim: dataHoje }
  });
  const [metodoSelecionado, setMetodoSelecionado] = useState<MetodoPagamentoChave>('todos');
  const [abaRanking, setAbaRanking] = useState<AbaRanking>('produtos');
  const [modalMetricaAtiva, setModalMetricaAtiva] = useState<TipoMetricaModal | null>(null);

  const contaFiltroNormalizada = contaFiltroId === 'todas' ? null : contaFiltroId;
  const contaRotulo = useMemo(() => {
    if (!contaFiltroNormalizada) return 'Todas as contas';
    return contasFinanceiras.find((c) => c.id === contaFiltroNormalizada)?.nome || 'Todas as contas';
  }, [contaFiltroNormalizada, contasFinanceiras]);

  const aoMudarPeriodoGlobal = (novoPreset: PresetPeriodo) => {
    setPeriodoGlobal((prev) => ({ ...prev, preset: novoPreset }));
  };

  const aoMudarCustomGlobal = (campo: 'inicio' | 'fim', valor: string) => {
    if (!valor) return;
    setPeriodoGlobal((prev) => ({
      preset: 'custom',
      custom: { ...prev.custom, [campo]: valor }
    }));
  };

  const aoAtualizarDados = async () => {
    if (!contexto?.carregarDados || atualizando) return;
    setAtualizando(true);
    try {
      await contexto.carregarDados(false);
    } finally {
      setAtualizando(false);
    }
  };

  const intervaloGlobal = useMemo(
    () => resolverIntervaloEstado(periodoGlobal, dataHoje),
    [periodoGlobal, dataHoje]
  );

  const resumoVendas = useMemo(
    () =>
      calcularResumoVendasPeriodo({
        vendas: historicoVendas,
        contasFinanceiras,
        inicio: intervaloGlobal.inicio,
        fim: intervaloGlobal.fim,
        contaFiltroId: contaFiltroNormalizada
      }),
    [historicoVendas, contasFinanceiras, intervaloGlobal, contaFiltroNormalizada]
  );

  const resumoRecebimentos = useMemo(
    () =>
      calcularRecebimentosPorMetodo({
        vendas: historicoVendas,
        movimentacoes: movimentacoesCaixa,
        contasFinanceiras,
        inicio: intervaloGlobal.inicio,
        fim: intervaloGlobal.fim,
        metodoSelecionado,
        contaFiltroId: contaFiltroNormalizada
      }),
    [
      historicoVendas,
      movimentacoesCaixa,
      contasFinanceiras,
      intervaloGlobal,
      metodoSelecionado,
      contaFiltroNormalizada
    ]
  );

  const resumoGuardaSol = useMemo(
    () =>
      calcularResumoGuardaSolPeriodo({
        vendas: historicoVendas,
        movimentacoes: movimentacoesCaixa,
        contasFinanceiras,
        inicio: intervaloGlobal.inicio,
        fim: intervaloGlobal.fim,
        contaFiltroId: contaFiltroNormalizada
      }),
    [
      historicoVendas,
      movimentacoesCaixa,
      contasFinanceiras,
      intervaloGlobal,
      contaFiltroNormalizada
    ]
  );

  const resumoLucro = useMemo(
    () =>
      calcularResumoLucroPeriodo({
        vendas: historicoVendas,
        produtos,
        contasFinanceiras,
        inicio: intervaloGlobal.inicio,
        fim: intervaloGlobal.fim,
        contaFiltroId: contaFiltroNormalizada
      }),
    [historicoVendas, produtos, contasFinanceiras, intervaloGlobal, contaFiltroNormalizada]
  );

  const resumoBI = useMemo(
    () =>
      calcularResumoExecutivoBI({
        vendas: historicoVendas,
        movimentacoes: movimentacoesCaixa,
        pagamentos: historicoPagamentos,
        notasCompra: notasCompraEstoque,
        contasFinanceiras,
        produtos,
        inicio: intervaloGlobal.inicio,
        fim: intervaloGlobal.fim,
        contaFiltroId: contaFiltroNormalizada
      }),
    [
      historicoVendas,
      movimentacoesCaixa,
      historicoPagamentos,
      notasCompraEstoque,
      contasFinanceiras,
      produtos,
      intervaloGlobal,
      contaFiltroNormalizada
    ]
  );

  const salaoEmAberto = useMemo(() => {
    const ocupadas = mesas.filter((m) => m.status === 'ocupada');
    let valorEmAberto = 0;
    for (const m of ocupadas) {
      if (Array.isArray(m.itens)) {
        for (const item of m.itens) {
          valorEmAberto += (Number(item.produto?.preco) || 0) * (Number(item.quantidade) || 0);
        }
      }
    }
    return {
      mesasOcupadas: ocupadas.length,
      totalMesas: mesas.length,
      ocupacaoPct: mesas.length > 0 ? (ocupadas.length / mesas.length) * 100 : 0,
      valorEmAberto
    };
  }, [mesas]);

  const saldosContas = useMemo(
    () =>
      calcularSaldosPorConta(
        contasFinanceiras,
        historicoVendas,
        movimentacoesCaixa,
        historicoPagamentos
      ),
    [contasFinanceiras, historicoVendas, movimentacoesCaixa, historicoPagamentos]
  );

  const rankingContas = useMemo<ItemRanking[]>(() => {
    const lista = Array.from(saldosContas.porConta.values()).filter((r) => r.conta.ativo);
    const totalPositivo = lista.reduce((acc, r) => acc + Math.max(0, r.saldoAtual), 0);
    return [...lista]
      .sort((a, b) => b.saldoAtual - a.saldoAtual)
      .slice(0, 6)
      .map((r) => ({
        nome: r.conta.nome,
        subtitulo: `${r.conta.tipo.toUpperCase()} · PDV ${formatarMoeda(r.entradasPdv)}`,
        valor: r.saldoAtual,
        quantidade: 1,
        participacaoPct: totalPositivo > 0 ? Math.max(0, (r.saldoAtual / totalPositivo) * 100) : 0
      }));
  }, [saldosContas]);

  const listaRankingAtivo = useMemo<ItemRanking[]>(() => {
    if (abaRanking === 'produtos') return resumoBI.rankingProdutos;
    if (abaRanking === 'categorias') return resumoBI.rankingCategorias;
    if (abaRanking === 'equipe') return resumoBI.rankingGarcons;
    if (abaRanking === 'saidas') return resumoBI.rankingSaidasCategorias;
    return rankingContas;
  }, [abaRanking, resumoBI, rankingContas]);

  const metodoAtivoMeta = useMemo(
    () => OPCOES_METODO_EMOJI.find((o) => o.chave === metodoSelecionado) ?? OPCOES_METODO_EMOJI[0],
    [metodoSelecionado]
  );

  const rotuloGlobal = formatarRotuloIntervalo(intervaloGlobal.inicio, intervaloGlobal.fim, dataHoje);

  const percentualAnelVendas = useMemo(() => {
    const totalPedidos = resumoVendas.quantidadeConcluidas + resumoVendas.quantidadeCanceladas;
    if (totalPedidos === 0) return 0;
    return (resumoVendas.quantidadeConcluidas / totalPedidos) * 100;
  }, [resumoVendas]);

  return (
    <div className="min-h-dvh bg-[#e0e3ea] text-slate-800 font-sans antialiased md:pl-18">
      <Header />

      <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 md:px-8 pt-22 sm:pt-24 md:pt-24 pb-28 md:pb-12 space-y-3.5 sm:space-y-5">
        {/* BARRA SUPERIOR */}
        <section className="relative z-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2 flex-nowrap w-full min-w-0">
            <MenuContaDropdown
              contas={contasFinanceiras}
              contaSelecionadaId={contaFiltroId}
              onChange={setContaFiltroId}
            />

            <MenuFiltroMetricaDropdown
              opcoesPeriodo={OPCOES_PERIODO_GLOBAL}
              presetPeriodo={periodoGlobal.preset}
              rotuloPeriodo={rotuloGlobal}
              customDatas={periodoGlobal.custom}
              dataMaxima={dataHoje}
              onChangePreset={aoMudarPeriodoGlobal}
              onChangeCustomData={aoMudarCustomGlobal}
              tamanho="md"
              alinhamento="responsivo"
            />

            <button
              type="button"
              onClick={() => setOcultarValores((v) => !v)}
              title={ocultarValores ? 'Mostrar valores' : 'Ocultar valores'}
              aria-label="Alternar visibilidade de valores"
              className="w-8 h-8 rounded-full bg-white border border-slate-200/90 text-slate-500 hover:text-slate-700 hover:shadow-sm active:scale-95 flex items-center justify-center shadow-2xs transition-all cursor-pointer shrink-0"
            >
              {ocultarValores ? <LucideIcons.EyeOff size={14} /> : <LucideIcons.Eye size={14} />}
            </button>

            <button
              type="button"
              onClick={aoAtualizarDados}
              disabled={atualizando}
              title="Atualizar métricas"
              aria-label="Atualizar métricas"
              className="w-8 h-8 rounded-full bg-white border border-slate-200/90 text-slate-500 hover:text-emerald-600 hover:shadow-sm active:scale-95 flex items-center justify-center shadow-2xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <LucideIcons.RefreshCw size={14} className={atualizando ? 'animate-spin' : ''} />
            </button>
          </div>
        </section>

        {/* LINHA 1: 4 CARDS HORIZONTAIS  */}
        <section className="relative z-10 grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
          {/* CARD 1: QUANTIDADE DE VENDAS FECHADAS */}
          <Card5D
            onClick={() => setModalMetricaAtiva('vendas')}
            title="Clique para analisar vendas"
            innerClassName="p-3.5 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">
                <span className="sm:hidden">Vendas</span>
                <span className="hidden sm:inline">Vendas Fechadas</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="text-lg sm:text-2xl xl:text-2xl font-medium text-slate-500 tracking-tight tabular-nums truncate">
                {resumoVendas.quantidadeConcluidas}
              </div>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-4xl sm:rounded-2xl bg-sky-50 border border-sky-100/90 shadow-2xs flex items-center justify-center text-sky-500 shrink-0">
                <LucideIcons.ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1} />
              </div>
            </div>
          </Card5D>

          {/* CARD 2: VALOR RECEBIDO (PDV + FINANCEIRO ENTRADAS) */}
          <Card5D
            onClick={() => setModalMetricaAtiva('recebido')}
            title="Clique para analisar recebimentos"
            innerClassName="p-3.5 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">
                <span className="sm:hidden">Recebido</span>
                <span className="hidden sm:inline">Valor Recebido</span>
              </span>

              {metodoSelecionado !== 'todos' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMetodoSelecionado('todos');
                  }}
                  title="Limpar filtro de forma de pagamento"
                  className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100/70 transition-colors cursor-pointer shrink-0 truncate max-w-24"
                >
                  {metodoAtivoMeta.label} ×
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="text-lg sm:text-2xl xl:text-2xl font-medium text-slate-500 tracking-tight tabular-nums truncate">
                <MoedaSutil valor={resumoRecebimentos.totalSelecionado} ocultar={ocultarValores} />
              </div>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-4xl sm:rounded-2xl bg-emerald-50 border border-emerald-100/90 shadow-2xs flex items-center justify-center text-emerald-500 shrink-0">
                <LucideIcons.Wallet className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1} />
              </div>
            </div>
          </Card5D>

          {/* CARD 3: LUCRO TOTAL DOS PRODUTOS VENDIDOS (PREÇO DE VENDA - DESCONTOS - CUSTO) */}
          <Card5D
            onClick={() => setModalMetricaAtiva('lucro')}
            title="Clique para analisar lucro por comanda e produto"
            innerClassName="p-3.5 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">
                <span className="sm:hidden">Lucro</span>
                <span className="hidden sm:inline">Lucro de Produtos</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div
                className={`text-lg sm:text-2xl xl:text-2xl font-medium tracking-tight tabular-nums truncate ${
                  resumoLucro.lucroTotal < 0 ? 'text-rose-400' : 'text-slate-500'
                }`}
              >
                <MoedaSutil valor={resumoLucro.lucroTotal} ocultar={ocultarValores} />
              </div>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-4xl sm:rounded-2xl bg-emerald-50 border border-emerald-100/90 shadow-2xs flex items-center justify-center text-emerald-500 shrink-0">
                <LucideIcons.BadgeDollarSign className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1} />
              </div>
            </div>
          </Card5D>

          {/* CARD 4: TAXA DE GUARDA-SOL RECEBIDA */}
          <Card5D
            onClick={() => setModalMetricaAtiva('guardasol')}
            title="Clique para analisar taxas de guarda-sol"
            innerClassName="p-3.5 sm:p-5 flex flex-col justify-between gap-3 sm:gap-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-medium text-slate-400 truncate">
                <span className="sm:hidden">Guarda-Sol</span>
                <span className="hidden sm:inline">Taxa Guarda-Sol</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="text-lg sm:text-2xl xl:text-2xl font-medium text-slate-500 tracking-tight tabular-nums truncate">
                <MoedaSutil valor={resumoGuardaSol.valorTotal} ocultar={ocultarValores} />
              </div>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-4xl sm:rounded-2xl bg-amber-50 border border-amber-100/90 shadow-2xs flex items-center justify-center text-amber-500 shrink-0">
                <LucideIcons.Umbrella className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.3} />
              </div>
            </div>
          </Card5D>
        </section>

        {/* LINHA 2 */}
        <section className="grid grid-cols-2 lg:grid-cols-12 gap-2.5 sm:gap-4 items-stretch">
          {/* CARD 5: VENDAS CONCLUÍDAS */}
          <Card5D
            onClick={() => setModalMetricaAtiva('vendas')}
            title="Clique para analisar vendas"
            className="col-span-1 lg:col-span-3"
            innerClassName="p-3.5 sm:p-5 flex flex-col justify-between items-center text-center"
          >
            <div className="w-full text-left">
              <h2 className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5 truncate">
                Vendas Concluídas
              </h2>
            </div>

            <AnelProgressoCircular percentual={percentualAnelVendas} corHex="#10b981" />

            <div className="w-full">
              <span className="text-[10px] sm:text-xs font-normal text-slate-400 block truncate">
                {`(${rotuloGlobal})`}
              </span>
              <span className="text-sm sm:text-base font-medium text-slate-500 tabular-nums tracking-tight mt-0.5 block truncate">
                <MoedaSutil valor={resumoVendas.faturamentoConcluidas} ocultar={ocultarValores} />
              </span>
            </div>
          </Card5D>

          {/* CARD 6: RESULTADO LÍQUIDO & SALDO DE CAIXA */}
          <Card5D
            onClick={() => setModalMetricaAtiva('resultado')}
            title="Clique para analisar resultado líquido"
            className="col-span-1 lg:col-span-3"
            innerClassName="p-3.5 sm:p-5 flex flex-col justify-between gap-2.5 sm:gap-3.5"
          >
            <div className="flex items-start justify-between gap-1.5">
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5 truncate">
                  <span className="sm:hidden">Resumo</span>
                  <span className="hidden sm:inline">Resumo Líquido</span>
                </h2>
              </div>
              <span className="h-5 sm:h-6 px-2 rounded-full bg-slate-50 border border-slate-200/70 text-[10px] font-medium text-slate-400 inline-flex items-center shrink-0">
                {rotuloGlobal}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div
                className={`text-lg sm:text-2xl font-medium tracking-tight tabular-nums truncate ${
                  resumoBI.resultadoLiquido < 0 ? 'text-rose-400' : 'text-slate-500'
                }`}
              >
                <MoedaSutil valor={resumoBI.resultadoLiquido} ocultar={ocultarValores} />
              </div>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-4xl sm:rounded-2xl bg-indigo-50 border border-indigo-100/90 shadow-2xs flex items-center justify-center text-indigo-400 shrink-0">
                <LucideIcons.TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.2} />
              </div>
            </div>

            <div className="pt-2 sm:pt-2.5 border-t border-slate-100 space-y-1 text-[10px] sm:text-[11px] text-slate-400 tabular-nums">
              <div className="flex items-center justify-between gap-1">
                <span>Entradas:</span>
                <span className="font-medium text-slate-500 truncate">
                  <MoedaSutil valor={resumoBI.entradasTotal} ocultar={ocultarValores} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span>Saídas:</span>
                <span className="font-medium text-rose-400 truncate">
                  <MoedaSutil
                    valor={resumoBI.saidasTotal}
                    ocultar={ocultarValores}
                    classNamePrefixo="text-[0.82em] font-normal opacity-75 mr-0.5"
                  />
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span>Contas:</span>
                <span className="font-medium text-emerald-500 truncate">
                  <MoedaSutil
                    valor={saldosContas.saldoConsolidado}
                    ocultar={ocultarValores}
                    classNamePrefixo="text-[0.82em] font-normal opacity-75 mr-0.5"
                  />
                </span>
              </div>
            </div>
          </Card5D>

          <Card5D interativo={false} className="col-span-2 lg:col-span-6" innerClassName="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-medium text-slate-600 mt-0.5">
                  Fluxo de Receita ({rotuloGlobal})
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-sans">
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Entradas
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" />
                  Saídas
                </span>
              </div>
            </div>

            <GraficoComparativoBarras
              pontos={resumoBI.serieTemporal}
              ocultarValores={ocultarValores}
            />
          </Card5D>
        </section>

        {/* LINHA 3: BARRAS DE MEIOS DE PAGAMENTO + TABELA */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <Card5D interativo={false} className="lg:col-span-4" innerClassName="p-5 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Formas de Pagamento</h3>
                <p className="text-[11px] text-slate-400">
                  Toque para filtrar ({rotuloGlobal})
                </p>
              </div>
              {metodoSelecionado !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setMetodoSelecionado('todos')}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  Ver todas
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {resumoRecebimentos.detalhesPorMetodo.map((item) => {
                const ativo = metodoSelecionado === item.chave;
                const corBarra =
                  item.chave === 'pix'
                    ? 'bg-sky-400'
                    : item.chave === 'credito'
                      ? 'bg-indigo-400'
                      : item.chave === 'debito'
                        ? 'bg-emerald-400'
                        : item.chave === 'dinheiro'
                          ? 'bg-yellow-400'
                          : 'bg-slate-400';

                return (
                  <button
                    key={item.chave}
                    type="button"
                    onClick={() =>
                      setMetodoSelecionado((atual) => (atual === item.chave ? 'todos' : item.chave))
                    }
                    className={`w-full text-left p-2.5 rounded-xl transition-colors cursor-pointer ${
                      ativo ? 'bg-emerald-50/70 ring-1 ring-emerald-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-600">{item.label}</span>
                      <span className="font-medium text-slate-500 tabular-nums">
                        <MoedaSutil valor={item.total} ocultar={ocultarValores} />
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(item.total > 0 ? 6 : 0, item.participacaoPct))}%`
                        }}
                        className={`h-full rounded-full ${corBarra} transition-all duration-300`}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 tabular-nums">
                      <span>
                        {item.qtdVendas} vendas · {item.qtdEntradasManuais} entradas
                      </span>
                      <span>{item.participacaoPct.toFixed(0)}%</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block">Salão em Aberto</span>
                  <span className="text-[10px] text-slate-400">
                    {salaoEmAberto.mesasOcupadas}/{salaoEmAberto.totalMesas} mesas
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-500 tabular-nums">
                  <MoedaSutil valor={salaoEmAberto.valorEmAberto} ocultar={ocultarValores} />
                </span>
              </div>
            </div>
          </Card5D>

          <Card5D interativo={false} className="lg:col-span-8" innerClassName="p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-slate-700 truncate">
                  {TITULOS_ABA_RANKING[abaRanking]}
                </h3>
                <p className="text-[11px] text-slate-400 truncate">
                  ({rotuloGlobal})
                </p>
              </div>

              <MenuSimplesDropdown
                opcoes={OPCOES_ABA_RANKING}
                valor={abaRanking}
                onChange={setAbaRanking}
                tituloMenu="Alternar relatório"
              />
            </div>

            {listaRankingAtivo.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Nenhum registro encontrado para este período.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                      <th className="pb-2.5 pr-3">#</th>
                      <th className="pb-2.5 px-3">Descrição</th>
                      <th className="pb-2.5 px-3 hidden sm:table-cell">Detalhe</th>
                      <th className="pb-2.5 px-3 text-right">Valor</th>
                      <th className="pb-2.5 pl-3 text-right">Participação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80 text-xs">
                    {listaRankingAtivo.map((item, idx) => {
                      const corBadge =
                        abaRanking === 'saidas'
                          ? 'bg-rose-50/80 text-rose-500'
                          : idx === 0
                            ? 'bg-amber-50/80 text-amber-600'
                            : 'bg-sky-50/80 text-sky-600';

                      return (
                        <tr key={`${item.nome}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 pr-3 font-medium text-slate-400 tabular-nums">
                            #{String(idx + 1).padStart(2, '0')}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-600 max-w-44 truncate">
                            <div>{item.nome}</div>
                            <div className="text-[10px] text-slate-400 sm:hidden truncate">
                              {item.subtitulo}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-400 truncate max-w-44 hidden sm:table-cell">
                            {item.subtitulo}
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-slate-500 tabular-nums whitespace-nowrap">
                            <MoedaSutil valor={item.valor} ocultar={ocultarValores} />
                          </td>
                          <td className="py-3 pl-3 text-right whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums ${corBadge}`}
                            >
                              {item.participacaoPct.toFixed(1).replace('.', ',')}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {resumoBI.insights[0] && (
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {resumoBI.insights[0]}
                </span>
                <button
                  type="button"
                  onClick={() => navigate('/admin/financeiro')}
                  className="font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                >
                  Voltar ao Extrato →
                </button>
              </div>
            )}
          </Card5D>
        </section>
      </main>

      <ModalDetalheMetrica
        tipo={modalMetricaAtiva}
        onClose={() => setModalMetricaAtiva(null)}
        ocultarValores={ocultarValores}
        contaRotulo={contaRotulo}
        rotulosPeriodo={{
          global: rotuloGlobal,
          vendas: rotuloGlobal,
          recebido: rotuloGlobal,
          lucro: rotuloGlobal,
          guardasol: rotuloGlobal
        }}
        metodoLabel={metodoAtivoMeta.label}
        resumoVendas={resumoVendas}
        resumoRecebimentos={resumoRecebimentos}
        resumoLucro={resumoLucro}
        resumoGuardaSol={resumoGuardaSol}
        resumoBI={resumoBI}
        saldoConsolidadoContas={saldosContas.saldoConsolidado}
      />
    </div>
  );
}
