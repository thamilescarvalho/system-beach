// src/pages/AdminMesas.tsx
import { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export function AdminMesas() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  const mesas = contexto?.mesas || [];

  const [modalAberto, setModalAberto] = useState(false);
  const [numeroNovaMesa, setNumeroNovaMesa] = useState('');

  const handleAdicionarMesa = () => {
    const num = parseInt(numeroNovaMesa);
    if (!num || num <= 0) {
      alert('Por favor, digite um número válido.');
      return;
    }
    if (mesas.some(m => m.numero === num)) {
      alert(`A Mesa ${num} já existe no salão!`);
      return;
    }
    contexto?.adicionarMesa(num);
    setModalAberto(false);
    setNumeroNovaMesa('');
  };

  const handleRemoverMesa = (numero: number, status: string) => {
    if (status === 'ocupada') {
      alert(`Não é possível remover a Mesa ${numero} pois ela está com clientes no momento! Finalize a conta primeiro.`);
      return;
    }
    if (confirm(`Atenção: Você tem certeza que deseja excluir a Mesa ${numero} do sistema?`)) {
      contexto?.removerMesa(numero);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative overflow-hidden">
      
      {/*  FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-rose-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-amber-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-600 active:scale-90 transition-all hover:bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm leading-none">
              SALÃO
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Gestão de Mesas</p>
          </div>
        </div>
        
        {/* NOVA MESA */}
        <button 
          onClick={() => setModalAberto(true)} 
          className="flex items-center gap-2 bg-linear-to-b from-zinc-500 to-zinc-700 border border-zinc-600 active:shadow-none active:translate-y-1 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
        >
          <span>NOVA</span><span className="text-lg leading-none mb-0.5">+</span>
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-6 relative z-10 animate-in zoom-in-95 duration-500">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-black text-slate-800 tracking-widest uppercase">Mesas Cadastradas</h2>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border border-slate-200 shadow-sm px-4 py-1.5 rounded-full">
            {mesas.length} Totais
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {mesas.map((mesa) => {
            const isOcupada = mesa.status === 'ocupada';

            return (
              <div 
                key={mesa.id} 
                className="bg-white/80 backdrop-blur-md p-4 rounded-[28px] shadow-sm border border-slate-200 flex flex-col items-center relative overflow-hidden group"
              >
                {/* Linha colorida no topo do card indicando status */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${isOcupada ? 'bg-rose-300' : 'bg-zinc-600'}`} />
                
                {/* Ícone (Guarda-Sol) */}
                <div className="w-14 h-14 mt-2 rounded-[18px] bg-linear-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-inner flex items-center justify-center text-3xl mb-3">
                  🏖️
                </div>
                
                <span className="font-black text-slate-800 tracking-tight text-xl leading-none mb-1">
                  {mesa.numero}
                </span>
                
                <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mb-4
                  ${isOcupada ? 'bg-rose-100 text-rose-400' : 'bg-zinc-100 text-zinc-600'}
                `}>
                  {isOcupada ? 'Ocupada' : 'Livre'}
                </span>

                {/* BOTÃO REMOVER*/}
                <button 
                  onClick={() => handleRemoverMesa(mesa.numero, mesa.status)}
                  disabled={isOcupada}
                  className={`w-full py-2.5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all mt-auto
                    ${isOcupada 
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60' 
                      : 'bg-linear-to-b from-zinc-300 to-zinc-200 text-zinc-800 border border-zinc-300 active:shadow-none active:translate-y-1 hover:bg-rose-100'
                    }
                  `}
                >
                  Remover
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* 🚀 MODAL 3D: NOVA MESA */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalAberto(false)}></div>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-linear-to-br from-emerald-50 to-emerald-100 border border-emerald-200 text-emerald-500 rounded-[20px] shadow-inner flex items-center justify-center mx-auto mb-5 text-3xl">
                🏖️
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">NOVA MESA</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Qual o número da mesa?</p>
            </div>

            <div className="space-y-5">
              <input 
                type="number" 
                inputMode="numeric"
                autoFocus
                value={numeroNovaMesa} 
                onChange={(e) => setNumeroNovaMesa(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-50/70 py-6 rounded-3xl border border-slate-200 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 text-center font-black text-5xl text-slate-800 transition-all placeholder:text-slate-200"
              />

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setModalAberto(false)} 
                  className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-black py-4 rounded-[20px] text-xs uppercase tracking-widest transition-colors active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdicionarMesa} 
                  className="flex-[1.5] bg-linear-to-b from-emerald-400 to-emerald-500 border border-emerald-400 shadow-[0_6px_0_#047857,0_10px_20px_rgba(16,185,129,0.3)] active:shadow-[0_0px_0_#047857,0_0px_0_rgba(16,185,129,0)] active:translate-y-1.5 text-white font-black py-4 rounded-[20px] text-xs uppercase tracking-widest transition-all"
                >
                  Criar Mesa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}