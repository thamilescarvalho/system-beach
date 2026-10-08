// src/pages/Painel.tsx
import { useState, useContext, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import type { VendaFechada } from '../types';
import * as LucideIcons from 'lucide-react';

export function Painel() {
  const contexto = useContext(AppContext);

  // ESTADOS TELA PRINCIPAL
  const dataHoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFechada | null>(null);
  const [mostrarValores, setMostrarValores] = useState(true);
  
  // ESTADOS DA PESQUISA
  const [pesquisa, setPesquisa] = useState('');
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const inputPesquisaRef = useRef<HTMLInputElement>(null);

  // ESTADOS MODAIS
  const [modalRecebimentosAberto, setModalRecebimentosAberto] = useState(false);
  const [modalMetaAberto, setModalMetaAberto] = useState(false);
  const primeiroDiaDoMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [modalDataInicio, setModalDataInicio] = useState(primeiroDiaDoMes);
  const [modalDataFim, setModalDataFim] = useState(dataHoje);

  // META DE VENDAS (Preparado para receber valor do Admin)
  const [metaDeVendas, setMetaDeVendas] = useState(2000);

  // DADOS DO CONTEXTO
  const historico = contexto?.historicoVendas || [];
  const garcomLogado = contexto?.garcomLogado;

  // LÓGICA DE FILTRAGEM (Data, Privacidade e Pesquisa)
  const vendasFiltradas = historico.filter(venda => {
    // Filtro 1: Data
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= dataInicio && dataVenda <= dataFim;
    
    // Filtro 2: Privacidade (Admin vê tudo, garçom só as dele)
    const privacidadeValida = garcomLogado?.cargo === 'admin' ? true : venda.garcomNome === garcomLogado?.nome;
    
    // Filtro 3: Pesquisa (Mesa, Cliente ou Valor)
    const termo = pesquisa.toLowerCase();
    const pesquisaValida = termo === '' || 
      venda.numeroMesa.toString().includes(termo) ||
      (venda.nomeCliente?.toLowerCase() || '').includes(termo) ||
      venda.total.toString().includes(termo);

    return dataValida && privacidadeValida && pesquisaValida;
  });

  const vendasValidas = vendasFiltradas.filter(v => v.status !== 'cancelada');
  const faturamentoTotal = vendasValidas.reduce((total, venda) => total + venda.total, 0);

  const porcentagemMeta = Math.min((faturamentoTotal / metaDeVendas) * 100, 100);
  const metaBatida = faturamentoTotal >= metaDeVendas;

  // DADOS FINANCEIROS MOCKADOS (Futuro AdminFinanceiro)
  const recebimentosMock = [
    { id: 1, status: 'agendado', categoria: 'Pagamento', valor: 400.00, data: '2026-10-15', descricao: 'Acerto Semanal (Semana 3)' },
    { id: 2, status: 'pago', categoria: 'Vale', valor: 150.00, data: '2026-10-10', descricao: 'Adiantamento / Vale Transporte' },
    { id: 3, status: 'pago', categoria: 'Vale', valor: 50.00, data: '2026-10-05', descricao: 'Vale' },
    { id: 4, status: 'pago', categoria: 'Comissão', valor: 320.00, data: '2026-10-02', descricao: 'Acerto Semanal (Semana 1)' },
  ];

  const recebimentosFiltrados = recebimentosMock.filter(r => r.data >= modalDataInicio && r.data <= modalDataFim);
  const recebimentosPagos = recebimentosFiltrados.filter(r => r.status === 'pago');
  const recebimentosAgendados = recebimentosFiltrados.filter(r => r.status === 'agendado');

  const totalModalPago = recebimentosPagos.reduce((acc, r) => acc + r.valor, 0);
  const totalModalAgendado = recebimentosAgendados.reduce((acc, r) => acc + r.valor, 0);

  // FORMATAÇÕES
  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarHora = (isoString: string) => new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatarDataBR = (isoString: string) => {
    const partes = isoString.split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  // EFEITOS
  useEffect(() => {
    if (vendaSelecionada || modalRecebimentosAberto || modalMetaAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [vendaSelecionada, modalRecebimentosAberto, modalMetaAberto]);

  useEffect(() => {
    if (mostrarPesquisa && inputPesquisaRef.current) {
      inputPesquisaRef.current.focus();
    }
  }, [mostrarPesquisa]);

  const handleImprimir = () => {
    window.print();
  };

  const alternarPesquisa = () => {
    setMostrarPesquisa(!mostrarPesquisa);
    if (mostrarPesquisa) setPesquisa(''); // Limpa a pesquisa ao fechar
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-emerald-200 selection:text-emerald-900 pb-20 md:pb-8">
      
      <div className="print:hidden">
        <Header />

        {/* ÁREA DE SALDO */}
        <div className="bg-emerald-950 text-white rounded-b-[60px] md:rounded-b-[40px] pt-18 md:pt-20 md:pl-[72px] relative overflow-hidden shadow-xl shadow-emerald-900/20">
          <div className="absolute -right-20 -top-20 w-64 h-80 bg-emerald-500/30 rounded-full blur-3xl"></div>
          <div className="absolute -left-10 bottom-0 w-40 h-40 bg-emerald-700/30 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-8 md:py-10 flex flex-col items-center">
            
            <div className="flex items-center gap-2 mb-3 opacity-70 hover:opacity-100 transition-opacity">
              <LucideIcons.TrendingUp size={14} />
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-emerald-50">Vendas Consolidadas</h2>
            </div>

            <div className="flex items-center justify-center gap-4 mb-5">
              <span className={`text-4xl md:text-5xl font-semibold tracking-tighter ${!mostrarValores ? 'mt-2' : ''}`}>
                {mostrarValores ? formatarMoeda(faturamentoTotal) : 'R$ •••••'}
              </span>
              <button 
                onClick={() => setMostrarValores(!mostrarValores)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md active:scale-90"
              >
                {mostrarValores ? <LucideIcons.EyeOff size={18} /> : <LucideIcons.Eye size={18} />}
              </button>
            </div>

            {/* Pílula de Data */}
            <div className="inline-flex items-center justify-center bg-black/20 border border-white/10 backdrop-blur-md rounded-full px-4 py-2 shadow-inner">
              <LucideIcons.CalendarDays size={14} className="text-emerald-400 mr-2 shrink-0" />
              <div className="flex items-center justify-center">
                <input 
                  type="date" 
                  value={dataInicio} 
                  onChange={(e) => setDataInicio(e.target.value)} 
                  className="bg-transparent text-white text-[12px] md:text-[13px] font-medium outline-none cursor-pointer w-[105px] md:w-[115px] text-center uppercase" 
                />
                <span className="text-emerald-500/80 font-bold text-[9px] uppercase mx-2 tracking-widest">Até</span>
                <input 
                  type="date" 
                  value={dataFim} 
                  onChange={(e) => setDataFim(e.target.value)} 
                  className="bg-transparent text-white text-[12px] md:text-[13px] font-medium outline-none cursor-pointer w-[105px] md:w-[115px] text-center uppercase" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* (BOTÕES E EXTRATO)*/}
        <div className="w-full max-w-4xl mx-auto px-4 md:px-8 md:pl-[104px] -mt-6 md:-mt-8 relative z-20 flex flex-col items-center">
          
          {/* 2 BOTÕES */}
          <div className="flex items-center justify-center gap-5 w-full max-w-[300px]">
            
            <button 
              onClick={() => setModalRecebimentosAberto(true)}
              className="flex-1 bg-white rounded-4xl md:rounded-4xl p-3 shadow-lg shadow-slate-200/90 border border-slate-100 flex flex-col items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-xl hover:border-emerald-200 transition-all active:scale-95 group"
            >
              <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <LucideIcons.Wallet size={18} strokeWidth={2} />
              </div>
              <span className="text-[10px] md:text-[11px] font-semibold text-slate-700 uppercase tracking-widest">Carteira</span>
            </button>

            <button 
              onClick={() => setModalMetaAberto(true)}
              className="flex-1 bg-white rounded-4xl md:rounded-4xl p-3 shadow-lg shadow-slate-200/90 border border-slate-100 flex flex-col items-center justify-center gap-2 hover:-translate-y-1 hover:shadow-xl hover:border-blue-200 transition-all active:scale-95 group"
            >
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <LucideIcons.Target size={18} strokeWidth={2} />
              </div>
              <span className="text-[10px] md:text-[11px] font-semibold text-slate-700 uppercase tracking-widest">Metas</span>
            </button>

          </div>

          {/* EXTRATO DE VENDAS */}
          <section className="mt-8 w-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-[12px] font-sans uppercase tracking-widest text-slate-500">Extrato de Vendas</h3>
              
              {/* Barra de Pesquisa */}
              <div className="flex items-center justify-end relative h-8">
                <div className={`flex items-center transition-all duration-300 ease-out origin-right overflow-hidden ${mostrarPesquisa ? 'w-48 md:w-64 opacity-100 mr-2' : 'w-0 opacity-0'}`}>
                  <input
                    ref={inputPesquisaRef}
                    type="text"
                    placeholder="Mesa, Cliente ou Valor..."
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-full h-8 pl-3 pr-8 text-[12px] outline-none focus:border-emerald-600 shadow-sm transition-colors"
                  />
                  {pesquisa && (
                    <button onClick={() => setPesquisa('')} className="absolute right-4 text-slate-400 hover:text-slate-600">
                      <LucideIcons.X size={14} />
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={alternarPesquisa} 
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${mostrarPesquisa ? 'bg-slate-100 text-slate-800' : 'bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                  title="Pesquisar venda"
                >
                  <LucideIcons.Search size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-4xl border border-slate-300 overflow-hidden shadow-sm">
              {vendasFiltradas.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <LucideIcons.Inbox size={32} strokeWidth={1.5} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-sans text-[12px] uppercase tracking-wide">
                    {pesquisa ? 'Nenhuma venda encontrada para a pesquisa.' : 'Nenhuma movimentação neste período.'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                  {vendasFiltradas.map((venda) => {
                    const isCancelada = venda.status === 'cancelada';
                    return (
                      <button 
                        key={venda.id}
                        onClick={() => setVendaSelecionada(venda)}
                        className="w-full flex justify-between items-center p-4 md:p-5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            isCancelada 
                              ? 'bg-rose-50 text-rose-500' 
                              : 'bg-emerald-50 text-emerald-500'
                          }`}>
                            {isCancelada ? <LucideIcons.ArrowDownRight size={20} /> : <LucideIcons.ArrowUpRight size={20} />}
                          </div>
                          <div>
                            <p className={`font-semibold uppercase tracking-wide text-[13px] md:text-[14px] leading-tight ${isCancelada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {venda.nomeCliente || 'CLIENTE BALCÃO'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] md:text-[11px] font-semibold text-slate-500 mt-1 uppercase">
                              <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm">MESA {venda.numeroMesa}</span>
                              <span className="opacity-50">•</span>
                              <span>{formatarDataBR(venda.dataFechamento)} {formatarHora(venda.dataFechamento)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <p className={`font-semibold text-[15px] md:text-[16px] tabular-nums tracking-tight ${isCancelada ? 'text-slate-300 line-through' : 'text-emerald-600'}`}>
                            {mostrarValores ? formatarMoeda(venda.total) : 'R$ •••••'}
                          </p> 
                          {isCancelada && <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-1">CANCELADA</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL: DETALHES DA META */}
      {modalMetaAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalMetaAberto(false)}></div>
          
          <div className="bg-white rounded-[24px] w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            <div className="p-6 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-900">ACOMPANHAMENTO DE META</h3>
              <button onClick={() => setModalMetaAberto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <LucideIcons.X size={18} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-end mb-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">PROGRESSO ATUAL</p>
                <p className="text-2xl font-bold tracking-tighter text-blue-600">{porcentagemMeta.toFixed(1)}%</p>
              </div>
              
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    metaBatida ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${porcentagemMeta}%` }}
                ></div>
              </div>

              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">META ESTIPULADA</span>
                  <span className="font-bold text-[13px] text-slate-800">{formatarMoeda(metaDeVendas)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-200/60">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">JÁ FATURADO</span>
                  <span className="font-bold text-[13px] text-slate-800">{formatarMoeda(faturamentoTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">FALTA P/ ATINGIR</span>
                  <span className={`font-bold text-[13px] ${metaBatida ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {metaBatida ? 'META BATIDA! 🎉' : formatarMoeda(metaDeVendas - faturamentoTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CARTEIRA DE RECEBIMENTOS */}
      {modalRecebimentosAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans print:hidden">
          <div className="absolute inset-0" onClick={() => setModalRecebimentosAberto(false)}></div>

          <div className="bg-slate-50 rounded-[24px] w-full max-w-md max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-center p-6 bg-white border-b border-slate-100 shrink-0">
              <h3 className="text-[13px] font-bold uppercase tracking-widest text-slate-900">CARTEIRA & REPASSES</h3>
              <button onClick={() => setModalRecebimentosAberto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <LucideIcons.X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-slate-100 shrink-0 shadow-sm z-10">
              <div className="bg-slate-50 rounded-xl border border-slate-200 flex items-center p-2 gap-2">
                <LucideIcons.CalendarDays size={16} className="text-slate-400 ml-2 shrink-0" />
                <div className="flex-1 flex items-center gap-2">
                  <input type="date" value={modalDataInicio} onChange={(e) => setModalDataInicio(e.target.value)} className="bg-transparent w-full text-slate-700 text-[12px] font-semibold outline-none text-center uppercase" />
                  <span className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">ATÉ</span>
                  <input type="date" value={modalDataFim} onChange={(e) => setModalDataFim(e.target.value)} className="bg-transparent w-full text-slate-700 text-[12px] font-semibold outline-none text-center uppercase" />
                </div>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 hide-scrollbar bg-slate-50">
              {recebimentosFiltrados.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-slate-200/50 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <LucideIcons.Wallet size={32} />
                  </div>
                  <p className="text-slate-500 font-semibold text-[13px] uppercase">NENHUM LANÇAMENTO NO PERÍODO.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {recebimentosAgendados.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-3 px-1">AGENDADOS (A RECEBER)</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-50">
                        {recebimentosAgendados.map((recebimento) => (
                          <div key={recebimento.id} className="flex justify-between items-center p-4">
                            <div className="flex flex-col">
                              <span className="font-sans text-emerald-600 text-[13px] uppercase tracking-wide leading-tight">{recebimento.descricao}</span>
                              <span className="text-[10px] font-medium text-slate-500 mt-1 uppercase">{recebimento.categoria} • {formatarDataBR(recebimento.data)}</span>
                            </div>
                            <span className="font-semibold tracking-tight text-emerald-600 text-[14px] tabular-nums">{formatarMoeda(recebimento.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recebimentosPagos.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 px-1">HISTÓRICO PAGO</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-50">
                        {recebimentosPagos.map((recebimento) => (
                          <div key={recebimento.id} className="flex justify-between items-center p-4 opacity-70 grayscale-[30%]">
                            <div className="flex flex-col">
                              <span className="font-medium text-emerald-600 text-[13px] uppercase tracking-wide leading-tight">{recebimento.descricao}</span>
                              <span className="text-[10px] font-sans text-slate-500 mt-1 uppercase">{recebimento.categoria} • {formatarDataBR(recebimento.data)}</span>
                            </div>
                            <span className="font-medium text-emerald-600 text-[14px] tabular-nums">{formatarMoeda(recebimento.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white p-6 shrink-0 border-t border-slate-200 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-10">
              <div className="flex justify-between items-center mb-3 text-[12px] text-slate-500">
                <span className="font-semibold uppercase tracking-wide">TOTAL RECEBIDO</span>
                <span className="font-semibold tabular-nums">{formatarMoeda(totalModalPago)}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 text-slate-900">
                <span className="font-bold text-[13px] uppercase tracking-widest">A RECEBER</span>
                <span className="text-2xl font-bold tabular-nums tracking-tighter text-emerald-600">{formatarMoeda(totalModalAgendado)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COMPROVANTE (CENTRALIZADO COM OPÇÃO DE IMPRIMIR) */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 font-sans print:absolute print:inset-0 print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="absolute inset-0 print:hidden" onClick={() => setVendaSelecionada(null)}></div>

          <div className="bg-white rounded-[24px] w-full max-w-sm max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden print:rounded-none print:shadow-none print:max-w-full print:h-auto print:border-0">
            
            <div className="flex justify-between items-center p-6 bg-slate-900 text-white shrink-0 print:bg-white print:text-black print:border-b print:border-dashed print:border-slate-300 print:p-4">
              <div>
                <h3 className="text-[14px] font-bold uppercase tracking-widest">COMPROVANTE</h3>
                <p className="text-[10px] font-medium text-slate-400 print:text-slate-600 mt-1 uppercase tracking-wider">{formatarDataBR(vendaSelecionada.dataFechamento)} • {formatarHora(vendaSelecionada.dataFechamento)}</p>
              </div>
              
              <div className="flex items-center gap-2 print:hidden">
                <button onClick={handleImprimir} className="w-9 h-9 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors" title="Imprimir Recibo">
                  <LucideIcons.Printer size={18} strokeWidth={2} />
                </button>
                <button onClick={() => setVendaSelecionada(null)} className="w-9 h-9 flex items-center justify-center bg-white/10 rounded-full text-slate-300 hover:bg-white/20 hover:text-white transition-colors">
                  <LucideIcons.X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 hide-scrollbar relative print:p-4 print:overflow-visible">
              
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 p-4 rounded-xl mb-6 border border-rose-100 relative z-10 print:bg-transparent print:border-dashed print:border-black">
                  <h4 className="text-rose-700 print:text-black font-semibold uppercase tracking-widest flex items-center gap-2 mb-2 text-[11px]">
                    <LucideIcons.Ban size={16} strokeWidth={2.5} /> VENDA CANCELADA
                  </h4>
                  <p className="text-rose-600/90 print:text-black text-[10px] font-medium uppercase">RESPONSÁVEL: {vendaSelecionada.canceladoPor}</p>
                  <p className="text-rose-600/90 print:text-black text-[10px] font-medium uppercase mt-1">MOTIVO: {vendaSelecionada.motivoCancelamento}</p>
                </div>
              )}
              
              <div className="bg-slate-50 print:bg-transparent rounded-xl border border-slate-200 print:border-none p-4 mb-6 flex gap-4 relative z-10">
                <div className="flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 print:text-slate-600 mb-1">GUARDA-SOL</p>
                  <p className="font-semibold text-slate-900 text-[14px]">{vendaSelecionada.numeroMesa}</p>
                </div>
                <div className="w-px bg-slate-200 print:hidden"></div>
                <div className="flex-1">
                  <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 print:text-slate-600 mb-1">CLIENTE</p>
                  <p className="font-semibold uppercase text-slate-900 text-[12px] truncate">{vendaSelecionada.nomeCliente || 'NÃO IDENTIFICADO'}</p>
                </div>
              </div>

              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 print:text-slate-600 mb-4 border-b border-dashed border-slate-200 print:border-slate-400 pb-2 relative z-10">CONSUMO</h4>
              <div className="space-y-4 relative z-10">
                {vendaSelecionada.itens.map((item) => (
                  <div key={item.id} className={`flex justify-between items-start ${vendaSelecionada.status === 'cancelada' ? 'opacity-50 line-through' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span className="font-semibold text-slate-600 print:text-black bg-slate-100 print:bg-transparent px-1.5 py-0.5 rounded text-[11px] mt-0.5">{item.quantidade}X</span>
                      <div>
                        <p className="font-medium uppercase text-slate-900 text-[12px] leading-tight">{item.produto.nome}</p>
                        <p className="text-[10px] font-medium text-slate-500 print:text-slate-600 mt-1 uppercase">{formatarMoeda(item.produto.preco)} UN.</p>
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900 tabular-nums text-[13px]">{formatarMoeda(item.produto.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 print:bg-transparent p-6 print:p-4 border-t border-dashed border-slate-300 print:border-black shrink-0 pb-safe z-10">
              <div className="flex justify-between items-center">
                <span className="font-semibold uppercase tracking-widest text-slate-500 print:text-black text-[12px]">TOTAL FINAL</span>
                <span className={`text-2xl font-bold tabular-nums tracking-tighter ${vendaSelecionada.status === 'cancelada' ? 'text-slate-400 print:text-slate-500 line-through' : 'text-slate-900'}`}>
                  {formatarMoeda(vendaSelecionada.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}