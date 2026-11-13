import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { TipoMovimentacaoCaixa } from '../../types';
import { ModalBase } from './ModalBase';
import {
  CATEGORIAS_ENTRADA_CAIXA,
  CATEGORIAS_SAIDA_CAIXA,
  METODOS_PAGAMENTO_SAIDA,
  formatarMascaraValorDigitado,
  formatarMoeda,
  obterDataLocalYYYYMMDD,
  type ResumoSaldoConta
} from './financeiroUtils';

interface ModalMovimentacaoCaixaProps {
  aberto: boolean;
  tipoInicial?: TipoMovimentacaoCaixa;
  contaInicialId?: string;
  onFechar: () => void;
  saldosPorConta: Map<string, ResumoSaldoConta>;
}

function ModalMovimentacaoCaixaConteudo({
  tipoInicial,
  contaInicialId,
  onFechar,
  saldosPorConta
}: Omit<ModalMovimentacaoCaixaProps, 'aberto'>) {
  const { contasFinanceiras, garcomLogado, registrarMovimentacaoCaixa } = useAppContext();
  const contasAtivas = contasFinanceiras.filter((c) => c.ativo);

  const contaPadrao = contasAtivas.find((c) => c.padrao);
  const primeiraConta = contaInicialId || contaPadrao?.id || contasAtivas[0]?.id || '';
  const segundaConta = contasAtivas.find((c) => c.id !== primeiraConta)?.id || '';

  const [tipo, setTipo] = useState<TipoMovimentacaoCaixa>(tipoInicial || 'saida');
  const [valorTexto, setValorTexto] = useState('');
  const [valorNumero, setValorNumero] = useState(0);
  const [contaId, setContaId] = useState(primeiraConta);
  const [contaDestinoId, setContaDestinoId] = useState(segundaConta);
  const [categoria, setCategoria] = useState(() => {
    if (tipoInicial === 'entrada') return CATEGORIAS_ENTRADA_CAIXA[0];
    if (tipoInicial === 'transferencia') return 'Transferência entre Contas';
    return CATEGORIAS_SAIDA_CAIXA[1];
  });
  const [metodoPagamento, setMetodoPagamento] = useState(
    tipoInicial === 'entrada' ? 'Dinheiro' : 'PIX'
  );
  const [dataLancamento, setDataLancamento] = useState(obterDataLocalYYYYMMDD());
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const contaIdEfetiva = contaId || primeiraConta;
  const contaDestinoEfetiva =
    contaDestinoId && contaDestinoId !== contaIdEfetiva
      ? contaDestinoId
      : contasAtivas.find((c) => c.id !== contaIdEfetiva)?.id || '';

  const trocarTipo = (novoTipo: TipoMovimentacaoCaixa) => {
    setTipo(novoTipo);
    setErro('');
    if (novoTipo === 'entrada') {
      setCategoria(CATEGORIAS_ENTRADA_CAIXA[0]);
    } else if (novoTipo === 'transferencia') {
      setCategoria('Transferência entre Contas');
    } else {
      setCategoria(CATEGORIAS_SAIDA_CAIXA[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(valorNumero > 0)) {
      setErro('Informe um valor maior que zero.');
      return;
    }
    if (!contaIdEfetiva) {
      setErro('Selecione uma conta financeira.');
      return;
    }
    if (tipo === 'transferencia' && (!contaDestinoEfetiva || contaDestinoEfetiva === contaIdEfetiva)) {
      setErro('Escolha uma conta de destino diferente da origem.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      const hojeStr = obterDataLocalYYYYMMDD();
      const isoData =
        dataLancamento === hojeStr
          ? new Date().toISOString()
          : `${dataLancamento}T12:00:00-03:00`;

      await registrarMovimentacaoCaixa({
        contaId: contaIdEfetiva,
        contaDestinoId: tipo === 'transferencia' ? contaDestinoEfetiva : null,
        tipo,
        categoria: tipo === 'transferencia' ? 'Transferência' : categoria,
        metodoPagamento: tipo === 'transferencia' ? 'Transferência' : metodoPagamento,
        valor: valorNumero,
        dataMovimentacao: isoData,
        descricao:
          descricao.trim() ||
          (tipo === 'transferencia' ? 'Transferência entre contas' : categoria),
        usuarioNome: garcomLogado?.nome || 'Administrador'
      });
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao registrar movimentação.');
    } finally {
      setSalvando(false);
    }
  };

  const listaCategorias =
    tipo === 'entrada' ? CATEGORIAS_ENTRADA_CAIXA : CATEGORIAS_SAIDA_CAIXA;

  return (
    <ModalBase
      aberto
      onFechar={onFechar}
      titulo="Lançamento"
      subtitulo="Registre entradas, despesas ou transferências"
      icone={
        tipo === 'entrada' ? (
          <ArrowDownLeft className="w-4 h-4" />
        ) : tipo === 'saida' ? (
          <ArrowUpRight className="w-4 h-4" />
        ) : (
          <ArrowLeftRight className="w-4 h-4" />
        )
      }
      tomIcone={tipo === 'saida' ? 'rose' : tipo === 'transferencia' ? 'slate' : 'emerald'}
      tamanho="md"
      bloqueado={salvando}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={salvando}
            onClick={onFechar}
            className="flex-1 h-9 rounded-4xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-movimentacao-caixa"
            disabled={salvando}
            className={`flex-1 h-9 rounded-4xl text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50 ${
              tipo === 'entrada'
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : tipo === 'saida'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {salvando
              ? 'Registrando...'
              : tipo === 'entrada'
                ? 'Salvar'
                : tipo === 'saida'
                  ? 'Confirmar Saída'
                  : 'Confirmar Transferência'}
          </button>
        </div>
      }
    >
      <form id="form-movimentacao-caixa" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-4xl">
          <button
            type="button"
            onClick={() => trocarTipo('entrada')}
            className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tipo === 'entrada'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Entrada</span>
          </button>
          <button
            type="button"
            onClick={() => trocarTipo('saida')}
            className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tipo === 'saida'
                ? 'bg-white text-rose-600 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Saída</span>
          </button>
          <button
            type="button"
            onClick={() => trocarTipo('transferencia')}
            className={`h-8 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              tipo === 'transferencia'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Transferir</span>
          </button>
        </div>

        {erro && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200/80">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Valor
          </label>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold text-slate-400">R$</span>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={valorTexto}
              onChange={(e) => {
                const res = formatarMascaraValorDigitado(e.target.value);
                setValorTexto(res.texto);
                setValorNumero(res.numero);
              }}
              placeholder="0,00"
              className="w-full bg-transparent text-2xl sm:text-3xl font-medium text-slate-800 focus:outline-none tracking-tight tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {tipo === 'entrada' ? 'Conta de destino' : 'Conta de origem'}
            </label>
            <div className="relative">
              <select
                value={contaIdEfetiva}
                onChange={(e) => setContaId(e.target.value)}
                className="w-full appearance-none h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                {contasAtivas.map((c) => {
                  const saldo = saldosPorConta.get(c.id)?.saldoAtual ?? c.saldoInicial;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({formatarMoeda(saldo)})
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {tipo === 'transferencia' ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Enviar para a conta
              </label>
              <div className="relative">
                <select
                  value={contaDestinoEfetiva}
                  onChange={(e) => setContaDestinoId(e.target.value)}
                  className="w-full appearance-none h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="">Selecione...</option>
                  {contasAtivas
                    .filter((c) => c.id !== contaIdEfetiva)
                    .map((c) => {
                      const saldo = saldosPorConta.get(c.id)?.saldoAtual ?? c.saldoInicial;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.nome} ({formatarMoeda(saldo)})
                        </option>
                      );
                    })}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Forma de pagamento
              </label>
              <div className="relative">
                <select
                  value={metodoPagamento}
                  onChange={(e) => setMetodoPagamento(e.target.value)}
                  className="w-full appearance-none h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  {METODOS_PAGAMENTO_SAIDA.map((met) => (
                    <option key={met} value={met}>
                      {met}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tipo !== 'transferencia' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Categoria
              </label>
              <div className="relative">
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full appearance-none h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  {listaCategorias.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          <div className={tipo === 'transferencia' ? 'sm:col-span-2' : ''}>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
            <input
              type="date"
              value={dataLancamento}
              onChange={(e) => setDataLancamento(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Descrição (opcional)
          </label>
          <input
            type="text"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={
              tipo === 'entrada'
                ? 'Ex: Troco inicial da gaveta'
                : tipo === 'transferencia'
                  ? 'Ex: Depósito bancário'
                  : 'Ex: Compra de gelo, gás...'
            }
            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </form>
    </ModalBase>
  );
}

export function ModalMovimentacaoCaixa(props: ModalMovimentacaoCaixaProps) {
  if (!props.aberto) return null;
  return (
    <ModalMovimentacaoCaixaConteudo
      key={`${props.tipoInicial || 'saida'}-${props.contaInicialId || 'default'}`}
      tipoInicial={props.tipoInicial}
      contaInicialId={props.contaInicialId}
      onFechar={props.onFechar}
      saldosPorConta={props.saldosPorConta}
    />
  );
}
