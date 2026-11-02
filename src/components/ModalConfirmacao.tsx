// src/components/ModalConfirmacao.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';

export type TipoModalConfirmacao = 'perigo' | 'aviso' | 'primario';

export interface ModalConfirmacaoProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  tipo?: TipoModalConfirmacao;
  iconePersonalizado?: React.ReactNode;
  carregando?: boolean;
  onConfirmar: () => void | Promise<void>;
  onCancelar: () => void;
}

export function ModalConfirmacao({
  aberto,
  titulo,
  descricao,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  tipo = 'primario',
  iconePersonalizado,
  carregando = false,
  onConfirmar,
  onCancelar
}: ModalConfirmacaoProps) {
  if (!aberto) return null;

  const configCores = {
    perigo: {
      iconeBadge: 'bg-rose-50 text-rose-600 border border-rose-100',
      iconePadrao: <LucideIcons.Trash2 size={22} strokeWidth={2.2} />,
      btnConfirmar: 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20'
    },
    aviso: {
      iconeBadge: 'bg-amber-50 text-amber-600 border border-amber-100',
      iconePadrao: <LucideIcons.AlertTriangle size={22} strokeWidth={2.2} />,
      btnConfirmar: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20'
    },
    primario: {
      iconeBadge: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100',
      iconePadrao: <LucideIcons.UserCheck size={22} strokeWidth={2.2} />,
      btnConfirmar: 'bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/20'
    }
  }[tipo];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => !carregando && onCancelar()}
    >
      <div
        className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl shadow-2xl shadow-slate-900/15 p-6 sm:p-7 relative flex flex-col items-center text-center animate-in zoom-in-95 duration-200 font-sans antialiased"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão de Fechar Rápido */}
        {!carregando && (
          <button
            type="button"
            onClick={onCancelar}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <LucideIcons.X size={15} strokeWidth={2.3} />
          </button>
        )}

        {/* Ícone */}
        <div className={`w-12 h-12 rounded-3xl flex items-center justify-center mb-4 shadow-xs ${configCores.iconeBadge}`}>
          {iconePersonalizado || configCores.iconePadrao}
        </div>

        {/* Título */}
        <h3 className="text-base sm:text-lg font-medium text-slate-900 tracking-tight leading-snug mb-2">
          {titulo}
        </h3>

        {/* Descrição */}
        <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed mb-6 whitespace-pre-line">
          {descricao}
        </p>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2.5 w-full">
          <button
            type="button"
            disabled={carregando}
            onClick={onCancelar}
            className="flex-1 h-11 rounded-3xl border border-slate-200/90 hover:bg-slate-50 text-slate-600 font-medium text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {textoCancelar}
          </button>

          <button
            type="button"
            disabled={carregando}
            onClick={onConfirmar}
            className={`flex-1 h-11 rounded-3xl font-medium text-xs sm:text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer ${configCores.btnConfirmar}`}
          >
            {carregando ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{textoConfirmar}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
