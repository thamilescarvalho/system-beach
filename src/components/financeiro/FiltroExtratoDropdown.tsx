import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  QrCode,
  ReceiptText,
  SlidersHorizontal,
  Wallet,
} from 'lucide-react';

type AbaFiltro = 'formas' | 'entradas' | 'saidas';

interface FiltroExtratoDropdownProps {
  valor: string | null;
  metodos: string[];
  categoriasEntrada: string[];
  categoriasSaida: string[];
  onChange: (novoValor: string | null) => void;
}

function extrairInfoFiltro(valor: string | null): {
  tipo: 'entrada' | 'saida' | 'metodo' | null;
  label: string;
} {
  if (!valor) return { tipo: null, label: 'Filtrar' };
  if (valor.startsWith('entrada:')) {
    return { tipo: 'entrada', label: valor.slice('entrada:'.length) };
  }
  if (valor.startsWith('saida:')) {
    return { tipo: 'saida', label: valor.slice('saida:'.length) };
  }
  return { tipo: 'metodo', label: valor };
}

function iconeMetodo(metodo: string) {
  const m = metodo.toUpperCase();
  if (m.includes('PIX')) return <QrCode size={13} className="text-emerald-600 shrink-0" />;
  if (m.includes('CRÉD') || m.includes('CRED')) {
    return <CreditCard size={13} className="text-slate-500 shrink-0" />;
  }
  if (m.includes('DÉB') || m.includes('DEB')) {
    return <Wallet size={13} className="text-slate-500 shrink-0" />;
  }
  if (m.includes('BOLETO')) {
    return <ReceiptText size={13} className="text-slate-500 shrink-0" />;
  }
  return <Banknote size={13} className="text-emerald-600 shrink-0" />;
}

export const FiltroExtratoDropdown: React.FC<FiltroExtratoDropdownProps> = ({
  valor,
  metodos,
  categoriasEntrada,
  categoriasSaida,
  onChange,
}) => {
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<AbaFiltro>('formas');
  const containerRef = useRef<HTMLDivElement>(null);

  const infoAtiva = extrairInfoFiltro(valor);

  useEffect(() => {
    if (!aberto) return;

    const handleClickFora = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAberto(false);
      }
    };

    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('touchstart', handleClickFora);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('touchstart', handleClickFora);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [aberto]);

  const abrirOuFechar = () => {
    setAberto((prev) => {
      const proximo = !prev;
      if (proximo) {
        if (infoAtiva.tipo === 'entrada') setAba('entradas');
        else if (infoAtiva.tipo === 'saida') setAba('saidas');
        else setAba('formas');
      }
      return proximo;
    });
  };

  const selecionar = (novo: string | null) => {
    onChange(novo);
    setAberto(false);
  };

  const estiloBotao =
    infoAtiva.tipo === 'saida'
      ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100/70'
      : infoAtiva.tipo
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100';

  const iconeBotao =
    infoAtiva.tipo === 'entrada' ? (
      <ArrowDownLeft size={12} className="text-emerald-600 shrink-0" />
    ) : infoAtiva.tipo === 'saida' ? (
      <ArrowUpRight size={12} className="text-rose-500 shrink-0" />
    ) : (
      <SlidersHorizontal
        size={12}
        className={infoAtiva.tipo ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'}
      />
    );

  return (
    <div ref={containerRef} className="relative inline-block font-sans">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={abrirOuFechar}
        className={`h-8 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${estiloBotao}`}
      >
        {iconeBotao}
        <span className="truncate max-w-32">{infoAtiva.label}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-150 ${
            aberto ? 'rotate-180' : ''
          } ${
            infoAtiva.tipo === 'saida'
              ? 'text-rose-500'
              : infoAtiva.tipo
                ? 'text-emerald-600'
                : 'text-slate-400'
          }`}
        />
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Filtrar extrato por forma ou categoria"
          className="absolute left-0 lg:left-auto lg:right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans"
        >
          {/* Cabeçalho compacto + Segmented Control */}
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">Filtrar extrato</span>
              <button
                type="button"
                onClick={() => selecionar(null)}
                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                  valor
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {valor ? 'Limpar' : 'Todas'}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 mt-2 rounded-xl bg-slate-100">
              <button
                type="button"
                onClick={() => setAba('formas')}
                className={`h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                  aba === 'formas'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <span>Formas</span>
                {infoAtiva.tipo === 'metodo' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setAba('entradas')}
                className={`h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                  aba === 'entradas'
                    ? 'bg-white text-emerald-800 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <span>Entradas</span>
                {infoAtiva.tipo === 'entrada' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setAba('saidas')}
                className={`h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                  aba === 'saidas'
                    ? 'bg-white text-rose-700 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                <span>Saídas</span>
                {infoAtiva.tipo === 'saida' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* Lista focada apenas na aba selecionada */}
          <div role="listbox" className="p-1.5 max-h-60 overflow-y-auto space-y-0.5">
            {aba === 'formas' &&
              metodos.map((metodo) => {
                const ativo = valor === metodo;
                return (
                  <button
                    key={metodo}
                    type="button"
                    role="option"
                    aria-selected={ativo}
                    onClick={() => selecionar(ativo ? null : metodo)}
                    className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      ativo
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      {iconeMetodo(metodo)}
                      <span className="truncate">{metodo}</span>
                    </span>
                    {ativo && <Check size={13} className="text-emerald-600 shrink-0" />}
                  </button>
                );
              })}

            {aba === 'entradas' &&
              categoriasEntrada.map((categoria) => {
                const chave = `entrada:${categoria}`;
                const ativo = valor === chave;
                return (
                  <button
                    key={chave}
                    type="button"
                    role="option"
                    aria-selected={ativo}
                    onClick={() => selecionar(ativo ? null : chave)}
                    className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      ativo
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <ArrowDownLeft size={13} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{categoria}</span>
                    </span>
                    {ativo && <Check size={13} className="text-emerald-600 shrink-0" />}
                  </button>
                );
              })}

            {aba === 'saidas' &&
              categoriasSaida.map((categoria) => {
                const chave = `saida:${categoria}`;
                const ativo = valor === chave;
                return (
                  <button
                    key={chave}
                    type="button"
                    role="option"
                    aria-selected={ativo}
                    onClick={() => selecionar(ativo ? null : chave)}
                    className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      ativo
                        ? 'bg-rose-50 text-rose-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <ArrowUpRight size={13} className="text-rose-500 shrink-0" />
                      <span className="truncate">{categoria}</span>
                    </span>
                    {ativo && <Check size={13} className="text-rose-600 shrink-0" />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
