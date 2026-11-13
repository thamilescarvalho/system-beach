import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type TomIconeModal = 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'slate';

interface ModalBaseProps {
  aberto: boolean;
  onFechar: () => void;
  titulo: string;
  subtitulo?: string;
  icone?: ReactNode;
  tomIcone?: TomIconeModal;
  tamanho?: 'sm' | 'md' | 'lg';
  zIndexClass?: string;
  bloqueado?: boolean;
  headerExtra?: ReactNode;
  footer?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
}

const CLASSES_TOM_ICONE: Record<TomIconeModal, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200/80'
};

const CLASSES_TAMANHO: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg'
};

export function ModalBase({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  icone,
  tomIcone = 'emerald',
  tamanho = 'md',
  zIndexClass = 'z-50',
  bloqueado = false,
  headerExtra,
  footer,
  bodyClassName = 'bg-white',
  children
}: ModalBaseProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!aberto) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const restoreFocus = () => {
      const activeElement = document.activeElement as HTMLElement | null;
      if (activeElement && dialogRef.current?.contains(activeElement)) {
        return;
      }
      dialogRef.current?.focus();
    };

    restoreFocus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !bloqueado) {
        onFechar();
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!first || !last) return;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [aberto, bloqueado, onFechar]);

  if (!aberto) return null;

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 font-sans print:hidden`}
      role="presentation"
      onClick={() => {
        if (!bloqueado) onFechar();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitulo ? descriptionId : undefined}
        tabIndex={-1}
        className={`w-full ${CLASSES_TAMANHO[tamanho]} bg-white rounded-3xl shadow-2xl border border-slate-200 max-h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 focus:outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 bg-white shrink-0 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {icone && (
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${CLASSES_TOM_ICONE[tomIcone]}`}
                >
                  {icone}
                </div>
              )}
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-bold text-slate-900 leading-tight truncate">
                  {titulo}
                </h2>
                {subtitulo && (
                  <p id={descriptionId} className="text-xs text-slate-500 mt-0.5 truncate">{subtitulo}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={bloqueado}
              onClick={onFechar}
              aria-label="Fechar modal"
              className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {headerExtra}
        </div>

        <div className={`p-5 overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-white shrink-0">{footer}</div>
        )}
      </div>
    </div>
  );
}
