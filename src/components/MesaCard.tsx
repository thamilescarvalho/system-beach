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

  return (
    <button
      onClick={handleSelecionarMesa}
      className={`p-8 rounded-2xl shadow-sm text-center flex flex-col items-center justify-center transition-transform active:scale-95 ${
        isLivre
          ? 'bg-white border-2 border-emerald-400'
          : 'bg-rose-50 border-2 border-rose-400'
      }`}
    >
      <span className={`text-4xl font-black ${isLivre ? 'text-emerald-500' : 'text-rose-600'}`}>
        {mesa.numero}
      </span>
      <span className={`text-xs mt-2 font-bold uppercase tracking-wider ${isLivre ? 'text-emerald-500' : 'text-rose-500'}`}>
        {mesa.status}
      </span>
    </button>
  );
}