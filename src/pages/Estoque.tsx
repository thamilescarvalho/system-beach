// src/pages/Estoque.tsx
import { useContext, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import type { Produto } from '../types';
import imageCompression from 'browser-image-compression';

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
  const [modalNovaCategoriaAberto, setModalNovaCategoriaAberto] = useState(false);
  
  // ESTADOS DO CADASTRO E EDIÇÃO
  const [textoNovaCategoria, setTextoNovaCategoria] = useState('');
  const [categoriasExtras, setCategoriasExtras] = useState<string[]>([]); 
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [salvandoProduto, setSalvandoProduto] = useState(false);
  
  const [novoProdNome, setNovoProdNome] = useState('');
  const [novoProdCat, setNovoProdCat] = useState('');
  const [novoProdSubCat, setNovoProdSubCat] = useState('');
  const [novoProdImagemUrl, setNovoProdImagemUrl] = useState(''); 
  const [novoProdImagemFile, setNovoProdImagemFile] = useState<File | null>(null); 
  const [imagemPreview, setImagemPreview] = useState<string | null>(null); 
  
  const [novoProdVenda, setNovoProdVenda] = useState('');
  const [novoProdCusto, setNovoProdCusto] = useState('');
  const [novoProdAtivo, setNovoProdAtivo] = useState(true);

  const [qtdForm, setQtdForm] = useState('');
  const [custoDigitado, setCustoDigitado] = useState('');

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

  const produtosEmCritico = produtosComEstoque.filter(p => p.ativo && (p.estoque || 0) <= 10).sort((a, b) => (a.estoque || 0) - (b.estoque || 0));
  
  const vendasValidas = historicoVendas.filter(v => v.status !== 'cancelada');
  const qtdVendidaPorId = vendasValidas.reduce((acc, venda) => {
    venda.itens.forEach(item => { if (item.produto.id !== 999) acc[item.produto.id] = (acc[item.produto.id] || 0) + item.quantidade; });
    return acc;
  }, {} as Record<number, number>);

  const produtosRankeados = produtosComEstoque.map(p => ({ ...p, qtdVendida: qtdVendidaPorId[p.id] || 0 })).sort((a, b) => b.qtdVendida - a.qtdVendida);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNovoProdImagemFile(file);
      setImagemPreview(URL.createObjectURL(file)); 
    }
  };

  const abrirModalNovoProduto = () => {
    setEditandoId(null);
    setCategoriasExtras([]); 
    if (categoriasPuras.length > 0) { setNovoProdCat(categoriasPuras[0]); } else { setNovoProdCat(''); }
    setNovoProdNome(''); setNovoProdSubCat(''); 
    setNovoProdImagemUrl(''); setNovoProdImagemFile(null); setImagemPreview(null);
    setNovoProdVenda(''); setNovoProdCusto(''); setNovoProdAtivo(true);
    setModalNovoProduto(true);
  };

  const abrirModalEditarProduto = (produto: Produto) => {
    setEditandoId(produto.id);
    setCategoriasExtras([]); 
    setNovoProdNome(produto.nome);
    setNovoProdCat(produto.categoria);
    setNovoProdSubCat(produto.subcategoria || '');
    
    setNovoProdImagemUrl(produto.imagem_url || '');
    setNovoProdImagemFile(null);
    setImagemPreview(produto.imagem_url || null);
    
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

  const handleSalvarProduto = async () => {
    if (!novoProdNome || !novoProdCat || !novoProdVenda) { 
      alert('Preencha nome, categoria e preço de venda!'); 
      return; 
    }
    
    setSalvandoProduto(true); 
    let urlFinal = novoProdImagemUrl;

    if (novoProdImagemFile && contexto?.uploadImagemProduto) {
      try {
        // COMPRESSOR DE IMAGEM
        const opcoesCompressao = {
          maxSizeMB: 0.1,          // Força a imagem a ter no máximo 100 KB
          maxWidthOrHeight: 1024,  // Trava a resolução em HD
          useWebWorker: true,      // Não trava a tela enquanto comprime
          initialQuality: 0.8      // Qualidade de 80%
        };
        
        console.log(`Tamanho original: ${(novoProdImagemFile.size / 1024 / 1024).toFixed(3)} MB`);
        
        // Espreme o arquivo
        const arquivoComprimido = await imageCompression(novoProdImagemFile, opcoesCompressao);
        
        console.log(`Tamanho espremido: ${(arquivoComprimido.size / 1024 / 1024).toFixed(3)} MB`);
        // FIM DO COMPRESSOR

        // Envia o arquivo COMPRIMIDO para o Supabase em vez do original
        const urlUploaded = await contexto.uploadImagemProduto(arquivoComprimido);
        if (urlUploaded) {
          urlFinal = urlUploaded;
        }
      } catch (erro) {
        console.error('Erro ao comprimir a imagem:', erro);
        alert('Ocorreu um erro ao processar a foto. Tente uma imagem mais leve.');
        setSalvandoProduto(false);
        return; // Interrompe o salvamento se a foto der erro
      }
    }

    const dadosSalvar = {
      nome: novoProdNome, 
      categoria: novoProdCat, 
      subcategoria: novoProdSubCat,
      imagem_url: urlFinal, 
      preco: parseFloat(novoProdVenda.replace(',', '.')) || 0,
      precoCusto: parseFloat(novoProdCusto.replace(',', '.')) || 0, 
      ativo: novoProdAtivo
    };

    if (editandoId) {
      if (contexto?.editarProduto) { 
        await contexto.editarProduto(editandoId, dadosSalvar); 
      }
    } else {
      if (contexto?.adicionarProduto) { 
        await contexto.adicionarProduto({ ...dadosSalvar, estoque: 0 }); 
      }
    }

    setSalvandoProduto(false);
    setModalNovoProduto(false); 
    
    setNovoProdNome(''); setNovoProdCat(''); setNovoProdSubCat(''); 
    setNovoProdImagemUrl(''); setNovoProdImagemFile(null); setImagemPreview(null); 
    setNovoProdVenda(''); setNovoProdCusto(''); setNovoProdAtivo(true); 
    setEditandoId(null);
  };

  const handleExcluirProduto = (id: number) => { if (confirm('Tem certeza que deseja excluir definitivamente este produto?')) { contexto?.excluirProduto(id); setProdutoDetalhe(null); } };
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

  const formatarHora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatarData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

  const renderProdutoLista = (produto: Produto) => {
    const estoqueAtual = produto.estoque || 0;
    const ativo = produto.ativo !== false;
    const critico = estoqueAtual <= 10;

    return (
      <button key={produto.id} onClick={() => setProdutoDetalhe(produto)}
        className={`w-full flex items-center p-4 rounded-3xl border transition-all text-left transform-style-3d group hover:-translate-y-1.5 hover:shadow-lg hover:shadow-indigo-500/10 hover:border-indigo-200 active:scale-[0.98] active:translate-y-0 active:shadow-inner
          ${ativo ? 'bg-white border-slate-200 shadow-sm shadow-slate-200/50' : 'bg-slate-50 border-slate-200 opacity-60 saturate-50'}
        `}
      >
        {produto.imagem_url ? (
          <img src={produto.imagem_url} alt={produto.nome} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shrink-0 shadow-sm shadow-slate-300/50 transition-transform group-hover:scale-105" />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl shrink-0 border border-slate-200 shadow-inner shadow-slate-200/50 transition-transform group-hover:scale-105">
            {getEmojiParaCategoria(produto.categoria)}
          </div>
        )}

        <div className="flex-1 px-4 min-w-0">
          <h3 className={`text-base font-black tracking-tight truncate ${ativo ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{produto.nome}</h3>
          
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{produto.categoria}</span>
            {produto.subcategoria && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate">{produto.subcategoria}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right pl-3 flex flex-col items-end shrink-0">
          <div className="flex items-baseline gap-1">
            <span className={`text-[22px] font-black leading-none tabular-nums ${critico && ativo ? 'text-rose-500' : 'text-slate-800'}`}>{estoqueAtual}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">un</span>
          </div>
          {ativo && critico && <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 mt-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Baixo</span>}
          {!ativo && <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Inativo</span>}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-200 font-sans pb-24 relative overflow-hidden perspective-distant">
      
      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-100 max-h-100 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-100 max-h-100 bg-rose-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

      {/* HEADER  */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm shadow-slate-200/50 px-4 md:px-8 py-4 flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin')} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 shadow-sm shadow-slate-200/50 rounded-2xl text-slate-600 active:scale-95 active:shadow-inner transition-all hover:bg-slate-50">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-[20px] font-black text-slate-900 tracking-widest uppercase leading-none">ESTOQUE</h1>
            <p className="text-indigo-500 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Controle</p>
          </div>
        </div>
        
        <button onClick={abrirModalNovoProduto} className="flex items-center gap-2 bg-linear-to-b from-indigo-500 to-indigo-600 border border-indigo-600 border-t-indigo-400/50 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 active:shadow-inner px-4 py-2.5 rounded-xl text-[11px] uppercase tracking-widest font-black text-white transition-all active:scale-95">
          <span>+ PRODUTO</span>
        </button>
      </header>

      {/* LAYOUT */}
      <div className="px-4 md:px-8 mb-6 relative z-10 max-w-6xl mx-auto">
        <div className="bg-slate-300/50 p-1 rounded-2xl flex md:max-w-md mx-auto">
          <button 
            onClick={() => setAbaAtiva('saldo')} 
            className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all rounded-xl ${abaAtiva === 'saldo' ? 'bg-white shadow-sm shadow-slate-200/50 text-zinc-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Saldos
          </button>
          <button 
            onClick={() => setAbaAtiva('historico')} 
            className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all rounded-xl ${abaAtiva === 'historico' ? 'bg-white shadow-sm shadow-slate-200/50 text-zinc-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Movimentos
          </button>
        </div>
      </div>

      {/* DESKTOP */}
      <main className="w-full max-w-6xl mx-auto px-4 md:px-8 space-y-8 relative z-10">
        {abaAtiva === 'saldo' && (
          <div className="animate-in fade-in duration-300">
            
            <div className="relative mb-8 max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <input 
                type="text" 
                placeholder="Buscar produto" 
                value={busca} 
                onChange={(e) => setBusca(e.target.value)} 
                className="w-full pl-12 pr-12 py-4 bg-white border border-slate-200 rounded-[20px] shadow-sm shadow-slate-200/50 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 focus:border-zinc-500 font-bold text-sm text-slate-800 transition-all placeholder:font-medium placeholder:uppercase placeholder:text-[11px] placeholder:tracking-widest" 
              />
              {/* Botão para limpar a busca */}
              {busca !== '' && (
                <button onClick={() => setBusca('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
              )}
            </div>

            {!categoriaAtiva && busca === '' ? (
              <div className="animate-in fade-in duration-300">
                <h2 className="text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-4 pl-1">Filtrar por Categoria</h2>
                
                {categoriasPuras.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300"><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Estoque vazio.</p></div>
                ) : (
                  // GRID CATEGORIAS
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                    {categoriasPuras.map(cat => {
                      const itensNessaCat = produtosComEstoque.filter(p => p.categoria === cat).length;
                      return (
                        <button key={cat} onClick={() => setCategoriaAtiva(cat)} className="bg-white border border-slate-200 p-4 rounded-3xl flex flex-col items-center gap-2 shadow-sm shadow-slate-200/50 hover:border-zinc-400 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-zinc-500/10 transition-all active:scale-[0.96] active:shadow-inner active:translate-y-0">
                          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 shadow-inner shadow-slate-200/50">{getEmojiParaCategoria(cat)}</div>
                          <div className="text-center w-full">
                            <span className="font-bold text-slate-700 text-xs block truncate uppercase tracking-wider">{cat}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{itensNessaCat} Itens</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="mt-10 pt-8 border-t border-slate-200/60">
                  <h2 className="text-[11px] font-bold text-slate-500 tracking-widest uppercase mb-4 pl-1">Visão Geral</h2>
                  
                  {/* GRID WIDGETS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                    
                    {/* WIDGET REPOSIÇÃO */}
                    <div className="bg-white rounded-[28px] p-5 shadow-sm shadow-slate-200/50 border-t-4 border-rose-500 border-x border-b border-x-slate-200 border-b-slate-200">
                      <h3 className="text-[12px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span> Urgente
                      </h3>
                      {produtosEmCritico.length === 0 ? (
                         <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100"><p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Estoque Seguro</p></div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {produtosEmCritico.slice(0, 4).map(p => (
                            <button key={p.id} onClick={() => setProdutoDetalhe(p)} className="flex justify-between items-center bg-rose-50/50 p-3 rounded-xl border border-rose-100 hover:bg-rose-50 transition-colors">
                              <span className="font-bold text-slate-700 text-xs truncate pr-2 uppercase tracking-wide">{p.nome}</span>
                              <span className="text-rose-600 font-bold text-[10px] uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-rose-100 shadow-sm shadow-rose-200/50 shrink-0">Resta {p.estoque}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* WIDGET MAIS VENDIDOS */}
                    <div className="bg-white rounded-[28px] p-5 shadow-sm shadow-slate-200/50 border-t-4 border-amber-400 border-x border-b border-x-slate-200 border-b-slate-200">
                      <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">⭐ Populares</h3>
                      {maisVendidos.length === 0 ? (
                         <div className="text-center py-4 bg-slate-50 rounded-xl border border-slate-100"><p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sem vendas</p></div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {maisVendidos.map((p, index) => (
                            <button key={p.id} onClick={() => setProdutoDetalhe(p)} className="flex justify-between items-center p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-7 h-7 shrink-0 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-black text-[10px]">{index + 1}º</span>
                                <span className="font-bold text-slate-700 text-xs truncate uppercase tracking-wide">{p.nome}</span>
                              </div>
                              <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest shrink-0 ml-2">{p.qtdVendida}x</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center gap-4 mb-6">
                  {categoriaAtiva && (
                    <button onClick={() => { setCategoriaAtiva(null); setBusca(''); }} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 hover:bg-slate-50 transition-colors shadow-sm shadow-slate-200/50 active:scale-95">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                  )}
                  <h2 className="text-sm font-bold tracking-tight text-slate-600 uppercase">
                    {categoriaAtiva ? `CATEGORIA: ${categoriaAtiva}` : 'Resultados da Busca'}
                  </h2>
                </div>

                {produtosExibidos.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300"><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum produto encontrado.</p></div>
                ) : (
                  // GRID DE PRODUTOS
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                    {produtosExibidos.map(renderProdutoLista)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="animate-in slide-in-from-bottom-4 duration-300">
            {historicoEntradas.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300"><p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhuma movimentação.</p></div>
            ) : (
              // GRID HISTÓRICO
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                {historicoEntradas.map(log => (
                  <div key={log.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm shadow-slate-200/50 flex items-center justify-between hover:shadow-md hover:border-slate-300 hover:-translate-y-1 transition-all duration-300 active:scale-[0.98] active:translate-y-0 active:shadow-inner">
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest border ${log.tipo === 'entrada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : log.tipo === 'estorno' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {log.tipo === 'entrada' ? 'Compra' : log.tipo === 'estorno' ? 'Estorno' : 'Ajuste'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm tracking-tight uppercase truncate">{log.produtoNome}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        {formatarData(log.data)} às {formatarHora(log.data)}<br/>Por: {log.usuarioNome}
                      </p>
                    </div>
                    <div className="text-right pl-3 border-l border-slate-100 shrink-0">
                      <span className={`font-black text-[22px] tabular-nums leading-none ${log.quantidade > 0 ? 'text-emerald-500' : 'text-slate-700'}`}>
                        {log.quantidade > 0 ? '+' : ''}{log.quantidade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DE CADASTRO/EDIÇÃO COM UPLOAD */}
      {modalNovoProduto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="absolute inset-0 min-h-[120%]" onClick={() => !salvandoProduto && setModalNovoProduto(false)}></div>
          <div className="bg-white rounded-[40px] p-6 w-full max-w-md shadow-2xl shadow-slate-900/50 relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 my-auto border border-white/20">
            <h3 className="text-[20px] font-black tracking-tight text-slate-900 mb-6 text-center uppercase">
              {editandoId ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            
            <div className="space-y-4">
              
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-[20px] border border-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600 ml-1">Exibir no Cardápio</p>
                <button onClick={() => setNovoProdAtivo(!novoProdAtivo)} className={`w-12 h-7 rounded-full p-1 transition-colors shadow-inner shadow-slate-300/50 ${novoProdAtivo ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform ${novoProdAtivo ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* AREA DE UPLOAD DE ARQUIVO */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-1.5">Foto do Produto (Opcional)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-200 border-dashed rounded-3xl relative hover:border-indigo-400 hover:bg-slate-50 transition-colors bg-white group cursor-pointer overflow-hidden">
                  {imagemPreview ? (
                    <div className="relative inline-block">
                      <img src={imagemPreview} alt="Preview" className="mx-auto h-28 w-28 object-cover rounded-[20px] shadow-sm border border-slate-200" />
                      <button type="button" onClick={(e) => { e.preventDefault(); setImagemPreview(null); setNovoProdImagemFile(null); setNovoProdImagemUrl(''); }} className="absolute -top-3 -right-3 bg-rose-100 text-rose-600 rounded-full p-1.5 shadow-sm hover:bg-rose-200 transition-colors border border-rose-200">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center pointer-events-none">
                      <div className="mx-auto h-12 w-12 text-slate-400 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center group-hover:text-indigo-500 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors shadow-inner shadow-slate-200/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                        <span className="text-indigo-500">Toque</span> ou arraste a foto
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">PNG, JPG (Máx 5MB)</p>
                    </div>
                  )}
                  {!imagemPreview && (
                    <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/png, image/jpeg, image/jpg, image/webp" onChange={handleImageChange} />
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-1.5">Nome do Produto</label>
                <input type="text" value={novoProdNome} onChange={e => setNovoProdNome(e.target.value)} className="w-full bg-slate-50 p-4 rounded-[20px] border border-slate-200 outline-none focus:border-zinc-500 focus:bg-white font-bold text-slate-800 text-sm transition-all"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Categoria</label>
                    <button onClick={() => setModalNovaCategoriaAberto(true)} className="text-[9px] font-bold text-black hover:text-zinc-800 transition-colors uppercase tracking-widest bg-indigo-50 px-2 py rounded-md border border-zinc-100">+ Nova</button>
                  </div>
                  <select value={novoProdCat} onChange={e => setNovoProdCat(e.target.value)} className="w-full bg-slate-50 p-4 rounded-[20px] border border-slate-200 outline-none text-xs font-bold text-slate-800 focus:border-zinc-500 focus:bg-white transition-all uppercase tracking-wide">
                    {todasCategoriasDropdown.length === 0 && <option value="" disabled>Selecione ou Crie</option>}
                    {todasCategoriasDropdown.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-1.5">Tamanho</label>
                  <input type="text" value={novoProdSubCat} onChange={e => setNovoProdSubCat(e.target.value)} placeholder="600ml" className="w-full bg-slate-50 p-4 rounded-[20px] border border-slate-200 outline-none focus:border-zinc-500 focus:bg-white font-bold text-xs text-slate-800 transition-all tracking-wide"/>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5 text-center">Venda (R$)</label>
                  <input type="text" placeholder="R$ 0.00" value={novoProdVenda} onChange={e => setNovoProdVenda(e.target.value)} className="w-full bg-slate-50 p-4 rounded-[20px] border border-slate-200 outline-none focus:border-emerald-400 focus:bg-white text-center font-bold text-[15px] text-emerald-600 transition-all placeholder:text-slate-300 tabular-nums"/>
                </div>
                <div className="flex-1 relative">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1.5 text-center">Custo (R$)</label>
                  <input type="text" placeholder="R$ 0.00" value={novoProdCusto} onChange={e => setNovoProdCusto(e.target.value)} className="w-full bg-slate-50 p-4 rounded-[20px] border border-slate-200 outline-none focus:border-rose-400 focus:bg-white text-center font-bold text-[15px] text-rose-500 transition-all placeholder:text-slate-300 tabular-nums"/>
                </div>
              </div>
              
              <div className="flex gap-3 pt-5">
                <button onClick={() => !salvandoProduto && setModalNovoProduto(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black uppercase tracking-widest py-4 rounded-[20px] text-[10px] transition-all disabled:opacity-50" disabled={salvandoProduto}>
                  Cancelar
                </button>
                <button onClick={handleSalvarProduto} disabled={salvandoProduto} className="flex-1 bg-linear-to-b from-zinc-500 to-zinc-600 border border-zinc-600 border-t-zinc-400/50 shadow-md shadow-zinc-500/30 text-white font-black uppercase tracking-widest py-4 rounded-[20px] text-[11px] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-zinc-500/40 active:scale-95 active:shadow-inner">
                  {salvandoProduto ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> SALVANDO</>
                  ) : 'SALVAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRIAR CATEGORIA */}
      {modalNovaCategoriaAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalNovaCategoriaAberto(false)}></div>
          <div className="bg-white rounded-4xl p-6 w-full max-w-xs shadow-2xl shadow-slate-900/50 relative animate-in zoom-in-95 duration-200 border border-white/20">
            <h3 className="text-xl font-black tracking-tight text-slate-900 mb-4 text-center uppercase">Nova Categoria</h3>
            <input type="text" autoFocus placeholder="Nome da categoria" value={textoNovaCategoria} onChange={e => setTextoNovaCategoria(e.target.value)} className="w-full bg-slate-50 p-4 rounded-[20px] border border-slate-200 outline-none focus:border-indigo-400 focus:bg-white font-bold text-slate-800 text-center mb-5 uppercase tracking-wider text-sm transition-all"/>
            <div className="flex gap-2">
              <button onClick={() => setModalNovaCategoriaAberto(false)} className="flex-1 bg-slate-100 text-slate-500 font-black uppercase tracking-widest py-3.5 rounded-2xl text-[10px] transition-all hover:bg-slate-200 active:scale-95">Cancelar</button>
              <button onClick={handleSalvarNovaCategoria} className="flex-1 bg-slate-900 text-white font-black uppercase tracking-widest py-3.5 rounded-2xl text-[10px] transition-all hover:bg-slate-800 shadow-md shadow-slate-900/20 active:scale-95">Criar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE PRODUTO */}
      {produtoDetalhe && !modalEntradaAberto && !modalInventarioAberto && !modalNovoProduto && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setProdutoDetalhe(null)}></div>
          <div className="bg-white rounded-[40px] p-6 w-full max-w-sm shadow-2xl shadow-slate-900/50 relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 border border-white/20">
            
            <div className="flex items-center gap-4 mb-6">
              {produtoDetalhe.imagem_url ? (
                 <img src={produtoDetalhe.imagem_url} alt={produtoDetalhe.nome} className="w-20 h-20 rounded-[20px] object-cover border border-slate-200 shadow-md shadow-slate-300/50" />
              ) : (
                 <div className="w-20 h-20 rounded-[20px] bg-slate-50 border border-slate-100 flex items-center justify-center text-4xl shadow-inner shadow-slate-200/50">{getEmojiParaCategoria(produtoDetalhe.categoria)}</div>
              )}
              
              <div className="flex-1 min-w-0">
                <h3 className="text-[20px] font-black text-slate-900 tracking-tight leading-none mb-1.5 truncate uppercase">{produtoDetalhe.nome}</h3>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md inline-block shadow-sm border ${produtoDetalhe.ativo !== false ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {produtoDetalhe.ativo !== false ? 'Cardápio Ativo' : 'Oculto'}
                </span>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{produtoDetalhe.categoria} {produtoDetalhe.subcategoria && `• ${produtoDetalhe.subcategoria}`}</p>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200 flex justify-between items-center mb-6 shadow-inner shadow-slate-200/50">
              <span className="font-black text-slate-400 text-[11px] uppercase tracking-widest">Estoque Atual</span>
              <span className={`text-[32px] font-black tabular-nums leading-none ${produtoDetalhe.estoque && produtoDetalhe.estoque <= 10 && produtoDetalhe.ativo !== false ? 'text-rose-500' : 'text-slate-900'}`}>{produtoDetalhe.estoque || 0}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button onClick={() => setModalEntradaAberto(true)} className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-600 font-black uppercase tracking-widest py-3.5 rounded-2xl shadow-sm shadow-slate-200/50 hover:shadow-md hover:shadow-emerald-500/10 text-[10px] transition-all flex flex-col items-center justify-center gap-1 active:scale-95 active:shadow-inner">
                <span className="text-lg">📦</span> Compra
              </button>
              <button onClick={() => setModalInventarioAberto(true)} className="bg-white border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-600 font-black uppercase tracking-widest py-3.5 rounded-2xl shadow-sm shadow-slate-200/50 hover:shadow-md hover:shadow-amber-500/10 text-[10px] transition-all flex flex-col items-center justify-center gap-1 active:scale-95 active:shadow-inner">
                <span className="text-lg">⚖️</span> Ajuste
              </button>
            </div>
            
            <div className="flex gap-3 mb-4">
              <button onClick={() => abrirModalEditarProduto(produtoDetalhe)} className="flex-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest py-3.5 rounded-2xl text-[10px] transition-all shadow-sm shadow-slate-200/50 hover:shadow-md active:scale-95 active:shadow-inner">Editar</button>
              <button onClick={() => handleToggleStatus(produtoDetalhe.id)} className="flex-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest py-3.5 rounded-2xl text-[10px] transition-all shadow-sm shadow-slate-200/50 hover:shadow-md active:scale-95 active:shadow-inner">
                {produtoDetalhe.ativo !== false ? 'Ocultar' : 'Reativar'}
              </button>
            </div>
            
            <button onClick={() => handleExcluirProduto(produtoDetalhe.id)} className="w-full bg-white text-rose-500 font-black uppercase tracking-widest py-3.5 rounded-2xl border border-rose-200 hover:bg-rose-50 text-[10px] transition-all mb-4 active:scale-95">
              Excluir Produto
            </button>
            
            <button onClick={() => setProdutoDetalhe(null)} className="w-full text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest py-2 text-[10px] transition-colors">Voltar</button>
          </div>
        </div>
      )}

      {/* MODAL ENTRADA/BALANÇO */}
      {(modalEntradaAberto || modalInventarioAberto) && produtoDetalhe && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={fecharModais}></div>
          <div className="bg-white rounded-[40px] p-6 w-full max-w-sm shadow-2xl shadow-slate-900/50 relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 border border-white/20">
            <h3 className="text-[20px] font-black tracking-tight text-slate-900 text-center mb-1 uppercase">
              {modalEntradaAberto ? 'Lançar Compra' : 'Ajustar Balanço'}
            </h3>
            <p className="text-center text-[11px] font-black uppercase tracking-widest text-indigo-500 mb-6 bg-indigo-50 py-1 px-3 rounded-full inline-block mx-auto border border-indigo-100">{produtoDetalhe.nome}</p>

            <div className="space-y-5">
              {modalEntradaAberto ? (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 text-center">Qtd</label>
                    <input type="number" value={qtdForm} onChange={e => setQtdForm(e.target.value)} className="w-full bg-slate-50 p-4 rounded-[20px] border border-slate-200 text-center font-black text-xl text-slate-800 outline-none focus:border-indigo-400 focus:bg-white transition-all"/>
                  </div>
                  <div className="flex-[1.5]">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 text-center">Custo Un. (R$)</label>
                    <input type="text" value={custoDigitado} onChange={e => setCustoDigitado(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 p-4 rounded-[20px] border border-slate-200 text-center font-black text-xl text-slate-800 outline-none focus:border-indigo-400 focus:bg-white transition-all"/>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center block mb-2">Qtd Física (Prateleira)</label>
                  <input type="number" placeholder={`Atualmente: ${produtoDetalhe.estoque}`} value={qtdForm} onChange={e => setQtdForm(e.target.value)} className="w-full bg-slate-50 p-5 rounded-3xl border border-slate-200 text-center font-black text-4xl text-slate-800 outline-none focus:border-amber-400 focus:bg-white placeholder:text-slate-300 transition-all"/>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={fecharModais} className="flex-1 bg-slate-100 text-slate-500 hover:bg-slate-200 font-black uppercase tracking-widest py-4 rounded-3xl text-[10px] transition-colors active:scale-95">Cancelar</button>
                <button onClick={modalEntradaAberto ? handleConfirmarEntrada : handleConfirmarInventario} className={`flex-1 text-white font-black uppercase tracking-widest py-4 rounded-3xl text-[11px] transition-all shadow-md active:scale-95 active:shadow-inner ${modalEntradaAberto ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'}`}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}