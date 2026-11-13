import { useMemo, useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  X,
  ChevronDown
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type { ItemNotaCompraInput } from '../../types';
import { ModalBase } from './ModalBase';
import {
  METODOS_PAGAMENTO_SAIDA,
  calcularSaldosPorConta,
  formatarMascaraValorDigitado,
  formatarMoeda,
  obterDataLocalYYYYMMDD
} from './financeiroUtils';

interface ItemFormNota extends ItemNotaCompraInput {
  custoTexto: string;
}

interface ModalNotaCompraEstoqueProps {
  aberto: boolean;
  onFechar: () => void;
  onSucesso?: (mensagem: string) => void;
}

function numeroParaTextoBR(n: number): string {
  if (!n || n <= 0) return '';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ModalNotaCompraEstoqueConteudo({
  onFechar,
  onSucesso
}: Omit<ModalNotaCompraEstoqueProps, 'aberto'>) {
  const {
    produtos,
    contasFinanceiras,
    historicoVendas,
    movimentacoesCaixa,
    historicoPagamentos,
    garcomLogado,
    registrarNotaCompraEstoque
  } = useAppContext();

  const contasAtivas = useMemo(
    () => contasFinanceiras.filter((c) => c.ativo),
    [contasFinanceiras]
  );

  const saldos = useMemo(
    () =>
      calcularSaldosPorConta(
        contasFinanceiras,
        historicoVendas,
        movimentacoesCaixa,
        historicoPagamentos
      ),
    [contasFinanceiras, historicoVendas, movimentacoesCaixa, historicoPagamentos]
  );

  const [fornecedor, setFornecedor] = useState('');
  const [numeroNota, setNumeroNota] = useState('');
  const [dataCompra, setDataCompra] = useState(obterDataLocalYYYYMMDD());
  const [buscaProduto, setBuscaProduto] = useState('');
  const [itens, setItens] = useState<ItemFormNota[]>([]);
  const [mostrarExtras, setMostrarExtras] = useState(false);
  const [extrasTexto, setExtrasTexto] = useState('');
  const [extrasNumero, setExtrasNumero] = useState(0);
  const [lancarNoCaixa, setLancarNoCaixa] = useState(true);
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [contaId, setContaId] = useState<string>(
    saldos.idContaPadrao || saldos.idContaDigitalPadrao || contasAtivas[0]?.id || ''
  );
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const contaIdEfetiva =
    contaId || saldos.idContaPadrao || saldos.idContaDigitalPadrao || contasAtivas[0]?.id || '';

  const handleTrocarFormaPagamento = (metodo: string) => {
    setFormaPagamento(metodo);
    if (saldos.idContaPadrao) return;
    if (metodo === 'Dinheiro' && saldos.idContaDinheiroPadrao) {
      setContaId(saldos.idContaDinheiroPadrao);
    } else if (metodo !== 'Dinheiro' && saldos.idContaDigitalPadrao) {
      setContaId(saldos.idContaDigitalPadrao);
    }
  };

  // Busca ativa apenas enquanto o usuário digita (zero chips poluindo a tela)
  const termoBusca = buscaProduto.trim().toLowerCase();
  const resultadosBusca = useMemo(() => {
    if (!termoBusca) return [];
    return [...produtos]
      .filter((p) => p.id !== 998 && p.id !== 999)
      .filter(
        (p) =>
          p.nome.toLowerCase().includes(termoBusca) ||
          p.categoria.toLowerCase().includes(termoBusca)
      )
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, 6);
  }, [produtos, termoBusca]);

  const subtotalItens = useMemo(
    () => itens.reduce((acc, item) => acc + item.quantidade * item.valorUnitario, 0),
    [itens]
  );

  const valorTotalNota = Math.max(0, subtotalItens + extrasNumero);

  const adicionarProdutoNota = (produtoId: number) => {
    const prod = produtos.find((p) => p.id === produtoId);
    if (!prod) return;
    setErro('');

    setItens((prev) => {
      const idx = prev.findIndex((x) => x.produtoId === produtoId);
      if (idx >= 0) {
        const copia = [...prev];
        copia[idx] = { ...copia[idx], quantidade: copia[idx].quantidade + 1 };
        return copia;
      }
      const custoInicial = Number(prod.precoCusto || 0);
      return [
        ...prev,
        {
          produtoId: prod.id,
          produtoNome: prod.nome,
          quantidade: 1,
          valorUnitario: custoInicial,
          custoTexto: numeroParaTextoBR(custoInicial)
        }
      ];
    });
    setBuscaProduto('');
  };

  const alterarQuantidadeItem = (produtoId: number, novaQtd: number) => {
    if (novaQtd <= 0) {
      setItens((prev) => prev.filter((x) => x.produtoId !== produtoId));
      return;
    }
    setItens((prev) =>
      prev.map((x) => (x.produtoId === produtoId ? { ...x, quantidade: novaQtd } : x))
    );
  };

  const alterarCustoUnitarioItem = (produtoId: number, digitado: string) => {
    const { texto, numero } = formatarMascaraValorDigitado(digitado);
    setItens((prev) =>
      prev.map((x) =>
        x.produtoId === produtoId ? { ...x, custoTexto: texto, valorUnitario: numero } : x
      )
    );
  };

  const handleConfirmarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fornecedor.trim()) {
      setErro('Informe o fornecedor ou local da compra.');
      return;
    }
    if (itens.length === 0) {
      setErro('Busque e adicione pelo menos 1 produto na nota.');
      return;
    }
    if (lancarNoCaixa && !contaIdEfetiva) {
      setErro('Selecione a conta de onde esse pagamento será debitado.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      const res = await registrarNotaCompraEstoque({
        fornecedor: fornecedor.trim(),
        numeroNota: numeroNota.trim() || undefined,
        dataCompra,
        itens: itens.map(({ produtoId, produtoNome, quantidade, valorUnitario }) => ({
          produtoId,
          produtoNome,
          quantidade,
          valorUnitario
        })),
        valorExtras: extrasNumero,
        formaPagamento,
        contaId: lancarNoCaixa ? contaIdEfetiva : null,
        lancarNoCaixa,
        observacoes: observacoes.trim() || undefined,
        usuarioNome: garcomLogado?.nome || 'Administrador'
      });

      onSucesso?.(
        `Nota salva (${formatarMoeda(res.valorTotal)}): estoque abastecido${
          lancarNoCaixa ? ' e caixa atualizado!' : '!'
        }`
      );
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a nota de compra.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalBase
      aberto
      onFechar={onFechar}
      titulo="Nova Compra"
      icone={<Receipt className="w-4 h-4" />}
      tomIcone="emerald"
      tamanho="lg"
      bloqueado={salvando}
      footer={
        <div className="flex items-center uppercase justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] uppercase text-slate-500">Total</p>
            <p className="text-[16px] font-bold uppercase text-slate-700 tabular-nums truncate">
              {formatarMoeda(valorTotalNota)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={salvando}
              onClick={onFechar}
              className="h-9 px-4 rounded-4xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="form-nota-compra-estoque"
              disabled={salvando || itens.length === 0}
              className="h-9 px-4 rounded-4xl bg-emerald-600 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-90"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      }
    >
      <form id="form-nota-compra-estoque" onSubmit={handleConfirmarNota} className="space-y-4">
        {erro && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* Dados da nota */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <label className="block text-[12px] uppercase font-medium text-slate-600 mb-1">
              Fornecedor
            </label>
            <input
              type="text"
              required
              autoFocus
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              className="w-full h-9 px-3 rounded-4xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[12px] uppercase font-medium text-slate-600 mb-1">Data</label>
            <input
              type="date"
              required
              value={dataCompra}
              onChange={(e) => setDataCompra(e.target.value)}
              className="w-full h-9 px-3 rounded-4xl border border-slate-200 bg-white text-[11px] font-medium text-slate-500 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[12px] uppercase font-medium text-slate-600 mb-1">
              Nº Nota
            </label>
            <input
              type="text"
              value={numeroNota}
              onChange={(e) => setNumeroNota(e.target.value)}
              className="w-full h-9 px-3 rounded-4xl border border-slate-200 bg-white text-[12px] text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Busca com dropdown */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] uppercase font-medium text-slate-600">
              Produtos ({itens.length})
            </label>
            {itens.length > 0 && (
              <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                Subtotal: {formatarMoeda(subtotalItens)}
              </span>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              placeholder="Digite o nome do produto"
              className="w-full h-9 pl-10 pr-9 uppercase rounded-4xl border border-slate-200 bg-slate-50 text-[10px] text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/15"
            />
            {buscaProduto && (
              <button
                type="button"
                onClick={() => setBuscaProduto('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {termoBusca && (
              <div className="mt-1.5 rounded-4xl border border-slate-200 bg-white shadow-lg overflow-hidden divide-y divide-slate-100 max-h-52 overflow-y-auto">
                {resultadosBusca.length === 0 ? (
                  <p className="px-3.5 py-2.5 text-xs text-slate-400">
                    Nenhum produto encontrado para &ldquo;{buscaProduto}&rdquo;.
                  </p>
                ) : (
                  resultadosBusca.map((prod) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => adicionarProdutoNota(prod.id)}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{prod.nome}</p>
                        <p className="text-xs text-slate-400">
                          {prod.categoria} • Em estoque: {prod.estoque ?? 0} un
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {itens.length === 0 ? (
            <div className="py-5 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center">
              <p className="text-[10px] uppercase text-slate-500">
                Use a busca acima para incluir os produtos.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
              {itens.map((item) => {
                const totalItem = item.quantidade * item.valorUnitario;
                const prodOriginal = produtos.find((p) => p.id === item.produtoId);
                return (
                  <div
                    key={item.produtoId}
                    className="p-3 rounded-xl border border-slate-200 bg-white space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {item.produtoNome}
                        </p>
                        <p className="text-xs text-slate-400">
                          Estoque: {prodOriginal?.estoque ?? 0} →{' '}
                          <span className="text-emerald-700 font-medium">
                            {(prodOriginal?.estoque ?? 0) + item.quantidade} un
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => alterarQuantidadeItem(item.produtoId, 0)}
                        aria-label="Remover item"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 h-9 overflow-hidden">
                        <button
                          type="button"
                          onClick={() =>
                            alterarQuantidadeItem(item.produtoId, item.quantidade - 1)
                          }
                          className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) =>
                            alterarQuantidadeItem(
                              item.produtoId,
                              Math.max(1, parseInt(e.target.value || '1', 10))
                            )
                          }
                          className="w-11 text-center text-xs font-semibold text-slate-900 bg-transparent focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            alterarQuantidadeItem(item.produtoId, item.quantidade + 1)
                          }
                          className="w-8 h-full flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="relative flex-1 max-w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.custoTexto}
                          onChange={(e) =>
                            alterarCustoUnitarioItem(item.produtoId, e.target.value)
                          }
                          placeholder="0,00"
                          title="Valor unitário"
                          className="w-full h-9 pl-8 pr-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 text-right focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      <div className="text-right min-w-20 shrink-0">
                        <p className="text-xs font-bold text-slate-900 tabular-nums">
                          {formatarMoeda(totalItem)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagamento e Conta com Select limpo */}
        <div className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50 space-y-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-[11px] font-semibold uppercase text-slate-800">
                Debitar do caixa
              </p>
              <p className="text-xs text-slate-500">
                Desmarque para dar entrada apenas no estoque
              </p>
            </div>
            <input
              type="checkbox"
              checked={lancarNoCaixa}
              onChange={(e) => setLancarNoCaixa(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-700 cursor-pointer"
            />
          </label>

          {lancarNoCaixa && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block  uppercase text-[10px] font-medium text-slate-600 mb-1">
                  Forma de pagamento
                </label>
                <div className="relative">
                  <select
                    value={formaPagamento}
                    onChange={(e) => handleTrocarFormaPagamento(e.target.value)}
                    className="w-full appearance-none h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    {METODOS_PAGAMENTO_SAIDA.map((metodo) => (
                      <option key={metodo} value={metodo}>
                        {metodo}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block  uppercase text-[10px] font-medium text-slate-600 mb-1">
                  Conta de saída
                </label>
                <div className="relative">
                  <select
                    value={contaIdEfetiva}
                    onChange={(e) => setContaId(e.target.value)}
                    className="w-full appearance-none h-10 pl-3.5 pr-8 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    {contasAtivas.length === 0 ? (
                      <option value="">Nenhuma conta ativa</option>
                    ) : (
                      contasAtivas.map((c) => {
                        const saldo = saldos.porConta.get(c.id)?.saldoAtual ?? c.saldoInicial;
                        return (
                          <option key={c.id} value={c.id}>
                            {c.nome} ({formatarMoeda(saldo)})
                          </option>
                        );
                      })
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Opções secundárias colapsáveis */}
        {!mostrarExtras ? (
          <button
            type="button"
            onClick={() => setMostrarExtras(true)}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar frete, taxas ou observação</span>
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Frete / Taxas (R$)
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={extrasTexto}
                onChange={(e) => {
                  const res = formatarMascaraValorDigitado(e.target.value);
                  setExtrasTexto(res.texto);
                  setExtrasNumero(res.numero);
                }}
                placeholder="0,00"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Observação
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Entrega semanal, pagamento na entrega..."
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>
        )}
      </form>
    </ModalBase>
  );
}

export function ModalNotaCompraEstoque(props: ModalNotaCompraEstoqueProps) {
  if (!props.aberto) return null;
  return (
    <ModalNotaCompraEstoqueConteudo
      key="modal-nota-compra-aberto"
      onFechar={props.onFechar}
      onSucesso={props.onSucesso}
    />
  );
}
