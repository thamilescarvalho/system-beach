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
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative overflow-hidden">
      
      {/* FUNDO (Glow Orbs Animados) */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-rose-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER SUPERIOR (Glassmorphism) */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between mb-6">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-600 active:scale-90 transition-all hover:bg-slate-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm leading-none">
            MESAS
          </h1>
          <p className="text-emerald-500 font-black uppercase tracking-[0.2em] text-[9px] mt-1">Mapa do Salão</p>
        </div>
        <div className="w-10" />
      </header>

      <main className="max-w-md mx-auto px-4 relative z-10 animate-in zoom-in-95 duration-500">
        <div className="grid grid-cols-2 gap-5">
          {mesas.map((mesa) => {
            const isOcupada = mesa.status === 'ocupada';
            const isBloqueada = isOcupada && mesa.garcomId !== garcomLogado?.id && garcomLogado?.cargo !== 'admin';
            const temAlerta = mesa.itens.some(item => item.statusCozinha === 'pronto');

            let estiloBotao = "bg-gradient-to-b from-white to-slate-100 border-slate-200 shadow-[0_8px_0_#cbd5e1,0_15px_20px_rgba(148,163,184,0.2)] active:shadow-[0_0px_0_#cbd5e1,0_0px_0_rgba(148,163,184,0)]";
            let corTexto = "text-slate-700";
            let iconeContainer = "bg-slate-100 border-slate-200 text-slate-400";

            if (temAlerta) {
              // VERDE ESMERALDA (Comida Pronta!)
              estiloBotao = "bg-gradient-to-b from-emerald-400 to-emerald-500 border-emerald-300 shadow-[0_8px_0_#047857,0_15px_20px_rgba(16,185,129,0.4)] active:shadow-[0_0px_0_#047857,0_0px_0_rgba(16,185,129,0)] ring-2 ring-emerald-300 ring-offset-2 ring-offset-slate-50";
              corTexto = "text-white";
              iconeContainer = "bg-white/25 border-white/40 shadow-inner";
            } else if (isOcupada) {
              // VERMELHO CORAL (Mesa Ocupada)
              estiloBotao = "bg-gradient-to-b from-rose-500 to-rose-700 border-rose-300 shadow-[0_8px_0_#be123c,0_15px_20px_rgba(225,29,72,0.3)] active:shadow-[0_0px_0_#be123c,0_0px_0_rgba(225,29,72,0)]";
              corTexto = "text-white";
              iconeContainer = "bg-white/40 border-white/20 shadow-inner";
            }

            return (
              <button
                key={mesa.id}
                onClick={() => handleMesaClick(mesa.numero, mesa.garcomId)}
                className={`group relative w-full h-44 rounded-[36px] border transition-all active:translate-y-2 flex flex-col items-center justify-center p-4
                  ${estiloBotao}
                  ${isBloqueada && !temAlerta ? 'opacity-80 saturate-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="absolute inset-0 bg-white/20 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* 🔔 ALERTA: SINO, COMIDA ESTIVER PRONTA */}
                {temAlerta && (
                  <div className="absolute -top-3 -right-3 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xl animate-bounce z-20 border-2 border-emerald-400 text-2xl">
                    🔔
                  </div>
                )}

                {/* 🔒 Ícone de Bloqueio (Cadeado) */}
                {isBloqueada && !temAlerta && (
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900/20 backdrop-blur-sm flex items-center justify-center text-white shadow-inner border border-white/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                )}

                {/* ÍCONE DA MESA  🏖️ */}
                <div className={`w-14 h-14 rounded-[20px] backdrop-blur-md flex items-center justify-center text-3xl mb-3 transition-transform duration-300 group-hover:-translate-y-1 ${iconeContainer}`}>
                  🏖️
                </div>
                
                <h3 className={`text-xl font-black tracking-tight drop-shadow-sm ${corTexto}`}>
                  MESA {mesa.numero}
                </h3>
                
                {isOcupada && mesa.garcomNome ? (
                  <div className="flex flex-col items-center gap-1.5 mt-1 w-full px-1">
                    {/* Nome do Cliente */}
                    {mesa.nomeCliente && (
                      <span className={`text-[11px] font-black truncate w-full drop-shadow-md ${temAlerta ? 'text-emerald-950' : 'text-rose-950'}`}>
                        {mesa.nomeCliente}
                      </span>
                    )}
                    {/* Tag com o Nome do Garçom */}
                    <span className="text-[9px] font-black uppercase tracking-widest bg-black/15 backdrop-blur-sm text-white px-3 py-1 rounded-full shadow-inner border border-white/10 mt-1">
                      {mesa.garcomNome}
                    </span>
                  </div>
                ) : (
                  <span className="mt-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full shadow-inner border border-slate-200">
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