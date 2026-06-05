// src/pages/Painel.tsx
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { VendaFechada } from '../types';

export function Painel() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  
  // Filtro de Período
  const dataHoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);

  // Estado Pop-up
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFechada | null>(null);

  const historico = contexto?.historicoVendas || [];
  const garcomLogado = contexto?.garcomLogado;

  // Filtro
  const vendasFiltradas = historico.filter(venda => {
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= dataInicio && dataVenda <= dataFim;
    const privacidadeValida = garcomLogado?.cargo === 'admin' ? true : venda.garcomNome === garcomLogado?.nome;
    return dataValida && privacidadeValida;
  });

  // Vendas não canceladas
  const vendasValidas = vendasFiltradas.filter(v => v.status !== 'cancelada');

  // Cálculos Financeiros
  const faturamentoTotal = vendasValidas.reduce((total, venda) => total + venda.total, 0);

  // Comissão (10%)
  const comissaoTotal = vendasValidas.reduce((totalComissao, venda) => {
    const itemServico = venda.itens.find(item => item.id === 'taxa-servico-10');
    if (itemServico) {
      return totalComissao + (itemServico.produto.preco * itemServico.quantidade);
    }
    return totalComissao;
  }, 0);

  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarHora = (isoString: string) => new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatarDataBR = (isoString: string) => new Date(isoString).toLocaleDateString('pt-BR');

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative overflow-hidden">
      
      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-600 active:scale-90 transition-all hover:bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm leading-none">
              MEU CAIXA
            </h1>
            <p className="text-emerald-700 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Desempenho Pessoal</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 relative z-10 animate-in zoom-in-95 duration-500">
        
        {/* CARD DE FATURAMENTO E COMISSÃO */}
        <section className="bg-linear-to-b from-emerald-400 to-emerald-500 border border-emerald-300 rounded-[36px] p-7 text-white shadow-[0_8px_0_#047857,0_15px_20px_rgba(16,185,129,0.3)] relative overflow-hidden">
          <div className="absolute top-[-30%] right-[-10%] w-48 h-48 bg-white/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-emerald-50 text-[10px] font-bold uppercase tracking-widest drop-shadow-sm">Faturamento Validado</h2>
              <div className="w-10 h-10 bg-white/20 rounded-[14px] flex items-center justify-center text-xl shadow-inner border border-white/20">
                💰
              </div>
            </div>
            
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-emerald-200 drop-shadow-md">R$</span>
              <span className="text-4xl font-bold tracking-tighter tabular-nums drop-shadow-lg">
                {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {/* Divisória */}
            <div className="pt-5 border-t border-white/20 flex items-center justify-between">
              <div>
                <span className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest block mb-1">Minha Comissão (10%)</span>
                <span className="text-2xl font-bold text-white tabular-nums tracking-tight bg-black/10 px-3 py-1 rounded-xl border border-white/10 inline-block">
                  {formatarMoeda(comissaoTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest block mb-1">Comandas</span>
                <span className="text-2xl font-bold text-white tabular-nums tracking-tight bg-black/10 px-3 py-1 rounded-xl border border-white/10 inline-block">
                  {vendasValidas.length}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FILTRO DE PERÍODO */}
        <section className="bg-white/80 backdrop-blur-md p-3 rounded-3xl shadow-sm border border-slate-300">
          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-3 h-px bg-slate-300"></span> Filtro de Datas
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input 
                type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
                className="w-full bg-slate-50/70 text-slate-600 text-[12px] font-bold px-7 py-2 rounded-[18px] border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-slate-400 outline-none transition-all text-center"
              />
            </div>
            <div className="text-slate-500 font-bold text-sm">até</div>
            <div className="flex-1 relative">
              <input 
                type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)}
                className="w-full bg-slate-50/70 text-slate-600 text-[12px] font-bold px-7 py-2 rounded-[18px] border border-slate-200 focus:ring-4 focus:ring-emerald-500/20 focus:border-slate-400 outline-none transition-all text-center"
              />
            </div>
          </div>
        </section>

        {/* HISTÓRICO DE COMANDAS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">Extrato do Período</h3>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-sm">
              {vendasFiltradas.length} Registros
            </span>
          </div>
          
          {vendasFiltradas.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md p-10 rounded-4xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-[20px] flex items-center justify-center text-3xl mb-4 shadow-inner">📭</div>
              <p className="text-slate-500 font-semi text-sm">Nenhuma venda registrada<br/>neste período.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendasFiltradas.map((venda) => {
                const pagouTaxa = venda.itens.some(item => item.id === 'taxa-servico-10');
                const isCancelada = venda.status === 'cancelada';

                return (
                  <button 
                    key={venda.id}
                    onClick={() => setVendaSelecionada(venda)}
                    className={`group w-full p-4 rounded-[28px] shadow-sm border flex justify-between items-center active:scale-[0.98] transition-all text-left overflow-hidden
                      ${isCancelada ? 'bg-slate-50 border-rose-200/50 opacity-70' : 'bg-white/90 backdrop-blur-sm border-slate-200 hover:border-emerald-300 hover:shadow-md'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-[20px] flex flex-col items-center justify-center shadow-inner border
                        ${isCancelada ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-linear-to-br from-emerald-50 to-emerald-100 text-emerald-600 border-emerald-200'}
                      `}>
                        <span className="text-[9px] font-black uppercase tracking-tighter opacity-70 mb-0.5">Mesa</span>
                        <span className="text-xl font-black leading-none">{venda.numeroMesa}</span>
                      </div>
                      <div>
                        <p className={`font-black tracking-tight text-sm mb-1 ${isCancelada ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          {venda.nomeCliente || 'Cliente s/ nome'}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {formatarHora(venda.dataFechamento)}
                          </span>
                          {pagouTaxa && !isCancelada && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-black uppercase tracking-widest shadow-sm">
                              +10%
                            </span>
                          )}
                          {isCancelada && (
                            <span className="text-[8px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md font-black uppercase tracking-widest shadow-sm">
                              Cancelada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right pl-3 border-l border-slate-100">
                      <p className={`font-black tracking-tight text-lg ${isCancelada ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {formatarMoeda(venda.total)}
                      </p> 
                      <p className={`text-[9px] font-black uppercase tracking-widest mt-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isCancelada ? 'text-rose-400' : 'text-emerald-500'}`}>
                        Recibo &rarr;
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* POP-UP DETALHAMENTO DA CONTA */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setVendaSelecionada(null)}></div>
          
          <div className="bg-white rounded-[40px] w-full max-w-sm max-h-[90vh] shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 flex flex-col overflow-hidden border border-white/20">
            
            {/* Header Recibo */}
            <div className="flex items-center justify-between p-7 border-b border-slate-100 bg-slate-50/80">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recibo Mesa {vendaSelecionada.numeroMesa}</h3>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{formatarDataBR(vendaSelecionada.dataFechamento)} às {formatarHora(vendaSelecionada.dataFechamento)}</p>
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 active:scale-90 shadow-sm hover:bg-slate-100 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="p-7 overflow-y-auto flex-1 hide-scrollbar bg-white">
              
              {/* SELO DE CANCELAMENTO */}
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 border border-rose-200 p-5 rounded-3xl mb-6 shadow-inner">
                  <h4 className="text-rose-600 font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-2 mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                    Comanda Cancelada
                  </h4>
                  <div className="text-xs text-rose-800/80 font-bold space-y-2">
                    <p><strong>Por:</strong> {vendaSelecionada.canceladoPor}</p>
                    <p className="bg-white/50 p-2 rounded-lg border border-rose-100 mt-2"><strong>Motivo:</strong> {vendaSelecionada.motivoCancelamento}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-4 mb-8 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <div className="flex-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cliente</p>
                  <p className={`font-black text-slate-800 ${vendaSelecionada.status === 'cancelada' ? 'line-through opacity-60' : ''}`}>
                    {vendaSelecionada.nomeCliente || 'Não identificado'}
                  </p>
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
              
              <div className={`space-y-4 mb-8 ${vendaSelecionada.status === 'cancelada' ? 'opacity-60' : ''}`}>
                {vendaSelecionada.itens.map(item => (
                  <div key={item.id} className={`flex justify-between items-center pb-4 border-b border-slate-100 border-dashed last:border-0 last:pb-0 ${vendaSelecionada.status === 'cancelada' ? 'line-through' : ''}`}>
                    <div className="flex gap-3 items-center">
                      <span className="font-black text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-[10px] text-xs shadow-sm border border-slate-100">{item.quantidade}x</span>
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

              {/* Resumo do Pagamento */}
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
                  <p className="text-xs font-bold text-slate-400 text-center italic bg-white py-2 rounded-lg border border-slate-100">Não especificado na época</p>
                )}
              </div>
            </div>

            {/* Total Final Rodapé */}
            <div className="p-7 bg-slate-50/80 rounded-b-[40px] border-t border-slate-200">
              <div className="flex justify-between items-center">
                <span className="font-black text-slate-500 uppercase tracking-widest text-sm">Total Final</span>
                <span className={`text-4xl font-black tracking-tighter drop-shadow-sm ${vendaSelecionada.status === 'cancelada' ? 'text-slate-400 line-through' : 'text-emerald-500'}`}>
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