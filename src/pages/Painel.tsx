// src/pages/Painel.tsx
import { useState, useContext, useEffect } from 'react';
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

  // ESTADOS MODAIS
  const [modalRecebimentosAberto, setModalRecebimentosAberto] = useState(false);
  const [modalMetaAberto, setModalMetaAberto] = useState(false);
  const primeiroDiaDoMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [modalDataInicio, setModalDataInicio] = useState(primeiroDiaDoMes);
  const [modalDataFim, setModalDataFim] = useState(dataHoje);

  // DADOS DO CONTEXTO
  const historico = contexto?.historicoVendas || [];
  const garcomLogado = contexto?.garcomLogado;

  const vendasFiltradas = historico.filter(venda => {
    const dataVenda = venda.dataFechamento.split('T')[0];
    const dataValida = dataVenda >= dataInicio && dataVenda <= dataFim;
    const privacidadeValida = garcomLogado?.cargo === 'admin' ? true : venda.garcomNome === garcomLogado?.nome;
    return dataValida && privacidadeValida;
  });

  const vendasValidas = vendasFiltradas.filter(v => v.status !== 'cancelada');
  const faturamentoTotal = vendasValidas.reduce((total, venda) => total + venda.total, 0);

  // META DE VENDAS
  const metaDeVendas = 2000; 
  const porcentagemMeta = Math.min((faturamentoTotal / metaDeVendas) * 100, 100);
  const metaBatida = faturamentoTotal >= metaDeVendas;

  // DADOS FINANCEIROS
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

  useEffect(() => {
    if (vendaSelecionada || modalRecebimentosAberto || modalMetaAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [vendaSelecionada, modalRecebimentosAberto, modalMetaAberto]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 selection:bg-emerald-200 selection:text-emerald-900">
      
      <Header />

      {/* Conteúdo Principal */}
      <div className="pt-18 md:pt-24 pb-28 md:pb-8 md:pl-18 flex flex-col items-center w-full">
        {/* Alterado max-w-2xl para max-w-5xl para uso otimizado no Desktop */}
        <main className="w-full max-w-5xl mx-auto px-4 md:px-6">
          
          {/* Cabeçalho Centralizado */}
          <div className="flex flex-col items-center justify-center gap-4 mb-8 mt-4 text-center">
                        
            {/* Data */}
            <div className="inline-flex items-center justify-center bg-white border border-slate-100 rounded-full px-4 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-400 ease-out hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <LucideIcons.CalendarDays size={16} className="text-emerald-500 mr-2 shrink-0" />
              <div className="flex items-center justify-center">
                <input 
                  type="date" 
                  value={dataInicio} 
                  onChange={(e) => setDataInicio(e.target.value)} 
                  className="bg-transparent text-slate-700 text-[13px] md:text-[14px] font-medium outline-none cursor-pointer w-[110px] md:w-[125px] text-center leading-none" 
                />
                <span className="text-slate-300 font-bold text-[10px] uppercase mx-1 tracking-widest leading-none mt-px">até</span>
                <input 
                  type="date" 
                  value={dataFim} 
                  onChange={(e) => setDataFim(e.target.value)} 
                  className="bg-transparent text-slate-700 text-[13px] md:text-[14px] font-medium outline-none cursor-pointer w-[110px] md:w-[125px] text-center leading-none" 
                />
              </div>
            </div>
          </div>

          {/* GRID RESPONSIVO: 1 coluna no mobile, 2 colunas no desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
            
            {/* COLUNA ESQUERDA: Vendas Concluídas */}
            <div className="bg-linear-to-br from-emerald-500 to-emerald-800 rounded-3xl p-6 md:p-8 shadow-lg shadow-emerald-500/20 transition-all duration-500 ease-out transform hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-emerald-500/40 relative overflow-hidden group flex flex-col justify-between h-full min-h-[200px]">
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-white/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 ease-out"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="mb-auto">
                  <h2 className="text-[12px] font-medium uppercase text-emerald-50">Vendas Concluídas</h2>
                  <div className="flex items-baseline gap-1 mt-4 mb-2">
                    <span className="text-4xl md:text-5xl font-semibold text-white tracking-tighter tabular-nums drop-shadow-sm">
                      {formatarMoeda(faturamentoTotal)}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-emerald-400/30 flex items-center justify-between mt-6">
                  <span className="text-[13px] font-medium text-emerald-100">Comandas fechadas</span>
                  <span className="text-[13px] font-medium text-white bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                    {vendasValidas.length} concluídas
                  </span>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: Meta e Carteira (Empilhados) */}
            <div className="flex flex-col gap-4 md:gap-6 h-full justify-between">
              
              {/* Meta */}
              <button 
                onClick={() => setModalMetaAberto(true)}
                className="w-full flex-1 bg-white rounded-3xl border border-slate-200 p-5 md:p-6 flex flex-col justify-center shadow-sm hover:shadow-md transition-all duration-300 text-left group"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-slate-700">
                    <LucideIcons.Target size={18} className="text-blue-500" />
                    <span className="text-[13px] uppercase font-medium">Meta Diária</span>
                  </div>
                  <LucideIcons.ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
                
                {/* Barra */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                      metaBatida ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${porcentagemMeta}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[12px] font-medium text-slate-500">
                    {porcentagemMeta.toFixed(1)}% concluído
                  </span>
                  <span className="text-[12px] font-medium text-slate-500">
                    Alvo: {formatarMoeda(metaDeVendas)}
                  </span>
                </div>
              </button>

              {/* CARD: Minha Carteira */}
              <button 
                onClick={() => setModalRecebimentosAberto(true)}
                className="w-full flex-1 bg-emerald-950 rounded-3xl border border-emerald-900/50 p-5 md:p-6 flex items-center justify-between shadow-md transition-all duration-400 ease-out transform hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/20 group relative overflow-hidden"
              >
                <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 ease-out"></div>

                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-full bg-emerald-900/80 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-800/50">
                    <LucideIcons.Wallet size={20} strokeWidth={2} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[13px] font-semibold uppercase text-white leading-tight">Minha Carteira</h3>
                    <p className="text-[12px] text-emerald-400/80 font-medium mt-1">Vales e repasses</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="text-right">
                    <span className="font-semibold text-white text-[16px] md:text-[18px] tabular-nums">
                      {formatarMoeda(totalModalAgendado)}
                    </span>
                  </div>
                  <LucideIcons.ChevronRight size={20} className="text-emerald-700 group-hover:text-emerald-400 transition-colors" />
                </div>
              </button>
            </div>
          </div>

          {/* EXTRATO (Ocupa toda a largura do max-w-5xl) */}
          <section>
            <h3 className="text-[12px] font-medium uppercase text-slate-500 mb-3 px-1">Histórico de Vendas</h3>
            
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              {vendasFiltradas.length === 0 ? (
                <div className="p-8 md:p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                    <LucideIcons.Receipt size={24} strokeWidth={1.5} className="text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium text-[13px]">Nenhuma venda concluída no período.</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100">
                  {vendasFiltradas.map((venda) => {
                    const isCancelada = venda.status === 'cancelada';
                    return (
                      <button 
                        key={venda.id}
                        onClick={() => setVendaSelecionada(venda)}
                        className="w-full flex justify-between items-center p-4 md:p-5 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shrink-0 font-medium text-[13px] md:text-[14px] ${
                            isCancelada 
                              ? 'bg-slate-100 text-slate-400' 
                              : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            M{venda.numeroMesa}
                          </div>
                          <div>
                            <p className={`font-medium text-[14px] md:text-[15px] leading-tight ${isCancelada ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {venda.nomeCliente || 'Cliente Balcão'}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] md:text-[12px] font-medium text-slate-500 mt-0.5">
                              <span>{formatarDataBR(venda.dataFechamento)} às {formatarHora(venda.dataFechamento)}</span>
                              {isCancelada && <span className="text-rose-500 font-medium bg-rose-50 px-1.5 rounded">Cancelada</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-[15px] md:text-[16px] tabular-nums ${isCancelada ? 'text-slate-300 line-through' : 'text-slate-900'}`}>
                            {formatarMoeda(venda.total)}
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

      {/* DETALHES DA META */}
      {modalMetaAberto && (
        <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalMetaAberto(false)}></div>
          
          <div className="bg-white rounded-t-[24px] md:rounded-[24px] w-full max-w-sm shadow-xl relative animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-300 flex flex-col overflow-hidden">
            <div className="p-5 flex justify-between items-center border-b border-slate-100">
              <h3 className="text-base font-semibold uppercase text-slate-900">Detalhes da Meta</h3>
              <button onClick={() => setModalMetaAberto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <LucideIcons.X size={18} strokeWidth={2} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-end mb-2">
                <p className="text-[13px] font-medium text-slate-500">Progresso atual</p>
                <p className="text-lg font-semibold text-slate-900">{porcentagemMeta.toFixed(1)}%</p>
              </div>
              
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-6 shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${
                    metaBatida ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${porcentagemMeta}%` }}
                ></div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <span className="text-[13px] font-medium text-slate-500">Meta estipulada</span>
                  <span className="font-semibold text-slate-800">{formatarMoeda(metaDeVendas)}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                  <span className="text-[13px] font-medium text-slate-500">Já faturado</span>
                  <span className="font-semibold text-slate-800">{formatarMoeda(faturamentoTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[13px] font-medium text-slate-500">Falta para atingir</span>
                  <span className={`font-semibold ${metaBatida ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {metaBatida ? 'Meta batida! 🎉' : formatarMoeda(metaDeVendas - faturamentoTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXTRATO DE RECEBIMENTOS */}
      {modalRecebimentosAberto && (
        <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalRecebimentosAberto(false)}></div>

          <div className="bg-slate-50 rounded-t-[24px] md:rounded-[24px] w-full max-w-lg h-[85vh] md:h-auto md:max-h-[85vh] shadow-xl relative animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-300 flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-center p-5 bg-white border-b border-slate-100 shrink-0">
              <h3 className="text-base font-semibold text-slate-900">Repasses e Vales</h3>
              <button onClick={() => setModalRecebimentosAberto(false)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-full text-slate-500 hover:bg-slate-100 transition-colors">
                <LucideIcons.X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="p-4 bg-white border-b border-slate-100 shrink-0">
              <div className="bg-slate-50 rounded-xl border border-slate-200 flex items-center p-1.5 gap-2">
                <LucideIcons.CalendarDays size={16} className="text-slate-400 ml-2 shrink-0" />
                <div className="flex-1 flex items-center gap-2">
                  <input type="date" value={modalDataInicio} onChange={(e) => setModalDataInicio(e.target.value)} className="bg-transparent w-full text-slate-700 text-[13px] font-medium outline-none text-center" />
                  <span className="text-slate-400 font-medium text-[10px] uppercase">até</span>
                  <input type="date" value={modalDataFim} onChange={(e) => setModalDataFim(e.target.value)} className="bg-transparent w-full text-slate-700 text-[13px] font-medium outline-none text-center" />
                </div>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 hide-scrollbar">
              {recebimentosFiltrados.length === 0 ? (
                <div className="py-8 text-center text-slate-500 font-medium text-[13px]">Nenhum lançamento no período.</div>
              ) : (
                <div className="space-y-6">
                  {recebimentosAgendados.length > 0 && (
                    <div>
                      <h4 className="text-[12px] font-semibold text-emerald-600 mb-2 px-1">Agendados (A Receber)</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-50">
                        {recebimentosAgendados.map((recebimento) => (
                          <div key={recebimento.id} className="flex justify-between items-center p-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 text-[14px]">{recebimento.descricao}</span>
                              <span className="text-[11px] font-medium text-slate-500 mt-0.5">{recebimento.categoria} • {formatarDataBR(recebimento.data)}</span>
                            </div>
                            <span className="font-semibold text-emerald-600 text-[14px]">{formatarMoeda(recebimento.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recebimentosPagos.length > 0 && (
                    <div>
                      <h4 className="text-[12px] font-semibold text-slate-500 mb-2 px-1">Histórico Pago</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm divide-y divide-slate-50">
                        {recebimentosPagos.map((recebimento) => (
                          <div key={recebimento.id} className="flex justify-between items-center p-4 opacity-80">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800 text-[14px]">{recebimento.descricao}</span>
                              <span className="text-[11px] font-medium text-slate-500 mt-0.5">{recebimento.categoria} • {formatarDataBR(recebimento.data)}</span>
                            </div>
                            <span className="font-semibold text-slate-800 text-[14px]">{formatarMoeda(recebimento.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white p-5 shrink-0 border-t border-slate-200 pb-safe">
              <div className="flex justify-between items-center mb-2 text-[13px] text-slate-500">
                <span className="font-medium">Total Recebido</span>
                <span className="font-medium">{formatarMoeda(totalModalPago)}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-slate-900">
                <span className="font-semibold text-[13px]">Valor a receber</span>
                <span className="text-xl font-bold tabular-nums">{formatarMoeda(totalModalAgendado)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETALHES DA COMANDA */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-60 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setVendaSelecionada(null)}></div>

          <div className="bg-white rounded-t-[24px] md:rounded-[24px] w-full max-w-md h-[85vh] md:h-auto md:max-h-[85vh] shadow-xl relative animate-in slide-in-from-bottom-full md:slide-in-from-bottom-8 duration-300 flex flex-col overflow-hidden">
            
            <div className="flex justify-between items-center p-5 bg-slate-50 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Comanda {vendaSelecionada.numeroMesa}</h3>
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">{formatarDataBR(vendaSelecionada.dataFechamento)} às {formatarHora(vendaSelecionada.dataFechamento)}</p>
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 hover:bg-slate-100 transition-colors shadow-sm">
                <LucideIcons.X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 hide-scrollbar">
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-rose-50 p-4 rounded-xl mb-5 border border-rose-100">
                  <h4 className="text-rose-700 font-semibold flex items-center gap-2 mb-1.5 text-[13px]">
                    <LucideIcons.Ban size={14} /> Cancelada por {vendaSelecionada.canceladoPor}
                  </h4>
                  <p className="text-rose-600/90 text-[12px] font-medium">Motivo: {vendaSelecionada.motivoCancelamento}</p>
                </div>
              )}
              
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6 flex gap-4">
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-slate-500 mb-0.5">Cliente</p>
                  <p className="font-semibold text-slate-900 text-[13px]">{vendaSelecionada.nomeCliente || 'Não identificado'}</p>
                </div>
                <div className="w-px bg-slate-200"></div>
                <div className="flex-1">
                  <p className="text-[11px] font-medium text-slate-500 mb-0.5">Atendente</p>
                  <p className="font-semibold text-slate-900 text-[13px]">{vendaSelecionada.garcomNome}</p>
                </div>
              </div>

              <h4 className="text-[12px] font-semibold text-slate-500 mb-3 border-b border-slate-100 pb-2">Itens Consumidos</h4>
              <div className="space-y-4">
                {vendaSelecionada.itens.map((item) => (
                  <div key={item.id} className={`flex justify-between items-start ${vendaSelecionada.status === 'cancelada' ? 'opacity-40 line-through' : ''}`}>
                    <div className="flex items-start gap-3">
                      <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] mt-0.5">{item.quantidade}x</span>
                      <div>
                        <p className="font-medium text-slate-900 text-[14px] leading-tight">{item.produto.nome}</p>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">{formatarMoeda(item.produto.preco)} un.</p>
                      </div>
                    </div>
                    <span className="font-semibold text-slate-900 tabular-nums text-[14px]">{formatarMoeda(item.produto.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-5 border-t border-slate-200 shrink-0 pb-safe">
              <div className="flex justify-between items-center">
                <span className="font-medium text-slate-500 text-[13px]">Total da Comanda</span>
                <span className={`text-xl font-bold tabular-nums ${vendaSelecionada.status === 'cancelada' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
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