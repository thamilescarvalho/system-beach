// src/components/VitrineSistemaDesktop.tsx
import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

export function VitrineSistemaDesktop() {
  const [slideAtivo, setSlideAtivo] = useState<number>(0);

  const slides = [
    {
      id: 0,
      etiqueta: 'Salão de Guarda-Sóis',
      resumo: 'Mapa em Tempo Real',
      descricao: 'Visualização limpa e instantânea de mesas livres, ocupadas e comandas ativas.'
    },
    {
      id: 1,
      etiqueta: 'Bar e Cozinha Inteligente',
      resumo: 'Fluxo em 1 Toque',
      descricao: 'Pedidos lançados na areia chegam na hora com controle de preparo e aviso de prato pronto.'
    },
    {
      id: 2,
      etiqueta: 'Caixa e Fechamento Digital',
      resumo: 'Gestão Financeira',
      descricao: 'Acompanhamento de vendas concluídas, formas de pagamento, metas, vales e cupom térmico.'
    }
  ];

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSlideAtivo((atual) => (atual + 1) % slides.length);
    }, 4500);
    return () => clearInterval(intervalo);
  }, [slides.length]);

  const mesasExemplo = [
    { num: '01', ocupada: true, cliente: 'André', valor: 'R$ 84,00' },
    { num: '02', ocupada: false, cliente: 'Livre', valor: '' },
    { num: '03', ocupada: true, cliente: 'Marina', valor: 'R$ 142,00' },
    { num: '04', ocupada: false, cliente: 'Livre', valor: '' },
    { num: '05', ocupada: true, cliente: 'Thamiles', valor: 'R$ 95,00' },
    { num: '06', ocupada: false, cliente: 'Livre', valor: '' },
    { num: '07', ocupada: false, cliente: 'Livre', valor: '' },
    { num: '08', ocupada: true, cliente: 'Carlos', valor: 'R$ 60,00' }
  ];

  return (
    <div className="hidden lg:flex lg:col-span-7 flex-col justify-between bg-slate-200/60 border border-slate-200/90 rounded-4xl p-2 shadow-inner">
      <div className="w-full h-full bg-white border border-slate-200/80 rounded-4xl p-8 xl:p-10 shadow-lg shadow-slate-300/40 flex flex-col justify-between relative overflow-hidden">
        {/* Luz sutil de profundidade */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-slate-100 blur-3xl" />

        {/* TOPO DA VITRINE */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-4xl bg-amber-500 border border-amber-600 flex items-center justify-center text-amber-100 shadow-sm">
              <LucideIcons.Umbrella size={20} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-[20px] font-medium uppercase tracking-tight text-amber-700 leading-none">
                T-System Beach
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Plataforma operacional para barracas de praia, quiosques e restaurantes
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-6">
          {/* Seleção dos módulos */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 border border-slate-200/80 rounded-full p-1 mb-4 shadow-inner">
            {slides.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlideAtivo(s.id)}
                className={`h-8 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer truncate px-3 ${
                  slideAtivo === s.id
                    ? 'bg-white text-slate-700 shadow-xs border border-slate-200/70'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s.resumo}
              </button>
            ))}
          </div>
          <div className="rounded-4xl bg-slate-200/60 border border-slate-200/90 p-3 shadow-inner">
            {/* Barra de Status da Janela Simulada */}
            <div className="flex items-center justify-between bg-white rounded-3xl px-4 py-2.5 mb-2.5 border border-slate-200/70 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-medium uppercase tracking-wider text-slate-700">
                  {slides[slideAtivo].etiqueta}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <LucideIcons.Wifi size={13} className="text-emerald-600" />
                <span>Sincronizado</span>
              </div>
            </div>

            {/* SLIDE 0: MAPA DE GUARDA-SÓIS */}
            {slideAtivo === 0 && (
              <div className="grid grid-cols-4 gap-2.5 animate-in fade-in duration-300">
                {mesasExemplo.map((m) => (
                  <div
                    key={m.num}
                    className={`rounded-3xl p-3 flex flex-col justify-between border transition-all h-24 ${
                      m.ocupada
                        ? 'bg-white border-slate-200/90 shadow-xs text-slate-900'
                        : 'bg-white/60 border-slate-200/60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-semibold flex items-center justify-center tabular-nums ${
                          m.ocupada
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-200/80 text-slate-500'
                        }`}
                      >
                        {m.num}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          m.ocupada ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-medium truncate ${
                          m.ocupada ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {m.cliente}
                      </p>
                      {m.ocupada && (
                        <p className="text-[10px] text-emerald-700 font-medium tabular-nums">
                          {m.valor}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SLIDE 1: BAR E COZINHA */}
            {slideAtivo === 1 && (
              <div className="space-y-2 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl px-4 py-3 border border-slate-200/70 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
                      04
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 uppercase">Marina</p>
                      <p className="text-[11px] text-slate-400">Atendente: Equipe Praia</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                    <LucideIcons.Flame size={11} className="text-amber-600" /> Em preparo
                  </span>
                </div>

                <div className="bg-amber-50/90 rounded-3xl px-3.5 py-2.5 border border-amber-300/90 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-2xl bg-amber-200/80 border border-amber-300 text-xs font-semibold text-amber-950 flex items-center justify-center">
                      1x
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-900 uppercase">
                        Isca de Peixe Crocante
                      </p>
                      <p className="text-[10px] text-amber-700 font-medium">
                        14:20 • Em preparo
                      </p>
                    </div>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-amber-400 border-2 border-amber-500 text-slate-950 flex items-center justify-center">
                    <LucideIcons.Flame size={14} />
                  </span>
                </div>

                <div className="bg-white/80 rounded-3xl px-3.5 py-2.5 border border-slate-200/70 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-400 flex items-center justify-center">
                      2x
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-400 line-through uppercase">
                        Água de Coco Gelada
                      </p>
                      <p className="text-[10px] text-emerald-600 font-medium">Pronto para servir</p>
                    </div>
                  </div>
                  <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <LucideIcons.Check size={14} strokeWidth={2.8} />
                  </span>
                </div>
              </div>
            )}

            {/* SLIDE 2: CAIXA E VENDAS CONCLUÍDAS */}
            {slideAtivo === 2 && (
              <div className="space-y-2.5 animate-in fade-in duration-300">
                <div className="rounded-3xl bg-linear-to-br from-emerald-700 via-emerald-800 to-emerald-950 text-white p-4 shadow-md border border-emerald-600/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                      Vendas Concluídas
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-medium">
                      Pagamentos
                    </span>
                  </div>
                  <p className="text-2xl font-semibold tabular-nums tracking-tight">R$ 4.280,00</p>
                  <p className="text-[11px] text-emerald-100/90 mt-1">
                    38 vendas concluídas no período
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-2xl p-2.5 border border-slate-200/70 shadow-2xs flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <LucideIcons.Wallet size={14} />
                    </div>
                    <span className="text-xs font-normal text-slate-700 truncate">Recebidos</span>
                  </div>
                  <div className="bg-white rounded-2xl p-2.5 border border-slate-200/70 shadow-2xs flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <LucideIcons.Target size={14} />
                    </div>
                    <span className="text-xs font-normal text-slate-700 truncate">Meta 92%</span>
                  </div>
                  <div className="bg-white rounded-2xl p-2.5 border border-slate-200/70 shadow-2xs flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                      <LucideIcons.Printer size={14} />
                    </div>
                    <span className="text-xs font-normal text-slate-700 truncate">Cupom PDV</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ DA VITRINE COM PILARES E INDICADORES */}
        <div className="relative z-10 flex items-end justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="max-w-md">
            <h2 className="text-sm font-semibold uppercase text-slate-900 tracking-tight">
              {slides[slideAtivo].etiqueta}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {slides[slideAtivo].descricao}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {slides.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSlideAtivo(s.id)}
                aria-label={`Ver demonstração: ${s.etiqueta}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  slideAtivo === s.id
                    ? 'w-8 bg-slate-900'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
