// src/pages/Cozinha.tsx
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import type { Mesa } from '../types';
import * as LucideIcons from 'lucide-react';

export function Cozinha() {
  const contexto = useContext(AppContext);

  const mesas: Mesa[] = contexto?.mesas || [];
  const mesasAtivas = mesas.filter(m => m.status === 'ocupada' && m.itens.length > 0);

  const formatarHora = (iso: string) => {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-200/50 font-sans text-slate-900 selection:bg-green-500 selection:text-white">
      <Header />

      <div className="pt-20 md:pt-24 pb-28 md:pb-8 md:pl-18 flex flex-col items-center w-full">
        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between sm:justify-center mb-6 px-2 gap-3">
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 uppercase tracking-widest truncate">
              Recebendo Pedidos
            </h2>
            <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
            </span>
          </div>

          {mesasAtivas.length === 0 ? (
            <div className="w-full bg-white border border-slate-300 rounded-3xl py-20 sm:py-24 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500 shadow-sm mt-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <LucideIcons.ChefHat size={44} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mb-2">Cozinha Livre</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-xs">
                Nenhum pedido na fila. A praça está organizada e limpa.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
              {mesasAtivas.map(mesa => {
                const itensPendentes = mesa.itens.filter(i => i.statusCozinha === 'pendente');
                const itensProntos = mesa.itens.filter(i => i.statusCozinha === 'pronto');

                if (itensPendentes.length === 0 && itensProntos.length === 0) return null;

                const isTotalmentePronto = itensPendentes.length === 0;

                return (
                  <div
                    key={mesa.id}
                    className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl flex flex-col group ${
                      isTotalmentePronto
                        ? 'border-2 border-green-500 shadow-xl shadow-green-500/15'
                        : 'border border-slate-200 shadow-md'
                    }`}
                  >
                    {/* CABEÇALHO DO TICKET */}
                    <div className="p-4 sm:p-5 flex justify-between items-start gap-2 border-b border-slate-100 bg-white">
                      <div className="min-w-0">
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-900 leading-none mb-2.5">
                          MESA {mesa.numero}
                        </h2>

                        <div className="flex flex-col gap-1.5 min-w-0">
                          {mesa.nomeCliente && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md w-max max-w-full flex items-center gap-1.5 truncate">
                              <LucideIcons.User size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{mesa.nomeCliente}</span>
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 truncate">
                            Atendente: <span className="text-slate-700">{mesa.garcomNome || 'Sistema'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Badge */}
                      {isTotalmentePronto ? (
                        <span className="text-[10px] font-black bg-green-50 text-green-600 border border-green-200 px-3 py-2 rounded-xl uppercase tracking-widest flex items-center gap-1.5 shadow-xs shrink-0">
                          <LucideIcons.Check size={14} strokeWidth={3} /> Pronto
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-2 rounded-xl uppercase tracking-widest shadow-md flex items-center gap-1.5 shrink-0">
                          <LucideIcons.Timer size={14} className="text-amber-400" /> Preparo
                        </span>
                      )}
                    </div>

                    {/* LISTA DE ITENS */}
                    <div className="flex flex-col divide-y divide-slate-100">
                      {/* ITENS PENDENTES */}
                      {itensPendentes.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => contexto?.atualizarStatusCozinha(mesa.numero, item.id, 'pronto')}
                          className="w-full text-left bg-white hover:bg-slate-50 p-4 sm:p-5 flex justify-between items-center transition-all duration-200 active:bg-slate-100 group/item"
                        >
                          <div className="flex-1 pr-3 min-w-0">
                            <div className="flex items-start gap-3 sm:gap-4">
                              <span className="bg-slate-100 border border-slate-200 text-slate-900 group-hover/item:bg-slate-900 group-hover/item:border-slate-900 group-hover/item:text-white font-black text-base sm:text-lg min-w-10 h-10 sm:min-w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300">
                                {item.quantidade}x
                              </span>

                              <div className="pt-0.5 min-w-0">
                                <p className="font-bold text-slate-900 text-base sm:text-[17px] leading-snug tracking-tight wrap-break-word">
                                  {item.produto.nome}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                                  <LucideIcons.Clock size={12} />
                                  {item.horaPedido ? formatarHora(item.horaPedido) : 'Agora'}
                                </p>
                              </div>
                            </div>

                            {item.observacao && (
                              <div className="mt-3 ml-13 sm:ml-15 bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex gap-2 items-start">
                                <LucideIcons.MessageSquare size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                <p className="text-xs sm:text-[13px] text-slate-600 font-medium leading-snug wrap-break-word">
                                  {item.observacao}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Checkbox */}
                          <div className="w-7 h-7 rounded-full border-3 border-slate-200 shrink-0 ml-2 group-hover/item:border-green-500 transition-colors duration-300" />
                        </button>
                      ))}

                      {/* ITENS PRONTOS */}
                      {itensProntos.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => contexto?.atualizarStatusCozinha(mesa.numero, item.id, 'pendente')}
                          className="w-full text-left bg-slate-50/50 p-4 sm:p-5 flex justify-between items-center opacity-60 hover:opacity-100 transition-all active:bg-slate-100"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-3">
                            <span className="text-slate-400 font-bold text-base sm:text-lg bg-slate-200 min-w-10 h-10 sm:min-w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0">
                              {item.quantidade}x
                            </span>
                            <p className="font-semibold text-slate-500 text-base sm:text-[17px] line-through tracking-tight truncate">
                              {item.produto.nome}
                            </p>
                          </div>

                          <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-green-500/40">
                            <LucideIcons.Check size={16} strokeWidth={3} />
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
    </div>
  );
}
