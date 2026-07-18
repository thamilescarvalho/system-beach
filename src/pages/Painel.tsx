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
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative overflow-hidden perspective-distant">
      
      {/* FUNDO */}
      <div className="fixed top-[-15%] left-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-teal-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-15%] right-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-sm shadow-slate-200/50 px-6 py-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 transition-all hover:bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-widest uppercase leading-none">
              MEU CAIXA
            </h1>
            <p className="text-teal-600 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Desempenho</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 space-y-6 relative z-10 animate-in zoom-in-95 duration-500 transform-style-3d">
        
        {/* FILTRO DE PERÍODO  */}
        <section className="bg-white px-2 py-1 rounded-full shadow-sm shadow-slate-200/50 border border-slate-200 flex items-center gap-1 mx-auto max-w-fit">
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent text-slate-700 text-[11px] font-bold px-3 py-1 outline-none cursor-pointer uppercase tracking-wider" />
          <span className="text-slate-400 font-bold text-[9px] uppercase">até</span>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent text-slate-700 text-[11px] font-bold px-3 py-1 outline-none cursor-pointer uppercase tracking-wider" />
        </section>

        {/* CARD PRINCIPAL DE DESEMPENHO */}
        <section className="relative w-full rounded-[36px] bg-linear-to-b from-teal-500 to-teal-700 border border-teal-700 border-t-teal-400/50 shadow-2xl shadow-teal-700/30 p-7 overflow-hidden">
          <div className="absolute top-0 right-0 w-50 h-40 bg-teal-400/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white text-[11px] font-bold uppercase tracking-widest drop-shadow-sm">Vendas Concluídas</h2>
              <div className="w-10 h-10 bg-white/10 backdrop-blur-lg rounded-4xl flex items-center justify-center text-xl shadow-inner border border-white/50 text-white">
                $
              </div>
            </div>
            
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-bold text-teal-200 drop-shadow-md">R$</span>
              <span className="text-4xl font-bold text-white tracking-tighter tabular-nums drop-shadow-md">
                {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            {/* Divisória */}
            <div className="pt-5 border-t border-white/15 flex items-center justify-between">
              <div>
                <span className="text-teal-200 text-[9px] font-bold uppercase tracking-widest block mb-1">Minha Comissão (10%)</span>
                <span className="text-xl font-bold text-white tabular-nums tracking-tight bg-black/15 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner inline-block">
                  {formatarMoeda(comissaoTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-teal-200 text-[9px] font-bold uppercase tracking-widest block mb-1">Comandas</span>
                <span className="text-xl font-bold text-white tabular-nums tracking-tight bg-black/15 px-4 py-1.5 rounded-xl border border-white/10 shadow-inner inline-block">
                  {vendasValidas.length}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* HISTÓRICO DE COMANDAS */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Extrato de Vendas</h3>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm shadow-slate-200/50">
              {vendasFiltradas.length} Registros
            </span>
          </div>
          
          {vendasFiltradas.length === 0 ? (
            <div className="bg-white p-10 rounded-4xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-1xl mb-3 border border-slate-100 shadow-inner">$</div>
              <p className="text-slate-400 font-bold text-[12px]">Nenhuma venda registrada<br/>neste período.</p>
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
                    className={`group w-full p-4 rounded-[28px] border flex justify-between items-center active:scale-[0.98] transition-all duration-300 text-left overflow-hidden
                      ${isCancelada 
                        ? 'bg-slate-50 border-rose-200/40 opacity-70' 
                        : 'bg-white border-slate-200 shadow-sm shadow-slate-200/50 hover:shadow-md hover:border-teal-600 hover:-translate-y-1'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-[20px] flex flex-col items-center justify-center border shrink-0
                        ${isCancelada ? 'bg-rose-50 text-rose-500 border-rose-100 shadow-inner' : 'bg-linear-to-br from-teal-50 to-teal-100 text-teal-600 border-teal-200 shadow-inner shadow-white/50'}
                      `}>
                        <span className="text-[9px] font-bold uppercase tracking-tighter opacity-70 mb-0.5">Mesa</span>
                        <span className="text-xl font-bold leading-none">{venda.numeroMesa}</span>
                      </div>
                      <div>
                        <p className={`font-bold tracking-tight text-sm mb-1 truncate uppercase ${isCancelada ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                          Cliente : {venda.nomeCliente || 'sem nome'}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {formatarHora(venda.dataFechamento)}
                          </span>
                          {pagouTaxa && !isCancelada && (
                            <span className="text-[8px] bg-teal-100 border border-teal-200 text-teal-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ml-1 shadow-sm">
                              +10%
                            </span>
                          )}
                          {isCancelada && (
                            <span className="text-[8px] bg-rose-100 border border-rose-200 text-rose-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ml-1 shadow-sm">
                              Cancelada
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right pl-3 border-l border-slate-200">
                      <p className={`font-bold tracking-tight text-[16px] tabular-nums ${isCancelada ? 'text-slate-400 line-through' : 'text-zinc-500'}`}>
                        {formatarMoeda(venda.total)}
                      </p> 
                      <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isCancelada ? 'text-rose-400' : 'text-zinc-500'}`}>
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
                <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest tabular-nums">{formatarDataBR(vendaSelecionada.dataFechamento)} às {formatarHora(vendaSelecionada.dataFechamento)}</p>
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
                      <span className="font-black text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-[10px] text-xs shadow-sm border border-slate-100 tabular-nums">{item.quantidade}x</span>
                      <div>
                        <p className="font-black text-slate-800 text-sm leading-tight">{item.produto.nome}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tabular-nums">{formatarMoeda(item.produto.preco)} un.</p>
                      </div>
                    </div>
                    <span className="font-black text-slate-900 text-base tabular-nums">
                      {formatarMoeda(item.produto.preco * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Resumo do Pagamento */}
              <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 shadow-inner">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Resumo do Pagamento</p>
                {vendaSelecionada.pagamentos && vendaSelecionada.pagamentos.length > 0 ? (
                  <div className="space-y-3">
                    {vendaSelecionada.pagamentos.map((pag, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="font-black text-slate-600 text-[11px] uppercase tracking-widest bg-white px-3 py-1 rounded-lg shadow-sm border border-slate-100">{pag.metodo}</span>
                        <span className="font-black text-slate-900 text-lg tabular-nums">{formatarMoeda(pag.valor)}</span>
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
                <span className={`text-4xl font-black tracking-tighter tabular-nums drop-shadow-sm ${vendaSelecionada.status === 'cancelada' ? 'text-slate-400 line-through' : 'text-teal-600'}`}>
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