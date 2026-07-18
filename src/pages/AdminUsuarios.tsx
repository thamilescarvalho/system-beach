// src/pages/AdminUsuarios.tsx
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Garcom } from '../types';

export function AdminUsuarios() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  
  // Estados do Formulário de Criação
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState('👦');
  const [cargo, setCargo] = useState<'admin' | 'garcom'>('garcom');

  // Estado para controlar o Modal de Edição
  const [usuarioEditando, setUsuarioEditando] = useState<Garcom | null>(null);

  const avataresDisponiveis = ['👦', '👨', '👩', '👨‍🍳', '👩‍🍳', '👑', '🧔', '🧑‍🦱'];

  const handleCriarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 3) { alert("Digite o nome completo."); return; }
    if (pin.length !== 4) { alert("O PIN deve ter 4 dígitos."); return; }

    contexto?.adicionarUsuario({
      id: Date.now().toString(),
      nome: nome.trim(),
      avatar,
      pin,
      cargo
    });
    
    setNome(''); setPin(''); setCargo('garcom'); setAvatar('👦');
  };

  const handleSalvarEdicao = () => {
    if (usuarioEditando) {
      if (usuarioEditando.pin.length !== 4) { alert("O PIN deve ter 4 dígitos."); return; }
      
      contexto?.editarUsuario(usuarioEditando.id, usuarioEditando);
      setUsuarioEditando(null); 
    }
  };

  return (
    <div className="min-h-screen bg-slate-200 font-sans pb-24 relative overflow-hidden perspective-distant">
      
      {/* FUNDO  */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-sm shadow-slate-200/50 px-4 md:px-8 py-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 active:shadow-inner transition-all hover:bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-[20px] font-black text-slate-900 tracking-widest uppercase leading-none">
              EQUIPE
            </h1>
            <p className="text-indigo-600 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Usuários</p>
          </div>
        </div>
      </header>

      {/* DESKTOP */}
      <main className="w-full max-w-4xl mx-auto px-4 md:px-4 relative z-10 animate-in zoom-in-95 duration-500 transform-style-3d">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          
          {/* LADO ESQUERDO: FORMULÁRIO DE CRIAÇÃO */}
          <section className="bg-white/80 backdrop-blur-md p-7 md:p-10 rounded-[40px] shadow-xl shadow-slate-200/40 border border-white">
            <div className="flex items-center justify-center gap-1 mb-8">
              <h2 className="text-xl font-black text-zinc-800 uppercase tracking-widest">Criar usuário</h2>
            </div>

            <form onSubmit={handleCriarUsuario} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2 tracking-widest block mb-2">Nome / Usuário</label>
                <input 
                  type="text" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  className="w-full bg-slate-50/70 p-5 h-10 rounded-4xl outline-none focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-400/10 font-semibold text-zinc-800 border border-zinc-200 transition-all shadow-sm" 
                />
              </div>

              {/* PIN e AVATAR */}
              <div className="flex gap-6">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase ml-2 tracking-widest block mb-2">PIN (Senha)</label>
                  <input 
                    type="password" 
                    maxLength={4} 
                    inputMode="numeric" 
                    placeholder="••••" 
                    value={pin} 
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} 
                    className="w-full bg-slate-50/70 h-10 rounded-4xl outline-none focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-400/10 font-black text-2xl text-center tracking-[0.5em] text-zinc-800 border border-zinc-200 transition-all placeholder:text-zinc-300 shadow-sm tabular-nums" 
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase text-center tracking-widest block mb-2">Avatar</label>
                  <div className="relative">
                    <select 
                      value={avatar} 
                      onChange={(e) => setAvatar(e.target.value)} 
                      className="w-full bg-slate-50/70 h-10 rounded-4xl outline-none border border-zinc-200 text-3xl text-center appearance-none focus:border-zinc-400 focus:bg-white focus:ring-4 focus:ring-zinc-400/10 transition-all cursor-pointer shadow-sm"
                    >
                      {avataresDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <div className="absolute bottom-1/2 translate-y-1/2 right-3 pointer-events-none text-zinc-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Perfil de Acesso */}
              <div>
                <label className="text-[10px] font-bold text-zinc-600 uppercase ml-2 tracking-widest block mb-2">Perfil de Acesso</label>
                <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-3xl border border-slate-200/50 shadow-inner shadow-slate-200/50">
                  <button 
                    type="button" 
                    onClick={() => setCargo('garcom')} 
                    className={`flex-1 py-2 rounded-[20px] text-[11px] font-bold uppercase tracking-widest transition-all ${cargo === 'garcom' ? 'bg-white text-zinc-700 shadow-sm shadow-slate-200/50 border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                  >
                    Garçom
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setCargo('admin')} 
                    className={`flex-1 py-2 rounded-[20px] text-[11px] font-bold uppercase tracking-widest transition-all ${cargo === 'admin' ? 'bg-white text-amber-500 shadow-sm shadow-slate-200/50 border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Botão de Salvar */}
              <button 
                type="submit"
                className="w-full mt-4 bg-linear-to-b from-slate-500 to-slate-600 border border-slate-900 border-t-slate-700/50 shadow-lg shadow-slate-900/30 hover:shadow-xl hover:shadow-slate-900/40 active:scale-[0.98] active:translate-y-0 active:shadow-inner text-white font-bold py-4 md:py-3 rounded-3xl uppercase tracking-widest transition-all text-[11px] flex items-center justify-center gap-2"
              > Salvar
              </button>
            </form>
          </section>

          {/* LADO DIREITO: LISTA DA EQUIPE */}
          <section className="space-y-4 pt-4 lg:pt-0">
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Equipe Ativa</h2>
              <span className="text-[9px] font-bold bg-white border border-slate-200 shadow-sm shadow-slate-200/50 text-slate-500 px-3 py-1.5 rounded-full uppercase tracking-widest">
                {contexto?.usuarios.length} Usuários
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {contexto?.usuarios.map(u => (
                <button 
                  key={u.id}
                  onClick={() => setUsuarioEditando(u)}
                  className="group w-full bg-white p-3 rounded-4xl flex items-center justify-between shadow-sm shadow-slate-200/50 border border-slate-200 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-500/10 hover:-translate-y-1 active:scale-[0.98] active:translate-y-0 active:shadow-inner transition-all duration-300 text-left transform-style-3d"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-linear-to-br from-slate-50 to-slate-100 rounded-4xl flex items-center justify-center text-3xl shadow-inner shadow-white/50 border border-slate-200 group-hover:scale-110 transition-transform duration-300">
                      {u.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-800 tracking-tight text-[17px] leading-tight mb-1 uppercase">{u.nome}</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md inline-block border shadow-sm ${u.cargo === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {u.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-zinc-50 group-hover:text-zinc-600 transition-colors border border-transparent group-hover:border-zinc-100 shrink-0 ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* EDITAR */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setUsuarioEditando(null)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl shadow-slate-900/50 border border-white/20 relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-linear-to-br from-slate-50 to-slate-100 rounded-3xl flex items-center justify-center text-4xl shadow-inner shadow-slate-200/50 border border-slate-200">
                  {usuarioEditando.avatar}
                </div>
                <div>
                  <h3 className="text-[20px] font-black text-slate-900 leading-none tracking-tight uppercase mb-1">Editar Perfil</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Usuários</p>
                </div>
              </div>
              <button onClick={() => setUsuarioEditando(null)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-90 hover:bg-slate-200 transition-colors shadow-sm shadow-slate-200/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Nome</label>
                <input 
                  type="text" 
                  value={usuarioEditando.nome} 
                  onChange={(e) => setUsuarioEditando({...usuarioEditando, nome: e.target.value})} 
                  className="w-full bg-slate-50/70 p-4 h-15 rounded-3xl outline-none focus:border-indigo-400 focus:bg-white font-bold text-slate-800 border border-slate-200 transition-all shadow-sm" 
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Novo PIN</label>
                  <input 
                    type="password" 
                    maxLength={4} 
                    inputMode="numeric" 
                    value={usuarioEditando.pin} 
                    onChange={(e) => setUsuarioEditando({...usuarioEditando, pin: e.target.value.replace(/\D/g, "")})} 
                    className="w-full bg-slate-50/70 h-15 rounded-3xl outline-none focus:border-indigo-400 focus:bg-white font-black text-[28px] text-center tracking-[0.4em] text-slate-800 border border-slate-200 transition-all shadow-sm tabular-nums" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Perfil de Acesso</label>
                <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-3xl border border-slate-200/50 shadow-inner shadow-slate-200/50">
                  <button 
                    type="button" 
                    onClick={() => setUsuarioEditando({...usuarioEditando, cargo: 'garcom'})} 
                    className={`flex-1 py-3.5 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${usuarioEditando.cargo === 'garcom' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                  >
                    Garçom
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setUsuarioEditando({...usuarioEditando, cargo: 'admin'})} 
                    className={`flex-1 py-3.5 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all ${usuarioEditando.cargo === 'admin' ? 'bg-white text-amber-500 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'}`}
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                {usuarioEditando.id !== 'admin-dev' && (
                  <button 
                    onClick={() => {
                      if(window.confirm("Excluir este usuário permanentemente?")) {
                        contexto?.removerUsuario(usuarioEditando.id);
                        setUsuarioEditando(null);
                      }
                    }} 
                    className="flex-1 bg-white text-rose-500 hover:bg-rose-50 font-black uppercase tracking-widest py-4 rounded-[20px] shadow-sm shadow-slate-200/50 border border-rose-200 active:scale-95 active:shadow-inner transition-all text-[10px]"
                  >
                    Excluir
                  </button>
                )}
                
                {/* Botão de Salvar */}
                <button 
                  onClick={handleSalvarEdicao} 
                  className="flex-[1.5] bg-linear-to-b from-slate-800 to-slate-950 border border-slate-900 border-t-slate-700/50 shadow-md shadow-slate-900/30 hover:shadow-lg hover:shadow-slate-900/40 active:scale-[0.98] active:translate-y-0 active:shadow-inner text-white font-black uppercase tracking-widest py-4 rounded-[20px] transition-all text-[11px]"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}