// src/components/Header.tsx
import { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Garcom } from '../types';

export function Header() {
  const contexto = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const garcom = contexto?.garcomLogado;
  
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const handleLogout = () => {
    contexto?.setGarcomLogado(null);
    navigate('/login');
  };

  // NAVEGAÇÃO (HIERÁRQUICA)
  const handleVoltar = () => {
    const path = location.pathname;
    
    // comanda, sempre volta para mesas
    if (path.startsWith('/comanda/')) {
      navigate('/mesas');
      return;
    }
    
    // tela principal, sempre volta para a Home
    if (path === '/mesas' || path === '/cozinha' || path === '/painel' || path === '/admin/estoque' || path === '/admin') {
      navigate('/');
      return;
    }

    // Fallback de segurança
    navigate(-1);
  };

  if (!garcom) return null;

  // título do Header por página
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'BARRACA CORAL';
    if (path === '/mesas') return 'MESAS';
    if (path.startsWith('/comanda/')) return `Mesa ${path.split('/').pop()}`;
    if (path === '/cozinha') return 'Bar e Cozinha';
    if (path === '/painel') return 'Meu Caixa';
    if (path === '/admin/estoque') return 'Estoque';
    if (path === '/admin') return 'Configurações';
    return 'System Beach';
  };

  const isHome = location.pathname === '/';

  return (
    <header className="w-full bg-white h-16 flex items-center justify-between px-5 sticky top-0 z-50 border-b border-zinc-100">
      
      {/* LADO ESQUERDO: Boneco na Home | Setinha Inteligente nas outras páginas */}
      <div className="w-12 flex items-center justify-start relative" ref={isHome ? menuRef : null}>
        {isHome ? (
          <button 
            onClick={() => setMenuAberto(!menuAberto)} 
            className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-zinc-900 hover:bg-zinc-100"
          >
            <IconePerfil />
          </button>
        ) : (
          <button 
            onClick={handleVoltar} 
            className="p-2 -ml-2 rounded-full active:scale-95 transition-all text-zinc-900 hover:bg-zinc-100"
          >
            <IconeVoltar />
          </button>
        )}

        {/* MENU  */}
        {menuAberto && isHome && (
          <MenuDropdown garcom={garcom} fecharMenu={() => setMenuAberto(false)} handleLogout={handleLogout} alinhamento="left-0 origin-top-left" />
        )}
      </div>

      {/* CENTRO: Título da Página */}
      <div className="flex-1 text-center truncate px-2">
        <h1 className="text-[17px] font-bold text-zinc-900 tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* LADO DIREITO: Ícone de Calendário na Home | Boneco nas outras páginas */}
      <div className="w-12 flex items-center justify-end relative" ref={!isHome ? menuRef : null}>
        {isHome ? (
          <button 
            onClick={() => navigate('/painel')} 
            className="p-2 -mr-2 rounded-full active:scale-95 transition-all text-zinc-900 hover:bg-zinc-100"
          >
            <IconeCaixaHeader />
          </button>
        ) : (
          <button 
            onClick={() => setMenuAberto(!menuAberto)} 
            className="p-2 -mr-2 rounded-full active:scale-95 transition-all text-zinc-900 hover:bg-zinc-100"
          >
            <IconePerfil />
          </button>
        )}

        {/* MENU FLUTUANTE */}
        {menuAberto && !isHome && (
          <MenuDropdown garcom={garcom} fecharMenu={() => setMenuAberto(false)} handleLogout={handleLogout} alinhamento="right-0 origin-top-right" />
        )}
      </div>
    </header>
  );
}

// COMPONENTE DO MENU FLUTUANTE
function MenuDropdown({ garcom, fecharMenu, handleLogout, alinhamento }: { garcom: Garcom, fecharMenu: () => void, handleLogout: () => void, alinhamento: string }) {
  return (
    <div className={`absolute top-12 ${alinhamento} w-56 bg-white border border-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl overflow-hidden p-2 flex flex-col z-50 animate-in fade-in zoom-in-95 duration-200`}>
      
      <div className="px-3 py-3 mb-1 border-b border-zinc-100 bg-zinc-50/50 rounded-xl">
        <p className="text-[13px] font-bold text-zinc-900 truncate">{garcom.nome}</p>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">{garcom.cargo}</p>
      </div>

      <div className="flex flex-col gap-0.5 mt-1">
        
        <Link to="/mesas" onClick={fecharMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors">
          <IconeMesas className="text-zinc-500" />
          <span>Mesas</span>
        </Link>

        <Link to="/cozinha" onClick={fecharMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors">
          <IconeBar className="text-zinc-500" />
          <span>Bar e Cozinha</span>
        </Link>

        <Link to="/painel" onClick={fecharMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors">
          <IconeCaixaMenu className="text-zinc-500" />
          <span>Meu Caixa</span>
        </Link>

        {garcom.cargo === 'admin' && (
          <>
            <div className="h-px bg-zinc-100 my-1 mx-2" />
            
            <Link to="/admin/estoque" onClick={fecharMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors">
              <IconeEstoque className="text-zinc-500" />
              <span>Estoque</span>
            </Link>

            <Link to="/admin" onClick={fecharMenu} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors">
              <IconeAjustes className="text-zinc-500" />
              <span>Administração</span>
            </Link>
          </>
        )}

        <div className="h-px bg-zinc-100 my-1 mx-2" />
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-fuchsia-800 hover:bg-fuchsia-50 transition-colors text-left">
          <IconeSair className="text-fuchsia-800" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

// BIBLIOTECA DE ÍCONES
function IconePerfil({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function IconeVoltar({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}

function IconeCaixaHeader({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>
    </svg>
  );
}

function IconeMesas({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2v20M2 10h20M12 2a8 8 0 0 1 8 8H4a8 8 0 0 1 8-8z"/>
    </svg>
  );
}

function IconeBar({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 22H2M6 22V4c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v18M6 12h12M10 7h4"/>
    </svg>
  );
}

function IconeCaixaMenu({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8M8 11h8M8 15h5"/>
    </svg>
  );
}

function IconeEstoque({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>
    </svg>
  );
}

function IconeAjustes({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>
    </svg>
  );
}

function IconeSair({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  );
}