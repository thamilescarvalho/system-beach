// src/pages/Estoque.tsx
import { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Produto } from '../types';

export function Estoque() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  const produtos = useMemo(() => contexto?.produtos || [], [contexto?.produtos]);
  const historicoEntradas = contexto?.historicoEstoque || [];
  const historicoVendas = contexto?.historicoVendas || [];
  const garcomLogado = contexto?.garcomLogado;

  const produtosComEstoque = produtos.filter(p => p.estoque !== undefined);

  // ESTADOS PRINCIPAIS
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'saldo' | 'historico'>('saldo');
  
  // ESTADOS DOS MODAIS
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null);
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [modalInventarioAberto, setModalInventarioAberto] = useState(false);
  const [modalNovoProduto, setModalNovoProduto] = useState(false);
  
  // ESTADOS DO MODAL DE NOVA CATEGORIA
  const [modalNovaCategoriaAberto, setModalNovaCategoriaAberto] = useState(false);
  const [textoNovaCategoria, setTextoNovaCategoria] = useState('');
  const [categoriasExtras, setCategoriasExtras] = useState<string[]>([]); 
  
  // ESTADOS DO CADASTRO E EDIÇÃO
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [novoProdNome, setNovoProdNome] = useState('');
  const [novoProdCat, setNovoProdCat] = useState('');
  const [novoProdVenda, setNovoProdVenda] = useState('');
  const [novoProdCusto, setNovoProdCusto] = useState('');
  const [novoProdAtivo, setNovoProdAtivo] = useState(true);

  const [qtdForm, setQtdForm] = useState('');
  const [custoDigitado, setCustoDigitado] = useState('');

  // Categorias cadastradas no sistema
  const categoriasPuras = useMemo(() => {
    return Array.from(new Set(produtos.map(p => p.categoria))).filter(Boolean);
  }, [produtos]);

  const todasCategoriasDropdown = Array.from(new Set([...categoriasPuras, ...categoriasExtras]));

  const produtosExibidos = useMemo(() => {
    return produtosComEstoque.filter(p => {
      const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
      const matchCategoria = !categoriaAtiva || p.categoria === categoriaAtiva;
      return matchBusca && matchCategoria;
    });
  }, [produtosComEstoque, busca, categoriaAtiva]);

  // DASHBOARD ESTRATÉGICO
  const produtosEmCritico = produtosComEstoque.filter(p => p.ativo && (p.estoque || 0) <= 10).sort((a, b) => (a.estoque || 0) - (b.estoque || 0));
  
  const vendasValidas = historicoVendas.filter(v => v.status !== 'cancelada');
  const qtdVendidaPorId = vendasValidas.reduce((acc, venda) => {
    venda.itens.forEach(item => {
      if (item.produto.id !== 999) acc[item.produto.id] = (acc[item.produto.id] || 0) + item.quantidade;
    });
    return acc;
  }, {} as Record<number, number>);

  const produtosRankeados = produtosComEstoque
    .map(p => ({ ...p, qtdVendida: qtdVendidaPorId[p.id] || 0 }))
    .sort((a, b) => b.qtdVendida - a.qtdVendida);

  const maisVendidos = produtosRankeados.filter(p => p.qtdVendida > 0).slice(0, 3);

  const getEmojiParaCategoria = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes('cerveja')) return '🍺';
    if (n.includes('drink') || n.includes('destilado')) return '🍹';
    if (n.includes('bebida') || n.includes('refrigerante') || n.includes('agua') || n.includes('água') || n.includes('suco')) return '🥤';
    if (n.includes('petisco') || n.includes('porção') || n.includes('frita')) return '🍟';
    if (n.includes('prato') || n.includes('refeição')) return '🍲';
    if (n.includes('sobremesa') || n.includes('doce')) return '🍨';
    if (n.includes('combo')) return '🍔';
    return '📦'; 
  };

  // CADASTRO E EDIÇÃO
  const abrirModalNovoProduto = () => {
    setEditandoId(null);
    setCategoriasExtras([]); 
    if (categoriasPuras.length > 0) { setNovoProdCat(categoriasPuras[0]); } else { setNovoProdCat(''); }
    setNovoProdNome(''); setNovoProdVenda(''); setNovoProdCusto(''); setNovoProdAtivo(true);
    setModalNovoProduto(true);
  };

  const abrirModalEditarProduto = (produto: Produto) => {
    setEditandoId(produto.id);
    setCategoriasExtras([]); 
    setNovoProdNome(produto.nome);
    setNovoProdCat(produto.categoria);
    setNovoProdVenda(produto.preco.toString());
    setNovoProdCusto((produto.precoCusto || 0).toString());
    setNovoProdAtivo(produto.ativo !== false);
    setProdutoDetalhe(null); 
    setModalNovoProduto(true); 
  };

  const handleSalvarNovaCategoria = () => {
    if (!textoNovaCategoria.trim()) return;
    setCategoriasExtras(prev => [...prev, textoNovaCategoria]);
    setNovoProdCat(textoNovaCategoria); 
    setModalNovaCategoriaAberto(false);
    setTextoNovaCategoria('');
  };

  const handleSalvarProduto = () => {
    if (!novoProdNome || !novoProdCat || !novoProdVenda) { alert('Preencha nome, categoria e preço de venda!'); return; }
    
    const dadosSalvar = {
      nome: novoProdNome, 
      categoria: novoProdCat, 
      preco: parseFloat(novoProdVenda.replace(',', '.')) || 0,
      precoCusto: parseFloat(novoProdCusto.replace(',', '.')) || 0, 
      ativo: novoProdAtivo
    };

    if (editandoId) {
      if (contexto?.editarProduto) { contexto.editarProduto(editandoId, dadosSalvar); }
    } else {
      contexto?.adicionarProduto({ ...dadosSalvar, estoque: 0 });
    }

    setModalNovoProduto(false); 
    setNovoProdNome(''); setNovoProdCat(''); setNovoProdVenda(''); setNovoProdCusto(''); setNovoProdAtivo(true); setEditandoId(null);
  };

  const handleExcluirProduto = (id: number) => {
    if (confirm('Tem certeza que deseja excluir definitivamente este produto?')) { contexto?.excluirProduto(id); setProdutoDetalhe(null); }
  };

  const handleToggleStatus = (id: number) => { contexto?.alternarStatusProduto(id); setProdutoDetalhe(null); };

  const handleConfirmarEntrada = () => {
    if (produtoDetalhe && qtdForm !== '' && custoDigitado !== '') {
      const qtd = parseInt(qtdForm) || 0; const custo = parseFloat(custoDigitado.replace(',', '.')) || 0;
      if (qtd <= 0) { alert('A quantidade deve ser maior que zero.'); return; }
      contexto?.darEntradaEstoque(produtoDetalhe.id, qtd, custo, garcomLogado?.nome || 'Admin');
      fecharModais();
    }
  };

  const handleConfirmarInventario = () => {
    if (produtoDetalhe && qtdForm !== '') {
      const qtdFisica = parseInt(qtdForm) || 0;
      if (qtdFisica < 0) { alert('O estoque não pode ser negativo.'); return; }
      contexto?.registrarInventario(produtoDetalhe.id, qtdFisica, garcomLogado?.nome || 'Admin');
      fecharModais();
    }
  };

  const fecharModais = () => { setModalEntradaAberto(false); setModalInventarioAberto(false); setQtdForm(''); setCustoDigitado(''); setProdutoDetalhe(null); };

  const getStatusEstoque = (qtd: number, ativo: boolean) => {
    if (!ativo) return { cor: 'text-slate-500', bg: 'bg-slate-200', barra: 'bg-slate-300', texto: 'Inativo' };
    if (qtd <= 10) return { cor: 'text-rose-600', bg: 'bg-rose-100', barra: 'bg-rose-500', texto: 'Crítico' };
    if (qtd <= 30) return { cor: 'text-amber-600', bg: 'bg-amber-100', barra: 'bg-amber-500', texto: 'Alerta' };
    return { cor: 'text-emerald-600', bg: 'bg-emerald-100', barra: 'bg-emerald-500', texto: 'Normal' };
  };

  const formatarMoeda = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarHora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatarData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

  const renderProdutoCard = (produto: Produto) => {
    const estoqueAtual = produto.estoque || 0;
    const ativo = produto.ativo !== false;
    const status = getStatusEstoque(estoqueAtual, ativo);
    const percentual = Math.min(100, (estoqueAtual / 100) * 100); 

    return (
      <button key={produto.id} onClick={() => setProdutoDetalhe(produto)}
        className={`w-full p-5 rounded-[28px] shadow-sm border flex flex-col justify-between min-h-35 transition-all text-left group
          ${ativo ? 'bg-white/80 backdrop-blur-md border-slate-200 hover:border-green-700 hover:shadow-md hover:-translate-y-1 active:translate-y-0' : 'bg-slate-100/50 border-slate-200 opacity-70 grayscale-50 active:scale-[0.98]'}
        `}
      >
        <div className="flex justify-between items-start gap-2 mb-3 w-full">
          <h3 className={`font-black text-[13px] leading-snug line-clamp-2 pr-2 ${ativo ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{produto.nome}</h3>
          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md shrink-0 shadow-sm ${status.bg} ${status.cor}`}>{status.texto}</span>
        </div>
        <div className="mt-auto w-full">
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Custo Un.</span>
              <span className="font-black text-slate-700 text-xs">{formatarMoeda(produto.precoCusto || 0)}</span>
            </div>
            <div className="text-right">
              <span className="font-black text-slate-900 text-2xl leading-none">{estoqueAtual}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">un</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden shadow-inner">
            <div className={`h-full ${status.barra} transition-all duration-500`} style={{ width: `${percentual}%` }} />
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 relative overflow-hidden">
      
      {/* 🔮 EFEITOS FUTURISTAS DE FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER SUPERIOR (Glassmorphism) */}
      <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-[0_4px_15px_rgba(0,0,0,0.02)] px-6 py-4 flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm rounded-full text-slate-600 active:scale-90 transition-all hover:bg-slate-50"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-b from-slate-700 to-slate-950 tracking-tighter drop-shadow-sm leading-none">
              ESTOQUE
            </h1>
          </div>
        </div>
        
        <button 
          onClick={abrirModalNovoProduto} 
          className="flex items-center gap-3 bg-linear-to-b from-zinc-900 to-zinc-600 border border-zinc-400 shadow-[0_4px_0_#0f172a] active:shadow-none active:translate-y-1 px-4 py-2 rounded-3xl text-[10px] font-bold uppercase tracking-widest text-white transition-all"
        >
          <span>Novo Produto</span><span className="text-lg leading-none mb-1">+</span>
        </button>
      </header>

      {/* SELETOR DE ABAS */}
      <div className="flex bg-white/80 backdrop-blur-md border-b border-slate-200 relative z-10">
        <button onClick={() => setAbaAtiva('saldo')} className={`flex-1 py-3 font-bold text-[11px] uppercase tracking-[0.2em] border-b-2 transition-all ${abaAtiva === 'saldo' ? 'border-zinc-400 text-slate-900' : 'border-transparent text-zinc-400 hover:text-slate-600'}`}>Painel de Estoque</button>
        <button onClick={() => setAbaAtiva('historico')} className={`flex-1 py-3 font-bold text-[11px] uppercase tracking-[0.2em] border-b-2 transition-all ${abaAtiva === 'historico' ? 'border-zinc-400 text-slate-900' : 'border-transparent text-zinc-400 hover:text-slate-600'}`}>Histórico</button>
      </div>

      <main className="max-w-5xl mx-auto p-5 space-y-5 mt-5 relative z-10">
        {abaAtiva === 'saldo' && (
          <>
            {!categoriaAtiva && busca === '' ? (
              <div className="animate-in fade-in duration-300">
                
                {/* BUSCA */}
                <div className="relative mb-10 max-w-xl mx-auto">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-zinc-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                  <input type="text" placeholder="Pesquisar produto" value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-40 pr-2 py-2 bg-white/90 backdrop-blur- border border-zinc-300 rounded-4xl shadow-xl focus:outline-none focus:ring-1 focus:ring-green-700 font-bold text-slate-800 transition-all" />
                </div>

                <h2 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase text-center mb-6 flex items-center justify-center gap-3">
                  <div className="w-10 h-px bg-slate-300"></div> Categorias <div className="w-10 h-px bg-slate-300"></div>
                </h2>
                
                {categoriasPuras.length === 0 ? (
                  <div className="text-center py-12 bg-white/50 backdrop-blur-sm rounded-4xl border border-dashed border-slate-300">
                    <p className="text-slate-500 font-bold text-sm">O estoque está vazio. Adicione um produto primeiro.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {categoriasPuras.map(cat => {
                      const itensNessaCat = produtosComEstoque.filter(p => p.categoria === cat).length;
                      return (
                        <button key={cat} onClick={() => setCategoriaAtiva(cat)} className="bg-white/90 backdrop-blur-sm border border-slate-200 p-4 rounded-[28px] flex items-center gap-4 shadow-sm hover:border-slate-500 hover:shadow-md transition-all active:scale-95 group text-left overflow-hidden">
                          <div className="w-14 h-14 bg-linear-to-br from-slate-50 to-slate-100 border border-slate-100 rounded-[18px] flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shrink-0 shadow-inner">{getEmojiParaCategoria(cat)}</div>
                          <div className="overflow-hidden">
                            <span className="font-black text-slate-800 text-[13px] block truncate mb-0.5">{cat}</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest inline-block truncate bg-slate-100 px-2 py-0.5 rounded-md">{itensNessaCat} Itens</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* VISÃO ESTRATÉGICA (Dashboard) */}
                <div className="mt-10 pt-8 border-t border-slate-200 border-dashed space-y-5">
                  <h2 className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase text-center flex items-center justify-center gap-3">
                    <div className="w-10 h-px bg-slate-300"></div> Visão Estratégica <div className="w-10 h-px bg-slate-300"></div>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Alertas de Reposição */}
                    <div className="bg-white/80 backdrop-blur-md rounded-4xl p-6 shadow-sm border border-slate-200 h-full">
                      <h3 className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 mb-5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]"></span> Alertas de Reposição
                      </h3>
                      {produtosEmCritico.length === 0 ? (
                         <div className="text-center py-3 bg-slate-50 rounded-[50px] border border-slate-300"><p className="text-slate-500 font-semi text-xs uppercase tracking-widest">Estoque Seguro</p></div>
                      ) : (
                        <div className="space-y-3">
                          {produtosEmCritico.slice(0, 4).map(p => (
                            <button key={p.id} onClick={() => setProdutoDetalhe(p)} className="w-full flex justify-between items-center text-left hover:bg-slate-50 p-2.5 -mx-2.5 rounded-xl transition-colors group">
                              <span className="font-bold text-slate-700 text-sm line-clamp-1 pr-2 group-hover:text-rose-600 transition-colors">{p.nome}</span>
                              <span className="bg-rose-50 text-rose-600 border border-rose-100 font-black text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-lg shrink-0 shadow-sm">Resta {p.estoque}</span>
                            </button>
                          ))}
                          {produtosEmCritico.length > 4 && <p className="text-[10px] text-slate-400 font-bold text-center mt-3 uppercase tracking-widest">+ {produtosEmCritico.length - 4} itens críticos</p>}
                        </div>
                      )}
                    </div>

                    {/* Mais Vendidos */}
                    <div className="bg-white/80 backdrop-blur-md rounded-4xl p-6 shadow-sm border border-slate-200 h-full">
                      <h3 className="text-[10px] font-bold text-black uppercase tracking-widest flex items-center gap-2 mb-5">
                        🔥 Mais Vendidos do Mês
                      </h3>
                      {maisVendidos.length === 0 ? (
                         <div className="text-center py-3 bg-slate-50 rounded-[50px] border border-slate-300"><p className="text-slate-500 font-semi text-xs uppercase tracking-widest">Sem vendas registradas.</p></div>
                      ) : (
                        <div className="space-y-3">
                          {maisVendidos.map((p, index) => (
                            <button key={p.id} onClick={() => setProdutoDetalhe(p)} className="w-full flex justify-between items-center text-left hover:bg-slate-50 p-2.5 -mx-2.5 rounded-xl transition-colors group">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-500 text-[10px] shadow-inner">{index + 1}º</span>
                                <span className="font-bold text-slate-700 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">{p.nome}</span>
                              </div>
                              <span className="text-indigo-600 font-black text-[10px] uppercase tracking-widest shrink-0 bg-indigo-50 px-2 py-1 rounded-lg">{p.qtdVendida}x saídas</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              /* PRODUTOS DA CATEGORIA OU BUSCA */
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  {categoriaAtiva && busca === '' ? (
                    <div className="flex items-center gap-4">
                      <button onClick={() => setCategoriaAtiva(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-500 active:scale-90 shadow-sm transition-transform hover:bg-slate-50"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
                      <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                          <span className="bg-white w-10 h-10 rounded-[14px] flex items-center justify-center border border-slate-200 shadow-sm text-2xl">{getEmojiParaCategoria(categoriaAtiva)}</span>
                          {categoriaAtiva}
                        </h2>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{produtosExibidos.length} Produtos Cadastrados</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 w-full relative">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>
                      <input type="text" autoFocus placeholder="Buscando produto..." value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-14 pr-12 py-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-3xl shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-400/20 focus:border-emerald-400 font-bold text-slate-800 transition-all" />
                      {busca !== '' && (<button onClick={() => setBusca('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>)}
                    </div>
                  )}
                </div>

                {produtosExibidos.length === 0 ? (
                  <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-4xl border border-dashed border-slate-300"><span className="text-5xl block mb-3 opacity-50">🔍</span><p className="text-slate-500 font-bold text-sm">Nenhum produto encontrado.</p></div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{produtosExibidos.map(renderProdutoCard)}</div>
                )}
              </div>
            )}
          </>
        )}

        {/* ABA: HISTÓRICO DE ENTRADAS */}
        {abaAtiva === 'historico' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300 max-w-4xl mx-auto pt-2">
            {historicoEntradas.length === 0 ? (
              <div className="text-center py-7 bg-white/50 backdrop-blur-sm rounded-4xl border border-dashed border-slate-300"><span className="text-4xl block mb-4">📋</span><p className="text-slate-500 font-semi">Nenhuma movimentação registrada.</p></div>
            ) : (
              historicoEntradas.map(log => (
                <div key={log.id} className="bg-white/90 backdrop-blur-sm p-6 rounded-[28px] border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="space-y-1.5">
                    <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border shadow-sm ${log.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : log.tipo === 'estorno' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {log.tipo === 'entrada' ? `+${log.quantidade} Compra` : log.tipo === 'estorno' ? `+${log.quantidade} Devolução` : `${log.quantidade > 0 ? '+' : ''}${log.quantidade} Ajuste Balanço`}
                    </span>
                    <h4 className="font-black text-slate-800 text-lg tracking-tight pt-1 leading-none">{log.produtoNome}</h4>
                    <p className="text-[11px] text-slate-400 font-bold flex items-center gap-1.5">
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-widest text-[9px]">{log.usuarioNome}</span> 
                      {formatarData(log.data)} às {formatarHora(log.data)}
                    </p>
                  </div>
                  {log.tipo === 'entrada' && (
                    <div className="text-right bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase block tracking-widest mb-0.5">Custo Unit.</span>
                      <span className="font-black text-slate-800 text-lg leading-none">{formatarMoeda(log.precoCusto)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL DE CADASTRO/EDIÇÃO */}
      {modalNovoProduto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalNovoProduto(false)}></div>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-8 text-center tracking-tight">
              {editandoId ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}
            </h3>
            
            <div className="space-y-5">
              
              {/* Toggle de Cardápio */}
              <div className="flex items-center justify-between bg-slate-50 p-2 h-14 rounded-4xl border border-slate-300">
                <div>
                  <p className="text-[9px] font-bold text-black uppercase ml-3 tracking-widest">Ativo no Cardápio</p>
                </div>
                <button onClick={() => setNovoProdAtivo(!novoProdAtivo)} className={`w-14 h-8 rounded-full p-1 transition-colors ${novoProdAtivo ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                  <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform ${novoProdAtivo ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Input Nome */}
              <div>
                <label className="text-[10px] font-bold text-black uppercase ml-4 tracking-widest block mb-2">Nome do Produto</label>
                <input 
                  type="text" 
                  value={novoProdNome} 
                  onChange={e => setNovoProdNome(e.target.value)} 
                  className="w-full bg-slate-50/70 p-5 h-14 rounded-4xl outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/50 font-semi text-zinc-700 border border-slate-200 transition-all"
                />
              </div>

              {/* Select Categoria */}
              <div>
                <div className="flex items-center justify-between ml-2 mb-2">
                  <label className="text-[10px] font-bold text-black uppercase ml-2 tracking-widest">Categoria</label>
                  <button onClick={() => setModalNovaCategoriaAberto(true)} className="text-[9px] font-bold text-black hover:text-emerald-800 transition-colors uppercase tracking-widest">
                    + Nova Categoria
                  </button>
                </div>
                <div className="relative">
                  <select 
                    value={novoProdCat} 
                    onChange={e => setNovoProdCat(e.target.value)} 
                    className="w-full bg-slate-50/70 p-5 h-15 rounded-4xl outline-none border border-zinc-300 text-[15px] font-semi text-zinc-800 appearance-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-400/20 transition-all"
                  >
                    {todasCategoriasDropdown.length === 0 && <option value="" disabled>Crie uma categoria</option>}
                    {todasCategoriasDropdown.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              
              {/* Inputs Preço */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-black uppercase ml-6 tracking-widest block mb-2">Compra (R$)</label>
                  <input type="text" placeholder="R$ 0.00" value={novoProdCusto} onChange={e => setNovoProdCusto(e.target.value)} className="w-full bg-zinc-50/70 p-4 h-15 rounded-4xl border border-zinc-200 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-400/20 text-center font-bold text-1xl text-zinc-600 transition-all"/>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-black uppercase ml-10 tracking-widest block mb-2">Venda (R$)</label>
                  <input type="text" placeholder="R$ 0.00" value={novoProdVenda} onChange={e => setNovoProdVenda(e.target.value)} className="w-full bg-zinc-50/70 p-4 h-15 rounded-4xl border border-zinc-200 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-400/20 text-center font-bold text-1xl text-zinc-600 transition-all"/>
                </div>
              </div>
              
              {/* Botões Ação */}
              <div className="flex gap-4 pt-4">
                <button onClick={() => setModalNovoProduto(false)} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-black py-5 rounded-3xl text-xs uppercase tracking-widest transition-all active:scale-95">
                  Cancelar
                </button>
                <button onClick={handleSalvarProduto} className="flex-[1.5] bg-linear-to-b from-zinc-600 to-zinc-800 border border-zinc-400 active:shadow-[0_0px_0_#3730a3,0_0px_0_rgba(79,70,229,0)] active:translate-y-1.5 text-white font-black py-3 rounded-3xl text-xs uppercase tracking-widest transition-all">
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAR CATEGORIA */}
      {modalNovaCategoriaAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalNovaCategoriaAberto(false)}></div>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-xs shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-6 text-center tracking-tight">Nova Categoria</h3>
            
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Nome da Categoria</label>
              <input 
                type="text" 
                autoFocus 
                placeholder="Ex: Sucos Naturais" 
                value={textoNovaCategoria} 
                onChange={e => setTextoNovaCategoria(e.target.value)} 
                className="w-full bg-slate-50/70 p-4 h-15 rounded-[20px] border border-slate-200 outline-none focus:border-zinc-400 focus:ring-4 focus:ring-zinc-400/20 font-bold text-slate-800 transition-all text-center"
              />
            </div>

            <div className="flex flex-col gap-3 pt-6">
              <button onClick={handleSalvarNovaCategoria} className="w-full bg-slate-900 text-white font-bold py-5 rounded-4xlshadow-[0_6px_0_#0f172a] active:shadow-none active:translate-y-1.5 text-xs uppercase tracking-widest transition-all">
                Adicionar
              </button>
              <button onClick={() => setModalNovaCategoriaAberto(false)} className="w-full bg-transparent text-slate-400 hover:text-slate-600 font-bold py-3 rounded-[20px] text-xs uppercase tracking-widest transition-all">
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE PRODUTO (GERENCIAMENTO) */}
      {produtoDetalhe && !modalEntradaAberto && !modalInventarioAberto && !modalNovoProduto && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setProdutoDetalhe(null)}></div>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
              <div className="pr-4">
                <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">{produtoDetalhe.nome}</h3>
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mt-2 inline-block border ${produtoDetalhe.ativo !== false ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {produtoDetalhe.ativo !== false ? '✅ Ativo no Cardápio' : '❌ Oculto'}
                </span>
              </div>
              <div className="text-right bg-slate-50 border border-slate-100 p-3 rounded-[20px]">
                <span className="text-3xl font-black text-slate-900 leading-none block">{produtoDetalhe.estoque || 0}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Estoque</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button onClick={() => setModalEntradaAberto(true)} className="bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 font-black py-4 rounded-3xl shadow-sm text-[10px] uppercase tracking-widest active:scale-95 transition-all flex flex-col items-center justify-center gap-2">
                <span className="text-2xl leading-none">📦</span> Compra
              </button>
              <button onClick={() => setModalInventarioAberto(true)} className="bg-white border border-slate-200 text-slate-700 hover:border-amber-300 font-black py-4 rounded-3xl shadow-sm text-[10px] uppercase tracking-widest active:scale-95 transition-all flex flex-col items-center justify-center gap-2">
                <span className="text-2xl leading-none">⚖️</span> Balanço
              </button>
            </div>
            
            {/* BOTÕES DE GERENCIAMENTO (EDITAR) */}
            <div className="bg-slate-50 p-2 rounded-[28px] border border-slate-200 flex gap-2">
              <button onClick={() => abrirModalEditarProduto(produtoDetalhe)} className="flex-1 bg-white text-slate-700 font-black py-4 rounded-[20px] shadow-sm text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                Editar
              </button>
              <button onClick={() => handleToggleStatus(produtoDetalhe.id)} className="flex-1 bg-white text-slate-600 font-black py-4 rounded-[20px] shadow-sm text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                {produtoDetalhe.ativo !== false ? 'Desativar' : 'Reativar'}
              </button>
            </div>
            
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={() => handleExcluirProduto(produtoDetalhe.id)} className="w-full bg-rose-50 text-rose-600 font-black py-4 rounded-3xl text-[11px] uppercase tracking-widest hover:bg-rose-100 transition-colors border border-rose-100">
                Excluir Produto
              </button>
              <button onClick={() => setProdutoDetalhe(null)} className="w-full text-slate-400 hover:text-slate-600 font-bold py-3 text-[10px] uppercase tracking-widest transition-colors">
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ENTRADA/BALANÇO */}
      {(modalEntradaAberto || modalInventarioAberto) && produtoDetalhe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={fecharModais}></div>
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-linear-to-br from-indigo-50 to-indigo-100 border border-indigo-200 text-indigo-500 rounded-[20px] shadow-inner flex items-center justify-center mx-auto mb-5 text-3xl">
                {modalEntradaAberto ? '📦' : '⚖️'}
              </div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">
                {modalEntradaAberto ? 'Lançar Compra' : 'Ajustar Balanço'}
              </h3>
              <p className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg inline-block uppercase tracking-widest mt-3 border border-indigo-100">{produtoDetalhe.nome}</p>
            </div>

            <div className="space-y-5">
              {modalEntradaAberto ? (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Qtd Comprada</label>
                    <input type="number" value={qtdForm} onChange={e => setQtdForm(e.target.value)} className="w-full bg-slate-50/70 p-4 h-15 rounded-[20px] border border-slate-200 text-center font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all"/>
                  </div>
                  <div className="flex-[1.5]">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-2 tracking-widest block mb-2">Custo Un. (R$)</label>
                    <input type="text" value={custoDigitado} onChange={e => setCustoDigitado(e.target.value)} placeholder="0.00" className="w-full bg-slate-50/70 p-4 h-15 rounded-[20px] border border-slate-200 text-center font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-indigo-400/20 focus:border-indigo-400 transition-all"/>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase text-center block tracking-widest mb-2">Quantidade Real na Prateleira</label>
                  <input type="number" placeholder={`Atualmente: ${produtoDetalhe.estoque}`} value={qtdForm} onChange={e => setQtdForm(e.target.value)} className="w-full bg-slate-50/70 p-6 rounded-3xl border border-slate-200 text-center font-black text-4xl text-slate-800 outline-none focus:ring-4 focus:ring-amber-400/20 focus:border-amber-400 transition-all placeholder:text-slate-200"/>
                </div>
              )}
              <div className="flex gap-4 pt-4">
                <button onClick={fecharModais} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-black py-5 rounded-[20px] text-xs uppercase tracking-widest transition-colors">
                  Cancelar
                </button>
                <button onClick={modalEntradaAberto ? handleConfirmarEntrada : handleConfirmarInventario} className="flex-[1.5] bg-linear-to-b from-indigo-500 to-indigo-600 border border-indigo-400 shadow-[0_6px_0_#3730a3] active:shadow-[0_0px_0_#3730a3] active:translate-y-1.5 text-white font-black py-5 rounded-[20px] text-xs uppercase tracking-widest transition-all">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}