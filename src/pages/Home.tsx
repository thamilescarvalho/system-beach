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
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* FUNDO  */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-amber-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER SUPERIOR */}
      <div className="absolute top-6 right-6 z-20">
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-3 bg-white/60 backdrop-blur-xl px-4 py-2.5 rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.05)] border border-white/80 active:scale-95 transition-all hover:bg-white/90"
        >
          <div className="w-9 h-9 rounded-full bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center text-lg shadow-inner border border-white">
            {usuario?.avatar}
          </div>
          <span className="font-black text-slate-800 text-sm tracking-tight">{usuario?.nome}</span>
          <div className="w-0.5 h-4 bg-slate-300 mx-1 rounded-full"></div>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-500 hover:text-rose-500 transition-colors"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>

      {/* LOGO & TÍTULO */}
      <div className="text-center mb-14 mt-16 relative z-10 animate-in slide-in-from-top-8 duration-700">
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm mb-3">
          BARRACA CORAL
        </h1>
        <div className="inline-block bg-slate-900 text-white px-5 py-1.5 rounded-full shadow-[inset_0_-2px_4px_rgba(0,0,0,0.4)] border border-slate-700">
          <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-green-200">Sistema Exclusivo</p>
        </div>
      </div>

      {/* PAINEL DE NAVEGAÇÃO CENTRAL*/}
      <div className="w-full max-w-sm space-y-6 relative z-10 animate-in zoom-in-95 duration-500 delay-150">
        
        {/* GRID SUPERIOR (Mesas e Bar) */}
        <div className="grid grid-cols-2 gap-5">
          
          {/* MESAS  🏖️ */}
          <button 
            onClick={() => navigate('/mesas')} 
            className="group relative w-full h-44 rounded-[50px] bg-linear-to-b from-emerald-400 to-emerald-600 border border-slate-100 shadow-[0_8px_0_#047857,0_15px_20px_rgba(16,185,129,0.4)] active:shadow-[0_0px_0_#047857,0_0px_0_rgba(16,185,129,0)] active:translate-y-2 transition-all flex flex-col items-center justify-center gap-3"
          >
            <div className="absolute inset-0 bg-white/20 rounded-[50px] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 rounded-[22px] bg-white/25 backdrop-blur-md shadow-inner border border-white/40 flex items-center justify-center text-4xl group-hover:-translate-y-2 transition-transform duration-300">
              🏖️
            </div>
            <span className="font-black text-white text-lg tracking-widest drop-shadow-md">MESAS</span>
          </button>

          {/* BAR / COZINHA */}
          <button 
            onClick={() => navigate('/cozinha')} 
            className="group relative w-full h-44 rounded-[50px] bg-linear-to-b from-yellow-400 to-yellow-600 border border-slate-100 shadow-[0_8px_0_#b45309,0_15px_20px_rgba(245,158,11,0.4)] active:shadow-[0_0px_0_#b45309,0_0px_0_rgba(245,158,11,0)] active:translate-y-2 transition-all flex flex-col items-center justify-center gap-3"
          >
            <div className="absolute inset-0 bg-white/20 rounded-[50px] opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 rounded-[22px] bg-white/25 backdrop-blur-md shadow-inner border border-white/40 flex items-center justify-center text-4xl group-hover:-translate-y-2 transition-transform duration-300">
              🍹
            </div>
            <span className="font-black text-white text-lg tracking-widest drop-shadow-md">BAR</span>
          </button>
        </div>

        {/* CAIXA DO GARÇOM */}
        <button 
          onClick={() => navigate('/painel')} 
          className="group relative w-full rounded-[50px] bg-linear-to-b from-indigo-600 to-indigo-800 border border-indigo-400 shadow-[0_8px_0_#3730a3,0_15px_20px_rgba(79,70,229,0.4)] active:shadow-[0_0px_0_#3730a3,0_0px_0_rgba(79,70,229,0)] active:translate-y-2 transition-all flex items-center p-6 gap-5"
        >
           <div className="absolute inset-0 bg-white/10 rounded-[50px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
           <div className="w-14 h-14 rounded-[20px] bg-white/20 backdrop-blur-md shadow-inner border border-white/30 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
             💰
           </div>
           <div className="text-left flex-1 relative z-10">
             <span className="block font-black text-white text-2xl tracking-tight drop-shadow-sm">CAIXA</span>
           </div>
           <div className="text-indigo-200 relative z-10 group-hover:translate-x-1 transition-transform">
             <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
           </div>
        </button>

        {/* ADMINISTRAÇÃO / GESTÃO */}
        {usuario?.cargo === 'admin' && (
          <button  
            onClick={() => navigate('/admin')} 
            className="group relative w-full rounded-[50px] bg-linear-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-[0_8px_0_#0f172a,0_15px_20px_rgba(0,0,0,0.5)] active:shadow-[0_0px_0_#0f172a,0_0px_0_rgba(0,0,0,0)] active:translate-y-2 transition-all flex items-center p-6 gap-5 mt-2"
          >
             <div className="absolute inset-0 bg-white/5 rounded-[50px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
             <div className="w-14 h-14 rounded-[20px] bg-white/10 backdrop-blur-md shadow-inner border border-white/20 text-white flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                🛠️
             </div>
             <div className="text-left flex-1 relative z-10">
               <span className="block font-black text-white text-2xl tracking-tight drop-shadow-sm">GESTÃO</span> 
             </div>
             <div className="text-slate-400 relative z-10 group-hover:translate-x-1 transition-transform group-hover:text-emerald-400">
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
             </div>
          </button>
        )}

      </div>
    </div>
  );
}