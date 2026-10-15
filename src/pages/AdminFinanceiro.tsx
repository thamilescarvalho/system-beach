// src/pages/AdminFinanceiro.tsx
import { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import * as LucideIcons from 'lucide-react';
import type { VendaFechada, StatusPagamentoGarcom } from '../types';

export function AdminFinanceiro() {
  const contexto = useContext(AppContext);
  const adminLogado = contexto?.garcomLogado?.nome || 'Admin';

  // DATAS GERAIS (PAINEL)
  const dataHoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);

  // ESTADOS DE TELA GERAL
  const [mostrarValores, setMostrarValores] = useState(true);
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const [pesquisa, setPesquisa] = useState('');
  const inputPesquisaRef = useRef<HTMLInputElement>(null);

  // TOAST 
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4000);
  };

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
  const historicoFiltrado = historicoBruto.filter(venda => {
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= dataInicio && dataVenda <= dataFim;
    const termo = pesquisa.toLowerCase();
    const pesquisaValida = termo === '' || 
      venda.numeroMesa.toString().includes(termo) ||
      (venda.nomeCliente?.toLowerCase() || '').includes(termo);
    return dataValida && pesquisaValida;
  });

  const vendasValidas = historicoFiltrado.filter(v => v.status !== 'cancelada');
  const faturamentoTotal = vendasValidas.reduce((acc, venda) => acc + venda.total, 0);

  const taxaServicoTotal = vendasValidas.reduce((totalTaxa, venda) => {
    const itemServico = venda.itens.find(item => item.id === 'taxa-servico-10');
    if (itemServico) return totalTaxa + (itemServico.produto.preco * itemServico.quantidade);
    return totalTaxa;
  }, 0);

  const mesasOcupadas = mesas.filter(m => m.status === 'ocupada');
  const valorEmAberto = mesasOcupadas.reduce((acc, mesa) => {
    return acc + mesa.itens.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0);
  }, 0);

  const saldoLiquido = faturamentoTotal - taxaServicoTotal;

  // CÁLCULO DE PROGRESSO DA META
  let percentualMeta = 0;
  if (metaAtiva && metaAtiva.valorAlvo > 0) {
    percentualMeta = Math.min((saldoLiquido / metaAtiva.valorAlvo) * 100, 100);
  }

  // PAGAMENTOS (PAINEL)
  const resumoPagamentos = vendasValidas.reduce((acc, venda) => {
    if (venda.pagamentos && venda.pagamentos.length > 0) {
      venda.pagamentos.forEach(pag => {
        acc[pag.metodo] = (acc[pag.metodo] || 0) + pag.valor;
      });
    } else {
      acc['Não Especificado'] = (acc['Não Especificado'] || 0) + venda.total;
    }
    return acc;
  }, {} as Record<string, number>);

  const configPagamentos: Record<string, { icon: React.ReactNode, corBg: string, corTexto: string, border: string }> = {
    'PIX': { icon: <LucideIcons.QrCode size={18} strokeWidth={2} />, corBg: 'bg-teal-50', corTexto: 'text-teal-600', border: 'border-teal-200' },
    'Crédito': { icon: <LucideIcons.CreditCard size={18} strokeWidth={2} />, corBg: 'bg-indigo-50', corTexto: 'text-indigo-600', border: 'border-indigo-200' },
    'Débito': { icon: <LucideIcons.CreditCard size={18} strokeWidth={2} />, corBg: 'bg-blue-50', corTexto: 'text-blue-600', border: 'border-blue-200' },
    'Dinheiro': { icon: <LucideIcons.Banknote size={18} strokeWidth={2} />, corBg: 'bg-emerald-50', corTexto: 'text-emerald-600', border: 'border-emerald-200' },
    'Não Especificado': { icon: <LucideIcons.HelpCircle size={18} strokeWidth={2} />, corBg: 'bg-slate-50', corTexto: 'text-slate-500', border: 'border-slate-200' }
  };

  // MODAL GUARDA-SÓIS
  const [guardaDataInicio, setGuardaDataInicio] = useState(dataHoje);
  const [guardaDataFim, setGuardaDataFim] = useState(dataHoje);
  const [guardaPesquisa, setGuardaPesquisa] = useState('');

  const historicoGuardaSolModal = historicoBruto.filter(venda => {
    if (venda.status === 'cancelada') return false;
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= guardaDataInicio && dataVenda <= guardaDataFim;

    const temGuardaSol = venda.itens.some(item => 
      item.produto.nome.toLowerCase().includes('guarda-sol') || 
      item.produto.nome.toLowerCase().includes('guarda sol')
    );

    const termo = guardaPesquisa.toLowerCase();
    const pesquisaValida = termo === '' || 
      venda.numeroMesa.toString().includes(termo) ||
      (venda.nomeCliente?.toLowerCase() || '').includes(termo) ||
      venda.total.toString().includes(termo);

    return dataValida && temGuardaSol && pesquisaValida;
  });

  const faturamentoGuardaSolModal = historicoGuardaSolModal.reduce((total, venda) => {
    const itemGuarda = venda.itens.find(item => 
      item.produto.nome.toLowerCase().includes('guarda-sol') || 
      item.produto.nome.toLowerCase().includes('guarda sol')
    );
    return total + (itemGuarda ? itemGuarda.produto.preco * itemGuarda.quantidade : 0);
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
    setValeValor(valorNumericoDecimal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSalvarVale = async (e: React.FormEvent) => {
    e.preventDefault();

    const garcomSelecionado = listaFuncionarios.find(g => g.id === valeFuncionarioId);
    if (!garcomSelecionado) {
      mostrarToast('Por favor, selecione um colaborador válido.', 'erro');
      return;
    }

    const valorDesmascarado = valeValor.replace(/\./g, '').replace(',', '.');
    const valorNumericoDB = parseFloat(valorDesmascarado);

    if (isNaN(valorNumericoDB) || valorNumericoDB <= 0) {
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
      console.error("Erro ao registrar vale:", error);
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
    setNovaMetaInput(valorNumericoDecimal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSalvarMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const valorDesmascarado = novaMetaInput.replace(/\./g, '').replace(',', '.');
    const valorNumericoDB = parseFloat(valorDesmascarado);

    if (isNaN(valorNumericoDB) || valorNumericoDB <= 0) {
      mostrarToast('Por favor, informe um valor maior que zero.', 'erro');
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
        mostrarToast(`Nova meta ativada com sucesso!`, 'sucesso');
        setModalMetaAberto(false);
        setNovaMetaInput('');
      }
    } catch (error: unknown) {
      console.error("Erro ao salvar meta:", error);
      mostrarToast('Falha ao registrar meta no banco de dados.', 'erro');
    } finally {
      setCarregandoMeta(false);
    }
  };

  // CANCELAMENTO / ESTORNO
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const confirmarCancelamento = () => {
    if (vendaSelecionada && motivoCancelamento.length > 3) {
      contexto?.cancelarVenda(vendaSelecionada.id, motivoCancelamento, adminLogado);
      setModalCancelarAberto(false);
      setVendaSelecionada(null);
      setMotivoCancelamento('');
      mostrarToast('Venda estornada e itens devolvidos ao estoque.', 'sucesso');
    } else {
      mostrarToast('Por favor, informe um motivo válido para o cancelamento.', 'erro');
    }
  };

  // UTILITÁRIOS E EFEITOS
  useEffect(() => {
    if (vendaSelecionada || modalPagamentosAberto || modalValeAberto || modalMetaAberto || modalGuardaSolAberto || modalMesasAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [vendaSelecionada, modalPagamentosAberto, modalValeAberto, modalMetaAberto, modalGuardaSolAberto, modalMesasAberto]);

  useEffect(() => {
    if (mostrarPesquisa && inputPesquisaRef.current) inputPesquisaRef.current.focus();
  }, [mostrarPesquisa]);

  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarData = (isoString: string) => {
    if(!isoString) return '';
    const [ano, mes, dia] = isoString.split('T')[0].split('-');
    return `${dia}/${mes}/${ano}`;
  };
  const formatarHora = (isoString: string) => new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-800 pb-24 md:pb-8 relative overflow-hidden print:bg-white print:pb-0">

      {/* TOAST*/}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className={`px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 text-[13px] font-semibold tracking-tight pointer-events-auto ${
            toast.tipo === 'sucesso' 
              ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30 shadow-emerald-950/20' 
              : 'bg-slate-900/95 text-rose-400 border-rose-500/30 shadow-rose-950/20'
          }`}>
            {toast.tipo === 'sucesso' ? (
              <LucideIcons.CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <LucideIcons.AlertCircle size={18} className="text-rose-400 shrink-0" />
            )}
            <span>{toast.mensagem}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white transition-colors">
              <LucideIcons.X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="print:hidden relative z-10">
        <Header />

        {/* DASHBOARD HEADER */}
        <div className="bg-linear-to-br from-emerald-900 to-emerald-950 text-white rounded-b-[40px] pt-20 md:pt-24 md:pl-24 pb-12 relative overflow-hidden shadow-2xl shadow-emerald-900/20">
          <div className="absolute -right-20 -top-20 w-64 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-teal-500/20 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 w-full max-w-5xl mx-auto px-6 flex flex-col">

            <div className="flex items-start justify-between w-full mb-6">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400/90 text-[10px] md:text-[11px] font-semibold uppercase tracking-widest">Faturamento</span>
                  <button onClick={() => setMostrarValores(!mostrarValores)} className="text-emerald-300 hover:text-white transition-colors p-1 active:scale-90 rounded-full">
                    {mostrarValores ? <LucideIcons.EyeOff size={14} /> : <LucideIcons.Eye size={14} />}
                  </button>
                </div>
                <span className="text-4xl md:text-5xl font-semibold tracking-tight tabular-nums text-white drop-shadow-sm">
                  {mostrarValores ? formatarMoeda(saldoLiquido) : 'R$ •••••'}
                </span>
              </div>

              <button 
                onClick={() => setModalPagamentosAberto(true)} 
                className="bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white text-[9px] md:text-[10px] font-medium uppercase tracking-widest px-3.5 py-2.5 rounded-full flex items-center justify-center gap-1.5 border border-white/10 shadow-sm backdrop-blur-md mt-1"
              >
                <LucideIcons.PieChart size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Formas de</span> Pagto.
              </button>
            </div>

            {/* FILTRO DE DATAS */}
            <div className="inline-flex items-center bg-black/20 border border-white/10 backdrop-blur-md rounded-full px-4 py-2 shadow-inner self-start mt-2">
              <LucideIcons.CalendarDays size={14} className="text-emerald-400 mr-2 shrink-0" />
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent text-white text-[11px] md:text-[12px] font-medium outline-none cursor-pointer w-23 md:w-23.25 uppercase text-center" />
              <span className="text-emerald-500/80 font-semibold text-[9px] uppercase mx-2 tracking-widest">ATÉ</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent text-white text-[11px] md:text-[12px] font-medium outline-none cursor-pointer w-23 md:w-23.25 uppercase text-center" />
            </div>

          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 md:px-8 md:pl-30 -mt-7 mb-8">
          <div className="grid grid-cols-4 gap-2 md:gap-6 bg-transparent">

            <button onClick={() => setModalGuardaSolAberto(true)} className="group flex flex-col items-center gap-2 outline-none active:scale-95 transition-all">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-full shadow-lg shadow-black/5 border border-slate-100 flex items-center justify-center text-purple-600 group-hover:-translate-y-1 transition-transform duration-300">
                <LucideIcons.Umbrella size={24} strokeWidth={1.5} />
              </div>
            </button>

            <button onClick={() => setModalMesasAberto(true)} className="group flex flex-col items-center gap-2 outline-none active:scale-95 transition-all relative">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-full shadow-lg shadow-black/5 border border-slate-100 flex items-center justify-center text-amber-500 group-hover:-translate-y-1 transition-transform duration-300">
                <LucideIcons.Clock size={24} strokeWidth={1.5} />
              </div>
              <span className="absolute top-0 right-1 md:right-3 w-3 h-3 bg-amber-400 border-2 border-white rounded-full animate-pulse"></span>
            </button>

            <button onClick={() => setModalValeAberto(true)} className="group flex flex-col items-center gap-2 outline-none active:scale-95 transition-all">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-full shadow-lg shadow-slate-800/20 border border-slate-100 flex items-center justify-center text-green-700 group-hover:-translate-y-1 transition-transform duration-300">
                <LucideIcons.Banknote size={24} strokeWidth={1.5} />
              </div>
            </button>

            <button onClick={() => setModalMetaAberto(true)} className="group flex flex-col items-center gap-2 outline-none active:scale-95 transition-all">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-100 rounded-full shadow-lg shadow-blue-600/20 border border-blue-100 flex items-center justify-center text-blue-700 group-hover:-translate-y-1 transition-transform duration-300">
                <LucideIcons.Target size={24} strokeWidth={1.5} />
              </div>
            </button>

          </div>
        </div>

        {/* EXTRATO DE COMANDAS */}
        <main className="w-full max-w-5xl mx-auto px-7 md:px-8 md:pl-30 relative z-20">
          <section className="pb-12">
            <div className="flex items-center justify-between mb-4 px-2">
              <h2 className="text-[11px] font-semibold text-slate-700 tracking-tight uppercase">Extrato de Comandas</h2>

              <div className="flex items-center justify-end relative h-9">
                <div className={`flex items-center transition-all duration-300 ease-out origin-right overflow-hidden ${mostrarPesquisa ? 'w-48 md:w-64 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
                  <input
                    ref={inputPesquisaRef}
                    type="text"
                    placeholder="PESQUISAR"
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-full h-9 pl-4 pr-8 text-[12px] font-medium outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 shadow-sm transition-all"
                  />
                  {pesquisa && (
                    <button onClick={() => setPesquisa('')} className="absolute right-4 text-slate-400 hover:text-slate-600">
                      <LucideIcons.X size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => { setMostrarPesquisa(!mostrarPesquisa); setPesquisa(''); }} 
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${mostrarPesquisa ? 'bg-slate-200 text-slate-800' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                >
                  <LucideIcons.Search size={16} strokeWidth={2} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[28px] shadow-sm border border-slate-200 overflow-hidden">
              {historicoFiltrado.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center">
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                    <LucideIcons.Receipt size={26} strokeWidth={1.5} />
                  </div>
                  <p className="text-slate-400 text-[11px] font-semibold uppercase tracking-widest">Nenhuma comanda encontrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {historicoFiltrado.map((venda) => {
                    const isCancelada = venda.status === 'cancelada';
                    return (
                      <button 
                        key={venda.id}
                        onClick={() => setVendaSelecionada(venda)}
                        className={`w-full p-4 md:p-5 flex justify-between items-center transition-all text-left hover:bg-slate-50 active:scale-[0.99] ${isCancelada ? 'bg-rose-50/30 opacity-70 grayscale-30' : ''}`}
                      >
                        <div className="flex items-center gap-3 md:gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${isCancelada ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            {isCancelada ? <LucideIcons.Ban size={20} strokeWidth={2} /> : <LucideIcons.Utensils size={18} strokeWidth={1} />}
                          </div>

                          <div className="min-w-0 pr-2">
                            <p className={`font-semibold text-[12px] md:text-[15px] truncate leading-tight uppercase tracking-tight ${isCancelada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              Mesa {venda.numeroMesa} <span className="text-slate-300 font-normal mx-1">•</span> {venda.nomeCliente || 'S/ nome'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] md:text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                                {formatarData(venda.dataFechamento).slice(0,5)} às {formatarHora(venda.dataFechamento)}
                              </span>
                              {isCancelada && (
                                <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded font-semibold uppercase tracking-widest">Estornada</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className={`font-semibold text-[12px] md:text-[15px] tabular-nums tracking-tight ${isCancelada ? 'text-slate-400' : 'text-stone-400'}`}>
                            {mostrarValores ? formatarMoeda(venda.total) : 'R$ •••'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* MODAL: GUARDA-SÓIS */}
      {modalGuardaSolAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalGuardaSolAberto(false)}></div>
          <div className="bg-white rounded-4xl w-full max-w-md max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            
            <div className="p-6 bg-purple-900 shrink-0 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-purple-200">
                    <LucideIcons.Umbrella size={24} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-white tracking-widest uppercase leading-tight">Guarda-sóis</h3>
                    <p className="text-[11px] font-medium text-purple-300 mt-0.5 uppercase tracking-widest">Extrato de Receitas</p>
                  </div>
                </div>
                <button onClick={() => setModalGuardaSolAberto(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
                  <LucideIcons.X size={18} strokeWidth={2} />
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between bg-purple-800/50 rounded-xl p-1.5 border border-purple-700/50">
                  <div className="flex items-center">
                    <LucideIcons.Calendar size={14} className="text-purple-300 ml-2 mr-1" />
                    <input type="date" value={guardaDataInicio} onChange={(e) => setGuardaDataInicio(e.target.value)} className="bg-transparent text-white text-[11px] font-medium outline-none cursor-pointer w-23.75 uppercase text-center" />
                  </div>
                  <span className="text-purple-400 font-medium text-[9px] uppercase tracking-widest">Até</span>
                  <div className="flex items-center">
                    <input type="date" value={guardaDataFim} onChange={(e) => setGuardaDataFim(e.target.value)} className="bg-transparent text-white text-[11px] font-medium outline-none cursor-pointer w-23.75 uppercase text-center" />
                  </div>
                </div>
                
                <div className="relative">
                  <LucideIcons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300" />
                  <input 
                    type="text" 
                    placeholder="Mesa, Cliente ou Valor..." 
                    value={guardaPesquisa}
                    onChange={(e) => setGuardaPesquisa(e.target.value)}
                    className="w-full bg-purple-800/50 border border-purple-700/50 text-white placeholder:text-purple-300/70 rounded-xl h-10 pl-9 pr-4 text-[12px] font-medium outline-none focus:bg-purple-800 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-purple-50 border-b border-purple-100 shrink-0 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Total Filtrado</span>
                <span className="text-3xl font-semibold text-purple-700 tabular-nums leading-none tracking-tight">
                  {formatarMoeda(faturamentoGuardaSolModal)}
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Locações</span>
                <span className="text-xl font-semibold text-purple-700 tabular-nums leading-none bg-purple-100 px-3 py-1 rounded-lg">
                  {historicoGuardaSolModal.length}
                </span>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-50 hide-scrollbar">
              {historicoGuardaSolModal.length === 0 ? (
                <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest text-center py-10">Nenhuma taxa encontrada nestes filtros.</p>
              ) : (
                <div className="space-y-3">
                  {historicoGuardaSolModal.map(venda => {
                    const itemGuarda = venda.itens.find(item => 
                      item.produto.nome.toLowerCase().includes('guarda-sol') || 
                      item.produto.nome.toLowerCase().includes('guarda sol')
                    );
                    const valorLocacao = itemGuarda ? itemGuarda.produto.preco * itemGuarda.quantidade : 0;

                    return (
                      <div key={venda.id} className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex items-center justify-between hover:border-purple-200 transition-colors">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold uppercase text-slate-800 tracking-tight">Mesa {venda.numeroMesa} <span className="text-slate-300 font-normal mx-1">•</span> {venda.nomeCliente || 'S/ nome'}</span>
                          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mt-1">
                            {formatarData(venda.dataFechamento)} às {formatarHora(venda.dataFechamento)}
                          </span>
                        </div>
                        <span className="text-[15px] font-semibold text-purple-600 tabular-nums tracking-tight">+{formatarMoeda(valorLocacao)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MESAS ABERTAS */}
      {modalMesasAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalMesasAberto(false)}></div>
          <div className="bg-white rounded-4xl w-full max-w-md max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between p-6 bg-amber-500 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white relative">
                  <LucideIcons.Clock size={24} strokeWidth={2} />
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-amber-500 rounded-full animate-pulse"></span>
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-white tracking-widest uppercase leading-tight">Mesas Abertas</h3>
                  <p className="text-[11px] font-medium text-amber-100 mt-0.5 uppercase tracking-widest">Saldo em Atendimento</p>
                </div>
              </div>
              <button onClick={() => setModalMesasAberto(false)} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full text-white hover:bg-white/30 transition-all">
                <LucideIcons.X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 bg-amber-50 border-b border-amber-100 shrink-0 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Valor Total na Casa</span>
                <span className="text-3xl font-semibold text-amber-600 tabular-nums leading-none tracking-tight">
                  {formatarMoeda(valorEmAberto)}
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1">Ocupadas</span>
                <span className="text-xl font-semibold text-amber-600 tabular-nums leading-none bg-amber-100 px-3 py-1 rounded-lg">
                  {mesasOcupadas.length}
                </span>
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-slate-50 hide-scrollbar">
              {mesasOcupadas.length === 0 ? (
                <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest text-center py-10">O salão está vazio no momento.</p>
              ) : (
                <div className="space-y-3">
                  {mesasOcupadas.map(mesa => {
                    const totalMesa = mesa.itens.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0);
                    return (
                      <div key={mesa.id} className="bg-white p-4 rounded-[20px] border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[13px] font-semibold uppercase text-slate-800 tracking-tight">Mesa {mesa.numero}</span>
                          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mt-1">
                            {mesa.itens.length} itens consumidos
                          </span>
                        </div>
                        <span className="text-[15px] font-semibold text-amber-600 tabular-nums tracking-tight">{formatarMoeda(totalMesa)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MÉTODOS DE PAGAMENTO */}
      {modalPagamentosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalPagamentosAberto(false)}></div>
          <div className="bg-white rounded-4xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between p-6 bg-slate-900">
              <div>
                <h3 className="text-[14px] font-semibold text-white tracking-widest uppercase">Formas de Pagto.</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">Receitas por método</p>
              </div>
              <button onClick={() => setModalPagamentosAberto(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
                <LucideIcons.X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 bg-slate-100 space-y-3">
              {Object.keys(resumoPagamentos).length === 0 ? (
                <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest text-center py-8">Nenhuma receita no período.</p>
              ) : (
                Object.entries(resumoPagamentos).map(([metodo, valor]) => {
                  const config = configPagamentos[metodo] || configPagamentos['Não Especificado'];
                  return (
                    <div key={metodo} className="bg-white p-3 rounded-[50px] border border-slate-200 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-[50px] flex items-center justify-center border shadow-inner ${config.border} ${config.corBg} ${config.corTexto}`}>
                          {config.icon}
                        </div>
                        <span className="text-[12px] font-semibold uppercase tracking-widest text-slate-700">{metodo}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-slate-900 tabular-nums tracking-tight">{formatarMoeda(valor)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAR VALE */}
      {modalValeAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 font-sans">
          <div className="absolute inset-0" onClick={() => !carregandoVale && setModalValeAberto(false)}></div>
          <div className="bg-white rounded-4xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">

            <div className="p-5 bg-emerald-950 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <LucideIcons.Banknote size={20} className="text-emerald-400" />
                <h3 className="text-[13px] font-semibold uppercase tracking-widest text-white">Lançar Pagamento</h3>
              </div>
              <button disabled={carregandoVale} onClick={() => setModalValeAberto(false)} className="text-slate-400 hover:text-white transition-colors disabled:opacity-50">
                <LucideIcons.X size={22} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSalvarVale} className="p-6 flex flex-col gap-3">

              {/* Data */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-sans text-slate-500 uppercase tracking-widest">Data do Pagamento</label>
                <div className="relative">
                  <LucideIcons.CalendarDays size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    required type="date"
                    disabled={carregandoVale}
                    value={valeData} onChange={(e) => setValeData(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-[40px] h-10 pl-11 pr-5 text-[13px] font-sans text-slate-800 outline-none focus:border-emerald-800 uppercase disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Colaborador */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-sans text-slate-500 uppercase tracking-widest">Colaborador</label>
                <div className="relative">
                  <LucideIcons.User size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select 
                    required 
                    disabled={carregandoVale}
                    value={valeFuncionarioId} 
                    onChange={(e) => setValeFuncionarioId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-[40px] h-10 pl-12 pr-4 text-[12px] font-sans text-slate-800 outline-none focus:border-emerald-800 uppercase disabled:opacity-50"
                  >
                    <option value="" disabled>Selecione</option>
                    {listaFuncionarios.length === 0 && (
                      <option value="" disabled>Nenhum cadastrado</option>
                    )}
                    {listaFuncionarios.map((func) => (
                      <option key={func.id} value={func.id}>{func.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor Monetário  */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-sans text-slate-500 uppercase tracking-widest">Valor (R$)</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[14px]">R$</span>
                  <input 
                    required 
                    type="text" 
                    inputMode="numeric"
                    placeholder="0,00"
                    disabled={carregandoVale}
                    value={valeValor} 
                    onChange={handleValorChange}
                    className="w-full bg-slate-50 border border-slate-300 rounded-[40px] h-10 pl-11 pr-5 text-[13px] font-sans text-slate-800 outline-none focus:border-emerald-800 uppercase disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Status do Lançamento */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-sans text-slate-500 uppercase tracking-widest">Status do Lançamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={carregandoVale}
                    onClick={() => setValeStatus('pago')}
                    className={`h-7 rounded-4xl text-[10px] font-semibold uppercase tracking-widest transition-all border ${valeStatus === 'pago' ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-slate-50 border-slate-300 text-slate-500'}`}
                  >
                    Pago
                  </button>
                  <button
                    type="button"
                    disabled={carregandoVale}
                    onClick={() => setValeStatus('agendado')}
                    className={`h-7 rounded-4xl text-[10px] font-semibold uppercase tracking-widest transition-all border ${valeStatus === 'agendado' ? 'bg-amber-50 border-amber-500 text-amber-700 shadow-sm' : 'bg-slate-50 border-slate-300 text-slate-500'}`}
                  >
                    Agendado
                  </button>
                </div>
              </div>

              {/* Descrição */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-sans text-slate-500 uppercase tracking-widest">Descrição / Observação</label>
                <input 
                  type="text"
                  disabled={carregandoVale}
                  value={valeDescricao} onChange={(e) => setValeDescricao(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-[40px] h-10 pl-12 pr-4 text-[13px] font-sans text-slate-800 outline-none focus:border-emerald-800 uppercase disabled:opacity-50"
                />
              </div>

              <button 
                type="submit" 
                disabled={carregandoVale}
                className="mt-2 w-full bg-slate-800 text-white rounded-[40px] h-10 font-sans text-[12px] uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {carregandoVale ? (
                  <LucideIcons.Loader2 size={19} className="animate-spin text-emerald-400" />
                ) : (
                  <>
                    <LucideIcons.Check size={19} strokeWidth={2.5} /> SALVAR
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEFINIR META  */}
      {modalMetaAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => !carregandoMeta && setModalMetaAberto(false)}></div>
          <div className="bg-white rounded-4xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">

            <div className="p-6 bg-blue-600 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <LucideIcons.Target size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold uppercase tracking-widest text-white leading-tight">Metas da Casa</h3>
                  <p className="text-[10px] text-blue-200 font-medium tracking-widest uppercase mt-0.5">Gestão de Objetivos</p>
                </div>
              </div>
              <button disabled={carregandoMeta} onClick={() => setModalMetaAberto(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/10 text-white hover:bg-black/20 transition-all disabled:opacity-50">
                <LucideIcons.X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 bg-slate-50 flex-1 overflow-y-auto hide-scrollbar">
              
              {/* CARD DA META ATUAL */}
              <div className="flex flex-col gap-2 text-left">
                <label className="text-[10px] font-sans text-slate-500 uppercase tracking-widest ml-1">Status Atual</label>
                {metaAtiva ? (
                  <div className="bg-white border border-slate-300 shadow-sm rounded-3xl p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Meta Ativa</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase tracking-wider">
                        {formatarData(metaAtiva.dataInicio).slice(0,5)} até {formatarData(metaAtiva.dataFim).slice(0,5)}
                      </span>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mb-0.5">Objetivo (R$)</span>
                      <span className="text-2xl font-bold text-slate-800 tabular-nums tracking-tight">{formatarMoeda(metaAtiva.valorAlvo)}</span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentualMeta}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-semibold text-slate-500">Atingido: {formatarMoeda(saldoLiquido)}</span>
                      <span className="font-bold text-blue-600">{percentualMeta.toFixed(1)}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-6 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <LucideIcons.Target size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-700">Nenhuma meta ativa</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-1">Configure um novo objetivo para começar.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px w-full bg-slate-200"></div>

              {/* FORMULÁRIO DE NOVA META */}
              <form onSubmit={handleSalvarMeta} className="flex flex-col gap-5">
                <label className="text-[10px] font-semibold text-slate-800 uppercase tracking-widest ml-1 block -mb-2">Configurar Nova Meta</label>
                
                <div className="flex flex-col gap-2 text-left">
                  <label className="text-[10px] font-sans text-slate-500 uppercase tracking-widest ml-1">Período</label>
                  <div className="flex items-center gap-3">
                    <input disabled={carregandoMeta} required type="date" value={metaDataInicio} onChange={(e) => setMetaDataInicio(e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-4xl h-11 px-3 text-[11px] font-sans text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase disabled:opacity-50 transition-all text-center" />
                    <span className="text-[10px] font-sans text-slate-400 uppercase">Até</span>
                    <input disabled={carregandoMeta} required type="date" value={metaDataFim} onChange={(e) => setMetaDataFim(e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-4xl h-11 px-3 text-[11px] font-sans text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 uppercase disabled:opacity-50 transition-all text-center" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 text-left">
                  <label className="text-[10px] font-sans text-slate-500 uppercase tracking-widest ml-1">Valor Alvo (R$)</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[16px]">R$</span>
                    <input 
                      required 
                      type="text" 
                      inputMode="numeric" 
                      placeholder="0,00"
                      disabled={carregandoMeta}
                      value={novaMetaInput} 
                      onChange={handleMetaValorChange}
                      className="w-full bg-white border border-slate-300 shadow-sm rounded-[30px] h-11 pl-12 pr-4 text-[15px] font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-300 disabled:opacity-50 font-sans tabular-nums transition-all"
                    />
                  </div>
                </div>

                <button disabled={carregandoMeta} type="submit" className="mt-1 w-full bg-blue-950 text-white rounded-[30px] h-11 font-semibold text-[11px] uppercase tracking-widest shadow-xl shadow-blue-600/10 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {carregandoMeta ? <LucideIcons.Loader2 size={19} className="animate-spin text-white" /> : <><LucideIcons.Check size={19} strokeWidth={2.5} /> ATUALIZAR META</>}
                </button>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES DA VENDA */}
      {vendaSelecionada && !modalCancelarAberto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="absolute inset-0" onClick={() => setVendaSelecionada(null)}></div>

          <div className="bg-white rounded-4xl w-full max-w-sm max-h-[90vh] shadow-2xl relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-slate-900">
              <div>
                <h3 className="text-[15px] font-semibold text-white uppercase tracking-widest">Mesa {vendaSelecionada.numeroMesa}</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-widest">{formatarData(vendaSelecionada.dataFechamento)} • {formatarHora(vendaSelecionada.dataFechamento)}</p>
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-full text-slate-300 hover:bg-white/20 hover:text-white transition-all">
                <LucideIcons.X size={20} strokeWidth={2} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 hide-scrollbar">
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl mb-6 shadow-sm">
                  <h4 className="text-rose-600 font-semibold text-[11px] uppercase tracking-widest flex items-center gap-2 mb-2">
                    <LucideIcons.Ban size={16} strokeWidth={2.5} /> Cancelada por {vendaSelecionada.canceladoPor}
                  </h4>
                  <p className="bg-white p-3 rounded-xl border border-rose-100 text-[12px] text-rose-900 font-medium">Motivo: {vendaSelecionada.motivoCancelamento}</p>
                </div>
              )}

              <div className="flex gap-4 mb-6 bg-white p-5 rounded-[20px] border border-slate-200 shadow-sm">
                <div className="flex-1">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
                  <p className="font-semibold text-[13px] text-slate-800 uppercase truncate">{vendaSelecionada.nomeCliente || 'Não identificado'}</p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div className="flex-1">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Atendente</p>
                  <p className="font-semibold text-[13px] text-slate-800 uppercase truncate">{vendaSelecionada.garcomNome}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6 bg-white p-5 rounded-[20px] border border-slate-200 shadow-sm">
                {vendaSelecionada.itens.map(item => (
                  <div key={item.id} className={`flex justify-between items-center pb-4 border-b border-slate-100 border-dashed last:border-0 last:pb-0 ${vendaSelecionada.status === 'cancelada' ? 'line-through opacity-50' : ''}`}>
                    <div className="flex gap-3 items-center min-w-0 pr-2">
                      <span className="font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg text-[11px] tabular-nums">{item.quantidade}x</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-[13px] uppercase truncate">{item.produto.nome}</p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tabular-nums">{formatarMoeda(item.produto.preco)} un.</p>
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900 text-[14px] tabular-nums">{formatarMoeda(item.produto.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-200">
              <div className="flex justify-between items-center mb-5">
                <span className="font-semibold text-slate-400 uppercase tracking-widest text-[11px]">Total Final</span>
                <span className={`text-2xl font-semibold tabular-nums tracking-tight leading-none ${vendaSelecionada.status === 'cancelada' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                  {formatarMoeda(vendaSelecionada.total)}
                </span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => window.print()} className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 rounded-[20px] uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-colors shadow-lg shadow-slate-900/20 active:scale-95">
                  <LucideIcons.Printer size={18} strokeWidth={2} /> Imprimir
                </button>
                {vendaSelecionada.status !== 'cancelada' && (
                  <button onClick={() => setModalCancelarAberto(true)} className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 font-semibold py-4 rounded-[20px] uppercase tracking-widest text-[11px] transition-colors active:scale-95 shadow-sm">
                    Estornar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ESTORNO */}
      {modalCancelarAberto && vendaSelecionada && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200 print:hidden">
          <div className="bg-white rounded-4xl p-8 w-full max-w-sm shadow-2xl relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 flex flex-col">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-[20px] flex items-center justify-center mx-auto mb-5 border border-rose-100">
              <LucideIcons.AlertTriangle size={32} strokeWidth={2} />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 text-center uppercase tracking-tight mb-2">Estornar Venda?</h3>
            <p className="text-[12px] text-slate-500 font-medium text-center mb-6 leading-relaxed px-2">
              O valor de <span className="font-semibold text-rose-500">{formatarMoeda(vendaSelecionada.total)}</span> será subtraído e os itens retornarão ao estoque.
            </p>

            <label className="text-[10px] font-semibold text-slate-500 uppercase ml-1 tracking-widest mb-2 block">Motivo (Obrigatório)</label>
            <input 
              autoFocus 
              type="text" 
              placeholder="Ex: Lançamento duplicado..." 
              value={motivoCancelamento} 
              onChange={(e) => setMotivoCancelamento(e.target.value)} 
              className="w-full bg-slate-50 p-4 h-14 rounded-[20px] outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100 font-medium text-[13px] border border-slate-200 transition-all mb-6" 
            />

            <div className="flex gap-3">
              <button onClick={() => setModalCancelarAberto(false)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-semibold py-4 rounded-[20px] text-[11px] uppercase tracking-widest transition-colors active:scale-95">
                Voltar
              </button>
              <button onClick={confirmarCancelamento} className="flex-[1.5] bg-rose-600 hover:bg-rose-700 text-white font-semibold py-4 rounded-[20px] text-[11px] uppercase tracking-widest transition-colors active:scale-95 shadow-lg shadow-rose-600/30">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPRESSÃO */}
      <div className="hidden print:block text-black bg-white w-[80mm] font-mono text-xs absolute top-0 left-0 p-4">
        <h1 className="text-center font-bold text-lg mb-1">C O M P R O V A N T E</h1>
        <p className="text-center border-b border-black pb-2 mb-2">
          Mesa {vendaSelecionada?.numeroMesa}<br/>
          {vendaSelecionada ? formatarData(vendaSelecionada.dataFechamento) : ''} {vendaSelecionada ? formatarHora(vendaSelecionada.dataFechamento) : ''}
        </p>
        <div className="flex justify-between font-bold border-b border-black pb-1 mb-2">
          <span>QTD DESC</span>
          <span>VALOR</span>
        </div>
        {vendaSelecionada?.itens.map(item => (
          <div key={item.id} className="flex justify-between mb-1">
            <span className="pr-2">{item.quantidade}x {item.produto.nome}</span>
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