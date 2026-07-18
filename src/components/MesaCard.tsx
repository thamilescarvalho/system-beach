// src/components/MesaCard.tsx
import { useNavigate } from 'react-router-dom';
import type { Mesa } from '../types';

interface MesaCardProps {
  mesa: Mesa;
}

export function MesaCard({ mesa }: MesaCardProps) {
  const navigate = useNavigate();
  const isLivre = mesa.status === 'livre';

  // Função que será chamada ao clicar no botão
  const handleSelecionarMesa = () => {
    navigate(`/comanda/${mesa.numero}`);
  };

  // Calcula a quantidade de itens na mesa
  const qtdItens = mesa.itens ? mesa.itens.reduce((acc, item) => acc + item.quantidade, 0) : 0;

  return (
    <button
      onClick={handleSelecionarMesa}
      className={`relative w-full p-6 rounded-[32px] text-left flex flex-col justify-between transition-all duration-300 transform-style-3d group min-h-[150px]
        ${isLivre
          ? 'bg-white border border-slate-200 shadow-sm shadow-slate-200/50 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/10 active:scale-[0.96] active:shadow-inner hover:-translate-y-1'
          : 'bg-gradient-to-br from-rose-500 to-rose-600 border border-rose-600 shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40 active:scale-[0.96] active:shadow-inner hover:-translate-y-1'
        }
      `}
    >
      <div className={`absolute inset-0 rounded-[32px] pointer-events-none transition-opacity ${isLivre ? 'bg-gradient-to-b from-white to-transparent opacity-50' : 'bg-white/10'}`} />

      {/* CABEÇALHO DO CARD */}
      <div className="flex justify-between items-start w-full relative z-10">
        <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center text-2xl shadow-inner transition-transform duration-300 group-hover:scale-110 
          ${isLivre ? 'bg-emerald-50 border border-emerald-100' : 'bg-white/20 border border-white/30 text-white'}`}
        >
          🏖️
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm backdrop-blur-md transition-colors
          ${isLivre ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' : 'bg-white/20 text-white border border-white/20'}`}
        >
          {mesa.status}
        </span>
      </div>

      {/* RODAPÉ DO CARD */}
      <div className="mt-6 relative z-10 w-full">
        <h3 className={`text-[42px] font-black tracking-tighter leading-none tabular-nums
          ${isLivre ? 'text-slate-800' : 'text-white drop-shadow-md'}`}
        >
          {mesa.numero}
        </h3>
        
        <div className={`mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest min-h-[16px]
          ${isLivre ? 'text-slate-400' : 'text-rose-100'}`}
        >
          {isLivre ? (
             <span>Toque para abrir</span>
          ) : (
            <>
              {/* PONTO DE STATUS */}
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse shadow-sm shadow-white/80 shrink-0"></span>
              <span className="truncate max-w-[80px] sm:max-w-[100px]">{mesa.nomeCliente || 'Sem Nome'}</span>
              <span className="opacity-50 shrink-0">•</span>
              <span className="shrink-0">{qtdItens} {qtdItens === 1 ? 'Item' : 'Itens'}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}