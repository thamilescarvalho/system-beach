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
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative overflow-hidden perspective-distant">
      
      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-rose-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-amber-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* HEADER SUPERIOR (Sombras Nativas) */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-sm shadow-slate-200/50 px-6 py-4 flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 transition-all hover:bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-[20px] font-black text-slate-900 tracking-widest uppercase leading-none">
              SALÃO
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Gestão de Mesas</p>
          </div>
        </div>
        
        {/* NOVA MESA  */}
        <button 
          onClick={() => setModalAberto(true)} 
          className="flex items-center gap-2 bg-linear-to-b from-slate-700 to-slate-900 border border-slate-800 border-t-slate-600/50 shadow-md shadow-slate-800/30 hover:shadow-lg hover:shadow-slate-800/40 active:scale-95 active:shadow-inner px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
        >
          <span>NOVA</span><span className="text-lg leading-none mb-0.5">+</span>
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 relative z-10 animate-in zoom-in-95 duration-500 transform-style-3d">
        
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[11px] font-bold text-slate-800 tracking-widest uppercase">Mesas Cadastradas</h2>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest bg-white border border-slate-200 shadow-sm shadow-slate-200/50 px-3 py-1.5 rounded-full">
            {mesas.length} Totais
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {mesas.map((mesa) => {
            const isOcupada = mesa.status === 'ocupada';

            return (
              <div 
                key={mesa.id} 
                className="bg-white p-4 rounded-3xl shadow-sm shadow-slate-200/50 border border-slate-200 flex flex-col items-center relative overflow-hidden group hover:shadow-md transition-all duration-300 transform-style-3d hover:-translate-y-1"
              >
                {/* Linha colorida no topo do card indicando status */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${isOcupada ? 'bg-teal-500' : 'bg-slate-400'}`} />
                
                {/* Número da Mesa */}
                <div className="w-14 h-14 mt-2 rounded-[20px] bg-linear-to-br from-slate-50 to-slate-100 border border-slate-200 shadow-inner shadow-slate-200/50 flex items-center justify-center text-3xl mb-3 group-hover:scale-105 transition-transform duration-300">
                  {mesa.numero}
                </div>
                <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md mb-8 shadow-sm border
                  ${isOcupada ? 'bg-teal-50 text-zinc-400 border-zinc-200' : 'bg-slate-50 text-slate-500 border-slate-200'}
                `}>
                  {isOcupada ? 'Ocupada' : 'Livre'}
                </span>

                {/* BOTÃO REMOVER  */}
                <button 
                  onClick={() => handleRemoverMesa(mesa.numero, mesa.status)}
                  disabled={isOcupada}
                  className={`w-full py-2 rounded-4xl text-[9px] font-bold uppercase tracking-widest transition-all mt-auto border
                    ${isOcupada 
                      ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-70' 
                      : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-200 hover:border-zinc-300 shadow-sm shadow-zinc-100/50 active:scale-95 active:shadow-inner'
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

      {/* NOVA MESA */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalAberto(false)}></div>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl shadow-slate-900/50 relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 border border-white/20">
            
            <div className="text-center mb-7">             
              <h3 className="text-3xl font-black text-slate-900 leading-tight tracking-tight uppercase">NOVA MESA</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Qual o número da mesa?</p>
            </div>

            <div className="space-y-7">
              <input 
                type="number" 
                inputMode="numeric"
                autoFocus
                value={numeroNovaMesa} 
                onChange={(e) => setNumeroNovaMesa(e.target.value)}
                placeholder="0"
                className="w-full bg-zinc-50 py-2 rounded-3xl border border-slate-400 outline-none focus:border-zinc-400 focus:bg-zinc-200 text-center font-bold text-[25px] tabular-nums text-slate-800 transition-all placeholder:text-slate-200 shadow-inner shadow-slate-100/50"
              />

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setModalAberto(false)} 
                  className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-300 font-bold py-2 rounded-4xl text-[10px] uppercase tracking-widest transition-colors active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAdicionarMesa} 
                  className="flex-1 bg-linear-to-b from-zinc-500 to-zinc-600 border border-zinc-600 border-t-zinc-400/50 shadow-md shadow-zinc-600/30 active:scale-95 active:shadow-inner hover:shadow-lg hover:shadow-zinc-600/40 text-white font-bold py-3 rounded-4xl text-[11px] uppercase tracking-widest transition-all"
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