import { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Landmark,
  QrCode,
  ReceiptText,
  SlidersHorizontal,
  Wallet
} from 'lucide-react';
import type { ContaFinanceira } from '../../types';
import type {
  IntervaloDatas,
  MetodoPagamentoChave,
  OpcaoMetodoEmoji,
  OpcaoPeriodoEmoji,
  PresetPeriodo
} from './metricasUtils';

function useFecharAoClicarFora(aberto: boolean, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const handleClickFora = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
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
  }, [aberto, onClose]);

  return containerRef;
}

function iconeMetodoDropdown(chave: MetodoPagamentoChave) {
  if (chave === 'pix') return <QrCode size={13} className="text-emerald-600 shrink-0" />;
  if (chave === 'credito') return <CreditCard size={13} className="text-slate-500 shrink-0" />;
  if (chave === 'debito') return <Wallet size={13} className="text-slate-500 shrink-0" />;
  if (chave === 'dinheiro') return <Banknote size={13} className="text-emerald-600 shrink-0" />;
  if (chave === 'outros') return <ReceiptText size={13} className="text-slate-500 shrink-0" />;
  return <SlidersHorizontal size={13} className="text-emerald-600 shrink-0" />;
}

interface MenuFiltroMetricaDropdownProps {
  opcoesPeriodo: OpcaoPeriodoEmoji[];
  presetPeriodo: PresetPeriodo;
  rotuloPeriodo: string;
  customDatas: IntervaloDatas;
  dataMaxima: string;
  onChangePreset: (preset: PresetPeriodo) => void;
  onChangeCustomData: (campo: 'inicio' | 'fim', valor: string) => void;
  opcoesMetodo?: OpcaoMetodoEmoji[];
  metodoSelecionado?: MetodoPagamentoChave;
  onChangeMetodo?: (metodo: MetodoPagamentoChave) => void;
  alinhamento?: 'direita' | 'esquerda' | 'responsivo' | 'card-esquerda';
  tamanho?: 'sm' | 'md';
}

/**
 * Botão único de filtro com menu dropdown moderno (no mesmo padrão de FiltroExtratoDropdown
 * de AdminFinanceiro), suportando aba única de Período ou abas Período + Formas de Pagamento.
 */
