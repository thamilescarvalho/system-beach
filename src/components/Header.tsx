// src/components/Header.tsx
import { useState, useContext, useRef, useEffect, Fragment } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import * as LucideIcons from 'lucide-react';

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

  if (!garcom) return null;

  const path = location.pathname;
  const isComanda = path.startsWith('/comanda/');
  const isHome = path === '/';
  
  // Condição para exibir a barra inferior apenas onde for necessário
  const showBottomNav = !isHome && !isComanda && path !== '/login';

  // Titulo dinamico
  const getPageTitle = () => {
    if (isHome) return 'System Beach';
    if (path === '/mesas') return 'Espaço Guarda-Sóis';
    if (isComanda) return `Mesa ${path.split('/').pop()}`;
    if (path === '/cozinha') return 'Bar e Cozinha';
    if (path === '/painel') return 'Painel de Vendas';
    if (path === '/admin/estoque') return 'Estoque';
    if (path === '/admin' || path === '/admin/usuarios') return 'Configurações';
    return 'System Beach';
  };

  const primeiroNome = garcom.nome.split(' ')[0];

  // Componente de Icones
  const NavIcon = ({ to, icon: Icon, activePaths }: { to: string, icon: any, activePaths: string[] }) => {
    const isActive = activePaths.some(p => path === p || (p !== '/' && path.startsWith(`${p}/`)));
    
    return (
      <Fragment>
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Link to={to} className={`w-12 h-12 rounded-xl flex items-center justify-center relative transition-colors ${isActive ? 'bg-fuchsia-50 text-fuchsia-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-fuchsia-600 rounded-r-full shadow-[2px_0_8px_rgba(192,38,211,0.5)]"></span>}
          </Link>
        </div>
        {/* Mobile Bottom Nav */}
        <div className="md:hidden flex-1 h-full">
          <Link to={to} className={`flex items-center justify-center w-full h-full transition-colors ${isActive ? 'text-fuchsia-600' : 'text-slate-400 hover:text-slate-900'}`}>
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
          </Link>
        </div>
      </Fragment>
    );
  };

  return (
    <Fragment>
      {/* Barra lateral Desktop */}
      <aside className="fixed left-0 top-0 bottom-0 w-[72px] bg-white border-r border-slate-200 hidden md:flex flex-col z-50">
        <div className="h-16 flex items-center justify-center border-b border-slate-100 shrink-0">
          <Link to="/" className="text-fuchsia-600 hover:scale-105 transition-transform">
            <LucideIcons.Umbrella size={26} strokeWidth={2.5} />
          </Link>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-2 py-6">
          <NavIcon to="/" icon={LucideIcons.Home} activePaths={['/']} />
          <NavIcon to="/mesas" icon={LucideIcons.Umbrella} activePaths={['/mesas', '/comanda']} />
          <NavIcon to="/cozinha" icon={LucideIcons.UtensilsCrossed} activePaths={['/cozinha']} />
          <NavIcon to="/painel" icon={LucideIcons.Wallet} activePaths={['/painel']} />
        </nav>
      </aside>

      {/* Header Superior */}
      <header className="fixed top-0 right-0 left-0 md:left-[72px] h-16 bg-white/90 backdrop-blur-md border-b border-slate-300 flex items-center justify-between px-4 lg:px-6 z-40">
        <div className="flex items-center gap-3 z-10">
          
          {/* MOBILE VOLTAR / LOGO */}
          <div className="md:hidden flex items-center">
            {!isHome ? (
              <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-900 p-2 -ml-2 rounded-full transition-colors active:scale-95">
                <LucideIcons.ArrowLeft size={20} strokeWidth={2.5} />
              </button>
            ) : (
              <div className="text-fuchsia-600 pl-1">
                <LucideIcons.Umbrella size={24} strokeWidth={2.5} />
              </div>
            )}
          </div>
          
          {/* TÍTULO DA PÁGINA */}
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] md:text-xl font-sans uppercase text-slate-900 tracking-wide leading-none ml-1 md:ml-0">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Notificacoes e Perfil */}
        <div className="flex items-center gap-2 md:gap-4 z-10" ref={menuRef}>
          <button className="w-9 h-9 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-full transition-colors relative">
            <LucideIcons.Bell size={20} strokeWidth={2} />
            <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
          </button>

          <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block"></div>

          <button 
            onClick={() => setMenuAberto(!menuAberto)} 
            className="group flex items-center gap-2 hover:bg-slate-50 p-1 md:pr-3 rounded-full md:rounded-2xl border border-transparent hover:border-slate-200 transition-all text-left"
          >
            <div className="w-9 h-9 rounded-full md:rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shadow-inner shrink-0 font-sans">
              {garcom.avatar}
            </div>
            
            <div className="hidden md:flex items-center gap-1.5">
              <h2 className="text-sm font-medium text-slate-700 leading-none">{primeiroNome}</h2>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"></span>
              <LucideIcons.ChevronDown size={14} className={`text-slate-400 transition-transform ${menuAberto ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Menu Dropdown */}
          {menuAberto && (
            <div className="absolute top-14 right-4 md:right-6 w-56 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden p-2 flex flex-col z-50 animate-in fade-in zoom-in-95 origin-top-right duration-200 font-sans">
              <div className="px-3 py-3 mb-1 border-b border-slate-100 bg-slate-50/50 rounded-xl">
                <p className="text-[13px] font-bold text-slate-900 truncate">{garcom.nome}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {garcom.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                </p>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left">
                  <LucideIcons.UserCog size={16} /> Meu Perfil
                </button>

                {garcom.cargo === 'admin' && (
                  <button onClick={() => { navigate('/admin'); setMenuAberto(false); }} className="md:hidden flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left">
                    <LucideIcons.Settings size={16} /> Configurações
                  </button>
                )}

                <div className="h-px bg-slate-100 my-1 mx-2" />
                
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left">
                  <LucideIcons.LogOut size={16} strokeWidth={2.5} /> Encerrar Sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Barra de Navegação Inferior Mobile */}
      {showBottomNav && (
        <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex md:hidden items-center justify-around h-[68px] pb-safe z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
          <NavIcon to="/" icon={LucideIcons.Home} activePaths={['/']} />
          <NavIcon to="/mesas" icon={LucideIcons.Umbrella} activePaths={['/mesas']} />
          <NavIcon to="/cozinha" icon={LucideIcons.UtensilsCrossed} activePaths={['/cozinha']} />
          <NavIcon to="/painel" icon={LucideIcons.Wallet} activePaths={['/painel']} />
        </nav>
      )}
    </Fragment>
  );
}