// src/pages/Comanda.tsx
import { useState, useContext, useMemo, useEffect } from 'react';
import type { ElementType } from 'react'; 
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { AppContext } from '../context/AppContext';
import type { Produto, ItemComanda, Pagamento, MetodoPagamento, Categoria } from '../types';
import * as LucideIcons from 'lucide-react';

interface IconeCategoriaProps {
  nomeCategoria: string;
  categorias: Categoria[];
  className?: string;
  size?: number;
}

function IconeCategoria({ nomeCategoria, categorias, className = "", size = 28 }: IconeCategoriaProps) {
  const categoriaDoBanco = categorias.find(
    c => c.nome.toLowerCase() === nomeCategoria.toLowerCase()
  );
  
  const iconeNome = categoriaDoBanco?.icone || 'Package';
  const IconeComponente = (LucideIcons as unknown as Record<string, ElementType>)[iconeNome] || LucideIcons.Package;
  
  return <IconeComponente className={className} size={size} strokeWidth={2} />;
}

const extrairNomeCategoria = (categoria: unknown): string => {
  if (typeof categoria === 'object' && categoria !== null && 'nome' in categoria) {
    return String((categoria as Record<string, unknown>).nome);
  }
  return String(categoria);
};

const agruparItensParaInterface = (itens: ItemComanda[]): ItemComanda[] => {
  const mapa = new Map<number, ItemComanda>();

  itens.forEach(item => {
    const prodId = item.produto.id;
    if (mapa.has(prodId)) {
      const existente = mapa.get(prodId)!;

      let novoStatus: 'pronto' | 'pendente' | 'entregue';
      if (existente.statusCozinha === 'pronto' || item.statusCozinha === 'pronto') {
        novoStatus = 'pronto';
      } else if (existente.statusCozinha === 'pendente' || item.statusCozinha === 'pendente') {
        novoStatus = 'pendente';
      } else {
        novoStatus = 'entregue';
      }

      mapa.set(prodId, {
        ...existente,
        quantidade: existente.quantidade + item.quantidade,
        statusCozinha: novoStatus,
        observacao: item.observacao 
          ? (existente.observacao && existente.observacao !== item.observacao 
              ? `${existente.observacao} | ${item.observacao}` 
              : item.observacao)
          : existente.observacao
      });
    } else {
      mapa.set(prodId, { ...item });
    }
  });
  return Array.from(mapa.values());
};

