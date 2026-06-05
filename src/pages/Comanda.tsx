// src/pages/Comanda.tsx
import { useState, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Produto, ItemComanda, Pagamento, MetodoPagamento } from '../types';

export function Comanda() {
  const { idMesa } = useParams();
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  
  const mesaAtual = contexto?.mesas.find(m => m.numero === Number(idMesa));
  const [itensPedidos, setItensPedidos] = useState<ItemComanda[]>(mesaAtual?.itens || []);
  const [nomeCliente, setNomeCliente] = useState(mesaAtual?.nomeCliente || '');
  
  const cardapioAtivo = useMemo(() => (contexto?.produtos || []).filter(p => p.ativo !== false && p.id !== 999), [contexto?.produtos]);
  const categoriasDisponiveis = useMemo(() => Array.from(new Set(cardapioAtivo.map(p => p.categoria))), [cardapioAtivo]);

  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [mostrarItens, setMostrarItens] = useState(false);
  const [statusSalvo, setStatusSalvo] = useState(false);
  
  // ESTADOS DO MODAL DE PAGAMENTO
  const [etapaModal, setEtapaModal] = useState<0 | 1 | 2 | 3>(0);
  const [itemEditandoObs, setItemEditandoObs] = useState<ItemComanda | null>(null);
  const [textoObs, setTextoObs] = useState('');
  
  // ESTADOS DO CARRINHO DE PAGAMENTOS
  const [decisaoDezPorCento, setDecisaoDezPorCento] = useState(false);
  const [pagamentosLancados, setPagamentosLancados] = useState<Pagamento[]>([]);
  const [valorDigitado, setValorDigitado] = useState('');

  const getEmojiParaCategoria = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes('cerveja')) return '🍺';
    if (n.includes('drink') || n.includes('destilado')) return '🍹';
    if (n.includes('bebida') || n.includes('refrigerante') || n.includes('agua') || n.includes('água') || n.includes('suco')) return '🥤';
    if (n.includes('petisco') || n.includes('porção') || n.includes('frita')) return '🍟';
    if (n.includes('prato') || n.includes('refeição')) return '🍲';
    if (n.includes('sobremesa') || n.includes('doce')) return '🍨';
    if (n.includes('combo')) return '🍔';
    return '🍽️';
  };

  const manipularProduto = (produto: Produto, acao: 'mais' | 'menos') => {
    setItensPedidos(prev => {
      const existe = prev.find(item => item.produto.id === produto.id);
      if (acao === 'mais') {
        if (produto.estoque !== undefined) {
          const qtdAtualNaMesa = existe ? existe.quantidade : 0;
          if (qtdAtualNaMesa >= produto.estoque) {
            alert(`Sem estoque! Só restam ${produto.estoque} unidades de ${produto.nome}.`);
            return prev;
          }
        }
        if (existe) return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item);
        return [...prev, { id: Math.random().toString(), produto, quantidade: 1 }];
      } else {
        if (existe && existe.quantidade > 1) return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade - 1 } : item);
        return prev.filter(item => item.produto.id !== produto.id);
      }
    });
  };

  const salvarObservacao = () => {
    if (itemEditandoObs) {
      setItensPedidos(prev => prev.map(item => item.id === itemEditandoObs.id ? { ...item, observacao: textoObs.trim() === '' ? undefined : textoObs } : item));
      setItemEditandoObs(null); setTextoObs('');
    }
  };
  
  const marcarComoEntregue = (idItem: string) => {
    contexto?.atualizarStatusCozinha(Number(idMesa), idItem, 'entregue');
    setItensPedidos(prev => prev.map(item => 
      item.id === idItem ? { ...item, statusCozinha: 'entregue' } : item
    ));
  };

  // CÁLCULOS FECHAMENTO
  const valorTotalMenu = itensPedidos.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
  const quantidadeTotalItens = itensPedidos.reduce((total, item) => total + item.quantidade, 0);
  const valorServico = valorTotalMenu * 0.10;
  const totalCobrarFinal = decisaoDezPorCento ? (valorTotalMenu + valorServico) : valorTotalMenu;
  const totalJaPago = pagamentosLancados.reduce((acc, pag) => acc + pag.valor, 0);
  const faltaPagar = totalCobrarFinal - totalJaPago;
  const troco = totalJaPago > totalCobrarFinal ? totalJaPago - totalCobrarFinal : 0;

  const handleConfirmarPedido = () => {
    if (contexto && idMesa) {
      contexto.salvarComanda(Number(idMesa), itensPedidos, nomeCliente);
      setStatusSalvo(true);
      setTimeout(() => setStatusSalvo(false), 2000);
    }
  };

  const avancaParaPagamento = (incluir10: boolean) => {
    setDecisaoDezPorCento(incluir10);
    setPagamentosLancados([]); 
    setValorDigitado('');
    setEtapaModal(3);
  };

  const handleAdicionarPagamento = (metodo: MetodoPagamento) => {
    const valorAAdicionar = parseFloat(valorDigitado.replace(',', '.'));
    
    if (!valorAAdicionar || isNaN(valorAAdicionar) || valorAAdicionar <= 0) {
      if (faltaPagar > 0) {
        setPagamentosLancados(prev => [...prev, { metodo, valor: faltaPagar }]);
        setValorDigitado('');
      }
      return;
    }
    setPagamentosLancados(prev => [...prev, { metodo, valor: valorAAdicionar }]);
    setValorDigitado('');
  };

  const handleRemoverPagamento = (index: number) => {
    setPagamentosLancados(prev => prev.filter((_, i) => i !== index));
  };

  const concluirMesaFinal = () => {
    if (faltaPagar > 0.01) { 
      alert('Ainda faltam valores a receber!');
      return;
    }
    contexto?.finalizarMesa(Number(idMesa), decisaoDezPorCento, pagamentosLancados);
    navigate('/');
  };

  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-52 relative overflow-hidden">
      
      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-emerald-400/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER SUPERIOR */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between mb-2">
        <button onClick={() => navigate('/mesas')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-600 active:scale-90 transition-all hover:bg-slate-50">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm leading-none">
            MESA {idMesa}
          </h1>
          <p className="text-emerald-500 font-black uppercase tracking-[0.2em] text-[9px] mt-1">Atendimento</p>
        </div>
        <div className="w-10" />
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 relative z-10">
        
        {/* INPUT DE CLIENTE */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <input 
            type="text" 
            placeholder="Nome do Cliente (Opcional)" 
            value={nomeCliente} 
            onChange={(e) => setNomeCliente(e.target.value)} 
            className="w-full pl-14 pr-5 py-4 bg-white/80 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 font-bold text-slate-800 transition-all" 
          />
        </div>

        {/* CARRINHO (Total da Mesa) */}
        <section className="space-y-3">
          <button 
            onClick={() => setMostrarItens(!mostrarItens)} 
            className="w-full relative overflow-hidden rounded-[36px] bg-linear-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-[0_8px_0_#0f172a,0_15px_20px_rgba(0,0,0,0.3)] active:shadow-[0_0px_0_#0f172a,0_0px_0_rgba(0,0,0,0)] active:translate-y-2 transition-all p-6 text-left group"
          >
            <div className="absolute inset-0 bg-white/5 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <h2 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1 drop-shadow-sm">Total da Mesa</h2>
                <p className="text-4xl font-black tracking-tighter text-white drop-shadow-md">{formatarMoeda(valorTotalMenu)}</p>
              </div>
              <div className={`w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center transition-transform duration-300 text-white ${mostrarItens ? 'rotate-180' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider relative z-10">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              {quantidadeTotalItens} {quantidadeTotalItens === 1 ? 'Item Adicionado' : 'Itens Adicionados'}
            </div>
          </button>

          {/* LISTA DE ITENS DO CARRINHO */}
          {mostrarItens && (
            <div className="bg-white/80 backdrop-blur-md rounded-4xl border border-slate-200 p-3 shadow-inner animate-in slide-in-from-top-4 duration-300">
              {itensPedidos.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm font-bold">Nenhum item na mesa ainda.</p>
              ) : (
                <div className="space-y-3">
                  {itensPedidos.map(item => (
                    <div key={item.id} className="flex flex-col p-4 bg-slate-50 rounded-[20px] border border-slate-100 shadow-sm relative overflow-hidden">
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1 flex flex-col items-start pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-800 text-base leading-tight">{item.produto.nome}</span>
                            <button onClick={() => { setItemEditandoObs(item); setTextoObs(item.observacao || ''); }} className="w-7 h-7 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-colors active:scale-90">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            </button>
                          </div>
                          {item.observacao && <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-1.5 bg-indigo-100/50 px-2.5 py-1 rounded-md">OBS: {item.observacao}</span>}
                          <span className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest">{formatarMoeda(item.produto.preco)}</span>
                        </div>

                        {/* QUANTIDADE NO CARRINHO */}
                        <div className="flex items-center gap-3 bg-white p-1.5 rounded-[18px] border border-slate-200 shadow-sm">
                          <button onClick={() => manipularProduto(item.produto, 'menos')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-rose-500 font-black text-xl shadow-[0_3px_0_#e2e8f0] active:shadow-none active:translate-y-0.75 transition-all">
                            -
                          </button>
                          <span className="font-black text-slate-800 text-base w-5 text-center">{item.quantidade}</span>
                          <button onClick={() => manipularProduto(item.produto, 'mais')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 font-black text-xl shadow-[0_3px_0_#a7f3d0] active:shadow-none active:translate-y-0.75 transition-all">
                            +
                          </button>
                        </div>
                      </div>

                      {/* 🔔 ALERTA: Botão de Entregar (Aparece se a cozinha marcou como 'pronto') */}
                      {item.statusCozinha === 'pronto' && (
                        <button 
                          onClick={() => marcarComoEntregue(item.id)}
                          className="mt-4 w-full bg-linear-to-b from-emerald-400 to-emerald-500 border border-emerald-300 shadow-[0_5px_0_#047857] active:shadow-[0_0px_0_#047857] active:translate-y-1.25 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          <span className="animate-bounce text-base">🔔</span> Entregar na Mesa
                        </button>
                      )}

                      {/* Selo de Entregue */}
                      {item.statusCozinha === 'entregue' && (
                        <div className="mt-3 bg-emerald-50 border border-emerald-200 py-1.5 rounded-lg text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Item Entregue
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* NAVEGAÇÃO DO CARDÁPIO */}
        {!categoriaAtiva ? (
          <section className="space-y-4 pt-4 animate-in fade-in">
            <h3 className="flex items-center justify-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              <div className="w-13 h-px bg-slate-400"></div> Cardápio <div className="w-13 h-px bg-slate-400"></div>
            </h3>
            
            {categoriasDisponiveis.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-dashed border-slate-200 text-center">
                <p className="text-slate-400 font-bold text-sm">O cardápio está vazio.</p>
              </div>
            ) : (
              // CATEGORIAS: BOTÕES
              <div className="grid grid-cols-3 gap-4">
                {categoriasDisponiveis.map((cat) => (
                  <button 
                    key={cat} 
                    onClick={() => setCategoriaAtiva(cat)} 
                    className="flex flex-col items-center justify-center p-4 rounded-[28px] bg-linear-to-b from-white to-slate-50 border border-slate-200 shadow-[0_6px_0_#e2e8f0,0_10px_15px_rgba(0,0,0,0.05)] active:shadow-[0_0px_0_#e2e8f0,0_0px_0_rgba(0,0,0,0)] active:translate-y-1.5 transition-all group"
                  >
                    <div className="w-12 h-12 bg-white rounded-full shadow-inner border border-slate-100 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform">
                      {getEmojiParaCategoria(cat)}
                    </div>
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter text-center leading-tight">
                      {cat}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* PRODUTOS DENTRO DA CATEGORIA */
          <section className="space-y-4 animate-in slide-in-from-right-4 duration-300 pt-2">
            
            {/* Cabecalho da Categoria */}
            <div className="flex items-center justify-between px-2 mb-6">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span className="bg-white w-10 h-10 rounded-full shadow-sm flex items-center justify-center border border-slate-100">{getEmojiParaCategoria(categoriaAtiva)}</span> 
                {categoriaAtiva}
              </h3>
              <button onClick={() => setCategoriaAtiva(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-full active:bg-slate-100 hover:text-slate-600 transition-colors shadow-sm">
                Voltar
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {cardapioAtivo.filter(p => p.categoria === categoriaAtiva).map((produto) => {
                const estaEsgotado = produto.estoque !== undefined && produto.estoque === 0;
                
                return (
                  <button 
                    key={produto.id} 
                    onClick={() => !estaEsgotado && manipularProduto(produto, 'mais')} 
                    disabled={estaEsgotado} 
                    className={`w-full p-4 rounded-[28px] border flex justify-between items-center transition-all text-left
                      ${estaEsgotado 
                        ? 'bg-slate-100 border-slate-200 opacity-60 grayscale cursor-not-allowed' 
                        : 'bg-white border-slate-200 shadow-[0_6px_0_#e2e8f0] active:shadow-[0_0px_0_#e2e8f0] active:translate-y-1.5 hover:border-emerald-300'
                      }`}
                  >
                    <div className="flex-1 pr-4">
                      <p className={`font-black text-base tracking-tight mb-1 ${estaEsgotado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                        {produto.nome}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600 font-black text-sm bg-emerald-50 px-2 py-0.5 rounded-md">
                          {formatarMoeda(produto.preco)}
                        </span>
                        {estaEsgotado && <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-1 rounded-md font-black uppercase tracking-widest">Esgotado</span>}
                      </div>
                    </div>
                    
                    {/* Botão de Adicionar ao Cardápio */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border
                      ${estaEsgotado ? 'bg-slate-200 text-slate-400 border-slate-300' : 'bg-emerald-500 text-white border-emerald-400 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]'}
                    `}>
                      {estaEsgotado ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {(itensPedidos.length > 0 || nomeCliente !== '') && (
          <div className="pt-10 pb-6 flex justify-center">
            <button 
              onClick={() => setEtapaModal(1)} 
              className="text-rose-500 font-black text-[11px] py-4 px-8 rounded-full hover:bg-rose-50 border-2 border-rose-200 transition-colors uppercase tracking-[0.2em] w-full text-center"
            >
              Encerrar Atendimento
            </button>
          </div>
        )}
      </main>

      {/* BOTÃO SALVAR */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-20 bg-linear-to-t from-slate-50 via-slate-50/95 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto pb-2">
          <button 
            onClick={handleConfirmarPedido} 
            className={`w-full text-white font-black py-5 rounded-[28px] border transition-all flex justify-between items-center px-8 shadow-[0_8px_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-2
              ${statusSalvo ? 'bg-slate-800 border-slate-700' : 'bg-linear-to-b from-emerald-500 to-emerald-600 border-emerald-400'}
            `}
          >
            <span className="text-lg uppercase tracking-widest">{statusSalvo ? 'Salvo!' : 'Confirmar Pedido'}</span>
            {!statusSalvo && (
              <>
                <div className="h-8 w-0.5 bg-white/20 mx-2 rounded-full" />
                <span className="text-2xl drop-shadow-md">{formatarMoeda(valorTotalMenu)}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MODAL OBSERVAÇÃO */}
      {itemEditandoObs && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl flex flex-col relative z-50 animate-in slide-in-from-bottom-10 sm:zoom-in-95">
            <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">Observação para a Cozinha</h3>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-6 bg-emerald-50 inline-block px-3 py-1 rounded-full">{itemEditandoObs.produto.nome}</p>
            
            <textarea 
              autoFocus 
              value={textoObs} 
              onChange={(e) => setTextoObs(e.target.value)} 
              placeholder="Ex: Sem cebola, gelo e limão à parte..." 
              className="w-full bg-slate-50 p-5 rounded-3xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 resize-none h-32 text-slate-700 font-bold text-sm mb-6" 
            />
            <div className="flex gap-4">
              <button onClick={() => setItemEditandoObs(null)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-black py-4 rounded-2xl text-sm transition-colors">Cancelar</button>
              <button onClick={salvarObservacao} className="flex-[1.5] bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 text-sm active:scale-95 transition-transform">Salvar Nota</button>
            </div>
          </div>
        </div>
      )}

      {/* FLUXO DE ENCERRAMENTO (3 ETAPAS) - Estilo Apple Pay/Nubank */}
      {etapaModal > 0 && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95">
            
            {/* ETAPA 1: CONFIRMAR FECHAMENTO */}
            {etapaModal === 1 && (
              <div className="w-full flex flex-col items-center animate-in slide-in-from-left-4">
                <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mb-6 text-rose-500 border border-rose-100 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M2 6h20"/><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/><path d="M10 10v6"/><path d="M14 10v6"/></svg>
                </div>
                <h3 className="text-3xl font-black text-slate-900 text-center mb-2 tracking-tighter">Fechar Conta?</h3>
                <p className="text-center text-slate-500 font-bold mb-8 text-sm">A mesa não poderá mais receber novos itens.</p>
                <div className="flex gap-4 w-full">
                  <button onClick={() => setEtapaModal(0)} className="flex-1 bg-slate-100 text-slate-500 font-black py-4 rounded-[20px] hover:bg-slate-200 transition-colors">Voltar</button>
                  <button onClick={() => setEtapaModal(2)} className="flex-1 bg-linear-to-b from-rose-500 to-rose-600 text-white font-black py-4 rounded-[20px] shadow-[0_6px_0_#be123c] active:shadow-none active:translate-y-1.5 transition-all">
                    Avançar
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2: 10% DE SERVIÇO */}
            {etapaModal === 2 && (
              <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-500 border border-emerald-100 shadow-inner">
                  <span className="text-4xl font-black">%</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 text-center mb-6 tracking-tight">Taxa de Serviço</h3>
                
                <div className="w-full bg-slate-50 p-5 rounded-3xl mb-8 border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-500"><span>Consumo</span><span>{formatarMoeda(valorTotalMenu)}</span></div>
                  <div className="flex justify-between items-center text-sm font-black text-emerald-500 border-b border-slate-200 pb-4"><span>Serviço (10%)</span><span>+ {formatarMoeda(valorServico)}</span></div>
                  <div className="flex justify-between items-center pt-2"><span className="font-black text-slate-900 text-sm uppercase tracking-widest">Total Final</span><span className="text-2xl font-black text-slate-900 tracking-tight">{formatarMoeda(valorTotalMenu + valorServico)}</span></div>
                </div>

                <div className="flex flex-col gap-4 w-full">
                  <button onClick={() => avancaParaPagamento(true)} className="w-full bg-linear-to-b from-slate-800 to-slate-900 text-white font-black py-5 rounded-3xl shadow-[0_6px_0_#0f172a] active:shadow-none active:translate-y-1.5 transition-all text-lg">
                    Sim, com serviço
                  </button>
                  <button onClick={() => avancaParaPagamento(false)} className="w-full bg-white border-2 border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 font-bold py-4 rounded-3xl transition-colors">
                    Não, só o consumo
                  </button>
                  <button onClick={() => setEtapaModal(1)} className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center py-2 hover:text-slate-600">
                    &larr; Voltar
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: O CARRINHO DE PAGAMENTOS */}
            {etapaModal === 3 && (
              <div className="w-full flex flex-col animate-in slide-in-from-right-4">
                <h3 className="text-2xl font-black text-slate-900 text-center mb-6 tracking-tight">Pagamento</h3>
                
                <div className="flex justify-between items-center bg-slate-50 p-5 rounded-3xl mb-4 border border-slate-200">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Total a Pagar</span>
                  <span className="font-black text-3xl text-slate-800 tracking-tighter">{formatarMoeda(totalCobrarFinal)}</span>
                </div>

                {/* Lista de Pagamentos já Lançados */}
                {pagamentosLancados.length > 0 && (
                  <div className="mb-4 space-y-2 max-h-32 overflow-y-auto pr-1">
                    {pagamentosLancados.map((pag, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-emerald-50 text-emerald-700 rounded-[20px] border border-emerald-100 shadow-sm">
                        <span className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2">✅ {pag.metodo}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-lg">{formatarMoeda(pag.valor)}</span>
                          <button onClick={() => handleRemoverPagamento(idx)} className="w-7 h-7 flex items-center justify-center bg-emerald-200/50 rounded-full text-emerald-700 active:scale-90 hover:bg-emerald-200 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Se ainda falta pagar, mostra os inputs */}
                {faltaPagar > 0 ? (
                  <div className="space-y-4 bg-white border border-slate-200 p-5 rounded-[28px] shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Restante</span>
                      <span className="font-black text-rose-500 text-xl">{formatarMoeda(faltaPagar)}</span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-4 top-4 text-base font-black text-slate-300">R$</span>
                      <input 
                        type="text" inputMode="decimal"
                        value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)}
                        placeholder={faltaPagar.toFixed(2)}
                        className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-[20px] border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 font-black text-2xl text-slate-800 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button onClick={() => handleAdicionarPagamento('PIX')} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest border border-indigo-200/50 active:scale-95 transition-all shadow-sm">PIX</button>
                      <button onClick={() => handleAdicionarPagamento('Crédito')} className="bg-amber-50 text-amber-600 hover:bg-amber-100 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest border border-amber-200/50 active:scale-95 transition-all shadow-sm">Crédito</button>
                      <button onClick={() => handleAdicionarPagamento('Débito')} className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest border border-blue-200/50 active:scale-95 transition-all shadow-sm">Débito</button>
                      <button onClick={() => handleAdicionarPagamento('Dinheiro')} className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-black py-4 rounded-2xl text-[11px] uppercase tracking-widest border border-emerald-200/50 active:scale-95 transition-all shadow-sm">Dinheiro</button>
                    </div>
                  </div>
                ) : (
                  // Se pagou tudo ou deu dinheiro a mais (Troco)
                  <div className="text-center py-8 bg-emerald-500 text-white rounded-[28px] shadow-lg shadow-emerald-200 animate-in zoom-in-95">
                    <span className="text-5xl block mb-3 drop-shadow-md">🎉</span>
                    <span className="font-black text-xl uppercase tracking-widest block drop-shadow-sm">Conta Paga</span>
                    {troco > 0 && <span className="font-bold text-emerald-100 mt-2 block bg-black/10 mx-6 py-2 rounded-xl border border-white/20">Devolver Troco: <span className="font-black text-white">{formatarMoeda(troco)}</span></span>}
                  </div>
                )}

                <div className="flex gap-4 mt-8">
                  <button onClick={() => setEtapaModal(2)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-black py-5 rounded-3xl transition-colors">Voltar</button>
                  <button 
                    disabled={faltaPagar > 0.01} 
                    onClick={concluirMesaFinal} 
                    className={`flex-[1.5] text-white font-black py-5 rounded-3xl transition-all text-lg
                      ${faltaPagar <= 0.01 ? 'bg-linear-to-b from-slate-800 to-slate-900 shadow-[0_6px_0_#0f172a] active:shadow-none active:translate-y-1.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                    `}
                  >
                    Encerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}