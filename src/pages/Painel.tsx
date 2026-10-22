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
  
  const primeiroDiaDoMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [modalDataInicio, setModalDataInicio] = useState(primeiroDiaDoMes);
  const [modalDataFim, setModalDataFim] = useState(dataHoje);

  // META DE VENDAS (SUPABASE)
  const metaAtiva = contexto?.metaAtiva;

  // DADOS (SUPABASE)
  const historico = contexto?.historicoVendas || [];
  const garcomLogado = contexto?.garcomLogado;
  const todosPagamentos = contexto?.historicoPagamentos || [];

  // FILTRAGEM DAS VENDAS PARA O EXTRATO DO PAINEL
  const vendasFiltradas = historico.filter(venda => {
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= dataInicio && dataVenda <= dataFim;
    const privacidadeValida = garcomLogado?.cargo === 'admin' ? true : venda.garcomNome === garcomLogado?.nome;

    const termo = pesquisa.toLowerCase();
    const pesquisaValida = termo === '' || 
      venda.numeroMesa.toString().includes(termo) ||
      (venda.nomeCliente?.toLowerCase() || '').includes(termo) ||
      venda.total.toString().includes(termo);

    return dataValida && privacidadeValida && pesquisaValida;
  });

  const vendasValidas = vendasFiltradas.filter(v => v.status !== 'cancelada');
  const faturamentoTotal = vendasValidas.reduce((total, venda) => total + venda.total, 0);

  // META
  let faturamentoDaMeta = 0;
  
  if (metaAtiva) {
    const vendasDentroDaMeta = historico.filter(venda => {
      if (venda.status === 'cancelada') return false;
      
      const dataVenda = venda.dataFechamento.split('T')[0];
      const dataDentroDoPeriodoMeta = dataVenda >= metaAtiva.dataInicio && dataVenda <= metaAtiva.dataFim;
      const privacidadeValida = garcomLogado?.cargo === 'admin' ? true : venda.garcomNome === garcomLogado?.nome;
      
      return dataDentroDoPeriodoMeta && privacidadeValida;
    });

    faturamentoDaMeta = vendasDentroDaMeta.reduce((acc, v) => acc + v.total, 0);
  }

  const valorAlvoMeta = metaAtiva ? metaAtiva.valorAlvo : 0;
  const porcentagemMeta = valorAlvoMeta > 0 ? Math.min((faturamentoDaMeta / valorAlvoMeta) * 100, 100) : 0;
  const metaBatida = valorAlvoMeta > 0 && faturamentoDaMeta >= valorAlvoMeta;

  // VALES (SUPABASE)
  const recebimentosReal = todosPagamentos.filter((pagamento: PagamentoGarcom) => {
    const pertenceAoUsuario = garcomLogado?.cargo === 'admin' 
      ? true 
      : (pagamento.garcomId === garcomLogado?.id || pagamento.garcomNome === garcomLogado?.nome);

    const dataPagamento = pagamento.data.split('T')[0];
    const dataValida = dataPagamento >= modalDataInicio && dataPagamento <= modalDataFim;

    return pertenceAoUsuario && dataValida;
  });

  const recebimentosPagos = recebimentosReal.filter(r => r.status === 'pago');
  const recebimentosAgendados = recebimentosReal.filter(r => r.status === 'agendado');

  const totalModalPago = recebimentosPagos.reduce((acc, r) => acc + r.valor, 0);
  const totalModalAgendado = recebimentosAgendados.reduce((acc, r) => acc + r.valor, 0);

  // FORMATAÇÕES
  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarHora = (isoString: string) => new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatarDataBR = (isoString: string) => {
    if(!isoString) return '';
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
    return () => { document.body.style.overflow = 'auto'; };
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

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-emerald-200 selection:text-emerald-900 pb-20 md:pb-8">

      <div className="print:hidden">
        <Header />

        {/* ÁREA DE SALDO */}
        <div className="bg-emerald-950 text-white rounded-b-4xl pt-18 md:pt-20 md:pl-18 relative overflow-hidden shadow-xl shadow-emerald-900/20">
          <div className="absolute -right-20 -top-20 w-64 h-80 bg-emerald-500/30 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-emerald-700/30 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 w-full max-w-5xl mx-auto px-4 py-8 md:py-10 flex flex-col items-center">

            <div className="flex items-center gap-2 mb-3 opacity-70 hover:opacity-100 transition-opacity">
              <LucideIcons.TrendingUp size={14} />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-50">Vendas Consolidadas</h2>
            </div>

            <div className="flex items-center justify-center gap-4 mb-5">
              <span className={`text-4xl md:text-5xl font-semibold tracking-tighter ${!mostrarValores ? 'mt-2' : ''}`}>
                {mostrarValores ? formatarMoeda(faturamentoTotal) : 'R$ •••••'}
              </span>
              <button 
                onClick={() => setMostrarValores(!mostrarValores)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md active:scale-90"
              >
                {mostrarValores ? <LucideIcons.EyeOff size={18} /> : <LucideIcons.Eye size={18} />}
              </button>
            </div>

            {/* Pílula de Data */}
            <div className="inline-flex items-center justify-center bg-black/20 border border-white/10 backdrop-blur-md rounded-full px-3 sm:px-4 py-2 shadow-inner w-full max-w-85 sm:max-w-none">
              <LucideIcons.CalendarDays size={14} className="text-emerald-400 mr-2 shrink-0 pointer-events-none hidden sm:block" />
              <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
                <input 
                  type="date" 
                  value={dataInicio} 
                  onChange={(e) => setDataInicio(e.target.value)} 
                  className="appearance-none bg-transparent text-white text-[11px] sm:text-[12px] md:text-[13px] font-medium outline-none cursor-pointer w-30 sm:w-32.25 text-center uppercase shrink-0" 
                />
                <span className="text-emerald-500/80 font-bold text-[9px] uppercase tracking-widest shrink-0 pointer-events-none">Até</span>
                <input 
                  type="date" 
                  value={dataFim} 
                  onChange={(e) => setDataFim(e.target.value)} 
                  className="appearance-none bg-transparent text-white text-[11px] sm:text-[12px] md:text-[13px] font-medium outline-none cursor-pointer w-30 sm:w-32.25 text-center uppercase shrink-0" 
                />
              </div>
            </div>

          </div>
        </div>

        {/* QUICK ACTIONS - DESIGN CIRCULAR MODERNO */}
        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 md:px-8 md:pl-30 -mt-7 mb-8">
          <div className="flex items-center justify-center gap-6 md:gap-10 bg-transparent">

            <button onClick={() => setModalRecebimentosAberto(true)} className="group flex flex-col items-center gap-2 outline-none active:scale-95 transition-all relative">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full shadow-lg shadow-black/5 border border-slate-100 flex items-center justify-center text-emerald-600 group-hover:-translate-y-1 group-hover:shadow-xl transition-all duration-300">
                <LucideIcons.Wallet size={24} strokeWidth={1.5} />
              </div>
              {recebimentosReal.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {recebimentosReal.length}
                </span>
              )}
            </button>

            <button onClick={() => setModalMetaAberto(true)} className="group flex flex-col items-center gap-2 outline-none active:scale-95 transition-all relative">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full shadow-lg shadow-black/5 border border-slate-100 flex items-center justify-center text-blue-600 group-hover:-translate-y-1 group-hover:shadow-xl transition-all duration-300">
                <LucideIcons.Target size={24} strokeWidth={1.5} />
              </div>
              {metaAtiva && (
                <span className="absolute top-0 right-1 w-3 h-3 bg-blue-500 border-2 border-white rounded-full animate-pulse"></span>
              )}
            </button>

          </div>
        </div>

        {/* EXTRATO DE VENDAS */}
        <main className="w-full max-w-5xl mx-auto px-4 md:px-8 md:pl-26 relative z-20">
          <section className="pb-12">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[12px] font-sans uppercase tracking-widest text-slate-500">Extrato de Vendas</h3>

              {/* Pesquisa */}
              <div className="flex items-center justify-end relative h-8">
                <div className={`flex items-center transition-all duration-300 ease-out origin-right overflow-hidden ${mostrarPesquisa ? 'w-48 md:w-64 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
                  <input
                    ref={inputPesquisaRef}
                    type="text"
                    placeholder="Mesa, Cliente ou Valor..."
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-full h-8 pl-3 pr-8 text-[12px] outline-none focus:border-emerald-600 shadow-sm transition-colors"
                  />
                  {pesquisa && (
                    <button onClick={() => setPesquisa('')} className="absolute right-4 text-slate-400 hover:text-slate-600">
                      <LucideIcons.X size={14} />
                    </button>
                  )}
                </div>

                <button 
                  onClick={alternarPesquisa} 
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${mostrarPesquisa ? 'bg-slate-100 text-slate-800' : 'bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  title="Pesquisar venda"
                >
                  <LucideIcons.Search size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden shadow-sm">
              {vendasFiltradas.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <LucideIcons.Inbox size={32} strokeWidth={1.5} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-sans text-[12px] uppercase tracking-wide">
                    {pesquisa ? 'Nenhuma venda encontrada para a pesquisa.' : 'Nenhuma movimentação neste período.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                  {vendasFiltradas.map((venda) => {
                    const isCancelada = venda.status === 'cancelada';
                    return (
                      <button 
                        key={venda.id}
                        onClick={() => setVendaSelecionada(venda)}
                        className="w-full flex justify-between items-center p-4 md:p-5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isCancelada 
                              ? 'bg-rose-50 text-rose-500' 
                              : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {isCancelada ? <LucideIcons.ArrowDownRight size={20} /> : <LucideIcons.ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <p className={`font-semibold uppercase tracking-wide text-[13px] md:text-[14px] leading-tight ${isCancelada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {venda.nomeCliente || 'CLIENTE BALCÃO'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold text-slate-500 mt-1 uppercase">
                              <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">MESA {venda.numeroMesa}</span>
                              <span className="opacity-50">•</span>
                              <span>{formatarDataBR(venda.dataFechamento)} {formatarHora(venda.dataFechamento)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <p className={`font-semibold text-[15px] md:text-[16px] tabular-nums tracking-tight ${isCancelada ? 'text-slate-300 line-through' : 'text-emerald-600'}`}>
                            {mostrarValores ? formatarMoeda(venda.total) : 'R$ •••••'}
                          </p> 
                          {isCancelada && <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-1">CANCELADA</span>}
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalMetaAberto(false)}></div>

          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="p-5 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-[12px] font-bold uppercase tracking-widest text-slate-900">ACOMPANHAMENTO DE META</h3>
              <button onClick={() => setModalMetaAberto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <LucideIcons.X size={15} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-5">
              {!metaAtiva ? (
                 <div className="text-center py-8 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <LucideIcons.Target size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                        <p className="text-[12px] font-semibold text-slate-700">Nenhuma meta ativa</p>
                    </div>
                 </div>
              ) : (
                <>
                  <div className="flex justify-between items-end mb-3">
                    <div className="flex flex-col">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">PROGRESSO ATUAL</p>
                      <p className="text-[9px] font-medium text-slate-400 mt-0.5 uppercase tracking-widest">
                        {formatarDataBR(metaAtiva.dataInicio).slice(0,5)} a {formatarDataBR(metaAtiva.dataFim).slice(0,5)}
                      </p>
                    </div>
                    <p className="text-2xl font-bold tracking-tighter text-blue-600">{porcentagemMeta.toFixed(1)}%</p>
                  </div>

                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        metaBatida ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${porcentagemMeta}%` }}
                    ></div>
                  </div>

                  <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">META ESTIPULADA</span>
                      <span className="font-bold text-[13px] text-slate-800">{formatarMoeda(valorAlvoMeta)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">JÁ FATURADO</span>
                      <span className="font-bold text-[13px] text-slate-800">{formatarMoeda(faturamentoDaMeta)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">FALTA P/ ATINGIR</span>
                      <span className={`font-bold text-[13px] ${metaBatida ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {metaBatida ? 'META BATIDA! 🎉' : formatarMoeda(valorAlvoMeta - faturamentoDaMeta)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CARTEIRA & REPASSES */}
      {modalRecebimentosAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-7 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalRecebimentosAberto(false)}></div>

          <div className="bg-slate-50 rounded-3xl w-full max-w-md max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">

            <div className="flex justify-between items-center p-4 bg-white border-b border-slate-100 shrink-0">
              <h3 className="text-[13px] font-medium uppercase tracking-widest text-slate-900">CARTEIRA & REPASSES</h3>
              <button onClick={() => setModalRecebimentosAberto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <LucideIcons.X size={15} strokeWidth={2.5} />
              </button>
            </div>

            {/* Pílula de Data no Modal */}
            <div className="p-3 bg-white border-b border-slate-100 shrink-0 shadow-sm z-10">
              <div className="bg-slate-100 rounded-full border border-slate-200 flex items-center justify-between px-3 py-2">
                <LucideIcons.CalendarDays size={14} className="text-slate-400 shrink-0 pointer-events-none hidden sm:block" />
                <div className="flex-1 flex items-center justify-center gap-1 sm:gap-2">
                  <input 
                    type="date" 
                    value={modalDataInicio} 
                    onChange={(e) => setModalDataInicio(e.target.value)} 
                    className="appearance-none bg-transparent w-30 sm:w-32.5 text-slate-700 text-[11px] font-medium outline-none text-center uppercase shrink-0" 
                  />
                  <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest shrink-0 pointer-events-none">ATÉ</span>
                  <input 
                    type="date" 
                    value={modalDataFim} 
                    onChange={(e) => setModalDataFim(e.target.value)} 
                    className="appearance-none bg-transparent w-30 sm:w-32.5 text-slate-700 text-[11px] font-medium outline-none text-center uppercase shrink-0" 
                  />
                </div>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 hide-scrollbar bg-slate-100">
              {recebimentosReal.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-200/50 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <LucideIcons.Wallet size={30} />
                  </div>
                  <p className="text-slate-500 font-medium text-[13px] uppercase">NENHUM LANÇAMENTO NO PERÍODO.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {recebimentosAgendados.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-sans uppercase tracking-widest text-slate-500 mb-3 px-1">AGENDADOS (A RECEBER)</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-50">
                        {recebimentosAgendados.map((recebimento) => (
                          <div key={recebimento.id} className="flex justify-between items-center p-3">
                            <div className="flex flex-col">
                              <span className="font-sans text-slate-500 text-[12px] font-medium uppercase tracking-wide leading-tight">{recebimento.descricao}</span>
                              <span className="text-[9px] font-sans text-slate-400 mt-1 uppercase">{recebimento.categoria} • {formatarDataBR(recebimento.data)}</span>
                            </div>
                            <span className="font-medium tracking-tight text-yellow-600 text-[12px] tabular-nums">{formatarMoeda(recebimento.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recebimentosPagos.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-sans uppercase tracking-widest text-slate-400 mb-3 px-1">EXTRATO DE RECEBIMENTOS</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-50">
                        {recebimentosPagos.map((recebimento) => (
                          <div key={recebimento.id} className="flex justify-between items-center p-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-500 text-[12px] uppercase tracking-wide leading-tight">{recebimento.descricao}</span>
                              <span className="text-[10px] font-sans text-slate-500 mt-1 uppercase">{recebimento.categoria} • {formatarDataBR(recebimento.data)}</span>
                            </div>
                            <span className="font-medium text-emerald-700 text-[12px] tabular-nums">{formatarMoeda(recebimento.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white p-6 shrink-0 border-t border-slate-200 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-10">
              <div className="flex justify-between items-center mb-3 text-[12px] text-slate-500">
                <span className="font-medium uppercase tracking-wide">TOTAL RECEBIDO</span>
                <span className="font-medium tabular-nums">{formatarMoeda(totalModalPago)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-slate-900">
                <span className="font-medium text-[13px] uppercase tracking-widest">A RECEBER</span>
                <span className="text-xl font-medium tabular-nums tracking-tighter text-yellow-600">{formatarMoeda(totalModalAgendado)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPROVANTE DE VENDA */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans print:absolute print:inset-0 print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="absolute inset-0 print:hidden" onClick={() => setVendaSelecionada(null)}></div>

          <div className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden print:rounded-none print:shadow-none print:max-w-full print:h-auto print:border-0">

            <div className="flex justify-between items-center p-6 bg-slate-900 text-white shrink-0 print:bg-white print:text-black print:border-b print:border-dashed print:border-slate-300 print:p-4">
              <div>
                <h3 className="text-[14px] font-bold uppercase tracking-widest">COMPROVANTE</h3>
                <p className="text-[10px] font-medium text-slate-400 print:text-slate-600 mt-1 uppercase tracking-wider">{formatarDataBR(vendaSelecionada.dataFechamento)} • {formatarHora(vendaSelecionada.dataFechamento)}</p>
              </div>

              <div className="flex items-center gap-2 print:hidden">
                <button onClick={handleImprimir} className="w-9 h-9 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors" title="Imprimir Recibo">
                  <LucideIcons.Printer size={18} strokeWidth={2} />
                </button>
                <button onClick={() => setVendaSelecionada(null)} className="w-9 h-9 flex items-center justify-center bg-white/10 rounded-full text-slate-300 hover:bg-white/20 hover:text-white transition-colors">
                  <LucideIcons.X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 hide-scrollbar relative print:p-4 print:overflow-visible">

              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 p-4 rounded-xl mb-6 border border-rose-100 relative z-10 print:bg-transparent print:border-dashed print:border-black">
                  <h4 className="text-rose-700 print:text-black font-semibold uppercase tracking-widest flex items-center gap-2 mb-2 text-[11px]">
                    <LucideIcons.Ban size={16} strokeWidth={2.5} /> VENDA CANCELADA
                  </h4>
                  <p className="text-rose-600/90 print:text-black text-[10px] font-medium uppercase">RESPONSÁVEL: {vendaSelecionada.canceladoPor}</p>
                  <p className="text-rose-600/90 print:text-black text-[10px] font-medium uppercase mt-1">MOTIVO: {vendaSelecionada.motivoCancelamento}</p>
                </div>
              )}

              <div className="bg-slate-50 print:bg-transparent rounded-xl border border-slate-200 print:border-none p-4 mb-6 flex gap-4 relative z-10">
                <div className="flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 print:text-slate-600 mb-1">MESA</p>
                  <p className="font-semibold text-slate-900 text-[14px]">{vendaSelecionada.numeroMesa}</p>
                </div>
                <div className="w-px bg-slate-200 print:hidden"></div>
                <div className="flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 print:text-slate-600 mb-1">CLIENTE</p>
                  <p className="font-semibold uppercase text-slate-900 text-[12px] truncate">{vendaSelecionada.nomeCliente || 'NÃO IDENTIFICADO'}</p>
                </div>
              </div>

              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 print:text-slate-600 mb-4 border-b border-dashed border-slate-200 print:border-slate-400 pb-2 relative z-10">CONSUMO</h4>
              <div className="space-y-4 relative z-10">
                {vendaSelecionada.itens.map((item) => (
                  <div key={item.id} className={`flex justify-between items-start ${vendaSelecionada.status === 'cancelada' ? 'opacity-50 line-through' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span className="font-semibold text-slate-600 print:text-black bg-slate-100 print:bg-transparent px-1.5 py-0.5 rounded text-[11px] mt-0.5">{item.quantidade}X</span>
                      <div>
                        <p className="font-medium uppercase text-slate-900 text-[12px] leading-tight">{item.produto.nome}</p>
                        <p className="text-[10px] font-medium text-slate-500 print:text-slate-600 mt-1 uppercase">{formatarMoeda(item.produto.preco)} UN.</p>
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900 tabular-nums text-[13px]">{formatarMoeda(item.produto.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 print:bg-transparent p-6 print:p-4 border-t border-dashed border-slate-300 print:border-black shrink-0 pb-safe z-10">
              <div className="flex justify-between items-center">
                <span className="font-semibold uppercase tracking-widest text-slate-500 print:text-black text-[12px]">TOTAL FINAL</span>
                <span className={`text-2xl font-bold tabular-nums tracking-tighter ${vendaSelecionada.status === 'cancelada' ? 'text-slate-400 print:text-slate-500 line-through' : 'text-slate-900'}`}>
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