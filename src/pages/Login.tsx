// src/pages/Login.tsx
import { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Garcom } from '../types';

export function Login() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);

  const listaUsuarios = contexto?.usuarios || [];

  // Estados para o Teclado de PIN
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Garcom | null>(null);
  const [pinDigitado, setPinDigitado] = useState('');
  const [erro, setErro] = useState(false);

  // Autenticação
  const handleDigitar = useCallback(async (numero: string) => {
    if (!usuarioSelecionado || pinDigitado.length >= 4) return;

    const novoPin = pinDigitado + numero;
    setPinDigitado(novoPin);

    if (novoPin.length === 4) {
      // Servidor
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
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [usuarioSelecionado, erro, handleDigitar, handleApagar, fecharTeclado]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-8 flex flex-col items-center justify-center font-sans relative overflow-hidden perspective-distant">
      
      {/* FUNDO  */}
      <div className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[60vw] h-[60vw] max-w-125 max-h-125 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Lista de Usuários */}
      <div className={`w-full max-w-sm transition-all duration-500 relative z-10 transform-style-3d ${usuarioSelecionado ? 'opacity-0 scale-95 pointer-events-none blur-sm' : 'opacity-100 scale-100 blur-0 animate-in zoom-in-95'}`}>
        
        <header className="text-center mb-10">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 flex items-center justify-center mx-auto mb-6 relative">
            <div className="absolute inset-0 bg-white/20 rounded-3xl pointer-events-none shadow-inner shadow-slate-200/50"></div>
            <span className="text-4xl relative z-10">🏖️</span>
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm mb-3">
            Barraca Coral
          </h1>
          <div className="inline-block bg-slate-900 text-white px-5 py-1.5 rounded-full shadow-inner shadow-black/50 border border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Acesso Restrito</p>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 mb-1 text-center">Selecione seu usuário</p>
          
          {listaUsuarios.map((usuario) => (
            <button
              key={usuario.id}
              onClick={() => setUsuarioSelecionado(usuario)}
              className="group w-full flex items-center justify-between p-4 rounded-4xl transition-all duration-300 ease-out transform-style-3d overflow-hidden
                         bg-white border border-white shadow-md shadow-slate-200/50
                         hover:-translate-y-1.5 hover:rotate-x-2 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-slate-100
                         active:scale-[0.97] active:translate-y-0 active:shadow-inner active:shadow-slate-200/50"
            >
              <div className="absolute inset-0 bg-white/40 rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-linear-to-br from-slate-50 to-slate-100 rounded-[20px] flex items-center justify-center text-3xl shadow-inner shadow-slate-200/50 border border-slate-200 group-hover:scale-110 transition-transform duration-300">
                  {usuario.avatar}
                </div>
                <div className="text-left flex flex-col justify-center">
                  <span className="text-[19px] font-black text-slate-800 block leading-tight tracking-tight drop-shadow-sm">{usuario.nome}</span>
                  <div className="mt-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md inline-block shadow-sm ${usuario.cargo === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {usuario.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-300 mr-1 relative z-10 border border-transparent group-hover:border-indigo-100 group-hover:shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          ))}

          {listaUsuarios.length === 0 && (
            <div className="text-center p-10 bg-white/60 backdrop-blur-md rounded-[36px] border border-dashed border-slate-300 shadow-sm">
              <span className="text-4xl block mb-4 opacity-50 grayscale">🔒</span>
              <p className="text-slate-500 font-bold text-sm leading-relaxed">Nenhum usuário configurado.<br/>Crie um pelo código fonte para iniciar.</p>
            </div>
          )}
        </div>
      </div>

      {/* TECLADO PIN */}
      {usuarioSelecionado && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          
          <div className="bg-white/95 backdrop-blur-2xl w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] shadow-2xl shadow-slate-900/50 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 flex flex-col pb-10 border border-white/40">
            
            {/* Cabeçalho do Teclado */}
            <div className="p-8 pb-4 text-center relative">
              <div className="w-24 h-24 bg-linear-to-br from-slate-50 to-slate-100 rounded-[28px] flex items-center justify-center text-5xl shadow-lg shadow-slate-200/50 border border-slate-200 mx-auto -mt-16 mb-5">
                {usuarioSelecionado.avatar}
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{usuarioSelecionado.nome}</h2>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">PIN de segurança</p>
            </div>

            {/* Display das Bolinhas da Senha */}
            <div className="flex justify-center gap-5 my-6 h-5">
              {[1, 2, 3, 4].map((posicao) => {
                const preenchido = pinDigitado.length >= posicao;
                return (
                  <div 
                    key={posicao} 
                    className={`w-5 h-5 rounded-full transition-all duration-300 
                      ${erro ? 'bg-rose-500 shadow-md shadow-rose-500/50' : 
                        preenchido ? 'bg-emerald-500 shadow-md shadow-emerald-500/50 scale-110' : 
                        'bg-slate-100 border-2 border-slate-200'}`} 
                  />
                );
              })}
            </div>
            
            {/* Mensagem de Erro */}
            <div className="h-6 text-center mb-4">
              {erro && (
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest animate-in slide-in-from-bottom-1 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-200 shadow-sm">
                  PIN Incorreto
                </span>
              )}
            </div>

            {/* TECLADO NUMÉRICO */}
            <div className="grid grid-cols-3 gap-y-2 gap-x-6 px-12 mt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num} 
                  onClick={() => handleDigitar(num.toString())}
                  className="h-16 w-16 mx-auto rounded-full bg-slate-50/50 border border-transparent text-[28px] font-black text-slate-800 transition-all duration-200 ease-out flex items-center justify-center
                             hover:bg-white hover:border-slate-200 hover:shadow-md hover:shadow-slate-200/50 hover:scale-105
                             active:scale-95 active:bg-slate-100 active:shadow-inner active:border-transparent"
                >
                  {num}
                </button>
              ))}
              {/* Botão Cancelar */}
              <button 
                onClick={fecharTeclado}
                className="h-16 w-16 mx-auto flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all duration-200 rounded-full hover:bg-slate-100 hover:text-slate-600 active:scale-90"
              >
                Voltar
              </button>             
              {/* Botão Zero */}
              <button 
                onClick={() => handleDigitar('0')}
                className="h-16 w-16 mx-auto rounded-full bg-slate-50/50 border border-transparent text-[28px] font-black text-slate-800 transition-all duration-200 ease-out flex items-center justify-center
                             hover:bg-white hover:border-slate-200 hover:shadow-md hover:shadow-slate-200/50 hover:scale-105
                             active:scale-95 active:bg-slate-100 active:shadow-inner active:border-transparent"
              >
                0
              </button>
              
              {/* Botão Apagar */}
              <button 
                onClick={handleApagar}
                className="h-16 w-16 mx-auto flex items-center justify-center text-slate-400 transition-all duration-200 rounded-full hover:bg-rose-50 hover:text-rose-500 active:scale-90 active:bg-rose-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" x2="12" y1="9" y2="15"/><line x1="12" x2="18" y1="9" y2="15"/></svg>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}