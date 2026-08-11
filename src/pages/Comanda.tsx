// src/pages/Comanda.tsx
import { useState, useContext, useMemo, useEffect } from 'react';
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
    await contexto?.finalizarMesa(Number(idMesa), valorTaxa as any, pagamentosLancados);
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
    <div className="min-h-screen bg-slate-50 font-sans pb-36 lg:pb-28 relative overflow-hidden select-none">
      
      {mensagemToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="bg-slate-900/90 text-white px-5 py-3 rounded-2xl shadow-xl backdrop-blur-md border border-white/10 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-[11px] font-black uppercase tracking-widest">{mensagemToast}</span>
          </div>
        </div>
      )}

      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-teal-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-white/85 shadow-sm shadow-slate-200/50 px-4 md:px-8 py-4 flex items-center justify-between mb-6">
        <button type="button" onClick={() => navigate('/mesas')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 active:shadow-inner transition-all hover:bg-slate-50">
          <LucideIcons.ArrowLeft size={20} strokeWidth={2.5}/>
        </button>
        <div className="text-center select-none">
          <h1 className="text-[20px] font-black text-slate-900 tracking-widest leading-none uppercase drop-shadow-sm">
            <span>MESA {idMesa}</span>
          </h1>
          <p className="text-teal-600 font-bold uppercase tracking-[0.2em] text-[9px] mt-1"><span>Atendimento</span></p>
        </div>
        <div className="w-10" />
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-6 lg:gap-8 items-start">
        
        <div className="w-full space-y-6 order-2 lg:order-1">
          {!categoriaAtiva ? (
            <section className="space-y-4 animate-in fade-in duration-500">
              <h3 className="flex items-center justify-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 select-none">
                <div className="w-12 h-px bg-slate-300"></div> <span>Cardápio</span> <div className="w-12 h-px bg-slate-300"></div>
              </h3>
              {categoriasDisponiveis.length === 0 ? (
                <div className="bg-white p-8 rounded-4xl border border-dashed border-slate-300 text-center shadow-sm select-none">
                  <p className="text-slate-400 font-bold text-sm"><span>O cardápio está vazio.</span></p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
                  {categoriasDisponiveis.map((cat) => (
                    <button key={cat} type="button" onClick={() => { setCategoriaAtiva(cat); setSubcategoriaAtiva(null); }} className="flex flex-col items-center justify-center p-4 rounded-[28px] bg-gradient-to-b from-white to-slate-50 border border-slate-200 shadow-sm shadow-slate-200/50 hover:shadow-md hover:-translate-y-1 active:scale-[0.96] active:shadow-inner active:translate-y-0 transition-all group">
                      <div className="w-14 h-14 bg-white rounded-[20px] shadow-inner shadow-slate-100/50 border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <IconeCategoria nomeCategoria={cat} categorias={categorias} className="text-slate-600 drop-shadow-sm" />
                      </div>
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter text-center leading-tight drop-shadow-sm select-none"><span>{cat}</span></span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between px-2 mb-4">
                <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase select-none">
                  <span className="bg-white w-12 h-12 rounded-[20px] shadow-sm shadow-slate-200/50 flex items-center justify-center border border-slate-200">
                    <IconeCategoria nomeCategoria={categoriaAtiva} categorias={categorias} className="text-slate-600" />
                  </span> 
                  <span>{categoriaAtiva}</span>
                </h3>
                <button type="button" onClick={() => { setCategoriaAtiva(null); setSubcategoriaAtiva(null); }} className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border border-slate-200 px-4 py-2.5 rounded-2xl active:scale-95 active:shadow-inner hover:text-slate-700 hover:shadow-sm transition-all shadow-sm">
                  Voltar
                </button>
              </div>

              {subcategoriasDisponiveis.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-2 select-none">
                  <button type="button" onClick={() => setSubcategoriaAtiva(null)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${subcategoriaAtiva === null ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Todos</button>
                  {subcategoriasDisponiveis.map(sub => (
                    <button type="button" key={sub} onClick={() => setSubcategoriaAtiva(sub)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-sm border ${subcategoriaAtiva === sub ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{sub}</button>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4 mt-6">
                {produtosExibidosMenu.length === 0 ? (
                   <p className="text-center text-xs uppercase tracking-widest font-bold text-slate-400 py-10 bg-white rounded-3xl border border-slate-200 border-dashed col-span-full select-none"><span>Nenhum produto nesta variação.</span></p>
                ) : (
                  produtosExibidosMenu.map((produto) => {
                    const estaEsgotado = produto.estoque !== undefined && produto.estoque <= 0;
                    const catNome = extrairNomeCategoria(produto.categoria);
                    
                    return (
                      <button key={produto.id} type="button" onClick={() => !estaEsgotado && manipularProduto(produto, 'mais')} disabled={estaEsgotado} className={`w-full p-4 rounded-4xl border flex justify-between items-center gap-4 transition-all text-left group ${estaEsgotado ? 'bg-slate-100 border-slate-200 opacity-70 saturate-50 cursor-not-allowed' : 'bg-white border-slate-200 shadow-sm shadow-slate-200/50 active:scale-[0.98] active:translate-y-0 active:shadow-inner hover:border-teal-300 hover:shadow-md hover:-translate-y-1'}`}>
                        
                        <div className="flex items-center gap-5 flex-1 min-w-0 select-none">
                          {produto.imagem_url ? (
                            <img src={produto.imagem_url} alt={produto.nome} className={`w-16 h-16 rounded-[20px] object-cover border border-slate-200 shadow-sm shrink-0 transition-transform group-hover:scale-105 ${estaEsgotado ? 'opacity-50' : ''}`} />
                          ) : (
                            <div className={`w-16 h-16 rounded-[20px] bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105 ${estaEsgotado ? 'opacity-50' : ''}`}>
                              <IconeCategoria nomeCategoria={catNome} categorias={categorias} className="text-slate-400" size={24} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className={`font-bold text-base tracking-tight mb-3 leading-none truncate uppercase ${estaEsgotado ? 'text-slate-500 line-through' : 'text-slate-800'}`}><span>{produto.nome}</span></p>
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-teal-900 font-bold text-sm bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 shadow-sm tabular-nums"><span>{formatarMoeda(produto.preco)}</span></span>
                              {produto.subcategoria && !estaEsgotado && <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest bg-slate-100 border border-slate-200 px-2 py-1 rounded-md truncate max-w-20"><span>{produto.subcategoria}</span></span>}
                              {estaEsgotado && <span className="text-[9px] bg-rose-50 border border-rose-100 text-rose-500 px-2 py-1 rounded-md font-bold uppercase tracking-widest shadow-sm"><span>Esgotado</span></span>}
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
            <button type="button" onClick={() => setMostrarItens(!mostrarItens)} className="w-full relative overflow-hidden rounded-[36px] bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-900 border-t-slate-700/50 shadow-xl shadow-slate-900/30 active:scale-[0.98] active:translate-y-0 active:shadow-inner transition-all p-7 text-left group">
              <div className="absolute inset-0 bg-white/5 rounded-[36px] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex justify-between items-start relative z-10 select-none">
                <div>
                  <h2 className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1.5 drop-shadow-sm"><span>Total da Mesa</span></h2>
                  <p className="text-[32px] md:text-4xl font-black tracking-tighter text-white drop-shadow-md tabular-nums leading-none"><span>{formatarMoeda(valorTotalMenu)}</span></p>
                </div>
                <div className={`w-10 h-10 rounded-2xl bg-white/10 border border-white/20 shadow-inner flex items-center justify-center transition-transform duration-300 text-white ${mostrarItens ? 'rotate-180' : ''}`}>
                  <LucideIcons.ChevronDown size={20} strokeWidth={3}/>
                </div>
              </div>
              <div className="mt-5 inline-flex items-center gap-2.5 text-teal-400 text-[10px] font-bold uppercase tracking-widest relative z-10 bg-black/20 self-start px-3 py-1.5 rounded-full border border-white/5 select-none">
                <span className="flex h-2.5 w-2.5 rounded-full bg-teal-500 animate-pulse shadow-md shadow-teal-500/50"></span>
                <span>{quantidadeTotalItens} {quantidadeTotalItens === 1 ? 'Item Adicionado' : 'Itens Adicionados'}</span>
              </div>
            </button>

            {mostrarItens && (
              <div className="bg-white/90 backdrop-blur-xl rounded-[36px] border border-slate-200 p-3 shadow-lg shadow-slate-200/50 animate-in slide-in-from-top-4 duration-300 lg:max-h-[50vh] lg:overflow-y-auto scrollbar-hide">
                {itensPedidos.length === 0 ? (
                  <p className="text-center py-10 text-slate-400 text-[11px] font-bold uppercase tracking-widest select-none"><span>Nenhum item na mesa.</span></p>
                ) : (
                  <div className="space-y-3">
                    
                    {itensPedidos.map(item => {
                      const itemCatNome = extrairNomeCategoria(item.produto.categoria);
                      
                      return (
                        <div key={item.id} className="flex flex-col p-4 bg-white rounded-[24px] border border-slate-200 shadow-sm relative overflow-hidden hover:border-slate-300 transition-colors">
                          <div className="flex items-start gap-4">
                            
                            <div className="shrink-0">
                              {item.produto.imagem_url ? (
                                <img src={item.produto.imagem_url} alt={item.produto.nome} className="w-[68px] h-[68px] rounded-[18px] object-cover border border-slate-100 shadow-sm" />
                              ) : (
                                <div className="w-[68px] h-[68px] rounded-[18px] bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm">
                                  <IconeCategoria nomeCategoria={itemCatNome} categorias={categorias} className="text-slate-400" size={28} />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 min-h-[68px]">
                              
                              <div className="flex items-start justify-between gap-2 w-full select-none">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-800 text-[12px] leading-tight uppercase truncate">
                                    <span>{item.produto.nome}</span>
                                  </span>
                                  {item.observacao && (
                                    <span className="text-[8px] text-indigo-700 font-bold uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md truncate max-w-full inline-block mt-1.5 self-start">
                                      <span>OBS: {item.observacao}</span>
                                    </span>
                                  )}
                                </div>
                                
                                <button type="button" onClick={() => { setItemEditandoObs(item); setTextoObs(item.observacao || ''); }} className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-200 hover:bg-indigo-50 transition-colors active:scale-90 shrink-0 ml-2 mt-[-2px]">
                                  <LucideIcons.MessageSquarePlus size={13} strokeWidth={2.5}/>
                                </button>
                              </div>

                              <div className="flex items-end justify-between w-full mt-2 select-none">
                                <span className="text-[13px] text-slate-500 font-bold uppercase tracking-widest tabular-nums">
                                  <span>{formatarMoeda(item.produto.preco)}</span>
                                </span>
                                
                                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-[12px] border border-slate-200 shadow-sm shrink-0">
                                  <button type="button" onClick={() => manipularProduto(item.produto, 'menos')} className="w-7 h-7 flex items-center justify-center rounded-[8px] bg-white border border-slate-200 text-rose-500 font-black text-lg hover:bg-rose-50 active:scale-95 active:shadow-inner transition-all">-</button>
                                  <span className="font-black text-slate-800 text-[13px] w-4 text-center tabular-nums"><span>{item.quantidade}</span></span>
                                  <button type="button" onClick={() => manipularProduto(item.produto, 'mais')} className="w-7 h-7 flex items-center justify-center rounded-[8px] bg-teal-50 border border-teal-200 text-teal-600 font-black text-lg hover:bg-teal-100 active:scale-95 active:shadow-inner transition-all">+</button>
                                </div>
                              </div>
                              
                            </div>
                          </div>
                          
                          {item.statusCozinha === 'pronto' && (
                            <button type="button" onClick={() => marcarComoEntregue(item.produto.id)} className="mt-4 w-full bg-gradient-to-b from-teal-400 to-teal-500 border border-teal-500 border-t-teal-300/50 shadow-md shadow-teal-500/30 active:scale-[0.98] active:translate-y-0 active:shadow-inner text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 select-none">
                              <span className="animate-bounce text-base">🔔</span> <span>Entregar na Mesa</span>
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

      <div className="fixed bottom-0 left-0 right-0 p-4 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-2xl pb-safe select-none">
        <div className="flex items-center gap-3 max-w-4xl mx-auto">
          <button type="button" onClick={() => setEtapaModal(1)} className="flex-1 bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest active:scale-95 active:shadow-inner transition-all shadow-sm">
            <span>Encerrar Mesa</span>
          </button>
          <button type="button" onClick={handleConfirmarPedido} className="flex-[1.5] bg-gradient-to-b from-teal-500 to-teal-700 border border-teal-600 border-t-teal-400/50 text-white py-4 rounded-3xl font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-teal-600/30 active:scale-[0.98] active:shadow-inner hover:shadow-xl transition-all flex justify-between px-6 items-center">
            <span>{statusSalvo ? 'Salvo!' : 'Salvar Pedido'}</span>
            {!statusSalvo && <span className="bg-black/15 px-3 py-1 rounded-xl shadow-inner tabular-nums font-black"><span>{formatarMoeda(valorTotalMenu)}</span></span>}
          </button>
        </div>
      </div>

      {itemEditandoObs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 select-none">
          <div className="absolute inset-0" onClick={() => setItemEditandoObs(null)}></div>
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl flex flex-col relative z-50 animate-in zoom-in-95 duration-300 border border-slate-100">
            <h3 className="text-[20px] font-black text-slate-900 mb-1 tracking-tight uppercase"><span>Nota para Cozinha</span></h3>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-6 bg-indigo-50 border border-indigo-100 inline-block px-3 py-1.5 rounded-md truncate max-w-full"><span>{itemEditandoObs.produto.nome}</span></p>
            <textarea autoFocus value={textoObs} onChange={(e) => setTextoObs(e.target.value)} placeholder="Ex: Sem cebola, gelo à parte..." className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-200 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-400/10 resize-none h-32 text-slate-800 font-bold text-sm mb-6 transition-all shadow-inner" />
            <div className="flex gap-3">
              <button type="button" onClick={() => setItemEditandoObs(null)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold py-3.5 rounded-2xl text-[10px] uppercase tracking-widest transition-colors active:scale-95"><span>Cancelar</span></button>
              <button type="button" onClick={salvarObservacao} className="flex-[1.5] bg-gradient-to-b from-indigo-500 to-indigo-600 border border-indigo-600 text-white font-bold uppercase tracking-widest py-3.5 rounded-2xl shadow-md text-[11px] active:scale-95 transition-all"><span>Salvar Nota</span></button>
            </div>
          </div>
        </div>
      )}

      {etapaModal > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-300 select-none">
          <div className="fixed inset-0" onClick={() => setEtapaModal(0)}></div>
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative z-50 my-auto overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-100">
            
            {etapaModal === 1 && (
              <div className="w-full flex flex-col items-center">
                <div className="w-18 h-18 bg-rose-50 rounded-2xl flex items-center justify-center mb-5 text-rose-600 border border-rose-100 shadow-sm"><LucideIcons.AlertTriangle size={36} strokeWidth={2.5}/></div>
                <h3 className="text-2xl font-black text-slate-900 text-center mb-2 tracking-tight uppercase"><span>Fechar Conta?</span></h3>
                <p className="text-center text-slate-500 font-bold mb-8 text-[11px] uppercase tracking-widest leading-relaxed"><span>A mesa não receberá mais itens.</span></p>
                <div className="flex gap-5 w-full">
                  <button type="button" onClick={() => setEtapaModal(0)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2 rounded-4xl hover:bg-slate-300 text-[12px] uppercase tracking-widest transition-all active:scale-95"><span>NÃO</span></button>
                  <button type="button" onClick={() => setEtapaModal(2)} className="flex-1 bg-gradient-to-b from-rose-600 to-rose-700 border border-rose-700 text-white font-bold py-2 rounded-4xl shadow-md active:scale-95 transition-all text-[12px] uppercase tracking-widest"><span>Sim</span></button>
                </div>
              </div>
            )}

            {etapaModal === 2 && (
              <div className="w-full flex flex-col items-center">
                <div className="w-18 h-18 bg-teal-50 rounded-2xl flex items-center justify-center mb-5 text-teal-600 border border-teal-100 shadow-sm">
                  <LucideIcons.Umbrella size={36} strokeWidth={2.5} />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 text-center mb-5 tracking-tight uppercase">
                  <span>Taxa Guarda-Sol</span>
                </h3>
                
                <div className="w-full bg-slate-50 p-5 rounded-3xl mb-6 border border-slate-400 shadow-inner">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-600 mb-5">
                    <span><span>Consumo</span></span>
                    <span className="tabular-nums"><span>{formatarMoeda(valorTotalMenu)}</span></span>
                  </div>
                  
                  <div className="flex flex-col gap-4 border-b border-slate-300 pb-5 mb-5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-teal-700">
                      <span>Valor Taxa</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[19px] font-black text-slate-500">
                        <span>R$</span>
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={inputTaxa}
                        onChange={(e) => setInputTaxa(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder="0,00"
                        className="w-full bg-white pl-14 pr-4 py-3 rounded-xl border border-slate-300 outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-600/10 font-black text-[20px] text-slate-700 transition-all shadow-sm tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-[12px] uppercase tracking-widest"><span>Total Final</span></span>
                    <span className="text-3xl font-black tracking-tight tabular-nums text-teal-700">
                      <span>{formatarMoeda(valorTotalMenu + (parseFloat(inputTaxa.replace(',', '.')) || 0))}</span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-5 w-full">
                  <button type="button" onClick={avancaParaPagamento} className="w-full bg-gradient-to-b from-teal-800 to-teal-950 border border-teal-900 text-white font-bold py-3 rounded-4xl shadow-lg active:scale-[0.98] transition-all text-[12px] uppercase tracking-widest">
                    <span>Avançar para Pagamento</span>
                  </button>
                  <button type="button" onClick={() => setEtapaModal(1)} className="text-[12px] font-bold text-slate-800 uppercase tracking-widest text-center py-2 hover:text-slate-800 transition-colors">
                    <span>&larr; Voltar</span>
                  </button>
                </div>
              </div>
            )}

            {etapaModal === 3 && (
              <div className="w-full flex flex-col">
                <h3 className="text-2xl font-black text-slate-900 text-center mb-6 tracking-tight uppercase"><span>Pagamento</span></h3>
                <div className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl mb-4 border border-slate-200 shadow-inner">
                  <span className="font-bold text-slate-600 uppercase tracking-widest text-[12px]"><span>Total a Pagar</span></span>
                  <span className="font-black text-3xl text-slate-800 tracking-tight tabular-nums"><span>{formatarMoeda(totalCobrarFinal)}</span></span>
                </div>
                
                {pagamentosLancados.length > 0 && (
                  <div className="mb-4 space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-hide">
                    {pagamentosLancados.map((pag, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3.5 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100 shadow-sm">
                        <span className="font-black uppercase tracking-widest text-[12px] flex items-center gap-2"><span>✅ {pag.metodo}</span></span>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-[15px] tabular-nums"><span>{formatarMoeda(pag.valor)}</span></span>
                          <button type="button" onClick={() => handleRemoverPagamento(idx)} className="w-7 h-7 flex items-center justify-center bg-white rounded-full text-rose-500 border border-teal-100 shadow-sm active:scale-90 hover:bg-rose-50 transition-colors"><LucideIcons.X size={12} strokeWidth={4}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {faltaPagar > 0 ? (
                  <div className="space-y-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center mb-1"><span className="text-[12px] font-bold text-rose-500 uppercase tracking-widest"><span>Restante</span></span><span className="font-bold text-rose-500 text-lg tabular-nums"><span>{formatarMoeda(faltaPagar)}</span></span></div>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-[14px] font-bold text-slate-400"><span>R$</span></span>
                      <input type="text" inputMode="decimal" value={valorDigitado} onChange={(e) => setValorDigitado(e.target.value)} placeholder={faltaPagar.toFixed(2)} className="w-full bg-slate-50 pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-400 focus:bg-white font-black text-[20px] text-slate-800 transition-all shadow-inner tabular-nums" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button type="button" onClick={() => handleAdicionarPagamento('PIX')} className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-black py-3 rounded-xl text-[12px] uppercase tracking-widest border border-indigo-200 active:scale-95 transition-all"><span>PIX</span></button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Crédito')} className="bg-amber-50 text-amber-600 hover:bg-amber-100 font-black py-3 rounded-xl text-[12px] uppercase tracking-widest border border-amber-200 active:scale-95 transition-all"><span>Crédito</span></button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Débito')} className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-black py-3 rounded-xl text-[12px] uppercase tracking-widest border border-blue-200 active:scale-95 transition-all"><span>Débito</span></button>
                      <button type="button" onClick={() => handleAdicionarPagamento('Dinheiro')} className="bg-teal-50 text-teal-600 hover:bg-teal-100 font-black py-3 rounded-xl text-[12px] uppercase tracking-widest border border-teal-200 active:scale-95 transition-all"><span>Dinheiro</span></button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 bg-gradient-to-b from-slate-700 to-slate-600 border border-slate-400 text-white rounded-4xl shadow-lg animate-in zoom-in-95 duration-300">
                    <span className="font-bold text-[11px] uppercase tracking-widest block"><span>Conta Paga com sucesso ✅</span></span>
                    {troco > 0 && <span className="font-bold text-teal-100 mt-2 block bg-black/15 mx-4 py-2 rounded-xl border border-white/20 text-xs shadow-inner"><span>Devolver Troco: </span><span className="font-black text-white tabular-nums text-sm ml-1"><span>{formatarMoeda(troco)}</span></span></span>}
                  </div>
                )}
                
                <div className="flex gap-6 mt-10">
                  <button type="button" onClick={() => setEtapaModal(2)} className="flex-1 bg-slate-200 text-slate-500 hover:bg-slate-200 font-bold uppercase tracking-widest py-2 rounded-4xl transition-colors text-[11px] active:scale-95"><span>Voltar</span></button>
                  <button type="button" disabled={faltaPagar > 0.01} onClick={concluirMesaFinal} className={`flex-1 text-white font-bold py-2 rounded-4xl transition-all text-[11px] uppercase tracking-widest ${faltaPagar <= 0.01 ? 'bg-gradient-to-b from-teal-700 to-teal-800 border border-teal-800 shadow-lg active:scale-[0.98]' : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'}`}><span>Encerrar Mesa</span></button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}