export function MenuFiltroMetricaDropdown({
  opcoesPeriodo,
  presetPeriodo,
  rotuloPeriodo,
  customDatas,
  dataMaxima,
  onChangePreset,
  onChangeCustomData,
  opcoesMetodo,
  metodoSelecionado = 'todos',
  onChangeMetodo,
  alinhamento = 'direita',
  tamanho = 'sm'
}: MenuFiltroMetricaDropdownProps) {
  const temFormas = Boolean(opcoesMetodo && onChangeMetodo);
  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<'periodo' | 'formas'>('periodo');

  const containerRef = useFecharAoClicarFora(aberto, () => setAberto(false));

  const metodoAtivo = opcoesMetodo?.find((m) => m.chave === metodoSelecionado);
  const temFiltroAtivo = presetPeriodo !== 'hoje' || (temFormas && metodoSelecionado !== 'todos');

  const textoBotao =
    temFormas && metodoSelecionado !== 'todos' && metodoAtivo
      ? `${rotuloPeriodo} · ${metodoAtivo.label}`
      : rotuloPeriodo;

  const classePosicaoMenu =
    alinhamento === 'esquerda'
      ? 'left-0'
      : alinhamento === 'responsivo'
        ? 'left-0 sm:left-auto sm:right-0'
        : alinhamento === 'card-esquerda'
          ? '-right-28 sm:right-0'
          : 'right-0';

  const classeAlturaBotao =
    tamanho === 'md'
      ? 'h-8 px-3 text-xs gap-1.5'
      : 'h-6 sm:h-7 px-2 sm:px-2.5 text-[10px] sm:text-[11px] gap-1 sm:gap-1.5';

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="relative inline-block font-sans shrink-0"
    >
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={`${classeAlturaBotao} rounded-full border font-medium inline-flex items-center transition-colors cursor-pointer whitespace-nowrap ${
          temFiltroAtivo
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
            : 'bg-slate-50 border-slate-200/90 text-slate-600 hover:bg-slate-100'
        }`}
      >
        {temFormas ? (
          <SlidersHorizontal
            size={11}
            className={temFiltroAtivo ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'}
          />
        ) : (
          <CalendarDays
            size={11}
            className={temFiltroAtivo ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'}
          />
        )}
        <span className="truncate max-w-16 sm:max-w-40">{textoBotao}</span>
        <ChevronDown
          size={11}
          className={`shrink-0 transition-transform duration-150 ${
            aberto ? 'rotate-180' : ''
          } ${temFiltroAtivo ? 'text-emerald-600' : 'text-slate-400'}`}
        />
      </button>

      {aberto && (
        <div
          role="dialog"
          aria-label="Filtrar métricas"
          className={`absolute ${classePosicaoMenu} top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans`}
        >
          {/* Cabeçalho do Dropdown */}
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                {temFormas ? 'Filtrar recebimentos' : 'Filtrar período'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onChangePreset('hoje');
                  if (onChangeMetodo) onChangeMetodo('todos');
                  setAberto(false);
                }}
                className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
                  temFiltroAtivo
                    ? 'text-rose-600 hover:bg-rose-50'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {temFiltroAtivo ? 'Limpar' : 'Padrão'}
              </button>
            </div>

            {temFormas && (
              <div className="grid grid-cols-2 gap-1 p-1 mt-2 rounded-xl bg-slate-100">
                <button
                  type="button"
                  onClick={() => setAba('periodo')}
                  className={`h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                    aba === 'periodo'
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <span>Período</span>
                  {presetPeriodo !== 'hoje' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setAba('formas')}
                  className={`h-7 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                    aba === 'formas'
                      ? 'bg-white text-emerald-800 font-semibold shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 font-medium'
                  }`}
                >
                  <span>Formas</span>
                  {metodoSelecionado !== 'todos' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Lista de opções */}
          <div className="p-1.5 max-h-68 overflow-y-auto space-y-0.5">
            {(!temFormas || aba === 'periodo') && (
              <>
                {opcoesPeriodo.map((op) => {
                  const ativo = presetPeriodo === op.chave;
                  return (
                    <button
                      key={op.chave}
                      type="button"
                      onClick={() => {
                        onChangePreset(op.chave);
                        if (op.chave !== 'custom') {
                          setAberto(false);
                        }
                      }}
                      className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        ativo
                          ? 'bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <CalendarDays
                          size={13}
                          className={ativo ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'}
                        />
                        <span className="truncate">{op.label}</span>
                      </span>
                      {ativo && <Check size={13} className="text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}

                {presetPeriodo === 'custom' && (
                  <div className="mt-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-medium text-slate-500 w-8">De</label>
                      <input
                        type="date"
                        value={customDatas.inicio}
                        max={dataMaxima}
                        onChange={(e) => e.target.value && onChangeCustomData('inicio', e.target.value)}
                        className="h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 flex-1 min-w-0"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-medium text-slate-500 w-8">Até</label>
                      <input
                        type="date"
                        value={customDatas.fim}
                        max={dataMaxima}
                        onChange={(e) => e.target.value && onChangeCustomData('fim', e.target.value)}
                        className="h-8 px-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 flex-1 min-w-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAberto(false)}
                      className="w-full h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      Aplicar período
                    </button>
                  </div>
                )}
              </>
            )}

            {temFormas &&
              aba === 'formas' &&
              opcoesMetodo?.map((metodo) => {
                const ativo = metodoSelecionado === metodo.chave;
                return (
                  <button
                    key={metodo.chave}
                    type="button"
                    onClick={() => {
                      onChangeMetodo?.(metodo.chave);
                      setAberto(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      ativo
                        ? 'bg-emerald-50 text-emerald-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50 font-medium'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0">
                      {iconeMetodoDropdown(metodo.chave)}
                      <span className="truncate">{metodo.label}</span>
                    </span>
                    {ativo && <Check size={13} className="text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MenuContaDropdownProps {
  contas: ContaFinanceira[];
  contaSelecionadaId: string;
  onChange: (id: string) => void;
}

function iconeTipoConta(tipo: ContaFinanceira['tipo']) {
  if (tipo === 'dinheiro') return <Banknote size={13} className="text-emerald-600 shrink-0" />;
  if (tipo === 'maquininha') return <CreditCard size={13} className="text-slate-500 shrink-0" />;
  return <Landmark size={13} className="text-slate-500 shrink-0" />;
}

/**
 * Seletor moderno de Conta Financeira (substitui o <select> nativo por um popover elegante).
 */
export function MenuContaDropdown({
  contas,
  contaSelecionadaId,
  onChange
}: MenuContaDropdownProps) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useFecharAoClicarFora(aberto, () => setAberto(false));

  const contasAtivas = contas.filter((c) => c.ativo);
  const contaAtiva = contasAtivas.find((c) => c.id === contaSelecionadaId);
  const filtrando = Boolean(contaAtiva);

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="relative inline-block font-sans shrink-0"
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={`h-8 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
          filtrando
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
            : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-2xs'
        }`}
      >
        <Landmark
          size={13}
          className={filtrando ? 'text-emerald-600 shrink-0' : 'text-slate-400 shrink-0'}
        />
        <span className="truncate max-w-32 sm:max-w-44">
          {contaAtiva ? contaAtiva.nome : 'Todas as contas'}
        </span>
        <ChevronDown
          size={13}
          className={`shrink-0 transition-transform duration-150 ${
            aberto ? 'rotate-180' : ''
          } ${filtrando ? 'text-emerald-600' : 'text-slate-400'}`}
        />
      </button>

      {aberto && (
        <div
          role="listbox"
          aria-label="Selecionar conta financeira"
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans"
        >
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">Conta de análise</span>
            <span className="text-[11px] text-slate-400">{contasAtivas.length} ativas</span>
          </div>

          <div className="p-1.5 max-h-60 overflow-y-auto space-y-0.5">
            <button
              type="button"
              role="option"
              aria-selected={!filtrando}
              onClick={() => {
                onChange('todas');
                setAberto(false);
              }}
              className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                !filtrando
                  ? 'bg-emerald-50 text-emerald-800 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 font-medium'
              }`}
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <Wallet size={13} className="text-emerald-600 shrink-0" />
                <span className="truncate">Todas as contas (Consolidado)</span>
              </span>
              {!filtrando && <Check size={13} className="text-emerald-600 shrink-0" />}
            </button>

            {contasAtivas.map((c) => {
              const ativo = contaSelecionadaId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  onClick={() => {
                    onChange(c.id);
                    setAberto(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    ativo
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    {iconeTipoConta(c.tipo)}
                    <span className="truncate">{c.nome}</span>
                  </span>
                  {ativo && <Check size={13} className="text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface OpcaoMenuSimples<T extends string> {
  chave: T;
  label: string;
}

interface MenuSimplesDropdownProps<T extends string> {
  opcoes: OpcaoMenuSimples<T>[];
  valor: T;
  onChange: (chave: T) => void;
  tituloMenu?: string;
}

/**
 * Dropdown compacto de botão único para alternar visões de tabela/ranking.
 */
export function MenuSimplesDropdown<T extends string>({
  opcoes,
  valor,
  onChange,
  tituloMenu = 'Selecionar visão'
}: MenuSimplesDropdownProps<T>) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useFecharAoClicarFora(aberto, () => setAberto(false));
  const ativoObj = opcoes.find((o) => o.chave === valor) ?? opcoes[0];

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      className="relative inline-block font-sans shrink-0"
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className="h-8 px-3 rounded-full border border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
      >
        <SlidersHorizontal size={12} className="text-slate-400 shrink-0" />
        <span className="truncate max-w-36">{ativoObj?.label}</span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-slate-400 transition-transform duration-150 ${
            aberto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {aberto && (
        <div
          role="listbox"
          aria-label={tituloMenu}
          className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 font-sans"
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-800">{tituloMenu}</span>
          </div>
          <div className="p-1.5 space-y-0.5">
            {opcoes.map((op) => {
              const ativo = op.chave === valor;
              return (
                <button
                  key={op.chave}
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  onClick={() => {
                    onChange(op.chave);
                    setAberto(false);
                  }}
                  className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    ativo
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <span className="truncate">{op.label}</span>
                  {ativo && <Check size={13} className="text-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
