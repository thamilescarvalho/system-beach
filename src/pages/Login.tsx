// src/pages/Login.tsx
import { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Garcom } from '../types';
import * as LucideIcons from 'lucide-react';

const imagensMockup = [
  "https://images.unsplash.com/photo-1614316654497-6a56eb600be4?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1575037614876-c3853d406b12?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&q=80&w=400",
  "https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?auto=format&fit=crop&q=80&w=400"
];

export function Login() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);

  const listaUsuarios = contexto?.usuarios || [];

  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Garcom | null>(null);
  const [pinDigitado, setPinDigitado] = useState('');
  const [erro, setErro] = useState(false);

  const handleDigitar = useCallback(async (numero: string) => {
    if (!usuarioSelecionado || pinDigitado.length >= 4) return;

    const novoPin = pinDigitado + numero;
    setPinDigitado(novoPin);

    if (novoPin.length === 4) {
      const pinCorreto = await contexto?.autenticarUsuario(usuarioSelecionado.id, novoPin);
      
      if (pinCorreto) {
        navigate('/');
      } else {
        setErro(true);
        setTimeout(() => {
          setErro(false);
          setPinDigitado('');
        }, 600); 
      }
    }
  }, [usuarioSelecionado, pinDigitado, contexto, navigate]);

  const handleApagar = useCallback(() => {
    setPinDigitado(prev => prev.slice(0, -1));
  }, []);

  const fecharTeclado = useCallback(() => {
    setUsuarioSelecionado(null);
    setPinDigitado('');
    setErro(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!usuarioSelecionado || erro) return;

      if (e.key >= '0' && e.key <= '9') {
        handleDigitar(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleApagar();
      } else if (e.key === 'Escape') {
        fecharTeclado();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [usuarioSelecionado, erro, handleDigitar, handleApagar, fecharTeclado]);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 font-sans overflow-hidden relative selection:bg-fuchsia-500/30 selection:text-fuchsia-800 select-none pb-20 lg:pb-0">
      
      {/* FUNDO */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[65vw] h-[65vw] bg-slate-600/75 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55vw] h-[65vw] bg-slate-600/70 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '3s' }} />
        <div className="absolute top-[25%] left-[25%] w-[40vw] h-[40vw] bg-slate-600/70 rounded-full blur-[140px]" />
      </div>

      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIi8+Cjwvc3ZnPg==')] pointer-events-none z-0 opacity-40"></div>

      {/* ÍCONES FLUTUANTES*/}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
        <div className="absolute top-[12%] left-[8%] text-green-500 blur-[2px] floating-item-1">
          <LucideIcons.Umbrella size={100} strokeWidth={1} className="-rotate-12" />
        </div>
        <div className="absolute bottom-[20%] right-[10%] text-green-400 blur-[3px] floating-item-2">
          <LucideIcons.Wine size={100} strokeWidth={1} className="rotate-12" />
        </div>
      </div>

      {/* CARDÁPIO (DESKTOP) */}
      <div className="hidden xl:block absolute left-[32%] top-1/2 -translate-y-1/2 w-175 h-[85vh] pointer-events-none z-0 perspective-distant">
        <div className="w-full h-full relative" style={{ transform: 'rotateY(-30deg) rotateX(4deg) skewY(-2deg) translateZ(-100px)' }}>
          
          {/* Corpo do Table */}
          <div className="absolute inset-0 border border-white/10 rounded-[40px] shadow-2xl shadow-pink-900/20 bg-slate-900/60 backdrop-blur-2xl overflow-hidden" />
          <div className="absolute -inset-px border border-fuchsia-200/20 rounded-[40px] opacity-50" />
          
          <div className="absolute inset-0 p-8 flex gap-8 opacity-90">
            {/* Sidebar do Tablet Mockup */}
            <div className="w-14 h-full border-r border-white/5 flex flex-col items-center py-5 gap-5 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-fuchsia-600/30 to-fuchsia-500/10 border border-fuchsia-500/30 mb-6 flex items-center justify-center shadow-lg shadow-pink-500/20">
                <LucideIcons.Umbrella size={19} className="text-fuchsia-700" />
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5" />
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5" />
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5" />
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 mt-auto" />
            </div>

            {/* Conteúdo do Tablet Mockup */}
            <div className="flex-1 h-full pt-4 relative z-10">
              <div className="w-48 h-8 bg-white/5 border border-white/5 rounded-lg mb-10" />
              
              <div className="grid grid-cols-3 gap-6">
                {imagensMockup.map((imgUrl, i) => (
                  <div key={i} className="flex flex-col gap-4">
                    <div className="w-full h-36 lg:h-40 bg-slate-900 rounded-2xl border border-white/10 relative overflow-hidden flex items-center justify-center shadow-lg">
                      <img src={imgUrl} alt="Petisco/Bebida" className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" />
                      <div className="absolute inset-0 bg-linear-to-t from-slate-900 via-transparent to-transparent opacity-90" />
                      <div className="absolute inset-0 bg-green-500/10 shimmer-effect mix-blend-overlay" />
                    </div>
                    <div className="w-4/5 h-3 bg-white/10 rounded-full" />
                    <div className="w-1/2 h-2.5 bg-white/5 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LADO ESQUERDO: BRANDING (DESKTOP) */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-center pl-16 xl:pl-24 z-10">
        <div className="max-w-xl relative">
          
          <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 text-slate-300 px-5 py-2 rounded-full font-black uppercase tracking-[0.2em] text-[10px] mb-8 shadow-2xl backdrop-blur-xl">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            SISTEMA EXCLUSIVO
          </div>
          <h1 className="xl:text-[60px] lg:text-[50px] font-black text-white leading-[1.05] mb-5 tracking-tighter">
            T-SYSTEM BEACH<br />
            <span className="text-transparent tracking-tighter text-[30px] bg-clip-text bg-linear-to-r from-fuchsia-400 via-white to-green-600 drop-shadow-2xl">
              BARRACA CORAL
            </span>
          </h1>
          
          <h2 className="text-xl xl:text-[22px] font-sans text-slate-400 leading-relaxed mb-10 max-w-lg">
            A plataforma ideal para o seu negócio de barracas de praia.
          </h2>

          <div className="flex items-center gap-5 pt-2">
            <div className="group w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-fuchsia-400 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 transition-all duration-300 cursor-default shadow-xl">
              <LucideIcons.Umbrella size={24} strokeWidth={2} />
            </div>
            <div className="group w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-fuchsia-400 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 transition-all duration-300 cursor-default shadow-xl">
              <LucideIcons.Zap size={24} strokeWidth={2} />
            </div>
            <div className="group w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-fuchsia-400 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/10 transition-all duration-300 cursor-default shadow-xl">
              <LucideIcons.ShieldCheck size={24} strokeWidth={2} />
            </div>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: SELEÇÃO DE OPERADORES (MOBILE & DESKTOP) */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-4 lg:p-0 relative z-20 min-h-[85vh] lg:min-h-0">
        
        {/* HEADER MOBILE */}
        <div className={`flex lg:hidden flex-col items-center justify-center w-full mb-6 relative z-20 transition-all duration-500 pt-5 mx-auto ${usuarioSelecionado ? 'opacity-0 scale-95 pointer-events-none blur-md' : 'opacity-100 scale-100'}`}>
          <div className="w-15 h-15 bg-white/5 backdrop-blur-2xl rounded-[40px] border border-white/20 flex items-center justify-center mb-5 shadow-3xl">
            <LucideIcons.Umbrella className="text-green-500" size={30} strokeWidth={1.5} />
          </div>
          <h1 className="text-[30px] font-semibold text-white tracking-tighter text-center drop-shadow-2xl leading-none mb-2"> BARRACA CORAL </h1>
          <h2 className="text-[10px] font-semibold text-yellow-700 uppercase tracking-[0.2em] text-center">T-SYSTEM BEACH</h2>
        </div>

        {/* CONTAINER DOS OPERADORES */}
        <div className={`w-full max-w-md lg:max-w-115 lg:h-[76vh] lg:mr-16 mx-auto relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]
                        ${usuarioSelecionado ? 'opacity-0 scale-90 translate-y-10 blur-xl pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}`}>
          
          <div className="absolute inset-0 border border-white/40 rounded-[40px] shadow-3xl shadow-black/80 bg-slate-900/80 backdrop-blur-3xl" />
          <div className="absolute inset-0 border-t border-white/5 rounded-[40px] pointer-events-none" /> {/* Inner highlight */}

          <div className="relative z-10 p-6 lg:p-8 flex flex-col w-full h-full">
            <header className="flex items-center justify-between mb-8 pb-5 border-b border-white/20 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500/80 shadow-sm border border-rose-500/20" />
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500/80 shadow-sm border border-amber-500/20" />
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/80 shadow-sm border border-emerald-500/20" />
              </div>
              <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-slate-300">
                Acessar Usuário
              </p>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide min-h-80 lg:min-h-0 px-3 -mx-1 py-1">
              {listaUsuarios.map((usuario, index) => (
                <button
                  key={usuario.id}
                  onClick={() => setUsuarioSelecionado(usuario)}
                  className="group w-full flex items-center justify-between p-2 rounded-4xl transition-all duration-300 ease-out 
                             bg-white/5 border border-white/5 shadow-lg
                             hover:scale-[1.02] hover:-translate-y-0.5
                             hover:bg-linear-to-r hover:from-fuchsia-500/10 hover:to-transparent hover:border-fuchsia-500/30
                             active:scale-[0.98] relative overflow-hidden text-left"
                  style={{ animationFillMode: 'both', animationDelay: `${index * 60}ms` }}
                >
                  <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_ease-in-out_infinite]" />

                  <div className="flex items-center gap-3 relative z-10 min-w-0">
                    <div className="w-12 h-12 bg-black/20 rounded-4xl flex items-center justify-center text-[22px] border border-white/10 group-hover:border-fuchsia-500/70 group-hover:shadow-lg group-hover:shadow-fuchsia-500/5 transition-all duration-300 shrink-0">
                      {usuario.avatar}
                    </div>
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="uppercase text-[13px] font-medium text-slate-200 leading-none mb-1.5 truncate group-hover:text-white transition-colors">
                        {usuario.nome}
                      </span>
                      <div>
                        <span className={`text-[8px] font-medium uppercase tracking-[0.15em] px-2 py-0.5 rounded-md inline-block border transition-colors
                          ${usuario.cargo === 'admin' 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-white/5 text-slate-400 border-white/10'}`}>
                          {usuario.cargo === 'admin' ? 'Admin' : 'Garçom'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/8 text-slate-400 border border-white/5 group-hover:bg-green-900 group-hover:text-white group-hover:border-green-500 group-hover:shadow-lg group-hover:shadow-green-500/40 transition-all duration-300 relative z-10 shrink-0">
                    <LucideIcons.ArrowRight size={16} strokeWidth={2} />
                  </div>
                </button>
              ))}

              {listaUsuarios.length === 0 && (
                <div className="text-center p-10 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <LucideIcons.Users className="mx-auto text-slate-600 mb-4" size={36} strokeWidth={1.5} />
                  <p className="text-slate-400 font-bold text-[11px] leading-relaxed uppercase tracking-[0.2em]">Nenhum operador<br/>cadastrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ  */}
      <footer className="absolute bottom-6 left-0 right-0 lg:bottom-10 lg:left-16 lg:right-auto z-30 flex items-center justify-center lg:justify-start px-4 pointer-events-none">
        <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-2xl px-5 py-2.5 rounded-full border border-white/10 shadow-3xl pointer-events-auto">
          <div className="w-5 h-5 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center justify-center shrink-0 shadow-inner">
            <LucideIcons.Umbrella className="text-green-500" size={14} strokeWidth={2} />
          </div>
          <p className="text-[10px] text-slate-300 font-medium tracking-[0.2em] uppercase truncate pt-0.5">
            Desenvolvido pela empresa Âncora Dev | Thamiles
          </p>
        </div>
      </footer>

      {/* TECLADO PIN */}
      {usuarioSelecionado && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 p-4">
          
          <div className="w-full max-w-100 rounded-[40px] 
                          bg-slate-900/90 border border-white/10 mx-auto
                          shadow-2xl shadow-black/80
                          animate-in zoom-in-95 slide-in-from-bottom-10 duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col pt-12 pb-14 px-8 relative overflow-hidden backdrop-blur-3xl">
            
            <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-linear-to-r from-transparent via-green-500 to-transparent shadow-lg shadow-fuchsia-500/80" />

            <div className="text-center relative mb-2">
              <div className="w-20 h-20 rounded-[48px] flex items-center justify-center text-[40px] mx-auto -mt-20 mb-4 relative z-10
                              bg-linear-to-b from-slate-800 to-slate-800 border border-white/20 shadow-2xl shadow-black">
                {usuarioSelecionado.avatar}
              </div>
              <h2 className="uppercase text-[20px] font-bold tracking-tighter text-white mb-1">{usuarioSelecionado.nome}</h2>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.25em]">Senha</p>
            </div>

            {/* DÍGITOS DA SENHA */}
            <div className="flex justify-center gap-4 my-3 h-1 mb-4">
              {[1, 2, 3, 4].map((posicao) => {
                const preenchido = pinDigitado.length >= posicao;
                return (
                  <div 
                    key={posicao} 
                    className={`w-3 h-3 rounded-full transition-all duration-300 border
                      ${erro ? 'bg-rose-500 border-rose-400 shadow-lg shadow-rose-500/60 scale-110 animate-pulse' : 
                        preenchido ? 'bg-green-600 border-green-500 shadow-lg shadow-green-500/60 scale-110' : 
                        'bg-white/5 border-white/20'}`} 
                  />
                );
              })}
            </div>
            
            <div className="h-8 text-center mb-6 flex items-center justify-center">
              {erro && (
                <span className="text-[9px] font-sans text-rose-400 uppercase tracking-[0.3em] animate-in zoom-in slide-in-from-bottom-2 bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">
                  Senha Incorreta
                </span>
              )}
            </div>

            {/* TECLADO NUMÉRICO */}
            <div className="grid grid-cols-3 gap-y-5 gap-x-6 px-4 relative z-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num} 
                  onClick={() => handleDigitar(num.toString())}
                  className="h-16 w-16 mx-auto rounded-full text-[26px] font-light transition-all duration-200 flex items-center justify-center shadow-lg
                             bg-white/5 border border-white/10 text-white 
                             hover:bg-green-500/10 hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/5 hover:scale-105 hover:text-green-400
                             active:scale-95 active:bg-green-500 active:text-white active:border-green-400"
                >
                  {num}
                </button>
              ))}
              
              <button 
                onClick={fecharTeclado}
                className="h-16 w-16 mx-auto flex items-center justify-center text-[10px] font-medium uppercase tracking-[0.15em] transition-all duration-200 rounded-full 
                           text-slate-500 hover:bg-white/5 hover:text-slate-300 active:scale-95 border border-transparent hover:border-white/10"
              >
                Voltar
              </button>            
              
              <button 
                onClick={() => handleDigitar('0')}
                className="h-16 w-16 mx-auto rounded-full text-[26px] font-light transition-all duration-200 flex items-center justify-center shadow-lg
                           bg-white/5 border border-white/10 text-white 
                           hover:bg-green-500/10 hover:border-green-500/40 hover:shadow-xl hover:shadow-green-500/5 hover:scale-105 hover:text-green-400
                           active:scale-95 active:bg-green-500 active:text-white active:border-green-400"
              >
                0
              </button>
              
              <button 
                onClick={handleApagar}
                className="h-16 w-16 mx-auto flex items-center justify-center transition-all duration-200 rounded-full shadow-lg
                           bg-white/5 border border-white/5 text-slate-500 
                           hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-400 hover:shadow-xl hover:shadow-rose-500/20 hover:scale-105
                           active:scale-95 active:bg-rose-500 active:text-white active:border-rose-400"
              >
                <LucideIcons.Delete size={22} strokeWidth={2.5} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ANIMAÇÕES */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(200%) rotate(45deg); }
        }
        
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, #d946ef26, transparent);
          animation: shimmer 3.5s infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(3deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(15px) rotate(-3deg); }
        }

        .floating-item-1 { animation: float 16s ease-in-out infinite; }
        .floating-item-2 { animation: float 20s ease-in-out infinite reverse; }
        .floating-item-3 { animation: float 24s ease-in-out infinite; }
      `}</style>
    </div>
  );
}