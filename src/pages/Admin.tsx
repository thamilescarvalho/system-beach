// src/pages/Admin.tsx
import { useNavigate } from 'react-router-dom';

export function Admin() {
  const navigate = useNavigate();

  const menuOptions = [
    { 
      title: 'FINANCEIRO', 
      subtitle: 'Caixa', 
      icon: '📊', 
      path: '/admin/financeiro', 
      classes: 'bg-gradient-to-b from-emerald-600 to-emerald-800 border-slate-200 shadow-[0_8px_0_#047857,0_15px_20px_rgba(79,70,229,0.4)] active:shadow-[0_0px_0_#047857,0_0px_0_rgba(79,70,229,0)]' 
    },
    { 
      title: 'ESTOQUE', 
      subtitle: 'Controle', 
      icon: '📦', 
      path: '/admin/estoque', 
      classes: 'bg-gradient-to-b from-indigo-600 to-indigo-800 border-slate-200 shadow-[0_8px_0_#3730a3,0_15px_20px_rgba(16,185,129,0.4)] active:shadow-[0_0px_0_#3730a3,0_0px_0_rgba(16,185,129,0)]' 
    },
    { 
      title: 'EQUIPE', 
      subtitle: 'Garçons & Acessos', 
      icon: '👥', 
      path: '/admin/equipe', 
      classes: 'bg-gradient-to-b from-yellow-400 to-yellow-800 border border-slate-100 shadow-[0_8px_0_#b45309,0_15px_20px_rgba(245,158,11,0.4)] active:shadow-[0_0px_0_#b45309,0_0px_0_rgba(245,158,11,0)]' 
    },
    { 
      title: 'SALÃO', 
      subtitle: 'Gestão de Mesas', 
      icon: '🏖️', 
      path: '/admin/mesas', 
      classes: 'bg-gradient-to-b from-red-400 to-red-800 border-slate-100 shadow-[0_8px_0_#be123c,0_15px_20px_rgba(225,29,72,0.3)] active:shadow-[0_0px_0_#be123c,0_0px_0_rgba(225,29,72,0)]' 
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative overflow-hidden">
      
      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-rose-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-600 active:scale-90 transition-all hover:bg-slate-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm leading-none">
            GESTÃO
          </h1>
          <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Painel Administrativo</p>
        </div>
        <div className="w-10" />
      </header>

      <main className="max-w-md mx-auto px-4 relative z-10 animate-in zoom-in-95 duration-500">
        
        {/* MENU */}
        <div className="grid grid-cols-2 gap-6">
          {menuOptions.map((opt) => (
            <button
              key={opt.title}
              onClick={() => navigate(opt.path)}
              className={`group relative w-full h-48 rounded-[36px] border transition-all active:translate-y-2 flex flex-col items-center justify-center p-4 ${opt.classes}`}
            >
              <div className="absolute inset-0 bg-white/20 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

              <div className="w-16 h-16 rounded-[22px] bg-white/25 backdrop-blur-md shadow-inner border border-white/40 flex items-center justify-center text-4xl group-hover:-translate-y-2 transition-transform duration-300 mb-3">
                {opt.icon}
              </div>
              
              {/* Textos */}
              <span className="font-black text-white text-lg tracking-widest drop-shadow-md mb-1">
                {opt.title}
              </span>
              <span className="text-[9px] font-bold text-white/80 uppercase tracking-widest drop-shadow-sm text-center px-2">
                {opt.subtitle}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}