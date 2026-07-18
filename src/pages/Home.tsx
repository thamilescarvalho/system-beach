// src/pages/Home.tsx
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export function Home() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  const usuario = contexto?.garcomLogado;

  const handleLogout = () => {
    contexto?.setGarcomLogado(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden perspective-distant">
      
      {/* FUNDO */}
      <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-fuchsia-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />

      {/* HEADER SUPERIOR */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-3 bg-white/60 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-md shadow-slate-200/60 border border-white/80 active:scale-95 transition-all hover:bg-white/90 hover:shadow-lg hover:shadow-slate-300/50"
        >
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center text-lg shadow-inner border border-white">
            {usuario?.avatar || '👤'}
          </div>
          <div className="flex flex-col items-start leading-none">
            <span className="font-black text-slate-900 text-sm tracking-tight">{usuario?.nome}</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{usuario?.cargo || 'Garçom'}</span>
          </div>
          <div className="w-0.5 h-4 bg-slate-200 mx-1 rounded-full"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-400 hover:text-rose-500 transition-colors"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      {/* LOGO & TÍTULO */}
      <div className="text-center mb-14 mt-12 relative z-10 animate-in slide-in-from-top-8 duration-700">
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-b from-slate-800 to-black tracking-tighter drop-shadow-sm mb-3">
          BARRACA CORAL
        </h1>
        <div className="bg-white text-slate-900 px-5 py-1.5 rounded-full shadow-sm border border-slate-200 flex items-center gap-1.5 justify-center mx-auto w-max">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">Sistema Exclusivo</p>
        </div>
      </div>

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
              🏖️
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
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner shadow-white/30 border border-white/30 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">
              🍹
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
             $
           </div>
           <div className="text-left flex-1 relative z-10">
             <span className="block font-black text-white text-[22px] tracking-wider drop-shadow-md">MEU CAIXA</span>
           </div>
           <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-teal-100 relative z-10 group-hover:translate-x-1 group-hover:bg-white group-hover:text-teal-700 transition-all duration-300">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
           </div>
        </button>

        {/*  GESTÃO */}
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
             <div className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-md shadow-inner shadow-white/10 border border-white/10 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shrink-0">
               🛠️
             </div>
             <div className="text-left flex-1 relative z-10">
               <span className="block font-black text-white text-[22px] tracking-wide drop-shadow-md">GESTÃO</span> 
             </div>
             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 relative z-10 transition-all duration-300 border border-transparent group-hover:translate-x-1 group-hover:bg-white group-hover:text-slate-700 group-hover:border-teal-400 shadow-md shadow-teal-500/20 group-hover:shadow-lg group-hover:shadow-teal-500/40">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
             </div>
          </button>
        )}

      </div>
    </div>
  );
}