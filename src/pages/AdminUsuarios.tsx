// src/pages/AdminUsuarios.tsx
import { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import type { Garcom } from '../types';
import * as LucideIcons from 'lucide-react';

// COMPONENTE: SELETOR DE AVATAR DROPDOWN
interface SeletorAvatarProps {
  avatarAtual: string;
  setAvatar: (avatar: string) => void;
  opcoes: string[];
}

const SeletorAvatarDropdown = ({ avatarAtual, setAvatar, opcoes }: SeletorAvatarProps) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      {/* Botão avatar atual */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 p-2 pr-2 rounded-full transition-all duration-200 group active:scale-95"
      >
        <div className="w-9 h-9 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-[21px] group-hover:scale-105 transition-transform">
          {avatarAtual}
        </div>
        <LucideIcons.ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {/* Menu Dropdown Flutuante */}
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          
          <div className="absolute top-full left-0 m-2 bg-white rounded-3xl p-3 shadow-xl border border-slate-100 z-50 w-65 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400 mb-2 px-1 text-center">
              Selecione
            </p>
            <div className="grid grid-cols-4 gap-2">
              {opcoes.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setAvatar(a); setAberto(false); }}
                  className={`
                    w-11 h-11 rounded-4xl text-[20px] flex items-center justify-center transition-all duration-200 active:scale-90
                    ${avatarAtual === a 
                      ? 'bg-indigo-50 border-2 border-indigo-500 shadow-sm scale-105' 
                      : 'bg-slate-100 border border-transparent hover:bg-slate-100 hover:scale-105'}
                  `}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};