export function Comanda() {
  const { idMesa } = useParams();
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  
  const mesaAtual = contexto?.mesas.find(m => m.numero === Number(idMesa));
  const categorias = useMemo(() => contexto?.categorias || [], [contexto?.categorias]);

  const [itensPedidos, setItensPedidos] = useState<ItemComanda[]>([]);
  const [nomeCliente, setNomeCliente] = useState<string>('');
  const [mesaIdCarregada, setMesaIdCarregada] = useState<number | null>(null);

  useEffect(() => {
    if (mesaAtual && mesaAtual.numero !== mesaIdCarregada) {
      const id = setTimeout(() => {
        setItensPedidos(agruparItensParaInterface(mesaAtual.itens || []));
        setNomeCliente(mesaAtual.nomeCliente || '');
        setMesaIdCarregada(mesaAtual.numero);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [mesaAtual, mesaIdCarregada]);

  const cardapioAtivo = useMemo(() => (contexto?.produtos || []).filter(p => p.ativo !== false && p.id !== 999), [contexto?.produtos]);
  
  const categoriasDisponiveis = useMemo(() => {
    if (categorias && categorias.length > 0) {
      return [...categorias]
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        .map(c => c.nome);
    }
    return Array.from(new Set(cardapioAtivo.map(p => extrairNomeCategoria(p.categoria))));
  }, [categorias, cardapioAtivo]);

  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [subcategoriaAtiva, setSubcategoriaAtiva] = useState<string | null>(null);
  const [mostrarItens, setMostrarItens] = useState(false);
  const [statusSalvo, setStatusSalvo] = useState(false);
  
  const [mensagemToast, setMensagemToast] = useState<string | null>(null);

  const dispararToast = (msg: string) => {
    setMensagemToast(msg);
    setTimeout(() => {
      setMensagemToast(null);
    }, 2500);
  };
  
  const [etapaModal, setEtapaModal] = useState<0 | 1 | 2 | 3>(0);
  const [itemEditandoObs, setItemEditandoObs] = useState<ItemComanda | null>(null);
  const [textoObs, setTextoObs] = useState('');
  
  const [valorTaxa, setValorTaxa] = useState<number>(0);
  const [inputTaxa, setInputTaxa] = useState<string>('');
  
  const [pagamentosLancados, setPagamentosLancados] = useState<Pagamento[]>([]);
  const [valorDigitado, setValorDigitado] = useState('');

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
        dispararToast(`+1 ${produto.nome} adicionado`);
        if (existe) {
          return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item);
        }
        return [...prev, { id: `item_ui_${Date.now()}`, produto, quantidade: 1, statusCozinha: 'pendente' }];
      } else {
        if (!existe) return prev;
        dispararToast(`${produto.nome} atualizado`);
        if (existe.quantidade > 1) {
          return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade - 1 } : item);
        }
        return prev.filter(item => item.produto.id !== produto.id);
      }
    });
  };

  const salvarObservacao = () => {
    if (itemEditandoObs) {
      setItensPedidos(prev => prev.map(item => item.id === itemEditandoObs.id ? { ...item, observacao: textoObs.trim() === '' ? undefined : textoObs } : item));
      setItemEditandoObs(null); setTextoObs('');
      dispararToast("Nota salva com sucesso!");
    }
  };
  
  const marcarComoEntregue = (produtoId: number) => {
    const lotesProntosNoBanco = mesaAtual?.itens?.filter(
      i => i.produto.id === produtoId && i.statusCozinha === 'pronto'
    ) || [];

    lotesProntosNoBanco.forEach(itemCru => {
      contexto?.atualizarStatusCozinha(Number(idMesa), itemCru.id, 'entregue');
    });

    setItensPedidos(prev => prev.map(item => 
      item.produto.id === produtoId ? { ...item, statusCozinha: 'entregue' } : item
    ));
    dispararToast("Item marcado como entregue!");
  };

  const valorTotalMenu = itensPedidos.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
  const quantidadeTotalItens = itensPedidos.reduce((total, item) => total + item.quantidade, 0);
  
  const totalCobrarFinal = valorTotalMenu + valorTaxa;
  const totalJaPago = pagamentosLancados.reduce((acc, pag) => acc + pag.valor, 0);
  const faltaPagar = totalCobrarFinal - totalJaPago;
  const troco = totalJaPago > totalCobrarFinal ? totalJaPago - totalCobrarFinal : 0;

  const handleConfirmarPedido = async () => {
    if (contexto && idMesa) {
      await contexto.salvarComanda(Number(idMesa), itensPedidos, nomeCliente);
      setStatusSalvo(true);
      dispararToast("Comanda salva com sucesso!");
      setTimeout(() => setStatusSalvo(false), 2000);
    }
  };

  const avancaParaPagamento = () => {
    const taxaConvertida = parseFloat(inputTaxa.replace(',', '.')) || 0;
    setValorTaxa(taxaConvertida);
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

  const concluirMesaFinal = async () => {
    if (faltaPagar > 0.01) { alert('Ainda faltam valores a receber!'); return; }
    await contexto?.finalizarMesa(Number(idMesa), valorTaxa, pagamentosLancados);
    navigate('/');
  };

  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const produtosDaCategoriaAtiva = useMemo(() => {
    if (!categoriaAtiva) return [];
    return cardapioAtivo.filter(p => {
      const nomeCat = extrairNomeCategoria(p.categoria);
      return nomeCat.toLowerCase() === categoriaAtiva.toLowerCase();
    });
  }, [cardapioAtivo, categoriaAtiva]);

  const subcategoriasDisponiveis = useMemo(() => {
    const subs = produtosDaCategoriaAtiva.map(p => p.subcategoria).filter(Boolean) as string[];
    return Array.from(new Set(subs)).sort();
  }, [produtosDaCategoriaAtiva]);

  const produtosExibidosMenu = useMemo(() => {
    if (!subcategoriaAtiva) return produtosDaCategoriaAtiva;
    return produtosDaCategoriaAtiva.filter(p => p.subcategoria === subcategoriaAtiva);
  }, [produtosDaCategoriaAtiva, subcategoriaAtiva]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pt-20 md:pt-24 md:pl-18 pb-36 lg:pb-28 relative overflow-hidden select-none">
      
      {/* TOAST DE NOTIFICAÇÃO */}
      {mensagemToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="bg-slate-900/95 text-white px-5 py-3 rounded-full shadow-xl backdrop-blur-md border border-white/10 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-[11px] font-bold uppercase tracking-widest">{mensagemToast}</span>
          </div>
        </div>
      )}

      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-teal-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-6 lg:gap-8 items-start">
        
        {/* LADO ESQUERDO: MENU / CARDÁPIO */}
        <div className="w-full space-y-6 order-2 lg:order-1">
          {!categoriaAtiva ? (
            <section className="space-y-4 animate-in fade-in duration-500">
              <h3 className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 select-none">
                <div className="w-12 h-px bg-slate-200"></div> <span>Categorias</span> <div className="w-12 h-px bg-slate-200"></div>
              </h3>
              {categoriasDisponiveis.length === 0 ? (
                <div className="bg-white p-8 rounded-4xl border border-dashed border-slate-300 text-center shadow-sm select-none">
                  <p className="text-slate-400 font-bold text-sm"><span>O cardápio está vazio.</span></p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
                  {categoriasDisponiveis.map((cat) => (
                    <button key={cat} type="button" onClick={() => { setCategoriaAtiva(cat); setSubcategoriaAtiva(null); }} className="flex flex-col items-center justify-center p-4 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.96] transition-all group">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-teal-50 transition-all duration-300">
                        <IconeCategoria nomeCategoria={cat} categorias={categorias} className="text-slate-500 group-hover:text-teal-600" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight text-center leading-tight select-none"><span>{cat}</span></span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between px-2 mb-4">
                <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase select-none">
                  <span className="bg-white w-10 h-10 rounded-xl shadow-sm flex items-center justify-center border border-slate-200">
                    <IconeCategoria nomeCategoria={categoriaAtiva} categorias={categorias} className="text-teal-600" size={20} />
                  </span> 
                  <span>{categoriaAtiva}</span>
                </h3>
                <button type="button" onClick={() => { setCategoriaAtiva(null); setSubcategoriaAtiva(null); }} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white border border-slate-200 px-4 py-2 rounded-full active:scale-95 hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm">
                  Voltar
                </button>
              </div>

              {subcategoriasDisponiveis.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-2 select-none">
                  <button type="button" onClick={() => setSubcategoriaAtiva(null)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border ${subcategoriaAtiva === null ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Todos</button>
                  {subcategoriasDisponiveis.map(sub => (
                    <button type="button" key={sub} onClick={() => setSubcategoriaAtiva(sub)} className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border ${subcategoriaAtiva === sub ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{sub}</button>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-3 mt-4">
                {produtosExibidosMenu.length === 0 ? (
                   <p className="text-center text-[11px] uppercase tracking-widest font-bold text-slate-400 py-10 bg-white rounded-3xl border border-slate-200 border-dashed select-none"><span>Nenhum produto nesta variação.</span></p>
                ) : (
                  produtosExibidosMenu.map((produto) => {
                    const estaEsgotado = produto.estoque !== undefined && produto.estoque <= 0;
                    const catNome = extrairNomeCategoria(produto.categoria);
                    
                    return (
                      <button key={produto.id} type="button" onClick={() => !estaEsgotado && manipularProduto(produto, 'mais')} disabled={estaEsgotado} className={`w-full p-3 md:p-4 rounded-3xl border flex justify-between items-center gap-4 transition-all text-left group ${estaEsgotado ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' : 'bg-white border-slate-200 shadow-sm active:scale-[0.98] hover:border-teal-300 hover:shadow-md'}`}>
                        
                        <div className="flex items-center gap-4 flex-1 min-w-0 select-none">
                          {produto.imagem_url ? (
                            <img src={produto.imagem_url} alt={produto.nome} className={`w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0 transition-transform group-hover:scale-105 ${estaEsgotado ? 'opacity-50' : ''}`} />
                          ) : (
                            <div className={`w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${estaEsgotado ? 'opacity-50' : ''}`}>
                              <IconeCategoria nomeCategoria={catNome} categorias={categorias} className="text-slate-400" size={24} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className={`font-bold text-[14px] md:text-[15px] tracking-tight mb-2 leading-none truncate uppercase ${estaEsgotado ? 'text-slate-500 line-through' : 'text-slate-800'}`}><span>{produto.nome}</span></p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-teal-700 font-bold text-[13px] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 tabular-nums"><span>{formatarMoeda(produto.preco)}</span></span>
                              {produto.subcategoria && !estaEsgotado && <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-1 rounded-md truncate max-w-20"><span>{produto.subcategoria}</span></span>}
                              {estaEsgotado && <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-500 px-2 py-1 rounded-md font-bold uppercase tracking-widest"><span>Esgotado</span></span>}
                            </div>
                          </div>
                        </div>

                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${estaEsgotado ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-teal-50 text-teal-600 border border-teal-200'}`}>
                          {estaEsgotado ? <LucideIcons.X size={18} strokeWidth={2.5}/> : <LucideIcons.Plus size={20} strokeWidth={3}/>}
                        </div>

                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>

        {/* LADO DIREITO: RESUMO DA CONTA */}
        <div className="w-full order-1 lg:order-2 lg:sticky lg:top-24 space-y-6">
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
              <LucideIcons.User size={18} strokeWidth={2.5}/>
            </div>
            <input 
              type="text" 
              placeholder="Nome do Cliente" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)} 
              className="w-full pl-12 pr-5 h-13 bg-white rounded-full shadow-sm border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 font-medium text-slate-800 transition-all uppercase tracking-wide text-[12px]" 
            />
          </div>

          <section className="space-y-4">
            <button type="button" onClick={() => setMostrarItens(!mostrarItens)} className="w-full relative overflow-hidden rounded-4xl bg-slate-900 border border-slate-800 shadow-xl shadow-slate-900/10 active:scale-[0.98] transition-all p-6 text-left group">
              <div className="flex justify-between items-start relative z-10 select-none">
                <div>
                  <h2 className="text-slate-300 text-[10px] font-medium uppercase tracking-[0.2em] mb-1.5"><span>Total da Mesa</span></h2>
                  <p className="text-3xl md:text-4xl font-bold tracking-tighter text-white tabular-nums leading-none"><span>{formatarMoeda(valorTotalMenu)}</span></p>
                </div>
                <div className={`w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center transition-transform duration-300 text-white ${mostrarItens ? 'rotate-180' : ''}`}>
                  <LucideIcons.ChevronDown size={20} strokeWidth={2.5}/>
                </div>
              </div>
              <div className="mt-5 inline-flex items-center gap-2 text-teal-400 text-[10px] font-medium uppercase tracking-widest relative z-10 bg-white/10 px-3 py-1.5 rounded-full select-none">
                <span className="flex h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
                <span>{quantidadeTotalItens} {quantidadeTotalItens === 1 ? 'Item Adicionado' : 'Itens Adicionados'}</span>
              </div>
            </button>

            {mostrarItens && (
              <div className="bg-white rounded-4xl border border-slate-200 p-2 shadow-lg shadow-slate-200/50 animate-in slide-in-from-top-4 duration-300 lg:max-h-[50vh] lg:overflow-y-auto scrollbar-hide">
                {itensPedidos.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-[11px] font-medium uppercase tracking-widest select-none"><span>Nenhum item na mesa.</span></p>
                ) : (
                  <div className="space-y-2">
                    
                    {itensPedidos.map(item => {
                      const itemCatNome = extrairNomeCategoria(item.produto.categoria);
                      
                      return (
                        <div key={item.id} className="flex flex-col p-2 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden">
                          <div className="flex items-start gap-3">
                            
                            <div className="shrink-0">
                              {item.produto.imagem_url ? (
                                <img src={item.produto.imagem_url} alt={item.produto.nome} className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm" />
                              ) : (
                                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                  <IconeCategoria nomeCategoria={itemCatNome} categorias={categorias} className="text-slate-300" size={24} />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 min-h-16">
                              
                              <div className="flex items-start justify-between gap-2 w-full select-none">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-slate-800 text-[12px] leading-tight uppercase truncate">
                                    <span>{item.produto.nome}</span>
                                  </span>
                                  {item.observacao && (
                                    <span className="text-[9px] text-blue-600 font-medium uppercase tracking-widest bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md truncate max-w-full inline-block mt-1 self-start">
                                      <span>OBS: {item.observacao}</span>
                                    </span>
                                  )}
                                </div>
                          
                                <button type="button" onClick={() => { setItemEditandoObs(item); setTextoObs(item.observacao || ''); }} className="w-4 h-3 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 transition-colors active:scale-90 shrink-0 ml-2 mt-0.5">
                                  <LucideIcons.MessageSquarePlus size={11} strokeWidth={2.5}/>
                                </button>
                              </div>

                              <div className="flex items-start justify-between w-full mt-0.5 select-none">
                                <span className="text-[12px] text-slate-500 font-medium uppercase tracking-widest tabular-nums">
                                  <span>{formatarMoeda(item.produto.preco)}</span>
                                </span>
                                
                                <div className="flex items-center gap-2 bg-white p-1 rounded-full border border-slate-300 shadow-sm shrink-0">
                                  <button type="button" onClick={() => manipularProduto(item.produto, 'menos')} className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 border border-slate-100 text-black font-black text-lg hover:bg-rose-50 active:scale-95 transition-all">-</button>
                                  <span className="font-medium text-slate-800 text-[13px] w-5 text-center tabular-nums"><span>{item.quantidade}</span></span>
                                  <button type="button" onClick={() => manipularProduto(item.produto, 'mais')} className="w-5 h-5 flex items-center justify-center rounded-full bg-teal-50 border border-teal-50 text-black font-black text-lg hover:bg-teal-100 active:scale-95 transition-all">+</button>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {item.statusCozinha === 'pronto' && (
                            <button type="button" onClick={() => marcarComoEntregue(item.produto.id)} className="mt-3 w-full bg-teal-500 hover:bg-teal-600 text-white py-2 rounded-4xl text-[10px] font-medium uppercase tracking-widest transition-all flex items-center justify-center gap-2 select-none shadow-sm">
                              <span className="animate-bounce text-sm">🔔</span> <span>Entregar na Mesa</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* BARRA FIXA INFERIOR */}

      <div className="fixed bottom-0 left-0 right-0 md:left-18 p-3 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-2xl pb-safe select-none">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button type="button" onClick={() => setEtapaModal(1)} className="flex-1 bg-rose text-red-500 border border-red-500 hover:bg-rose-50 hover:border-rose-200 h-10 rounded-4xl font-medium text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-sm">
            <span>Fechar Conta</span>
          </button>
          <button type="button" onClick={handleConfirmarPedido} className="flex-1 bg-teal-800 text-white h-10 rounded-4xl font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-teal-600/20 px-4 py-2 items-center">
            <span>{statusSalvo ? 'Salvo!' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      {/* MODAL: OBSERVAÇÃO */}
      {itemEditandoObs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
          <div className="absolute inset-0" onClick={() => setItemEditandoObs(null)}></div>
          <div className="bg-white rounded-4xl p-6 w-full max-w-sm shadow-2xl flex flex-col relative z-50 animate-in zoom-in-95 duration-200">
            <h3 className="text-[16px] font-black text-slate-900 mb-1 tracking-tight uppercase"><span>Nota p/ Cozinha</span></h3>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4 bg-blue-50 inline-block px-3 py-1 rounded-full truncate max-w-full"><span>{itemEditandoObs.produto.nome}</span></p>
            <textarea autoFocus value={textoObs} onChange={(e) => setTextoObs(e.target.value)} placeholder="Ex: Sem cebola, gelo à parte..." className="w-full bg-slate-50 p-4 rounded-3xl border border-slate-200 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 resize-none h-32 text-slate-800 font-medium text-[13px] mb-6 transition-all" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setItemEditandoObs(null)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold h-12 rounded-full text-[10px] uppercase tracking-widest transition-colors active:scale-95"><span>Cancelar</span></button>
              <button type="button" onClick={salvarObservacao} className="flex-[1.5] bg-blue-600 text-white hover:bg-blue-700 font-bold uppercase tracking-widest h-12 rounded-full shadow-lg shadow-blue-600/30 text-[11px] active:scale-95 transition-all"><span>Salvar Nota</span></button>
            </div>
          </div>
        </div>
      )}

      {/* MODAIS DE FECHAMENTO CONTA (1, 2, 3) */}
      {etapaModal > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
          <div className="absolute inset-0" onClick={() => setEtapaModal(0)}></div>
          <div className="bg-white rounded-4xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative z-50 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* ETAPA 1: CONFIRMAÇÃO */}
            {etapaModal === 1 && (
              <div className="w-full flex flex-col items-center">
                <div className="w-15 h-15 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500"><LucideIcons.AlertTriangle size={28} strokeWidth={2.5}/></div>
                <h3 className="text-[17px] font-semibold text-slate-900 text-center mb-1 tracking-tight uppercase"><span>Deseja encerrar a conta?</span></h3>
                <p className="text-center text-slate-500 font-sans mb-8 text-[11px] uppercase tracking-widest"><span>A mesa não receberá mais itens.</span></p>
                <div className="flex gap-5 w-full">
                  <button type="button" onClick={() => setEtapaModal(0)} className="flex-1 bg-slate-200 text-slate-700 font-medium h-10 rounded-full hover:bg-slate-300 text-[11px] uppercase tracking-widest transition-all active:scale-95"><span>Voltar</span></button>
                  <button type="button" onClick={() => setEtapaModal(2)} className="flex-1 bg-rose-700 hover:bg-rose-700 text-white font-medium h-10 rounded-full shadow-lg shadow-rose-600/30 active:scale-95 transition-all text-[11px] uppercase tracking-widest"><span>Sim</span></button>
                </div>
              </div>
            )}

            {/* ETAPA 2: GUARDA SOL / TAXA */}
            {etapaModal === 2 && (
              <div className="w-full flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-fuchsia-50 rounded-full flex items-center justify-center text-fuchsia-700">
                    <LucideIcons.Umbrella size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-slate-900 tracking-tighter uppercase"><span>Guarda-Sol</span></h3>
                    <p className="text-[10px] font-sans text-slate-400 uppercase tracking-widest">Adicionar Taxa</p>
                  </div>
                </div>
                
                <div className="w-full bg-slate-100 p-5 rounded-2xl mb-5 border border-slate-300">
                  <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-5">
                    <span><span>Consumo da Mesa</span></span>
                    <span className="tabular-nums"><span>{formatarMoeda(valorTotalMenu)}</span></span>
                  </div>
                  
                  <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 mb-4">
                    <label className="text-[11px] font-medium uppercase tracking-widest text-slate-600 pl-1">
                      <span>Valor</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[15px] font-bold text-slate-500">
                        <span>R$</span>
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={inputTaxa}
                        onChange={(e) => setInputTaxa(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="0,00"
                        className="w-full bg-white pl-12 pr-4 h-10 rounded-4xl border border-slate-300 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 font-medium text-[16px] text-slate-800 transition-all tabular-nums shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-[11px] uppercase tracking-widest"><span>Total Geral</span></span>
                    <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-900">
                      <span>{formatarMoeda(valorTotalMenu + (parseFloat(inputTaxa.replace(',', '.')) || 0))}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <button type="button" onClick={avancaParaPagamento} className="w-full bg-slate-700 hover:bg-slate-700 text-white font-medium h-10 rounded-full shadow-lg active:scale-[0.98] transition-all text-[11px] uppercase tracking-widest">
                    <span>Ir para Pagamento</span>
                  </button>
                  <button type="button" onClick={() => setEtapaModal(1)} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-3 hover:text-slate-600 transition-colors">
                    <span>&larr; Voltar</span>
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: PAGAMENTO */}
            {etapaModal === 3 && (
              <div className="w-full flex flex-col">
                <h3 className="text-[16px] font-bold text-slate-900 text-center mb-5 tracking-tight uppercase"><span>Pagamento</span></h3>
                
                <div className="flex justify-between items-center bg-slate-100 p-4 rounded-xl mb-4 border border-slate-200">
                  <span className="font-bold text-slate-500 uppercase tracking-widest text-[10px]"><span>Total a Pagar</span></span>
                  <span className="font-bold text-2xl text-slate-900 tracking-tight tabular-nums"><span>{formatarMoeda(totalCobrarFinal)}</span></span>
                </div>
                
                {pagamentosLancados.length > 0 && (
                  <div className="mb-4 space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {pagamentosLancados.map((pag, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm">
                        <span className="font-bold uppercase tracking-widest text-[11px] flex items-center gap-2 text-slate-700">
                          <span className="text-teal-500"><LucideIcons.CheckCircle2 size={16} /></span> {pag.metodo}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[14px] tabular-nums text-slate-900"><span>{formatarMoeda(pag.valor)}</span></span>
                          <button type="button" onClick={() => handleRemoverPagamento(idx)} className="w-7 h-7 flex items-center justify-center bg-slate-50 rounded-full text-rose-500 hover:bg-rose-50 transition-colors active:scale-90"><LucideIcons.X size={14} strokeWidth={2.5}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {faltaPagar > 0 ? (
                  <div className="space-y-3 bg-white">
                    <div className="flex justify-end items-center px-3 py-2 rounded-xl gap-2">
                      <span className="text-[10px] font-medium text-rose-600 uppercase tracking-widest"><span>Restante</span></span>
                      <span className="font-bold text-rose-560 text-[15px] tabular-nums"><span>{formatarMoeda(faltaPagar)}</span></span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-slate-400"><span>R$</span></span>
                      <input type="text" inputMode="decimal" value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)} placeholder={faltaPagar.toFixed(2)} className="w-full bg-slate-50 pl-12 pr-4 h-12 rounded-full border border-slate-200 outline-none focus:border-blue-500 focus:bg-white font-bold text-[16px] text-slate-800 transition-all tabular-nums" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button type="button" onClick={() => handleAdicionarPagamento('PIX')} className="bg-white hover:bg-slate-50 text-slate-700 font-bold h-11 rounded-full text-[10px] uppercase tracking-widest border border-slate-200 active:scale-95 transition-all shadow-sm"><span>PIX</span></button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Crédito')} className="bg-white hover:bg-slate-50 text-slate-700 font-bold h-11 rounded-full text-[10px] uppercase tracking-widest border border-slate-200 active:scale-95 transition-all shadow-sm"><span>Crédito</span></button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Débito')} className="bg-white hover:bg-slate-50 text-slate-700 font-bold h-11 rounded-full text-[10px] uppercase tracking-widest border border-slate-200 active:scale-95 transition-all shadow-sm"><span>Débito</span></button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Dinheiro')} className="bg-white hover:bg-slate-50 text-slate-700 font-bold h-11 rounded-full text-[10px] uppercase tracking-widest border border-slate-200 active:scale-95 transition-all shadow-sm"><span>Dinheiro</span></button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-teal-50 border border-teal-200 text-teal-700 rounded-3xl animate-in zoom-in-95 duration-300">
                    <span className="font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                      <LucideIcons.CheckCircle2 size={16} /> Conta Paga
                    </span>
                    {troco > 0 && (
                      <span className="font-bold text-teal-800 mt-2 block bg-white mx-4 py-2.5 rounded-2xl border border-teal-100 text-[10px] shadow-sm uppercase tracking-widest">
                        <span>Troco: </span><span className="font-bold tabular-nums text-[14px] ml-1"><span>{formatarMoeda(troco)}</span></span>
                      </span>
                    )}
                  </div>
                )}
                
                <div className="flex gap-3 mt-6">
                  <button type="button" onClick={() => setEtapaModal(2)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold uppercase tracking-widest h-12 rounded-full transition-colors text-[10px] active:scale-95"><span>Voltar</span></button>
                  <button type="button" disabled={faltaPagar > 0.01} onClick={concluirMesaFinal} className={`flex-1 text-white font-bold h-12 rounded-full transition-all text-[11px] uppercase tracking-widest ${faltaPagar <= 0.01 ? 'bg-slate-900 shadow-lg active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}><span>Encerrar Mesa</span></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}