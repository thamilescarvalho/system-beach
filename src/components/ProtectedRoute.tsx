// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const contexto = useAppContext();

  // Se o link de confirmação de e-mail do Supabase cair na rota raiz (/), preserva o hash e redireciona para /login
  const hashAtual = typeof window !== 'undefined' ? window.location.hash : '';
  const searchAtual = typeof window !== 'undefined' ? window.location.search : '';
  const veioDeConfirmacaoEmail =
    hashAtual.includes('type=signup') ||
    hashAtual.includes('access_token=') ||
    searchAtual.includes('confirmado=sucesso') ||
    searchAtual.includes('token_hash=');

  if (veioDeConfirmacaoEmail) {
    return <Navigate to={`/login?confirmado=sucesso${hashAtual}`} replace />;
  }

  if (!contexto || contexto.carregandoContexto) {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center font-sans relative overflow-hidden p-4 pt-safe pb-safe">
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(224, 231, 255, 0.7) 0%, rgba(255, 241, 242, 0) 70%)' }}
        />

        <div className="relative z-10 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin shadow-lg" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
            Sincronizando...
          </p>
        </div>
      </div>
    );
  }

  if (!contexto.garcomLogado) {
    return <Navigate to="/login" replace />;
  }

  if (!contexto.verificarAcessoLiberado()) {
    return <Navigate to="/assinatura-pendente" replace />;
  }

  return <>{children}</>;
}
