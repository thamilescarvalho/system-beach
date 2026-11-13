// src/pages/Cozinha.tsx
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import type { Mesa, ItemComanda } from '../types';
import * as LucideIcons from 'lucide-react';

export function Cozinha() {
  const contexto = useContext(AppContext);

  const mesas: Mesa[] = contexto?.mesas || [];
  const mesasAtivas = mesas.filter((m) => m.status === 'ocupada' && m.itens.length > 0);

  const formatarHora = (iso: string) => {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };


  const avancarStatusItem = (numeroMesa: number, item: ItemComanda) => {
    if (!contexto?.atualizarStatusCozinha) return;

    if (item.statusCozinha === 'pendente' || !item.statusCozinha) {
      contexto.atualizarStatusCozinha(numeroMesa, item.id, 'preparo');
    } else if (item.statusCozinha === 'preparo') {
      contexto.atualizarStatusCozinha(numeroMesa, item.id, 'pronto');
    } else if (item.statusCozinha === 'pronto') {
      contexto.atualizarStatusCozinha(numeroMesa, item.id, 'pendente');
    }
  };

  return (
    <div className="min-h-dvh bg-slate-100 font-sans text-slate-700 antialiased selection:bg-emerald-600 selection:text-white">
      <Header />

      <div className="pt-20 md:pt-24 pb-28 md:pb-20 md:pl-20 flex flex-col items-center w-full">
        <main className="w-full max-w-6xl mx-auto px-5 sm:px-6">
          {/* BARRA SUPERIOR KDS: STATUS ONLINE */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-7 bg-white/90 border border-slate-300 rounded-full px-1 py-2 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xs font-sans text-slate-800 uppercase tracking-wider">
                Fila de Pedidos
              </h2>
            </div>

            
          </div>

          {mesasAtivas.length === 0 ? (
            <div className="w-full bg-white border border-slate-200/80 rounded-2xl py-20 sm:py-24 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-300 shadow-xs mt-2">
              <div className="w-16 h-16 bg-slate-100 border border-slate-200/70 text-slate-400 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <LucideIcons.ChefHat size={32} strokeWidth={1.6} />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-slate-800 tracking-tight mb-1">
                Bar e Cozinha Livres
              </h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Nenhum pedido pendente na fila no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-10 items-start">
              {mesasAtivas.map((mesa) => {
                const itensPendentes = mesa.itens.filter((i) => i.statusCozinha === 'pendente');
                const itensPreparo = mesa.itens.filter((i) => i.statusCozinha === 'preparo');
                const itensProntos = mesa.itens.filter((i) => i.statusCozinha === 'pronto');

                if (
                  itensPendentes.length === 0 &&
                  itensPreparo.length === 0 &&
                  itensProntos.length === 0
                ) {
                  return null;
                }

                const isTotalmentePronto =
                  itensPendentes.length === 0 && itensPreparo.length === 0;
                const isEmPreparo =
                  !isTotalmentePronto && itensPreparo.length > 0 && itensPendentes.length === 0;
                const itensAbertos = [...itensPendentes, ...itensPreparo];
                const numeroFormatado = String(mesa.numero).padStart(2, '0');

                return (
                  <div
                    key={mesa.id}
                    className={`bg-slate-200/85 rounded-2xl p-1 transition-all duration-200 flex flex-col shadow-xs border ${
                      isTotalmentePronto
                        ? 'border-emerald-400/80 bg-emerald-50/40'
                        : isEmPreparo
                          ? 'border-amber-300/90 bg-amber-50/30'
                          : 'border-slate-200/90'
                    }`}
                  >
                    {/* CABEÇALHO DO CARD DA MESA */}
                    <div className="bg-slate-400 rounded-2xl px-4 py-3 mb-1.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-9 h-9 rounded-xl bg-slate-600 text-white text-[13px] font-semibold flex items-center justify-center shrink-0 tabular-nums shadow-2xs">
                          {numeroFormatado}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h2 className="text-[12px] font-bold text-slate-100 uppercase tracking-tight truncate">
                              {mesa.nomeCliente?.trim() || `Mesa ${numeroFormatado}`}
                            </h2>
                          </div>
                          <p className="text-[11px] font-semibold uppercase text-slate-700 truncate">
                            Atendente: <span className="text-white font-bold">{mesa.garcomNome || 'Equipe'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Status Geral da Mesa */}
                      {isTotalmentePronto ? (
                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <LucideIcons.Check size={12} strokeWidth={2.5} />
                          <span>Pronto</span>
                        </span>
                      ) : isEmPreparo ? (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <LucideIcons.Flame size={12} className="text-amber-600" />
                          <span>Preparo</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold bg-slate-700 text-white px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shrink-0">
                          <span>Recebido</span>
                        </span>
                      )}
                    </div>

                    {/* LISTA DE ITENS DA MESA */}
                    <div className="space-y-2.5">
                      {/* ITENS RECEBIDOS / EM PREPARO */}
                      {itensAbertos.map((item) => {
                        const emPreparo = item.statusCozinha === 'preparo';
                        return (
                          <div
                            key={item.id}
                            onClick={() => avancarStatusItem(mesa.numero, item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                avancarStatusItem(mesa.numero, item);
                              }
                            }}
                            className={`w-full text-left px-4 py-2 rounded-3xl border transition-all duration-150 flex items-center justify-between gap-2.5 cursor-pointer select-none active:scale-[0.99] ${
                              emPreparo
                                ? 'bg-amber-50/90 border-amber-300/90 shadow-2xs'
                                : 'bg-white hover:bg-slate-200/80 border-slate-200/70 shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {/* Quantidade */}
                              <span
                                className={`text-xs font-semibold w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 border tabular-nums transition-colors ${
                                  emPreparo
                                    ? 'bg-amber-200/80 border-amber-300 text-amber-800'
                                    : 'bg-slate-100 border-slate-200/80 text-slate-800'
                                }`}
                              >
                                {item.quantidade}x
                              </span>

                              {/* Nome do Item + Hora e Status */}
                              <div className="min-w-0 flex-1">
                                <p className="text-[12px] sm:text-sm font-medium text-slate-800 truncate uppercase tracking-tight">
                                  {item.produto.nome}
                                </p>

                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                  <span className="inline-flex items-center gap-1 tabular-nums">
                                    <LucideIcons.Clock size={10} />
                                    {item.horaPedido ? formatarHora(item.horaPedido) : 'Agora'}
                                  </span>
                                  <span>•</span>
                                  {emPreparo ? (
                                    <span className="font-semibold text-amber-700 inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                      Em preparo
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">Aguardando</span>
                                  )}
                                </div>

                                {item.observacao && (
                                  <div className="mt-1.5 bg-white/90 border border-slate-200/80 px-2.5 py-1 rounded-xl flex gap-1.5 items-center">
                                    <LucideIcons.MessageSquare
                                      size={11}
                                      className="text-amber-600 shrink-0"
                                    />
                                    <p className="text-[11px] text-slate-600 truncate">
                                      {item.observacao}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ÚNICA BOLINHA SELETORA DE STATUS */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                avancarStatusItem(mesa.numero, item);
                              }}
                              title={
                                emPreparo
                                  ? 'Toque para marcar como Pronto'
                                  : 'Toque para iniciar preparo'
                              }
                              aria-label={
                                emPreparo
                                  ? 'Marcar item como pronto'
                                  : 'Colocar item em preparo'
                              }
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-90 cursor-pointer ${
                                emPreparo
                                  ? 'bg-amber-400 hover:bg-emerald-500 text-slate-700 hover:text-white border-2 border-amber-500 hover:border-emerald-500 shadow-xs'
                                  : 'bg-white hover:bg-amber-50 text-slate-300 hover:text-amber-500 border-2 border-slate-300 hover:border-amber-400'
                              }`}
                            >
                              {emPreparo ? (
                                <LucideIcons.Flame size={16} strokeWidth={2.2} />
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-slate-200 group-hover:bg-amber-400 transition-colors" />
                              )}
                            </button>
                          </div>
                        );
                      })}

                      {/* ITENS PRONTOS */}
                      {itensProntos.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => avancarStatusItem(mesa.numero, item)}
                          title="Toque caso precise voltar o item para a fila"
                          className="w-full text-left bg-white/70 hover:bg-white px-3.5 py-2.5 rounded-3xl border border-slate-200/60 flex justify-between items-center gap-2.5 opacity-75 hover:opacity-100 transition-all active:scale-[0.99] cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="text-slate-400 font-semibold text-xs bg-slate-100 border border-slate-200/70 w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 tabular-nums">
                              {item.quantidade}x
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-slate-400 text-xs sm:text-sm line-through truncate uppercase">
                                {item.produto.nome}
                              </p>
                              <span className="text-[10px] text-slate-600 font-medium">
                                Pronto para servir
                              </span>
                            </div>
                          </div>

                          <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <LucideIcons.Check size={16} strokeWidth={2.8} />
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
