// src/pages/Admin.tsx
import { useNavigate } from 'react-router-dom';

export function Admin() {
  const navigate = useNavigate();

  const menuOptions = [
    { 
      title: 'FINANCEIRO', 
      subtitle: 'Caixa', 
      icon: '$', 
      path: '/admin/financeiro', 
      classes: 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-600 border-t-emerald-300/60 shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40' 
    },
    { 
      title: 'ESTOQUE', 
      subtitle: 'Controle', 
      icon: '📦', 
      path: '/admin/estoque', 
      classes: 'bg-gradient-to-b from-indigo-400 to-indigo-600 border-indigo-600 border-t-indigo-300/60 shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/40' 
    },
    { 
      title: 'EQUIPE', 
      subtitle: 'Garçons & Acessos', 
      icon: '👥', 
      path: '/admin/equipe', 
      classes: 'bg-gradient-to-b from-amber-400 to-amber-600 border-amber-600 border-t-amber-300/60 shadow-lg shadow-amber-600/30 hover:shadow-xl hover:shadow-amber-600/40' 
    },
    { 
      title: 'SALÃO', 
      subtitle: 'Gestão de Mesas', 
      icon: '🏖️', 
      path: '/admin/mesas', 
      classes: 'bg-gradient-to-b from-rose-400 to-rose-600 border-rose-600 border-t-rose-300/60 shadow-lg shadow-rose-600/30 hover:shadow-xl hover:shadow-rose-600/40' 
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-200 font-sans pb-24 relative overflow-hidden perspective-[1200px]">
      
      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-sm shadow-slate-200/50 px-4 md:px-8 py-4 flex items-center justify-between mb-8">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 active:shadow-inner transition-all hover:bg-slate-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
          <h1 className="text-[20px] font-black text-slate-900 tracking-widest uppercase leading-none drop-shadow-sm">
            GESTÃO
          </h1>
          <p className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Painel Administrativo</p>
        </div>
        <div className="w-10" />
      </header>

      {/* DESKTOP */}
      <main className="w-full max-w-5xl mx-auto px-13 md:px-7 relative z-10 animate-in zoom-in-95 duration-500 transform-style-3d">
        
        {/* MENU GRID: 2 colunas no celular, 4 colunas no computador */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-5">
          {menuOptions.map((opt) => (
            <button
              key={opt.title}
              onClick={() => navigate(opt.path)}
              className={`group relative w-full h-44 sm:h-52 rounded-[36px] border hover:-translate-y-1.5 active:scale-[0.96] active:translate-y-0 active:shadow-inner transition-all duration-300 ease-out flex flex-col items-center justify-center p-4 overflow-hidden transform-style-3d ${opt.classes}`}
            >
              <div className="absolute inset-0 bg-white/20 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* ÍCONE*/}
              <div className="w-14 h-14 text-green-100 sm:w-16 sm:h-16 rounded-[20px] sm:rounded-[24px] bg-white/20 backdrop-blur-md shadow-inner shadow-white/40 border border-white/30 flex items-center justify-center text-3xl sm:text-4xl group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 mb-3 sm:mb-4 relative z-10">
                {opt.icon}
              </div>
              
              {/* TEXTOS */}
              <div className="relative z-10 text-center flex flex-col items-center">
                <span className="font-black text-white text-[13px] sm:text-[15px] tracking-widest drop-shadow-md mb-1 uppercase">
                  {opt.title}
                </span>
                <span className="text-[8px] sm:text-[9px] font-bold text-white/90 uppercase tracking-widest drop-shadow-sm px-2">
                  {opt.subtitle}
                </span>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}