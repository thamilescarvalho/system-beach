// src/pages/AdminFinanceiro.tsx
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import { Header } from '../components/Header';
import { imprimirCupomTermico } from '../utils/impressoraTermica';
import * as LucideIcons from 'lucide-react';
import type {
  VendaFechada,
  StatusPagamentoGarcom,
  TipoMovimentacaoCaixa
} from '../types';
import {
  GraficoLinhaFintech,
  type PontoGraficoFintech
} from '../components/financeiro/GraficoLinhaFintech';
import { ModalContasFinanceiras } from '../components/financeiro/ModalContasFinanceiras';
import { FiltroExtratoDropdown } from '../components/financeiro/FiltroExtratoDropdown';
import { ModalMovimentacaoCaixa } from '../components/financeiro/ModalMovimentacaoCaixa';
import { ModalNotaCompraEstoque } from '../components/financeiro/ModalNotaCompraEstoque';
import { ModalBase } from '../components/financeiro/ModalBase';
import {
  METODOS_PAGAMENTO_PDV,
  METODOS_PAGAMENTO_SAIDA,
  CATEGORIAS_ENTRADA_CAIXA,
  CATEGORIAS_SAIDA_CAIXA,
  calcularSaldosPorConta,
  resolverContaPadraoVendas,
  resolverContaIdDaVenda,
  formatarMoeda,
  obterDataLocalYYYYMMDD
} from '../components/financeiro/financeiroUtils';

