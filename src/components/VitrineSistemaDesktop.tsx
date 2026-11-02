// src/components/VitrineSistemaDesktop.tsx
import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

export function VitrineSistemaDesktop() {
  const [slideAtivo, setSlideAtivo] = useState<number>(0);

  const slides = [
    {
      id: 0,
      etiqueta: 'Salão de Guarda-Sóis',
      descricao: 'Visualização limpa para controle no celular.'
    },
    {
      id: 1,
      etiqueta: 'Bar e Cozinha em Tempo Real',
      descricao: 'Pedidos lançados na areia chegam imediatamente na fila de preparo.'
    },
    {
      id: 2,
      etiqueta: 'Painel de Caixa e Metas',
      descricao: 'Acompanhamento de vendas, impressão, fechamentos e comissões.'
    }
  ];

  useEffect(() => {
    const intervalo = setInterval(() => {
      setSlideAtivo((atual) => (atual + 1) % slides.length);
    }, 4500);
    return () => clearInterval(intervalo);
  }, [slides.length]);

  const mesasExemplo = [
    { num: 1, ocupada: true, cliente: 'André' },
    { num: 2, ocupada: false, cliente: '' },
    { num: 3, ocupada: false, cliente: '' },
    { num: 4, ocupada: true, cliente: 'Marina' },
    { num: 5, ocupada: false, cliente: '' },
    { num: 6, ocupada: true, cliente: 'Thamiles' },
    { num: 7, ocupada: false, cliente: '' },
    { num: 8, ocupada: false, cliente: '' }
  ];

  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 rounded-4xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/50 relative overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-fuchsia-800 flex items-center justify-center text-white shadow-sm">
            <LucideIcons.Umbrella size={20} strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-[16px] font-medium uppercase tracking-tight text-slate-900 leading-none">
              T-System Beach
            </h1>
            <p className="text-[13px] text-slate-400 font-sans mt-0.5">
              Ideal para quiosques à beira-mar.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Online
        </span>
      </div>

      {/* Janela de Demonstração */}
      <div className="my-6">
        <div className="rounded-3xl bg-slate-100/90 border border-slate-200/80 p-4 shadow-inner">
          {/* Barra Superior */}
          <div className="flex items-center justify-between bg-white rounded-2xl px-3.5 py-2.5 mb-3 border border-slate-200/60 shadow-2xs">
            <div className="flex items-center gap-2">
              <LucideIcons.Umbrella size={15} className="text-fuchsia-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {slides[slideAtivo].etiqueta}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-200" />
              <span className="w-2 h-2 rounded-full bg-slate-200" />
              <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">
                👑
              </span>
            </div>
          </div>

          {/* CONTEÚDO DO SLIDE 0: MAPA DE GUARDA-SÓIS */}
          {slideAtivo === 0 && (
            <div className="grid grid-cols-4 gap-2 animate-in fade-in duration-500 py-1">
              {mesasExemplo.map((m) => (
                <div
                  key={m.num}
                  className={`aspect-square rounded-2xl p-2 flex flex-col items-center justify-between border transition-all ${
                    m.ocupada
                      ? 'bg-linear-to-br from-green-500 to-green-700 border-green-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="w-full h-2" />
                  <span className="text-lg font-bold leading-none tabular-nums">
                    {m.num}
                  </span>
                  <span
                    className={`text-xs scale-75 origin-center font-bold uppercase truncate whitespace-nowrap ${
                      m.ocupada ? 'text-green-50' : 'text-slate-400'
                    }`}
                  >
                    {m.ocupada ? m.cliente : 'Livre'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* CONTEÚDO DO SLIDE 1: BAR E COZINHA */}
          {slideAtivo === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 animate-in fade-in duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <p className="text-sm font-bold text-slate-900">MESA 04</p>
                  <p className="text-xs text-slate-400 font-medium">Cliente: Marina</p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-white text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                  <LucideIcons.Timer size={12} className="text-amber-400" /> Preparo
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-900 flex items-center justify-center">
                      2x
                    </span>
                    <span className="text-xs font-bold text-slate-800">Água de Coco Gelada</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Pronto
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-xs font-black text-slate-900 flex items-center justify-center">
                      1x
                    </span>
                    <span className="text-xs font-bold text-slate-800">Isca de Peixe Crocante</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Agora</span>
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO DO SLIDE 2: PAINEL DE CAIXA */}
          {slideAtivo === 2 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Faturamento Hoje
                  </p>
                  <p className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
                    R$ 4.280,00
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                  <LucideIcons.Wallet size={20} />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-500">Meta do Dia</span>
                  <span className="text-emerald-600">85% atingida</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="w-5/6 h-full bg-slate-900 rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold">PIX / Cartão</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">38 Comandas</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold">Ticket Médio</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">R$ 112,60</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="space-y-4">
        <div>
          <h2 className="text-[15px] font-medium uppercase text-slate-900 tracking-tight">
            {slides[slideAtivo].etiqueta}
          </h2>
          <p className="text-[12px] text-slate-500 font-medium mt-1 leading-relaxed">
            {slides[slideAtivo].descricao}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {slides.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSlideAtivo(s.id)}
              aria-label={`Ver demonstração: ${s.etiqueta}`}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                slideAtivo === s.id
                  ? 'w-7 bg-fuchsia-900'
                  : 'w-2 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
