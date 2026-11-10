// src/pages/Painel.tsx
import { useState, useContext, useEffect, useRef } from 'react';
import { AppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import { Header } from '../components/Header';
import { imprimirCupomTermico } from '../utils/impressoraTermica';
import type { VendaFechada, PagamentoGarcom } from '../types';
import * as LucideIcons from 'lucide-react';

export function Painel() {
  const contexto = useContext(AppContext);

  // ESTADOS DE DATA E VISIBILIDADE
  const dataHoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFechada | null>(null);
  const [mostrarValores, setMostrarValores] = useState(true);

  // ESTADOS DA PESQUISA
  const [pesquisa, setPesquisa] = useState('');
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const inputPesquisaRef = useRef<HTMLInputElement>(null);

  // ESTADOS DOS MODAIS
  const [modalPagamentosAberto, setModalPagamentosAberto] = useState(false);
  const [modalRecebimentosAberto, setModalRecebimentosAberto] = useState(false);
  const [modalMetaAberto, setModalMetaAberto] = useState(false);

  const primeiroDiaDoMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const [modalDataInicio, setModalDataInicio] = useState(primeiroDiaDoMes);
  const [modalDataFim, setModalDataFim] = useState(dataHoje);

  // DADOS DO CONTEXTO (SUPABASE)
  const metaAtiva = contexto?.metaAtiva;
  const historico = contexto?.historicoVendas || [];
  const garcomLogado = contexto?.garcomLogado;
  const todosPagamentos = contexto?.historicoPagamentos || [];
  const dadosEmpresa = contexto?.dadosEmpresa;

  // FILTRAGEM DAS VENDAS PARA O EXTRATO DO PAINEL
  const vendasFiltradas = historico.filter((venda) => {
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= dataInicio && dataVenda <= dataFim;
    const isAdmin = garcomLogado?.cargo === 'admin' || garcomLogado?.cargo === 'super_admin';
    const privacidadeValida = isAdmin ? true : venda.garcomNome === garcomLogado?.nome;

    const termo = pesquisa.trim().toLowerCase();
    const pesquisaValida =
      termo === '' ||
      venda.numeroMesa.toString().includes(termo) ||
      (venda.nomeCliente?.toLowerCase() || '').includes(termo) ||
      venda.total.toString().includes(termo);

    return dataValida && privacidadeValida && pesquisaValida;
  });

  const vendasValidas = vendasFiltradas.filter((v) => v.status !== 'cancelada');
  const faturamentoTotal = vendasValidas.reduce((total, venda) => total + venda.total, 0);

  // META DE VENDAS
  let faturamentoDaMeta = 0;

  if (metaAtiva) {
    const vendasDentroDaMeta = historico.filter((venda) => {
      if (venda.status === 'cancelada') return false;

      const dataVenda = venda.dataFechamento.split('T')[0];
      const dataDentroDoPeriodoMeta =
        dataVenda >= metaAtiva.dataInicio && dataVenda <= metaAtiva.dataFim;
      const isAdmin = garcomLogado?.cargo === 'admin' || garcomLogado?.cargo === 'super_admin';
      const privacidadeValida = isAdmin ? true : venda.garcomNome === garcomLogado?.nome;

      return dataDentroDoPeriodoMeta && privacidadeValida;
    });

    faturamentoDaMeta = vendasDentroDaMeta.reduce((acc, v) => acc + v.total, 0);
  }

  const valorAlvoMeta = metaAtiva ? metaAtiva.valorAlvo : 0;
  const porcentagemMeta =
    valorAlvoMeta > 0 ? Math.min((faturamentoDaMeta / valorAlvoMeta) * 100, 100) : 0;
  const metaBatida = valorAlvoMeta > 0 && faturamentoDaMeta >= valorAlvoMeta;

  // VALES E REPASSES (SUPABASE)
  const recebimentosReal = todosPagamentos.filter((pagamento: PagamentoGarcom) => {
    const isAdmin = garcomLogado?.cargo === 'admin' || garcomLogado?.cargo === 'super_admin';
    const pertenceAoUsuario = isAdmin
      ? true
      : pagamento.garcomId === garcomLogado?.id || pagamento.garcomNome === garcomLogado?.nome;

    const dataPagamento = pagamento.data.split('T')[0];
    const dataValida = dataPagamento >= modalDataInicio && dataPagamento <= modalDataFim;

    return pertenceAoUsuario && dataValida;
  });

  const recebimentosPagos = recebimentosReal.filter((r) => r.status === 'pago');
  const recebimentosAgendados = recebimentosReal.filter((r) => r.status === 'agendado');

  const totalModalPago = recebimentosPagos.reduce((acc, r) => acc + r.valor, 0);
  const totalModalAgendado = recebimentosAgendados.reduce((acc, r) => acc + r.valor, 0);

  // FORMATAÇÕES
  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarHora = (isoString: string) =>
    new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatarDataBR = (isoString: string) => {
    if (!isoString) return '';
    const partes = isoString.split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  // EFEITOS DE SCROLL E FOCO
  useEffect(() => {
    if (vendaSelecionada || modalPagamentosAberto || modalRecebimentosAberto || modalMetaAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [vendaSelecionada, modalPagamentosAberto, modalRecebimentosAberto, modalMetaAberto]);

  useEffect(() => {
    if (mostrarPesquisa && inputPesquisaRef.current) {
      inputPesquisaRef.current.focus();
    }
  }, [mostrarPesquisa]);

  // IMPRESSÃO DE CUPOM
  const handleImprimirCupomVenda = async (venda: VendaFechada) => {
    const itensNormais = venda.itens.filter(
      (i) =>
        !i.produto.nome.toLowerCase().includes('guarda-sol') &&
        !i.produto.nome.toLowerCase().includes('guarda sol') &&
        i.id !== 'taxa-servico-10'
    );
    const itensTaxa = venda.itens.filter(
      (i) =>
        i.produto.nome.toLowerCase().includes('guarda-sol') ||
        i.produto.nome.toLowerCase().includes('guarda sol') ||
        i.id === 'taxa-servico-10'
    );

    const subtotalItens = (itensNormais.length > 0 ? itensNormais : venda.itens).reduce(
      (acc, item) => acc + item.produto.preco * item.quantidade,
      0
    );
    const taxaGuardaSol = itensTaxa.reduce(
      (acc, item) => acc + item.produto.preco * item.quantidade,
      0
    );
    const somaBruta = subtotalItens + taxaGuardaSol;
    const descontoCalculado = somaBruta > venda.total ? somaBruta - venda.total : 0;

    await imprimirCupomTermico({
      nomeEstabelecimento:
        dadosEmpresa?.nome_exibicao || dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA,
      documentoEstabelecimento: dadosEmpresa?.documento || undefined,
      telefoneEstabelecimento: dadosEmpresa?.telefone || undefined,
      numeroMesa: venda.numeroMesa,
      nomeCliente: venda.nomeCliente || 'Consumidor',
      garcomNome: venda.garcomNome || garcomLogado?.nome || 'Equipe',
      itens: itensNormais.length > 0 ? itensNormais : venda.itens,
      subtotal: subtotalItens,
      taxaGuardaSol,
      desconto: descontoCalculado,
      totalFinal: venda.total,
      pagamentos: venda.pagamentos || [],
      dataHora: `${formatarDataBR(venda.dataFechamento)} às ${formatarHora(venda.dataFechamento)}`,
      codigoVenda: venda.id,
      statusCancelada: venda.status === 'cancelada',
      motivoCancelamento: venda.motivoCancelamento
    });
  };

  const alternarPesquisa = () => {
    setMostrarPesquisa((prev) => {
      const novo = !prev;
      if (!novo) setPesquisa('');
      return novo;
    });
  };

  const filtroEhHoje = dataInicio === dataHoje && dataFim === dataHoje;

  // RESUMO POR MÉTODOS DE PAGAMENTO RECEBIDOS NO PERÍODO
  const resumoMetodos = vendasValidas.reduce(
    (acc, venda) => {
      if (venda.pagamentos && venda.pagamentos.length > 0) {
        venda.pagamentos.forEach((pg) => {
          const met = pg.metodo;
          if (met === 'PIX') {
            acc.pix += pg.valor;
            acc.qtdPix += 1;
          } else if (met === 'Crédito') {
            acc.credito += pg.valor;
            acc.qtdCredito += 1;
          } else if (met === 'Débito') {
            acc.debito += pg.valor;
            acc.qtdDebito += 1;
          } else if (met === 'Dinheiro') {
            acc.dinheiro += pg.valor;
            acc.qtdDinheiro += 1;
          } else {
            acc.outros += pg.valor;
          }
        });
      } else {
        acc.outros += venda.total;
      }
      return acc;
    },
    {
      pix: 0,
      credito: 0,
      debito: 0,
      dinheiro: 0,
      outros: 0,
      qtdPix: 0,
      qtdCredito: 0,
      qtdDebito: 0,
      qtdDinheiro: 0
    }
  );

  const setFiltroPeriodo = (tipo: 'hoje' | 'ontem' | '7dias') => {
    const hoje = new Date();
    const strHoje = hoje.toISOString().split('T')[0];

    if (tipo === 'hoje') {
      setDataInicio(strHoje);
      setDataFim(strHoje);
    } else if (tipo === 'ontem') {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);
      const strOntem = ontem.toISOString().split('T')[0];
      setDataInicio(strOntem);
      setDataFim(strOntem);
    } else if (tipo === '7dias') {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
      setDataInicio(seteDiasAtras.toISOString().split('T')[0]);
      setDataFim(strHoje);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 font-sans flex flex-col relative antialiased text-slate-800 pb-24 md:pb-12">
      <div className="print:hidden">
        <Header />

        <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8 pt-20 md:pt-24 md:pl-24">
          {/* DATA / PERÍODO */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => setFiltroPeriodo('hoje')}
                className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                  filtroEhHoje
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs'
                }`}
              >
                Hoje
              </button>

              <button
                type="button"
                onClick={() => setFiltroPeriodo('ontem')}
                className="h-8 px-3 rounded-full text-xs font-normal bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs transition-all cursor-pointer hidden sm:inline-flex items-center shrink-0"
              >
                Ontem
              </button>

              <div className="inline-flex items-center bg-white border border-slate-200/80 rounded-full px-3 h-8 gap-1.5 shadow-2xs shrink-0">
                <LucideIcons.Calendar size={13} className="text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-normal outline-none cursor-pointer w-24 text-center"
                />
                <span className="text-slate-300 text-[10px]">até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-normal outline-none cursor-pointer w-24 text-center"
                />
              </div>
            </div>
          </div>

          {/* CARD: VENDAS CONCLUÍDAS*/}
          <div className="relative overflow-hidden rounded-3xl sm:rounded-4xl bg-linear-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-white p-5 sm:p-6 shadow-lg shadow-emerald-950/15 border border-emerald-600/30 mb-4">
            <div className="absolute -top-12 -right-12 w-60 h-60 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-10 w-48 h-48 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between gap-4">
              {/* Título VENDAS CONCLUÍDAS + Olho */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                  <span className="text-xs font-medium uppercase tracking-wider text-emerald-100">
                    Vendas Concluídas
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarValores(!mostrarValores)}
                  aria-label={mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-emerald-100 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  {mostrarValores ? (
                    <LucideIcons.EyeOff size={15} strokeWidth={1.8} />
                  ) : (
                    <LucideIcons.Eye size={15} strokeWidth={1.8} />
                  )}
                </button>
              </div>

              {/* Valor Principal */}
              <div>
                <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-white mt-0.5">
                  {mostrarValores ? formatarMoeda(faturamentoTotal) : 'R$ ••••••'}
                </h2>
              </div>

              {/* Quantidade de Vendas Concluídas + Botão de Formas de Pag. */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
                <div className="inline-flex items-center gap-2 text-[14px] font-normal text-emerald-100">
                  <LucideIcons.CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
                  <span>
                    {vendasValidas.length}{' '}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setModalPagamentosAberto(true)}
                  className="h-7 px-3 uppercase rounded-full bg-white/12 hover:bg-white/20 border border-white/15 text-[10px] font-medium text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <LucideIcons.PieChart size={12} strokeWidth={2} />
                  <span>Recebidos</span>
                </button>
              </div>
            </div>
          </div>

          {/* BARRA DE ATALHOS */}
          <div className="grid grid-cols-3 gap-3 sm:gap-2.5 mb-7">
            <button
              type="button"
              onClick={() => setModalMetaAberto(true)}
              className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-3xl py-2.5 px-2 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-4xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <LucideIcons.Target size={16} strokeWidth={1.2} />
              </div>
              <span className="text-xs font-normal text-slate-800 leading-tight">Meta</span>
            </button>

            <button
              type="button"
              onClick={() => setModalRecebimentosAberto(true)}
              className="bg-white hover:bg-slate-50/80 border border-slate-200/80 rounded-3xl py-2.5 px-2 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group relative"
            >
              {totalModalAgendado > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <div className="w-8 h-8 rounded-4xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                <LucideIcons.HandCoins size={16} strokeWidth={1.2} />
              </div>
              <span className="text-xs font-normal text-slate-800 leading-tight">Vales</span>
            </button>

            <button
              type="button"
              onClick={alternarPesquisa}
              className={`border rounded-3xl py-2 px-2 shadow-2xs hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group ${
                mostrarPesquisa
                  ? 'bg-slate-900 border-slate-900 text-white'
                  : 'bg-white hover:bg-slate-50/80 border-slate-200/80 text-slate-800'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-4xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                  mostrarPesquisa
                    ? 'bg-white/15 text-white'
                    : 'bg-slate-100 border border-slate-200/70 text-slate-700'
                }`}
              >
                <LucideIcons.Search size={16} strokeWidth={1.2} />
              </div>
              <span
                className={`text-xs font-normal leading-tight ${
                  mostrarPesquisa ? 'text-white' : 'text-slate-800'
                }`}
              >
                Buscar
              </span>
            </button>
          </div>

          {/* EXTRATO DE COMANDAS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Extrato de Comandas
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {vendasFiltradas.length}{' '}
                {vendasFiltradas.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {/* Campo de busca expansível quando acionado no botão Buscar */}
            {(mostrarPesquisa || pesquisa.length > 0) && (
              <div className="relative animate-in fade-in slide-in-from-top-2 duration-150">
                <LucideIcons.Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={inputPesquisaRef}
                  type="text"
                  placeholder="Buscar por número da mesa, cliente ou valor"
                  value={pesquisa}
                  onChange={(e) => setPesquisa(e.target.value)}
                  className="w-full bg-white border border-slate-200/90 focus:border-emerald-600 rounded-full h-10 pl-9 pr-9 text-xs text-slate-500 outline-none shadow-2xs transition-all placeholder:text-slate-400"
                />
                {pesquisa && (
                  <button
                    type="button"
                    onClick={() => setPesquisa('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <LucideIcons.X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Container */}
            <div className="bg-slate-200/55 border border-slate-200/80 rounded-4xl p-2 space-y-1.5 shadow-2xs">
              {vendasFiltradas.length === 0 ? (
                <div className="py-12 px-4 rounded-4xl bg-white/80 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-slate-100 border border-slate-200/70 rounded-full flex items-center justify-center mb-2.5 text-slate-400">
                    <LucideIcons.Receipt size={18} strokeWidth={1.8} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {pesquisa ? 'Nenhuma comanda encontrada' : 'Nenhuma venda registrada no período'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                    {pesquisa
                      ? 'Tente buscar por outro número de mesa ou cliente.'
                      : 'Toque em outra data acima ou aguarde o fechamento de novas comandas.'}
                  </p>
                </div>
              ) : (
                vendasFiltradas.map((venda) => {
                  const isCancelada = venda.status === 'cancelada';
                  const numeroFormatado = String(venda.numeroMesa).padStart(2, '0');
                  const metodosLista = (venda.pagamentos || []).map((p) => p.metodo);
                  const metodosUnicos = Array.from(new Set(metodosLista));

                  return (
                    <button
                      key={venda.id}
                      type="button"
                      onClick={() => setVendaSelecionada(venda)}
                      className={`group w-full px-3.5 py-3 rounded-4xl border transition-all duration-150 text-left flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                        isCancelada
                          ? 'bg-rose-50/60 hover:bg-rose-50 border-rose-200/60 text-slate-500'
                          : 'bg-white/95 hover:bg-white border-transparent hover:border-slate-200/90 shadow-2xs hover:shadow-md text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Bolinha com número da mesa */}
                        <span
                          className={`w-9 h-9 rounded-full text-xs font-sans flex items-center justify-center shrink-0 tabular-nums shadow-2xs ${
                            isCancelada
                              ? 'bg-rose-100 text-rose-600 border border-rose-200'
                              : 'bg-slate-500 text-white'
                          }`}
                        >
                          {numeroFormatado}
                        </span>

                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              isCancelada ? 'text-slate-400 line-through' : 'text-slate-800'
                            }`}
                          >
                            {venda.nomeCliente?.trim() || `Mesa ${numeroFormatado}`}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                            <span>
                              {formatarDataBR(venda.dataFechamento)} às{' '}
                              {formatarHora(venda.dataFechamento)}
                            </span>
                            {metodosUnicos.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500">{metodosUnicos.join(', ')}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        <div className="text-right">
                          <span
                            className={`text-sm font-medium tabular-nums block ${
                              isCancelada ? 'text-slate-400 line-through' : 'text-slate-900'
                            }`}
                          >
                            {mostrarValores ? formatarMoeda(venda.total) : 'R$ •••••'}
                          </span>
                          <span
                            className={`text-[10px] font-medium block ${
                              isCancelada ? 'text-rose-500' : 'text-emerald-600'
                            }`}
                          >
                            {isCancelada ? 'Cancelada' : 'Concluída'}
                          </span>
                        </div>

                        <LucideIcons.ChevronRight
                          size={15}
                          strokeWidth={1.8}
                          className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </div>

      {/* MODAL: FORMAS DE PAGAMENTO RECEBIDAS NO PERÍODO */}
      {modalPagamentosAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalPagamentosAberto(false)} />

          <div className="bg-white rounded-t-4xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl border border-slate-100 relative z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 p-5 pb-7 sm:pb-5">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-4xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <LucideIcons.Wallet size={17} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm uppercase font-medium text-slate-700">Pagamentos Recebidos</h3>
                  <p className="text-[10px] text-slate-400">
                    {dataInicio === dataFim
                      ? `Período: ${formatarDataBR(dataInicio)}`
                      : `${formatarDataBR(dataInicio)} até ${formatarDataBR(dataFim)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalPagamentosAberto(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
              >
                <LucideIcons.X size={15} />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* PIX */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <LucideIcons.QrCode size={17} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-800">PIX</p>
                    <p className="text-[10px] text-slate-400">
                      {resumoMetodos.qtdPix}{' '}
                      {resumoMetodos.qtdPix === 1 ? 'recebimento' : 'recebimentos'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-900 tabular-nums">
                  {formatarMoeda(resumoMetodos.pix)}
                </span>
              </div>

              {/* Cartão de Crédito */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <LucideIcons.CreditCard size={17} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-800">Cartão de Crédito</p>
                    <p className="text-[10px] text-slate-400">
                      {resumoMetodos.qtdCredito}{' '}
                      {resumoMetodos.qtdCredito === 1 ? 'recebimento' : 'recebimentos'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-900 tabular-nums">
                  {formatarMoeda(resumoMetodos.credito)}
                </span>
              </div>

              {/* Cartão de Débito */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <LucideIcons.CreditCard size={17} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-800">Cartão de Débito</p>
                    <p className="text-[10px] text-slate-400">
                      {resumoMetodos.qtdDebito}{' '}
                      {resumoMetodos.qtdDebito === 1 ? 'recebimento' : 'recebimentos'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-900 tabular-nums">
                  {formatarMoeda(resumoMetodos.debito)}
                </span>
              </div>

              {/* Dinheiro em Espécie */}
              <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <LucideIcons.Banknote size={17} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-800">Dinheiro em Espécie</p>
                    <p className="text-[10px] text-slate-400">
                      {resumoMetodos.qtdDinheiro}{' '}
                      {resumoMetodos.qtdDinheiro === 1 ? 'recebimento' : 'recebimentos'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-900 tabular-nums">
                  {formatarMoeda(resumoMetodos.dinheiro)}
                </span>
              </div>
            </div>

            {/* Resumo Final do Modal de Pagamentos */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-1.5 text-xs">
              <div className="flex justify-between items-center text-slate-500">
                <span>Ticket médio por venda</span>
                <span className="font-medium text-slate-700 tabular-nums">
                  {formatarMoeda(
                    vendasValidas.length > 0 ? faturamentoTotal / vendasValidas.length : 0
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="font-medium text-slate-800">Total recebido no período</span>
                <span className="text-base font-semibold text-emerald-700 tabular-nums">
                  {formatarMoeda(faturamentoTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DA META */}
      {modalMetaAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalMetaAberto(false)} />

          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl border border-slate-100 relative z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 p-5 pb-7 sm:pb-5">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <LucideIcons.Target size={17} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Meta de Vendas</h3>
                  <p className="text-[11px] text-slate-400">Acompanhamento do período</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMetaAberto(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
              >
                <LucideIcons.X size={15} />
              </button>
            </div>

            {!metaAtiva ? (
              <div className="py-8 flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                  <LucideIcons.Target size={22} strokeWidth={1.6} />
                </div>
                <p className="text-sm font-medium text-slate-700">Nenhuma meta ativa</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Quando a administração definir uma meta para o período, seu progresso aparecerá
                  aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-700">Progresso atual</p>
                    <p className="text-[11px] text-slate-400">
                      {formatarDataBR(metaAtiva.dataInicio)} até{' '}
                      {formatarDataBR(metaAtiva.dataFim)}
                    </p>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                    {porcentagemMeta.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      metaBatida ? 'bg-emerald-600' : 'bg-emerald-800'
                    }`}
                    style={{ width: `${porcentagemMeta}%` }}
                  />
                </div>

                <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Meta estipulada</span>
                    <span className="font-medium text-slate-800 tabular-nums">
                      {formatarMoeda(valorAlvoMeta)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Já faturado</span>
                    <span className="font-medium text-slate-800 tabular-nums">
                      {formatarMoeda(faturamentoDaMeta)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                    <span className="text-slate-500">Restante</span>
                    <span
                      className={`font-medium tabular-nums ${
                        metaBatida ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {metaBatida
                        ? 'Meta concluída! 🎉'
                        : formatarMoeda(valorAlvoMeta - faturamentoDaMeta)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: VALES & REPASSES */}
      {modalRecebimentosAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalRecebimentosAberto(false)} />

          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[88vh] shadow-2xl border border-slate-100 relative z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="p-5 pb-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <LucideIcons.HandCoins size={17} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Vales e Recebimentos</h3>
                  <p className="text-[11px] text-slate-400">Extrato de repasses e adiantamentos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalRecebimentosAberto(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
              >
                <LucideIcons.X size={15} />
              </button>
            </div>

            {/* Filtro de Data do Modal */}
            <div className="px-5 py-3 bg-slate-50/70 border-b border-slate-100 shrink-0">
              <div className="bg-white rounded-full border border-slate-200/80 flex items-center justify-center gap-2 px-3 h-9">
                <LucideIcons.Calendar size={14} className="text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={modalDataInicio}
                  onChange={(e) => setModalDataInicio(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-normal outline-none w-28 text-center cursor-pointer"
                />
                <span className="text-slate-400 text-[10px]">até</span>
                <input
                  type="date"
                  value={modalDataFim}
                  onChange={(e) => setModalDataFim(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-normal outline-none w-28 text-center cursor-pointer"
                />
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {recebimentosReal.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-3 text-slate-400">
                    <LucideIcons.Wallet size={20} strokeWidth={1.6} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Nenhum lançamento no período
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Altere as datas acima para consultar outros períodos.
                  </p>
                </div>
              ) : (
                <>
                  {recebimentosAgendados.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-2 px-1">
                        Agendados (a receber)
                      </p>
                      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/60 divide-y divide-slate-200/50">
                        {recebimentosAgendados.map((recebimento) => (
                          <div
                            key={recebimento.id}
                            className="flex justify-between items-center px-3.5 py-2.5"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {recebimento.descricao}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {recebimento.categoria} • {formatarDataBR(recebimento.data)}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-amber-600 tabular-nums shrink-0">
                              {formatarMoeda(recebimento.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recebimentosPagos.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-slate-400 mb-2 px-1">
                        Recebimentos concluídos
                      </p>
                      <div className="bg-slate-50/80 rounded-2xl border border-slate-200/60 divide-y divide-slate-200/50">
                        {recebimentosPagos.map((recebimento) => (
                          <div
                            key={recebimento.id}
                            className="flex justify-between items-center px-3.5 py-2.5"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {recebimento.descricao}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {recebimento.categoria} • {formatarDataBR(recebimento.data)}
                              </p>
                            </div>
                            <span className="text-xs font-medium text-emerald-600 tabular-nums shrink-0">
                              {formatarMoeda(recebimento.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-5 pt-3.5 bg-slate-50/70 border-t border-slate-100 shrink-0 space-y-1.5">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Total recebido</span>
                <span className="font-medium text-slate-800 tabular-nums">
                  {formatarMoeda(totalModalPago)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/60">
                <span className="text-xs font-medium text-slate-700">A receber</span>
                <span className="text-base font-semibold text-amber-600 tabular-nums">
                  {formatarMoeda(totalModalAgendado)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUPOM DE COMPROVANTE DO ESTABELECIMENTO (PADRÃO ENTREGA AO CLIENTE) */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
          <div className="absolute inset-0" onClick={() => setVendaSelecionada(null)} />

          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm max-h-[92vh] shadow-2xl border border-slate-200/80 relative z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col overflow-hidden">
            {/* Barra superior do Modal */}
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <LucideIcons.ReceiptText size={17} className="text-emerald-700" strokeWidth={1.8} />
                <span className="text-sm font-medium text-slate-900">
                  Cupom de Consumo
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleImprimirCupomVenda(vendaSelecionada)}
                  className="h-8 px-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Imprimir Cupom"
                >
                  <LucideIcons.Printer size={13} strokeWidth={1.9} />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVendaSelecionada(null)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors cursor-pointer"
                >
                  <LucideIcons.X size={15} />
                </button>
              </div>
            </div>

            {/* CORPO DO CUPOM ESTILO RECIBO COMERCIAL DE ESTABELECIMENTO */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-slate-100/70">
              <div className="bg-stone-50 border border-slate-200/90 rounded-2xl p-4 shadow-xs font-mono text-xs text-slate-800 space-y-3">
                {/* Cabeçalho do Estabelecimento */}
                <div className="text-center space-y-0.5 pb-2.5 border-b border-dashed border-slate-300">
                  <p className="text-sm font-bold tracking-wide text-slate-900 uppercase font-sans">
                    {dadosEmpresa?.nome_exibicao ||
                      dadosEmpresa?.nome_fantasia ||
                      NOME_PADRAO_SISTEMA}
                  </p>
                  {dadosEmpresa?.documento && (
                    <p className="text-[11px] text-slate-500">CNPJ/CPF: {dadosEmpresa.documento}</p>
                  )}
                  {dadosEmpresa?.telefone && (
                    <p className="text-[11px] text-slate-500">Tel: {dadosEmpresa.telefone}</p>
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 pt-1 font-sans">
                    Comprovante de Consumo
                  </p>
                </div>

                {/* Alerta caso a venda tenha sido cancelada */}
                {vendaSelecionada.status === 'cancelada' && (
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 font-sans">
                    <p className="text-rose-700 font-semibold flex items-center gap-1.5 text-xs">
                      <LucideIcons.Ban size={13} /> Venda Cancelada / Estornada
                    </p>
                    <p className="text-rose-600 text-[11px] mt-0.5">
                      Por: {vendaSelecionada.canceladoPor} • Motivo:{' '}
                      {vendaSelecionada.motivoCancelamento}
                    </p>
                  </div>
                )}

                {/* Identificação da Mesa, Cliente e Atendimento */}
                <div className="space-y-1 text-[11px] pb-2.5 border-b border-dashed border-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">MESA / GUARDA-SOL:</span>
                    <span className="font-bold text-slate-900">
                      #{String(vendaSelecionada.numeroMesa).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">CLIENTE:</span>
                    <span className="font-medium text-slate-800 truncate max-w-44">
                      {(vendaSelecionada.nomeCliente || 'Consumidor').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ATENDENTE:</span>
                    <span className="text-slate-800 truncate max-w-44">
                      {(vendaSelecionada.garcomNome || 'Equipe').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DATA / HORA:</span>
                    <span className="text-slate-800">
                      {formatarDataBR(vendaSelecionada.dataFechamento)} às{' '}
                      {formatarHora(vendaSelecionada.dataFechamento)}
                    </span>
                  </div>
                </div>

                {/* Cabeçalho da Tabela de Itens */}
                <div className="space-y-2 pb-2.5 border-b border-dashed border-slate-300">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 border-b border-dotted border-slate-200 pb-1">
                    <span>ITEM / QTD x UNIT.</span>
                    <span>SUBTOTAL</span>
                  </div>

                  {vendaSelecionada.itens.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex justify-between items-end text-[11px] ${
                        vendaSelecionada.status === 'cancelada' ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-semibold text-slate-900 truncate">
                          {String(idx + 1).padStart(2, '0')}. {item.produto.nome.toUpperCase()}
                        </p>
                        <p className="text-[10px] text-slate-500 tabular-nums">
                          {item.quantidade} UN x {formatarMoeda(item.produto.preco)}
                        </p>
                      </div>
                      <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                        {formatarMoeda(item.produto.preco * item.quantidade)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totais e Pagamentos */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between text-slate-500">
                    <span>Qtd. Total de Itens:</span>
                    <span>
                      {vendaSelecionada.itens.reduce((acc, i) => acc + i.quantidade, 0)} un.
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-200 font-sans">
                    <span>TOTAL DA CONTA</span>
                    <span className="tabular-nums">{formatarMoeda(vendaSelecionada.total)}</span>
                  </div>
                </div>

                {/* Formas de Pagamento registradas na comanda */}
                {vendaSelecionada.pagamentos && vendaSelecionada.pagamentos.length > 0 && (
                  <div className="pt-2.5 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">
                      Pagamentos Recebidos:
                    </p>
                    {vendaSelecionada.pagamentos.map((pag, i) => (
                      <div key={i} className="flex justify-between text-slate-700">
                        <span>{pag.metodo.toUpperCase()}</span>
                        <span className="font-semibold tabular-nums">
                          {formatarMoeda(pag.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rodapé do Cupom */}
                <div className="pt-2.5 border-t border-dashed border-slate-300 text-center space-y-0.5 text-[10px] text-slate-400 font-sans">
                  <p className="text-slate-600 font-medium">
                    Obrigado pela preferência! Volte sempre.
                  </p>
                  <p>Sem valor fiscal • T-System Beach POS</p>
                </div>
              </div>
            </div>

            {/* Botão Principal de Impressão no Rodapé do Modal */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => handleImprimirCupomVenda(vendaSelecionada)}
                className="w-full h-11 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
              >
                <LucideIcons.Printer size={16} strokeWidth={1.9} />
                <span>Imprimir Cupom para o Cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
