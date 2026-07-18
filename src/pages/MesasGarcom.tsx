// src/pages/MesasGarcom.tsx
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';

export function MesasGarcom() {
  const contexto = useContext(AppContext);
  const navigate = useNavigate();
  
  const mesas = contexto?.mesas || [];
  const garcomLogado = contexto?.garcomLogado;

  const handleMesaClick = (numeroMesa: number, donoDaMesaId?: string) => {
    if (!donoDaMesaId) { navigate(`/comanda/${numeroMesa}`); return; }
    if (garcomLogado?.cargo === 'admin') { navigate(`/comanda/${numeroMesa}`); return; }
    if (garcomLogado?.id === donoDaMesaId) { navigate(`/comanda/${numeroMesa}`); return; }
    alert('Esta mesa já está em atendimento por outro colega.');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-24 relative overflow-hidden perspective-distant">
      
      {/* FUNDO */}
      <div className="fixed top-[-15%] left-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-15%] right-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* HEADER SUPERIOR*/}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-sm shadow-slate-200/50 px-6 py-4 flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 transition-all hover:bg-slate-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
          <h1 className="text-[25px] font-black text-slate-900 tracking-widest uppercase leading-none">
            MESAS
          </h1>
        </div>
        <div className="w-6" />
      </header>

      <main className="max-w-md mx-auto px-4 relative z-10 animate-in zoom-in-95 duration-500 transform-style-3d">
        <div className="grid grid-cols-2 gap-5">
          {mesas.map((mesa) => {
            const isOcupada = mesa.status === 'ocupada';
            const isBloqueada = isOcupada && mesa.garcomId !== garcomLogado?.id && garcomLogado?.cargo !== 'admin';
            const temAlerta = mesa.itens.some(item => item.statusCozinha === 'pronto');

            // ESTADO 1: MESA LIVRE
            let estiloBotao = "bg-white border border-slate-300 shadow-md shadow-slate-200/50";
            let corTextoNum = "text-slate-800";
            let iconeContainer = "bg-slate-50 border border-slate-200 text-slate-500";
            let hoverEfeitos = "hover:-translate-y-1.5 hover:rotate-x-3 hover:shadow-lg hover:shadow-slate-300/50 hover:border-slate-400 active:scale-[0.96]";

            if (temAlerta) {
              // ESTADO 2: COMIDA PRONTA 
              estiloBotao = "bg-gradient-to-b from-emerald-400 to-emerald-600 border border-emerald-600 border-t-emerald-300/50 shadow-xl shadow-emerald-500/40 animate-pulse";
              corTextoNum = "text-white drop-shadow-sm";
              iconeContainer = "bg-white/20 border border-white/30 text-white shadow-inner";
              hoverEfeitos = "hover:-translate-y-1.5 hover:rotate-x-3 hover:shadow-2xl hover:shadow-emerald-500/50 active:scale-[0.96]";
            
            } else if (isOcupada) {
              // ESTADO 3: OCUPADA PELO GARÇOM 
              estiloBotao = "bg-gradient-to-b from-fuchsia-500 to-fuchsia-700 border border-fuchsia-700 border-t-fuchsia-400/50 shadow-xl shadow-fuchsia-600/40";
              corTextoNum = "text-white drop-shadow-sm";
              iconeContainer = "bg-white/15 border border-white/20 text-white shadow-inner";
              hoverEfeitos = "hover:-translate-y-1.5 hover:rotate-x-3 hover:shadow-2xl hover:shadow-fuchsia-600/50 active:scale-[0.96]";
            }

            // Se for de outro garçom, tira a elevação
            if (isBloqueada && !temAlerta) {
              hoverEfeitos = "active:scale-[0.98]";
            }

            return (
              <button
                key={mesa.id}
                onClick={() => handleMesaClick(mesa.numero, mesa.garcomId)}
                className={`group relative w-full h-44 rounded-[36px] flex flex-col items-center justify-center p-4 overflow-hidden transform-style-3d transition-all duration-300 ease-out
                  ${estiloBotao}
                  ${hoverEfeitos}
                  ${isBloqueada && !temAlerta ? 'opacity-70 saturate-[0.6] cursor-not-allowed' : ''}
                `}
              >
                {!isBloqueada && (
                  <div className="absolute inset-0 bg-white/10 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                )}

                {/* 🔔 ALERTA: SINO */}
                {temAlerta && (
                  <div className="absolute -top-1 -right-1 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/20 animate-bounce z-20 border-2 border-emerald-400 text-xl">
                    🔔
                  </div>
                )}

                {/* 🔒 ÍCONE DE BLOQUEIO */}
                {isBloqueada && !temAlerta && (
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900/30 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/20 z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                )}

                {/* ÍCONE DA MESA 🏖️ */}
                <div className={`w-14 h-14 rounded-[22px] backdrop-blur-md flex items-center justify-center text-3xl mb-3 relative z-10 transition-transform duration-300 ${!isBloqueada ? 'group-hover:-translate-y-1 group-hover:scale-110 group-hover:-translate-z-4' : ''} ${iconeContainer}`}>
                  🏖️
                </div>
                
                {/* TÍTULO DA MESA */}
                <h3 className={`text-[22px] font-black tracking-tighter relative z-10 ${corTextoNum}`}>
                  MESA {mesa.numero}
                </h3>
                
                {/* STATUS E CLIENTE */}
                {isOcupada && mesa.garcomNome ? (
                  <div className="flex flex-col items-center gap-1.5 mt-1 w-full px-1 relative z-10">
                    {mesa.nomeCliente && (
                      <span className="text-[11px] font-bold truncate w-full text-center text-white/90 drop-shadow-sm">
                        {mesa.nomeCliente}
                      </span>
                    )}
                    <span className="text-[9px] font-black uppercase tracking-widest bg-black/20 backdrop-blur-sm text-white px-3 py-1 rounded-full border border-white/10 mt-0.5 shadow-inner">
                      {mesa.garcomNome}
                    </span>
                  </div>
                ) : (
                  <span className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100/80 px-3 py-1 rounded-md border border-slate-200 relative z-10 shadow-sm">
                    Livre
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}