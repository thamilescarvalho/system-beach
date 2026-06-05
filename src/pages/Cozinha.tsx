// src/pages/Cozinha.tsx
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export function Cozinha() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  const mesas = contexto?.mesas || [];

  const mesasAtivas = mesas.filter(m => m.status === 'ocupada' && m.itens.length > 0);
  const formatarHora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-amber-500 selection:text-black">
      
      {/* HEADER DA COZINHA (Dark Neobrutalism) */}
      <header className="bg-slate-900 sticky top-0 z-30 px-6 py-5 flex items-center justify-between border-b-4 border-slate-800 shadow-2xl">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/')} className="w-12 h-12 flex items-center justify-center bg-slate-800 border-2 border-slate-700 hover:bg-slate-700 hover:border-slate-600 rounded-full transition-all active:scale-90 shadow-inner text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-tighter text-white">BAR / COZINHA</h1>
            <p className="text-[11px] text-amber-400 font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]"></span> Recebendo Pedidos
            </p>
          </div>
        </div>
      </header>

      <main className="p-6">
        {mesasAtivas.length === 0 ? (
          <div className="text-center py-32 opacity-40 animate-in fade-in duration-700">
            <span className="text-7xl mb-6 block drop-shadow-xl">🍳</span>
            <p className="text-2xl font-black tracking-tight text-slate-500 uppercase">Nenhum pedido na fila</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start animate-in slide-in-from-bottom-8 duration-500">
            {mesasAtivas.map(mesa => {
              const itensPendentes = mesa.itens.filter(i => i.statusCozinha === 'pendente');
              const itensProntos = mesa.itens.filter(i => i.statusCozinha === 'pronto');

              // Se não tem nada pendente nem pronto (entregue), esconde o ticket
              if (itensPendentes.length === 0 && itensProntos.length === 0) return null;

              const isTotalmentePronto = itensPendentes.length === 0;

              return (
                <div key={mesa.id} className="bg-slate-800 rounded-4xl overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-2 border-slate-700/50 flex flex-col transition-all">
                  
                  {/* CABEÇALHO DO TICKET */}
                  <div className={`p-5 flex justify-between items-start border-b-4 border-black/20 ${isTotalmentePronto ? 'bg-emerald-500 text-slate-900' : 'bg-amber-400 text-slate-900'}`}>
                    <div>
                      <h2 className="text-3xl font-black tracking-tighter leading-none mb-1">MESA {mesa.numero}</h2>
                      <div className="flex flex-col gap-1 mt-2">
                        {mesa.nomeCliente && (
                          <span className="text-xs font-black uppercase tracking-widest bg-black/10 px-2 py-1 rounded-md inline-block max-w-45 truncate">
                            {mesa.nomeCliente}
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
                          Garçom: {mesa.garcomNome}
                        </span>
                      </div>
                    </div>
                    {isTotalmentePronto ? (
                      <span className="text-[10px] font-black bg-white/40 px-3 py-1.5 rounded-[10px] uppercase tracking-widest shadow-sm">Pronto</span>
                    ) : (
                      <span className="text-[10px] font-black bg-white/40 px-3 py-1.5 rounded-[10px] uppercase tracking-widest shadow-sm animate-pulse">Preparo</span>
                    )}
                  </div>

                  {/* LISTA DE ITENS DO TICKET */}
                  <div className="p-3 space-y-3 bg-slate-900">
                    
                    {/* ITENS PENDENTES (Foco Principal) */}
                    {itensPendentes.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => contexto?.atualizarStatusCozinha(mesa.numero, item.id, 'pronto')}
                        className="w-full text-left bg-slate-800 hover:bg-slate-700 p-4 rounded-3xl flex justify-between items-center transition-all border-b-4 border-slate-950 group active:scale-[0.97] active:border-b-0 active:translate-y-1 shadow-sm"
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-3.5">
                            <span className="bg-amber-400 text-slate-900 font-black text-xl w-12 h-12 rounded-[14px] flex items-center justify-center shadow-inner shrink-0">
                              {item.quantidade}x
                            </span>
                            <div>
                              <p className="font-black text-white text-lg leading-tight tracking-tight">{item.produto.nome}</p>
                              <p className="text-[10px] text-amber-400/80 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                {item.horaPedido ? formatarHora(item.horaPedido) : 'Agora'}
                              </p>
                            </div>
                          </div>
                          {item.observacao && (
                            <div className="mt-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl inline-block w-full">
                              <p className="text-xs text-amber-400 font-black uppercase tracking-widest">⚠️ OBS: {item.observacao}</p>
                            </div>
                          )}
                        </div>
                        <div className="w-10 h-10 rounded-full border-4 border-slate-600 shrink-0 ml-2 group-hover:border-emerald-400 flex items-center justify-center transition-colors"></div>
                      </button>
                    ))}

                    {/* ITENS PRONTOS (Riscados e Verdes) */}
                    {itensProntos.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => contexto?.atualizarStatusCozinha(mesa.numero, item.id, 'pendente')}
                        className="w-full text-left bg-emerald-900/20 border border-emerald-900/30 p-4 rounded-3xl flex justify-between items-center opacity-70 hover:opacity-100 transition-all active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-emerald-500 font-black text-lg bg-emerald-900/40 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
                            {item.quantidade}x
                          </span>
                          <p className="font-black text-emerald-200/60 text-lg line-through tracking-tight">{item.produto.nome}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.4)]">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}