function formatarData(isoString: string): string {
  if (!isoString) return '';
  const dataYmd = obterDataLocalYYYYMMDD(isoString);
  const [ano, mes, dia] = dataYmd.split('-');
  if (!ano || !mes || !dia) return '';
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(isoString: string): string {
  if (!isoString) return '';
  const data = new Date(isoString);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

export function AdminFinanceiro() {
  const contexto = useAppContext();
  const adminLogado = contexto?.garcomLogado?.nome || 'Admin';
  const dataHoje = useMemo(() => obterDataLocalYYYYMMDD(), []);

  // DATAS GERAIS (PAINEL)
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);

  // ESTADOS DE TELA GERAL
  const [mostrarValores, setMostrarValores] = useState(true);
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const inputPesquisaRef = useRef<HTMLInputElement>(null);

  // TOAST
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback((mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ mensagem, tipo });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // MODAIS
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFechada | null>(null);
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [modalPagamentosAberto, setModalPagamentosAberto] = useState(false);
  const [modalValeAberto, setModalValeAberto] = useState(false);
  const [modalMetaAberto, setModalMetaAberto] = useState(false);
  const [modalGuardaSolAberto, setModalGuardaSolAberto] = useState(false);
  const [modalMesasAberto, setModalMesasAberto] = useState(false);
  const [modalContasAberto, setModalContasAberto] = useState(false);
  const [modalMovAberto, setModalMovAberto] = useState(false);
  const [tipoMovModal, setTipoMovModal] = useState<TipoMovimentacaoCaixa>('saida');
  const [modalNotaCompraAberto, setModalNotaCompraAberto] = useState(false);

  // ESTADOS FINTECH DO FLUXO DE CAIXA
  const [visaoHero, setVisaoHero] = useState<'saldo' | 'entradas' | 'saidas'>('saldo');
  const [periodoPreset, setPeriodoPreset] = useState<'hoje' | 'custom'>('hoje');
  const [mostrarDatasCustom, setMostrarDatasCustom] = useState(false);
  const [abaExtrato, setAbaExtrato] = useState<'fluxo' | 'comandas' | 'notas'>('fluxo');
  const [contaFiltroId, setContaFiltroId] = useState<string | null>(null);
  const [chipFiltro, setChipFiltro] = useState<string | null>(null);
  const [notaExpandidaId, setNotaExpandidaId] = useState<string | null>(null);
  const [confirmarEstornoNotaId, setConfirmarEstornoNotaId] = useState<string | null>(null);
  const [carregandoEstornoNota, setCarregandoEstornoNota] = useState(false);
  const [confirmarExcluirMovId, setConfirmarExcluirMovId] = useState<string | null>(null);

  const aplicarPeriodoHoje = () => {
    const hojeStr = obterDataLocalYYYYMMDD();
    setPeriodoPreset('hoje');
    setMostrarDatasCustom(false);
    setDataInicio(hojeStr);
    setDataFim(hojeStr);
  };

  // DADOS DO CONTEXTO
  const historicoBruto = useMemo(() => contexto?.historicoVendas || [], [contexto?.historicoVendas]);
  const mesas = useMemo(() => contexto?.mesas || [], [contexto?.mesas]);
  const listaFuncionarios = useMemo(() => contexto?.garcons || contexto?.usuarios || [], [contexto?.garcons, contexto?.usuarios]);
  const metaAtiva = contexto?.metaAtiva;
  const contasFinanceiras = useMemo(() => contexto?.contasFinanceiras || [], [contexto?.contasFinanceiras]);
  const movimentacoesCaixa = useMemo(() => contexto?.movimentacoesCaixa || [], [contexto?.movimentacoesCaixa]);
  const historicoPagamentos = useMemo(() => contexto?.historicoPagamentos || [], [contexto?.historicoPagamentos]);
  const notasCompraEstoque = useMemo(() => contexto?.notasCompraEstoque || [], [contexto?.notasCompraEstoque]);

  const contasAtivas = useMemo(() => contasFinanceiras.filter((c) => c.ativo), [contasFinanceiras]);
  const saldosContas = useMemo(
    () => calcularSaldosPorConta(contasFinanceiras, historicoBruto, movimentacoesCaixa, historicoPagamentos),
    [contasFinanceiras, historicoBruto, movimentacoesCaixa, historicoPagamentos]
  );

  const mapaNomeConta = useMemo(() => {
    const m = new Map<string, string>();
    contasFinanceiras.forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [contasFinanceiras]);

  const contaFiltroObj = useMemo(
    () => (contaFiltroId ? contasAtivas.find((c) => c.id === contaFiltroId) || null : null),
    [contaFiltroId, contasAtivas]
  );

  const contaPadraoVendas = useMemo(
    () => resolverContaPadraoVendas(contasFinanceiras),
    [contasFinanceiras]
  );

  const resolveContaDaVenda = useCallback(
    (venda: Pick<VendaFechada, 'contaId'>): string | undefined =>
      resolverContaIdDaVenda(venda, saldosContas.porConta, contaPadraoVendas?.id),
    [saldosContas.porConta, contaPadraoVendas?.id]
  );

  // PAINEL GERAL (VENDAS PDV)
  const historicoFiltrado = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return historicoBruto.filter((venda) => {
      const dataVenda = obterDataLocalYYYYMMDD(venda.dataFechamento);
      const dataValida = dataVenda >= dataInicio && dataVenda <= dataFim;
      const pesquisaValida =
        termo === '' ||
        venda.numeroMesa.toString().includes(termo) ||
        (venda.nomeCliente?.toLowerCase() || '').includes(termo) ||
        (venda.garcomNome?.toLowerCase() || '').includes(termo);
      return dataValida && pesquisaValida;
    });
  }, [historicoBruto, dataInicio, dataFim, pesquisa]);

  const comandasFiltradas = useMemo(() => {
    return historicoFiltrado.filter((v) => {
      if (contaFiltroId && resolveContaDaVenda(v) !== contaFiltroId) return false;
      if (chipFiltro) {
        if (chipFiltro.startsWith('entrada:') || chipFiltro.startsWith('saida:')) {
          return false;
        }
        const pags = Array.isArray(v.pagamentos) && v.pagamentos.length > 0
          ? v.pagamentos
          : [{ metodo: 'Não Especificado', valor: v.total }];
        if (!pags.some((p) => p.metodo === chipFiltro)) return false;
      }
      return true;
    });
  }, [historicoFiltrado, contaFiltroId, chipFiltro, resolveContaDaVenda]);

  const vendasValidas = useMemo(() => historicoFiltrado.filter((v) => v.status !== 'cancelada'), [historicoFiltrado]);
  const faturamentoTotal = useMemo(() => vendasValidas.reduce((acc, venda) => acc + venda.total, 0), [vendasValidas]);

  const taxaServicoTotal = useMemo(() => vendasValidas.reduce((totalTaxa, venda) => {
    const itemServico = venda.itens.find((item) => item.id === 'taxa-servico-10');
    if (itemServico) return totalTaxa + itemServico.produto.preco * itemServico.quantidade;
    return totalTaxa;
  }, 0), [vendasValidas]);

  const mesasOcupadas = mesas.filter((m) => m.status === 'ocupada');
  const valorEmAberto = mesasOcupadas.reduce((acc, mesa) => {
    return acc + mesa.itens.reduce((sum, item) => sum + item.produto.preco * item.quantidade, 0);
  }, 0);

  const saldoLiquido = faturamentoTotal - taxaServicoTotal;

  // MOVIMENTAÇÕES, VALES PAGOS E NOTAS FILTRADAS POR PERÍODO + CONTA + BUSCA
  const movimentacoesNoPeriodo = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return movimentacoesCaixa.filter((m) => {
      const dt = obterDataLocalYYYYMMDD(m.dataMovimentacao);
      if (dt < dataInicio || dt > dataFim) return false;
      if (contaFiltroId && m.contaId !== contaFiltroId && m.contaDestinoId !== contaFiltroId) return false;
      if (termo) {
        const bate =
          m.descricao.toLowerCase().includes(termo) ||
          m.categoria.toLowerCase().includes(termo) ||
          m.metodoPagamento.toLowerCase().includes(termo) ||
          m.usuarioNome.toLowerCase().includes(termo);
        if (!bate) return false;
      }
      return true;
    });
  }, [movimentacoesCaixa, dataInicio, dataFim, contaFiltroId, pesquisa]);

  const valesPagosNoPeriodo = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return historicoPagamentos.filter((p) => {
      if (p.status !== 'pago') return false;
      const dt = obterDataLocalYYYYMMDD(p.data);
      if (dt < dataInicio || dt > dataFim) return false;
      const contaDoVale =
        p.contaId ||
        saldosContas.idContaPadrao ||
        saldosContas.idContaDinheiroPadrao;
      if (contaFiltroId && contaDoVale !== contaFiltroId) return false;
      if (termo) {
        const bate =
          p.garcomNome.toLowerCase().includes(termo) ||
          p.descricao.toLowerCase().includes(termo) ||
          p.categoria.toLowerCase().includes(termo);
        if (!bate) return false;
      }
      return true;
    });
  }, [
    historicoPagamentos,
    dataInicio,
    dataFim,
    contaFiltroId,
    pesquisa,
    saldosContas.idContaPadrao,
    saldosContas.idContaDinheiroPadrao
  ]);

  const notasNoPeriodo = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    return notasCompraEstoque.filter((n) => {
      const dt = obterDataLocalYYYYMMDD(n.dataCompra);
      if (dt < dataInicio || dt > dataFim) return false;
      if (contaFiltroId && n.contaId !== contaFiltroId) return false;
      if (termo) {
        const bate =
          n.fornecedor.toLowerCase().includes(termo) ||
          (n.numeroNota || '').toLowerCase().includes(termo) ||
          n.itens.some((i) => i.produtoNome.toLowerCase().includes(termo));
        if (!bate) return false;
      }
      return true;
    });
  }, [notasCompraEstoque, dataInicio, dataFim, contaFiltroId, pesquisa]);

  // FATIAS DE ENTRADA PDV (RESPEITANDO CONTA SE SELECIONADA)
  const { totalEntradasPeriodo, totalSaidasPeriodo, resumoPagamentos } = useMemo(() => {
    let entradasPdv = 0;
    const porMetodo: Record<string, number> = {};

    for (const venda of vendasValidas) {
      if (contaFiltroId && resolveContaDaVenda(venda) !== contaFiltroId) continue;
      const pags = Array.isArray(venda.pagamentos) && venda.pagamentos.length > 0
        ? venda.pagamentos
        : [{ metodo: 'Não Especificado', valor: venda.total }];
      for (const pag of pags) {
        const val = Number(pag.valor) || 0;
        entradasPdv += val;
        porMetodo[pag.metodo] = (porMetodo[pag.metodo] || 0) + val;
      }
    }

    let entradasManuais = 0;
    let saidasManuais = 0;

    for (const mov of movimentacoesNoPeriodo) {
      if (mov.tipo === 'entrada') {
        entradasManuais += mov.valor;
      } else if (mov.tipo === 'saida') {
        saidasManuais += mov.valor;
      } else if (mov.tipo === 'transferencia' && contaFiltroId) {
        if (mov.contaDestinoId === contaFiltroId) entradasManuais += mov.valor;
        if (mov.contaId === contaFiltroId) saidasManuais += mov.valor;
      }
    }

    let saidasVales = 0;
    for (const vale of valesPagosNoPeriodo) {
      saidasVales += vale.valor;
    }

    return {
      totalEntradasPeriodo: entradasPdv + entradasManuais,
      totalSaidasPeriodo: saidasManuais + saidasVales,
      resumoPagamentos: porMetodo
    };
  }, [vendasValidas, movimentacoesNoPeriodo, valesPagosNoPeriodo, contaFiltroId, resolveContaDaVenda]);

  const saldoExibidoHero = useMemo(() => {
    if (visaoHero === 'entradas') return totalEntradasPeriodo;
    if (visaoHero === 'saidas') return totalSaidasPeriodo;
    if (contaFiltroId) {
      return saldosContas.porConta.get(contaFiltroId)?.saldoAtual ?? 0;
    }
    return saldosContas.saldoConsolidado;
  }, [visaoHero, totalEntradasPeriodo, totalSaidasPeriodo, contaFiltroId, saldosContas]);

  // SÉRIE TEMPORAL PARA O GRÁFICO DE LINHA VERDE-MENTA
  const pontosGrafico = useMemo((): PontoGraficoFintech[] => {
    const acumularValorVendaPorConta = (v: VendaFechada) => {
      if (!contaFiltroId) return v.total;
      return resolveContaDaVenda(v) === contaFiltroId ? v.total : 0;
    };

    const calcularValorSlot = (ent: number, sai: number) => {
      if (visaoHero === 'entradas') return ent;
      if (visaoHero === 'saidas') return sai;
      return ent - sai;
    };

    // Caso 1: Mesmo dia -> 6 janelas horárias (manhã até madrugada)
    if (dataInicio === dataFim) {
      const slots = [
        { label: '08h', maxH: 10, ent: 0, sai: 0 },
        { label: '12h', maxH: 13, ent: 0, sai: 0 },
        { label: '15h', maxH: 16, ent: 0, sai: 0 },
        { label: '18h', maxH: 19, ent: 0, sai: 0 },
        { label: '21h', maxH: 22, ent: 0, sai: 0 },
        { label: '23h', maxH: 24, ent: 0, sai: 0 }
      ];
      const acharSlot = (iso: string) => {
        const dt = new Date(iso);
        const hora = Number.isNaN(dt.getTime())
          ? 12
          : parseInt(dt.toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }), 10);
        return slots.find((s) => hora <= s.maxH) || slots[slots.length - 1];
      };

      vendasValidas.forEach((v) => {
        acharSlot(v.dataFechamento).ent += acumularValorVendaPorConta(v);
      });
      movimentacoesNoPeriodo.forEach((m) => {
        const target = acharSlot(m.dataMovimentacao);
        if (m.tipo === 'entrada') target.ent += m.valor;
        else if (m.tipo === 'saida') target.sai += m.valor;
      });
      valesPagosNoPeriodo.forEach((p) => {
        slots[1].sai += p.valor;
      });

      return slots.map((s) => ({
        label: s.label,
        valor: calcularValorSlot(s.ent, s.sai)
      }));
    }

    // Diferença em dias
    const dtIni = new Date(`${dataInicio}T12:00:00-03:00`);
    const dtFim = new Date(`${dataFim}T12:00:00-03:00`);
    const diffDias = Math.max(1, Math.round((dtFim.getTime() - dtIni.getTime()) / 86400000) + 1);

    // Caso 2: Até 45 dias -> baldes diários DD/MM
    if (diffDias <= 45) {
      const mapaDias = new Map<string, { label: string; ent: number; sai: number }>();
      const cursor = new Date(dtIni);
      while (cursor <= dtFim) {
        const key = obterDataLocalYYYYMMDD(cursor);
        const [, mm, dd] = key.split('-');
        mapaDias.set(key, { label: `${dd}/${mm}`, ent: 0, sai: 0 });
        cursor.setDate(cursor.getDate() + 1);
      }

      vendasValidas.forEach((v) => {
        const key = obterDataLocalYYYYMMDD(v.dataFechamento);
        const item = mapaDias.get(key);
        if (item) item.ent += acumularValorVendaPorConta(v);
      });
      movimentacoesNoPeriodo.forEach((m) => {
        const key = obterDataLocalYYYYMMDD(m.dataMovimentacao);
        const item = mapaDias.get(key);
        if (!item) return;
        if (m.tipo === 'entrada') item.ent += m.valor;
        else if (m.tipo === 'saida') item.sai += m.valor;
      });
      valesPagosNoPeriodo.forEach((p) => {
        const key = obterDataLocalYYYYMMDD(p.data);
        const item = mapaDias.get(key);
        if (item) item.sai += p.valor;
      });

      return Array.from(mapaDias.values()).map((d) => ({
        label: d.label,
        valor: calcularValorSlot(d.ent, d.sai)
      }));
    }

    // Caso 3: Acima de 45 dias -> baldes mensais
    const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const mapaMeses = new Map<string, { label: string; ent: number; sai: number }>();
    const garantirMes = (yyyyMm: string) => {
      if (!mapaMeses.has(yyyyMm)) {
        const [, mm] = yyyyMm.split('-');
        const idx = Math.max(0, Math.min(11, parseInt(mm, 10) - 1));
        mapaMeses.set(yyyyMm, { label: NOMES_MESES[idx], ent: 0, sai: 0 });
      }
      return mapaMeses.get(yyyyMm)!;
    };

    const cursorMes = new Date(`${dataInicio.slice(0, 7)}-01T12:00:00-03:00`);
    const limiteMes = new Date(`${dataFim.slice(0, 7)}-01T12:00:00-03:00`);
    while (cursorMes <= limiteMes) {
      garantirMes(obterDataLocalYYYYMMDD(cursorMes).slice(0, 7));
      cursorMes.setMonth(cursorMes.getMonth() + 1);
    }

    vendasValidas.forEach((v) => {
      garantirMes(obterDataLocalYYYYMMDD(v.dataFechamento).slice(0, 7)).ent += acumularValorVendaPorConta(v);
    });
    movimentacoesNoPeriodo.forEach((m) => {
      const b = garantirMes(obterDataLocalYYYYMMDD(m.dataMovimentacao).slice(0, 7));
      if (m.tipo === 'entrada') b.ent += m.valor;
      else if (m.tipo === 'saida') b.sai += m.valor;
    });
    valesPagosNoPeriodo.forEach((p) => {
      garantirMes(obterDataLocalYYYYMMDD(p.data).slice(0, 7)).sai += p.valor;
    });

    return Array.from(mapaMeses.values()).map((m) => ({
      label: m.label,
      valor: calcularValorSlot(m.ent, m.sai)
    }));
  }, [
    dataInicio,
    dataFim,
    visaoHero,
    contaFiltroId,
    vendasValidas,
    movimentacoesNoPeriodo,
    valesPagosNoPeriodo,
    resolveContaDaVenda
  ]);

  // OPÇÕES DO FILTRO (FORMAS DE PAGAMENTO E CATEGORIAS DE ENTRADA / SAÍDA)
  const opcoesFiltroExtrato = useMemo(() => {
    const metodos = Array.from(new Set([...METODOS_PAGAMENTO_PDV, 'Boleto / Outros']));

    const extrasEntrada = movimentacoesNoPeriodo
      .filter((m) => m.tipo === 'entrada' && m.categoria && m.categoria !== 'Outros')
      .map((m) => m.categoria);
    const categoriasEntrada = Array.from(
      new Set([
        ...CATEGORIAS_ENTRADA_CAIXA.filter((c) => c !== 'Outros'),
        ...extrasEntrada,
        'Outros'
      ])
    );

    const extrasSaida = movimentacoesNoPeriodo
      .filter((m) => m.tipo === 'saida' && m.categoria && m.categoria !== 'Outros')
      .map((m) => m.categoria);
    const categoriasSaida = Array.from(
      new Set([
        ...CATEGORIAS_SAIDA_CAIXA.filter((c) => c !== 'Outros'),
        'Vales / Equipe',
        ...extrasSaida,
        'Outros'
      ])
    );

    return { metodos, categoriasEntrada, categoriasSaida };
  }, [movimentacoesNoPeriodo]);

  // TIMELINE UNIFICADA DO FLUXO DE CAIXA
  const lancamentosFluxo = useMemo(() => {
    type ItemFluxo = {
      id: string;
      origem: 'venda' | 'mov' | 'vale';
      direcao: 'entrada' | 'saida' | 'transferencia';
      titulo: string;
      subtitulo: string;
      valor: number;
      dataOrdenacao: number;
      horaTexto: string;
      badgeCategoria: string;
      nomeConta: string;
      cancelada?: boolean;
      vendaRef?: VendaFechada;
      notaCompraId?: string | null;
      movId?: string;
    };

    const itens: ItemFluxo[] = [];
    const filtroEntradaCat = chipFiltro?.startsWith('entrada:')
      ? chipFiltro.slice('entrada:'.length)
      : null;
    const filtroSaidaCat = chipFiltro?.startsWith('saida:')
      ? chipFiltro.slice('saida:'.length)
      : null;
    const filtroMetodo = chipFiltro && !filtroEntradaCat && !filtroSaidaCat ? chipFiltro : null;

    historicoFiltrado.forEach((v) => {
      const pags = Array.isArray(v.pagamentos) && v.pagamentos.length > 0
        ? v.pagamentos
        : [{ metodo: 'Não Especificado', valor: v.total }];
      const metodoPrincipal = pags.map((p) => p.metodo).join(' + ');
      const contaVendaId = resolveContaDaVenda(v);

      if (contaFiltroId && contaVendaId !== contaFiltroId) return;
      if (filtroEntradaCat || filtroSaidaCat) return;
      if (filtroMetodo && !pags.some((p) => p.metodo === filtroMetodo)) return;
      if (visaoHero === 'saidas') return;

      itens.push({
        id: `venda-${v.id}`,
        origem: 'venda',
        direcao: 'entrada',
        titulo: `Mesa ${v.numeroMesa} • ${v.nomeCliente || 'Consumidor'}`,
        subtitulo: `${metodoPrincipal}${v.garcomNome ? ` • ${v.garcomNome}` : ''}`,
        valor: v.total,
        dataOrdenacao: new Date(v.dataFechamento).getTime() || 0,
        horaTexto: `${formatarData(v.dataFechamento).slice(0, 5)} às ${formatarHora(v.dataFechamento)}`,
        badgeCategoria: v.status === 'cancelada' ? 'Estornada' : metodoPrincipal,
        nomeConta: (contaVendaId && mapaNomeConta.get(contaVendaId)) || 'Conta padrão',
        cancelada: v.status === 'cancelada',
        vendaRef: v
      });
    });

    movimentacoesNoPeriodo.forEach((m) => {
      if (visaoHero === 'entradas' && m.tipo !== 'entrada') return;
      if (visaoHero === 'saidas' && m.tipo !== 'saida') return;
      if (filtroEntradaCat && (m.tipo !== 'entrada' || m.categoria !== filtroEntradaCat)) return;
      if (filtroSaidaCat && (m.tipo !== 'saida' || m.categoria !== filtroSaidaCat)) return;
      if (filtroMetodo && m.metodoPagamento !== filtroMetodo) return;

      const nomeOrigem = mapaNomeConta.get(m.contaId) || 'Conta';
      const nomeDest = m.contaDestinoId ? mapaNomeConta.get(m.contaDestinoId) : null;

      itens.push({
        id: `mov-${m.id}`,
        origem: 'mov',
        direcao: m.tipo,
        titulo: m.descricao || m.categoria,
        subtitulo: `${m.categoria} • ${m.metodoPagamento}`,
        valor: m.valor,
        dataOrdenacao: new Date(m.dataMovimentacao).getTime() || 0,
        horaTexto: `${formatarData(m.dataMovimentacao).slice(0, 5)} às ${formatarHora(m.dataMovimentacao)}`,
        badgeCategoria: m.notaCompraId ? 'Nota Estoque' : m.categoria,
        nomeConta: nomeDest ? `${nomeOrigem} → ${nomeDest}` : nomeOrigem,
        notaCompraId: m.notaCompraId,
        movId: m.id
      });
    });

    valesPagosNoPeriodo.forEach((p) => {
      if (visaoHero === 'entradas') return;
      if (filtroEntradaCat) return;
      if (filtroSaidaCat && filtroSaidaCat !== 'Vales / Equipe') return;
      if (filtroMetodo && filtroMetodo !== (p.metodoPagamento || 'Dinheiro')) return;
      const contaNome = (p.contaId && mapaNomeConta.get(p.contaId)) || 'Caixa / Vale';
      itens.push({
        id: `vale-${p.id}`,
        origem: 'vale',
        direcao: 'saida',
        titulo: `${p.categoria}: ${p.garcomNome}`,
        subtitulo: p.descricao || 'Pagamento de equipe',
        valor: p.valor,
        dataOrdenacao: new Date(`${p.data}T12:00:00-03:00`).getTime() || 0,
        horaTexto: formatarData(p.data).slice(0, 5),
        badgeCategoria: p.metodoPagamento || 'Dinheiro',
        nomeConta: contaNome
      });
    });

    return itens.sort((a, b) => b.dataOrdenacao - a.dataOrdenacao);
  }, [
    historicoFiltrado,
    movimentacoesNoPeriodo,
    valesPagosNoPeriodo,
    contaFiltroId,
    chipFiltro,
    visaoHero,
    mapaNomeConta,
    resolveContaDaVenda
  ]);

  // META
  let percentualMeta = 0;
  if (metaAtiva && metaAtiva.valorAlvo > 0) {
    percentualMeta = Math.min((saldoLiquido / metaAtiva.valorAlvo) * 100, 100);
  }

  const totalPagamentosResumo = Object.values(resumoPagamentos).reduce((acc, val) => acc + val, 0);

  const configPagamentos: Record<string, { icon: React.ReactNode; corBg: string; corTexto: string; border: string }> = {
    PIX: {
      icon: <LucideIcons.QrCode size={18} strokeWidth={2} />,
      corBg: 'bg-teal-50',
      corTexto: 'text-teal-600',
      border: 'border-teal-200'
    },
    Crédito: {
      icon: <LucideIcons.CreditCard size={18} strokeWidth={2} />,
      corBg: 'bg-indigo-50',
      corTexto: 'text-indigo-600',
      border: 'border-indigo-200'
    },
    Débito: {
      icon: <LucideIcons.CreditCard size={18} strokeWidth={2} />,
      corBg: 'bg-blue-50',
      corTexto: 'text-blue-600',
      border: 'border-blue-200'
    },
    Dinheiro: {
      icon: <LucideIcons.Banknote size={18} strokeWidth={2} />,
      corBg: 'bg-emerald-50',
      corTexto: 'text-emerald-600',
      border: 'border-emerald-200'
    },
    'Não Especificado': {
      icon: <LucideIcons.HelpCircle size={18} strokeWidth={2} />,
      corBg: 'bg-slate-50',
      corTexto: 'text-slate-500',
      border: 'border-slate-200'
    }
  };

  // MODAL GUARDA-SÓIS
  const [guardaDataInicio, setGuardaDataInicio] = useState(dataHoje);
  const [guardaDataFim, setGuardaDataFim] = useState(dataHoje);
  const [guardaPesquisa, setGuardaPesquisa] = useState('');

  const ehItemGuardaSol = (nomeProduto: string) => {
    const n = nomeProduto.toLowerCase();
    return n.includes('guarda-sol') || n.includes('guarda sol');
  };

  const historicoGuardaSolModal = historicoBruto.filter((venda) => {
    if (venda.status === 'cancelada') return false;
    const dataVenda = obterDataLocalYYYYMMDD(venda.dataFechamento);
    const dataValida = dataVenda >= guardaDataInicio && dataVenda <= guardaDataFim;

    const temGuardaSol = venda.itens.some((item) => ehItemGuardaSol(item.produto.nome));

    const termo = guardaPesquisa.trim().toLowerCase();
    const pesquisaValida =
      termo === '' ||
      venda.numeroMesa.toString().includes(termo) ||
      (venda.nomeCliente?.toLowerCase() || '').includes(termo) ||
      venda.total.toString().includes(termo);

    return dataValida && temGuardaSol && pesquisaValida;
  });

  const faturamentoGuardaSolModal = historicoGuardaSolModal.reduce((total, venda) => {
    const somaGuardaSolVenda = venda.itens
      .filter((item) => ehItemGuardaSol(item.produto.nome))
      .reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0);
    return total + somaGuardaSolVenda;
  }, 0);

  // FORMULÁRIO DE VALE
  const [valeFuncionarioId, setValeFuncionarioId] = useState('');
  const [valeData, setValeData] = useState(dataHoje);
  const [valeValor, setValeValor] = useState('');
  const [valeDescricao, setValeDescricao] = useState('');
  const [valeStatus, setValeStatus] = useState<StatusPagamentoGarcom>('pago');
  const [valeContaId, setValeContaId] = useState<string>('');
  const [valeMetodoPagamento, setValeMetodoPagamento] = useState<string>('Dinheiro');
  const [carregandoVale, setCarregandoVale] = useState(false);

  const contaValeEfetiva =
    valeContaId ||
    saldosContas.idContaPadrao ||
    (valeMetodoPagamento === 'Dinheiro'
      ? saldosContas.idContaDinheiroPadrao || contasAtivas[0]?.id || ''
      : saldosContas.idContaDigitalPadrao || contasAtivas[0]?.id || '');

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorApenasNumeros = e.target.value.replace(/\D/g, '');
    if (valorApenasNumeros === '') {
      setValeValor('');
      return;
    }
    const valorNumericoDecimal = parseInt(valorApenasNumeros, 10) / 100;
    setValeValor(
      valorNumericoDecimal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  };

  const handleSalvarVale = async (e: React.FormEvent) => {
    e.preventDefault();

    const garcomSelecionado = listaFuncionarios.find((g) => g.id === valeFuncionarioId);
    if (!garcomSelecionado) {
      mostrarToast('Por favor, selecione um colaborador válido.', 'erro');
      return;
    }

    const valorDesmascarado = valeValor.replace(/\./g, '').replace(',', '.');
    const valorNumericoDB = parseFloat(valorDesmascarado);

    if (Number.isNaN(valorNumericoDB) || valorNumericoDB <= 0) {
      mostrarToast('Por favor, informe um valor maior que zero.', 'erro');
      return;
    }

    setCarregandoVale(true);
    try {
      if (contexto?.registrarValeFuncionario) {
        await contexto.registrarValeFuncionario({
          garcomId: garcomSelecionado.id,
          garcomNome: garcomSelecionado.nome,
          valor: valorNumericoDB,
          data: valeData,
          descricao: valeDescricao.trim() || 'Adiantamento / Vale',
          categoria: 'Vale',
          status: valeStatus,
          contaId: valeStatus === 'pago' ? (contaValeEfetiva || null) : null,
          metodoPagamento: valeStatus === 'pago' ? valeMetodoPagamento : 'Dinheiro'
        });
      }

      setModalValeAberto(false);
      mostrarToast(`Vale de ${formatarMoeda(valorNumericoDB)} lançado para ${garcomSelecionado.nome}!`, 'sucesso');

      setValeFuncionarioId('');
      setValeValor('');
      setValeDescricao('');
      setValeContaId('');
      setValeMetodoPagamento('Dinheiro');
      setValeData(dataHoje);
      setValeStatus('pago');
    } catch (error: unknown) {
      console.error('Erro ao registrar vale:', error);
      mostrarToast('Falha ao registrar vale no banco de dados. Tente novamente.', 'erro');
    } finally {
      setCarregandoVale(false);
    }
  };

  // MODAL METAS
  const [metaDataInicio, setMetaDataInicio] = useState(dataHoje);
  const [metaDataFim, setMetaDataFim] = useState(dataHoje);
  const [novaMetaInput, setNovaMetaInput] = useState('');
  const [carregandoMeta, setCarregandoMeta] = useState(false);

  const handleMetaValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorApenasNumeros = e.target.value.replace(/\D/g, '');
    if (valorApenasNumeros === '') {
      setNovaMetaInput('');
      return;
    }
    const valorNumericoDecimal = parseInt(valorApenasNumeros, 10) / 100;
    setNovaMetaInput(
      valorNumericoDecimal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  };

  const handleSalvarMeta = async (e: React.FormEvent) => {
    e.preventDefault();

    const valorDesmascarado = novaMetaInput.replace(/\./g, '').replace(',', '.');
    const valorNumericoDB = parseFloat(valorDesmascarado);

    if (Number.isNaN(valorNumericoDB) || valorNumericoDB <= 0) {
      mostrarToast('Por favor, informe um valor maior que zero.', 'erro');
      return;
    }

    if (metaDataFim < metaDataInicio) {
      mostrarToast('A data final não pode ser anterior à data inicial.', 'erro');
      return;
    }

    setCarregandoMeta(true);
    try {
      if (contexto?.salvarMetaFinanceira) {
        await contexto.salvarMetaFinanceira({
          dataInicio: metaDataInicio,
          dataFim: metaDataFim,
          valorAlvo: valorNumericoDB
        });
        mostrarToast('Nova meta ativada com sucesso!', 'sucesso');
        setModalMetaAberto(false);
        setNovaMetaInput('');
      }
    } catch (error: unknown) {
      console.error('Erro ao salvar meta:', error);
      mostrarToast('Falha ao registrar meta no banco de dados.', 'erro');
    } finally {
      setCarregandoMeta(false);
    }
  };

  // CANCELAMENTO / ESTORNO
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [carregandoCancelamento, setCarregandoCancelamento] = useState(false);

  const confirmarCancelamento = async () => {
    const motivoLimpo = motivoCancelamento.trim();
    if (!vendaSelecionada || motivoLimpo.length < 3) {
      mostrarToast('Por favor, informe um motivo válido (mín. 3 caracteres).', 'erro');
      return;
    }

    setCarregandoCancelamento(true);
    try {
      await Promise.resolve(contexto?.cancelarVenda(vendaSelecionada.id, motivoLimpo, adminLogado));
      setModalCancelarAberto(false);
      setVendaSelecionada(null);
      setMotivoCancelamento('');
      mostrarToast('Venda estornada e itens devolvidos ao estoque.', 'sucesso');
    } catch (error: unknown) {
      console.error('Erro ao estornar venda:', error);
      mostrarToast('Falha ao estornar a venda. Tente novamente.', 'erro');
    } finally {
      setCarregandoCancelamento(false);
    }
  };

  // HANDLERS FLUXO DE CAIXA & NOTAS
  const handleExcluirMovimentacao = async (movId: string) => {
    try {
      await contexto?.excluirMovimentacaoCaixa(movId);
      setConfirmarExcluirMovId(null);
      mostrarToast('Lançamento removido do fluxo de caixa.', 'sucesso');
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao remover lançamento.', 'erro');
    }
  };

  const handleEstornarNota = async (notaId: string) => {
    setCarregandoEstornoNota(true);
    try {
      await contexto?.estornarNotaCompraEstoque(notaId);
      setConfirmarEstornoNotaId(null);
      mostrarToast('Nota de compra estornada: estoque e caixa ajustados!', 'sucesso');
    } catch (err) {
      mostrarToast(err instanceof Error ? err.message : 'Erro ao estornar nota de compra.', 'erro');
    } finally {
      setCarregandoEstornoNota(false);
    }
  };

  // UTILITÁRIOS E EFEITOS
  const algumModalAberto = Boolean(
    vendaSelecionada ||
      modalCancelarAberto ||
      modalPagamentosAberto ||
      modalValeAberto ||
      modalMetaAberto ||
      modalGuardaSolAberto ||
      modalMesasAberto ||
      modalContasAberto ||
      modalMovAberto ||
      modalNotaCompraAberto
  );

  useEffect(() => {
    document.body.style.overflow = algumModalAberto ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [algumModalAberto]);

  useEffect(() => {
    if (!algumModalAberto) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalCancelarAberto && !carregandoCancelamento) {
        setModalCancelarAberto(false);
        return;
      }
      if (vendaSelecionada && !carregandoCancelamento) {
        setVendaSelecionada(null);
        return;
      }
      if (modalValeAberto && !carregandoVale) {
        setModalValeAberto(false);
        return;
      }
      if (modalMetaAberto && !carregandoMeta) {
        setModalMetaAberto(false);
        return;
      }
      if (modalNotaCompraAberto) setModalNotaCompraAberto(false);
      if (modalMovAberto) setModalMovAberto(false);
      if (modalContasAberto) setModalContasAberto(false);
      if (modalPagamentosAberto) setModalPagamentosAberto(false);
      if (modalGuardaSolAberto) setModalGuardaSolAberto(false);
      if (modalMesasAberto) setModalMesasAberto(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [
    algumModalAberto,
    modalCancelarAberto,
    carregandoCancelamento,
    vendaSelecionada,
    modalValeAberto,
    carregandoVale,
    modalMetaAberto,
    carregandoMeta,
    modalNotaCompraAberto,
    modalMovAberto,
    modalContasAberto,
    modalPagamentosAberto,
    modalGuardaSolAberto,
    modalMesasAberto
  ]);

  useEffect(() => {
    if (mostrarPesquisa && inputPesquisaRef.current) inputPesquisaRef.current.focus();
  }, [mostrarPesquisa]);

  const handleImprimirVendaSelecionada = () => {
    if (!vendaSelecionada) return;
    const subtotal = vendaSelecionada.itens.reduce((acc, i) => acc + i.produto.preco * i.quantidade, 0);
    imprimirCupomTermico({
      nomeEstabelecimento:
        contexto?.dadosEmpresa?.nome_exibicao ||
        contexto?.dadosEmpresa?.nome_fantasia ||
        NOME_PADRAO_SISTEMA,
      documentoEstabelecimento: contexto?.dadosEmpresa?.documento || undefined,
      telefoneEstabelecimento: contexto?.dadosEmpresa?.telefone || undefined,
      numeroMesa: vendaSelecionada.numeroMesa,
      nomeCliente: vendaSelecionada.nomeCliente || 'Consumidor',
      garcomNome: vendaSelecionada.garcomNome || 'Equipe',
      itens: vendaSelecionada.itens,
      subtotal,
      taxaGuardaSol: 0,
      desconto: subtotal > vendaSelecionada.total ? subtotal - vendaSelecionada.total : 0,
      totalFinal: vendaSelecionada.total,
      pagamentos: vendaSelecionada.pagamentos || [],
      dataHora: `${formatarData(vendaSelecionada.dataFechamento)} às ${formatarHora(vendaSelecionada.dataFechamento)}`,
      codigoVenda: vendaSelecionada.id,
      statusCancelada: vendaSelecionada.status === 'cancelada',
      motivoCancelamento: vendaSelecionada.motivoCancelamento
    });
  };

  return (
    <div className="min-h-dvh bg-slate-50/50 font-sans text-slate-800 pb-24 md:pb-8 relative overflow-x-hidden print:bg-white print:pb-0">
      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none px-4 w-full max-w-md flex justify-center">
          <div
            className={`px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 text-xs font-semibold tracking-tight pointer-events-auto ${
              toast.tipo === 'sucesso'
                ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30 shadow-emerald-950/20'
                : 'bg-slate-900/95 text-rose-400 border-rose-500/30 shadow-rose-950/20'
            }`}
          >
            {toast.tipo === 'sucesso' ? (
              <LucideIcons.CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <LucideIcons.AlertCircle size={18} className="text-rose-400 shrink-0" />
            )}
            <span>{toast.mensagem}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar aviso"
            >
              <LucideIcons.X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="print:hidden relative z-10">
        <Header />

        {/* DASHBOARD HEADER FINTECH MINIMALISTA */}
        <div className="bg-linear-to-br from-emerald-900 to-emerald-950 text-white rounded-b-3xl pt-18 md:pt-20 md:pl-24 pb-6 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col gap-3">
            {/* Linha 1: Hoje + Calendário | Contas */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={aplicarPeriodoHoje}
                  className={`h-7 px-3 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                    periodoPreset === 'hoje'
                      ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'
                      : 'bg-black/20 border-white/10 text-emerald-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setMostrarDatasCustom(!mostrarDatasCustom)}
                  aria-label="Selecionar período personalizado"
                  className={`h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium border transition-all cursor-pointer ${
                    mostrarDatasCustom || periodoPreset === 'custom'
                      ? 'bg-emerald-400/20 border-emerald-300/40 text-emerald-100'
                      : 'bg-black/20 border-white/10 text-emerald-200/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <LucideIcons.CalendarDays size={13} />
                  {periodoPreset === 'custom' && (
                    <span className="tabular-nums">
                      {formatarData(dataInicio).slice(0, 5)}–{formatarData(dataFim).slice(0, 5)}
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setModalContasAberto(true)}
                className={`h-7 text-xs font-medium px-3 rounded-full inline-flex items-center gap-1.5 border transition-colors cursor-pointer shrink-0 ${
                  contaFiltroObj
                    ? 'bg-emerald-400/20 hover:bg-emerald-400/30 text-white border-emerald-300/40'
                    : 'bg-white/10 hover:bg-white/15 text-emerald-100 border-white/15'
                }`}
              >
                <LucideIcons.Landmark size={13} className="shrink-0" />
                <span className="truncate max-w-28 sm:max-w-36">
                  {contaFiltroObj ? contaFiltroObj.nome : 'Contas'}
                </span>
              </button>
            </div>

            {mostrarDatasCustom && (
              <div className="bg-black/25 border border-white/10 rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-2 self-start">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-300/80 text-xs">De</span>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => {
                      setDataInicio(e.target.value);
                      setPeriodoPreset('custom');
                    }}
                    className="appearance-none bg-transparent text-white text-xs font-medium outline-none cursor-pointer w-28"
                  />
                </div>
                <span className="text-emerald-400/80 text-xs">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-300/80 text-xs">Até</span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => {
                      setDataFim(e.target.value);
                      setPeriodoPreset('custom');
                    }}
                    className="appearance-none bg-transparent text-white text-xs font-medium outline-none cursor-pointer w-28"
                  />
                </div>
              </div>
            )}

            {/* Linha 2: Saldo Principal + Pills [Saldo | Entradas | Saídas] */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-300/90 text-xs font-medium truncate">
                    {visaoHero === 'saldo'
                      ? contaFiltroObj
                        ? `Saldo • ${contaFiltroObj.nome}`
                        : 'Saldo em contas'
                      : visaoHero === 'entradas'
                        ? contaFiltroObj
                          ? `Entradas • ${contaFiltroObj.nome}`
                          : 'Entradas no período'
                        : contaFiltroObj
                          ? `Saídas • ${contaFiltroObj.nome}`
                          : 'Saídas no período'}
                  </span>
                  {contaFiltroObj && (
                    <button
                      type="button"
                      onClick={() => setContaFiltroId(null)}
                      aria-label="Limpar filtro de conta"
                      className="text-emerald-300/80 hover:text-white p-0.5 rounded-full cursor-pointer"
                    >
                      <LucideIcons.X size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMostrarValores(!mostrarValores)}
                    className="text-emerald-300/80 hover:text-white transition-colors p-0.5 rounded-full cursor-pointer"
                    aria-label={mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}
                  >
                    {mostrarValores ? <LucideIcons.EyeOff size={14} /> : <LucideIcons.Eye size={14} />}
                  </button>
                </div>

                <span className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-white truncate">
                  {mostrarValores ? formatarMoeda(saldoExibidoHero) : 'R$ •••••'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setVisaoHero('saldo')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium cursor-pointer transition-all ${
                    visaoHero === 'saldo'
                      ? 'bg-emerald-400/25 border-emerald-300/50 text-white'
                      : 'bg-white/10 hover:bg-white/15 border-white/10 text-emerald-200/80'
                  }`}
                >
                  <LucideIcons.Wallet size={12} className="text-emerald-300" />
                  <span>Saldo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisaoHero('entradas')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-all ${
                    visaoHero === 'entradas'
                      ? 'bg-emerald-500/30 border-emerald-300/50 text-white'
                      : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-400/20 text-emerald-200'
                  }`}
                >
                  <LucideIcons.ArrowDownLeft size={12} className="text-emerald-300" />
                  <span>Entradas</span>
                  <span className="font-semibold text-white tabular-nums">
                    {mostrarValores ? formatarMoeda(totalEntradasPeriodo) : '•••'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setVisaoHero('saidas')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer transition-all ${
                    visaoHero === 'saidas'
                      ? 'bg-rose-500/30 border-rose-300/50 text-white'
                      : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-400/20 text-rose-200'
                  }`}
                >
                  <LucideIcons.ArrowUpRight size={12} className="text-rose-300" />
                  <span>Saídas</span>
                  <span className="font-semibold text-white tabular-nums">
                    {mostrarValores ? formatarMoeda(totalSaidasPeriodo) : '•••'}
                  </span>
                </button>
              </div>
            </div>

            {/* Linha Verde */}
            <GraficoLinhaFintech
              pontos={pontosGrafico}
              ocultarValores={!mostrarValores}
              etiquetaSerie={
                visaoHero === 'entradas'
                  ? 'Entradas'
                  : visaoHero === 'saidas'
                    ? 'Saídas'
                    : 'Fluxo Líquido'
              }
            />
          </div>
        </div>

        {/* AÇÕES RÁPIDAS MINIMALISTAS */}
        <div className="md:pl-24 mt-3.5 mb-5">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setTipoMovModal('entrada');
                  setModalMovAberto(true);
                }}
                className="h-9 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 text-emerald-800 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
              >
                <LucideIcons.ArrowDownLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoMovModal('saida');
                  setModalMovAberto(true);
                }}
                className="h-9 px-3 rounded-full bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 text-rose-700 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
              >
                <LucideIcons.ArrowUpRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => setModalNotaCompraAberto(true)}
                className="h-9 px-3 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
              >
                <LucideIcons.Plus size={14} />
              </button>

              <button
                type="button"
                onClick={() => setModalGuardaSolAberto(true)}
                className="h-9 px-3 rounded-full bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/70 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
              >
                <LucideIcons.Umbrella size={14} className="text-amber-700" />
              </button>

              <button
                type="button"
                onClick={() => setModalMesasAberto(true)}
                className="h-9 px-3 rounded-full bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/70 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
              >
                <LucideIcons.Clock size={14} className="text-slate-500" />
                
                {mesasOcupadas.length > 0 && (
                  <span className="px-1 py-0.5 rounded-full bg-slate-500 text-white text-[10px] font-bold leading-none tabular-nums">
                    {mesasOcupadas.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setModalValeAberto(true)}
                className="h-9 px-3 rounded-full bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/70 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
              >
                <LucideIcons.Banknote size={15} className="text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => setModalMetaAberto(true)}
                className="h-9 px-3 rounded-full bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200/70 text-slate-700 text-xs font-medium inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-colors cursor-pointer"
              >
                <LucideIcons.Target size={14} className="text-slate-800" />

              </button>
            </div>
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL: EXTRATO */}
        <main className="md:pl-24 relative z-20">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 space-y-5 pb-12 font-sans">
            {/* ABAS + FILTRO MODERNO + EXTRATO */}
            <section>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-3.5 px-1 gap-2.5">
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-200/70 w-full lg:w-auto overflow-x-auto scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setAbaExtrato('fluxo')}
                    className={`flex-1 lg:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                      abaExtrato === 'fluxo'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Fluxo de Caixa</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] tabular-nums">
                      {lancamentosFluxo.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaExtrato('comandas')}
                    className={`flex-1 lg:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                      abaExtrato === 'comandas'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Comandas</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] tabular-nums">
                      {comandasFiltradas.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaExtrato('notas')}
                    className={`flex-1 lg:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
                      abaExtrato === 'notas'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Compras</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] tabular-nums">
                      {notasNoPeriodo.length}
                    </span>
                  </button>
                </div>

                {/* Resumo + Busca */}
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full lg:w-auto">
                  <div
                    className={`items-center gap-1.5 ${
                      mostrarPesquisa ? 'hidden sm:inline-flex' : 'inline-flex'
                    }`}
                  >
                    <FiltroExtratoDropdown
                      valor={chipFiltro}
                      metodos={opcoesFiltroExtrato.metodos}
                      categoriasEntrada={opcoesFiltroExtrato.categoriasEntrada}
                      categoriasSaida={opcoesFiltroExtrato.categoriasSaida}
                      onChange={setChipFiltro}
                    />

                    {chipFiltro && (
                      <button
                        type="button"
                        onClick={() => setChipFiltro(null)}
                        title="Limpar filtro"
                        aria-label="Limpar filtro selecionado"
                        className="w-8 h-8 rounded-full bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                      >
                        <LucideIcons.X size={13} />
                      </button>
                    )}
                  </div>

                  <div
                    className={`flex items-center justify-end gap-2 ${
                      mostrarPesquisa ? 'flex-1 sm:flex-initial' : 'shrink-0'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setModalPagamentosAberto(true)}
                      title="Resumo por forma de pagamento"
                      aria-label="Resumo por forma de pagamento"
                      className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
                    >
                      <LucideIcons.PieChart size={14} strokeWidth={2} />
                    </button>

                    {mostrarPesquisa && (
                      <div className="relative flex-1 sm:w-56">
                        <input
                          ref={inputPesquisaRef}
                          autoFocus
                          type="text"
                          placeholder="Buscar..."
                          value={pesquisa}
                          onChange={(e) => setPesquisa(e.target.value)}
                          className="w-full appearance-none bg-white border border-slate-200 rounded-full h-8 pl-3.5 pr-8 text-xs font-medium outline-none focus:border-emerald-500 shadow-2xs transition-all font-sans"
                        />
                        {pesquisa && (
                          <button
                            type="button"
                            onClick={() => setPesquisa('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            aria-label="Limpar busca"
                          >
                            <LucideIcons.X size={13} strokeWidth={2} />
                          </button>
                        )}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMostrarPesquisa(!mostrarPesquisa);
                        setPesquisa('');
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-2xs cursor-pointer shrink-0 ${
                        mostrarPesquisa
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                      aria-label="Pesquisar movimentações"
                    >
                      {mostrarPesquisa ? (
                        <LucideIcons.X size={14} strokeWidth={2} />
                      ) : (
                        <LucideIcons.Search size={14} strokeWidth={2} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* CONTEÚDO ABA 1: FLUXO DE CAIXA */}
              {abaExtrato === 'fluxo' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  {lancamentosFluxo.length === 0 ? (
                    <div className="text-center py-14 flex flex-col items-center px-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                        <LucideIcons.Wallet size={26} strokeWidth={1.5} />
                      </div>
                      <p className="text-slate-500 text-[11px] font-sans uppercase tracking-widest mb-3">
                        Nenhuma movimentação.
                      </p>                     
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {lancamentosFluxo.map((item) => {
                        const podeClicarVenda = item.origem === 'venda' && item.vendaRef;
                        const emConfirmacaoExclusao = item.movId && confirmarExcluirMovId === item.movId;

                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              if (podeClicarVenda && item.vendaRef) {
                                setVendaSelecionada(item.vendaRef);
                              } else if (item.notaCompraId) {
                                setAbaExtrato('notas');
                                setNotaExpandidaId(item.notaCompraId);
                              }
                            }}
                            className={`p-4 md:p-5 flex justify-between items-center gap-3 transition-colors ${
                              podeClicarVenda || item.notaCompraId ? 'hover:bg-slate-50 cursor-pointer' : ''
                            } ${item.cancelada ? 'bg-rose-50/30 opacity-75' : ''}`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                                  item.cancelada
                                    ? 'bg-rose-50 text-rose-500 border-rose-100'
                                    : item.direcao === 'entrada'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                      : item.direcao === 'transferencia'
                                        ? 'bg-slate-100 text-slate-700 border-slate-200'
                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                }`}
                              >
                                {item.cancelada ? (
                                  <LucideIcons.Ban size={18} />
                                ) : item.direcao === 'entrada' ? (
                                  <LucideIcons.ArrowDownLeft size={18} />
                                ) : item.direcao === 'transferencia' ? (
                                  <LucideIcons.ArrowLeftRight size={17} />
                                ) : (
                                  <LucideIcons.ArrowUpRight size={18} />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p
                                  className={`font-semibold text-xs md:text-sm truncate leading-tight ${
                                    item.cancelada ? 'text-slate-400 line-through' : 'text-slate-800'
                                  }`}
                                >
                                  {item.titulo}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="text-xs text-slate-400 font-medium">
                                    {item.horaTexto}
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    {item.nomeConta}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">
                                    • {item.subtitulo}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <p
                                  className={`font-bold text-xs md:text-sm tabular-nums ${
                                    item.cancelada
                                      ? 'text-slate-400 line-through'
                                      : item.direcao === 'entrada'
                                        ? 'text-emerald-700'
                                        : item.direcao === 'transferencia'
                                          ? 'text-slate-700'
                                          : 'text-rose-600'
                                  }`}
                                >
                                  {!mostrarValores
                                    ? 'R$ •••'
                                    : `${item.direcao === 'entrada' ? '+' : item.direcao === 'saida' ? '-' : ''}${formatarMoeda(item.valor)}`}
                                </p>
                              </div>

                              {item.origem === 'mov' && item.movId && !item.notaCompraId && (
                                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                                  {emConfirmacaoExclusao ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleExcluirMovimentacao(item.movId!)}
                                      className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      Excluir
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmarExcluirMovId(item.movId!)}
                                      aria-label="Excluir lançamento"
                                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    >
                                      <LucideIcons.Trash2 size={15} />
                                    </button>
                                  )}
                                </div>
                              )}

                              {(podeClicarVenda || item.notaCompraId) && (
                                <LucideIcons.ChevronRight size={15} className="text-slate-300 hidden sm:block" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CONTEÚDO ABA 2: EXTRATO DE COMANDAS (CLÁSSICO) */}
              {abaExtrato === 'comandas' && (
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  {comandasFiltradas.length === 0 ? (
                    <div className="text-center py-16 flex flex-col items-center px-4">
                      <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                        <LucideIcons.Receipt size={26} strokeWidth={1.5} />
                      </div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                        Nenhuma comanda encontrada.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {comandasFiltradas.map((venda) => {
                        const isCancelada = venda.status === 'cancelada';
                        const contaVendaId = resolveContaDaVenda(venda);
                        const nomeContaVenda =
                          (contaVendaId && mapaNomeConta.get(contaVendaId)) ||
                          contaPadraoVendas?.nome ||
                          'Conta padrão';
                        return (
                          <button
                            type="button"
                            key={venda.id}
                            onClick={() => setVendaSelecionada(venda)}
                            className={`w-full p-4 md:p-5 flex justify-between items-center transition-all text-left hover:bg-slate-50 active:scale-99 cursor-pointer ${
                              isCancelada ? 'bg-rose-50/30 opacity-75' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 md:gap-4 min-w-0">
                              <div
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border ${
                                  isCancelada
                                    ? 'bg-rose-50 text-rose-500 border-rose-100'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}
                              >
                                {isCancelada ? (
                                  <LucideIcons.Ban size={19} strokeWidth={2} />
                                ) : (
                                  <LucideIcons.Utensils size={18} strokeWidth={1.5} />
                                )}
                              </div>

                              <div className="min-w-0 pr-2">
                                <p
                                  className={`font-semibold text-xs md:text-sm truncate leading-tight uppercase tracking-tight ${
                                    isCancelada ? 'text-slate-400 line-through' : 'text-slate-800'
                                  }`}
                                >
                                  Mesa {venda.numeroMesa} <span className="text-slate-300 font-normal mx-1">•</span>{' '}
                                  {venda.nomeCliente || 'S/ nome'}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-slate-400 font-medium tracking-wide">
                                    {formatarData(venda.dataFechamento).slice(0, 5)} às {formatarHora(venda.dataFechamento)}
                                  </span>
                                  {venda.garcomNome && (
                                    <span className="text-xs text-slate-400 hidden sm:inline">
                                      • {venda.garcomNome}
                                    </span>
                                  )}
                                  <span className="text-xs text-emerald-700 font-medium hidden sm:inline">
                                    • {nomeContaVenda}
                                  </span>
                                  {isCancelada && (
                                    <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                                      Estornada
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0 flex items-center gap-2">
                              <p
                                className={`font-semibold text-xs md:text-sm tabular-nums tracking-tight ${
                                  isCancelada ? 'text-slate-400 line-through' : 'text-slate-700'
                                }`}
                              >
                                {mostrarValores ? formatarMoeda(venda.total) : 'R$ •••'}
                              </p>
                              <LucideIcons.ChevronRight size={15} className="text-slate-300 hidden sm:block" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* CONTEÚDO ABA 3: NOTAS DE COMPRA DO ESTOQUE */}
              {abaExtrato === 'notas' && (
                <div className="space-y-3">
                  <div className="flex justify-end">                   
                  </div>
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                    {notasNoPeriodo.length === 0 ? (
                      <div className="text-center py-14 flex flex-col items-center px-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                          <LucideIcons.Receipt size={26} strokeWidth={1.5} />
                        </div>
                        <p className="text-slate-500 text-[11px] font-sans uppercase tracking-widest mb-1">
                          Nenhuma nota de compra lançada neste período.
                        </p>
                       
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {notasNoPeriodo.map((nota) => {
                          const expandida = notaExpandidaId === nota.id;
                          const estornada = nota.status === 'estornada';
                          const confirmandoEstorno = confirmarEstornoNotaId === nota.id;
                          const contaNome = nota.contaId
                            ? mapaNomeConta.get(nota.contaId) || 'Conta removida'
                            : 'Só Estoque (A pagar)';

                          return (
                            <div key={nota.id} className={`p-4 md:p-5 ${estornada ? 'bg-rose-50/30 opacity-75' : ''}`}>
                              <div
                                onClick={() => setNotaExpandidaId(expandida ? null : nota.id)}
                                className="flex items-center justify-between gap-3 cursor-pointer"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                                      estornada
                                        ? 'bg-rose-50 text-rose-500 border-rose-100'
                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}
                                  >
                                    <LucideIcons.PackageCheck size={18} />
                                  </div>
                                  <div className="min-w-0">
                                    <p
                                      className={`font-bold text-xs md:text-sm truncate ${
                                        estornada ? 'text-slate-400 line-through' : 'text-slate-900'
                                      }`}
                                    >
                                      {nota.fornecedor}
                                      {nota.numeroNota ? ` • NF ${nota.numeroNota}` : ''}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                      <span className="text-xs text-slate-400 font-medium">
                                        {formatarData(nota.dataCompra)}
                                      </span>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                        {nota.itens.length} {nota.itens.length === 1 ? 'item' : 'itens'}
                                      </span>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
                                        {contaNome}
                                      </span>
                                      {estornada && (
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                          Estornada
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={`text-sm font-bold tabular-nums ${
                                      estornada ? 'text-slate-400 line-through' : 'text-rose-600'
                                    }`}
                                  >
                                    {mostrarValores ? formatarMoeda(nota.valorTotal) : 'R$ •••'}
                                  </span>
                                  <LucideIcons.ChevronDown
                                    size={16}
                                    className={`text-slate-400 transition-transform ${expandida ? 'rotate-180' : ''}`}
                                  />
                                </div>
                              </div>

                              {expandida && (
                                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                                  <div className="space-y-1.5">
                                    {nota.itens.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl"
                                      >
                                        <span className="font-medium text-slate-700">
                                          <strong className="text-slate-900">{item.quantidade}x</strong> {item.produtoNome}{' '}
                                          <span className="text-slate-400">({formatarMoeda(item.valorUnitario)} un.)</span>
                                        </span>
                                        <span className="font-bold text-slate-800 tabular-nums">
                                          {formatarMoeda(item.valorTotalItem)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  {nota.observacoes && (
                                    <p className="text-xs text-slate-500 italic px-1">
                                      Obs: {nota.observacoes}
                                    </p>
                                  )}

                                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                    <span>
                                      Pagamento: <strong>{nota.formaPagamento}</strong> • Lançado por{' '}
                                      <strong>{nota.usuarioNome}</strong>
                                    </span>

                                    {!estornada && (
                                      <div className="flex items-center gap-2">
                                        {confirmandoEstorno ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => setConfirmarEstornoNotaId(null)}
                                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 font-semibold cursor-pointer"
                                            >
                                              Cancelar
                                            </button>
                                            <button
                                              type="button"
                                              disabled={carregandoEstornoNota}
                                              onClick={() => void handleEstornarNota(nota.id)}
                                              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold cursor-pointer disabled:opacity-50"
                                            >
                                              {carregandoEstornoNota ? 'Estornando...' : 'Confirmar Estorno'}
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => setConfirmarEstornoNotaId(nota.id)}
                                            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-semibold cursor-pointer"
                                          >
                                            Estornar Nota
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* =====================================================================
          MODAL: GUARDA-SÓIS
      ===================================================================== */}
      <ModalBase
        aberto={modalGuardaSolAberto}
        onFechar={() => setModalGuardaSolAberto(false)}
        titulo="Guarda-sóis"
        subtitulo="Receitas de locação no período"
        icone={<LucideIcons.Umbrella size={18} />}
        tomIcone="purple"
        tamanho="md"
        headerExtra={
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] text-slate-400 block">De</span>
                <input
                  type="date"
                  value={guardaDataInicio}
                  onChange={(e) => setGuardaDataInicio(e.target.value)}
                  className="appearance-none bg-transparent text-slate-800 text-xs font-medium outline-none cursor-pointer w-full"
                />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <span className="text-[11px] text-slate-400 block">Até</span>
                <input
                  type="date"
                  value={guardaDataFim}
                  onChange={(e) => setGuardaDataFim(e.target.value)}
                  className="appearance-none bg-transparent text-slate-800 text-xs font-medium outline-none cursor-pointer w-full"
                />
              </div>
            </div>

            <div className="relative">
              <LucideIcons.Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Buscar por mesa, cliente ou valor..."
                value={guardaPesquisa}
                onChange={(e) => setGuardaPesquisa(e.target.value)}
                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl h-9 pl-8 pr-8 text-xs font-medium outline-none focus:bg-white focus:border-purple-500 transition-colors"
              />
              {guardaPesquisa && (
                <button
                  type="button"
                  onClick={() => setGuardaPesquisa('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Limpar busca"
                >
                  <LucideIcons.X size={14} />
                </button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Total filtrado</p>
              <p className="text-xl font-bold text-purple-700 tabular-nums truncate">
                {formatarMoeda(faturamentoGuardaSolModal)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500">Locações</p>
              <span className="inline-block mt-0.5 text-sm font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-lg tabular-nums">
                {historicoGuardaSolModal.length}
              </span>
            </div>
          </div>

          {historicoGuardaSolModal.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <LucideIcons.Umbrella size={26} className="text-slate-300" />
              <p className="text-slate-400 text-xs font-medium">
                Nenhuma taxa encontrada nestes filtros.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {historicoGuardaSolModal.map((venda) => {
                const valorLocacao = venda.itens
                  .filter((item) => ehItemGuardaSol(item.produto.nome))
                  .reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0);

                return (
                  <div
                    key={venda.id}
                    className="bg-white p-3 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3 hover:border-purple-200 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold uppercase text-slate-800 truncate">
                        Mesa {venda.numeroMesa} <span className="text-slate-300 font-normal mx-1">•</span>{' '}
                        {venda.nomeCliente || 'S/ nome'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatarData(venda.dataFechamento)} às {formatarHora(venda.dataFechamento)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-purple-600 tabular-nums shrink-0">
                      +{formatarMoeda(valorLocacao)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ModalBase>

      {/* =====================================================================
          MODAL: MESAS ABERTAS
      ===================================================================== */}
      <ModalBase
        aberto={modalMesasAberto}
        onFechar={() => setModalMesasAberto(false)}
        titulo="Mesas Abertas"
        subtitulo="Consumo atual no salão"
        icone={<LucideIcons.Clock size={18} />}
        tomIcone="amber"
        tamanho="md"
      >
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Valor total em aberto</p>
              <p className="text-xl font-bold text-amber-600 tabular-nums truncate">
                {formatarMoeda(valorEmAberto)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500">Ocupadas</p>
              <span className="inline-block mt-0.5 text-sm font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-lg tabular-nums">
                {mesasOcupadas.length}
              </span>
            </div>
          </div>

          {mesasOcupadas.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center gap-2">
              <LucideIcons.CheckCircle2 size={26} className="text-slate-300" />
              <p className="text-slate-400 text-xs font-medium">
                O salão está vazio no momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {mesasOcupadas.map((mesa) => {
                const totalMesa = mesa.itens.reduce(
                  (sum, item) => sum + item.produto.preco * item.quantidade,
                  0
                );
                return (
                  <div
                    key={mesa.id}
                    className="bg-white p-3 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold uppercase text-slate-800 truncate">
                        Mesa {mesa.numero}
                        {mesa.nomeCliente ? ` • ${mesa.nomeCliente}` : ''}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {mesa.itens.length} {mesa.itens.length === 1 ? 'item consumido' : 'itens consumidos'}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-amber-600 tabular-nums shrink-0">
                      {formatarMoeda(totalMesa)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ModalBase>

      {/* =====================================================================
          MODAL: MÉTODOS DE PAGAMENTO
      ===================================================================== */}
      <ModalBase
        aberto={modalPagamentosAberto}
        onFechar={() => setModalPagamentosAberto(false)}
        titulo="Formas de Pagamento"
        subtitulo="Entradas detalhadas no período"
        icone={<LucideIcons.PieChart size={18} />}
        tomIcone="slate"
        tamanho="sm"
      >
        {Object.keys(resumoPagamentos).length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center gap-2">
            <LucideIcons.PieChart size={26} className="text-slate-300" />
            <p className="text-slate-400 text-xs font-medium">
              Nenhuma receita no período.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(resumoPagamentos)
              .sort(([, a], [, b]) => b - a)
              .map(([metodo, valor]) => {
                const config = configPagamentos[metodo] || configPagamentos['Não Especificado'];
                const perc = totalPagamentosResumo > 0 ? (valor / totalPagamentosResumo) * 100 : 0;
                return (
                  <div
                    key={metodo}
                    className="bg-white p-3 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${config.border} ${config.corBg} ${config.corTexto}`}
                      >
                        {config.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-slate-800 truncate">
                          {metodo}
                        </p>
                        <p className="text-xs text-slate-400 tabular-nums">{perc.toFixed(1)}% do total</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                      {formatarMoeda(valor)}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </ModalBase>

      {/* =====================================================================
          MODAL: LANÇAR VALE
      ===================================================================== */}
      <ModalBase
        aberto={modalValeAberto}
        onFechar={() => setModalValeAberto(false)}
        titulo="Lançar Pagamento"
        subtitulo="Vale ou adiantamento de equipe"
        icone={<LucideIcons.Banknote size={18} />}
        tomIcone="emerald"
        tamanho="sm"
        bloqueado={carregandoVale}
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={carregandoVale}
              onClick={() => setModalValeAberto(false)}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-lancar-vale"
              disabled={carregandoVale}
              className="flex-2 h-10 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {carregandoVale ? (
                <LucideIcons.Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <LucideIcons.Check size={16} />
                  <span>Salvar Vale</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <form id="form-lancar-vale" onSubmit={handleSalvarVale} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
              <input
                required
                type="date"
                disabled={carregandoVale}
                value={valeData}
                onChange={(e) => setValeData(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl h-10 px-3 text-xs font-medium text-slate-800 outline-none focus:border-emerald-600 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 text-xs font-medium pointer-events-none">
                  R$
                </span>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  disabled={carregandoVale}
                  value={valeValor}
                  onChange={handleValorChange}
                  className="w-full appearance-none bg-white border border-slate-200 rounded-xl h-10 pl-8 pr-3 text-sm font-bold tabular-nums text-slate-900 outline-none focus:border-emerald-600 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Colaborador</label>
            <div className="relative">
              <select
                required
                disabled={carregandoVale}
                value={valeFuncionarioId}
                onChange={(e) => setValeFuncionarioId(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200 rounded-xl h-10 pl-3.5 pr-8 text-sm font-medium text-slate-800 outline-none focus:border-emerald-600 disabled:opacity-50 cursor-pointer"
              >
                <option value="" disabled>
                  Selecione um colaborador
                </option>
                {listaFuncionarios.length === 0 && (
                  <option value="" disabled>
                    Nenhum cadastrado
                  </option>
                )}
                {listaFuncionarios.map((func) => (
                  <option key={func.id} value={func.id}>
                    {func.nome}
                  </option>
                ))}
              </select>
              <LucideIcons.ChevronDown
                size={15}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Situação</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                disabled={carregandoVale}
                onClick={() => setValeStatus('pago')}
                className={`h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  valeStatus === 'pago'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Pago agora
              </button>
              <button
                type="button"
                disabled={carregandoVale}
                onClick={() => setValeStatus('agendado')}
                className={`h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  valeStatus === 'agendado'
                    ? 'bg-white text-amber-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Agendado
              </button>
            </div>
          </div>

          {valeStatus === 'pago' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Forma de pagamento
                </label>
                <div className="relative">
                  <select
                    value={valeMetodoPagamento}
                    disabled={carregandoVale}
                    onChange={(e) => setValeMetodoPagamento(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 h-10 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 cursor-pointer disabled:opacity-60"
                  >
                    {METODOS_PAGAMENTO_SAIDA.map((metodo) => (
                      <option key={metodo} value={metodo}>
                        {metodo}
                      </option>
                    ))}
                  </select>
                  <LucideIcons.ChevronDown
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {contasAtivas.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Conta de saída
                  </label>
                  <div className="relative">
                    <select
                      value={contaValeEfetiva}
                      disabled={carregandoVale}
                      onChange={(e) => setValeContaId(e.target.value)}
                      className="w-full appearance-none bg-white border border-slate-200 rounded-xl pl-3 pr-8 h-10 text-xs font-semibold text-slate-800 outline-none focus:border-emerald-600 cursor-pointer disabled:opacity-60"
                    >
                      {contasAtivas.map((conta) => {
                        const saldoConta = saldosContas.porConta.get(conta.id)?.saldoAtual ?? conta.saldoInicial;
                        return (
                          <option key={conta.id} value={conta.id}>
                            {conta.nome} ({formatarMoeda(saldoConta)})
                          </option>
                        );
                      })}
                    </select>
                    <LucideIcons.ChevronDown
                      size={14}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observação (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Diária ou adiantamento"
              disabled={carregandoVale}
              value={valeDescricao}
              onChange={(e) => setValeDescricao(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 rounded-xl h-10 px-3.5 text-sm text-slate-800 outline-none focus:border-emerald-600 disabled:opacity-50"
            />
          </div>
        </form>
      </ModalBase>

      {/* =====================================================================
          MODAL: DEFINIR META
      ===================================================================== */}
      <ModalBase
        aberto={modalMetaAberto}
        onFechar={() => setModalMetaAberto(false)}
        titulo="Metas da Casa"
        subtitulo="Objetivo de faturamento do período"
        icone={<LucideIcons.Target size={18} />}
        tomIcone="blue"
        tamanho="md"
        bloqueado={carregandoMeta}
        footer={
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={carregandoMeta}
              onClick={() => setModalMetaAberto(false)}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Fechar
            </button>
            <button
              type="submit"
              form="form-meta-casa"
              disabled={carregandoMeta}
              className="flex-2 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {carregandoMeta ? (
                <LucideIcons.Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <LucideIcons.Check size={16} />
                  <span>Atualizar Meta</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {metaAtiva ? (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4">
              <div className="flex justify-between items-center gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  <span className="text-xs font-semibold text-slate-700">Meta ativa</span>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                  {formatarData(metaAtiva.dataInicio).slice(0, 5)} até{' '}
                  {formatarData(metaAtiva.dataFim).slice(0, 5)}
                </span>
              </div>

              <p className="text-2xl font-bold text-slate-900 tabular-nums mb-2">
                {formatarMoeda(metaAtiva.valorAlvo)}
              </p>

              <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${percentualMeta}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">
                  Atingido: <strong className="text-slate-700">{formatarMoeda(saldoLiquido)}</strong>
                </span>
                <span className="font-bold text-blue-600 tabular-nums">{percentualMeta.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 text-center">
              <p className="text-xs font-medium text-slate-500">
                Nenhuma meta ativa. Defina um objetivo abaixo.
              </p>
            </div>
          )}

          <form id="form-meta-casa" onSubmit={handleSalvarMeta} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data inicial</label>
                <input
                  disabled={carregandoMeta}
                  required
                  type="date"
                  value={metaDataInicio}
                  onChange={(e) => setMetaDataInicio(e.target.value)}
                  className="appearance-none w-full bg-white border border-slate-200 rounded-xl h-10 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data final</label>
                <input
                  disabled={carregandoMeta}
                  required
                  type="date"
                  value={metaDataFim}
                  onChange={(e) => setMetaDataFim(e.target.value)}
                  className="appearance-none w-full bg-white border border-slate-200 rounded-xl h-10 px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor alvo (R$)</label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400 text-xs font-medium pointer-events-none">
                  R$
                </span>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  disabled={carregandoMeta}
                  value={novaMetaInput}
                  onChange={handleMetaValorChange}
                  className="appearance-none w-full bg-white border border-slate-200 rounded-xl h-10 pl-9 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 placeholder:text-slate-300 disabled:opacity-50 tabular-nums"
                />
              </div>
            </div>
          </form>
        </div>
      </ModalBase>

      {/* =====================================================================
          MODAL: DETALHES DA VENDA
      ===================================================================== */}
      {vendaSelecionada && (
        <ModalBase
          aberto={!modalCancelarAberto}
          onFechar={() => setVendaSelecionada(null)}
          titulo={`Mesa ${vendaSelecionada.numeroMesa}`}
          subtitulo={`${formatarData(vendaSelecionada.dataFechamento)} • ${formatarHora(vendaSelecionada.dataFechamento)}`}
          icone={<LucideIcons.Receipt size={18} />}
          tomIcone="slate"
          tamanho="md"
          footer={
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-500">Total final</span>
                <span
                  className={`text-xl font-bold tabular-nums ${
                    vendaSelecionada.status === 'cancelada'
                      ? 'text-slate-400 line-through'
                      : 'text-slate-900'
                  }`}
                >
                  {formatarMoeda(vendaSelecionada.total)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleImprimirVendaSelecionada}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold h-10 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LucideIcons.Printer size={15} />
                  <span>Imprimir</span>
                </button>
                {vendaSelecionada.status !== 'cancelada' && (
                  <button
                    type="button"
                    onClick={() => setModalCancelarAberto(true)}
                    className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-semibold h-10 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Estornar
                  </button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-3">
            {vendaSelecionada.status === 'cancelada' && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl">
                <h4 className="text-rose-600 font-semibold text-xs flex items-center gap-1.5 mb-1">
                  <LucideIcons.Ban size={14} /> Cancelada por {vendaSelecionada.canceladoPor}
                </h4>
                <p className="bg-white p-2.5 rounded-xl border border-rose-100 text-xs text-rose-900">
                  Motivo: {vendaSelecionada.motivoCancelamento}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">Cliente</p>
                <p className="font-semibold text-xs sm:text-sm text-slate-800 uppercase truncate">
                  {vendaSelecionada.nomeCliente || 'Não identificado'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">Atendente</p>
                <p className="font-semibold text-xs sm:text-sm text-slate-800 uppercase truncate">
                  {vendaSelecionada.garcomNome || 'Equipe'}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 mb-0.5">Conta de entrada</p>
                <p className="font-semibold text-xs sm:text-sm text-emerald-700 truncate">
                  {(() => {
                    const idConta = resolveContaDaVenda(vendaSelecionada);
                    return (
                      (idConta && mapaNomeConta.get(idConta)) ||
                      contaPadraoVendas?.nome ||
                      'Conta padrão'
                    );
                  })()}
                </p>
              </div>
            </div>

            {vendaSelecionada.pagamentos && vendaSelecionada.pagamentos.length > 0 && (
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 space-y-1.5">
                <p className="text-xs text-slate-400">Pagamentos registrados</p>
                <div className="flex flex-wrap gap-1.5">
                  {vendaSelecionada.pagamentos.map((pag, idx) => (
                    <span
                      key={`${pag.metodo}-${idx}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold tabular-nums"
                    >
                      <span>{pag.metodo}:</span>
                      <span>{formatarMoeda(pag.valor)}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-slate-200/80">
              {vendaSelecionada.itens.map((item) => (
                <div
                  key={item.id}
                  className={`flex justify-between items-center pb-2.5 border-b border-slate-100 border-dashed last:border-0 last:pb-0 ${
                    vendaSelecionada.status === 'cancelada' ? 'line-through opacity-50' : ''
                  }`}
                >
                  <div className="flex gap-2.5 items-center min-w-0 pr-2">
                    <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg text-xs tabular-nums shrink-0">
                      {item.quantidade}x
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-xs sm:text-sm uppercase truncate">
                        {item.produto.nome}
                      </p>
                      <p className="text-xs text-slate-400 tabular-nums">
                        {formatarMoeda(item.produto.preco)} un.
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-slate-900 text-sm tabular-nums shrink-0">
                    {formatarMoeda(item.produto.preco * item.quantidade)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ModalBase>
      )}

      {/* =====================================================================
          MODAL: ESTORNO
      ===================================================================== */}
      {vendaSelecionada && (
        <ModalBase
          aberto={modalCancelarAberto}
          onFechar={() => setModalCancelarAberto(false)}
          titulo="Estornar Venda?"
          subtitulo={`Valor de ${formatarMoeda(vendaSelecionada.total)}`}
          icone={<LucideIcons.AlertTriangle size={18} />}
          tomIcone="rose"
          tamanho="sm"
          zIndexClass="z-60"
          bloqueado={carregandoCancelamento}
          footer={
            <div className="flex gap-2">
              <button
                type="button"
                disabled={carregandoCancelamento}
                onClick={() => setModalCancelarAberto(false)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={carregandoCancelamento}
                onClick={() => void confirmarCancelamento()}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {carregandoCancelamento ? (
                  <LucideIcons.Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>Confirmar Estorno</span>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              O valor de <strong className="text-rose-600">{formatarMoeda(vendaSelecionada.total)}</strong>{' '}
              será subtraído do caixa e os produtos retornarão automaticamente ao estoque.
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Motivo do estorno (obrigatório)
              </label>
              <input
                autoFocus
                type="text"
                disabled={carregandoCancelamento}
                placeholder="Ex: Lançamento duplicado..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="appearance-none w-full bg-white px-3.5 h-10 rounded-xl outline-none focus:border-rose-500 text-sm border border-slate-200 disabled:opacity-50"
              />
            </div>
          </div>
        </ModalBase>
      )}

      {/* MODAIS FINTECH DO FLUXO DE CAIXA */}
      <ModalContasFinanceiras
        aberto={modalContasAberto}
        onFechar={() => setModalContasAberto(false)}
        saldosPorConta={saldosContas.porConta}
        contaSelecionadaId={contaFiltroId}
        onSelecionarConta={(id) => {
          setContaFiltroId(id);
          setModalContasAberto(false);
        }}
        onAbrirTransferencia={() => {
          setModalContasAberto(false);
          setTipoMovModal('transferencia');
          setModalMovAberto(true);
        }}
      />

      <ModalMovimentacaoCaixa
        aberto={modalMovAberto}
        tipoInicial={tipoMovModal}
        contaInicialId={contaFiltroId || undefined}
        onFechar={() => setModalMovAberto(false)}
        saldosPorConta={saldosContas.porConta}
      />

      <ModalNotaCompraEstoque
        aberto={modalNotaCompraAberto}
        onFechar={() => setModalNotaCompraAberto(false)}
        onSucesso={(msg) => mostrarToast(msg, 'sucesso')}
      />

      {/* IMPRESSÃO */}
      <div
        className="hidden print:block text-black bg-white font-mono text-xs absolute top-0 left-0 p-4"
        style={{ width: '80mm' }}
      >
        <h1 className="text-center font-bold text-lg mb-1">C O M P R O V A N T E</h1>
        <p className="text-center border-b border-black pb-2 mb-2">
          Mesa {vendaSelecionada?.numeroMesa}
          <br />
          {vendaSelecionada ? formatarData(vendaSelecionada.dataFechamento) : ''}{' '}
          {vendaSelecionada ? formatarHora(vendaSelecionada.dataFechamento) : ''}
        </p>
        <div className="flex justify-between font-bold border-b border-black pb-1 mb-2">
          <span>QTD DESC</span>
          <span>VALOR</span>
        </div>
        {vendaSelecionada?.itens.map((item) => (
          <div key={item.id} className="flex justify-between mb-1">
            <span className="pr-2">
              {item.quantidade}x {item.produto.nome}
            </span>
            <span className="tabular-nums">{formatarMoeda(item.produto.preco * item.quantidade)}</span>
          </div>
        ))}
        <div className="border-t border-black mt-2 pt-2 flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span className="tabular-nums">{vendaSelecionada ? formatarMoeda(vendaSelecionada.total) : ''}</span>
        </div>
      </div>
    </div>
  );
}
