import { useMemo, useState } from 'react';
import { formatarMoeda } from './financeiroUtils';
import type { PontoComparativoFluxo } from './metricasUtils';

interface GraficoComparativoBarrasProps {
  pontos: PontoComparativoFluxo[];
  ocultarValores?: boolean;
}

function construirCaminhoSuave(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Gráfico minimalista de curvas suaves (estilo SaaS UI Kit) comparando Entradas e Saídas,
 * com tooltip flutuante e grade limpa.
 */
export function GraficoComparativoBarras({
  pontos,
  ocultarValores = false
}: GraficoComparativoBarrasProps) {
  const [indiceHover, setIndiceHover] = useState<number | null>(null);

  const { maxValor, indiceDestaque } = useMemo(() => {
    let maior = 100;
    let idxMaior = Math.max(0, pontos.length - 1);
    let maiorSoma = -1;

    pontos.forEach((p, idx) => {
      maior = Math.max(maior, p.entradas, p.saidas);
      const soma = p.entradas + p.saidas;
      if (soma > maiorSoma) {
        maiorSoma = soma;
        idxMaior = idx;
      }
    });

    const idxValido =
      indiceHover !== null && indiceHover >= 0 && indiceHover < pontos.length
        ? indiceHover
        : idxMaior;

    return { maxValor: maior * 1.15, indiceDestaque: idxValido };
  }, [pontos, indiceHover]);

  if (pontos.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-slate-400">
        Sem registros no período selecionado.
      </div>
    );
  }

  const largura = 540;
  const altura = 165;
  const padX = 16;
  const padTop = 18;
  const padBottom = 22;
  const utilW = largura - padX * 2;
  const utilH = altura - padTop - padBottom;

  const coordsEntradas = pontos.map((p, idx) => {
    const x = pontos.length === 1 ? largura / 2 : padX + (idx / (pontos.length - 1)) * utilW;
    const y = padTop + utilH - Math.min(1, Math.max(0, p.entradas / maxValor)) * utilH;
    return { x, y };
  });

  const coordsSaidas = pontos.map((p, idx) => {
    const x = pontos.length === 1 ? largura / 2 : padX + (idx / (pontos.length - 1)) * utilW;
    const y = padTop + utilH - Math.min(1, Math.max(0, p.saidas / maxValor)) * utilH;
    return { x, y };
  });

  const pathEntradas = construirCaminhoSuave(coordsEntradas);
  const pathSaidas = construirCaminhoSuave(coordsSaidas);

  const areaEntradas =
    coordsEntradas.length > 1
      ? `${pathEntradas} L ${coordsEntradas[coordsEntradas.length - 1].x.toFixed(1)} ${(padTop + utilH).toFixed(1)} L ${coordsEntradas[0].x.toFixed(1)} ${(padTop + utilH).toFixed(1)} Z`
      : '';

  const pontoAtivo = pontos[indiceDestaque];
  const coordAtiva = coordsEntradas[indiceDestaque] || { x: largura / 2, y: altura / 2 };
  const passoLabel = pontos.length > 8 ? Math.ceil(pontos.length / 6) : 1;

  const marcasEixoY = [1, 0.66, 0.33, 0].map((fator) => {
    const val = Math.round((maxValor / 1.15) * fator);
    if (val >= 1000) return `${(val / 1000).toFixed(1).replace('.0', '')}k`;
    return `${val}`;
  });

  return (
    <div className="select-none">
      <div className="flex gap-2.5 items-stretch">
        {/* Eixo Y minimalista */}
        <div className="flex flex-col justify-between pb-6 pt-2 text-[10px] font-medium text-slate-400 tabular-nums w-8 text-right shrink-0">
          {marcasEixoY.map((m, i) => (
            <span key={i}>{ocultarValores ? '••' : m}</span>
          ))}
        </div>

        {/* Área do gráfico SVG */}
        <div className="relative flex-1 min-w-0">
          {/* Pílula flutuante estilo Dtour UI Kit */}
          {pontoAtivo && (
            <div
              style={{
                left: `${Math.min(82, Math.max(18, (coordAtiva.x / largura) * 100))}%`
              }}
              className="pointer-events-none absolute -top-1 -translate-x-1/2 z-20 inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white border border-slate-200/90 shadow-[0_6px_18px_-4px_rgba(15,23,42,0.12)] text-[11px] whitespace-nowrap transition-all duration-200"
            >
              <span className="font-semibold text-slate-500">{pontoAtivo.label}</span>
              <span className="h-3 w-px bg-slate-200" />
              <span className="font-bold text-slate-900 tabular-nums">
                {ocultarValores ? 'R$ •••' : formatarMoeda(pontoAtivo.entradas)}
              </span>
              {pontoAtivo.saidas > 0 && (
                <span className="text-[10px] font-medium text-amber-600 tabular-nums">
                  (-{ocultarValores ? '•••' : formatarMoeda(pontoAtivo.saidas)})
                </span>
              )}
            </div>
          )}

          <svg
            viewBox={`0 0 ${largura} ${altura}`}
            className="w-full h-44 overflow-visible"
            role="img"
            aria-label="Gráfico comparativo de entradas e saídas"
          >
            <defs>
              <linearGradient id="gradAreaEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Linhas horizontais sutis */}
            {[0, 0.33, 0.66, 1].map((f, i) => {
              const y = padTop + utilH * f;
              return (
                <line
                  key={i}
                  x1={padX}
                  x2={largura - padX}
                  y1={y}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
              );
            })}

            {/* Área preenchida sob Entradas */}
            {areaEntradas && <path d={areaEntradas} fill="url(#gradAreaEntradas)" />}

            {/* Curva Saídas (Amarelo/Âmbar suave como na referência) */}
            <path
              d={pathSaidas}
              fill="none"
              stroke="#facc15"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Curva Entradas (Azul Celeste limpo como na referência) */}
            <path
              d={pathEntradas}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.6"
              strokeLinecap="round"
            />

            {/* Linha vertical tracejada no ponto ativo */}
            <line
              x1={coordAtiva.x}
              x2={coordAtiva.x}
              y1={padTop}
              y2={padTop + utilH}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
              strokeWidth="1"
            />

            {/* Ponto destacado */}
            <circle
              cx={coordAtiva.x}
              cy={coordAtiva.y}
              r="4.5"
              fill="#ffffff"
              stroke="#0284c7"
              strokeWidth="2.5"
            />

            {/* Zonas interativas invisíveis para hover/toque */}
            {pontos.map((p, idx) => {
              const c = coordsEntradas[idx];
              const colW = utilW / Math.max(1, pontos.length);
              return (
                <rect
                  key={`${p.label}-${idx}`}
                  x={c.x - colW / 2}
                  y={0}
                  width={colW}
                  height={altura}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setIndiceHover(idx)}
                  onClick={() => setIndiceHover(idx)}
                />
              );
            })}
          </svg>

          {/* Rótulos do eixo X */}
          <div className="flex items-center justify-between px-2 -mt-2">
            {pontos.map((p, idx) => {
              const mostrar = idx % passoLabel === 0 || idx === pontos.length - 1;
              const ativo = idx === indiceDestaque;
              return (
                <button
                  key={`${p.label}-${idx}`}
                  type="button"
                  onClick={() => setIndiceHover(idx)}
                  className={`text-[10px] tabular-nums transition-colors cursor-pointer ${
                    ativo ? 'font-bold text-slate-800' : 'font-medium text-slate-400'
                  } ${mostrar ? 'opacity-100' : 'opacity-0 sm:opacity-60'}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
