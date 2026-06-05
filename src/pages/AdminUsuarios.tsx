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

  const avataresDisponiveis = ['👦', '👧', '👨', '👩', '👨‍🍳', '👩‍🍳', '🤵', '👩‍💼', '👑', '👩‍💻', '👱‍♂️', '👱‍♀️', '🧔', '🧑‍🦱'];

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
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative overflow-hidden">
      
      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-amber-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-600 active:scale-90 transition-all hover:bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-transparent bg-clip-text bg-linear-to-b from-black to-slate-800 tracking-tighter drop-shadow-sm leading-none">
              EQUIPE
            </h1>
            <p className="text-indigo-600 font-black uppercase tracking-[0.2em] text-[9px] mt-1">Usuários</p>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-8 relative z-10 animate-in zoom-in-95 duration-500">
        
        {/* FORMULÁRIO DE CRIAÇÃO */}
        <section className="bg-white/80 backdrop-blur-md p-7 rounded-[40px] shadow-xl border border-white">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-[18px] flex items-center justify-center text-2xl shadow-inner border border-indigo-100">
              👤
            </div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Novo Membro</h2>
          </div>

          <form onSubmit={handleCriarUsuario} className="space-y-5">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Nome</label>
              <input 
                type="text" 
                value={nome} 
                onChange={(e) => setNome(e.target.value)} 
                className="w-full bg-slate-50/70 p-4 h-15 rounded-[20px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 font-bold text-slate-800 border border-slate-200 transition-all" 
              />
            </div>

            {/* PIN e AVATAR */}
            <div className="flex gap-4">
              <div className="flex-[1.5]">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">PIN (Senha)</label>
                <input 
                  type="password" 
                  maxLength={4} 
                  inputMode="numeric" 
                  placeholder="••••" 
                  value={pin} 
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} 
                  className="w-full bg-slate-50/70 h-15 rounded-[20px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 font-black text-2xl text-center tracking-[0.5em] text-slate-800 border border-slate-200 transition-all placeholder:text-slate-300" 
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-500 uppercase text-center tracking-widest block mb-2">Avatar</label>
                <div className="relative">
                  <select 
                    value={avatar} 
                    onChange={(e) => setAvatar(e.target.value)} 
                    className="w-full bg-slate-50/70 h-15 rounded-[20px] outline-none border border-slate-200 text-3xl text-center appearance-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 transition-all cursor-pointer"
                  >
                    {avataresDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <div className="absolute bottom-1/2 translate-y-1/2 right-3 pointer-events-none text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* SELETOR DE CARGO */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Perfil de Acesso</label>
              <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-3xl border border-slate-200/50">
                <button 
                  type="button" 
                  onClick={() => setCargo('garcom')} 
                  className={`flex-1 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${cargo === 'garcom' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Garçom
                </button>
                <button 
                  type="button" 
                  onClick={() => setCargo('admin')} 
                  className={`flex-1 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${cargo === 'admin' ? 'bg-white text-amber-500 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Admin
                </button>
              </div>
            </div>

            {/* Botão de Salvar */}
            <button 
              type="submit"
              className="w-full mt-6 bg-slate-900 border border-slate-800 shadow-[0_6px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.3)] active:shadow-[0_0px_0_#0f172a,0_0px_0_rgba(0,0,0,0)] active:translate-y-1.5 text-white font-bold py-3 rounded-3xl uppercase tracking-widest transition-all text-sm flex items-center justify-center gap-2"
            >
              Salvar Usuário
            </button>
          </form>
        </section>

        {/* LISTA DA EQUIPE */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Equipe Ativa</h2>
            <span className="text-[10px] font-bold bg-zinc-200 text-zinc-600 px-3 py-1 rounded-full">{contexto?.usuarios.length} Usuários</span>
          </div>

          <div className="space-y-3">
            {contexto?.usuarios.map(u => (
              <button 
                key={u.id}
                onClick={() => setUsuarioEditando(u)}
                className="group w-full bg-white p-4 rounded-[28px] flex items-center justify-between shadow-sm border border-slate-100 active:scale-95 transition-all text-left hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-linear-to-br from-slate-50 to-slate-100 rounded-[20px] flex items-center justify-center text-3xl shadow-inner border border-slate-200 group-hover:scale-110 transition-transform duration-300">
                    {u.avatar}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 tracking-tight text-lg leading-tight mb-1">{u.nome}</p>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md inline-block border ${u.cargo === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                      {u.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* EDIÇÃO */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setUsuarioEditando(null)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-linear-to-br from-slate-50 to-slate-100 rounded-[20px] flex items-center justify-center text-3xl shadow-inner border border-slate-200">
                  {usuarioEditando.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">Editar Perfil</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Usuários</p>
                </div>
              </div>
              <button onClick={() => setUsuarioEditando(null)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 active:scale-90 hover:bg-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Nome</label>
                <input 
                  type="text" 
                  value={usuarioEditando.nome} 
                  onChange={(e) => setUsuarioEditando({...usuarioEditando, nome: e.target.value})} 
                  className="w-full bg-slate-50/70 p-4 h-15 rounded-[20px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 font-bold text-slate-800 border border-slate-200 transition-all" 
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
                    className="w-full bg-slate-50/70 h-15 rounded-[20px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 font-black text-2xl text-center tracking-[0.5em] text-slate-800 border border-slate-200 transition-all" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Perfil de Acesso</label>
                <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-3xl border border-slate-200/50">
                  <button 
                    type="button" 
                    onClick={() => setUsuarioEditando({...usuarioEditando, cargo: 'garcom'})} 
                    className={`flex-1 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${usuarioEditando.cargo === 'garcom' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Garçom
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setUsuarioEditando({...usuarioEditando, cargo: 'admin'})} 
                    className={`flex-1 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${usuarioEditando.cargo === 'admin' ? 'bg-white text-amber-500 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
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
                    className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold py-5 rounded-[20px] active:scale-95 transition-colors border border-rose-200"
                  >
                    Excluir
                  </button>
                )}
                
                {/* Botão de Salvar*/}
                <button 
                  onClick={handleSalvarEdicao} 
                  className="flex-[1.5] bg-slate-900 border border-slate-800 shadow-[0_6px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.3)] active:shadow-[0_0px_0_#0f172a,0_0px_0_rgba(0,0,0,0)] active:translate-y-1.5 text-white font-black py-5 rounded-[20px] transition-all"
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