// src/App.tsx
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

import { AppProvider } from './context/AppProvider';
import { useAppContext } from './context/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ConexaoStatus } from './components/ConexaoStatus';

// Páginas carregadas sob demanda (Code Splitting para internet móvel/oscilante)
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const Cadastro = lazy(() => import('./pages/Cadastro').then(m => ({ default: m.Cadastro })));
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const MesasGarcom = lazy(() => import('./pages/MesasGarcom').then(m => ({ default: m.MesasGarcom })));
const Comanda = lazy(() => import('./pages/Comanda').then(m => ({ default: m.Comanda })));
const Painel = lazy(() => import('./pages/Painel').then(m => ({ default: m.Painel })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const AdminUsuarios = lazy(() => import('./pages/AdminUsuarios').then(m => ({ default: m.AdminUsuarios })));
const AdminFinanceiro = lazy(() => import('./pages/AdminFinanceiro').then(m => ({ default: m.AdminFinanceiro })));
const AdminImpressora = lazy(() => import('./pages/AdminImpressora').then(m => ({ default: m.AdminImpressora })));
const AdminAssinatura = lazy(() => import('./pages/AdminAssinatura').then(m => ({ default: m.AdminAssinatura })));
const AdminAssinaturaRenovar = lazy(() => import('./pages/AdminAssinaturaRenovar').then(m => ({ default: m.AdminAssinaturaRenovar })));
const Estoque = lazy(() => import('./pages/Estoque').then(m => ({ default: m.Estoque })));
const Cozinha = lazy(() => import('./pages/Cozinha').then(m => ({ default: m.Cozinha })));
const AssinaturaPendente = lazy(() => import('./pages/AssinaturaPendente').then(m => ({ default: m.AssinaturaPendente })));
const MeuPerfil = lazy(() => import('./pages/MeuPerfil').then(m => ({ default: m.MeuPerfil })));

function CarregandoTela() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-9 h-9 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

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
      <ConexaoStatus />
      <BrowserRouter>
        <Suspense fallback={<CarregandoTela />}>
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
        </Suspense>
      </BrowserRouter>
      <Analytics />
    </AppProvider>
  );
}

export default App;
