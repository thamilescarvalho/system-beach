// src/pages/Setup.tsx
import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export function Setup() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);

  const [nomeDono, setNomeDono] = useState('');
  const [pinDono, setPinDono] = useState('');

  const handleCriarAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (nomeDono && pinDono.length === 4) {
      // Cria o usuário Master
      contexto?.adicionarUsuario({
        id: 'admin-master',
        nome: nomeDono,
        avatar: '👑', 
        pin: pinDono,
        cargo: 'admin' 
      });
      
      // Após criar, joga para a tela de Login
      navigate('/login');
    } else {
      alert("Preencha o nome e um PIN de 4 dígitos.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6 relative overflow-hidden">
      
      {/* FUNDO */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl p-8 sm:p-10 rounded-[40px] shadow-2xl border border-white/50 animate-in zoom-in-95 duration-500 relative z-10">
        
        <header className="text-center space-y-3 mb-10">
          <div className="w-24 h-24 bg-linear-to-br from-slate-800 to-slate-900 rounded-[28px] flex items-center justify-center text-5xl mx-auto mb-6 shadow-[0_8px_20px_rgba(0,0,0,0.15)] border border-slate-700">
            👑
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm">
            Setup Inicial
          </h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest bg-slate-100 inline-block px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
            Criação do Administrador
          </p>
        </header>

        <form onSubmit={handleCriarAdmin} className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 block mb-2">Nome do Proprietário</label>
            <input 
              type="text" 
              placeholder="Ex: Ismael" 
              value={nomeDono}
              onChange={(e) => setNomeDono(e.target.value)}
              className="w-full bg-slate-50/70 p-4 h-15 rounded-[20px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 font-bold text-slate-800 transition-all border border-slate-200"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 block mb-2">PIN Mestre (4 Dígitos)</label>
            <input 
              type="password" 
              maxLength={4} 
              inputMode="numeric"
              placeholder="••••" 
              value={pinDono}
              onChange={(e) => setPinDono(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-slate-50/70 p-4 h-15 rounded-[20px] outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/20 font-black text-2xl text-center tracking-[1em] text-slate-800 transition-all border border-slate-200 placeholder:text-slate-300"
            />
          </div>

          <button className="w-full mt-4 bg-slate-900 border border-slate-800 shadow-[0_6px_0_#0f172a,0_10px_20px_rgba(0,0,0,0.3)] active:shadow-[0_0px_0_#0f172a,0_0px_0_rgba(0,0,0,0)] active:translate-y-1.5 text-white font-black py-5 rounded-3xl uppercase tracking-widest transition-all text-sm flex items-center justify-center gap-2">
            Iniciar Sistema <span className="text-xl leading-none">🚀</span>
          </button>
        </form>

      </div>
    </div>
  );
}