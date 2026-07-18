// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import type { ReactNode } from 'react';
import { AppContext, AppProvider } from './context/AppContext';

import { Home } from './pages/Home';
import { MesasGarcom } from './pages/MesasGarcom';
import { Comanda } from './pages/Comanda';
import { Painel } from './pages/Painel';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { AdminUsuarios } from './pages/AdminUsuarios';
import { AdminFinanceiro } from './pages/AdminFinanceiro';
import { Estoque } from './pages/Estoque'; 
import { AdminMesas } from './pages/AdminMesas'; 
import { Cozinha } from './pages/Cozinha';

// SEGURANÇA 1: Garante que está LOGADO
function RotaProtegida({ children }: { children: ReactNode }) {
  const contexto = useContext(AppContext);
  if (!contexto?.garcomLogado) return <Navigate to="/login" replace />;
  return children;
}

// SEGURANÇA 2: Garante que é ADMIN
function RotaAdmin({ children }: { children: ReactNode }) {
  const contexto = useContext(AppContext);
  // Se não for admin, chuta de volta para a Home
  if (contexto?.garcomLogado?.cargo !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Rotas Garçom*/}
          <Route path="/" element={<RotaProtegida><Home /></RotaProtegida>} />
          <Route path="/mesas" element={<RotaProtegida><MesasGarcom /></RotaProtegida>} />
          <Route path="/comanda/:idMesa" element={<RotaProtegida><Comanda /></RotaProtegida>} />
          <Route path="/painel" element={<RotaProtegida><Painel /></RotaProtegida>} />
          <Route path="/cozinha" element={<RotaProtegida><Cozinha /></RotaProtegida>} />
          
          {/* Rotas Admin */}
          <Route path="/admin" element={<RotaProtegida><RotaAdmin><Admin /></RotaAdmin></RotaProtegida>} />
          <Route path="/admin/financeiro" element={<RotaProtegida><RotaAdmin><AdminFinanceiro /></RotaAdmin></RotaProtegida>} />
          <Route path="/admin/equipe" element={<RotaProtegida><RotaAdmin><AdminUsuarios /></RotaAdmin></RotaProtegida>} />
          <Route path="/admin/estoque" element={<RotaProtegida><RotaAdmin><Estoque /></RotaAdmin></RotaProtegida>} />
          
          {/* ROTA DE MESAS ADICIONADA */}
          <Route path="/admin/mesas" element={<RotaProtegida><RotaAdmin><AdminMesas /></RotaAdmin></RotaProtegida>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;