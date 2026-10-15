// src/pages/Admin.tsx
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header'; 

export function Admin() {
  const navigate = useNavigate();

  const menuOptions = [
    { 
      title: 'Financeiro', 
      icon: <LucideIcons.Wallet size={24} strokeWidth={2.5} className="text-white" />, 
      path: '/admin/financeiro',
      bg: 'from-green-600 to-green-950 border-green-600/50',
      shadow: 'shadow-green-100/30 hover:shadow-green-100/50'
    },
    { 
      title: 'Estoque',  
      icon: <LucideIcons.Box size={24} strokeWidth={2.5} className="text-white" />, 
      path: '/admin/estoque',
      bg: 'from-cyan-600 to-cyan-950 border-cyan-600/50',
      shadow: 'shadow-cyan-100/30 hover:shadow-cyan-100/50'
    },
    { 
      title: 'Equipe', 
      icon: <LucideIcons.Users size={24} strokeWidth={2.5} className="text-white" />, 
      path: '/admin/equipe',
      bg: 'from-slate-600 to-slate-950 border-slate-700/60',
      shadow: 'shadow-slate-100/30 hover:shadow-slate-100/50'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative overflow-hidden">
      
      {/* HEADER*/}
      <Header />

      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-lg max-h-lg bg-cyan-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-lg max-h-lg bg-blue-400/10 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000" />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 md:pl-24 relative z-10">
        
        {/* Título */}
        <div className="mb-6 md:mb-10 flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center gap-2 text-slate-500">
            <LucideIcons.ShieldCheck size={17} strokeWidth={2} className="text-slate-400" />
            <h1 className="text-[14px] md:text-xl font-sans tracking-widest uppercase text-center">
              Gestão Integrada
            </h1>
          </div>
        </div>

        {/* BOTÕES */}
        <div className="w-full relative z-10 animate-in zoom-in-95 duration-500 mx-auto max-w-[320px] md:max-w-187.5">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            {menuOptions.map((opt) => (
              <button
                key={opt.title}
                onClick={() => navigate(opt.path)}
                className={`
                  group relative w-full aspect-square rounded-3xl md:rounded-4xl
                  bg-linear-to-br ${opt.bg} border
                  shadow-xl ${opt.shadow}
                  hover:-translate-y-1 hover:shadow-2xl 
                  active:scale-95 active:translate-y-0
                  transition-all duration-300 ease-out flex flex-col items-center justify-center gap-2.5 overflow-hidden
                `}
              >
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* CAIXA DO ÍCONE */}
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-white/20 backdrop-blur-md shadow-inner border border-white/40 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 relative z-10">
                  {opt.icon}
                </div>
                
                {/* TEXTOS */}
                <div className="text-center flex flex-col items-center w-full relative z-10 px-2">
                  <span className="font-bold text-white text-[11px] md:text-[12px] tracking-widest uppercase mb-0.5">
                    {opt.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}