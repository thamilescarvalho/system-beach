// src/pages/Cozinha.tsx
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import * as LucideIcons from 'lucide-react';

interface ProdutoResumo {
  id: number;
  nome: string;
}

interface ItemComanda {
  id: string;
  statusCozinha?: string;
  quantidade: number;
  horaPedido?: string;
  observacao?: string;
  produto: ProdutoResumo;
  [key: string]: unknown;
}

interface Mesa {
  id: number | string;
  numero: number;
  status: string;
  garcomId?: string;
  garcomNome?: string;
  nomeCliente?: string;
  itens: ItemComanda[];
}

export function Cozinha() {
  const contexto = useContext(AppContext);
  
  const mesas = Array.isArray(contexto?.mesas)
    ? (contexto?.mesas as unknown as Mesa[])
    : [];

  const mesasAtivas = mesas.filter(m => m.status === 'ocupada' && m.itens.length > 0);
  
  const formatarHora = (iso: string) => {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-200/50 font-sans text-slate-900 selection:bg-green-500 selection:text-white">
      
      <Header />

      <div className="pt-20 md:pt-24 pb-28 md:pb-8 md:pl-18 flex flex-col items-center w-full">
        <main className="w-full max-w-6xl mx-auto px-10 md:px-6">
          
          <div className="flex items-center justify-center-safe mb-6 px-20">
            <div className="flex place-items-center gap-5">
              <h2 className="text-[11px] md:text-base font-sans text-slate-900 uppercase tracking-widest">Recebendo Pedidos</h2>
              <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-white bg-slate-800 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
              </span>
            </div>
          </div>

          {mesasAtivas.length === 0 ? (
            <div className="w-full bg-white border border-slate-300 rounded-3xl py-24 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500 shadow-sm mt-4">
              <div className="w-24 h-24 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <LucideIcons.ChefHat size={48} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-sans text-slate-900 tracking-tight mb-2">Cozinha Livre</h3>
              <p className="text-sm font-sans text-slate-500 max-w-xs">Nenhum pedido na fila. A praça está organizada e limpa.</p>
            </div>
          ) : (
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
              {mesasAtivas.map(mesa => {
                const itensPendentes = mesa.itens.filter(i => i.statusCozinha === 'pendente');
                const itensProntos = mesa.itens.filter(i => i.statusCozinha === 'pronto');

                if (itensPendentes.length === 0 && itensProntos.length === 0) return null;

                const isTotalmentePronto = itensPendentes.length === 0;

                return (
                  <div 
                    key={mesa.id} 
                    className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 ease-out transform hover:-translate-y-1.5 hover:shadow-xl flex flex-col group ${
                      isTotalmentePronto 
                        ? 'border-2 border-green-500 shadow-[0_8px_30px_rgba(34,197,94,0.15)]' 
                        : 'border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    
                    {/* CABEÇALHO DO TICKET */}
                    <div className="p-5 flex justify-between items-start border-b border-slate-100 bg-white">
                      <div>
                        <h2 className="text-[28px] font-black tracking-tighter text-slate-900 leading-none mb-3">
                          MESA {mesa.numero}
                        </h2>
                        
                        <div className="flex flex-col gap-2">
                          {mesa.nomeCliente && (
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded w-max flex items-center gap-1.5">
                              <LucideIcons.User size={12} className="text-slate-400" />
                              {mesa.nomeCliente}
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Atendente: <span className="text-slate-700">{mesa.garcomNome || 'Sistema'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Badge */}
                      {isTotalmentePronto ? (
                        <span className="text-[10px] font-black bg-green-50 text-green-600 border border-green-200 px-3.5 py-2 rounded-xl uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <LucideIcons.Check size={14} strokeWidth={3} /> Pronto
                        </span>
                      ) : (
                        <span className="text-[10px] font-black bg-slate-900 text-white px-3.5 py-2 rounded-xl uppercase tracking-widest shadow-md flex items-center gap-1.5">
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
                          onClick={() => contexto?.atualizarStatusCozinha(mesa.numero, item.id, 'pronto')}
                          className="w-full text-left bg-white hover:bg-slate-50 p-5 flex justify-between items-center transition-all duration-200 active:bg-slate-100 group/item"
                        >
                          <div className="flex-1 pr-4">
                            <div className="flex items-start gap-4">
                              <span className="bg-slate-100 border border-slate-200 text-slate-900 group-hover/item:bg-slate-900 group-hover/item:border-slate-900 group-hover/item:text-white font-black text-lg min-w-[44px] h-[44px] rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300">
                                {item.quantidade}x
                              </span>
                              
                              <div className="pt-0.5">
                                <p className="font-bold text-slate-900 text-[17px] leading-snug tracking-tight">{item.produto.nome}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1">
                                  <LucideIcons.Clock size={12} />
                                  {item.horaPedido ? formatarHora(item.horaPedido) : 'Agora'}
                                </p>
                              </div>
                            </div>
                            
                            {item.observacao && (
                              <div className="mt-3 ml-[60px] bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex gap-2 items-start">
                                <LucideIcons.MessageSquare size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                <p className="text-[13px] text-slate-600 font-medium leading-snug">
                                  {item.observacao}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Checkbox */}
                          <div className="w-7 h-7 rounded-full border-[3px] border-slate-200 shrink-0 ml-2 group-hover/item:border-green-500 transition-colors duration-300"></div>
                        </button>
                      ))}

                      {/* ITENS PRONTOS */}
                      {itensProntos.map(item => (
                        <button 
                          key={item.id}
                          onClick={() => contexto?.atualizarStatusCozinha(mesa.numero, item.id, 'pendente')}
                          className="w-full text-left bg-slate-50/50 p-5 flex justify-between items-center opacity-60 hover:opacity-100 transition-all active:bg-slate-100"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-slate-400 font-bold text-lg bg-slate-200 min-w-[44px] h-[44px] rounded-xl flex items-center justify-center shrink-0">
                              {item.quantidade}x
                            </span>
                            <p className="font-semibold text-slate-500 text-[17px] line-through tracking-tight">{item.produto.nome}</p>
                          </div>
                          
                          {/* Checkbox Preenchido */}
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