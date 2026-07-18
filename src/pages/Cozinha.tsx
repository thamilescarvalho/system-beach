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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-amber-500 selection:text-black relative overflow-hidden perspective-distant">
      
      {/* FUNDO */}
      <div className="fixed top-[-15%] left-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-15%] right-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* HEADER DA COZINHA */}
      <header className="bg-slate-700 backdrop-blur-xl sticky top-0 z-30 px-8 py-4 flex items-center justify-between border-b border-slate-800 shadow-lg shadow-black/50">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate('/')} className="w-12 h-12 flex items-center justify-center bg-slate-800 border border-slate-700 shadow-sm shadow-black/50 hover:bg-slate-700 hover:border-slate-600 rounded-2xl transition-all active:scale-95 text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-black leading-none tracking-widest uppercase text-white drop-shadow-md">
              BAR / COZINHA
            </h1>
            <p className="text-[11px] text-amber-400 font-black uppercase tracking-[0.2em] flex items-center gap-2 mt-1.5 drop-shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-md shadow-amber-400/50"></span> Recebendo Pedidos
            </p>
          </div>
        </div>
      </header>

      <main className="p-6 relative z-10 animate-in zoom-in-95 duration-500">
        {mesasAtivas.length === 0 ? (
          <div className="text-center py-32 opacity-40 animate-in fade-in duration-700 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-4xl bg-slate-900 border border-slate-800 flex items-center justify-center text-5xl mb-6 shadow-inner shadow-black/50">
              🍳
            </div>
            <p className="text-xl font-black tracking-widest text-slate-600 uppercase">Nenhum pedido na fila</p>
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
                <div key={mesa.id} className="bg-slate-900 rounded-[36px] overflow-hidden border border-slate-800 shadow-2xl shadow-black/60 flex flex-col transition-all transform-style-3d hover:-translate-y-1 duration-300">
                  
                  {/* CABEÇALHO DO TICKET */}
                  <div className={`p-6 flex justify-between items-start border-b border-black/40 
                    ${isTotalmentePronto 
                      ? 'bg-linear-to-b from-emerald-500 to-emerald-600 border-t-emerald-400/50 text-slate-900 shadow-md shadow-emerald-500/20' 
                      : 'bg-linear-to-b from-amber-400 to-amber-500 border-t-amber-300/50 text-slate-900 shadow-md shadow-amber-500/20'
                    }`}
                  >
                    <div>
                      <h2 className="text-3xl font-black tracking-tighter leading-none mb-1 drop-shadow-sm">MESA {mesa.numero}</h2>
                      <div className="flex flex-col gap-1.5 mt-2">
                        {mesa.nomeCliente && (
                          <span className="text-xs font-black uppercase tracking-widest bg-black/15 shadow-inner px-2.5 py-1 rounded-md inline-block max-w-45 truncate text-white">
                            {mesa.nomeCliente}
                          </span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-black/70 mt-1">
                          Atendente: {mesa.garcomNome}
                        </span>
                      </div>
                    </div>
                    {isTotalmentePronto ? (
                      <span className="text-[10px] font-black bg-white/40 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">Pronto</span>
                    ) : (
                      <span className="text-[10px] font-black bg-white/40 px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm animate-pulse">Preparo</span>
                    )}
                  </div>

                  {/* LISTA DE ITENS DO TICKET */}
                  <div className="p-4 space-y-3 bg-slate-900/50">
                    
                    {/* ITENS PENDENTES */}
                    {itensPendentes.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => contexto?.atualizarStatusCozinha(mesa.numero, item.id, 'pronto')}
                        className="w-full text-left bg-slate-800 hover:bg-slate-700 p-4 rounded-3xl flex justify-between items-center transition-all border border-slate-700 shadow-md shadow-black/40 group active:scale-[0.97] active:shadow-inner active:border-slate-800"
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-4">
                            <span className="bg-amber-400 text-slate-900 font-black text-xl w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0 border border-amber-300">
                              {item.quantidade}x
                            </span>
                            <div>
                              <p className="font-black text-white text-[17px] leading-tight tracking-tight drop-shadow-sm">{item.produto.nome}</p>
                              <p className="text-[10px] text-amber-400/90 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
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
                        {/* Checkbox Circular Vazio */}
                        <div className="w-10 h-10 rounded-full border-4 border-slate-600 shrink-0 ml-2 group-hover:border-emerald-400 flex items-center justify-center transition-colors shadow-inner bg-slate-900/50"></div>
                      </button>
                    ))}

                    {/* ITENS PRONTOS  */}
                    {itensProntos.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => contexto?.atualizarStatusCozinha(mesa.numero, item.id, 'pendente')}
                        className="w-full text-left bg-emerald-900/20 border border-emerald-900/40 p-4 rounded-3xl flex justify-between items-center opacity-70 hover:opacity-100 transition-all active:scale-[0.98] shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-emerald-400 font-black text-lg bg-emerald-900/50 border border-emerald-800/50 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0">
                            {item.quantidade}x
                          </span>
                          <p className="font-black text-emerald-300 text-[17px] line-through tracking-tight">{item.produto.nome}</p>
                        </div>
                        {/* Checkbox */}
                        <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-emerald-400 text-slate-900 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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