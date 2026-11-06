// src/pages/Painel.tsx
import { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import type { VendaFechada, PagamentoGarcom } from '../types';
import * as LucideIcons from 'lucide-react';

export function Painel() {
  const contexto = useContext(AppContext);

  // ESTADOS
  const dataHoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFechada | null>(null);
  const [mostrarValores, setMostrarValores] = useState(true);

  // ESTADOS DA PESQUISA
  const [pesquisa, setPesquisa] = useState('');
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const inputPesquisaRef = useRef<HTMLInputElement>(null);

  // ESTADOS MODAIS
  const [modalRecebimentosAberto, setModalRecebimentosAberto] = useState(false);
  const [modalMetaAberto, setModalMetaAberto] = useState(false);

  const primeiroDiaDoMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const [modalDataInicio, setModalDataInicio] = useState(primeiroDiaDoMes);
  const [modalDataFim, setModalDataFim] = useState(dataHoje);

  // META DE VENDAS (SUPABASE)
  const metaAtiva = contexto?.metaAtiva;

  // DADOS (SUPABASE)
  const historico = contexto?.historicoVendas || [];
  const garcomLogado = contexto?.garcomLogado;
  const todosPagamentos = contexto?.historicoPagamentos || [];

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

  // META
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

  // VALES (SUPABASE)
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

  // EFEITOS
  useEffect(() => {
    if (vendaSelecionada || modalRecebimentosAberto || modalMetaAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [vendaSelecionada, modalRecebimentosAberto, modalMetaAberto]);

  useEffect(() => {
    if (mostrarPesquisa && inputPesquisaRef.current) {
      inputPesquisaRef.current.focus();
    }
  }, [mostrarPesquisa]);

  const handleImprimir = () => {
    window.print();
  };

  const alternarPesquisa = () => {
    setMostrarPesquisa(!mostrarPesquisa);
    if (mostrarPesquisa) setPesquisa('');
  };

  const filtroEhHoje = dataInicio === dataHoje && dataFim === dataHoje;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col relative antialiased text-slate-800 pb-24 md:pb-12">
      <div className="print:hidden">
        <Header />

        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 pt-22 md:pt-24 md:pl-24">
          {/* CABEÇALHO E FILTRO DE PERÍODO */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight">
                Caixa
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Acompanhe suas vendas concluídas, vales e meta do período
              </p>
            </div>

            {/* Pílula Minimalista de Data */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {!filtroEhHoje && (
                <button
                  type="button"
                  onClick={() => {
                    setDataInicio(dataHoje);
                    setDataFim(dataHoje);
                  }}
                  className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200/80 text-[11px] font-medium text-slate-700 transition-colors cursor-pointer shrink-0"
                >
                  Hoje
                </button>
              )}

              <div className="inline-flex items-center bg-slate-100/80 border border-slate-200/70 rounded-full px-3 h-9 gap-1.5">
                <LucideIcons.Calendar size={14} className="text-slate-400 shrink-0 hidden sm:block" />
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-medium outline-none cursor-pointer w-28 text-center"
                />
                <span className="text-slate-400 text-[10px]">até</span>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-medium outline-none cursor-pointer w-28 text-center"
                />
              </div>
            </div>
          </div>

          {/* RESUMO SUPERIOR: SALDO + ATALHOS MINIMALISTAS (VALES E META) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
            {/* CARD PRINCIPAL: VENDAS CONSOLIDADAS */}
            <div className="lg:col-span-6 bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5">
              <div className="bg-white rounded-[1.65rem] border border-slate-200/50 p-5 sm:p-6 flex items-center justify-between gap-4 h-full shadow-2xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <LucideIcons.Wallet size={15} strokeWidth={1.8} className="text-emerald-600" />
                    <span>Vendas concluídas</span>
                    <span className="text-slate-300">•</span>
                    <span>
                      {vendasValidas.length} {vendasValidas.length === 1 ? 'conta' : 'contas'}
                    </span>
                  </div>

                  <p className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight tabular-nums">
                    {mostrarValores ? formatarMoeda(faturamentoTotal) : 'R$ •••••'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setMostrarValores(!mostrarValores)}
                  aria-label={mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}
                  className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shrink-0 cursor-pointer active:scale-95"
                >
                  {mostrarValores ? (
                    <LucideIcons.EyeOff size={17} strokeWidth={1.8} />
                  ) : (
                    <LucideIcons.Eye size={17} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* ATALHOS RÁPIDOS: VALES / RECEBIMENTOS E META */}
            <div className="lg:col-span-6 bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5 space-y-0.5 flex flex-col justify-center">
              {/* Botão Carteira & Repasses */}
              <button
                type="button"
                onClick={() => setModalRecebimentosAberto(true)}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                    <LucideIcons.HandCoins size={17} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-normal text-slate-800 truncate">Vales e Recebimentos</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {totalModalAgendado > 0
                        ? `A receber: ${mostrarValores ? formatarMoeda(totalModalAgendado) : 'R$ •••'}`
                        : 'Carteira, comissões e repasses'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {recebimentosReal.length > 0 && (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full tabular-nums">
                      {recebimentosReal.length}
                    </span>
                  )}
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>

              {/* Botão Meta */}
              <button
                type="button"
                onClick={() => setModalMetaAberto(true)}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-700 shrink-0 shadow-2xs">
                    <LucideIcons.Target size={17} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-normal text-slate-800 truncate">Meta de Vendas</p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {metaAtiva
                        ? metaBatida
                          ? 'Meta atingida no período'
                          : `${porcentagemMeta.toFixed(0)}% concluído`
                        : 'Nenhuma meta ativa no momento'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {metaAtiva && (
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border tabular-nums ${
                        metaBatida
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                          : 'bg-slate-100 text-slate-700 border-slate-200/80'
                      }`}
                    >
                      {porcentagemMeta.toFixed(0)}%
                    </span>
                  )}
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>
            </div>
          </div>

          {/* EXTRATO DE VENDAS CONCLUÍDAS */}
          <section>
            <div className="flex items-center justify-between mb-3 px-1 gap-3">
              <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Histórico do período
              </span>

              {/* Pesquisa Minimalista */}
              <div className="flex items-center justify-end relative h-8">
                <div
                  className={`flex items-center transition-all duration-200 ease-out origin-right overflow-hidden ${
                    mostrarPesquisa ? 'w-48 sm:w-64 opacity-100 mr-1.5' : 'w-0 opacity-0'
                  }`}
                >
                  <input
                    ref={inputPesquisaRef}
                    type="text"
                    placeholder="Mesa, cliente ou valor..."
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    className="w-full bg-slate-100/80 border border-slate-200/80 focus:bg-white focus:border-slate-400 rounded-full h-8 pl-3 pr-7 text-xs text-slate-700 outline-none transition-colors"
                  />
                  {pesquisa && (
                    <button
                      type="button"
                      onClick={() => setPesquisa('')}
                      className="absolute right-10 text-slate-400 hover:text-slate-600"
                    >
                      <LucideIcons.X size={13} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={alternarPesquisa}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    mostrarPesquisa
                      ? 'bg-slate-100 text-slate-800'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                  title="Pesquisar venda"
                >
                  <LucideIcons.Search size={15} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5">
              {vendasFiltradas.length === 0 ? (
                <div className="bg-white rounded-[1.65rem] border border-slate-200/50 py-14 px-4 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-3 text-slate-400">
                    <LucideIcons.Receipt size={20} strokeWidth={1.6} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    {pesquisa ? 'Nenhuma venda encontrada' : 'Nenhuma venda neste período'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {pesquisa
                      ? 'Tente buscar por outro número de mesa ou nome de cliente.'
                      : 'As comandas encerradas aparecerão listadas aqui.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {vendasFiltradas.map((venda) => {
                    const isCancelada = venda.status === 'cancelada';
                    const numeroFormatado = String(venda.numeroMesa).padStart(2, '0');
                    const metodos = Array.from(
                      new Set((venda.pagamentos || []).map((p) => p.metodo))
                    ).join(' • ');

                    return (
                      <button
                        key={venda.id}
                        type="button"
                        onClick={() => setVendaSelecionada(venda)}
                        className="group w-full bg-white hover:bg-slate-50/70 rounded-4xl px-4 py-3 border border-slate-200/50 flex items-center justify-between gap-3 text-left transition-all duration-150 cursor-pointer active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-9 h-9 rounded-full text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums ${
                              isCancelada
                                ? 'bg-rose-50 text-rose-500 border border-rose-100'
                                : 'bg-slate-900 text-white'
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
                              Mesa {venda.numeroMesa}
                              {venda.nomeCliente ? ` • ${venda.nomeCliente}` : ''}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {formatarDataBR(venda.dataFechamento)} às{' '}
                              {formatarHora(venda.dataFechamento)}
                              {metodos ? ` • ${metodos}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isCancelada && (
                            <span className="text-[10px] font-medium text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">
                              Cancelada
                            </span>
                          )}
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              isCancelada ? 'text-slate-300 line-through' : 'text-slate-900'
                            }`}
                          >
                            {mostrarValores ? formatarMoeda(venda.total) : 'R$ •••••'}
                          </span>
                          <LucideIcons.ChevronRight
                            size={15}
                            strokeWidth={1.8}
                            className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* MODAL: DETALHES DA META */}
      {modalMetaAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalMetaAberto(false)} />

          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm shadow-2xl border border-slate-100 relative z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 p-5 pb-7 sm:pb-5">
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4 sm:hidden" />

            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-700">
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
                  Quando a administração definir uma meta para o período, seu progresso aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-700">Progresso atual</p>
                    <p className="text-[11px] text-slate-400">
                      {formatarDataBR(metaAtiva.dataInicio)} até {formatarDataBR(metaAtiva.dataFim)}
                    </p>
                  </div>
                  <span className="text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                    {porcentagemMeta.toFixed(1)}%
                  </span>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      metaBatida ? 'bg-emerald-500' : 'bg-slate-900'
                    }`}
                    style={{ width: `${porcentagemMeta}%` }}
                  />
                </div>

                <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Meta estipulada</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {formatarMoeda(valorAlvoMeta)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Já faturado</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {formatarMoeda(faturamentoDaMeta)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                    <span className="text-slate-500">Restante</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        metaBatida ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {metaBatida ? 'Meta concluída! 🎉' : formatarMoeda(valorAlvoMeta - faturamentoDaMeta)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CARTEIRA & REPASSES */}
      {modalRecebimentosAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalRecebimentosAberto(false)} />

          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[88vh] shadow-2xl border border-slate-100 relative z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="p-5 pb-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-700">
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
                  className="bg-transparent text-slate-700 text-xs font-medium outline-none w-28 text-center cursor-pointer"
                />
                <span className="text-slate-400 text-[10px]">até</span>
                <input
                  type="date"
                  value={modalDataFim}
                  onChange={(e) => setModalDataFim(e.target.value)}
                  className="bg-transparent text-slate-700 text-xs font-medium outline-none w-28 text-center cursor-pointer"
                />
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {recebimentosReal.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-3 text-slate-400">
                    <LucideIcons.Wallet size={20} strokeWidth={1.6} />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Nenhum lançamento no período</p>
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
                            <span className="text-xs font-semibold text-amber-600 tabular-nums shrink-0">
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
                            <span className="text-xs font-semibold text-emerald-600 tabular-nums shrink-0">
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
                <span className="font-semibold text-slate-800 tabular-nums">
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

      {/* MODAL: COMPROVANTE DE VENDA */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:absolute print:inset-0 print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="absolute inset-0 print:hidden" onClick={() => setVendaSelecionada(null)} />

          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm max-h-[90vh] shadow-2xl border border-slate-100 relative z-10 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 flex flex-col overflow-hidden print:rounded-none print:shadow-none print:max-w-full print:h-auto print:border-0">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0 print:border-b print:border-dashed print:border-slate-300 print:p-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-700 print:hidden">
                  <LucideIcons.Receipt size={17} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-900">Comprovante de Venda</h3>
                  <p className="text-[11px] text-slate-400">
                    {formatarDataBR(vendaSelecionada.dataFechamento)} às{' '}
                    {formatarHora(vendaSelecionada.dataFechamento)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 print:hidden">
                <button
                  type="button"
                  onClick={handleImprimir}
                  className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors cursor-pointer"
                  title="Imprimir Recibo"
                >
                  <LucideIcons.Printer size={15} strokeWidth={1.8} />
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

            <div className="p-5 overflow-y-auto flex-1 space-y-4 print:p-4 print:overflow-visible">
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-100 print:bg-transparent print:border-dashed print:border-black">
                  <p className="text-rose-700 print:text-black font-semibold flex items-center gap-1.5 text-xs">
                    <LucideIcons.Ban size={14} /> Venda cancelada
                  </p>
                  <p className="text-rose-600/90 print:text-black text-[11px] mt-1">
                    Responsável: {vendaSelecionada.canceladoPor}
                  </p>
                  <p className="text-rose-600/90 print:text-black text-[11px]">
                    Motivo: {vendaSelecionada.motivoCancelamento}
                  </p>
                </div>
              )}

              <div className="bg-slate-50/80 print:bg-transparent rounded-2xl border border-slate-200/60 print:border-none p-3.5 flex gap-4">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Mesa</p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    Mesa {vendaSelecionada.numeroMesa}
                  </p>
                </div>
                <div className="w-px bg-slate-200/70 print:hidden" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Cliente</p>
                  <p className="text-sm font-medium text-slate-800 truncate mt-0.5">
                    {vendaSelecionada.nomeCliente || 'Não informado'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-medium text-slate-400 mb-2.5 border-b border-slate-100 pb-1.5">
                  Itens consumidos
                </p>
                <div className="space-y-2.5">
                  {vendaSelecionada.itens.map((item) => (
                    <div
                      key={item.id}
                      className={`flex justify-between items-start text-xs ${
                        vendaSelecionada.status === 'cancelada' ? 'opacity-50 line-through' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0 pr-2">
                        <span className="text-slate-500 font-medium tabular-nums shrink-0">
                          {item.quantidade}x
                        </span>
                        <span className="text-slate-800 truncate">{item.produto.nome}</span>
                      </div>
                      <span className="font-medium text-slate-800 tabular-nums shrink-0">
                        {formatarMoeda(item.produto.preco * item.quantidade)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50/80 print:bg-transparent p-5 print:p-4 border-t border-slate-100 print:border-black shrink-0">
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-medium text-slate-500">Total final</span>
                <span
                  className={`text-xl font-bold tabular-nums tracking-tight ${
                    vendaSelecionada.status === 'cancelada'
                      ? 'text-slate-400 line-through'
                      : 'text-slate-900'
                  }`}
                >
                  {formatarMoeda(vendaSelecionada.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
