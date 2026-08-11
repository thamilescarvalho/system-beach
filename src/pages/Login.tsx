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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 font-sans overflow-hidden relative selection:bg-cyan-500/30 selection:text-cyan-50 select-none pb-20 lg:pb-0">
      
      {/* BACKGROUND AMBIENTE */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-cyan-950/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-950/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      {/* ELEMENTOS FLUTUANTES */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] text-cyan-500/25 blur-[2px] floating-item-1">
          <LucideIcons.Beer size={120} strokeWidth={1.5} className="-rotate-12" />
        </div>
        <div className="absolute top-[25%] right-[8%] text-blue-500/25 blur-[1px] floating-item-2">
          <LucideIcons.Wine size={90} strokeWidth={1.5} className="rotate-12" />
        </div>
        <div className="absolute bottom-[15%] left-[30%] text-cyan-600/25 blur-[3px] floating-item-3">
          <LucideIcons.UtensilsCrossed size={160} strokeWidth={1} className="-rotate-45" />
        </div>
        <div className="absolute bottom-[30%] right-[35%] text-blue-400/25 blur-[2px] floating-item-1">
          <LucideIcons.Coffee size={140} strokeWidth={1.5} className="rotate-12" />
        </div>
      </div>
 
      {/* CARDÁPIO 3D EM ÂNGULO (DESKTOP)  */}
      <div className="hidden xl:block absolute left-[28%] top-1/2 -translate-y-1/2 w-[700px] h-[85vh] pointer-events-none z-0 perspective-[1100px]">
        <div className="w-full h-full relative" style={{ transform: 'rotateY(-30deg) rotateX(5deg) skewY(-2deg) translateZ(-130px)' }}>
          
          <div className="absolute inset-0 border-3 border-cyan-400/40 rounded-4xl shadow-4xl bg-slate-900/50 backdrop-blur-md overflow-hidden"></div>
          <div className="absolute -inset-4 border border-cyan-500/10 rounded-4xl"></div>
          
          <div className="absolute inset-0 p-7 flex gap-6 opacity-90">
            <div className="w-12 h-full border-r border-cyan-500/20 flex flex-col items-center py-4 gap-6 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-cyan-400/20 border border-cyan-400/40 mb-4"></div>
              <div className="w-6 h-6 rounded-md bg-cyan-500/10"></div>
              <div className="w-6 h-6 rounded-md bg-cyan-500/10"></div>
              <div className="w-6 h-6 rounded-md bg-cyan-500/10"></div>
              <div className="w-6 h-6 rounded-md bg-cyan-500/10 mt-auto"></div>
            </div>

            <div className="flex-1 h-full pt-3 relative z-10">
              <div className="w-40 h-6 bg-cyan-500/20 rounded-md mb-8"></div>
              
              <div className="grid grid-cols-3 gap-5">
                {imagensMockup.map((imgUrl, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="w-full h-32 lg:h-36 bg-slate-900 rounded-xl border border-cyan-500/30 relative overflow-hidden flex items-center justify-center shadow-md">
                      <img src={imgUrl} alt="Petisco/Bebida" className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-screen saturate-50" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
                      <div className="absolute inset-0 bg-cyan-400/10 shimmer-effect mix-blend-overlay"></div>
                    </div>
                    <div className="w-3/4 h-3 bg-cyan-400/20 rounded-full"></div>
                    <div className="w-1/2 h-2.5 bg-cyan-400/10 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LADO ESQUERDO (DESKTOP) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center pl-16 xl:pl-24 z-10">
        <div className="max-w-xl relative">
          
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 text-white px-4 py-1 rounded-full font-medium uppercase tracking-widest text-[9px] mb-6 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-md"></span>
            SISTEMA EXCLUSIVO PARA BARRACAS DE PRAIA
          </div>
          <h1 className="xl:text-[50px] font-bold text-slate-200 leading-[1.2] mb-3 tracking-tight">
            T-SYSTEM BEACH <br />
            <span className="xl:text-[40px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-md">
              BARRACA CORAL
            </span>
          </h1>
          <h2 className="text-3xl xl:text-[25px] font-light text-slate-300 leading-tight mb-8">
            Mais agilidade no atendimento<br/> do seu estabelecimento.
          </h2>
        </div>
      </div>

      {/* LADO DIREITO (USUÁRIOS) */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 lg:p-0 relative z-20 min-h-[75vh] lg:min-h-0">
        
        {/* HEADER MOBILE */}
        <div className={`flex lg:hidden flex-col items-center justify-center w-full mb-6 relative z-20 transition-all duration-500 mx-auto ${usuarioSelecionado ? 'opacity-0 scale-95 pointer-events-none blur-md' : 'opacity-100 scale-100'}`}>
          <div className="w-16 h-16 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-cyan-500/30 flex items-center justify-center mb-4 shadow-xl">
            <LucideIcons.Tent className="text-cyan-400" size={36} strokeWidth={2} />
          </div>
          <h1 className="text-[35px] font-medium text-white tracking-tight mb-1 drop-shadow-lg text-center"> BARRACA CORAL </h1>
          <h2 className="text-[15px] font-bold text-cyan-700 uppercase tracking-widest mb-3 drop-shadow-md text-center">T-SYSTEM BEACH</h2>
        </div>

        {/* CONTAINER DO PAINEL DE OPERADORES */}
        <div className={`w-full max-w-md lg:max-w-[540px] lg:h-[72vh] mx-auto relative transition-all duration-1000
                        ${usuarioSelecionado ? 'opacity-0 scale-90 translate-y-8 blur-md' : 'opacity-100 scale-100 translate-y-0'}`}>
          
          <div className="absolute inset-0 border-[1.5px] lg:border-2 border-cyan-400/60 rounded-3xl shadow-2xl bg-slate-900/95 lg:bg-slate-900/90 backdrop-blur-2xl"></div>

          <div className="relative z-10 p-5 lg:p-6 flex flex-col w-full h-full">
            <header className="flex items-center justify-between mb-6 lg:mb-8 border-b border-cyan-500/20 pb-4 lg:pb-5 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-rose-500 shadow-md"></div>
                <div className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-amber-500 shadow-md"></div>
                <div className="w-3 h-3 lg:w-3.5 lg:h-3.5 rounded-full bg-emerald-500 shadow-md"></div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-400/80">
                Operadores
              </p>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide min-h-[320px] lg:min-h-0 px-2 -mx-2 py-2">
              {listaUsuarios.map((usuario, index) => (
                <button
                  key={usuario.id}
                  onClick={() => setUsuarioSelecionado(usuario)}
                  className="group w-full flex items-center justify-between p-4 rounded-3xl transition-all duration-300 ease-out 
                             bg-slate-900 border border-slate-800 shadow-md
                             hover:scale-[1.02] hover:-translate-y-1
                             hover:bg-slate-800 hover:border-cyan-400 hover:shadow-2xl
                             active:scale-95 relative overflow-hidden"
                  style={{ animationFillMode: 'both', animationDelay: `${index * 100}ms` }}
                >
                  
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1s_ease-in-out_infinite]" />

                  <div className="flex items-center gap-4 lg:gap-5 relative z-10">
                    <div className="w-12 h-12 lg:w-14 lg:h-14 bg-slate-850 rounded-4xl flex items-center justify-center text-2xl lg:text-3xl border border-slate-600 group-hover:border-cyan-400 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                      {usuario.avatar}
                    </div>
                    <div className="text-left flex flex-col justify-center">
                      <span className="uppercase text-[13px] lg:text-[13px] font-bold text-slate-200 leading-none mb-2 group-hover:text-white transition-colors">{usuario.nome}</span>
                      <div>
                        <span className={`text-[8px] lg:text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-4xl inline-block shadow-sm transition-colors
                          ${usuario.cargo === 'admin' ? 'bg-cyan-950 text-cyan-400 border border-cyan-900 group-hover:bg-cyan-900' : 'bg-slate-950 text-slate-400 border border-slate-800 group-hover:text-cyan-300 group-hover:border-cyan-700'}`}>
                          {usuario.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full flex items-center justify-center bg-slate-950 text-slate-500 border border-slate-800 group-hover:bg-cyan-400 group-hover:text-slate-950 group-hover:border-cyan-300 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300 shadow-inner relative z-10 shrink-0">
                    <LucideIcons.ChevronRight size={20} strokeWidth={3} />
                  </div>
                </button>
              ))}

              {listaUsuarios.length === 0 && (
                <div className="text-center p-8 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
                  <LucideIcons.WifiOff className="mx-auto text-slate-500 mb-3" size={32} />
                  <p className="text-slate-400 font-bold text-xs leading-relaxed uppercase tracking-widest">Nenhum usuário<br/>sincronizado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RODAPÉ */}
      <footer className="absolute bottom-12 left-0 right-0 lg:bottom-27 lg:left-19 lg:right-auto z-30 flex items-center justify-center lg:justify-start px-4 pointer-events-none">
        <div className="flex items-center gap-2.5 bg-slate-900/40 backdrop-blur-md px-4 py-2 rounded-full border border-slate-800 shadow-lg pointer-events-auto">
          <div className="w-5 h-5 bg-cyan-500/10 rounded-md border border-cyan-500/30 flex items-center justify-center shrink-0">
            <LucideIcons.Tent className="text-cyan-400" size={12} />
          </div>
          <p className="text-[9px] text-slate-400 font-medium tracking-widest uppercase truncate">
            Desenvolvido por Âncora Dev (Thamiles)
          </p>
        </div>
      </footer>

      {/* TECLADO PIN */}
      {usuarioSelecionado && (
        <div className="absolute inset-0 z-100 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          
          <div className="w-full max-w-[380px] rounded-t-4xl sm:rounded-4xl 
                          bg-slate-900 border border-cyan-500/40 mx-auto
                          shadow-2xl
                          animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-400 flex flex-col pt-10 pb-15 px-6 relative overflow-hidden">
            
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg opacity-50" />

            <div className="text-center relative mb-8">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mx-auto -mt-16 mb-4 relative z-10
                              bg-slate-950 border border-slate-800 shadow-xl">
                {usuarioSelecionado.avatar}
              </div>
              <h2 className="uppercase text-[18px] font-bold tracking-tight text-slate-100">{usuarioSelecionado.nome}</h2>
            </div>

            <div className="flex justify-center gap-4 my-2 h-5 mb-6">
              {[1, 2, 3, 4].map((posicao) => {
                const preenchido = pinDigitado.length >= posicao;
                return (
                  <div 
                    key={posicao} 
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 border
                      ${erro ? 'bg-rose-500 border-rose-500 shadow-md scale-125' : 
                        preenchido ? 'bg-cyan-400 border-cyan-400 shadow-md scale-125' : 
                        'bg-slate-800 border-slate-700 shadow-inner'}`} 
                  />
                );
              })}
            </div>
            
            <div className="h-6 text-center mb-4 flex items-center justify-center">
              {erro && (
                <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest animate-in zoom-in slide-in-from-bottom-2 bg-rose-950/40 px-4 py-1.5 rounded-full border border-rose-900/50">
                  Senha Incorreta
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-y-4 gap-x-5 px-2 relative z-10">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num} 
                  onClick={() => handleDigitar(num.toString())}
                  className="h-16 w-16 mx-auto rounded-full text-2xl font-light transition-all duration-200 flex items-center justify-center shadow-md
                             bg-slate-950 border border-slate-800 text-slate-300 
                             hover:bg-slate-800 hover:border-cyan-500/40 hover:shadow-lg hover:scale-105 hover:text-cyan-400
                             active:scale-95 active:bg-cyan-500 active:text-slate-950 active:border-cyan-500"
                >
                  {num}
                </button>
              ))}
              
              <button 
                onClick={fecharTeclado}
                className="h-16 w-16 mx-auto flex items-center justify-center text-[9px] font-bold uppercase tracking-widest transition-all duration-200 rounded-full 
                           text-slate-500 hover:bg-slate-950 hover:text-slate-300 active:scale-95"
              >
                Voltar
              </button>            
              
              <button 
                onClick={() => handleDigitar('0')}
                className="h-16 w-16 mx-auto rounded-full text-2xl font-light transition-all duration-200 flex items-center justify-center shadow-md
                             bg-slate-950 border border-slate-800 text-slate-300 
                             hover:bg-slate-800 hover:border-cyan-500/40 hover:shadow-lg hover:scale-105 hover:text-cyan-400
                             active:scale-95 active:bg-cyan-500 active:text-slate-950 active:border-cyan-500"
              >
                0
              </button>
              
              <button 
                onClick={handleApagar}
                className="h-16 w-16 mx-auto flex items-center justify-center transition-all duration-200 rounded-full shadow-md
                           bg-slate-950 border border-slate-800 text-slate-500 
                           hover:bg-rose-950/40 hover:border-rose-900/50 hover:text-rose-400 hover:shadow-lg hover:scale-105
                           active:scale-95 active:bg-rose-500 active:text-white active:border-rose-500"
              >
                <LucideIcons.Delete size={20} strokeWidth={2.5} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ESTILOS CSS NATIVOS */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(200%) rotate(45deg); }
        }
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(6,182,212,0.1), transparent);
          animation: shimmer 3s infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-15px) rotate(3deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(15px) rotate(-3deg); }
        }

        .floating-item-1 { animation: float 12s ease-in-out infinite; }
        .floating-item-2 { animation: float 15s ease-in-out infinite reverse; }
        .floating-item-3 { animation: float 18s ease-in-out infinite; }
      `}</style>
    </div>
  );
}