export function AdminUsuarios() {
  const contexto = useContext(AppContext);
  
  // Notificações
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4000);
  };
  
  // Emojis Avatar
  const avataresDisponiveis = ['⚡', '🐋', '🌈', '🦖', '😎', '🐱', '🤖', '👑', '🔥', '🚀', '🍕', '🎮'];

  // ESTADOS: CRIAÇÃO 
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState(avataresDisponiveis[0]);
  const [cargo, setCargo] = useState<'admin' | 'garcom'>('garcom');
  const [mostrarPin, setMostrarPin] = useState(false);

  // ESTADOS: EDIÇÃO
  const [usuarioEditando, setUsuarioEditando] = useState<Garcom | null>(null);
  const [mostrarPinEdicao, setMostrarPinEdicao] = useState(false);

  // HANDLERS
  const handleCriarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 3) { mostrarToast("O nome deve ter no mínimo 3 letras.", "erro"); return; }
    if (pin.length !== 4) { mostrarToast("O código PIN deve ter exatamente 4 dígitos.", "erro"); return; }

    contexto?.adicionarUsuario({
      id: Date.now().toString(),
      nome: nome.trim(),
      avatar,
      pin,
      cargo
    });
    
    mostrarToast(`Usuário ${nome.trim()} criado com sucesso!`, 'sucesso');
    setNome(''); setPin(''); setCargo('garcom'); setAvatar(avataresDisponiveis[0]); setMostrarPin(false);
  };

  const handleSalvarEdicao = () => {
    if (usuarioEditando) {
      if (usuarioEditando.nome.trim().length < 3) { mostrarToast("O nome deve ter no mínimo 3 letras.", "erro"); return; }
      if (usuarioEditando.pin.length !== 4) { mostrarToast("O código PIN deve ter exatamente 4 dígitos.", "erro"); return; }
      
      contexto?.editarUsuario(usuarioEditando.id, usuarioEditando);
      mostrarToast(`Perfil de ${usuarioEditando.nome} atualizado.`, 'sucesso');
      setUsuarioEditando(null); 
      setMostrarPinEdicao(false);
    }
  };

  // Bloqueia scroll do body se modal de edição estiver aberto
  useEffect(() => {
    if (usuarioEditando) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [usuarioEditando]);

  return (
    <div className="min-h-screen w-full bg-slate-50 selection:bg-indigo-200 selection:text-indigo-900 text-slate-800 flex flex-col relative pt-20 md:pt-24 md:pl-18 pb-36 font-sans">
      
      {/* NOTIFICAÇÃO */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-xl flex items-center gap-3 text-[13px] font-semibold tracking-tight ${
            toast.tipo === 'sucesso' 
              ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30' 
              : 'bg-slate-900/95 text-rose-400 border-rose-500/30'
          }`}>
            {toast.tipo === 'sucesso' ? <LucideIcons.CheckCircle2 size={18} /> : <LucideIcons.AlertCircle size={18} />}
            <span>{toast.mensagem}</span>
          </div>
        </div>
      )}

      {/* HEADER */}
      <Header />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full max-w-5xl mx-auto px-5 md:px-8 mt-4 md:mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LADO ESQUERDO: FORMULÁRIO DE CRIAÇÃO  */}
          <section className="lg:col-span-5 bg-white p-6 md:p-8 rounded-4xl shadow-sm border border-slate-200">
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-4xl bg-slate-50 text-fuchsia-800 flex items-center justify-center shrink-0">
                  <LucideIcons.UserPlus size={20} strokeWidth={1} />
                </div>
                <div>
                  <h2 className="text-[14px]  font-bold text-slate-800 uppercase tracking-widest">Novo Usuário</h2>
                </div>
              </div>
            </div>

            <form onSubmit={handleCriarUsuario} className="space-y-6">

              {/* Avatar Selector Dropdown */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">Avatar de Perfil</label>
                <SeletorAvatarDropdown 
                  avatarAtual={avatar} 
                  setAvatar={setAvatar} 
                  opcoes={avataresDisponiveis} 
                />
              </div>

              {/* Nome */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">Nome do usuário</label>
                <div className="relative">
                  <LucideIcons.User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)} 
                    className="w-full bg-slate-50 h-10 pl-11 pr-2 rounded-[40px] outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 font-medium text-[13px] uppercase text-slate-700 border border-slate-200 transition-all placeholder:text-slate-400" 
                  />
                </div>
              </div>

              {/* PIN e Cargo */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">Senha (4 Dígitos)</label>
                  <div className="relative">
                    <LucideIcons.Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type={mostrarPin ? "text" : "password"} 
                      maxLength={4} 
                      inputMode="numeric" 
                      placeholder="••••" 
                      value={pin} 
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} 
                      className="w-full bg-slate-50 h-10 pl-11 pr-12 rounded-[20px] outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 font-bold text-[16px] tracking-[0.3em] text-slate-800 border border-slate-200 transition-all placeholder:text-slate-300 tabular-nums" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setMostrarPin(!mostrarPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm"
                    >
                      {mostrarPin ? <LucideIcons.EyeOff size={14} /> : <LucideIcons.Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">Permissão</label>
                  <div className="flex gap-1.5 bg-slate-50 p-1.5 rounded-[20px] border border-slate-200 h-10">
                    <button 
                      type="button" 
                      onClick={() => setCargo('garcom')} 
                      className={`flex-1 rounded-[14px] text-[10px] font-medium uppercase tracking-widest transition-all ${cargo === 'garcom' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Garçom
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCargo('admin')} 
                      className={`flex-1 rounded-[14px] text-[10px] font-medium uppercase tracking-widest transition-all ${cargo === 'admin' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão Salvar */}
              <button 
                type="submit"
                className="w-full mt-4 bg-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-900/20 text-white font-medium h-8 rounded-[20px] uppercase tracking-widest transition-all active:scale-[0.98] text-[11px] flex items-center justify-center gap-2"
              > 
                <LucideIcons.Check size={18} strokeWidth={2.5} /> Confirmar Cadastro
              </button>
            </form>
          </section>

          {/* LADO DIREITO: LISTA DA EQUIPE */}
          <section className="lg:col-span-7">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-[12px] font-medium text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Membros da Equipe
              </h2>
              <span className="text-[9px] font-sans bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                {contexto?.usuarios.length} Usuários
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {contexto?.usuarios.map(u => (
                <button 
                  key={u.id}
                  onClick={() => {
                    setUsuarioEditando(u);
                    setMostrarPinEdicao(false);
                  }}
                  className="group w-full bg-white p-3 rounded-4xl flex items-center justify-between shadow-sm border border-slate-300 hover:border-slate-300 hover:shadow-md active:scale-[0.98] transition-all duration-300 text-left"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 bg-slate-50 rounded-full flex items-center justify-center text-2xl border border-slate-100 group-hover:scale-110 transition-transform duration-300 shrink-0">
                      {u.avatar}
                    </div>
                    <div className="flex flex-col min-w-0 pr-2">
                      <p className="font-medium text-slate-800 text-[13px] uppercase tracking-tight truncate">{u.nome}</p>
                      <span className={`w-max text-[9px] font-sans uppercase tracking-widest px-2.5 py-0.5 rounded-md mt-1 border ${u.cargo === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {u.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                      </span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-[14px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                    <LucideIcons.Pencil size={16} strokeWidth={2.5} />
                  </div>
                </button>
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* MODAL DE EDIÇÃO */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setUsuarioEditando(null)}></div>
          
          <div className="bg-white rounded-4xl w-full max-w-sm p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-[15px] font-medium text-slate-900 uppercase tracking-widest mb-0.5">Editar Perfil</h3>              </div>
              <button onClick={() => setUsuarioEditando(null)} className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-[14px] flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors active:scale-95">
                <LucideIcons.X size={17} strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-3">
              
              {/* Avatar Edição */}
              <div className="flex justify-center -mt-5">
                <SeletorAvatarDropdown 
                  avatarAtual={usuarioEditando.avatar} 
                  setAvatar={(novoAvatar) => setUsuarioEditando({...usuarioEditando, avatar: novoAvatar})} 
                  opcoes={avataresDisponiveis} 
                />
              </div>

              {/* Nome */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">Nome</label>
                <div className="relative">
                  <LucideIcons.User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={usuarioEditando.nome} 
                    onChange={(e) => setUsuarioEditando({...usuarioEditando, nome: e.target.value})} 
                    className="w-full bg-slate-50 h-9 pl-11 pr-2 rounded-[40px] outline-none uppercase focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 font-medium text-[13px] text-slate-800 border border-slate-200 transition-all" 
                  />
                </div>
              </div>
              
              {/* PIN e Cargo */}
              <div className="flex gap-10">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">PIN</label>
                  <div className="relative">
                    <input 
                      type={mostrarPinEdicao ? "text" : "password"} 
                      maxLength={4} 
                      inputMode="numeric" 
                      value={usuarioEditando.pin} 
                      onChange={(e) => setUsuarioEditando({...usuarioEditando, pin: e.target.value.replace(/\D/g, "")})} 
                      className="w-full bg-slate-50 h-9 pl-4 pr-10 rounded-[40px] outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 font-bold text-[14px] tracking-[0.3em] text-slate-800 border border-slate-200 transition-all tabular-nums text-center" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setMostrarPinEdicao(!mostrarPinEdicao)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {mostrarPinEdicao ? <LucideIcons.EyeOff size={16} /> : <LucideIcons.Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-2">Acesso</label>
                  <div className="flex gap-1.5 bg-slate-50 p-1.5 rounded-[40px] border border-slate-200 h-9">
                    <button 
                      type="button" 
                      onClick={() => setUsuarioEditando({...usuarioEditando, cargo: 'garcom'})} 
                      className={`flex-1 rounded-[14px] text-[10px] font-medium uppercase tracking-widest transition-all ${usuarioEditando.cargo === 'garcom' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Garçom
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setUsuarioEditando({...usuarioEditando, cargo: 'admin'})} 
                      className={`flex-1 rounded-[14px] text-[10px] font-medium uppercase tracking-widest transition-all ${usuarioEditando.cargo === 'admin' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-200' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex gap-5">
                {usuarioEditando.id !== 'admin-dev' && (
                  <button 
                    onClick={() => {
                      if(window.confirm(`Tem certeza que deseja excluir o usuário ${usuarioEditando.nome}?`)) {
                        contexto?.removerUsuario(usuarioEditando.id);
                        mostrarToast('Usuário removido com sucesso.', 'sucesso');
                        setUsuarioEditando(null);
                      }
                    }} 
                    className="w-10 h-10 bg-white text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-[40px] flex items-center justify-center transition-all shrink-0 active:scale-95"
                    title="Excluir Usuário"
                  >
                    <LucideIcons.Trash2 size={17} />
                  </button>
                )}                
                <button 
                  onClick={handleSalvarEdicao} 
                  className="flex-1 bg-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-600/30 text-white font-medium h-10 rounded-[40px] uppercase tracking-widest transition-all active:scale-[0.98] text-[11px] flex items-center justify-center gap-3"
                >
                  <LucideIcons.Save size={16} /> Atualizar usuário
                </button>
              </div>
            </div>           
          </div>
        </div>
      )}
    </div>
  );
}