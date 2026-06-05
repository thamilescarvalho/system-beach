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

  const configPagamentos: Record<string, { icone: string, corBg: string, corTexto: string, border: string }> = {
    'PIX': { icone: '💠', corBg: 'bg-teal-50', corTexto: 'text-teal-600', border: 'border-teal-100' },
    'Crédito': { icone: '💳', corBg: 'bg-amber-50', corTexto: 'text-amber-600', border: 'border-amber-100' },
    'Débito': { icone: '🏧', corBg: 'bg-blue-50', corTexto: 'text-blue-600', border: 'border-blue-100' },
    'Dinheiro': { icone: '💵', corBg: 'bg-emerald-50', corTexto: 'text-emerald-600', border: 'border-emerald-100' },
    'Não Especificado': { icone: '📝', corBg: 'bg-slate-50', corTexto: 'text-slate-500', border: 'border-slate-200' }
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
    <div className="min-h-screen bg-slate-50 font-sans pb-24 print:bg-white print:pb-0 relative overflow-hidden">
      
      {/* FUNDO (Escondidos na Impressão) */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse print:hidden" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse print:hidden" style={{ animationDelay: '1s' }} />

      {/* Oculte na impressão tudo que não for o recibo */}
      <div className="print:hidden">
        
        {/* HEADER SUPERIOR */}
        <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-600 active:scale-90 transition-all hover:bg-slate-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h1 className="text-xl font-black text-transparent bg-clip-text bg-linear-to-b from-slate-800 to-slate-950 tracking-tighter drop-shadow-sm leading-none">
                FINANCEIRO
              </h1>
              <p className="text-emerald-700 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Caixa e Faturamento</p>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 space-y-6 relative z-10 animate-in zoom-in-95 duration-500">
          
          {/* SELETOR DE PERÍODO */}
          <section className="bg-white/80 backdrop-blur-md p-5 rounded-[28px] shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] shrink-0 ml-2">Filtro Por período:</h2>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="flex-1 bg-slate-50 text-slate-600 text-sm font-bold px-5 py-2 rounded-4xl border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 outline-none transition-all" />
              <span className="text-slate-400 font-bold">até</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="flex-1 bg-slate-50 text-slate-600 text-sm font-bold px-5 py-2 rounded-4xl border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 outline-none transition-all" />
            </div>
          </section>

          {/* CARDS DE KPI  */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Faturamento Líquido */}
            <div className="bg-linear-to-b from-emerald-400 to-emerald-500 border border-emerald-300 rounded-4xl p-6 text-white shadow-[0_8px_0_#047857,0_15px_20px_rgba(16,185,129,0.3)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <h3 className="text-white text-[10px] font-black uppercase tracking-widest mb-3 drop-shadow-sm">Faturamento Líquido</h3>
              <p className="text-4xl font-bold tracking-tighter drop-shadow-md">{formatarMoeda(faturamentoTotal - taxaServicoTotal)}</p>
              <p className="text-xs text-white mt-2 font-bold bg-black/20 inline-block px-3 py-1 rounded-full border border-white/10">Livre dos 10%</p>
            </div>

            {/* Taxa de Serviço */}
            <div className="bg-linear-to-b from-indigo-500 to-indigo-600 border border-indigo-400 rounded-4xl p-6 text-white shadow-[0_8px_0_#3730a3,0_15px_20px_rgba(79,70,229,0.3)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <h3 className="text-white text-[10px] font-bold uppercase tracking-widest mb-3 drop-shadow-sm">Taxa de Serviço (10%)</h3>
              <p className="text-4xl font-bold tracking-tighter drop-shadow-md">{formatarMoeda(taxaServicoTotal)}</p>
              <p className="text-xs text-indigo-100 mt-2 font-bold bg-black/10 inline-flex px-2 py-1 rounded-full border border-white/10 items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Repasse
              </p>
            </div>

            {/* Dinheiro no Salão */}
            <div className="bg-linear-to-b from-slate-800 to-slate-900 border border-slate-700 rounded-4xl p-6 text-white shadow-[0_8px_0_#0f172a,0_15px_20px_rgba(0,0,0,0.4)] relative overflow-hidden">
              <h3 className="text-white text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2 drop-shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span> Dinheiro no Salão
              </h3>
              <p className="text-4xl font-bold tracking-tighter drop-shadow-md">{formatarMoeda(valorEmAberto)}</p>
              <p className="text-xs text-slate-300 mt-4 font-bold bg-white/10 inline-block px-2 py-1 rounded-full border border-white/5">{mesasOcupadas.length} Mesas</p>
              <div className="absolute -right-4 -bottom-6 opacity-[0.03] text-white text-9xl pointer-events-none">🏖️</div>
            </div>
          </section>

          {/* FORMAS DE PAGAMENTO */}
          <section className="bg-white/80 backdrop-blur-md rounded-4xl p-4 shadow-sm border border-slate-300 mt-6">
            <h2 className="text-sm font-bold text-slate-800 tracking-widest uppercase mb-4 flex items-center gap-2">
              <span className="w-10 h-8 rounded-4xl bg-slate-100 flex items-center justify-center border border-slate-200 shadow-inner">💳</span> 
              Receita por Forma de Pag.
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(resumoPagamentos).length === 0 ? (
                <div className="col-span-full text-center py-10 bg-slate-50/50 rounded-3xl border border-dashed border-slate-300">
                  <p className="text-slate-500 text-sm font-semi">Nenhuma receita finalizada neste período.</p>
                </div>
              ) : (
                Object.entries(resumoPagamentos).map(([metodo, valor]) => {
                  const config = configPagamentos[metodo] || configPagamentos['Não Especificado'];
                  return (
                    <div key={metodo} className={`p-5 rounded-3xl border flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow ${config.corBg} ${config.border}`}>
                      <span className="text-3xl mb-3 drop-shadow-sm bg-white w-12 h-12 rounded-full flex items-center justify-center shadow-sm">{config.icone}</span>
                      <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${config.corTexto}`}>{metodo}</span>
                      <span className="text-xl font-black text-slate-800 tracking-tight">{formatarMoeda(valor)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* AUDITORIA DE COMANDAS */}
          <section className="bg-white/80 backdrop-blur-md rounded-[36px] p-7 shadow-sm border border-slate-200 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-slate-800 tracking-widest uppercase flex items-center gap-3">
                <span className="w-8 h-8 rounded-[10px] bg-slate-100 flex items-center justify-center text-lg border border-slate-200 shadow-inner">🧾</span> 
                Comandas
              </h2>
              <span className="bg-indigo-50 border border-indigo-100 text-slate-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                {historicoFiltrado.length} Registros
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historicoFiltrado.length === 0 ? (
                <div className="col-span-full text-center py-10">
                   <p className="text-slate-400 text-sm font-semi">Nenhum registro encontrado para estas datas.</p>
                </div>
              ) : (
                historicoFiltrado.map((venda) => {
                  const isCancelada = venda.status === 'cancelada';
                  return (
                    <button 
                      key={venda.id}
                      onClick={() => setVendaSelecionada(venda)}
                      className={`group w-full p-5 rounded-3xl shadow-sm border flex justify-between items-center active:scale-[0.98] transition-all text-left
                        ${isCancelada ? 'bg-slate-50 border-rose-200/50 opacity-70' : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-[18px] flex flex-col items-center justify-center shadow-inner border
                          ${isCancelada ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-linear-to-br from-slate-50 to-slate-100 border-slate-200 text-slate-700'}
                        `}>
                          <span className="text-[9px] font-black uppercase tracking-tighter opacity-60 mb-0.5">Mesa</span>
                          <span className="text-2xl font-black leading-none">{venda.numeroMesa}</span>
                        </div>
                        <div>
                          <p className={`font-black tracking-tight text-base mb-1 ${isCancelada ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                            {venda.nomeCliente || 'Cliente s/ nome'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[9px] bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                              {venda.garcomNome}
                            </span>
                            {isCancelada && (
                              <span className="text-[9px] bg-rose-100 border border-rose-200 text-rose-600 px-2.5 py-1 rounded-md font-black uppercase tracking-widest shadow-sm">
                                Cancelada
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right pl-2 border-l border-slate-100">
                        <p className={`font-black tracking-tight text-lg ${isCancelada ? 'text-slate-400' : 'text-slate-900'}`}>{formatarMoeda(venda.total)}</p>
                        <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver Recibo &rarr;
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </main>
      </div>

      {/* POP-UP DETALHAMENTO DA CONTA  */}
      {vendaSelecionada && !modalCancelarAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="absolute inset-0" onClick={() => setVendaSelecionada(null)}></div>
          
          <div className="bg-white rounded-[40px] w-full max-w-md max-h-[90vh] shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 flex flex-col overflow-hidden border border-white/20">
            
            <div className="flex items-center justify-between p-7 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recibo Mesa {vendaSelecionada.numeroMesa}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{formatarData(vendaSelecionada.dataFechamento)} às {formatarHora(vendaSelecionada.dataFechamento)}</p>
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 active:scale-90 shadow-sm hover:bg-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="p-7 overflow-y-auto flex-1 hide-scrollbar bg-white">
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 border border-rose-200 p-5 rounded-3xl mb-6 shadow-inner">
                  <h4 className="text-rose-600 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    Comprovante Cancelado
                  </h4>
                  <div className="text-xs text-rose-800/80 font-bold space-y-2">
                    <p><strong>Cancelado por:</strong> {vendaSelecionada.canceladoPor} em {formatarData(vendaSelecionada.dataCancelamento || '')}</p>
                    <p className="bg-white/50 p-2 rounded-lg border border-rose-100 mt-2"><strong>Motivo:</strong> {vendaSelecionada.motivoCancelamento}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 mb-8 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <div className="flex-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cliente</p>
                  <p className={`font-black text-slate-800 ${vendaSelecionada.status === 'cancelada' ? 'line-through opacity-60' : ''}`}>{vendaSelecionada.nomeCliente || 'Não identificado'}</p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div className="flex-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Atendente</p>
                  <p className="font-black text-slate-800">{vendaSelecionada.garcomNome}</p>
                </div>
              </div>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                <span className="w-6 h-px bg-slate-200"></span> Itens Consumidos <span className="flex-1 h-px bg-slate-200"></span>
              </p>
              
              <div className="space-y-4 mb-8">
                {vendaSelecionada.itens.map(item => (
                  <div key={item.id} className={`flex justify-between items-center pb-4 border-b border-slate-100 border-dashed last:border-0 last:pb-0 ${vendaSelecionada.status === 'cancelada' ? 'line-through opacity-60' : ''}`}>
                    <div className="flex gap-3 items-center">
                      <span className="font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-lg text-xs">{item.quantidade}x</span>
                      <div>
                        <p className="font-black text-slate-800 text-sm leading-tight">{item.produto.nome}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{formatarMoeda(item.produto.preco)} un.</p>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-base">
                      {formatarMoeda(item.produto.preco * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Resumo do Pagamento</p>
                {vendaSelecionada.pagamentos && vendaSelecionada.pagamentos.length > 0 ? (
                  <div className="space-y-3">
                    {vendaSelecionada.pagamentos.map((pag, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="font-black text-slate-600 text-sm uppercase tracking-widest bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">{pag.metodo}</span>
                        <span className="font-black text-slate-900 text-lg">{formatarMoeda(pag.valor)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-400 text-center italic bg-white py-2 rounded-lg border border-slate-100">Método não especificado</p>
                )}
              </div>
            </div>

            <div className="p-7 bg-slate-50/80 rounded-b-[40px] border-t border-slate-200 flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-black text-slate-500 uppercase tracking-widest text-sm">Total Final</span>
                <span className={`text-4xl font-black tracking-tighter drop-shadow-sm ${vendaSelecionada.status === 'cancelada' ? 'text-slate-400 line-through' : 'text-emerald-500'}`}>
                  {formatarMoeda(vendaSelecionada.total)}
                </span>
              </div>
              
              <button 
                onClick={() => window.print()}
                className="w-full bg-linear-to-b from-emerald-400 to-emerald-500 text-white font-black py-5 rounded-[20px] shadow-[0_6px_0_#047857] active:shadow-none active:translate-y-1.5 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Imprimir Cupom 80mm
              </button>

              {vendaSelecionada.status !== 'cancelada' && (
                <button 
                  onClick={() => setModalCancelarAberto(true)}
                  className="w-full bg-white text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-black py-4 rounded-[20px] border-2 border-rose-200 transition-colors uppercase tracking-widest text-xs flex items-center justify-center gap-2 mt-2"
                >
                  Estornar Venda
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ESTORNO */}
      {modalCancelarAberto && vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 border-4 border-rose-500">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner border border-rose-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">Estornar Venda?</h3>
              <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mt-2 bg-rose-50 inline-block px-3 py-1 rounded-full border border-rose-100">Ação Irreversível</p>
            </div>

            <div className="space-y-6">
              <p className="text-sm text-slate-600 font-bold text-center bg-slate-50 p-4 rounded-[20px] border border-slate-200">
                O valor de <span className="text-rose-600 font-black">{formatarMoeda(vendaSelecionada.total)}</span> será subtraído do caixa e os itens retornarão ao estoque.
              </p>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Motivo do Estorno (Obrigatório)</label>
                <input 
                  type="text" 
                  autoFocus 
                  placeholder="Ex: Lançado na mesa errada" 
                  value={motivoCancelamento} 
                  onChange={(e) => setMotivoCancelamento(e.target.value)} 
                  className="w-full bg-slate-50/70 p-4 rounded-[20px] border border-slate-200 outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-400/20 font-bold text-slate-800 transition-all" 
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button onClick={() => setModalCancelarAberto(false)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-black py-4 rounded-[20px] text-xs uppercase tracking-widest transition-colors active:scale-95">
                  Voltar
                </button>
                <button 
                  onClick={confirmarCancelamento} 
                  className="flex-[1.5] bg-linear-to-b from-rose-500 to-rose-600 border border-rose-500 shadow-[0_6px_0_#be123c] active:shadow-none active:translate-y-1.5 text-white font-black py-4 rounded-[20px] text-xs uppercase tracking-widest transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ LAYOUT TÉRMICO (Apenas visível ao imprimir) */}
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
            <span>{formatarMoeda(item.produto.preco * item.quantidade)}</span>
          </div>
        ))}
        
        <div className="border-t border-black mt-2 pt-2 flex justify-between font-black text-sm">
          <span>TOTAL</span>
          <span>{vendaSelecionada ? formatarMoeda(vendaSelecionada.total) : ''}</span>
        </div>
        
        <div className="mt-2 text-[10px]">
          {vendaSelecionada?.pagamentos?.map((pag, idx) => (
            <div key={idx} className="flex justify-between">
              <span>{pag.metodo}</span><span>{formatarMoeda(pag.valor)}</span>
            </div>
          ))}
        </div>
        
        <p className="text-center mt-6 text-[10px]">
          DOCUMENTO SEM VALOR FISCAL<br/>
          Obrigado pela preferência!
        </p>
      </div>
    </div>
  );
}