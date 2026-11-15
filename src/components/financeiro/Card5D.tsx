import { useState, type ReactNode } from 'react';

export type VarianteCard5D = 'pearl' | 'obsidian' | 'tray';

interface Card5DProps {
  variante?: VarianteCard5D;
  interativo?: boolean;
  className?: string;
  innerClassName?: string;
  onClick?: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Card minimalista com profundidade suave 5D (superfície branca pura, sombra difusa
 * de múltiplas camadas e leve inclinação/reflexo especular em desktop).
 */
export function Card5D({
  interativo = true,
  className = '',
  innerClassName = '',
  onClick,
  title,
  children
}: Card5DProps) {
  const [tilt, setTilt] = useState<{ rx: number; ry: number; gx: number; gy: number; ativo: boolean }>({
    rx: 0,
    ry: 0,
    gx: 50,
    gy: 20,
    ativo: false
  });

  const podeInclinar =
    interativo &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!podeInclinar) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const ry = (relX - 0.5) * 2.2;
    const rx = (0.5 - relY) * 2.2;
    setTilt({
      rx: Number(rx.toFixed(2)),
      ry: Number(ry.toFixed(2)),
      gx: Math.round(relX * 100),
      gy: Math.round(relY * 100),
      ativo: true
    });
  };

  const handleMouseLeave = () => {
    if (!tilt.ativo) return;
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 20, ativo: false });
  };

  const estiloTransform = podeInclinar
    ? {
        transform: `perspective(1200px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(0)`,
        transition: tilt.ativo ? 'transform 120ms ease-out' : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
      }
    : undefined;

  const clicavel = Boolean(onClick);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      onKeyDown={clicavel ? handleKeyDown : undefined}
      role={clicavel ? 'button' : undefined}
      tabIndex={clicavel ? 0 : undefined}
      title={title}
      style={estiloTransform}
      className={`relative hover:z-30 focus-within:z-30 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05),0_1px_3px_rgba(15,23,42,0.02)] hover:shadow-[0_10px_28px_-6px_rgba(15,23,42,0.08)] transition-all duration-300 overflow-visible ${clicavel ? 'cursor-pointer active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-200' : ''} ${className}`}
    >
      {/* Brilho especular 5D sutil no hover */}
      {podeInclinar && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden"
        >
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: tilt.ativo ? 1 : 0,
              background: `radial-gradient(360px circle at ${tilt.gx}% ${tilt.gy}%, rgba(16,185,129,0.045), transparent 65%)`
            }}
          />
        </div>
      )}
      <div className={`relative z-10 h-full ${innerClassName}`}>{children}</div>
    </div>
  );
}
