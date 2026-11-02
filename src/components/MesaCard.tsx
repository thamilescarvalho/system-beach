// src/components/MesaCard.tsx
import { useNavigate } from 'react-router-dom';
import type { Mesa } from '../types';

interface MesaCardProps {
  mesa: Mesa;
}

export function MesaCard({ mesa }: MesaCardProps) {
  const navigate = useNavigate();
  const isLivre = mesa.status === 'livre';

  const handleSelecionarMesa = () => {
    navigate(`/comanda/${mesa.numero}`);
  };

  const qtdItens = mesa.itens ? mesa.itens.reduce((acc, item) => acc + item.quantidade, 0) : 0;

  return (
    <button
      type="button"
      onClick={handleSelecionarMesa}
      className={`relative w-full p-5 sm:p-6 rounded-4xl text-left flex flex-col justify-between transition-all duration-300 group min-h-36
        ${isLivre
          ? 'bg-white border border-slate-200 shadow-sm shadow-slate-200/50 hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-500/10 active:scale-95 active:shadow-inner hover:-translate-y-1'
          : 'bg-linear-to-br from-rose-500 to-rose-600 border border-rose-600 shadow-md shadow-rose-500/30 hover:shadow-lg hover:shadow-rose-500/40 active:scale-95 active:shadow-inner hover:-translate-y-1'
        }
      `}
    >
      <div className={`absolute inset-0 rounded-4xl pointer-events-none transition-opacity ${isLivre ? 'bg-linear-to-b from-white to-transparent opacity-50' : 'bg-white/10'}`} />

      {/* CABEÇALHO DO CARD */}
      <div className="flex justify-between items-start w-full relative z-10 gap-2">
        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-inner transition-transform duration-300 group-hover:scale-110 shrink-0
          ${isLivre ? 'bg-emerald-50 border border-emerald-100' : 'bg-white/20 border border-white/30 text-white'}`}
        >
          🏖️
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl shadow-xs backdrop-blur-md transition-colors truncate
          ${isLivre ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/50' : 'bg-white/20 text-white border border-white/20'}`}
        >
          {mesa.status}
        </span>
      </div>

      {/* RODAPÉ DO CARD */}
      <div className="mt-5 relative z-10 w-full min-w-0">
        <h3 className={`text-3xl sm:text-4xl font-black tracking-tighter leading-none tabular-nums
          ${isLivre ? 'text-slate-800' : 'text-white drop-shadow-sm'}`}
        >
          {mesa.numero}
        </h3>

        <div className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest min-h-4 min-w-0
          ${isLivre ? 'text-slate-400' : 'text-rose-100'}`}
        >
          {isLivre ? (
            <span className="truncate">Toque para abrir</span>
          ) : (
            <>
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse shadow-xs shrink-0" />
              <span className="truncate flex-1">{mesa.nomeCliente || 'Sem Nome'}</span>
              <span className="opacity-50 shrink-0">•</span>
              <span className="shrink-0">{qtdItens} {qtdItens === 1 ? 'Item' : 'Itens'}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
