// src/pages/AdminUsuarios.tsx
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Garcom } from '../types';
import * as LucideIcons from 'lucide-react';

export function AdminUsuarios() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  
  // ESTADOS: CRIAÇÃO 
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [avatar, setAvatar] = useState('⚡');
  const [cargo, setCargo] = useState<'admin' | 'garcom'>('garcom');
  const [mostrarPin, setMostrarPin] = useState(false);

  // ESTADOS: EDIÇÃO
  const [usuarioEditando, setUsuarioEditando] = useState<Garcom | null>(null);
  const [mostrarPinEdicao, setMostrarPinEdicao] = useState(false);

  // Emojis modernos
  const avataresDisponiveis = ['⚡', '🐋', '🌈', '🦖', '😎', '🐱', '🤖'];

  // HANDLERS
  const handleCriarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 3) { alert("Digite o nome completo (mín. 3 letras)."); return; }
    if (pin.length !== 4) { alert("O PIN de acesso deve ter exatamente 4 dígitos."); return; }

    contexto?.adicionarUsuario({
      id: Date.now().toString(),
      nome: nome.trim(),
      avatar,
      pin,
      cargo
    });
    
    setNome(''); setPin(''); setCargo('garcom'); setAvatar('⚡'); setMostrarPin(false);
  };

  const handleSalvarEdicao = () => {
    if (usuarioEditando) {
      if (usuarioEditando.nome.trim().length < 3) { alert("Digite o nome completo."); return; }
      if (usuarioEditando.pin.length !== 4) { alert("O PIN deve ter 4 dígitos."); return; }
      
      contexto?.editarUsuario(usuarioEditando.id, usuarioEditando);
      setUsuarioEditando(null); 
      setMostrarPinEdicao(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-200 selection:bg-blue-700/20 selection:text-blue-900 text-slate-900 flex flex-col relative overflow-hidden pb-36">
      
      {/* BACKGROUND  */}
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '36px 36px', color: '#cbd5e1' }}></div>
      <div className="absolute top-[5%] -left-10 w-1/2 aspect-square max-w-3xl bg-blue-200/60 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-[5%] -right-10 w-2/5 aspect-square max-w-xl bg-slate-200/50 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-2xl border-b border-slate-300/60 shadow-sm shadow-slate-200/50 px-6 py-5 flex items-center justify-between shrink-0">
        <button 
          onClick={() => navigate('/admin')} 
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 active:scale-90 transition-all duration-300 shadow-sm"
        >
          <LucideIcons.ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        
        <div className="text-center flex flex-col items-center">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-wide leading-none">
            EQUIPE
          </h1>
          <p className="text-slate-400 font-medium uppercase tracking-widest text-[10px] mt-1.5">
            Gestão de Usuários
          </p>
        </div>
        
        <div className="w-12 h-12" />
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full max-w-6xl mx-auto px-5 md:px-8 pt-8 md:pt-10 relative z-10 animate-in zoom-in-95 duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LADO ESQUERDO: FORMULÁRIO DE CRIAÇÃO  */}
          <section className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[36px] shadow-xl shadow-slate-200/40 border border-slate-200">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <LucideIcons.UserPlus size={20} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-widest">Novo Usuário</h2>
            </div>

            <form onSubmit={handleCriarUsuario} className="space-y-6">
              
              {/* Avatar */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-4">Avatar do Perfil</label>
                <div className="flex flex-wrap gap-2">
                  {avataresDisponiveis.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAvatar(a)}
                      className={`
                        w-12 h-12 rounded-3xl text-2xl flex items-center justify-center transition-all duration-200
                        ${avatar === a 
                          ? 'bg-blue-50 border-2 border-blue-500 scale-110 shadow-sm' 
                          : 'bg-slate-50 border border-slate-300 hover:bg-slate-100 hover:scale-105 opacity-70 hover:opacity-100'}
                      `}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2">Nome / Usuário</label>
                <input 
                  type="text" 
                  value={nome} 
                  onChange={(e) => setNome(e.target.value)} 
                  className="w-full bg-slate-50 p-2 rounded-3xl outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 font-bold text-slate-800 border border-slate-300 transition-all placeholder:text-slate-300 placeholder:font-medium" 
                />
              </div>

              {/* PIN e Cargo */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2">SENHA (4 Dígitos)</label>
                  <div className="relative">
                    <input 
                      type={mostrarPin ? "text" : "password"} 
                      maxLength={4} 
                      inputMode="numeric" 
                      placeholder="••••" 
                      value={pin} 
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} 
                      className="w-full bg-slate-50 p-2 pr-12 rounded-3xl outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 font-black text-xl text-center tracking-[0.3em] text-slate-800 border border-slate-300 transition-all placeholder:text-slate-300 shadow-inner tabular-nums" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setMostrarPin(!mostrarPin)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {mostrarPin ? <LucideIcons.EyeOff size={18} /> : <LucideIcons.Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex-[1.2]">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Cargo</label>
                  <div className="flex gap-2 bg-slate-50 p-2 rounded-3xl border border-slate-300 h-[47px]">
                    <button 
                      type="button" 
                      onClick={() => setCargo('garcom')} 
                      className={`flex-1 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${cargo === 'garcom' ? 'bg-white text-slate-800 shadow-sm border border-slate-300/50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Garçom
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCargo('admin')} 
                      className={`flex-1 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${cargo === 'admin' ? 'bg-white text-blue-600 shadow-sm border border-slate-300/50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão Salvar */}
              <button 
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 text-white font-bold py-3 rounded-3xl uppercase tracking-widest transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-2"
              > 
                <LucideIcons.Check size={16} strokeWidth={3} /> Cadastrar Usuário
              </button>
            </form>
          </section>

          {/* LADO DIREITO: LISTA DA EQUIPE */}
          <section className="lg:col-span-7">
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-sm font-medium text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <LucideIcons.Users size={18} className="text-slate-400" /> Usuários Ativos
              </h2>
              <span className="text-[10px] font-medium bg-white border border-slate-300 shadow-sm text-slate-500 px-3 py-1.5 rounded-full uppercase tracking-widest">
                {contexto?.usuarios.length} Registros
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contexto?.usuarios.map(u => (
                <button 
                  key={u.id}
                  onClick={() => {
                    setUsuarioEditando(u);
                    setMostrarPinEdicao(false);
                  }}
                  className="group w-full bg-white uppercase p-3 rounded-[25px] flex items-center justify-between shadow-sm border border-slate-300 hover:border-blue-300 hover:shadow-md active:scale-95 transition-all duration-200 text-left overflow-hidden relative"
                >
                  {/* Detalhe de cor lateral dependendo do cargo */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${u.cargo === 'admin' ? 'bg-blue-500' : 'bg-orange-400'}`} />

                  <div className="flex items-center gap-4 pl-2">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                      {u.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm md:text-[12px] leading-tight mb-1">{u.nome}</p>
                      <span className={`text-[8.5px] font-medium uppercase tracking-widest px-2 py-0.5 rounded-md border ${u.cargo === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        {u.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                      </span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                    <LucideIcons.Pencil size={14} strokeWidth={2.5} />
                  </div>
                </button>
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* MODAL DE EDIÇÃO */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setUsuarioEditando(null)}></div>
          
          <div className="bg-white rounded-[36px] w-full max-w-md p-6 md:p-8 shadow-2xl relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 flex flex-col">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl border border-slate-200">
                  {usuarioEditando.avatar}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-none tracking-tight uppercase mb-1">Editar Perfil</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configurações do Usuário</p>
                </div>
              </div>
              <button onClick={() => setUsuarioEditando(null)} className="w-10 h-10 bg-slate-50 border border-slate-300 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                <LucideIcons.X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="space-y-6">
              
              {/* Avatar  Edição */}
              <div>
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest block mb-3">Alterar Avatar</label>
                <div className="flex flex-wrap gap-2">
                  {avataresDisponiveis.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setUsuarioEditando({...usuarioEditando, avatar: a})}
                      className={`
                        w-10 h-10 rounded-3xl text-xl flex items-center justify-center transition-all duration-200
                        ${usuarioEditando.avatar === a 
                          ? 'bg-blue-50 border-2 border-blue-500 scale-110 shadow-sm' 
                          : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}
                      `}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest block mb-3">Nome / Usuário</label>
                <input 
                  type="text" 
                  value={usuarioEditando.nome} 
                  onChange={(e) => setUsuarioEditando({...usuarioEditando, nome: e.target.value})} 
                  className="w-full bg-slate-50 p-2 rounded-4xl outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 font-medium text-slate-800 border border-slate-300 transition-all" 
                />
              </div>
              
              {/* PIN e Cargo */}
              <div className="flex gap-8">
                <div className="flex-1 relative">
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest block mb-2">Redefinir PIN</label>
                  <div className="relative">
                    <input 
                      type={mostrarPinEdicao ? "text" : "password"} 
                      maxLength={4} 
                      inputMode="numeric" 
                      value={usuarioEditando.pin} 
                      onChange={(e) => setUsuarioEditando({...usuarioEditando, pin: e.target.value.replace(/\D/g, "")})} 
                      className="w-full bg-slate-50 p-2 pr-7 rounded-4xl outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 font-medium text-xl text-center tracking-[0.4em] text-slate-800 border border-slate-300 transition-all tabular-nums" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setMostrarPinEdicao(!mostrarPinEdicao)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      {mostrarPinEdicao ? <LucideIcons.EyeOff size={18} /> : <LucideIcons.Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex-[1.2]">
                  <label className="text-[10px] font-medium text-slate-500 uppercase tracking-widest block mb-2">Cargo</label>
                  <div className="flex gap-2 bg-slate-50 p-2 rounded-4xl border border-slate-300 h-[46.5px]">
                    <button 
                      type="button" 
                      onClick={() => setUsuarioEditando({...usuarioEditando, cargo: 'garcom'})} 
                      className={`flex-1 rounded-xl text-xs font-medium uppercase tracking-widest transition-all ${usuarioEditando.cargo === 'garcom' ? 'bg-white text-slate-800 shadow-sm border border-slate-300/50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Garçom
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setUsuarioEditando({...usuarioEditando, cargo: 'admin'})} 
                      className={`flex-1 rounded-xl text-xs font-medium uppercase tracking-widest transition-all ${usuarioEditando.cargo === 'admin' ? 'bg-white text-blue-600 shadow-sm border border-slate-300/50' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-6 flex gap-3">
                {usuarioEditando.id !== 'admin-dev' && (
                  <button 
                    onClick={() => {
                      if(window.confirm(`Tem certeza que deseja excluir o usuário ${usuarioEditando.nome}?`)) {
                        contexto?.removerUsuario(usuarioEditando.id);
                        setUsuarioEditando(null);
                      }
                    }} 
                    className="flex-[0.6] bg-white text-rose-500 hover:bg-rose-50 hover:border-rose-300 font-medium uppercase tracking-widest py-3 rounded-4xl border border-slate-300 active:scale-95 transition-all text-[10px] flex items-center justify-center"
                    title="Excluir Usuário"
                  >
                    <LucideIcons.Trash2 size={18} />
                  </button>
                )}                
                <button 
                  onClick={handleSalvarEdicao} 
                  className="flex-1 bg-blue-900 hover:bg-blue-800 shadow-md shadow-blue-900/20 text-white font-medium uppercase tracking-widest py-2 rounded-4xl transition-all active:scale-[0.98] text-[11px] flex items-center justify-center gap-3"
                >
                  <LucideIcons.Save size={16} /> Salvar Alterações
                </button>
              </div>
            </div>           
          </div>
        </div>
      )}
    </div>
  );
}