// src/pages/Admin.tsx
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

export function Admin() {
  const navigate = useNavigate();

  const menuOptions = [
    { 
      title: 'Financeiro', 
      subtitle: 'Controle de Caixa', 
      icon: <LucideIcons.Wallet size={36} strokeWidth={1.5} />, 
      path: '/admin/financeiro',
      bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      shadow: 'shadow-teal-700/30 hover:shadow-teal-500/50'
    },
    { 
      title: 'Estoque', 
      subtitle: 'Gestão de Produtos', 
      icon: <LucideIcons.Box size={36} strokeWidth={1.5} />, 
      path: '/admin/estoque',
      bg: 'bg-gradient-to-br from-indigo-500 to-blue-600',
      shadow: 'shadow-blue-700/30 hover:shadow-blue-500/50'
    },
    { 
      title: 'Equipe', 
      subtitle: 'Garçons e Acessos', 
      icon: <LucideIcons.Users size={36} strokeWidth={1.5} />, 
      path: '/admin/equipe',
      bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      shadow: 'shadow-orange-700/30 hover:shadow-orange-500/50'
    },
    { 
      title: 'Salão', 
      subtitle: 'Gestão de Mesas', 
      icon: <LucideIcons.LayoutGrid size={36} strokeWidth={1.5} />, 
      path: '/admin/mesas',
      bg: 'bg-gradient-to-br from-rose-400 to-pink-600',
      shadow: 'shadow-rose-700/30 hover:shadow-rose-500/50'
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-100 font-sans selection:bg-blue-500/20 selection:text-blue-900 text-slate-900 flex flex-col relative overflow-hidden">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px', color: '#cbd5e1' }}></div>
      
      {/* LUZES DE FUNDO */}
      <div className="absolute top-[5%] -left-10 w-1/2 aspect-square max-w-3xl bg-cyan-100/60 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-[5%] -right-10 w-2/5 aspect-square max-w-xl bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-2xl border-b border-slate-200/60 shadow-sm shadow-slate-200/50 px-6 py-5 flex items-center justify-between shrink-0">
        <button 
          onClick={() => navigate('/')} 
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 active:scale-90 transition-all duration-300 shadow-sm"
        >
          <LucideIcons.ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        
        <div className="text-center flex flex-col items-center">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none flex items-center gap-2">
            ADMINISTRATIVO
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-md shadow-cyan-400/50"></span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1.5">
            Gestão Integrada
          </p>
        </div>
        
        <div className="w-12 h-12" />
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full max-w-5xl mx-auto px-12 md:px-8 pt-8 md:pt-15 pb-20 relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-500">
        
        <div className="mb-8 md:mb-10 flex flex-col items-center gap-3">
          <div className="h-1.5 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-sm mb-2"></div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-widest uppercase text-center">
            Módulos do Sistema
          </h2>
        </div>

        {/* GRID DE CARTÕES - 4 colunas no Desktop, 2 no Mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 w-full max-w-5xl mx-auto">
          {menuOptions.map((opt) => (
            <button
              key={opt.title}
              onClick={() => navigate(opt.path)}
              className={`
                group relative w-full aspect-square 
                ${opt.bg} rounded-[28px] md:rounded-[36px]
                border border-white/20
                flex flex-col items-center justify-center p-4 md:p-4 
                shadow-xl ${opt.shadow}
                hover:-translate-y-2 hover:shadow-2xl hover:scale-[1.02]
                active:scale-95 active:translate-y-0
                transition-all duration-400 ease-out overflow-hidden
              `}
            >
              
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-700 -translate-x-full group-hover:translate-x-full pointer-events-none z-0" />
              
              {/* CAIXA DO ÍCONE */}
              <div className={`
                relative z-10 w-16 h-16 md:w-20 md:h-20 mb-4 md:mb-6 rounded-[20px] md:rounded-[24px] 
                bg-white/10 backdrop-blur-md border border-white/30 text-white 
                flex items-center justify-center shadow-inner
                group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-white/20
                transition-all duration-400 ease-out
              `}>
                {opt.icon}
              </div>
              
              {/* TEXTOS */}
              <div className="text-center flex flex-col items-center w-full relative z-10 px-2">
                <span className="font-black text-white uppercase text-sm md:text-lg tracking-wide mb-1 drop-shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
                  {opt.title}
                </span>
                
                <span className="text-[9px] md:text-[11px] font-bold text-white/80 uppercase tracking-widest block truncate w-full transition-transform duration-300 group-hover:text-white">
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