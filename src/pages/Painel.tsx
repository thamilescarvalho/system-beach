// src/pages/Painel.tsx
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { VendaFechada } from '../types';
import * as LucideIcons from 'lucide-react';

export function Painel() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);

  // ================= ESTADOS TELA PRINCIPAL =================
  const dataHoje = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(dataHoje);
  const [dataFim, setDataFim] = useState(dataHoje);
  const [vendaSelecionada, setVendaSelecionada] = useState<VendaFechada | null>(null);

  // ================= ESTADOS MODAL DE RECEBIMENTOS =================
  const [modalRecebimentosAberto, setModalRecebimentosAberto] = useState(false);
  const primeiroDiaDoMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [modalDataInicio, setModalDataInicio] = useState(primeiroDiaDoMes);
  const [modalDataFim, setModalDataFim] = useState(dataHoje);

  // ================= DADOS DO CONTEXTO =================
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

  // ================= SIMULAÇÃO DE DADOS FINANCEIROS =================
  const recebimentosMock = [
    { id: 1, status: 'agendado', categoria: 'Pagamento', valor: 400.00, data: '2026-08-25', descricao: 'Acerto Semanal (Semana 3)' },
    { id: 2, status: 'pago', categoria: 'Vale', valor: 150.00, data: '2026-08-15', descricao: 'Adiantamento / Vale Transporte' },
    { id: 3, status: 'pago', categoria: 'Vale', valor: 50.00, data: '2026-08-10', descricao: 'Vale' },
    { id: 4, status: 'pago', categoria: 'Comissão', valor: 320.00, data: '2026-08-05', descricao: 'Acerto Semanal (Semana 1)' },
  ];

  const recebimentosFiltrados = recebimentosMock.filter(r => r.data >= modalDataInicio && r.data <= modalDataFim);
  const recebimentosPagos = recebimentosFiltrados.filter(r => r.status === 'pago');
  const recebimentosAgendados = recebimentosFiltrados.filter(r => r.status === 'agendado');

  const totalModalPago = recebimentosPagos.reduce((acc, r) => acc + r.valor, 0);
  const totalModalAgendado = recebimentosAgendados.reduce((acc, r) => acc + r.valor, 0);

  // [CORREÇÃO APLICADA AQUI]: A linha abaixo foi comentada para não gerar o Erro TS6133 no build do Vercel
  // const totalRecebidoPrincipal = recebimentosMock.filter(r => r.status === 'pago' && r.data >= dataInicio && r.data <= dataFim).reduce((acc, r) => acc + r.valor, 0);

  // ================= FORMATAÇÕES =================
  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarHora = (isoString: string) => new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatarDataBR = (isoString: string) => {
    const partes = isoString.split('T')[0].split('-');
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  };

  useEffect(() => {
    if (vendaSelecionada || modalRecebimentosAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [vendaSelecionada, modalRecebimentosAberto]);

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] font-sans pb-24 selection:bg-gray-300 selection:text-black text-gray-900">

      {/* ================= HEADER MINIMALISTA ================= */}
      <header className="sticky top-0 z-30 bg-[#F8F9FA]/90 backdrop-blur-md px-6 py-5 flex items-center justify-between mb-4 shadow-sm border-b border-gray-100">
        <button 
          onClick={() => navigate('/')} 
          className="w-12 h-12 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-900 hover:bg-gray-100 active:scale-95 transition-all duration-200 shadow-sm"
        >
          <LucideIcons.ChevronLeft size={24} strokeWidth={2} />
        </button>

        <div className="text-center flex flex-col items-center">
          <h1 className="text-xl md:text-2xl font-bold text-black tracking-tight leading-none">
            Meu Caixa
          </h1>
          <p className="text-gray-500 font-medium text-xs md:text-sm mt-1">
            Desempenho Geral
          </p>
        </div>

        <div className="w-12 h-12" /> 
      </header>

      {/* ================= CONTAINER PRINCIPAL ================= */}
      <main className="w-full max-w-3xl mx-auto px-5 md:px-8 space-y-8 animate-in zoom-in-95 duration-500">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="hidden md:block text-2xl font-bold tracking-tight text-gray-900">
            Resumo de Vendas
          </h2>

          <section className="bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200 flex items-center justify-center gap-2 w-full md:w-auto">
            <LucideIcons.CalendarDays size={16} className="text-gray-400" />
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent text-gray-700 text-xs md:text-sm font-bold outline-none cursor-pointer uppercase tracking-wide w-min" />
            <span className="text-gray-300 font-bold text-[10px] md:text-xs uppercase">até</span>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent text-gray-700 text-xs md:text-sm font-bold outline-none cursor-pointer uppercase tracking-wide w-min" />
          </section>
        </div>

        {/* CARD VENDAS CONCLUÍDAS */}
        <section className="w-full rounded-[32px] bg-[#111111] p-6 md:p-10 shadow-xl shadow-black/10 flex flex-col relative overflow-hidden transition-all">
          <div className="absolute top-[-20%] right-[-10%] w-56 h-56 bg-white/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-8 relative z-10">
            <h2 className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest">Total Vendido</h2>
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
              <LucideIcons.TrendingUp size={20} strokeWidth={2} />
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-8 relative z-10">
            <span className="text-3xl md:text-4xl font-bold text-gray-500">R$</span>
            <span className="text-6xl md:text-7xl font-black text-white tracking-tighter tabular-nums">
              {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="pt-6 border-t border-white/10 flex items-center justify-between relative z-10">
            <span className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-widest">Volume de Comandas</span>
            <span className="text-sm font-bold text-white bg-white/10 px-5 py-2 rounded-full">
              {vendasValidas.length} registros
            </span>
          </div>
        </section>

        {/* BOTÃO PARA ABRIR MODAL DE RECEBIMENTOS */}
        <button 
          onClick={() => setModalRecebimentosAberto(true)}
          className="w-full group bg-white border border-gray-200 rounded-[24px] p-5 flex items-center justify-between shadow-sm hover:border-gray-900 hover:shadow-md active:scale-[0.99] transition-all duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-900 group-hover:bg-gray-100 transition-colors">
              <LucideIcons.Wallet size={24} strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-gray-900 text-base md:text-lg tracking-tight">Meus Recebimentos</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">Vales, comissões e pagamentos agendados</p>
            </div>
          </div>
          <LucideIcons.ChevronRight className="text-gray-400 group-hover:text-gray-900 transition-colors" size={24} />
        </button>

        {/* EXTRATO DE COMANDAS DA TELA PRINCIPAL */}
        <section className="space-y-5 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm md:text-base font-bold text-gray-900 tracking-tight">Extrato de Movimentações</h3>
            <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
              {vendasFiltradas.length} Registros
            </span>
          </div>

          {vendasFiltradas.length === 0 ? (
            <div className="bg-white p-12 rounded-[32px] border border-gray-200 border-dashed flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <LucideIcons.Receipt className="text-gray-300" size={28} />
              </div>
              <p className="text-gray-500 font-medium text-base">Nenhuma venda registrada<br/>neste período.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {vendasFiltradas.map((venda) => {
                const isCancelada = venda.status === 'cancelada';
                return (
                  <button 
                    key={venda.id}
                    onClick={() => setVendaSelecionada(venda)}
                    className={`group w-full p-4 md:p-5 rounded-[28px] md:rounded-[32px] border flex justify-between items-center active:scale-[0.99] transition-all duration-200 text-left overflow-hidden
                      ${isCancelada ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 shadow-sm hover:border-gray-900 hover:shadow-md'}
                    `}
                  >
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex flex-col items-center justify-center shrink-0 ${isCancelada ? 'bg-gray-200 text-gray-500' : 'bg-gray-100 text-gray-900'}`}>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">Mesa</span>
                        <span className="text-lg md:text-xl font-black leading-none">{venda.numeroMesa}</span>
                      </div>
                      <div>
                        <p className={`font-bold tracking-tight text-sm md:text-base mb-1 md:mb-1.5 truncate ${isCancelada ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{venda.nomeCliente || 'Cliente sem nome'}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] md:text-xs text-gray-500 font-medium flex items-center gap-1.5"><LucideIcons.Clock size={12} />{formatarHora(venda.dataFechamento)}</span>
                          {isCancelada && <span className="text-[9px] md:text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">Cancelada</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right pl-4">
                      <p className={`font-black tracking-tight text-lg md:text-xl tabular-nums ${isCancelada ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{formatarMoeda(venda.total)}</p> 
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ================= MODAL: EXTRATO DE RECEBIMENTOS ================= */}
      {modalRecebimentosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalRecebimentosAberto(false)}></div>

          <div className="bg-[#F8F9FA] rounded-[32px] w-full max-w-lg h-auto max-h-[90vh] md:max-h-[85vh] shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden">

            {/* Header Modal Recebimentos */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-white shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Meus Recebimentos</h3>
                <p className="text-[11px] font-medium text-gray-500 mt-1 uppercase tracking-widest">Histórico Financeiro</p>
              </div>
              <button onClick={() => setModalRecebimentosAberto(false)} className="w-10 h-10 flex items-center justify-center bg-gray-50 border border-gray-200 rounded-full text-gray-900 active:scale-90 shadow-sm hover:bg-gray-100 transition-colors shrink-0">
                <LucideIcons.X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Filtro Específico do Modal */}
            <div className="bg-white px-5 py-4 border-b border-gray-100 shrink-0">
              <div className="bg-gray-50 px-4 py-2 rounded-full border border-gray-200 flex items-center justify-between md:justify-center gap-2">
                <LucideIcons.Calendar size={14} className="text-gray-400 hidden md:block" />
                <input type="date" value={modalDataInicio} onChange={(e) => setModalDataInicio(e.target.value)} className="bg-transparent text-gray-700 text-xs font-bold outline-none cursor-pointer uppercase tracking-wide w-full max-w-[120px] text-center" />
                <span className="text-gray-400 font-bold text-[10px] uppercase">até</span>
                <input type="date" value={modalDataFim} onChange={(e) => setModalDataFim(e.target.value)} className="bg-transparent text-gray-700 text-xs font-bold outline-none cursor-pointer uppercase tracking-wide w-full max-w-[120px] text-center" />
              </div>
            </div>

            {/* Área de Rolagem dos Dados */}
            <div className="p-5 overflow-y-auto flex-1 hide-scrollbar">

              {recebimentosFiltrados.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <LucideIcons.SearchX className="text-gray-300 mb-3" size={32} />
                  <p className="text-gray-500 font-medium text-sm">Nenhum lançamento no período selecionado.</p>
                </div>
              ) : (
                <>
                  {/* SESSÃO: AGENDADOS (FUTURO) */}
                  {recebimentosAgendados.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-[10px] font-bold text-blue-600/70 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <LucideIcons.CalendarClock size={14} /> Agendados (A Receber)
                      </h4>
                      <div className="space-y-3">
                        {recebimentosAgendados.map(recebimento => (
                          <div key={recebimento.id} className="bg-white border-2 border-blue-100/50 rounded-[20px] p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex gap-4 items-center">
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                                <LucideIcons.Clock size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-bold text-gray-900 text-sm">{recebimento.descricao}</p>
                                  <span className="text-[8px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{recebimento.categoria}</span>
                                </div>
                                <p className="text-[11px] text-gray-500 font-medium">Data: {formatarDataBR(recebimento.data)}</p>
                              </div>
                            </div>
                            <span className="font-black text-blue-600 text-base tabular-nums sm:text-right pl-14 sm:pl-0">
                              {formatarMoeda(recebimento.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SESSÃO: HISTÓRICO (PAGO) */}
                  {recebimentosPagos.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <LucideIcons.CheckCircle2 size={14} /> Histórico Efetivado
                      </h4>
                      <div className="space-y-3">
                        {recebimentosPagos.map(recebimento => (
                          <div key={recebimento.id} className="bg-white border border-gray-200 rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex gap-4 items-center">
                              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                                <LucideIcons.Check size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="font-bold text-gray-700 text-sm">{recebimento.descricao}</p>
                                  <span className="text-[8px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">{recebimento.categoria}</span>
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium">Pago em: {formatarDataBR(recebimento.data)}</p>
                              </div>
                            </div>
                            <span className="font-bold text-gray-900 text-base tabular-nums sm:text-right pl-14 sm:pl-0">
                              {formatarMoeda(recebimento.valor)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Rodapé com Totalizadores */}
            <div className="bg-white p-5 border-t border-gray-200 shrink-0 rounded-b-[32px]">
              <div className="space-y-2 mb-4 border-b border-gray-100 pb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500">Já Recebido:</span>
                  <span className="font-bold text-gray-900 tabular-nums">{formatarMoeda(totalModalPago)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-500">A Receber:</span>
                  <span className="font-bold text-blue-600 tabular-nums">{formatarMoeda(totalModalAgendado)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-black text-gray-900 uppercase tracking-widest text-sm">Total do Período</span>
                <span className="text-2xl font-black text-gray-900 tracking-tighter tabular-nums">
                  {formatarMoeda(totalModalPago + totalModalAgendado)}
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL DETALHAMENTO DA CONTA ================= */}
      {vendaSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setVendaSelecionada(null)}></div>

          <div className="bg-white rounded-[32px] w-full max-w-md max-h-[90vh] shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden">
            {/* Header Recibo */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Recibo Mesa {vendaSelecionada.numeroMesa}</h3>
                <p className="text-[11px] font-medium text-gray-500 mt-1 uppercase tracking-widest tabular-nums">{formatarDataBR(vendaSelecionada.dataFechamento)} às {formatarHora(vendaSelecionada.dataFechamento)}</p>
              </div>
              <button onClick={() => setVendaSelecionada(null)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-full text-gray-900 active:scale-90 shadow-sm hover:bg-gray-100 transition-colors shrink-0">
                <LucideIcons.X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 hide-scrollbar bg-white">
              {vendaSelecionada.status === 'cancelada' && (
                <div className="bg-gray-100 border border-gray-200 p-5 rounded-[24px] mb-6">
                  <h4 className="text-gray-900 font-bold text-[12px] uppercase tracking-wider flex items-center gap-2 mb-3">
                    <LucideIcons.Ban size={16} /> Comanda Cancelada
                  </h4>
                  <div className="text-xs text-gray-600 font-medium space-y-2">
                    <p><strong>Por:</strong> {vendaSelecionada.canceladoPor}</p>
                    <p className="bg-white p-3 rounded-xl border border-gray-200 mt-2"><strong>Motivo:</strong> {vendaSelecionada.motivoCancelamento}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-4 mb-8 bg-gray-50 p-5 rounded-[24px] border border-gray-100">
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cliente</p>
                  <p className={`font-bold text-gray-900 text-sm md:text-base ${vendaSelecionada.status === 'cancelada' ? 'line-through opacity-60' : ''}`}>{vendaSelecionada.nomeCliente || 'Não identificado'}</p>
                </div>
                <div className="w-px bg-gray-200"></div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Atendente</p>
                  <p className="font-bold text-gray-900 text-sm md:text-base">{vendaSelecionada.garcomNome}</p>
                </div>
              </div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                Itens Consumidos <span className="flex-1 h-px bg-gray-100"></span>
              </p>
              <div className={`space-y-4 mb-8 ${vendaSelecionada.status === 'cancelada' ? 'opacity-50' : ''}`}>
                {vendaSelecionada.itens.map(item => (
                  <div key={item.id} className={`flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0 ${vendaSelecionada.status === 'cancelada' ? 'line-through' : ''}`}>
                    <div className="flex gap-3 items-center">
                      <span className="font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg text-xs md:text-sm tabular-nums">{item.quantidade}x</span>
                      <div>
                        <p className="font-bold text-gray-900 text-sm md:text-base leading-tight">{item.produto.nome}</p>
                        <p className="text-[11px] text-gray-500 font-medium tabular-nums">{formatarMoeda(item.produto.preco)} un.</p>
                      </div>
                    </div>
                    <span className="font-bold text-gray-900 text-base md:text-lg tabular-nums">{formatarMoeda(item.produto.preco * item.quantidade)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-8 bg-gray-50 border-t border-gray-200 shrink-0 rounded-b-[32px]">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-500 uppercase tracking-widest text-sm md:text-base">Total Final</span>
                <span className={`text-3xl md:text-4xl font-black tracking-tighter tabular-nums ${vendaSelecionada.status === 'cancelada' ? 'text-gray-400 line-through' : 'text-[#111111]'}`}>
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