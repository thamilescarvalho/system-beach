// src/pages/AdminFinanceiro.tsx
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { VendaFechada } from '../types';

export function AdminFinanceiro() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  const adminLogado = contexto?.garcomLogado?.nome || 'Admin';
  
  const dataHoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);

  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFechada | null>(null);
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [modalPagamentosAberto, setModalPagamentosAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const historicoBruto = contexto?.historicoVendas || [];
  const mesas = contexto?.mesas || [];

  const historicoFiltrado = historicoBruto.filter(venda => {
    const dataVenda = venda.dataFechamento.split('T')[0];
    return dataVenda >= dataInicio && dataVenda <= dataFim;
  });

  const vendasValidas = historicoFiltrado.filter(v => v.status !== 'cancelada');
  const faturamentoTotal = vendasValidas.reduce((acc, venda) => acc + venda.total, 0);
  
  const taxaServicoTotal = vendasValidas.reduce((totalTaxa, venda) => {
    const itemServico = venda.itens.find(item => item.id === 'taxa-servico-10');
    if (itemServico) return totalTaxa + (itemServico.produto.preco * itemServico.quantidade);
    return totalTaxa;
  }, 0);
  
  const mesasOcupadas = mesas.filter(m => m.status === 'ocupada');
  const valorEmAberto = mesasOcupadas.reduce((acc, mesa) => {
    return acc + mesa.itens.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0);
  }, 0);

  const resumoPagamentos = vendasValidas.reduce((acc, venda) => {
    if (venda.pagamentos && venda.pagamentos.length > 0) {
      venda.pagamentos.forEach(pag => {
        acc[pag.metodo] = (acc[pag.metodo] || 0) + pag.valor;
      });
    } else {
      acc['Não Especificado'] = (acc['Não Especificado'] || 0) + venda.total;
    }
    return acc;
  }, {} as Record<string, number>);

  const configPagamentos: Record<string, { svg: React.ReactNode, corBg: string, corTexto: string, border: string }> = {
    'PIX': { 
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-8.5 4 8.5 4 8.5-4-8.5-4Z"/><path d="m3 7v10l9 5 9-5V7"/><path d="m3 17 9 5 9-5"/></svg>, 
      corBg: 'bg-teal-50', corTexto: 'text-teal-600', border: 'border-teal-200' 
    },
    'Crédito': { 
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>, 
      corBg: 'bg-indigo-50', corTexto: 'text-indigo-600', border: 'border-indigo-200' 
    },
    'Débito': { 
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/><path d="M7 15h.01"/></svg>, 
      corBg: 'bg-blue-50', corTexto: 'text-blue-600', border: 'border-blue-200' 
    },
    'Dinheiro': { 
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>, 
      corBg: 'bg-emerald-50', corTexto: 'text-emerald-600', border: 'border-emerald-200' 
    },
    'Não Especificado': { 
      svg: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>, 
      corBg: 'bg-slate-50', corTexto: 'text-slate-500', border: 'border-slate-200' 
    }
  };

  const confirmarCancelamento = () => {
    if (vendaSelecionada && motivoCancelamento.length > 3) {
      contexto?.cancelarVenda(vendaSelecionada.id, motivoCancelamento, adminLogado);
      setModalCancelarAberto(false);
      setVendaSelecionada(null);
      setMotivoCancelamento('');
    } else {
      alert('Por favor, informe um motivo válido para o cancelamento.');
    }
  };

  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (isoString: string) => new Date(isoString).toLocaleDateString('pt-BR');
  const formatarHora = (isoString: string) => new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-zinc-200 font-sans pb-24 print:bg-white print:pb-0 relative perspective-[1200px] overflow-hidden">
      
      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse print:hidden" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse print:hidden" style={{ animationDelay: '1s' }} />

      <div className="print:hidden relative z-10">
        
        {/* HEADER  */}
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-sm shadow-slate-200/50 px-4 md:px-8 py-4 flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 active:shadow-inner transition-all hover:bg-slate-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h1 className="text-[20px] font-black text-slate-900 uppercase tracking-widest leading-none drop-shadow-sm">FINANCEIRO</h1>
              <p className="text-teal-600 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Visão Geral</p>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 space-y-6 animate-in zoom-in-95 duration-500 transform-style-3d">
          
          {/* FILTRO DE DATAS */}
          <section className="bg-white/80 backdrop-blur-md px-3 py-2 rounded-full shadow-sm shadow-slate-200/50 border border-white flex items-center gap-2 mx-auto max-w-fit relative z-20">
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent text-slate-700 text-xs font-black px-3 py-1.5 outline-none cursor-pointer hover:text-teal-600 transition-colors" />
            <span className="text-slate-300 font-black text-[9px] uppercase tracking-widest">Até</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent text-slate-700 text-xs font-black px-3 py-1.5 outline-none cursor-pointer hover:text-teal-600 transition-colors" />
          </section>

          {/* GRID DE CARDS */}
          <section className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 pt-2">
            
            {/* CARD 1: SALDO LÍQUIDO */}
            <div className="lg:col-span-7 bg-gradient-to-br from-teal-600 to-teal-800 rounded-[36px] p-7 sm:p-8 shadow-xl shadow-teal-700/30 border border-teal-700 border-t-teal-500/50 relative overflow-hidden flex flex-col justify-between min-h-[200px] transform-style-3d">
              {/* O famoso Efeito Bola Escura (Aprimorado) */}
              <div className="absolute top-[-20%] right-[-10%] w-48 h-48 sm:w-64 sm:h-64 bg-teal-950/40 rounded-full blur-[60px] sm:blur-[60px] pointer-events-none transition-all"></div>
              
              <div className="relative z-10">
                <p className="text-teal-100 text-[11px] font-black uppercase tracking-[0.2em] mb-1 drop-shadow-sm">Saldo Líquido</p>
                <h2 className="text-[40px] sm:text-[48px] font-black text-white tracking-tighter tabular-nums drop-shadow-md leading-none">
                  {formatarMoeda(faturamentoTotal - taxaServicoTotal)}
                </h2>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/10 relative z-10">
                <p className="text-[10px] text-teal-200 font-black uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Livre dos 10%
                </p>
                <button 
                  onClick={() => setModalPagamentosAberto(true)} 
                  className="bg-white/10 backdrop-blur-md hover:bg-white/20 active:scale-95 active:shadow-inner transition-all text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full flex items-center gap-2 border border-white/20 shadow-sm shadow-black/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
                  Ver Receitas
                </button>
              </div>
            </div>

            {/* SUB-GRID: */}
            <div className="grid grid-cols-2 lg:col-span-5 gap-7 sm:gap-6">
              
              {/* CARD: TAXA 10% */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-5 sm:p-7 shadow-sm shadow-slate-200/50 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all group transform-style-3d">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-tight">Taxa 10%</h3>
                  <span className="w-8 h-8 rounded-[12px] bg-indigo-50 border border-indigo-100 text-indigo-500 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                </div>
                <div>
                  <p className="text-2xl sm:text-[28px] font-bold text-slate-800 tracking-tighter tabular-nums leading-none mb-10">{formatarMoeda(taxaServicoTotal)}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Repasse Garçons</p>
                </div>
              </div>

              {/* CARD: EM ABERTO */}
              <div className="bg-white border border-slate-200 rounded-[32px] p-5 sm:p-7 shadow-sm shadow-slate-200/50 flex flex-col justify-between hover:shadow-md hover:-translate-y-1 transition-all group transform-style-3d">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] leading-tight flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50"></span> Em Aberto
                  </h3>
                  <span className="w-8 h-8 rounded-[12px] bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </span>
                </div>
                <div>
                  <p className="text-2xl sm:text-[28px] font-bold text-slate-800 tracking-tighter tabular-nums leading-none mb-10">{formatarMoeda(valorEmAberto)}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{mesasOcupadas.length} Mesas no salão</p>
                </div>
              </div>

            </div>
          </section>

          {/* EXTRATO DE COMANDAS */}
          <section className="pt-6 pb-12">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-[12px] font-bold text-slate-500 tracking-[0.2em] uppercase">Extrato de Comandas</h2>
              <span className="bg-white border border-slate-200 shadow-sm shadow-slate-200/50 px-3 py-1.5 rounded-full text-slate-500 text-[9px] font-black uppercase tracking-widest">{historicoFiltrado.length} Registros</span>
            </div>

            <div className="bg-white/80 backdrop-blur-md rounded-[36px] shadow-lg shadow-slate-200/40 border border-white overflow-hidden">
              {historicoFiltrado.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">Nenhum registro encontrado.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historicoFiltrado.map((venda) => {
                    const isCancelada = venda.status === 'cancelada';
                    return (
                      <button 
                        key={venda.id}
                        onClick={() => setVendaSelecionada(venda)}
                        className={`w-full p-5 flex justify-between items-center transition-all text-left hover:bg-slate-50 active:scale-[0.99]
                          ${isCancelada ? 'bg-slate-50/50 opacity-70 grayscale saturate-50' : 'bg-transparent'}
                        `}
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center border shadow-inner shrink-0 transition-transform hover:scale-105
                            ${isCancelada ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 text-slate-500'}
                          `}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/><path d="M12 3v6"/></svg>
                          </div>
                          <div className="min-w-0 pr-4">
                            <p className={`font-black text-[15px] truncate leading-tight uppercase tracking-tight ${isCancelada ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                              Mesa: {venda.numeroMesa} <span className="opacity-40 font-normal mx-1">|</span> {venda.nomeCliente || 'S/ nome'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest tabular-nums bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                {formatarData(venda.dataFechamento).slice(0,5)} às {formatarHora(venda.dataFechamento)}
                              </span>
                              {isCancelada && (
                                <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-500 px-2 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">
                                  Estornada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3 pl-2">
                          <p className={`font-black text-lg tabular-nums ${isCancelada ? 'text-slate-400' : 'text-teal-600'}`}>
                            {formatarMoeda(venda.total)}
                          </p>
                          <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center shadow-sm hidden sm:flex">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                          </div>
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

      {/* MODAL: DETALHES DA VENDA */}
      {vendaSelecionada && !modalCancelarAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="absolute inset-0" onClick={() => setVendaSelecionada(null)}></div>
          
          <div className="bg-white rounded-[40px] w-full max-w-sm max-h-[90vh] shadow-2xl shadow-slate-900/50 border border-white/20 relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 border-b border-emerald-700/50">
              <div>
                <h3 className="text-[20px] font-black text-white uppercase tracking-widest drop-shadow-sm leading-none">Mesa: {vendaSelecionada.numeroMesa}</h3>
                <p className="text-[10px] font-bold text-emerald-100 mt-1 uppercase tracking-widest tabular-nums">{formatarData(vendaSelecionada.dataFechamento)} às {formatarHora(vendaSelecionada.dataFechamento)}</p>
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white active:scale-95 shadow-inner hover:bg-white/20 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 scrollbar-hide bg-slate-50/50">
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 border border-rose-200 p-5 rounded-[24px] mb-6 shadow-inner shadow-rose-100/50">
                  <h4 className="text-rose-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    Comprovante Cancelado
                  </h4>
                  <div className="text-[11px] text-rose-800/80 font-bold space-y-2">
                    <p className="uppercase tracking-wide">Cancelado por: <span className="font-bold text-rose-700">{vendaSelecionada.canceladoPor}</span></p>
                    <p className="bg-white/60 p-3 rounded-[16px] border border-rose-100 mt-2 shadow-sm text-rose-900 leading-relaxed">Motivo: {vendaSelecionada.motivoCancelamento}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 mb-6 bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm shadow-slate-200/50">
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                  <p className={`font-bold text-[13px] text-slate-800 uppercase leading-tight ${vendaSelecionada.status === 'cancelada' ? 'line-through opacity-60' : ''}`}>{vendaSelecionada.nomeCliente || 'Não identificado'}</p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Atendente</p>
                  <p className="font-bold text-[13px] text-slate-800 uppercase leading-tight">{vendaSelecionada.garcomNome}</p>
                </div>
              </div>
              
              <div className="space-y-4 mb-6 bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm shadow-slate-200/50">
                {vendaSelecionada.itens.map(item => (
                  <div key={item.id} className={`flex justify-between items-center pb-4 border-b border-slate-100 border-dashed last:border-0 last:pb-0 ${vendaSelecionada.status === 'cancelada' ? 'line-through opacity-60' : ''}`}>
                    <div className="flex gap-3 items-center min-w-0 pr-2">
                      <span className="font-bold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-[10px] text-[11px] border border-slate-200 tabular-nums shrink-0 shadow-inner">{item.quantidade}x</span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-[13px] leading-tight uppercase truncate">{item.produto.nome}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tabular-nums mt-0.5">{formatarMoeda(item.produto.preco)} un.</p>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900 text-[14px] tabular-nums shrink-0">
                      {formatarMoeda(item.produto.preco * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-100/50 rounded-[24px] p-5 border border-slate-200 shadow-inner shadow-slate-200/50">
                <p className="text-[10px] font-bold text-teal-700 uppercase tracking-[0.2em] mb-4 text-center">Resumo do Pagamento</p>
                {vendaSelecionada.pagamentos && vendaSelecionada.pagamentos.length > 0 ? (
                  <div className="space-y-2.5">
                    {vendaSelecionada.pagamentos.map((pag, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="font-bold text-slate-600 text-[10px] uppercase tracking-widest bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">{pag.metodo}</span>
                        <span className="font-bold text-slate-900 text-[14px] tabular-nums">{formatarMoeda(pag.valor)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-widest">Não especificado</p>
                )}
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200 flex flex-col gap-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">Total Final</span>
                <span className={`text-[32px] font-black tracking-tighter tabular-nums leading-none ${vendaSelecionada.status === 'cancelada' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {formatarMoeda(vendaSelecionada.total)}
                </span>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-900 border-t-slate-700/50 hover:shadow-xl active:scale-[0.98] active:shadow-inner text-white font-black py-4 rounded-[20px] transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-slate-900/30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                  Imprimir
                </button>

                {vendaSelecionada.status !== 'cancelada' && (
                  <button 
                    onClick={() => setModalCancelarAberto(true)}
                    className="flex-1 bg-white text-rose-500 hover:bg-rose-50 font-black py-4 rounded-[20px] border border-rose-200 active:scale-95 active:shadow-inner transition-all uppercase tracking-widest text-[10px] shadow-sm shadow-slate-200/50"
                  >
                    Estornar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RECEITAS POR FORMA DE PAGAMENTO */}
      {modalPagamentosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="absolute inset-0" onClick={() => setModalPagamentosAberto(false)}></div>
          
          <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl shadow-slate-900/50 relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden border border-white/20">
            <div className="flex items-center justify-between p-6 border-b border-teal-800/50 bg-gradient-to-r from-teal-700 to-teal-800">
              <div>
                <h3 className="text-[18px] font-black text-white tracking-widest uppercase leading-none drop-shadow-sm">Entradas de Caixa</h3>
                <p className="text-[9px] font-bold text-teal-200 mt-1.5 uppercase tracking-widest">Do período selecionado</p>
              </div>
              <button onClick={() => setModalPagamentosAberto(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white active:scale-95 shadow-inner hover:bg-white/20 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="p-6 bg-slate-50 space-y-3">
              {Object.keys(resumoPagamentos).length === 0 ? (
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest text-center py-8 border border-dashed border-slate-300 rounded-[24px]">Sem dados registrados.</p>
              ) : (
                Object.entries(resumoPagamentos).map(([metodo, valor]) => {
                  const config = configPagamentos[metodo] || configPagamentos['Não Especificado'];
                  return (
                    <div key={metodo} className="bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm shadow-slate-200/50 flex items-center justify-between hover:-translate-y-0.5 transition-transform">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center border shadow-inner ${config.border} ${config.corBg} ${config.corTexto}`}>
                          {config.svg}
                        </div>
                        <span className="text-[12px] font-bold uppercase tracking-widest text-slate-800">{metodo}</span>
                      </div>
                      <span className="text-[16px] font-bold text-slate-800 tracking-tight tabular-nums">
                        {formatarMoeda(valor)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESTORNO DE VENDA */}
      {modalCancelarAberto && vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl shadow-slate-900/50 relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 border border-white/20">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-500 rounded-[24px] flex items-center justify-center mx-auto mb-5 border border-rose-200 shadow-inner shadow-rose-200/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3 className="text-[24px] font-black text-slate-900 tracking-tight uppercase leading-none mb-2">Estornar Venda?</h3>
              <p className="text-[9px] text-rose-500 font-black uppercase tracking-[0.2em] bg-rose-50 inline-block px-3 py-1 rounded-md border border-rose-100 shadow-sm">Ação Irreversível</p>
            </div>

            <div className="space-y-6">
              <p className="text-[11px] text-slate-600 font-bold text-center bg-slate-50 p-4 rounded-[20px] border border-slate-200 shadow-inner shadow-slate-100/50 leading-relaxed">
                O valor de <span className="text-rose-600 font-black tabular-nums">{formatarMoeda(vendaSelecionada.total)}</span> será subtraído do caixa e os itens retornarão ao estoque.
              </p>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest block mb-2">Motivo (Obrigatório)</label>
                <input 
                  type="text" 
                  autoFocus 
                  placeholder="Ex: Lançamento duplicado..." 
                  value={motivoCancelamento} 
                  onChange={(e) => setMotivoCancelamento(e.target.value)} 
                  className="w-full bg-slate-50/70 p-4 h-[60px] rounded-[20px] outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-400/10 font-bold text-slate-800 border border-slate-200 transition-all shadow-sm" 
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setModalCancelarAberto(false)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-black py-4 rounded-[20px] text-[10px] uppercase tracking-widest transition-colors active:scale-95">
                  Voltar
                </button>
                <button 
                  onClick={confirmarCancelamento} 
                  className="flex-[1.5] bg-gradient-to-b from-rose-500 to-rose-600 border border-rose-600 border-t-rose-400/50 hover:shadow-lg active:scale-[0.98] active:shadow-inner text-white font-black py-4 rounded-[20px] text-[11px] uppercase tracking-widest transition-all shadow-md shadow-rose-600/30"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPRIMIR CUPOM */}
      <div className="hidden print:block text-black bg-white w-[80mm] font-mono text-xs absolute top-0 left-0 p-4">
        <h1 className="text-center font-black text-lg mb-1">B A R R A C A  C O R A L</h1>
        <p className="text-center border-b border-black pb-2 mb-2">
          Recibo Mesa {vendaSelecionada?.numeroMesa}<br/>
          {vendaSelecionada ? formatarData(vendaSelecionada.dataFechamento) : ''} {vendaSelecionada ? formatarHora(vendaSelecionada.dataFechamento) : ''}
        </p>
        
        <div className="flex justify-between font-bold border-b border-black pb-1 mb-2">
          <span>QTD DESCRIÇÃO</span>
          <span>VALOR</span>
        </div>
        
        {vendaSelecionada?.itens.map(item => (
          <div key={item.id} className="flex justify-between mb-1">
            <span className="pr-2">{item.quantidade}x {item.produto.nome}</span>
            <span className="tabular-nums">{formatarMoeda(item.produto.preco * item.quantidade)}</span>
          </div>
        ))}
        
        <div className="border-t border-black mt-2 pt-2 flex justify-between font-black text-sm">
          <span>TOTAL</span>
          <span className="tabular-nums">{vendaSelecionada ? formatarMoeda(vendaSelecionada.total) : ''}</span>
        </div>
        
        <div className="mt-2 text-[10px]">
          {vendaSelecionada?.pagamentos?.map((pag, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{pag.metodo}</span><span className="tabular-nums">{formatarMoeda(pag.valor)}</span>
            </div>
          ))}
        </div>
        
        <p className="text-center mt-6 text-[10px]">
          DOCUMENTO SEM VALOR FISCAL<br/><br/>
          Obrigado pela preferência!
        </p>
      </div>
    </div>
  );
}