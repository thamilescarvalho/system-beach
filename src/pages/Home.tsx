// src/pages/Home.tsx
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header'; 

export function Home() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  const usuario = contexto?.garcomLogado;

  return (
    <div className="min-h-screen bg-slate-200 font-sans flex flex-col relative overflow-hidden perspective-distant">
      
      {/* HEADER GLOBAL */}
      <Header />

      {/* FUNDO ANIMADO */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-fuchsia-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm space-y-5 relative z-10 animate-in zoom-in-95 duration-500 delay-150 transform-style-3d">
          {/* GRID SUPERIOR (Mesas e Bar) */}
          <div className="grid grid-cols-2 gap-5">
    
            {/* MESAS */}
            <button 
              onClick={() => navigate('/mesas')} 
              className="group relative w-full h-42 rounded-[36px] bg-linear-to-b from-fuchsia-600 to-fuchsia-800 border border-fuchsia-700 border-t-fuchsia-400/40 
                         shadow-xl shadow-fuchsia-600/50 
                         hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-2xl hover:shadow-fuchsia-600/60
                         active:scale-[0.96] active:translate-y-0 active:shadow-inner active:shadow-black/30 
                         transition-all duration-300 ease-out flex flex-col items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner shadow-white/30 border border-white/30 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide text-white/90 lucide-parasol-icon lucide-parasol"><path d="M12.5 11.134 18.196 21"/><path d="M20.425 5.299a10 10 0 0 0-16.941 9.78c.183.563.843.774 1.355.478L20.16 6.711c.512-.296.66-.973.264-1.413"/><path d="M21 21H3"/></svg>
              </div>
              <span className="font-black text-white text-[15px] tracking-widest uppercase drop-shadow-md">Mesas</span>
            </button>

            {/* BAR / COZINHA */}
            <button 
              onClick={() => navigate('/cozinha')} 
              className="group relative w-full h-42 rounded-[36px] bg-linear-to-b from-yellow-500 to-amber-600 border border-amber-600 border-t-yellow-300/40 
                         shadow-xl shadow-amber-600/40 
                         hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-600/60
                         active:scale-[0.96] active:translate-y-0 active:shadow-inner active:shadow-black/30 
                         transition-all duration-300 ease-out flex flex-col items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner shadow-white/30 border border-white/50 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide text-white/90 lucide-bottle-wine-icon lucide-bottle-wine"><path d="M10 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a6 6 0 0 0 1.2 3.6l.6.8A6 6 0 0 1 17 13v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8a6 6 0 0 1 1.2-3.6l.6-.8A6 6 0 0 0 10 5z"/><path d="M17 13h-4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h4"/></svg>
              </div>
              <span className="font-black text-white text-[15px] tracking-widest uppercase drop-shadow-md">Bar</span>
            </button>
          </div>

          {/* CAIXA DO GARÇOM */}
          <button 
            onClick={() => navigate('/painel')} 
            className="group relative w-full rounded-[36px] bg-linear-to-b from-teal-500 to-teal-700 border border-teal-700 border-t-teal-400/40  
                       shadow-xl shadow-teal-600/40 
                       hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-2xl hover:shadow-teal-600/50
                       active:scale-[0.98] active:translate-y-0 active:shadow-inner active:shadow-black/30 
                       transition-all duration-300 ease-out flex items-center p-5 gap-5 overflow-hidden"
          >
             <div className="absolute inset-0 bg-white/10 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
             <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner shadow-white/30 border border-white/30 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shrink-0">
             {/*  ÍCONE MEU CAIXA */}
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wallet-icon lucide-wallet"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
             </div>
             <div className="text-left flex-1 relative z-10">
               <span className="block font-black text-white/90 text-[20px] uppercase tracking-wider drop-shadow-md">MEU CAIXA</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-teal-100 relative z-10 group-hover:translate-x-1 group-hover:bg-white group-hover:text-teal-700 transition-all duration-300">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
             </div>
          </button>

          {/*  GESTÃO (Apenas para Admins) */}
          {usuario?.cargo === 'admin' && (
            <button  
              onClick={() => navigate('/admin')} 
              className="group relative w-full rounded-[36px] bg-linear-to-b from-slate-800 to-slate-950 border border-slate-900 border-t-slate-700/40 
                         shadow-xl shadow-slate-950/50 
                         hover:-translate-y-1.5 hover:scale-[1.02] hover:shadow-2xl hover:shadow-slate-950/60
                         active:scale-[0.98] active:translate-y-0 active:shadow-inner active:shadow-black/50 
                         transition-all duration-300 ease-out flex items-center p-5 gap-5 overflow-hidden"
            >
               <div className="absolute inset-0 bg-white/5 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
               <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-md shadow-inner shadow-white/10 border border-white/30 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shrink-0">
               {/*  ÍCONE ADMIN */}
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="lucide text-white/90 lucide-shield-check-icon lucide-shield-check"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
               </div>
               <div className="text-left flex-1 relative z-10">
                 <span className="block font-black text-white/90 text-[20px] uppercase tracking-wide drop-shadow-md">Administração</span> 
               </div>
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 relative z-10 transition-all duration-300 border border-transparent group-hover:translate-x-1 group-hover:bg-white group-hover:text-slate-700 group-hover:border-teal-400 shadow-md shadow-teal-500/20 group-hover:shadow-lg group-hover:shadow-teal-500/40">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
               </div>
            </button>
          )}

        </div>
      </main>
    </div>
  );
}