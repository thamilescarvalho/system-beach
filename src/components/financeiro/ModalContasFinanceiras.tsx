import { useState } from 'react';
import {
  Plus,
  Landmark,
  Banknote,
  CreditCard,
  Lock,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  Star,
  Loader2,
  Wallet,
  ArrowLeftRight
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { ContaFinanceira, TipoContaFinanceira } from '../../types';
import { ModalBase } from './ModalBase';
import {
  formatarMoeda,
  formatarMascaraValorDigitado,
  type ResumoSaldoConta
} from './financeiroUtils';

interface ModalContasFinanceirasProps {
  aberto: boolean;
  onFechar: () => void;
  saldosPorConta: Map<string, ResumoSaldoConta>;
  contaSelecionadaId?: string | null;
  onSelecionarConta?: (contaId: string | null) => void;
  onAbrirTransferencia?: () => void;
}

const TIPOS_CONTA: { id: TipoContaFinanceira; label: string; icone: string }[] = [
  { id: 'dinheiro', label: 'Espécie', icone: 'banknote' },
  { id: 'banco', label: 'Conta', icone: 'landmark' },
  { id: 'maquininha', label: 'Maquininha', icone: 'credit-card' },
  { id: 'cofre', label: 'Reserva', icone: 'lock' }
];

const CORES_CONTA = [
  { id: 'emerald', label: 'Esmeralda', bg: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  { id: 'sky', label: 'Azul', bg: 'bg-sky-500', badge: 'bg-sky-50 text-sky-700' },
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-500', badge: 'bg-indigo-50 text-indigo-700' },
  { id: 'amber', label: 'Âmbar', bg: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  { id: 'rose', label: 'Coral', bg: 'bg-rose-500', badge: 'bg-rose-50 text-rose-700' }
];

export function IconeConta({ tipo, className = 'w-4 h-4' }: { tipo: string; className?: string }) {
  if (tipo === 'dinheiro') return <Banknote className={className} />;
  if (tipo === 'maquininha') return <CreditCard className={className} />;
  if (tipo === 'cofre') return <Lock className={className} />;
  return <Landmark className={className} />;
}

export function ModalContasFinanceiras({
  aberto,
  onFechar,
  saldosPorConta,
  contaSelecionadaId = null,
  onSelecionarConta,
  onAbrirTransferencia
}: ModalContasFinanceirasProps) {
  const {
    contasFinanceiras,
    criarContaFinanceira,
    atualizarContaFinanceira,
    definirContaFinanceiraPadrao,
    excluirContaFinanceira
  } = useAppContext();

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrandoForm, setMostrandoForm] = useState(false);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoContaFinanceira>('banco');
  const [saldoTexto, setSaldoTexto] = useState('');
  const [saldoNumero, setSaldoNumero] = useState(0);
  const [cor, setCor] = useState('emerald');
  const [definirComoPadrao, setDefinirComoPadrao] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [definindoPadraoId, setDefinindoPadraoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<string | null>(null);

  const contasAtivas = contasFinanceiras.filter((c) => c.ativo);
  const saldoConsolidado = contasAtivas.reduce(
    (acc, c) => acc + (saldosPorConta.get(c.id)?.saldoAtual ?? c.saldoInicial),
    0
  );
  const contaEditando = editandoId ? contasFinanceiras.find((c) => c.id === editandoId) : null;

  const abrirNovaConta = () => {
    setEditandoId(null);
    setNome('');
    setTipo('banco');
    setSaldoTexto('');
    setSaldoNumero(0);
    setCor('sky');
    setDefinirComoPadrao(false);
    setErro('');
    setMostrandoForm(true);
  };

  const abrirEdicaoConta = (c: ContaFinanceira) => {
    setEditandoId(c.id);
    setNome(c.nome);
    setTipo(c.tipo);
    setSaldoNumero(c.saldoInicial);
    setSaldoTexto(
      c.saldoInicial === 0
        ? ''
        : c.saldoInicial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    setCor(c.cor || 'emerald');
    setDefinirComoPadrao(c.padrao);
    setErro('');
    setMostrandoForm(true);
  };

  const handleSaldoChange = (val: string) => {
    const { texto, numero } = formatarMascaraValorDigitado(val);
    setSaldoTexto(texto);
    setSaldoNumero(numero);
  };

  const handleDefinirPadraoRapido = async (id: string) => {
    setDefinindoPadraoId(id);
    setErro('');
    try {
      await definirContaFinanceiraPadrao(id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível definir a conta padrão.');
    } finally {
      setDefinindoPadraoId(null);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      setErro('Informe o nome da conta.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      const iconeSelecionado = TIPOS_CONTA.find((t) => t.id === tipo)?.icone || 'wallet';
      if (editandoId) {
        await atualizarContaFinanceira(editandoId, {
          nome: nome.trim(),
          tipo,
          saldoInicial: saldoNumero,
          cor,
          icone: iconeSelecionado,
          ativo: true,
          padrao: definirComoPadrao && !contaEditando?.padrao ? true : undefined
        });
      } else {
        await criarContaFinanceira({
          nome: nome.trim(),
          tipo,
          saldoInicial: saldoNumero,
          cor,
          icone: iconeSelecionado,
          recebeDinheiroPdv: false,
          recebeDigitalPdv: false,
          ativo: true,
          padrao: definirComoPadrao
        });
      }
      setMostrandoForm(false);
      setEditandoId(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar conta.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (id: string) => {
    setSalvando(true);
    setErro('');
    try {
      await excluirContaFinanceira(id);
      setConfirmandoExclusaoId(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível remover a conta.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalBase
      aberto={aberto}
      onFechar={onFechar}
      titulo={
        mostrandoForm
          ? editandoId
            ? 'Editar Conta'
            : 'Nova Conta'
          : 'Contas e Carteiras'
      }
      subtitulo={mostrandoForm ? undefined : 'Toque na conta para ver movimentações'}
      icone={<Landmark className="w-4 h-4" />}
      tomIcone="emerald"
      tamanho="md"
      bloqueado={salvando}
      bodyClassName={mostrandoForm ? 'bg-white' : 'bg-slate-50/70'}
      footer={
        mostrandoForm ? (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={salvando}
              onClick={() => {
                setMostrandoForm(false);
                setErro('');
              }}
              className="h-9 px-4 rounded-xl border border-slate-200 text-slate-600 font-medium text-xs hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="submit"
              form="form-conta-financeira"
              disabled={salvando}
              className="h-9 px-5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs cursor-pointer disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : editandoId ? 'Salvar' : 'Criar conta'}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onFechar}
                className="h-9 px-3 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
              {contasAtivas.length > 1 && onAbrirTransferencia && (
                <button
                  type="button"
                  onClick={onAbrirTransferencia}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                  <span>Transferir</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={abrirNovaConta}
              className="h-9 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova conta</span>
            </button>
          </div>
        )
      }
    >
      <div className="space-y-3">
        {erro && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {!mostrandoForm ? (
          <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {onSelecionarConta && contasFinanceiras.length > 0 && (
              <button
                type="button"
                onClick={() => onSelecionarConta(null)}
                className={`w-full px-3.5 sm:px-4 py-3 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                  !contaSelecionadaId ? 'bg-emerald-50/70' : 'hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      !contaSelecionadaId
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        Todas as contas
                      </p>
                      {!contaSelecionadaId && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      Saldo consolidado ({contasAtivas.length})
                    </p>
                  </div>
                </div>

                <span
                  className={`text-sm font-bold tabular-nums shrink-0 ${
                    saldoConsolidado < 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {formatarMoeda(saldoConsolidado)}
                </span>
              </button>
            )}

            {contasFinanceiras.map((c) => {
              const resumo = saldosPorConta.get(c.id);
              const saldo = resumo ? resumo.saldoAtual : c.saldoInicial;
              const corInfo = CORES_CONTA.find((x) => x.id === c.cor) || CORES_CONTA[0];
              const emConfirmacao = confirmandoExclusaoId === c.id;
              const tipoLabel = TIPOS_CONTA.find((t) => t.id === c.tipo)?.label || c.tipo;
              const alterandoEsta = definindoPadraoId === c.id;
              const selecionada = contaSelecionadaId === c.id;

              return (
                <div
                  key={c.id}
                  role={onSelecionarConta ? 'button' : undefined}
                  tabIndex={onSelecionarConta ? 0 : undefined}
                  onClick={() => onSelecionarConta?.(selecionada ? null : c.id)}
                  onKeyDown={(e) => {
                    if (onSelecionarConta && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelecionarConta(selecionada ? null : c.id);
                    }
                  }}
                  className={`px-3.5 sm:px-4 py-3 transition-colors ${
                    onSelecionarConta ? 'cursor-pointer' : ''
                  } ${selecionada ? 'bg-emerald-50/70' : 'hover:bg-slate-50/70'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                    <div className="flex items-center justify-between gap-2.5 min-w-0 flex-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${corInfo.badge}`}
                        >
                          <IconeConta tipo={c.tipo} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {c.nome}
                            </p>
                            {selecionada && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            <span>{tipoLabel}</span>
                            {c.padrao && (
                              <span className="text-emerald-700 font-semibold">
                                {' '}
                                • Padrão (mesas)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`sm:hidden text-sm font-bold tabular-nums shrink-0 ${
                          saldo < 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {formatarMoeda(saldo)}
                      </span>
                    </div>

                    <div
                      className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t border-slate-100 sm:border-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span
                        className={`hidden sm:inline text-sm font-bold tabular-nums ${
                          saldo < 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {formatarMoeda(saldo)}
                      </span>

                      <span className="sm:hidden text-xs text-slate-400">
                        {selecionada ? 'Exibindo movimentações' : 'Toque para filtrar'}
                      </span>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          disabled={c.padrao || alterandoEsta || Boolean(definindoPadraoId)}
                          onClick={() => void handleDefinirPadraoRapido(c.id)}
                          title={
                            c.padrao
                              ? 'Conta padrão atual para vendas das mesas'
                              : 'Definir como conta padrão para vendas das mesas'
                          }
                          aria-label={
                            c.padrao ? 'Conta padrão atual' : `Definir ${c.nome} como conta padrão`
                          }
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            c.padrao
                              ? 'text-emerald-600 bg-emerald-50 cursor-default'
                              : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50 cursor-pointer disabled:opacity-50'
                          }`}
                        >
                          {alterandoEsta ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          ) : (
                            <Star className={`w-3.5 h-3.5 ${c.padrao ? 'fill-emerald-600' : ''}`} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoConta(c)}
                          title="Editar conta"
                          className="w-7 h-7 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {contasFinanceiras.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmandoExclusaoId(emConfirmacao ? null : c.id)
                            }
                            title="Remover conta"
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {emConfirmacao && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2"
                    >
                      <span className="text-xs text-rose-600 font-medium">
                        Arquivar esta conta?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmandoExclusaoId(null)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={salvando}
                          onClick={() => handleExcluir(c.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <form id="form-conta-financeira" onSubmit={handleSalvar} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Nome da conta
              </label>
              <input
                type="text"
                required
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Mercado Pago, Banco Inter, Gaveta..."
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIPOS_CONTA.map((t) => {
                  const selecionado = tipo === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTipo(t.id)}
                      className={`h-9 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-medium transition-all cursor-pointer ${
                        selecionado
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <IconeConta tipo={t.id} className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Saldo inicial
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={saldoTexto}
                    onChange={(e) => handleSaldoChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cor</label>
                <div className="h-10 px-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                  {CORES_CONTA.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCor(c.id)}
                      title={c.label}
                      className={`w-5 h-5 rounded-full ${c.bg} flex items-center justify-center transition-transform cursor-pointer ${
                        cor === c.id ? 'scale-115 ring-2 ring-offset-2 ring-slate-700' : 'opacity-65 hover:opacity-100'
                      }`}
                    >
                      {cor === c.id && <Check className="w-3 h-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label
              className={`flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 transition-colors ${
                contaEditando?.padrao ? 'opacity-85 cursor-default' : 'cursor-pointer hover:border-emerald-300'
              }`}
            >
              <input
                type="checkbox"
                checked={definirComoPadrao}
                disabled={Boolean(contaEditando?.padrao)}
                onChange={(e) => setDefinirComoPadrao(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-emerald-700 disabled:cursor-default"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">
                  Conta padrão para vendas das mesas
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {contaEditando?.padrao
                    ? 'Esta é a conta padrão atual. Para trocar, toque na estrela de outra conta na lista.'
                    : 'Todas as vendas das mesas passarão a cair automaticamente nesta conta.'}
                </p>
              </div>
            </label>
          </form>
        )}
      </div>
    </ModalBase>
  );
}
