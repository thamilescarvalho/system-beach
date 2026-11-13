import { useMemo, useState } from 'react';
import { formatarMoeda } from './financeiroUtils';

export interface PontoGraficoFintech {
  label: string;
  valor: number;
  sublabel?: string;
}

interface GraficoLinhaFintechProps {
  pontos: PontoGraficoFintech[];
  ocultarValores?: boolean;
  etiquetaSerie?: string;
}

interface Coordenada {
  x: number;
  y: number;
  ponto: PontoGraficoFintech;
  idx: number;
}

function construirCurvaSuave(coords: Coordenada[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i === 0 ? i : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

    const tension = 0.22;
    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export function GraficoLinhaFintech({
  pontos,
  ocultarValores = false,
  etiquetaSerie = 'Saldo'
}: GraficoLinhaFintechProps) {
  const [indiceSelecionado, setIndiceSelecionado] = useState<number | null>(null);

  const larguraViewBox = 560;
  const alturaViewBox = 112;
  const padX = 18;
  const padTop = 20;
  const padBottom = 10;
  const areaUtilAltura = alturaViewBox - padTop - padBottom;
  const areaUtilLargura = larguraViewBox - padX * 2;

  const { coords, caminhoLinha, caminhoArea, indiceDestaque } = useMemo(() => {
    if (pontos.length === 0) {
      return { coords: [], caminhoLinha: '', caminhoArea: '', indiceDestaque: 0 };
    }

    const valores = pontos.map((p) => p.valor);
    const minVal = Math.min(0, ...valores);
    const maxVal = Math.max(10, ...valores);
    const amplitude = maxVal - minVal || 1;

    const listaCoords: Coordenada[] = pontos.map((ponto, idx) => {
      const ratioX = pontos.length === 1 ? 0.5 : idx / (pontos.length - 1);
      const x = padX + ratioX * areaUtilLargura;
      const ratioY = (ponto.valor - minVal) / amplitude;
      const y = padTop + (1 - ratioY) * areaUtilAltura;
      return { x, y, ponto, idx };
    });

    const linha = construirCurvaSuave(listaCoords);
    const baseY = alturaViewBox - padBottom;
    const area =
      listaCoords.length > 0
        ? `${linha} L ${listaCoords[listaCoords.length - 1].x.toFixed(1)} ${baseY} L ${listaCoords[0].x.toFixed(1)} ${baseY} Z`
        : '';

    // Destaque automático no ponto mais relevante (último valor != 0 ou último índice)
    let padrao = listaCoords.length - 1;
    let maior = -Infinity;
    listaCoords.forEach((c, i) => {
      if (c.ponto.valor > maior) {
        maior = c.ponto.valor;
        padrao = i;
      }
    });

    const idxValido =
      indiceSelecionado !== null && indiceSelecionado >= 0 && indiceSelecionado < listaCoords.length
        ? indiceSelecionado
        : padrao;

    return {
      coords: listaCoords,
      caminhoLinha: linha,
      caminhoArea: area,
      indiceDestaque: idxValido
    };
  }, [pontos, indiceSelecionado, areaUtilAltura, areaUtilLargura]);

  const pontoAtivo = coords[indiceDestaque];
  const pctLeft = pontoAtivo ? (pontoAtivo.x / larguraViewBox) * 100 : 50;
  const pctTop = pontoAtivo ? (pontoAtivo.y / alturaViewBox) * 100 : 50;
  const pctClampedLeft = Math.min(82, Math.max(18, pctLeft));

  // Exibe rótulos espaçados no eixo X para evitar sobreposição em mobile
  const passoLabelX = pontos.length > 10 ? Math.ceil(pontos.length / 6) : 1;

  return (
    <div className="w-full select-none">
      <div className="relative w-full h-24 sm:h-28">
        {/* Tooltip Flutuante Estilo Fintech */}
        {pontoAtivo && (
          <div
            style={{ left: `${pctClampedLeft}%`, top: `${Math.max(4, pctTop - 24)}%` }}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center transition-all duration-150"
          >
            <div className="bg-white text-emerald-950 px-2.5 py-1 rounded-lg shadow-md border border-emerald-100 whitespace-nowrap flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight">
                {ocultarValores ? 'R$ ••••' : formatarMoeda(pontoAtivo.ponto.valor)}
              </span>
              {pontoAtivo.ponto.sublabel && (
                <span className="text-[10px] font-semibold text-emerald-700">
                  {pontoAtivo.ponto.sublabel}
                </span>
              )}
            </div>
            <div className="w-2 h-2 bg-white rotate-45 -mt-1 border-r border-b border-emerald-100" />
          </div>
        )}

        <svg
          viewBox={`0 0 ${larguraViewBox} ${alturaViewBox}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          role="img"
          aria-label={`Gráfico de ${etiquetaSerie}`}
        >
          <defs>
            <linearGradient id="fintechMintArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.32" />
              <stop offset="75%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Linhas de referência horizontais tracejadas */}
          {[0.25, 0.5, 0.75].map((ratio) => {
            const gy = padTop + ratio * areaUtilAltura;
            return (
              <line
                key={ratio}
                x1={padX}
                y1={gy}
                x2={larguraViewBox - padX}
                y2={gy}
                stroke="#a7f3d0"
                strokeOpacity="0.14"
                strokeWidth="1"
                strokeDasharray="4 5"
              />
            );
          })}

          {/* Área sombreada */}
          {caminhoArea && <path d={caminhoArea} fill="url(#fintechMintArea)" />}

          {/* Linha principal em Verde-Menta Brilhante */}
          {caminhoLinha && (
            <path
              d={caminhoLinha}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Linha vertical guia do ponto ativo */}
          {pontoAtivo && (
            <line
              x1={pontoAtivo.x}
              y1={pontoAtivo.y}
              x2={pontoAtivo.x}
              y2={alturaViewBox - padBottom}
              stroke="#6ee7b7"
              strokeOpacity="0.45"
              strokeWidth="1.25"
              strokeDasharray="3 3"
            />
          )}

          {/* Marcador ativo */}
          {pontoAtivo && (
            <g>
              <circle cx={pontoAtivo.x} cy={pontoAtivo.y} r="9" fill="#34d399" fillOpacity="0.22" />
              <circle
                cx={pontoAtivo.x}
                cy={pontoAtivo.y}
                r="4.5"
                fill="#34d399"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Zonas clicáveis/hover por coluna */}
          {coords.map((c) => {
            const larguraSlot = coords.length > 1 ? areaUtilLargura / (coords.length - 1) : areaUtilLargura;
            return (
              <rect
                key={c.idx}
                x={Math.max(0, c.x - larguraSlot / 2)}
                y={0}
                width={larguraSlot}
                height={alturaViewBox}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setIndiceSelecionado(c.idx)}
                onClick={() => setIndiceSelecionado(c.idx)}
              />
            );
          })}
        </svg>
      </div>

      {/* Eixo X abaixo do gráfico */}
      <div className="flex items-center justify-between px-1 pt-1.5 border-t border-emerald-400/15">
        {pontos.map((p, idx) => {
          const mostrarLabel =
            idx === 0 ||
            idx === pontos.length - 1 ||
            idx % passoLabelX === 0 ||
            idx === indiceDestaque;
          if (!mostrarLabel) return null;
          const ativo = idx === indiceDestaque;
          return (
            <button
              key={`${p.label}-${idx}`}
              type="button"
              onClick={() => setIndiceSelecionado(idx)}
              className={`text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer px-1.5 py-0.5 rounded ${
                ativo
                  ? 'text-emerald-200 bg-emerald-400/15 font-bold'
                  : 'text-emerald-300/60 hover:text-emerald-200'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
