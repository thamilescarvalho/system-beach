// src/pages/MesasGarcom.tsx
import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';

export function MesasGarcom() {
  const contexto = useContext(AppContext);
  const navigate = useNavigate();
  
  const mesas = contexto?.mesas || [];
  const garcomLogado = contexto?.garcomLogado;

  // ESTADO DO MODAL
  const [alerta, setAlerta] = useState<string | null>(null);

  const dispararAlerta = (mensagem: string) => {
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    setAlerta(mensagem);
  };

  useEffect(() => {
    if (alerta) {
      const timer = setTimeout(() => setAlerta(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alerta]);


  const handleMesaClick = (numeroMesa: number, donoDaMesaId?: string) => {
    if (!donoDaMesaId) { navigate(`/comanda/${numeroMesa}`); return; }
    if (garcomLogado?.cargo === 'admin') { navigate(`/comanda/${numeroMesa}`); return; }
    if (garcomLogado?.id === donoDaMesaId) { navigate(`/comanda/${numeroMesa}`); return; }
    
    dispararAlerta('Esta mesa já está em atendimento por outro usuário.');
  };

  return (
    <div className="min-h-screen bg-slate-200 font-sans flex flex-col relative overflow-hidden perspective-distant">
      
      {/* HEADER GLOBAL */}
      <Header />

      {/* MODAL DE AVISO*/}
      {alerta && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-300">
          {/* Overlay - fechar ao clicar fora */}
          <div className="absolute inset-0" onClick={() => setAlerta(null)}></div>
          
          {/* Card do Modal */}
          <div className="bg-white p-7 rounded-4xl shadow-2xl border border-zinc-200 w-full max-w-75 relative z-10 flex flex-col items-center text-center animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            
            {/* Ícone de Cadeado */}
            <div className="w-15 h-15 rounded-full bg-fuchsia-50 flex items-center justify-center mb-5 border border-fuchsia-100 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-fuchsia-700">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            
            {/* Textos */}
            <h4 className="text-[17px] font-bold text-zinc-800 uppercase tracking-tight mb-2">Acesso negado</h4>
            <p className="text-[12px] font-medium text-zinc-500 leading-relaxed mb-5">
              {alerta}
            </p>

            {/* Botão de Fechar rápido */}
            <button 
              onClick={() => setAlerta(null)}
              className="w-25 bg-fuchsia-800 hover:bg-fuchsia-900 text-white font-bold py-1.5 rounded-2xl text-[12px] uppercase tracking-widest transition-all active:scale-95 shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* FUNDO ANIMADO */}
      <div className="fixed top-[-15%] left-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-15%] right-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* CONTEÚDO PRINCIPAL DA PÁGINA */}
      <main className="flex-1 w-full max-w-md mx-auto px-2 py-7 relative z-10 animate-in zoom-in-95 duration-500 transform-style-3d">
        <div className="grid grid-cols-2 gap-7 w-full">
          {mesas.map((mesa) => {
            const isOcupada = mesa.status === 'ocupada';
            const isBloqueada = isOcupada && mesa.garcomId !== garcomLogado?.id && garcomLogado?.cargo !== 'admin';
            const temAlerta = mesa.itens.some(item => item.statusCozinha === 'pronto');

            // ESTADO 1: MESA LIVRE
            let estiloBotao = "bg-white border border-slate-200 shadow-sm shadow-slate-200/50";
            let corTextoNum = "text-zinc-800";
            let iconeContainer = "bg-slate-50 border border-slate-100 text-zinc-500";
            let hoverEfeitos = "hover:-translate-y-1.5 hover:rotate-x-3 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300 active:scale-[0.96]";

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

                {/* ALERTA SINO */}
                {temAlerta && (
                  <div className="absolute -top-1 -right-1 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg shadow-black/20 animate-bounce z-20 border-[2.5px] border-emerald-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  </div>
                )}

                {/* BLOQUEIO CADEADO */}
                {isBloqueada && !temAlerta && (
                  <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-900/30 backdrop-blur-md flex items-center justify-center text-white shadow-inner border border-white/20 z-20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                )}

                {/* ÍCONE MESA */}
                <div className={`w-14 h-14 rounded-[20px] backdrop-blur-md flex items-center justify-center mb-3 relative z-10 transition-transform duration-300 ${!isBloqueada ? 'group-hover:-translate-y-1 group-hover:scale-110 group-hover:-translate-z-4' : ''} ${iconeContainer}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v20M2 10h20M12 2a8 8 0 0 1 8 8H4a8 8 0 0 1 8-8z"/>
                  </svg>
                </div>
                
                {/* TÍTULO DA MESA */}
                <h3 className={`text-[20px] font-black tracking-tighter relative z-10 ${corTextoNum}`}>
                  MESA {mesa.numero}
                </h3>
                
                {/* STATUS E CLIENTE */}
                {isOcupada && mesa.garcomNome ? (
                  <div className="flex flex-col items-center gap-2 mt-2 w-full px-1 relative z-10">
                    {mesa.nomeCliente && (
                      <span className="text-[11px] font-bold uppercase truncate w-full text-center text-white/90 drop-shadow-sm">
                        Cliente: {mesa.nomeCliente}
                      </span>
                    )}
                    <span className="text-[9px] font-bold uppercase bg-black/20 backdrop-blur-sm text-white px-3 py-1 rounded-full border border-white/10 mt-0.5 shadow-inner">
                      Garçom: {mesa.garcomNome}
                    </span>
                  </div>
                ) : (
                  <span className="mt-2 text-[9px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100/80 px-3 py-1 rounded-md border border-zinc-200 relative z-10 shadow-sm">
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