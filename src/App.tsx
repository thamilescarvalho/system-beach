// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';

import { AppProvider } from './context/AppProvider';
import { useAppContext } from './context/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Páginas
import { LandingPage } from './pages/LandingPage';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { Cadastro } from './pages/Cadastro';
import { Home } from './pages/Home';
import { MesasGarcom } from './pages/MesasGarcom';
import { Comanda } from './pages/Comanda';
import { Painel } from './pages/Painel';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { AdminUsuarios } from './pages/AdminUsuarios';
import { AdminFinanceiro } from './pages/AdminFinanceiro';
import { AdminImpressora } from './pages/AdminImpressora';
import { AdminAssinatura } from './pages/AdminAssinatura';
import { AdminAssinaturaRenovar } from './pages/AdminAssinaturaRenovar';
import { Estoque } from './pages/Estoque';
import { Cozinha } from './pages/Cozinha';
import { AssinaturaPendente } from './pages/AssinaturaPendente';
import { MeuPerfil } from './pages/MeuPerfil';

function AdminRoute({ children }: { children: ReactNode }) {
  const contexto = useAppContext();
  const cargo = contexto.garcomLogado?.cargo;

  if (cargo !== 'admin' && cargo !== 'super_admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: ReactNode }) {
  const contexto = useAppContext();

  if (contexto.carregandoContexto) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!contexto.garcomLogado || contexto.garcomLogado.cargo !== 'super_admin') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const contexto = useAppContext();

  if (contexto.carregandoContexto) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!contexto.garcomLogado) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RootRoute() {
  const contexto = useAppContext();

  // Preserva recuperação de senha e confirmação de e-mail do Supabase
  const hashAtual = typeof window !== 'undefined' ? window.location.hash : '';
  const searchAtual = typeof window !== 'undefined' ? window.location.search : '';
  const veioDeRecuperacaoSenha =
    hashAtual.includes('type=recovery') ||
    searchAtual.includes('type=recovery') ||
    searchAtual.includes('modo=redefinir-senha');

  if (veioDeRecuperacaoSenha) {
    const queryExtra = searchAtual ? `${searchAtual}&modo=redefinir-senha` : '?modo=redefinir-senha';
    return <Navigate to={`/login${queryExtra}${hashAtual}`} replace />;
  }

  const veioDeConfirmacaoEmail =
    hashAtual.includes('type=signup') ||
    hashAtual.includes('access_token=') ||
    searchAtual.includes('confirmado=sucesso') ||
    searchAtual.includes('token_hash=');

  if (veioDeConfirmacaoEmail) {
    return <Navigate to={`/login?confirmado=sucesso${hashAtual}`} replace />;
  }

  if (contexto.carregandoContexto) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-slate-800 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  // Visitantes não autenticados veem a Landing Page comercial
  if (!contexto.garcomLogado) {
    return <LandingPage />;
  }

  return (
    <ProtectedRoute>
      <Home />
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* ROTAS PÚBLICAS */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />

          {/* TELA DE PENDÊNCIA (Requer login, mas não requer licença ativa) */}
          <Route path="/assinatura-pendente" element={
            <AuthRoute>
              <AssinaturaPendente />
            </AuthRoute>
          } />

          {/* ROTAS DE OPERAÇÃO (Requer login E licença ativa) */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/mesas" element={<ProtectedRoute><MesasGarcom /></ProtectedRoute>} />
          <Route path="/comanda/:idMesa" element={<ProtectedRoute><Comanda /></ProtectedRoute>} />
          <Route path="/painel" element={<ProtectedRoute><Painel /></ProtectedRoute>} />
          <Route path="/cozinha" element={<ProtectedRoute><Cozinha /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><MeuPerfil /></ProtectedRoute>} />
          <Route path="/admin/perfil" element={<ProtectedRoute><MeuPerfil /></ProtectedRoute>} />

          {/* ROTA MASTER (Blindada exclusivamente para Super Admin no roteador) */}
          <Route path="/master" element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          } />

          {/* ROTAS DE ADMINISTRAÇÃO */}
          <Route path="/admin" element={
            <ProtectedRoute><AdminRoute><Admin /></AdminRoute></ProtectedRoute>
          } />
          <Route path="/admin/financeiro" element={
            <ProtectedRoute><AdminRoute><AdminFinanceiro /></AdminRoute></ProtectedRoute>
          } />
          <Route path="/admin/equipe" element={
            <ProtectedRoute><AdminRoute><AdminUsuarios /></AdminRoute></ProtectedRoute>
          } />
          <Route path="/admin/estoque" element={
            <ProtectedRoute><AdminRoute><Estoque /></AdminRoute></ProtectedRoute>
          } />
          <Route path="/admin/impressora" element={
            <ProtectedRoute><AdminRoute><AdminImpressora /></AdminRoute></ProtectedRoute>
          } />
          <Route path="/admin/assinatura" element={
            <ProtectedRoute><AdminRoute><AdminAssinatura /></AdminRoute></ProtectedRoute>
          } />
          <Route path="/admin/assinatura/renovar" element={
            <ProtectedRoute><AdminRoute><AdminAssinaturaRenovar /></AdminRoute></ProtectedRoute>
          } />

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Analytics />
    </AppProvider>
  );
}

export default App;
