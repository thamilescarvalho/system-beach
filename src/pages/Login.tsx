// src/pages/Login.tsx
import { useState, useContext } from 'react';
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

  // Funções do Teclado Numérico
  const handleDigitar = (numero: string) => {
    if (!usuarioSelecionado || pinDigitado.length >= 4) return;

    const novoPin = pinDigitado + numero;
    setPinDigitado(novoPin);

    if (novoPin.length === 4) {
      if (novoPin === usuarioSelecionado.pin) {
        // Sucesso: Loga e joga pra Home
        contexto?.setGarcomLogado(usuarioSelecionado);
        navigate('/');
      } else {
        // Erro: Fica vermelho e limpa para tentar de novo
        setErro(true);
        setTimeout(() => {
          setErro(false);
          setPinDigitado('');
        }, 600); // 600ms de "castigo" para o usuário ver que errou
      }
    }
  };

  const handleApagar = () => {
    setPinDigitado(prev => prev.slice(0, -1));
  };

  const fecharTeclado = () => {
    setUsuarioSelecionado(null);
    setPinDigitado('');
    setErro(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 sm:p-8 flex flex-col items-center justify-center font-sans relative overflow-hidden">
      
      {/* FUNDO */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* TELA PRINCIPAL: Lista de Usuários */}
      <div className={`w-full max-w-sm transition-all duration-500 relative z-10 ${usuarioSelecionado ? 'opacity-0 scale-90 pointer-events-none blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
        
        <header className="text-center mb-10">
          <div className="w-20 h-20 bg-white rounded-3xl shadow-[0_8px_20px_rgba(0,0,0,0.05)] border border-slate-100 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🏖️</span>
          </div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm mb-3">
            Barraca Coral
          </h1>
          <div className="inline-block bg-slate-900 text-white px-4 py-1.5 rounded-full shadow-inner border border-slate-700">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Acesso Restrito</p>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2 mb-1">Selecione seu usuário</p>
          
          {listaUsuarios.map((usuario) => (
            <button
              key={usuario.id}
              onClick={() => setUsuarioSelecionado(usuario)}
              className="group w-full flex items-center justify-between p-4 rounded-[28px] bg-white border border-slate-200 shadow-[0_6px_0_#e2e8f0] active:shadow-none active:translate-y-1.5 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-linear-to-br from-slate-50 to-slate-100 rounded-[20px] flex items-center justify-center text-3xl shadow-inner border border-slate-200 group-hover:scale-110 transition-transform duration-300">
                  {usuario.avatar}
                </div>
                <div className="text-left">
                  <span className="text-lg font-black text-slate-800 block leading-tight">{usuario.nome}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest mt-1 px-2.5 py-0.5 rounded-md inline-block border ${usuario.cargo === 'admin' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {usuario.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                  </span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </div>
            </button>
          ))}

          {listaUsuarios.length === 0 && (
            <div className="text-center p-10 bg-white/50 backdrop-blur-sm rounded-4xl border border-dashed border-slate-300">
              <span className="text-4xl block mb-3 opacity-50">🔒</span>
              <span className="text-slate-500 font-bold text-sm">Nenhum usuário configurado.<br/>Crie um pelo código fonte para iniciar.</span>
            </div>
          )}
        </div>
      </div>

      {/* TECLADO PIN  */}
      {usuarioSelecionado && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm rounded-t-[40px] sm:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 flex flex-col pb-10 border border-white/20">
            
            {/* Cabeçalho do Teclado */}
            <div className="p-8 pb-4 text-center relative">
              <div className="w-20 h-20 bg-linear-to-br from-slate-50 to-slate-100 rounded-3xl flex items-center justify-center text-4xl shadow-md border border-slate-200 mx-auto -mt-16 mb-5">
                {usuarioSelecionado.avatar}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{usuarioSelecionado.nome}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">PIN de segurança</p>
            </div>

            {/* Display das Bolinhas da Senha */}
            <div className="flex justify-center gap-5 my-6 h-5">
              {[1, 2, 3, 4].map((posicao) => {
                const preenchido = pinDigitado.length >= posicao;
                return (
                  <div 
                    key={posicao} 
                    className={`w-5 h-5 rounded-full transition-all duration-300 
                      ${erro ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 
                        preenchido ? 'bg-green-700 shadow-[0_0_12px_rgba(79,70,229,0.5)] scale-110' : 
                        'bg-slate-100 border-2 border-slate-300'}`} 
                  />
                );
              })}
            </div>
            
            {/* Mensagem de Erro com espaço reservado para não pular a tela */}
            <div className="h-6 text-center mb-2">
              {erro && (
                <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest animate-in slide-in-from-bottom-1 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
                  PIN Incorreto
                </span>
              )}
            </div>

            {/* TECLADO NUMÉRICO */}
            <div className="grid grid-cols-3 gap-4 px-10 mt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num} 
                  onClick={() => handleDigitar(num.toString())}
                  className="h-16 w-16 mx-auto rounded-full bg-slate-50 border border-slate-200 text-2xl font-bold text-slate-800 shadow-[0_4px_0_#e2e8f0] active:shadow-none active:translate-y-1 hover:bg-white hover:border-indigo-200 transition-all flex items-center justify-center"
                >
                  {num}
                </button>
              ))}
              
              {/* Botão Cancelar */}
              <button 
                onClick={fecharTeclado}
                className="h-16 w-16 mx-auto flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest active:text-slate-700 transition-colors hover:bg-slate-50 rounded-full"
              >
                Voltar
              </button>
              
              <button 
                onClick={() => handleDigitar('0')}
                className="h-16 w-16 mx-auto rounded-full bg-slate-50 border border-slate-200 text-2xl font-black text-slate-800 shadow-[0_4px_0_#e2e8f0] active:shadow-none active:translate-y-1 hover:bg-white hover:border-indigo-200 transition-all flex items-center justify-center"
              >
                0
              </button>
              
              {/* Botão Apagar Corrigido (Apenas 1 ícone limpo) */}
              <button 
                onClick={handleApagar}
                className="h-16 w-16 mx-auto flex items-center justify-center text-slate-400 active:text-rose-500 active:scale-90 transition-all hover:bg-rose-50 rounded-full"
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