// src/pages/Login.tsx
import { useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Garcom } from '../types';

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
    <div className="min-h-screen w-full flex bg-slate-50 font-sans overflow-hidden relative selection:bg-cyan-100">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-25%] left-[-10%] w-[65vw] h-[65vw] bg-cyan-300/20 rounded-full blur-3xl mix-blend-multiply animate-pulse" />
        <div className="absolute top-[35%] right-[-10%] w-[55vw] h-[55vw] bg-blue-400/10 rounded-full blur-3xl mix-blend-multiply animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[-20%] left-[25%] w-[45vw] h-[45vw] bg-teal-200/20 rounded-full blur-3xl mix-blend-multiply animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* LADO ESQUERDO (DESKTOP)*/}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-14 z-10 border-r border-slate-200/50 bg-slate-100/30 backdrop-blur-sm">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          {/*<div className="w-11 h-11 rounded-2xl bg-white shadow-md shadow-slate-200/60 border border-slate-100 flex items-center justify-center text-2xl">
            🏖️
          </div>*/}
          <div>
            <span className="text-[30px] font-black uppercase text-cyan-800 tracking-tight block leading-tight">T-SYSTEM BEACH</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sistema de comanda digital</span>
          </div>
          
        </div>
        {/* Central Mockup Widget */}
        <div className="relative my-auto w-full max-w-md mx-auto">
          
          {/* Card Principal*/}
          <div className="bg-white/80 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl shadow-cyan-900/10 border border-white/90 space-y-5 relative z-20">
            
            {/* Header do Mockup */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold text-slate-700">Estabelecimento • Salão Ativo</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-50 text-cyan-700 px-2.5 py-1 rounded-md border border-cyan-100">
                POS v2.0
              </span>
            </div>

            {/* Simulação de Status das Mesas */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mesa 02</span>
                <span className="text-sm font-black text-emerald-600 block mt-0.5">Ocupada</span>
                <span className="text-[10px] text-slate-400 font-medium">3 Pedidos</span>
              </div>
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mesa 05</span>
                <span className="text-sm font-black text-amber-500 block mt-0.5">Conta</span>
                <span className="text-[10px] text-slate-400 font-medium">Aguardando</span>
              </div>
              <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mesa 08</span>
                <span className="text-sm font-black text-slate-400 block mt-0.5">Livre</span>
                <span className="text-[10px] text-slate-400 font-medium">Disponível</span>
              </div>
            </div>

            {/* Simulação de Pedido Recente */}
            <div className="bg-linear-to-r from-slate-900 to-slate-800 p-4 rounded-2xl text-white shadow-lg shadow-slate-900/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg backdrop-blur-md">
                  🍹
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100">2x Caipirinha de Limão</p>
                  <p className="text-[10px] text-slate-400">Enviado para a Cozinha • 12s atrás</p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded">
                Pronto
              </span>
            </div>

          </div>

          {/* Badge Flutuante 1 (Atrás/Lateral) */}
          <div className="absolute -top-5 -right-5 z-30 bg-white/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-xl shadow-slate-900/5 border border-white flex items-center gap-2.5">
            <span className="text-base">⚡</span>
            <div>
              <p className="text-xs font-bold text-slate-800">Sincronização Instantânea</p>
              <p className="text-[10px] text-slate-400 font-semibold">Supabase Realtime</p>
            </div>
          </div>

          {/* Badge Flutuante 2 (Base) */}
          <div className="absolute -bottom-5 -left-5 z-30 bg-white/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl shadow-xl shadow-slate-900/5 border border-white flex items-center gap-2.5">
            <span className="text-base">📊</span>
            <div>
              <p className="text-xs font-bold text-slate-800">Controle Financeiro</p>
              <p className="text-[10px] text-slate-400 font-semibold">Relatórios de Caixa</p>
            </div>
          </div>

        </div>

        {/* Footer do Lado Esquerdo */}
        <div className="max-w-md">
          <h2 className="text-[16px] font-bold uppercase text-cyan-700 tracking-tight mb-1">
            ESTABELECIMENTO: BARRACA CORAL
          </h2>
          <p className="text-[12px] text-slate-500 font-medium leading-relaxed">
            Desenvolvido sob medida pela empresa: Âncora Dev (Thamiles).
          </p>
        </div>

      </div>

      {/* LADO DIREITO (MOBILE/DESKTOP) - ÁREA DE LOGIN*/}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 relative z-10">
        
        {/* HEADER MOBILE*/}
        <div className={`flex lg:hidden flex-col items-center justify-center w-full mb-8 relative z-20 animate-in fade-in zoom-in duration-700 transition-all ${usuarioSelecionado ? 'opacity-0 scale-95 pointer-events-none blur-md' : 'opacity-100 scale-100 blur-0'}`}>
          <h2 className="text-[22px] font-black text-slate-800 tracking-tight drop-shadow-sm">
            <span className="text-cyan-600">T</span>-SYSTEM BEACH </h2>
            <span className="text-[12px] font-bold uppercase tracking-widest text-cyan-700 mt-1">
               BARRACA CORAL
          </span>
        </div>

        <div className={`w-full max-w-md bg-white/70 backdrop-blur-4xl p-8 sm:p-10 rounded-[3rem] shadow-xl shadow-slate-300 border border-white transition-all duration-700 relative ${usuarioSelecionado ? 'opacity-0 scale-95 pointer-events-none blur-md' : 'opacity-100 scale-100 blur-0'}`}>
          
          <header className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              SELECIONE SEU USUÁRIO
            </p>
          </header>

          <div className="flex flex-col gap-3">
            
            {listaUsuarios.map((usuario, index) => (
              <button
                key={usuario.id}
                onClick={() => setUsuarioSelecionado(usuario)}
                className="group w-full flex items-center justify-between p-5 rounded-4xl transition-all duration-300 ease-out 
                           bg-white/80 backdrop-blur-sm border border-slate-100 shadow-sm
                           hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-600 hover:bg-white
                           active:scale-[0.98] active:translate-y-0"
                style={{ animationFillMode: 'both', animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-slate-100 rounded-3xl flex items-center justify-center text-2xl border border-slate-200 group-hover:bg-cyan-50 group-hover:scale-105 transition-all duration-300 shadow-inner">
                    {usuario.avatar}
                  </div>
                  <div className="text-left flex flex-col justify-center">
                    <span className="text-[14px] font-bold uppercase text-slate-800 leading-none mb-1">{usuario.nome}</span>
                    <div>
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${usuario.cargo === 'admin' ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-200 text-slate-600'}`}>
                        {usuario.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 group-hover:text-cyan-600 transition-colors duration-300 mr-2 group-hover:translate-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </button>
            ))}

            {listaUsuarios.length === 0 && (
              <div className="text-center p-8 bg-white/40 backdrop-blur-md rounded-3xl border border-dashed border-slate-300/80">
                <span className="text-4xl block mb-3 opacity-40 grayscale">📡</span>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">Terminal sem usuários sincronizados.<br/>Acesse o banco de dados.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE TECLADO PIN */}
      {usuarioSelecionado && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/20 backdrop-blur-xl animate-in fade-in duration-300">
          
          <div className="bg-white/80 backdrop-blur-4xl w-full max-w-100 rounded-t-[3rem] sm:rounded-[3rem] shadow-4xl border border-white/90 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-400 flex flex-col pt-10 pb-12 px-6">
            
            <div className="text-center relative mb-10">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-cyan-500/10 border border-slate-100 mx-auto -mt-16 mb-4 relative z-10 transition-transform hover:scale-105">
                {usuarioSelecionado.avatar}
              </div>
              <h2 className="text-[17px] font-bold uppercase text-slate-800 tracking-tight">{usuarioSelecionado.nome}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Digite a senha</p>
            </div>

            {/* Bolinhas da Senha*/}
            <div className="flex justify-center gap-5 my-2 h-5">
              {[1, 2, 3, 4].map((posicao) => {
                const preenchido = pinDigitado.length >= posicao;
                return (
                  <div 
                    key={posicao} 
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 
                      ${erro ? 'bg-rose-500 shadow-lg shadow-rose-500/50 scale-110' : 
                        preenchido ? 'bg-cyan-600 shadow-lg shadow-cyan-500/50 scale-110' : 
                        'bg-slate-200/80 shadow-inner'}`} 
                  />
                );
              })}
            </div>
            
            {/* Mensagem de Erro */}
            <div className="h-8 text-center mb-6 flex items-center justify-center">
              {erro && (
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest animate-in slide-in-from-bottom-1">
                  Senha Incorreta
                </span>
              )}
            </div>

            {/* Teclado Numérico */}
            <div className="grid grid-cols-3 gap-y-4 gap-x-5 px-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button 
                  key={num} 
                  onClick={() => handleDigitar(num.toString())}
                  className="h-15 w-15 mx-auto rounded-full bg-transparent border border-transparent text-3xl font-light text-slate-800 transition-all duration-200 flex items-center justify-center
                             hover:bg-white/80 hover:shadow-lg hover:shadow-cyan-500/10 hover:border-white hover:scale-105
                             active:scale-95 active:bg-cyan-50 active:text-cyan-600"
                >
                  {num}
                </button>
              ))}
              
              <button 
                onClick={fecharTeclado}
                className="h-15 w-15 mx-auto flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest transition-all duration-200 rounded-full hover:bg-white/80 hover:text-slate-700 active:scale-90"
              >
                Voltar
              </button>            
              
              <button 
                onClick={() => handleDigitar('0')}
                className="h-15 w-15 mx-auto rounded-full bg-transparent border border-transparent text-3xl font-light text-slate-800 transition-all duration-200 flex items-center justify-center
                           hover:bg-white/80 hover:shadow-lg hover:shadow-cyan-500/10 hover:border-white hover:scale-105
                           active:scale-95 active:bg-cyan-50 active:text-cyan-600"
              >
                0
              </button>
              
              <button 
                onClick={handleApagar}
                className="h-15 w-15 mx-auto flex items-center justify-center text-slate-400 transition-all duration-200 rounded-full hover:bg-rose-50/80 hover:text-rose-500 active:scale-90 active:bg-rose-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" x2="12" y1="9" y2="15"/><line x1="12" x2="18" y1="9" y2="15"/></svg>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}