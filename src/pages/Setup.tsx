// src/pages/Setup.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

export function Setup() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/cadastro', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-6 sm:p-10 rounded-4xl shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-500 relative z-10 text-center">
        <div className="w-20 h-20 bg-linear-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-emerald-500/20">
          <LucideIcons.Rocket size={36} strokeWidth={2} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          Setup do Workspace
        </h1>
        <p className="text-slate-400 font-medium text-xs sm:text-sm leading-relaxed mb-8">
          Redirecionando para o assistente de criação de conta corporativa Multi-Tenant...
        </p>

        <button
          type="button"
          onClick={() => navigate('/cadastro', { replace: true })}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl uppercase tracking-widest transition-all active:scale-95 text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <span>Ir para Cadastro Agora</span>
          <LucideIcons.ArrowRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
