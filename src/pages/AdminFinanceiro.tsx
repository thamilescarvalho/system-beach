// src/pages/AdminFinanceiro.tsx
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import { Header } from '../components/Header';
import { imprimirCupomTermico } from '../utils/impressoraTermica';
import * as LucideIcons from 'lucide-react';
import type { VendaFechada, StatusPagamentoGarcom } from '../types';

function obterDataLocalISO(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(isoString: string): string {
  if (!isoString) return '';
  const [ano, mes, dia] = isoString.split('T')[0].split('-');
  if (!ano || !mes || !dia) return '';
  return `${dia}/${mes}/${ano}`;
}

function formatarHora(isoString: string): string {
  if (!isoString) return '';
  const data = new Date(isoString);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function AdminFinanceiro() {
  const contexto = useAppContext();
  const adminLogado = contexto?.garcomLogado?.nome || 'Admin';
  const dataHoje = useMemo(() => obterDataLocalISO(), []);

  // DATAS GERAIS (PAINEL)
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);

  // ESTADOS DE TELA GERAL
  const [mostrarValores, setMostrarValores] = useState(true);
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const inputPesquisaRef = useRef<HTMLInputElement>(null);

  // TOAST
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback((mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ mensagem, tipo });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // MODAIS
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFechada | null>(null);
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [modalPagamentosAberto, setModalPagamentosAberto] = useState(false);
  const [modalValeAberto, setModalValeAberto] = useState(false);
  const [modalMetaAberto, setModalMetaAberto] = useState(false);
  const [modalGuardaSolAberto, setModalGuardaSolAberto] = useState(false);
  const [modalMesasAberto, setModalMesasAberto] = useState(false);

  // DADOS DO CONTEXTO
  const historicoBruto = contexto?.historicoVendas || [];
  const mesas = contexto?.mesas || [];
  const listaFuncionarios = contexto?.garcons || contexto?.usuarios || [];
  const metaAtiva = contexto?.metaAtiva;

  // PAINEL GERAL
  const historicoFiltrado = historicoBruto.filter((venda) => {
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= dataInicio && dataVenda <= dataFim;
    const termo = pesquisa.trim().toLowerCase();
    const pesquisaValida =
      termo === '' ||
      venda.numeroMesa.toString().includes(termo) ||
      (venda.nomeCliente?.toLowerCase() || '').includes(termo) ||
      (venda.garcomNome?.toLowerCase() || '').includes(termo);
    return dataValida && pesquisaValida;
  });

  const vendasValidas = historicoFiltrado.filter((v) => v.status !== 'cancelada');
  const faturamentoTotal = vendasValidas.reduce((acc, venda) => acc + venda.total, 0);

  const taxaServicoTotal = vendasValidas.reduce((totalTaxa, venda) => {
    const itemServico = venda.itens.find((item) => item.id === 'taxa-servico-10');
    if (itemServico) return totalTaxa + itemServico.produto.preco * itemServico.quantidade;
    return totalTaxa;
  }, 0);

  const mesasOcupadas = mesas.filter((m) => m.status === 'ocupada');
  const valorEmAberto = mesasOcupadas.reduce((acc, mesa) => {
    return acc + mesa.itens.reduce((sum, item) => sum + item.produto.preco * item.quantidade, 0);
  }, 0);

  const saldoLiquido = faturamentoTotal - taxaServicoTotal;

  // META
  let percentualMeta = 0;
  if (metaAtiva && metaAtiva.valorAlvo > 0) {
    percentualMeta = Math.min((saldoLiquido / metaAtiva.valorAlvo) * 100, 100);
  }

  // PAGAMENTOS (PAINEL)
  const resumoPagamentos = vendasValidas.reduce((acc, venda) => {
    if (venda.pagamentos && venda.pagamentos.length > 0) {
      venda.pagamentos.forEach((pag) => {
        acc[pag.metodo] = (acc[pag.metodo] || 0) + pag.valor;
      });
    } else {
      acc['Não Especificado'] = (acc['Não Especificado'] || 0) + venda.total;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalPagamentosResumo = Object.values(resumoPagamentos).reduce((acc, val) => acc + val, 0);

  const configPagamentos: Record<string, { icon: React.ReactNode; corBg: string; corTexto: string; border: string }> = {
    PIX: {
      icon: <LucideIcons.QrCode size={18} strokeWidth={2} />,
      corBg: 'bg-teal-50',
      corTexto: 'text-teal-600',
      border: 'border-teal-200'
    },
    Crédito: {
      icon: <LucideIcons.CreditCard size={18} strokeWidth={2} />,
      corBg: 'bg-indigo-50',
      corTexto: 'text-indigo-600',
      border: 'border-indigo-200'
    },
    Débito: {
      icon: <LucideIcons.CreditCard size={18} strokeWidth={2} />,
      corBg: 'bg-blue-50',
      corTexto: 'text-blue-600',
      border: 'border-blue-200'
    },
    Dinheiro: {
      icon: <LucideIcons.Banknote size={18} strokeWidth={2} />,
      corBg: 'bg-emerald-50',
      corTexto: 'text-emerald-600',
      border: 'border-emerald-200'
    },
    'Não Especificado': {
      icon: <LucideIcons.HelpCircle size={18} strokeWidth={2} />,
      corBg: 'bg-slate-50',
      corTexto: 'text-slate-500',
      border: 'border-slate-200'
    }
  };

  // MODAL GUARDA-SÓIS
  const [guardaDataInicio, setGuardaDataInicio] = useState(dataHoje);
  const [guardaDataFim, setGuardaDataFim] = useState(dataHoje);
  const [guardaPesquisa, setGuardaPesquisa] = useState('');

  const ehItemGuardaSol = (nomeProduto: string) => {
    const n = nomeProduto.toLowerCase();
    return n.includes('guarda-sol') || n.includes('guarda sol');
  };

  const historicoGuardaSolModal = historicoBruto.filter((venda) => {
    if (venda.status === 'cancelada') return false;
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= guardaDataInicio && dataVenda <= guardaDataFim;

    const temGuardaSol = venda.itens.some((item) => ehItemGuardaSol(item.produto.nome));

    const termo = guardaPesquisa.trim().toLowerCase();
    const pesquisaValida =
      termo === '' ||
      venda.numeroMesa.toString().includes(termo) ||
      (venda.nomeCliente?.toLowerCase() || '').includes(termo) ||
      venda.total.toString().includes(termo);

    return dataValida && temGuardaSol && pesquisaValida;
  });

  const faturamentoGuardaSolModal = historicoGuardaSolModal.reduce((total, venda) => {
    const somaGuardaSolVenda = venda.itens
      .filter((item) => ehItemGuardaSol(item.produto.nome))
      .reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0);
    return total + somaGuardaSolVenda;
  }, 0);

  // FORMULÁRIO DE VALE
  const [valeFuncionarioId, setValeFuncionarioId] = useState('');
  const [valeData, setValeData] = useState(dataHoje);
  const [valeValor, setValeValor] = useState('');
  const [valeDescricao, setValeDescricao] = useState('');
  const [valeStatus, setValeStatus] = useState<StatusPagamentoGarcom>('pago');
  const [carregandoVale, setCarregandoVale] = useState(false);

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorApenasNumeros = e.target.value.replace(/\D/g, '');
    if (valorApenasNumeros === '') {
      setValeValor('');
      return;
    }
    const valorNumericoDecimal = parseInt(valorApenasNumeros, 10) / 100;
    setValeValor(
      valorNumericoDecimal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  };

  const handleSalvarVale = async (e: React.FormEvent) => {
    e.preventDefault();

    const garcomSelecionado = listaFuncionarios.find((g) => g.id === valeFuncionarioId);
    if (!garcomSelecionado) {
      mostrarToast('Por favor, selecione um colaborador válido.', 'erro');
      return;
    }

    const valorDesmascarado = valeValor.replace(/\./g, '').replace(',', '.');
    const valorNumericoDB = parseFloat(valorDesmascarado);

    if (Number.isNaN(valorNumericoDB) || valorNumericoDB <= 0) {
      mostrarToast('Por favor, informe um valor maior que zero.', 'erro');
      return;
    }

    setCarregandoVale(true);
    try {
      if (contexto?.registrarValeFuncionario) {
        await contexto.registrarValeFuncionario({
          garcomId: garcomSelecionado.id,
          garcomNome: garcomSelecionado.nome,
          valor: valorNumericoDB,
          data: valeData,
          descricao: valeDescricao.trim() || 'Adiantamento / Vale',
          categoria: 'Vale',
          status: valeStatus
        });
      }

      setModalValeAberto(false);
      mostrarToast(`Vale de ${formatarMoeda(valorNumericoDB)} lançado para ${garcomSelecionado.nome}!`, 'sucesso');

      setValeFuncionarioId('');
      setValeValor('');
      setValeDescricao('');
      setValeData(dataHoje);
      setValeStatus('pago');
    } catch (error: unknown) {
      console.error('Erro ao registrar vale:', error);
      mostrarToast('Falha ao registrar vale no banco de dados. Tente novamente.', 'erro');
    } finally {
      setCarregandoVale(false);
    }
  };

  // MODAL METAS
  const [metaDataInicio, setMetaDataInicio] = useState(dataHoje);
  const [metaDataFim, setMetaDataFim] = useState(dataHoje);
  const [novaMetaInput, setNovaMetaInput] = useState('');
  const [carregandoMeta, setCarregandoMeta] = useState(false);

  const handleMetaValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorApenasNumeros = e.target.value.replace(/\D/g, '');
    if (valorApenasNumeros === '') {
      setNovaMetaInput('');
      return;
    }
    const valorNumericoDecimal = parseInt(valorApenasNumeros, 10) / 100;
    setNovaMetaInput(
      valorNumericoDecimal.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  };

  const handleSalvarMeta = async (e: React.FormEvent) => {
    e.preventDefault();

    const valorDesmascarado = novaMetaInput.replace(/\./g, '').replace(',', '.');
    const valorNumericoDB = parseFloat(valorDesmascarado);

    if (Number.isNaN(valorNumericoDB) || valorNumericoDB <= 0) {
      mostrarToast('Por favor, informe um valor maior que zero.', 'erro');
      return;
    }

    if (metaDataFim < metaDataInicio) {
      mostrarToast('A data final não pode ser anterior à data inicial.', 'erro');
      return;
    }

    setCarregandoMeta(true);
    try {
      if (contexto?.salvarMetaFinanceira) {
        await contexto.salvarMetaFinanceira({
          dataInicio: metaDataInicio,
          dataFim: metaDataFim,
          valorAlvo: valorNumericoDB
        });
        mostrarToast('Nova meta ativada com sucesso!', 'sucesso');
        setModalMetaAberto(false);
        setNovaMetaInput('');
      }
    } catch (error: unknown) {
      console.error('Erro ao salvar meta:', error);
      mostrarToast('Falha ao registrar meta no banco de dados.', 'erro');
    } finally {
      setCarregandoMeta(false);
    }
  };

  // CANCELAMENTO / ESTORNO
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [carregandoCancelamento, setCarregandoCancelamento] = useState(false);

  const confirmarCancelamento = async () => {
    const motivoLimpo = motivoCancelamento.trim();
    if (!vendaSelecionada || motivoLimpo.length < 3) {
      mostrarToast('Por favor, informe um motivo válido (mín. 3 caracteres).', 'erro');
      return;
    }

    setCarregandoCancelamento(true);
    try {
      await Promise.resolve(contexto?.cancelarVenda(vendaSelecionada.id, motivoLimpo, adminLogado));
      setModalCancelarAberto(false);
      setVendaSelecionada(null);
      setMotivoCancelamento('');
      mostrarToast('Venda estornada e itens devolvidos ao estoque.', 'sucesso');
    } catch (error: unknown) {
      console.error('Erro ao estornar venda:', error);
      mostrarToast('Falha ao estornar a venda. Tente novamente.', 'erro');
    } finally {
      setCarregandoCancelamento(false);
    }
  };

  // UTILITÁRIOS E EFEITOS
  const algumModalAberto = Boolean(
    vendaSelecionada ||
      modalPagamentosAberto ||
      modalValeAberto ||
      modalMetaAberto ||
      modalGuardaSolAberto ||
      modalMesasAberto
  );

  useEffect(() => {
    document.body.style.overflow = algumModalAberto ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [algumModalAberto]);

  useEffect(() => {
    if (!algumModalAberto) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalCancelarAberto && !carregandoCancelamento) {
        setModalCancelarAberto(false);
        return;
      }
      if (vendaSelecionada && !carregandoCancelamento) {
        setVendaSelecionada(null);
        return;
      }
      if (modalValeAberto && !carregandoVale) {
        setModalValeAberto(false);
        return;
      }
      if (modalMetaAberto && !carregandoMeta) {
        setModalMetaAberto(false);
        return;
      }
      if (modalPagamentosAberto) setModalPagamentosAberto(false);
      if (modalGuardaSolAberto) setModalGuardaSolAberto(false);
      if (modalMesasAberto) setModalMesasAberto(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [
    algumModalAberto,
    modalCancelarAberto,
    carregandoCancelamento,
    vendaSelecionada,
    modalValeAberto,
    carregandoVale,
    modalMetaAberto,
    carregandoMeta,
    modalPagamentosAberto,
    modalGuardaSolAberto,
    modalMesasAberto
  ]);

  useEffect(() => {
    if (mostrarPesquisa && inputPesquisaRef.current) inputPesquisaRef.current.focus();
  }, [mostrarPesquisa]);

  const handleImprimirVendaSelecionada = () => {
    if (!vendaSelecionada) return;
    const subtotal = vendaSelecionada.itens.reduce((acc, i) => acc + i.produto.preco * i.quantidade, 0);
    imprimirCupomTermico({
      nomeEstabelecimento:
        contexto?.dadosEmpresa?.nome_exibicao ||
        contexto?.dadosEmpresa?.nome_fantasia ||
        NOME_PADRAO_SISTEMA,
      documentoEstabelecimento: contexto?.dadosEmpresa?.documento || undefined,
      telefoneEstabelecimento: contexto?.dadosEmpresa?.telefone || undefined,
      numeroMesa: vendaSelecionada.numeroMesa,
      nomeCliente: vendaSelecionada.nomeCliente || 'Consumidor',
      garcomNome: vendaSelecionada.garcomNome || 'Equipe',
      itens: vendaSelecionada.itens,
      subtotal,
      taxaGuardaSol: 0,
      desconto: subtotal > vendaSelecionada.total ? subtotal - vendaSelecionada.total : 0,
      totalFinal: vendaSelecionada.total,
      pagamentos: vendaSelecionada.pagamentos || [],
      dataHora: `${formatarData(vendaSelecionada.dataFechamento)} às ${formatarHora(vendaSelecionada.dataFechamento)}`,
      codigoVenda: vendaSelecionada.id,
      statusCancelada: vendaSelecionada.status === 'cancelada',
      motivoCancelamento: vendaSelecionada.motivoCancelamento
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 pb-24 md:pb-8 relative overflow-x-hidden print:bg-white print:pb-0">
      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none px-4 w-full max-w-md flex justify-center">
          <div
            className={`px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 text-xs font-semibold tracking-tight pointer-events-auto ${
              toast.tipo === 'sucesso'
                ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30 shadow-emerald-950/20'
                : 'bg-slate-900/95 text-rose-400 border-rose-500/30 shadow-rose-950/20'
            }`}
          >
            {toast.tipo === 'sucesso' ? (
              <LucideIcons.CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <LucideIcons.AlertCircle size={18} className="text-rose-400 shrink-0" />
            )}
            <span>{toast.mensagem}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar aviso"
            >
              <LucideIcons.X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="print:hidden relative z-10">
        <Header />

        {/* DASHBOARD HEADER */}
        <div className="bg-linear-to-br from-emerald-900 to-emerald-950 text-white rounded-b-4xl pt-20 md:pt-24 md:pl-24 pb-12 relative overflow-hidden shadow-2xl shadow-emerald-900/20">
          <div className="absolute -right-20 -top-20 w-64 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col">
            <div className="flex items-start justify-between gap-4 w-full mb-6">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400/90 text-xs font-semibold uppercase tracking-widest">
                    Faturamento
                  </span>
                  <button
                    type="button"
                    onClick={() => setMostrarValores(!mostrarValores)}
                    className="text-emerald-300 hover:text-white transition-colors p-1 active:scale-90 rounded-full cursor-pointer"
                    aria-label={mostrarValores ? 'Ocultar valores' : 'Mostrar valores'}
                  >
                    {mostrarValores ? <LucideIcons.EyeOff size={14} /> : <LucideIcons.Eye size={14} />}
                  </button>
                </div>
                <span className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight tabular-nums text-white drop-shadow-sm truncate">
                  {mostrarValores ? formatarMoeda(saldoLiquido) : 'R$ •••••'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setModalPagamentosAberto(true)}
                className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-xs font-medium uppercase tracking-wider px-3.5 py-2.5 rounded-full flex items-center justify-center gap-1.5 border border-white/15 shadow-sm backdrop-blur-md mt-1 cursor-pointer shrink-0"
              >
                <LucideIcons.PieChart size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Formas de</span> Pagto.
              </button>
            </div>

            {/* FILTRO DE DATAS */}
            <div className="bg-black/20 border border-white/10 backdrop-blur-md rounded-2xl sm:rounded-full px-3 sm:px-4 py-2 shadow-inner w-full sm:w-auto sm:self-start mt-1">
              <div className="grid grid-cols-2 sm:flex items-center gap-2">
                <LucideIcons.CalendarDays
                  size={14}
                  className="text-emerald-400 shrink-0 pointer-events-none hidden sm:block"
                />
                <div className="flex items-center gap-1.5 min-w-0 bg-white/5 sm:bg-transparent rounded-xl px-2 py-1 sm:p-0">
                  <span className="text-emerald-300/80 text-xs font-medium shrink-0 sm:hidden">De</span>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="appearance-none bg-transparent text-white text-xs font-medium outline-none cursor-pointer w-full min-w-0 sm:w-32 text-center"
                  />
                </div>
                <span className="text-emerald-400/80 font-bold text-xs uppercase tracking-widest shrink-0 pointer-events-none hidden sm:inline">
                  Até
                </span>
                <div className="flex items-center gap-1.5 min-w-0 bg-white/5 sm:bg-transparent rounded-xl px-2 py-1 sm:p-0">
                  <span className="text-emerald-300/80 text-xs font-medium shrink-0 sm:hidden">Até</span>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="appearance-none bg-transparent text-white text-xs font-medium outline-none cursor-pointer w-full min-w-0 sm:w-32 text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="relative z-20 md:pl-24 -mt-7 mb-7">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-4 gap-2 sm:gap-4 md:gap-6 items-start">
            <button
              type="button"
              onClick={() => setModalGuardaSolAberto(true)}
              className="group flex flex-col items-center gap-1.5 outline-none active:scale-95 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-full shadow-lg shadow-black/5 border border-slate-100 flex items-center justify-center text-purple-600 group-hover:-translate-y-1 transition-transform duration-300">
                <LucideIcons.Umbrella size={22} strokeWidth={1.6} />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors text-center leading-tight">
                Guarda-sóis
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModalMesasAberto(true)}
              className="group flex flex-col items-center gap-1.5 outline-none active:scale-95 transition-all relative cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-full shadow-lg shadow-black/5 border border-slate-100 flex items-center justify-center text-amber-500 group-hover:-translate-y-1 transition-transform duration-300 relative">
                <LucideIcons.Clock size={22} strokeWidth={1.6} />
                {mesasOcupadas.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-amber-500 text-white border-2 border-white text-xs font-bold flex items-center justify-center tabular-nums">
                    {mesasOcupadas.length}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors text-center leading-tight">
                <span className="sm:hidden">Mesas</span>
                <span className="hidden sm:inline">Mesas Abertas</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModalValeAberto(true)}
              className="group flex flex-col items-center gap-1.5 outline-none active:scale-95 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-full shadow-lg shadow-slate-800/10 border border-slate-100 flex items-center justify-center text-green-700 group-hover:-translate-y-1 transition-transform duration-300">
                <LucideIcons.Banknote size={22} strokeWidth={1.6} />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors text-center leading-tight">
                <span className="sm:hidden">Vale</span>
                <span className="hidden sm:inline">Lançar Vale</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setModalMetaAberto(true)}
              className="group flex flex-col items-center gap-1.5 outline-none active:scale-95 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-full shadow-lg shadow-blue-600/10 border border-blue-100 flex items-center justify-center text-blue-700 group-hover:-translate-y-1 transition-transform duration-300">
                <LucideIcons.Target size={22} strokeWidth={1.6} />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors text-center leading-tight">
                Metas
              </span>
            </button>
          </div>
        </div>

        {/* EXTRATO DE COMANDAS */}
        <main className="md:pl-24 relative z-20">
          <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
          <section className="pb-12">
            <div className="flex items-center justify-between mb-4 px-1 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <h2 className="text-xs font-semibold text-slate-700 tracking-wider uppercase truncate">
                  Extrato de Comandas
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 text-xs font-medium tabular-nums shrink-0">
                  {historicoFiltrado.length}
                </span>
              </div>

              <div className="flex items-center justify-end relative h-9">
                <div
                  className={`flex items-center transition-all duration-300 ease-out origin-right overflow-hidden ${
                    mostrarPesquisa ? 'w-44 sm:w-64 opacity-100 mr-2' : 'w-0 opacity-0'
                  }`}
                >
                  <input
                    ref={inputPesquisaRef}
                    type="text"
                    placeholder="Mesa, cliente ou garçom..."
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-200 rounded-full h-9 pl-4 pr-8 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 shadow-sm transition-all"
                  />
                  {pesquisa && (
                    <button
                      type="button"
                      onClick={() => setPesquisa('')}
                      className="absolute right-12 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label="Limpar busca"
                    >
                      <LucideIcons.X size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMostrarPesquisa(!mostrarPesquisa);
                    setPesquisa('');
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer ${
                    mostrarPesquisa
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                  aria-label="Pesquisar comandas"
                >
                  <LucideIcons.Search size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              {historicoFiltrado.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center px-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <LucideIcons.Receipt size={26} strokeWidth={1.5} />
                  </div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                    Nenhuma comanda encontrada.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {historicoFiltrado.map((venda) => {
                    const isCancelada = venda.status === 'cancelada';
                    return (
                      <button
                        type="button"
                        key={venda.id}
                        onClick={() => setVendaSelecionada(venda)}
                        className={`w-full p-4 md:p-5 flex justify-between items-center transition-all text-left hover:bg-slate-50 active:scale-99 cursor-pointer ${
                          isCancelada ? 'bg-rose-50/30 opacity-75' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border ${
                              isCancelada
                                ? 'bg-rose-50 text-rose-500 border-rose-100'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          >
                            {isCancelada ? (
                              <LucideIcons.Ban size={19} strokeWidth={2} />
                            ) : (
                              <LucideIcons.Utensils size={18} strokeWidth={1.5} />
                            )}
                          </div>

                          <div className="min-w-0 pr-2">
                            <p
                              className={`font-semibold text-xs md:text-sm truncate leading-tight uppercase tracking-tight ${
                                isCancelada ? 'text-slate-400 line-through' : 'text-slate-800'
                              }`}
                            >
                              Mesa {venda.numeroMesa} <span className="text-slate-300 font-normal mx-1">•</span>{' '}
                              {venda.nomeCliente || 'S/ nome'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-slate-400 font-medium tracking-wide">
                                {formatarData(venda.dataFechamento).slice(0, 5)} às {formatarHora(venda.dataFechamento)}
                              </span>
                              {venda.garcomNome && (
                                <span className="text-xs text-slate-400 hidden sm:inline">
                                  • {venda.garcomNome}
                                </span>
                              )}
                              {isCancelada && (
                                <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                                  Estornada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <p
                            className={`font-semibold text-xs md:text-sm tabular-nums tracking-tight ${
                              isCancelada ? 'text-slate-400 line-through' : 'text-slate-700'
                            }`}
                          >
                            {mostrarValores ? formatarMoeda(venda.total) : 'R$ •••'}
                          </p>
                          <LucideIcons.ChevronRight size={15} className="text-slate-300 hidden sm:block" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
          </div>
        </main>
      </div>

      {/* =====================================================================
          MODAL: GUARDA-SÓIS
      ===================================================================== */}
      {modalGuardaSolAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalGuardaSolAberto(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md max-h-full shadow-2xl border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 bg-purple-900 shrink-0 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-purple-200 shrink-0">
                    <LucideIcons.Umbrella size={20} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white tracking-wider uppercase leading-tight truncate">
                      Guarda-sóis
                    </h3>
                    <p className="text-xs font-medium text-purple-300 mt-0.5 uppercase tracking-wider">
                      Extrato de Receitas
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalGuardaSolAberto(false)}
                  className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer shrink-0"
                  aria-label="Fechar modal de guarda-sóis"
                >
                  <LucideIcons.X size={16} strokeWidth={2} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-purple-800/60 border border-purple-700/60 rounded-xl px-2.5 py-1.5 flex flex-col min-w-0">
                    <span className="text-xs text-purple-300 font-medium">De</span>
                    <input
                      type="date"
                      value={guardaDataInicio}
                      onChange={(e) => setGuardaDataInicio(e.target.value)}
                      className="appearance-none bg-transparent text-white text-xs font-medium outline-none cursor-pointer w-full min-w-0"
                    />
                  </div>
                  <div className="bg-purple-800/60 border border-purple-700/60 rounded-xl px-2.5 py-1.5 flex flex-col min-w-0">
                    <span className="text-xs text-purple-300 font-medium">Até</span>
                    <input
                      type="date"
                      value={guardaDataFim}
                      onChange={(e) => setGuardaDataFim(e.target.value)}
                      className="appearance-none bg-transparent text-white text-xs font-medium outline-none cursor-pointer w-full min-w-0"
                    />
                  </div>
                </div>

                <div className="relative">
                  <LucideIcons.Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Buscar por mesa, cliente ou valor..."
                    value={guardaPesquisa}
                    onChange={(e) => setGuardaPesquisa(e.target.value)}
                    className="appearance-none w-full bg-purple-800/60 border border-purple-700/60 text-white placeholder:text-purple-300/70 rounded-xl h-9 pl-8 pr-8 text-xs font-medium outline-none focus:bg-purple-800 transition-colors"
                  />
                  {guardaPesquisa && (
                    <button
                      type="button"
                      onClick={() => setGuardaPesquisa('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-300 hover:text-white cursor-pointer"
                      aria-label="Limpar busca"
                    >
                      <LucideIcons.X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-purple-50 border-b border-purple-100 shrink-0 flex justify-between items-center gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                  Total Filtrado
                </span>
                <span className="text-xl sm:text-2xl font-semibold text-purple-700 tabular-nums leading-none tracking-tight truncate">
                  {formatarMoeda(faturamentoGuardaSolModal)}
                </span>
              </div>
              <div className="text-right flex flex-col items-end shrink-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Locações
                </span>
                <span className="text-base font-semibold text-purple-700 tabular-nums leading-none bg-purple-100 px-2.5 py-1 rounded-lg">
                  {historicoGuardaSolModal.length}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 sm:max-h-80 bg-slate-50">
              {historicoGuardaSolModal.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                  <LucideIcons.Umbrella size={26} className="text-slate-300" />
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                    Nenhuma taxa encontrada nestes filtros.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historicoGuardaSolModal.map((venda) => {
                    const valorLocacao = venda.itens
                      .filter((item) => ehItemGuardaSol(item.produto.nome))
                      .reduce((acc, item) => acc + item.produto.preco * item.quantidade, 0);

                    return (
                      <div
                        key={venda.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 hover:border-purple-200 transition-colors"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-semibold uppercase text-slate-800 tracking-tight truncate">
                            Mesa {venda.numeroMesa} <span className="text-slate-300 font-normal mx-1">•</span>{' '}
                            {venda.nomeCliente || 'S/ nome'}
                          </span>
                          <span className="text-xs font-medium text-slate-400 mt-0.5">
                            {formatarData(venda.dataFechamento)} às {formatarHora(venda.dataFechamento)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-purple-600 tabular-nums tracking-tight shrink-0">
                          +{formatarMoeda(valorLocacao)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MESAS ABERTAS
      ===================================================================== */}
      {modalMesasAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalMesasAberto(false)} />
          <div className="bg-white rounded-3xl w-full max-w-md max-h-full shadow-2xl border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 bg-amber-500 shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white relative shrink-0">
                  <LucideIcons.Clock size={20} strokeWidth={2} />
                  {mesasOcupadas.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 border-2 border-amber-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white tracking-wider uppercase leading-tight truncate">
                    Mesas Abertas
                  </h3>
                  <p className="text-xs font-medium text-amber-100 mt-0.5 uppercase tracking-wider">
                    Saldo em Atendimento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalMesasAberto(false)}
                className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full text-white hover:bg-white/30 transition-all cursor-pointer shrink-0"
                aria-label="Fechar modal de mesas abertas"
              >
                <LucideIcons.X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-amber-50 border-b border-amber-100 shrink-0 flex justify-between items-center gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                  Valor Total na Casa
                </span>
                <span className="text-xl sm:text-2xl font-semibold text-amber-600 tabular-nums leading-none tracking-tight truncate">
                  {formatarMoeda(valorEmAberto)}
                </span>
              </div>
              <div className="text-right flex flex-col items-end shrink-0">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Ocupadas
                </span>
                <span className="text-base font-semibold text-amber-600 tabular-nums leading-none bg-amber-100 px-2.5 py-1 rounded-lg">
                  {mesasOcupadas.length}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 sm:max-h-80 bg-slate-50">
              {mesasOcupadas.length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                  <LucideIcons.CheckCircle2 size={26} className="text-slate-300" />
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                    O salão está vazio no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mesasOcupadas.map((mesa) => {
                    const totalMesa = mesa.itens.reduce(
                      (sum, item) => sum + item.produto.preco * item.quantidade,
                      0
                    );
                    return (
                      <div
                        key={mesa.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs sm:text-sm font-semibold uppercase text-slate-800 tracking-tight truncate">
                            Mesa {mesa.numero}
                            {mesa.nomeCliente ? ` • ${mesa.nomeCliente}` : ''}
                          </span>
                          <span className="text-xs font-medium text-slate-400 mt-0.5">
                            {mesa.itens.length} {mesa.itens.length === 1 ? 'item consumido' : 'itens consumidos'}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-amber-600 tabular-nums tracking-tight shrink-0">
                          {formatarMoeda(totalMesa)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: MÉTODOS DE PAGAMENTO
      ===================================================================== */}
      {modalPagamentosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalPagamentosAberto(false)} />
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-full shadow-2xl border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-900 shrink-0 gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white tracking-wider uppercase truncate">
                  Formas de Pagto.
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5 uppercase tracking-wider">
                  Receitas por método
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalPagamentosAberto(false)}
                className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-all cursor-pointer shrink-0"
                aria-label="Fechar modal de formas de pagamento"
              >
                <LucideIcons.X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 space-y-2.5 overflow-y-auto flex-1 min-h-0">
              {Object.keys(resumoPagamentos).length === 0 ? (
                <div className="py-8 text-center flex flex-col items-center gap-2">
                  <LucideIcons.PieChart size={26} className="text-slate-300" />
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                    Nenhuma receita no período.
                  </p>
                </div>
              ) : (
                Object.entries(resumoPagamentos)
                  .sort(([, a], [, b]) => b - a)
                  .map(([metodo, valor]) => {
                    const config = configPagamentos[metodo] || configPagamentos['Não Especificado'];
                    const perc = totalPagamentosResumo > 0 ? (valor / totalPagamentosResumo) * 100 : 0;
                    return (
                      <div
                        key={metodo}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${config.border} ${config.corBg} ${config.corTexto}`}
                          >
                            {config.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-800 truncate">
                              {metodo}
                            </p>
                            <p className="text-xs text-slate-400 tabular-nums">{perc.toFixed(1)}% do total</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-slate-900 tabular-nums tracking-tight shrink-0">
                          {formatarMoeda(valor)}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: LANÇAR VALE
      ===================================================================== */}
      {modalValeAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
          <div
            className="absolute inset-0"
            onClick={() => !carregandoVale && setModalValeAberto(false)}
          />
          <div className="bg-white rounded-3xl w-full max-w-sm max-h-full shadow-2xl border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-emerald-950 flex justify-between items-center shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-900/80 flex items-center justify-center text-emerald-400 shrink-0">
                  <LucideIcons.Banknote size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white truncate">
                    Lançar Pagamento
                  </h3>
                  <p className="text-xs text-emerald-300/80 truncate">Vale ou adiantamento</p>
                </div>
              </div>
              <button
                type="button"
                disabled={carregandoVale}
                onClick={() => setModalValeAberto(false)}
                className="w-8 h-8 rounded-full bg-white/10 text-slate-300 hover:text-white hover:bg-white/20 flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                aria-label="Fechar modal de vale"
              >
                <LucideIcons.X size={16} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSalvarVale} className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto flex-1 min-h-0">
              {/* Data */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 pl-0.5">Data do Pagamento</label>
                <div className="relative flex items-center">
                  <LucideIcons.CalendarDays
                    size={15}
                    className="absolute left-3.5 text-slate-400 pointer-events-none"
                  />
                  <input
                    required
                    type="date"
                    disabled={carregandoVale}
                    value={valeData}
                    onChange={(e) => setValeData(e.target.value)}
                    className="w-full min-w-0 appearance-none bg-slate-50 border border-slate-200 rounded-xl h-10 pl-10 pr-3 text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              {/* Colaborador */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 pl-0.5">Colaborador</label>
                <div className="relative flex items-center">
                  <LucideIcons.User
                    size={15}
                    className="absolute left-3.5 text-slate-400 pointer-events-none"
                  />
                  <select
                    required
                    disabled={carregandoVale}
                    value={valeFuncionarioId}
                    onChange={(e) => setValeFuncionarioId(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl h-10 pl-10 pr-9 text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <option value="" disabled>
                      Selecione um colaborador
                    </option>
                    {listaFuncionarios.length === 0 && (
                      <option value="" disabled>
                        Nenhum cadastrado
                      </option>
                    )}
                    {listaFuncionarios.map((func) => (
                      <option key={func.id} value={func.id}>
                        {func.nome}
                      </option>
                    ))}
                  </select>
                  <LucideIcons.ChevronDown
                    size={15}
                    className="absolute right-3.5 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Valor Monetário */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 pl-0.5">Valor (R$)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-slate-400 font-semibold text-sm pointer-events-none">
                    R$
                  </span>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    disabled={carregandoVale}
                    value={valeValor}
                    onChange={handleValorChange}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl h-10 pl-10 pr-3 text-sm font-semibold tabular-nums text-slate-800 outline-none focus:bg-white focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              {/* Status do Lançamento */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 pl-0.5">Status do Lançamento</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    disabled={carregandoVale}
                    onClick={() => setValeStatus('pago')}
                    className={`h-8 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      valeStatus === 'pago'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Pago
                  </button>
                  <button
                    type="button"
                    disabled={carregandoVale}
                    onClick={() => setValeStatus('agendado')}
                    className={`h-8 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      valeStatus === 'agendado'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Agendado
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600 pl-0.5">Descrição / Observação</label>
                <div className="relative flex items-center">
                  <LucideIcons.MessageSquare
                    size={15}
                    className="absolute left-3.5 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Opcional: Ex. Diária ou adiantamento"
                    disabled={carregandoVale}
                    value={valeDescricao}
                    onChange={(e) => setValeDescricao(e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl h-10 pl-10 pr-3 text-sm text-slate-800 outline-none focus:bg-white focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:opacity-50 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={carregandoVale}
                className="mt-1 w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 font-semibold text-xs uppercase tracking-widest shadow-lg shadow-slate-900/15 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {carregandoVale ? (
                  <LucideIcons.Loader2 size={17} className="animate-spin text-emerald-400" />
                ) : (
                  <>
                    <LucideIcons.Check size={17} strokeWidth={2.5} />
                    <span>Salvar Lançamento</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: DEFINIR META
      ===================================================================== */}
      {modalMetaAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div
            className="absolute inset-0"
            onClick={() => !carregandoMeta && setModalMetaAberto(false)}
          />
          <div className="bg-white rounded-3xl w-full max-w-md max-h-full shadow-2xl border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-blue-600 flex justify-between items-center shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <LucideIcons.Target size={19} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white leading-tight truncate">
                    Metas da Casa
                  </h3>
                  <p className="text-xs text-blue-100 font-medium mt-0.5 truncate">Gestão de Objetivos</p>
                </div>
              </div>
              <button
                type="button"
                disabled={carregandoMeta}
                onClick={() => setModalMetaAberto(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                aria-label="Fechar modal de metas"
              >
                <LucideIcons.X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4 bg-slate-50 flex-1 min-h-0 overflow-y-auto">
              {/* CARD DA META ATUAL */}
              <div className="flex flex-col gap-1.5 text-left">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-0.5">
                  Status Atual
                </span>
                {metaAtiva ? (
                  <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4">
                    <div className="flex justify-between items-center gap-2 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Meta Ativa
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {formatarData(metaAtiva.dataInicio).slice(0, 5)} até{' '}
                        {formatarData(metaAtiva.dataFim).slice(0, 5)}
                      </span>
                    </div>

                    <div className="mb-2.5">
                      <span className="text-xs font-medium text-slate-400 block mb-0.5">Objetivo</span>
                      <span className="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums tracking-tight">
                        {formatarMoeda(metaAtiva.valorAlvo)}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${percentualMeta}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-500">
                        Atingido: {formatarMoeda(saldoLiquido)}
                      </span>
                      <span className="font-bold text-blue-600 tabular-nums">{percentualMeta.toFixed(1)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200/80 shadow-xs rounded-2xl p-4 text-center flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <LucideIcons.Target size={20} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Nenhuma meta ativa</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Configure um novo objetivo abaixo para começar.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px w-full bg-slate-200" />

              {/* FORMULÁRIO DE NOVA META */}
              <form onSubmit={handleSalvarMeta} className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Configurar Nova Meta
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1 min-w-0">
                    <label className="text-xs font-medium text-slate-600">Data inicial</label>
                    <input
                      disabled={carregandoMeta}
                      required
                      type="date"
                      value={metaDataInicio}
                      onChange={(e) => setMetaDataInicio(e.target.value)}
                      className="appearance-none w-full min-w-0 bg-white border border-slate-200 rounded-xl h-10 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <label className="text-xs font-medium text-slate-600">Data final</label>
                    <input
                      disabled={carregandoMeta}
                      required
                      type="date"
                      value={metaDataFim}
                      onChange={(e) => setMetaDataFim(e.target.value)}
                      className="appearance-none w-full min-w-0 bg-white border border-slate-200 rounded-xl h-10 px-2.5 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:opacity-50 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Valor Alvo (R$)</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-400 font-semibold text-sm pointer-events-none">
                      R$
                    </span>
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      disabled={carregandoMeta}
                      value={novaMetaInput}
                      onChange={handleMetaValorChange}
                      className="appearance-none w-full bg-white border border-slate-200 rounded-xl h-10 pl-10 pr-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-300 disabled:opacity-50 tabular-nums transition-all"
                    />
                  </div>
                </div>

                <button
                  disabled={carregandoMeta}
                  type="submit"
                  className="mt-1 w-full bg-blue-950 text-white rounded-xl h-10 font-semibold text-xs uppercase tracking-widest shadow-lg shadow-blue-900/15 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {carregandoMeta ? (
                    <LucideIcons.Loader2 size={17} className="animate-spin text-white" />
                  ) : (
                    <>
                      <LucideIcons.Check size={17} strokeWidth={2.5} />
                      <span>Atualizar Meta</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: DETALHES DA VENDA
      ===================================================================== */}
      {vendaSelecionada && !modalCancelarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setVendaSelecionada(null)} />

          <div className="bg-white rounded-3xl w-full max-w-md max-h-full shadow-2xl border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5 bg-slate-900 shrink-0 gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider truncate">
                  Mesa {vendaSelecionada.numeroMesa}
                </h3>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  {formatarData(vendaSelecionada.dataFechamento)} • {formatarHora(vendaSelecionada.dataFechamento)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVendaSelecionada(null)}
                className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-slate-300 hover:bg-white/20 hover:text-white transition-all cursor-pointer shrink-0"
                aria-label="Fechar detalhes da venda"
              >
                <LucideIcons.X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 min-h-0 sm:max-h-96 bg-slate-50 space-y-3">
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl shadow-xs">
                  <h4 className="text-rose-600 font-semibold text-xs uppercase tracking-wider flex items-center gap-2 mb-1.5">
                    <LucideIcons.Ban size={15} strokeWidth={2.5} /> Cancelada por {vendaSelecionada.canceladoPor}
                  </h4>
                  <p className="bg-white p-2.5 rounded-xl border border-rose-100 text-xs text-rose-900 font-medium">
                    Motivo: {vendaSelecionada.motivoCancelamento}
                  </p>
                </div>
              )}

              <div className="flex gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-400 mb-0.5">Cliente</p>
                  <p className="font-semibold text-xs sm:text-sm text-slate-800 uppercase truncate">
                    {vendaSelecionada.nomeCliente || 'Não identificado'}
                  </p>
                </div>
                <div className="w-px bg-slate-200 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-400 mb-0.5">Atendente</p>
                  <p className="font-semibold text-xs sm:text-sm text-slate-800 uppercase truncate">
                    {vendaSelecionada.garcomNome || 'Equipe'}
                  </p>
                </div>
              </div>

              {vendaSelecionada.pagamentos && vendaSelecionada.pagamentos.length > 0 && (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
                  <p className="text-xs font-medium text-slate-400">Pagamentos registrados</p>
                  <div className="flex flex-wrap gap-1.5">
                    {vendaSelecionada.pagamentos.map((pag, idx) => (
                      <span
                        key={`${pag.metodo}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold tabular-nums"
                      >
                        <span>{pag.metodo}:</span>
                        <span>{formatarMoeda(pag.valor)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2.5 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                {vendaSelecionada.itens.map((item) => (
                  <div
                    key={item.id}
                    className={`flex justify-between items-center pb-2.5 border-b border-slate-100 border-dashed last:border-0 last:pb-0 ${
                      vendaSelecionada.status === 'cancelada' ? 'line-through opacity-50' : ''
                    }`}
                  >
                    <div className="flex gap-2.5 items-center min-w-0 pr-2">
                      <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg text-xs tabular-nums shrink-0">
                        {item.quantidade}x
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-xs sm:text-sm uppercase truncate">
                          {item.produto.nome}
                        </p>
                        <p className="text-xs text-slate-400 font-medium tabular-nums">
                          {formatarMoeda(item.produto.preco)} un.
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900 text-sm tabular-nums shrink-0">
                      {formatarMoeda(item.produto.preco * item.quantidade)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white border-t border-slate-200 shrink-0">
              <div className="flex justify-between items-center mb-3.5">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-xs">Total Final</span>
                <span
                  className={`text-xl sm:text-2xl font-semibold tabular-nums tracking-tight leading-none ${
                    vendaSelecionada.status === 'cancelada'
                      ? 'text-slate-400 line-through'
                      : 'text-slate-900'
                  }`}
                >
                  {formatarMoeda(vendaSelecionada.total)}
                </span>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={handleImprimirVendaSelecionada}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-slate-900/15 active:scale-95 cursor-pointer"
                >
                  <LucideIcons.Printer size={16} strokeWidth={2} />
                  <span>Imprimir</span>
                </button>
                {vendaSelecionada.status !== 'cancelada' && (
                  <button
                    type="button"
                    onClick={() => setModalCancelarAberto(true)}
                    className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-semibold py-3 rounded-xl uppercase tracking-wider text-xs transition-colors active:scale-95 shadow-xs cursor-pointer"
                  >
                    Estornar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: ESTORNO
      ===================================================================== */}
      {modalCancelarAberto && vendaSelecionada && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200 font-sans print:hidden">
          <div
            className="absolute inset-0"
            onClick={() => !carregandoCancelamento && setModalCancelarAberto(false)}
          />
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-sm max-h-full overflow-y-auto shadow-2xl border border-slate-200/80 relative z-10 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-rose-100 shrink-0">
              <LucideIcons.AlertTriangle size={24} strokeWidth={2} />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 text-center uppercase tracking-tight mb-1">
              Estornar Venda?
            </h3>
            <p className="text-xs text-slate-500 font-medium text-center mb-4 leading-relaxed">
              O valor de <span className="font-semibold text-rose-600">{formatarMoeda(vendaSelecionada.total)}</span>{' '}
              será subtraído e os itens retornarão ao estoque.
            </p>

            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Motivo (obrigatório)</label>
            <input
              autoFocus
              type="text"
              disabled={carregandoCancelamento}
              placeholder="Ex: Lançamento duplicado..."
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              className="appearance-none w-full bg-slate-50 px-3.5 h-11 rounded-xl outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 font-medium text-sm border border-slate-200 transition-all mb-4 disabled:opacity-50"
            />

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={carregandoCancelamento}
                onClick={() => setModalCancelarAberto(false)}
                className="flex-1 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={carregandoCancelamento}
                onClick={() => void confirmarCancelamento()}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl text-xs uppercase tracking-wider transition-colors active:scale-95 shadow-lg shadow-rose-600/25 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {carregandoCancelamento ? (
                  <LucideIcons.Loader2 size={16} className="animate-spin" />
                ) : (
                  <span>Confirmar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPRESSÃO */}
      <div
        className="hidden print:block text-black bg-white font-mono text-xs absolute top-0 left-0 p-4"
        style={{ width: '80mm' }}
      >
        <h1 className="text-center font-bold text-lg mb-1">C O M P R O V A N T E</h1>
        <p className="text-center border-b border-black pb-2 mb-2">
          Mesa {vendaSelecionada?.numeroMesa}
          <br />
          {vendaSelecionada ? formatarData(vendaSelecionada.dataFechamento) : ''}{' '}
          {vendaSelecionada ? formatarHora(vendaSelecionada.dataFechamento) : ''}
        </p>
        <div className="flex justify-between font-bold border-b border-black pb-1 mb-2">
          <span>QTD DESC</span>
          <span>VALOR</span>
        </div>
        {vendaSelecionada?.itens.map((item) => (
          <div key={item.id} className="flex justify-between mb-1">
            <span className="pr-2">
              {item.quantidade}x {item.produto.nome}
            </span>
            <span className="tabular-nums">{formatarMoeda(item.produto.preco * item.quantidade)}</span>
          </div>
        ))}
        <div className="border-t border-black mt-2 pt-2 flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span className="tabular-nums">{vendaSelecionada ? formatarMoeda(vendaSelecionada.total) : ''}</span>
        </div>
      </div>
    </div>
  );
}
