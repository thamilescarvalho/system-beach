// src/pages/Comanda.tsx
import { useState, useContext, useMemo } from 'react';
import type { ElementType } from 'react'; 
import { useParams, useNavigate } from 'react-router-dom';
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
  
  const IconeComponente = ((LucideIcons as unknown) as Record<string, ElementType>)[iconeNome] || LucideIcons.Package;
  
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

  const itensIniciais = useMemo(() => {
    return agruparItensParaInterface(mesaAtual?.itens || []);
  }, [mesaAtual?.itens]);

  const nomeClienteInicial = mesaAtual?.nomeCliente || '';
  
  const [itensLocaisPedidos, setItensLocaisPedidos] = useState<ItemComanda[]>([]);
  const [nomeClienteLocal, setNomeClienteLocal] = useState<string | null>(null);
  
  const itensPedidos = itensLocaisPedidos.length > 0 ? itensLocaisPedidos : itensIniciais;
  const nomeCliente = nomeClienteLocal !== null ? nomeClienteLocal : nomeClienteInicial;

  const setItensPedidos = (novosItens: ItemComanda[] | ((prev: ItemComanda[]) => ItemComanda[])) => {
    if (typeof novosItens === 'function') {
      setItensLocaisPedidos(novosItens(itensPedidos));
    } else {
      setItensLocaisPedidos(novosItens);
    }
  };

  const setNomeCliente = (nome: string) => setNomeClienteLocal(nome);

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
  
  const [etapaModal, setEtapaModal] = useState<0 | 1 | 2 | 3>(0);
  const [itemEditandoObs, setItemEditandoObs] = useState<ItemComanda | null>(null);
  const [textoObs, setTextoObs] = useState('');
  
  const [decisaoDezPorCento, setDecisaoDezPorCento] = useState(false);
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
        if (existe) return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item);
        return [...prev, { id: `item_ui_${Date.now()}`, produto, quantidade: 1 }];
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
  
  const marcarComoEntregue = (produtoId: number) => {
    const lotesProntosNoBanco = mesaAtual?.itens?.filter(
      i => i.produto.id === produtoId && i.statusCozinha === 'pronto'
    ) || [];

    lotesProntosNoBanco.forEach(itemCru => {
      contexto?.atualizarStatusCozinha(Number(idMesa), itemCru.id, 'entregue');
    });

    if (itensLocaisPedidos.length > 0) {
      setItensLocaisPedidos(prev => prev.map(item => 
        item.produto.id === produtoId ? { ...item, statusCozinha: 'entregue' } : item
      ));
    }
  };

  const valorTotalMenu = itensPedidos.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
  const quantidadeTotalItens = itensPedidos.reduce((total, item) => total + item.quantidade, 0);
  const valorServico = valorTotalMenu * 0.10;
  const totalCobrarFinal = decisaoDezPorCento ? (valorTotalMenu + valorServico) : valorTotalMenu;
  const totalJaPago = pagamentosLancados.reduce((acc, pag) => acc + pag.valor, 0);
  const faltaPagar = totalCobrarFinal - totalJaPago;
  const troco = totalJaPago > totalCobrarFinal ? totalJaPago - totalCobrarFinal : 0;

  const handleConfirmarPedido = async () => {
    if (contexto && idMesa) {
      await contexto.salvarComanda(Number(idMesa), itensPedidos, nomeCliente);
      setStatusSalvo(true);
      setItensLocaisPedidos([]); 
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

  const concluirMesaFinal = async () => {
    if (faltaPagar > 0.01) { alert('Ainda faltam valores a receber!'); return; }
    await contexto?.finalizarMesa(Number(idMesa), decisaoDezPorCento, pagamentosLancados);
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
    <div className="min-h-screen bg-slate-50 font-sans pb-32 lg:pb-10 relative overflow-hidden perspective-distant">
      
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-teal-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-sm shadow-slate-200/50 px-4 md:px-8 py-4 flex items-center justify-between mb-6">
        <button type="button" onClick={() => navigate('/mesas')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 active:shadow-inner transition-all hover:bg-slate-50">
          <LucideIcons.ArrowLeft size={20} strokeWidth={2.5}/>
        </button>
        <div className="text-center">
          <h1 className="text-[20px] font-bold text-slate-900 tracking-widest leading-none uppercase drop-shadow-sm">
            MESA {idMesa}
          </h1>
        </div>
        <div className="w-10" />
      </header>

      <main className="max-w-6xl mx-auto px-8 md:px-10 relative z-10 flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-6 lg:gap-8 items-start">
        
        <div className="w-full space-y-6 order-2 lg:order-1">
          {!categoriaAtiva ? (
            <section className="space-y-4 animate-in fade-in duration-500">
              <h3 className="flex items-center justify-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">
                <div className="w-12 h-px bg-slate-400"></div> Cardápio <div className="w-12 h-px bg-slate-400"></div>
              </h3>
              {categoriasDisponiveis.length === 0 ? (
                <div className="bg-white p-8 rounded-4xl border border-dashed border-slate-300 text-center shadow-sm">
                  <p className="text-slate-400 font-bold text-sm">O cardápio está vazio.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 gap-4 md:gap-4">
                  {categoriasDisponiveis.map((cat) => (
                    <button key={cat} type="button" onClick={() => { setCategoriaAtiva(cat); setSubcategoriaAtiva(null); }} className="flex flex-col items-center justify-center p-4 rounded-[28px] bg-linear-to-b from-white to-slate-50 border border-slate-200 shadow-sm shadow-slate-200/50 hover:shadow-md hover:-translate-y-1 active:scale-[0.96] active:shadow-inner active:translate-y-0 transition-all group transform-style-3d">
                      <div className="w-14 h-14 bg-white rounded-[20px] shadow-inner shadow-slate-100/50 border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <IconeCategoria nomeCategoria={cat} categorias={categorias} className="text-slate-600 drop-shadow-sm" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest text-center leading-tight drop-shadow-sm">{cat}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between px-2 mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3 uppercase">
                  <span className="bg-white w-12 h-12 rounded-[20px] shadow-sm shadow-slate-200/50 flex items-center justify-center border border-slate-200">
                    <IconeCategoria nomeCategoria={categoriaAtiva} categorias={categorias} className="text-slate-600" />
                  </span> 
                  {categoriaAtiva}
                </h3>
                <button type="button" onClick={() => { setCategoriaAtiva(null); setSubcategoriaAtiva(null); }} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white border border-slate-200 px-4 py-2.5 rounded-2xl active:scale-95 active:shadow-inner hover:text-slate-700 hover:shadow-sm transition-all shadow-sm">
                  Voltar
                </button>
              </div>

              {subcategoriasDisponiveis.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-2">
                  <button type="button" onClick={() => setSubcategoriaAtiva(null)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border ${subcategoriaAtiva === null ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Todos</button>
                  {subcategoriasDisponiveis.map(sub => (
                    <button type="button" key={sub} onClick={() => setSubcategoriaAtiva(sub)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm border ${subcategoriaAtiva === sub ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{sub}</button>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-4 mt-6">
                {produtosExibidosMenu.length === 0 ? (
                   <p className="text-center text-xs uppercase tracking-widest font-bold text-slate-400 py-10 bg-white rounded-3xl border border-slate-200 border-dashed col-span-full">Nenhum produto nesta variação.</p>
                ) : (
                  produtosExibidosMenu.map((produto) => {
                    const estaEsgotado = produto.estoque !== undefined && produto.estoque <= 0;
                    const catNome = extrairNomeCategoria(produto.categoria);
                    
                    return (
                      <button key={produto.id} type="button" onClick={() => !estaEsgotado && manipularProduto(produto, 'mais')} disabled={estaEsgotado} className={`w-full p-4 rounded-4xl border flex justify-between items-center gap-4 transition-all text-left transform-style-3d group ${estaEsgotado ? 'bg-slate-100 border-slate-200 opacity-70 saturate-50 cursor-not-allowed' : 'bg-white border-slate-200 shadow-sm shadow-slate-200/50 active:scale-[0.98] active:translate-y-0 active:shadow-inner hover:border-teal-300 hover:shadow-md hover:-translate-y-1'}`}>
                        
                        <div className="flex items-center gap-5 flex-1 min-w-0">
                          {produto.imagem_url ? (
                            <img src={produto.imagem_url} alt={produto.nome} className={`w-16 h-16 rounded-[20px] object-cover border border-slate-200 shadow-sm shrink-0 transition-transform group-hover:scale-105 ${estaEsgotado ? 'opacity-50' : ''}`} />
                          ) : (
                            <div className={`w-16 h-16 rounded-[20px] bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105 ${estaEsgotado ? 'opacity-50' : ''}`}>
                              <IconeCategoria nomeCategoria={catNome} categorias={categorias} className="text-slate-400" size={24} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className={`font-bold text-base tracking-tight mb-3 leading-none truncate uppercase ${estaEsgotado ? 'text-slate-500 line-through' : 'text-slate-800'}`}>{produto.nome}</p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-teal-900 font-bold text-sm bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 shadow-sm tabular-nums">{formatarMoeda(produto.preco)}</span>
                              {produto.subcategoria && !estaEsgotado && <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-1 rounded-md truncate max-w-20">{produto.subcategoria}</span>}
                              {estaEsgotado && <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-500 px-2 py-1 rounded-md font-bold uppercase tracking-widest shadow-sm">Esgotado</span>}
                            </div>
                          </div>
                        </div>

                        <div className={`w-10 h-10 rounded-4xl flex items-center justify-center shadow-inner border shrink-0 transition-transform group-hover:scale-110 ${estaEsgotado ? 'bg-slate-200 text-slate-400 border-slate-300' : 'bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-500/30'}`}>
                          {estaEsgotado ? <LucideIcons.X size={20} strokeWidth={3}/> : <LucideIcons.Plus size={24} strokeWidth={3}/>}
                        </div>

                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>

        <div className="w-full order-1 lg:order-2 lg:sticky lg:top-24 space-y-8">
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
              <LucideIcons.User size={20} strokeWidth={2.5}/>
            </div>
            <input 
              type="text" 
              placeholder="Nome do Cliente" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)} 
              className="w-full pl-12 pr-5 py-3 bg-white backdrop-blur-md rounded-3xl shadow-sm shadow-slate-300/50 border border-slate-300 focus:outline-none focus:border-teal-900 focus:ring-4 focus:ring-teal-400/10 font-bold text-slate-800 transition-all uppercase tracking-wide text-sm" 
            />
          </div>

          <section className="space-y-4">
            <button type="button" onClick={() => setMostrarItens(!mostrarItens)} className="w-full relative overflow-hidden rounded-[36px] bg-linear-to-b from-slate-800 to-slate-950 border border-slate-900 border-t-slate-700/50 shadow-xl shadow-slate-900/30 active:scale-[0.98] active:translate-y-0 active:shadow-inner transition-all p-7 text-left group">
              <div className="absolute inset-0 bg-white/5 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 drop-shadow-sm">Total da Mesa</h2>
                  <p className="text-[32px] md:text-4xl font-black tracking-tighter text-white drop-shadow-md tabular-nums leading-none">{formatarMoeda(valorTotalMenu)}</p>
                </div>
                <div className={`w-10 h-10 rounded-2xl bg-white/10 border border-white/20 shadow-inner flex items-center justify-center transition-transform duration-300 text-white ${mostrarItens ? 'rotate-180' : ''}`}>
                  <LucideIcons.ChevronDown size={20} strokeWidth={3}/>
                </div>
              </div>
              <div className="mt-5 inline-flex items-center gap-2.5 text-teal-400 text-[10px] font-bold uppercase tracking-widest relative z-10 bg-black/20 self-start px-3 py-1.5 rounded-full border border-white/5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse shadow-md shadow-teal-500/50"></span>
                {quantidadeTotalItens} {quantidadeTotalItens === 1 ? 'Item Adicionado' : 'Itens Adicionados'}
              </div>
            </button>

            {mostrarItens && (
              <div className="bg-white/90 backdrop-blur-xl rounded-[36px] border border-slate-200 p-3 shadow-lg shadow-slate-200/50 animate-in slide-in-from-top-4 duration-300 lg:max-h-[50vh] lg:overflow-y-auto scrollbar-hide">
                {itensPedidos.length === 0 ? (
                  <p className="text-center py-10 text-slate-400 text-[11px] font-bold uppercase tracking-widest">Nenhum item na mesa.</p>
                ) : (
                  <div className="space-y-3">
                    {itensPedidos.map(item => {
                      const itemCatNome = extrairNomeCategoria(item.produto.categoria);
                      
                      return (
                        <div key={item.id} className="flex flex-col p-4 bg-slate-50 rounded-[28px] border border-slate-100 shadow-sm relative overflow-hidden hover:border-slate-200 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            {item.produto.imagem_url ? (
                              <img src={item.produto.imagem_url} alt={item.produto.nome} className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                                <IconeCategoria nomeCategoria={itemCatNome} categorias={categorias} className="text-slate-400" size={22} />
                              </div>
                            )}
                            <div className="flex-1 flex flex-col items-start pr-2 min-w-0">
                              <div className="flex items-center gap-2 w-full">
                                <span className="font-black text-slate-800 text-sm leading-tight uppercase truncate">{item.produto.nome}</span>
                                <button type="button" onClick={() => { setItemEditandoObs(item); setTextoObs(item.observacao || ''); }} className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm shadow-slate-200/50 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-200 hover:bg-indigo-50 transition-colors active:scale-90 shrink-0">
                                  <LucideIcons.MessageSquarePlus size={12} strokeWidth={3}/>
                                </button>
                              </div>
                              {item.observacao && <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest mt-1.5 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md truncate max-w-full">OBS: {item.observacao}</span>}
                              <span className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest tabular-nums">{formatarMoeda(item.produto.preco)}</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-1.5 rounded-[20px] border border-slate-200 shadow-sm shrink-0">
                              <button type="button" onClick={() => manipularProduto(item.produto, 'menos')} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-rose-500 font-black text-xl hover:bg-rose-50 active:scale-95 active:shadow-inner transition-all">-</button>
                              <span className="font-black text-slate-800 text-base w-4 text-center tabular-nums">{item.quantidade}</span>
                              <button type="button" onClick={() => manipularProduto(item.produto, 'mais')} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-teal-50 border border-teal-200 text-teal-600 font-black text-xl hover:bg-teal-100 active:scale-95 active:shadow-inner transition-all">+</button>
                            </div>
                          </div>
                          
                          {item.statusCozinha === 'pronto' && (
                            <button type="button" onClick={() => marcarComoEntregue(item.produto.id)} className="mt-4 w-full bg-linear-to-b from-teal-400 to-teal-500 border border-teal-500 border-t-teal-300/50 shadow-md shadow-teal-500/30 active:scale-[0.98] active:translate-y-0 active:shadow-inner text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                              <span className="animate-bounce text-base">🔔</span> Entregar na Mesa
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

          <div className="hidden lg:flex w-full gap-3 mt-6">
            {(itensPedidos.length > 0 || nomeCliente !== '') && (
              <button type="button" onClick={() => setEtapaModal(1)} className="flex-1 bg-white text-rose-500 border border-rose-200 hover:bg-rose-50 py-4.5 rounded-3xl font-black text-[10px] uppercase tracking-widest shadow-sm shadow-slate-200/50 active:scale-95 active:shadow-inner transition-all">
                Encerrar
              </button>
            )}
            <button type="button" onClick={handleConfirmarPedido} className="flex-[1.5] bg-linear-to-b from-teal-500 to-teal-700 border border-teal-600 border-t-teal-400/50 text-white py-4 rounded-4xl font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-teal-600/30 active:scale-[0.98] active:shadow-inner hover:shadow-xl hover:-translate-y-1 transition-all flex justify-between px-5 items-center">
              <span>{statusSalvo ? 'Salvo!' : 'Salvar'}</span>
              {!statusSalvo && <span className="bg-black/15 px-2.5 py-1 rounded-xl shadow-inner tabular-nums">{formatarMoeda(valorTotalMenu)}</span>}
            </button>
          </div>
        </div>
      </main>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        <div className="flex items-center gap-3 max-w-md mx-auto">
          {(itensPedidos.length > 0 || nomeCliente !== '') && (
            <button type="button" onClick={() => setEtapaModal(1)} className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 py-4 rounded-[20px] font-bold text-[10px] uppercase tracking-widest active:scale-95 active:shadow-inner transition-all shadow-sm">
              Encerrar
            </button>
          )}
          <button type="button" onClick={handleConfirmarPedido} className="flex-[1.5] bg-linear-to-b from-teal-500 to-teal-700 border border-teal-600 border-t-teal-400/50 text-white py-4 rounded-[20px] font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-teal-600/30 active:scale-[0.98] active:shadow-inner transition-all flex justify-between px-5 items-center">
            <span>{statusSalvo ? 'Salvo!' : 'Salvar'}</span>
            {!statusSalvo && <span className="bg-black/15 px-2.5 py-1 rounded-xl shadow-inner tabular-nums">{formatarMoeda(valorTotalMenu)}</span>}
          </button>
        </div>
      </div>

      {itemEditandoObs && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setItemEditandoObs(null)}></div>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl shadow-slate-900/50 flex flex-col relative z-50 animate-in slide-in-from-bottom-10 sm:zoom-in-95 border border-white/20">
            <h3 className="text-[20px] font-bold text-slate-900 mb-1 tracking-tight uppercase">Nota para Cozinha</h3>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-6 bg-indigo-50 border border-indigo-100 inline-block px-3 py-1.5 rounded-md truncate max-w-full">{itemEditandoObs.produto.nome}</p>
            <textarea autoFocus value={textoObs} onChange={(e) => setTextoObs(e.target.value)} placeholder="Ex: Sem cebola, gelo à parte..." className="w-full bg-slate-50 p-5 rounded-3xl border border-slate-200 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10 resize-none h-32 text-slate-800 font-bold text-sm mb-6 transition-all shadow-inner shadow-slate-100/50" />
            <div className="flex gap-4">
              <button type="button" onClick={() => setItemEditandoObs(null)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold py-4 rounded-[20px] text-[10px] uppercase tracking-widest transition-colors active:scale-95">Cancelar</button>
              <button type="button" onClick={salvarObservacao} className="flex-[1.5] bg-linear-to-b from-indigo-500 to-indigo-600 border border-indigo-600 border-t-indigo-400/50 text-white font-bold uppercase tracking-widest py-4 rounded-[20px] shadow-md shadow-indigo-600/30 text-[11px] active:scale-95 active:shadow-inner transition-all">Salvar Nota</button>
            </div>
          </div>
        </div>
      )}

      {etapaModal > 0 && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setEtapaModal(0)}></div>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl shadow-slate-900/50 relative overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 border border-white/20">
            
            {etapaModal === 1 && (
              <div className="w-full flex flex-col items-center animate-in slide-in-from-left-4">
                <div className="w-24 h-24 bg-rose-50 rounded-[28px] flex items-center justify-center mb-6 text-rose-500 border border-rose-100 shadow-inner shadow-rose-200/50"><LucideIcons.AlertTriangle size={40} strokeWidth={2.5}/></div>
                <h3 className="text-3xl font-bold text-slate-900 text-center mb-2 tracking-tighter uppercase">Fechar Conta?</h3>
                <p className="text-center text-slate-500 font-bold mb-8 text-[11px] uppercase tracking-widest">A mesa não recebe mais itens.</p>
                <div className="flex gap-4 w-full">
                  <button type="button" onClick={() => setEtapaModal(0)} className="flex-1 bg-slate-100 text-slate-500 font-bold py-3 rounded-[20px] hover:bg-slate-200 text-[12px] uppercase tracking-widest transition-colors active:scale-95">Cancelar</button>
                  <button type="button" onClick={() => setEtapaModal(2)} className="flex-1 bg-linear-to-b from-rose-500 to-rose-600 border border-rose-600 border-t-rose-400/50 text-white font-bold py-3 rounded-[20px] shadow-lg shadow-rose-600/30 active:scale-95 active:shadow-inner transition-all text-[12px] uppercase tracking-widest">Sim</button>
                </div>
              </div>
            )}

            {etapaModal === 2 && (
              <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4">
                <div className="w-20 h-20 bg-teal-50 rounded-3xl flex items-center justify-center mb-5 text-teal-500 border border-teal-100 shadow-inner shadow-teal-200/50"><span className="text-4xl font-bold">%</span></div>
                <h3 className="text-2xl font-bold text-slate-900 text-center mb-6 tracking-tight uppercase">Taxa de Serviço</h3>
                <div className="w-full bg-slate-50 p-6 rounded-4xl mb-8 border border-slate-200 space-y-4 shadow-inner shadow-slate-100/50">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-500"><span>Consumo</span><span className="tabular-nums">{formatarMoeda(valorTotalMenu)}</span></div>
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-teal-500 border-b border-slate-200 pb-5"><span>Serviço (10%)</span><span className="tabular-nums">+ {formatarMoeda(valorServico)}</span></div>
                  <div className="flex justify-between items-center pt-2"><span className="font-bold text-slate-900 text-[10px] uppercase tracking-widest">Total Final</span><span className="text-2xl font-bold text-slate-900 tracking-tighter tabular-nums">{formatarMoeda(valorTotalMenu + valorServico)}</span></div>
                </div>
                <div className="flex flex-col gap-4 w-full">
                  <button type="button" onClick={() => avancaParaPagamento(true)} className="w-full bg-linear-to-b from-slate-800 to-slate-950 border border-slate-900 border-t-slate-700/50 text-white font-bold py-4 rounded-4xl shadow-lg shadow-slate-900/30 active:scale-[0.98] active:shadow-inner transition-all text-[11px] uppercase tracking-widest">Sim, com taxa</button>
                  <button type="button" onClick={() => avancaParaPagamento(false)} className="w-full bg-white border border-slate-300 text-slate-600 hover:text-slate-700 hover:bg-zinc-100 font-bold py-4 rounded-4xl transition-colors text-[10px] uppercase tracking-widest active:scale-95 shadow-sm">Não, só consumo</button>
                  <button type="button" onClick={() => setEtapaModal(1)} className="mt-0 text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center py-2 hover:text-slate-600 transition-colors">&larr; Voltar</button>
                </div>
              </div>
            )}

            {etapaModal === 3 && (
              <div className="w-full flex flex-col animate-in slide-in-from-right-4">
                <h3 className="text-2xl font-black text-slate-900 text-center mb-6 tracking-tight uppercase">Pagamento</h3>
                <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[28px] mb-4 border border-slate-200 shadow-inner shadow-slate-100/50">
                  <span className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Total a Pagar</span>
                  <span className="font-black text-3xl text-slate-800 tracking-tighter tabular-nums">{formatarMoeda(totalCobrarFinal)}</span>
                </div>
                
                {pagamentosLancados.length > 0 && (
                  <div className="mb-4 space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {pagamentosLancados.map((pag, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-teal-50 text-teal-700 rounded-[20px] border border-teal-100 shadow-sm">
                        <span className="font-black uppercase tracking-widest text-[10px] flex items-center gap-2">✅ {pag.metodo}</span>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-[17px] tabular-nums">{formatarMoeda(pag.valor)}</span>
                          <button type="button" onClick={() => handleRemoverPagamento(idx)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-rose-500 border border-teal-100 shadow-sm active:scale-90 hover:bg-rose-50 transition-colors"><LucideIcons.X size={14} strokeWidth={4}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {faltaPagar > 0 ? (
                  <div className="space-y-4 bg-white border border-slate-200 p-5 rounded-4xl shadow-sm shadow-slate-200/50">
                    <div className="flex justify-between items-center mb-1"><span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Restante</span><span className="font-bold text-rose-500 text-xl tabular-nums">{formatarMoeda(faltaPagar)}</span></div>
                    <div className="relative">
                      <span className="absolute left-5 top-4.5 text-[15px] font-bold text-slate-400">R$</span>
                      <input type="text" inputMode="decimal" value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)} placeholder={faltaPagar.toFixed(2)} className="w-full bg-slate-50 pl-14 pr-5 py-4 rounded-[20px] border border-slate-200 outline-none focus:border-indigo-400 focus:bg-white font-black text-[22px] text-slate-800 transition-all shadow-inner shadow-slate-100/50 tabular-nums" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <button type="button" onClick={() => handleAdicionarPagamento('PIX')} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:border-indigo-300 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-indigo-200 active:scale-95 transition-all shadow-sm">PIX</button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Crédito')} className="bg-amber-50 text-amber-600 hover:bg-amber-100 hover:border-amber-300 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-amber-200 active:scale-95 transition-all shadow-sm">Crédito</button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Débito')} className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:border-blue-300 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-blue-200 active:scale-95 transition-all shadow-sm">Débito</button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Dinheiro')} className="bg-teal-50 text-teal-600 hover:bg-teal-100 hover:border-teal-300 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest border border-teal-200 active:scale-95 transition-all shadow-sm">Dinheiro</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-linear-to-b from-teal-500 to-teal-600 border border-teal-500 text-white rounded-4xl shadow-lg shadow-teal-500/40 animate-in zoom-in-95">
                    <span className="text-[20px] block mb-3 drop-shadow-md">🎉</span><span className="font-bold text-xl uppercase tracking-widest block drop-shadow-sm">Conta Paga</span>
                    {troco > 0 && <span className="font-bold text-teal-100 mt-3 block bg-black/15 mx-6 py-2.5 rounded-2xl border border-white/20 text-xs shadow-inner">Devolver Troco: <span className="font-black text-white tabular-nums text-sm ml-1">{formatarMoeda(troco)}</span></span>}
                  </div>
                )}
                
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setEtapaModal(2)} className="flex-1 bg-zinc-300 text-zinc-900 hover:bg-zinc-300 font-bold uppercase tracking-widest py-3 rounded-4xl transition-colors text-[10px] active:scale-95">Voltar</button>
                  <button type="button" disabled={faltaPagar > 0.01} onClick={concluirMesaFinal} className={`flex-[1.5] text-white font-bold py-3 rounded-4xl transition-all text-[11px] uppercase tracking-widest ${faltaPagar <= 0.01 ? 'bg-linear-to-b from-slate-800 to-slate-950 border border-slate-900 border-t-slate-700/50 shadow-lg shadow-slate-900/30 active:scale-[0.98] active:shadow-inner' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'}`}>Encerrar Mesa</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}