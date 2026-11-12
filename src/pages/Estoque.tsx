// src/pages/Estoque.tsx
import { useState, useMemo, useEffect } from 'react';
import type { ElementType } from 'react';
import { useAppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import type { Produto, Categoria, MovimentacaoEstoque } from '../types';
import imageCompression from 'browser-image-compression';
import * as LucideIcons from 'lucide-react';
import { ModalConfirmacao } from '../components/ModalConfirmacao';

const OPCOES_ICONES = [
  'Beer', 'Martini', 'CupSoda', 'Coffee', 'Wine', 'WineGlass',
  'UtensilsCrossed', 'Utensils', 'Pizza', 'Sandwich', 'Burger',
  'IceCreamBowl', 'CakeSlice', 'IceCream', 'Croissant', 'Donut',
  'Beef', 'Fish', 'Egg', 'Apple', 'Carrot', 'Grape', 'Banana',
  'Salad', 'Soup', 'Bowl', 'NutOff', 'Candy', 'Cake',
  'ChefHat', 'Package', 'Box', 'Tag', 'Star', 'Flame', 'Snowflake'
];

export function Estoque() {
  const contexto = useAppContext();

  const produtos = useMemo(() => contexto.produtos || [], [contexto.produtos]);
  const categorias = useMemo(() => contexto.categorias || [], [contexto.categorias]);
  const historicoEntradas = useMemo(() => contexto.historicoEstoque || [], [contexto.historicoEstoque]);
  const historicoVendas = useMemo(() => contexto.historicoVendas || [], [contexto.historicoVendas]);
  const garcomLogado = contexto.garcomLogado;

  const isAdmin = garcomLogado?.cargo === 'admin' || garcomLogado?.cargo === 'super_admin';

  // Produtos válidos do catálogo (ignora itens internos de taxa/desconto 998 e 999)
  const produtosComEstoque = useMemo(
    () => produtos.filter(p => p.estoque !== undefined && p.id !== 999 && p.id !== 998),
    [produtos]
  );

  // TOAST DE FEEDBACK NATIVO
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);
  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  // ABAS, BUSCA E FILTROS
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'saldo' | 'categorias' | 'historico'>('saldo');
  const [modoGerenciarCategorias, setModoGerenciarCategorias] = useState(false);
  const [filtroMovimento, setFiltroMovimento] = useState<'todos' | 'entrada' | 'inventario' | 'estorno'>('todos');
  const [buscaMovimento, setBuscaMovimento] = useState('');

  // ESTADOS DE MODAIS
  const [produtoDetalhe, setProdutoDetalhe] = useState<Produto | null>(null);
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [modalInventarioAberto, setModalInventarioAberto] = useState(false);
  const [modalNovoProduto, setModalNovoProduto] = useState(false);
  const [modalNovaCategoriaAberto, setModalNovaCategoriaAberto] = useState(false);
  const [carregandoAcaoEstoque, setCarregandoAcaoEstoque] = useState(false);

  const [modalConfirmacao, setModalConfirmacao] = useState<{
    aberto: boolean;
    titulo: string;
    descricao: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: 'perigo' | 'aviso' | 'primario';
    carregando?: boolean;
    onConfirmar: () => void | Promise<void>;
  }>({
    aberto: false,
    titulo: '',
    descricao: '',
    onConfirmar: () => {}
  });

  const fecharConfirmacao = () => {
    setModalConfirmacao(prev => ({ ...prev, aberto: false, carregando: false }));
  };

  const produtoDetalheAtual = useMemo(
    () => (produtoDetalhe ? produtos.find(p => p.id === produtoDetalhe.id) ?? produtoDetalhe : null),
    [produtoDetalhe, produtos]
  );

  // CADASTRO / EDIÇÃO DE CATEGORIA
  const [textoNovaCategoria, setTextoNovaCategoria] = useState('');
  const [iconeSelecionado, setIconeSelecionado] = useState<string>('Package');
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<number | null>(null);
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);

  // CADASTRO / EDIÇÃO DE PRODUTO
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

  // Controle de scroll quando modais estão abertos
  useEffect(() => {
    const algumModalAberto =
      Boolean(produtoDetalheAtual) ||
      modalEntradaAberto ||
      modalInventarioAberto ||
      modalNovoProduto ||
      modalNovaCategoriaAberto ||
      modalConfirmacao.aberto;

    document.body.style.overflow = algumModalAberto ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [
    produtoDetalheAtual,
    modalEntradaAberto,
    modalInventarioAberto,
    modalNovoProduto,
    modalNovaCategoriaAberto,
    modalConfirmacao.aberto
  ]);

  // ÍCONE DINÂMICO LUCIDE
  const renderizarIconeDinamicamente = (
    nomeCategoriaOuIcone: string,
    classesCss = '',
    tamanho = 24
  ) => {
    const isIconName = OPCOES_ICONES.includes(nomeCategoriaOuIcone) || nomeCategoriaOuIcone === 'Package';
    const iconeNome = isIconName
      ? nomeCategoriaOuIcone
      : categorias.find(c => c.nome === nomeCategoriaOuIcone)?.icone || 'Package';
    const IconeComponente =
      ((LucideIcons as unknown) as Record<string, ElementType>)[iconeNome] || LucideIcons.Package;
    return <IconeComponente className={classesCss} size={tamanho} strokeWidth={1.9} />;
  };

  // FILTRO DE PRODUTOS (POR BUSCA OU CATEGORIA SELECIONADA)
  const produtosExibidos = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtosComEstoque.filter(p => {
      const matchBusca =
        termo === '' ||
        p.nome.toLowerCase().includes(termo) ||
        p.categoria.toLowerCase().includes(termo) ||
        (p.subcategoria && p.subcategoria.toLowerCase().includes(termo));
      const matchCategoria = !categoriaAtiva || p.categoria === categoriaAtiva;
      return matchBusca && matchCategoria;
    });
  }, [produtosComEstoque, busca, categoriaAtiva]);

  // PRODUTOS EM NÍVEL CRÍTICO (URGENTE)
  const produtosEmCritico = useMemo(
    () =>
      produtosComEstoque
        .filter(p => p.ativo !== false && (p.estoque || 0) <= 10)
        .sort((a, b) => (a.estoque || 0) - (b.estoque || 0)),
    [produtosComEstoque]
  );

  // PRODUTOS MAIS VENDIDOS (POPULARES)
  const maisVendidos = useMemo(() => {
    const vendasValidas = historicoVendas.filter(v => v.status !== 'cancelada');
    const qtdVendidaPorId = vendasValidas.reduce((acc, venda) => {
      venda.itens.forEach(item => {
        if (item.produto.id !== 999 && item.produto.id !== 998) {
          acc[item.produto.id] = (acc[item.produto.id] || 0) + item.quantidade;
        }
      });
      return acc;
    }, {} as Record<number, number>);

    return produtosComEstoque
      .map(p => ({ ...p, qtdVendida: qtdVendidaPorId[p.id] || 0 }))
      .filter(p => p.qtdVendida > 0)
      .sort((a, b) => b.qtdVendida - a.qtdVendida)
      .slice(0, 6);
  }, [historicoVendas, produtosComEstoque]);

  // MOVIMENTAÇÕES FILTRADAS
  const movimentosExibidos = useMemo(() => {
    const termo = buscaMovimento.trim().toLowerCase();
    return historicoEntradas.filter(log => {
      const matchTipo = filtroMovimento === 'todos' || log.tipo === filtroMovimento;
      const matchBusca =
        termo === '' ||
        log.produtoNome.toLowerCase().includes(termo) ||
        log.usuarioNome.toLowerCase().includes(termo);
      return matchTipo && matchBusca;
    });
  }, [historicoEntradas, filtroMovimento, buscaMovimento]);

  // FORMATAÇÕES
  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatarHora = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatarData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

  // ==========================================
  // HANDLERS: CATEGORIAS
  // ==========================================
  const abrirModalNovaCategoria = () => {
    setEditandoCategoriaId(null);
    setTextoNovaCategoria('');
    setIconeSelecionado('Package');
    setModalNovaCategoriaAberto(true);
  };

  const abrirModalEditarCategoria = (cat: Categoria) => {
    setEditandoCategoriaId(cat.id);
    setTextoNovaCategoria(cat.nome);
    setIconeSelecionado(cat.icone);
    setModalNovaCategoriaAberto(true);
  };

  const handleSalvarCategoria = async () => {
    const nomeLimpo = textoNovaCategoria.trim();
    if (!nomeLimpo) {
      mostrarToast('Informe um nome para a categoria.', 'erro');
      return;
    }

    setSalvandoCategoria(true);
    try {
      if (editandoCategoriaId) {
        const catAntiga = categorias.find(c => c.id === editandoCategoriaId);
        await contexto.editarCategoria(editandoCategoriaId, nomeLimpo, iconeSelecionado);
        if (catAntiga && categoriaAtiva === catAntiga.nome) {
          setCategoriaAtiva(nomeLimpo);
        }
        mostrarToast('Categoria atualizada com sucesso!');
      } else {
        await contexto.adicionarCategoria(nomeLimpo, iconeSelecionado);
        mostrarToast('Categoria criada com sucesso!');
      }
      setModalNovaCategoriaAberto(false);
      setTextoNovaCategoria('');
      setIconeSelecionado('Package');
    } catch {
      mostrarToast('Não foi possível salvar a categoria.', 'erro');
    } finally {
      setSalvandoCategoria(false);
    }
  };

  const handleExcluirCategoria = (cat: Categoria) => {
    setModalConfirmacao({
      aberto: true,
      titulo: 'Excluir Categoria?',
      descricao: `Deseja remover a categoria "${cat.nome}"? Os produtos cadastrados nela não serão apagados.`,
      textoConfirmar: 'Excluir Categoria',
      tipo: 'perigo',
      onConfirmar: async () => {
        fecharConfirmacao();
        try {
          await contexto.excluirCategoria(cat.id);
          if (categoriaAtiva === cat.nome) {
            setCategoriaAtiva(null);
          }
          mostrarToast('Categoria removida com sucesso.');
        } catch {
          mostrarToast('Erro ao remover categoria.', 'erro');
        }
      }
    });
  };

  const moverCategoria = (index: number, direcao: 'sobe' | 'desce') => {
    const novas = [...categorias];
    if (direcao === 'sobe' && index > 0) {
      [novas[index - 1], novas[index]] = [novas[index], novas[index - 1]];
    } else if (direcao === 'desce' && index < novas.length - 1) {
      [novas[index + 1], novas[index]] = [novas[index], novas[index + 1]];
    }
    const updatedCategorias = novas.map((c, i) => ({ ...c, ordem: i }));
    void contexto.reordenarCategorias(updatedCategorias);
  };

  // ==========================================
  // HANDLERS: PRODUTOS
  // ==========================================
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNovoProdImagemFile(file);
      setImagemPreview(URL.createObjectURL(file));
    }
  };

  const abrirModalNovoProduto = () => {
    setEditandoId(null);
    if (categoriaAtiva) {
      setNovoProdCat(categoriaAtiva);
    } else if (categorias.length > 0) {
      setNovoProdCat(categorias[0].nome);
    } else {
      setNovoProdCat('');
    }
    setNovoProdNome('');
    setNovoProdSubCat('');
    setNovoProdImagemUrl('');
    setNovoProdImagemFile(null);
    setImagemPreview(null);
    setNovoProdVenda('');
    setNovoProdCusto('');
    setNovoProdAtivo(true);
    setModalNovoProduto(true);
  };

  const abrirModalEditarProduto = (produto: Produto) => {
    setEditandoId(produto.id);
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

  const handleSalvarProduto = async () => {
    if (!novoProdNome.trim() || !novoProdCat || !novoProdVenda.trim()) {
      mostrarToast('Preencha nome, categoria e preço de venda.', 'erro');
      return;
    }

    setSalvandoProduto(true);
    let urlFinal = novoProdImagemUrl;

    if (novoProdImagemFile) {
      try {
        const opcoesCompressao = {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
          initialQuality: 0.8
        };
        const arquivoComprimido = await imageCompression(novoProdImagemFile, opcoesCompressao);
        const urlUploaded = await contexto.uploadImagemProduto(arquivoComprimido);
        if (urlUploaded) {
          urlFinal = urlUploaded;
        }
      } catch {
        mostrarToast('Não foi possível processar a imagem do produto.', 'erro');
        setSalvandoProduto(false);
        return;
      }
    }

    const dadosSalvar = {
      nome: novoProdNome.trim(),
      categoria: novoProdCat,
      subcategoria: novoProdSubCat.trim(),
      imagem_url: urlFinal,
      preco: parseFloat(novoProdVenda.replace(',', '.')) || 0,
      precoCusto: parseFloat(novoProdCusto.replace(',', '.')) || 0,
      ativo: novoProdAtivo
    };

    try {
      if (editandoId) {
        await contexto.editarProduto(editandoId, dadosSalvar);
        mostrarToast('Produto atualizado com sucesso!');
      } else {
        await contexto.adicionarProduto({ ...dadosSalvar, estoque: 0 });
        mostrarToast('Produto cadastrado com sucesso!');
      }

      setModalNovoProduto(false);
      setNovoProdNome('');
      setNovoProdCat('');
      setNovoProdSubCat('');
      setNovoProdImagemUrl('');
      setNovoProdImagemFile(null);
      setImagemPreview(null);
      setNovoProdVenda('');
      setNovoProdCusto('');
      setNovoProdAtivo(true);
      setEditandoId(null);
    } catch {
      mostrarToast('Erro ao salvar o produto.', 'erro');
    } finally {
      setSalvandoProduto(false);
    }
  };

  const handleExcluirProduto = (id: number) => {
    const prod = produtos.find(p => p.id === id) || produtoDetalhe;
    setModalConfirmacao({
      aberto: true,
      titulo: 'Excluir Produto?',
      descricao: `Tem certeza que deseja remover "${prod?.nome || 'este produto'}" do estoque e do cardápio?`,
      textoConfirmar: 'Excluir Produto',
      tipo: 'perigo',
      onConfirmar: async () => {
        fecharConfirmacao();
        try {
          await contexto.excluirProduto(id);
          setProdutoDetalhe(null);
          mostrarToast('Produto removido do catálogo.');
        } catch {
          mostrarToast('Erro ao excluir produto.', 'erro');
        }
      }
    });
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await contexto.alternarStatusProduto(id);
      setProdutoDetalhe(null);
      mostrarToast('Visibilidade do produto atualizada.');
    } catch {
      mostrarToast('Não foi possível alterar o status.', 'erro');
    }
  };

  // ==========================================
  // HANDLERS: ENTRADA, INVENTÁRIO E DESFAZER MOVIMENTO
  // ==========================================
  const handleConfirmarEntrada = async () => {
    if (!produtoDetalhe) return;
    const qtd = parseInt(qtdForm, 10) || 0;
    const custo =
      custoDigitado.trim() !== ''
        ? parseFloat(custoDigitado.replace(',', '.')) || 0
        : produtoDetalhe.precoCusto || 0;

    if (qtd <= 0) {
      mostrarToast('Informe uma quantidade maior que zero.', 'erro');
      return;
    }

    setCarregandoAcaoEstoque(true);
    try {
      await contexto.darEntradaEstoque(
        produtoDetalhe.id,
        qtd,
        custo,
        garcomLogado?.nome || 'Admin'
      );
      mostrarToast(`+${qtd} un. adicionadas em ${produtoDetalhe.nome}!`);
      fecharModaisEstoque();
    } catch {
      mostrarToast('Erro ao registrar entrada de estoque.', 'erro');
    } finally {
      setCarregandoAcaoEstoque(false);
    }
  };

  const handleConfirmarInventario = async () => {
    if (!produtoDetalhe || qtdForm.trim() === '') {
      mostrarToast('Informe a quantidade física contada.', 'erro');
      return;
    }
    const qtdFisica = parseInt(qtdForm, 10);
    if (isNaN(qtdFisica) || qtdFisica < 0) {
      mostrarToast('A quantidade não pode ser negativa.', 'erro');
      return;
    }

    setCarregandoAcaoEstoque(true);
    try {
      await contexto.registrarInventario(
        produtoDetalhe.id,
        qtdFisica,
        garcomLogado?.nome || 'Admin'
      );
      mostrarToast(`Estoque de ${produtoDetalhe.nome} ajustado para ${qtdFisica} un.`);
      fecharModaisEstoque();
    } catch {
      mostrarToast('Erro ao registrar ajuste de balanço.', 'erro');
    } finally {
      setCarregandoAcaoEstoque(false);
    }
  };

  const handleDesfazerMovimento = (log: MovimentacaoEstoque) => {
    if (!isAdmin) return;

    const tipoTexto =
      log.tipo === 'entrada' ? 'compra' : log.tipo === 'estorno' ? 'estorno' : 'ajuste de balanço';
    const sinalQtd = log.quantidade > 0 ? `+${log.quantidade}` : `${log.quantidade}`;

    setModalConfirmacao({
      aberto: true,
      titulo: 'Desfazer Lançamento?',
      descricao: `Deseja desfazer e excluir este registro de ${tipoTexto} (${sinalQtd} un. em "${log.produtoNome}")?\n\nO saldo atual do produto será revertido automaticamente.`,
      textoConfirmar: 'Desfazer e Excluir',
      tipo: 'perigo',
      onConfirmar: async () => {
        setModalConfirmacao(prev => ({ ...prev, carregando: true }));
        try {
          await contexto.excluirMovimentacaoEstoque(log.id);
          fecharConfirmacao();
          mostrarToast(`Lançamento de ${log.produtoNome} desfeito com sucesso!`);
        } catch (err) {
          fecharConfirmacao();
          mostrarToast(
            err instanceof Error ? err.message : 'Não foi possível desfazer o lançamento.',
            'erro'
          );
        }
      }
    });
  };

  const fecharModaisEstoque = () => {
    setModalEntradaAberto(false);
    setModalInventarioAberto(false);
    setQtdForm('');
    setCustoDigitado('');
    setProdutoDetalhe(null);
  };

  // ==========================================
  // RENDER CARD DE PRODUTO
  // ==========================================
  const renderProdutoCard = (produto: Produto) => {
    const estoqueAtual = produto.estoque || 0;
    const ativo = produto.ativo !== false;
    const esgotado = estoqueAtual <= 0;
    const critico = estoqueAtual > 0 && estoqueAtual <= 10;

    return (
      <button
        key={produto.id}
        type="button"
        onClick={() => setProdutoDetalhe(produto)}
        className={`w-full flex items-center justify-between gap-3.5 p-3.5 rounded-3xl border text-left transition-all duration-200 cursor-pointer active:scale-95 group ${
          ativo
            ? 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md shadow-xs'
            : 'bg-slate-50 border-slate-200 opacity-65'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {produto.imagem_url ? (
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shrink-0 shadow-xs group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
              {renderizarIconeDinamicamente(produto.categoria, '', 24)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3
              className={`text-sm font-semibold tracking-tight truncate uppercase ${
                ativo ? 'text-slate-800' : 'text-slate-400 line-through'
              }`}
            >
              {produto.nome}
            </h3>

            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 truncate">
                {produto.categoria}
              </span>
              {produto.subcategoria && (
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 truncate">
                  {produto.subcategoria}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-slate-700 tabular-nums">
                {formatarMoeda(produto.preco)}
              </span>
              {typeof produto.precoCusto === 'number' && produto.precoCusto > 0 && (
                <span className="text-xs text-slate-400 tabular-nums">
                  Custo: {formatarMoeda(produto.precoCusto)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right pl-2 flex flex-col items-end shrink-0">
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl font-bold leading-none tabular-nums ${
                !ativo
                  ? 'text-slate-400'
                  : esgotado
                    ? 'text-rose-600'
                    : critico
                      ? 'text-amber-600'
                      : 'text-slate-900'
              }`}
            >
              {estoqueAtual}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              un
            </span>
          </div>

          {!ativo ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 mt-1.5">
              Oculto
            </span>
          ) : esgotado ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 mt-1.5">
              Esgotado
            </span>
          ) : critico ? (
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-1.5">
              Baixo
            </span>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-1.5">
              Normal
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans pt-20 md:pt-24 md:pl-18 pb-28 md:pb-14 relative overflow-x-hidden select-none text-slate-800">
      {/* TOAST FLUTUANTE */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-4 duration-300 w-11/12 max-w-sm flex justify-center pointer-events-none">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold tracking-tight pointer-events-auto ${
              toast.tipo === 'sucesso'
                ? 'bg-slate-900 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-900 text-rose-400 border-rose-500/30'
            }`}
          >
            {toast.tipo === 'sucesso' ? (
              <LucideIcons.CheckCircle2 size={17} className="shrink-0" />
            ) : (
              <LucideIcons.AlertCircle size={17} className="shrink-0" />
            )}
            <span className="truncate">{toast.mensagem}</span>
          </div>
        </div>
      )}

      {/* ELEMENTOS DE FUNDO SUAVES */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <Header />

      {/* BARRA SUPERIOR: ABAS E BOTÃO DE AÇÃO */}
      <div className="px-4 sm:px-6 md:px-8 mb-6 relative z-10 max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
        {/* Menu de Abas */}
        <div className="bg-white p-1 rounded-full border border-slate-200 shadow-xs flex w-full sm:w-auto sm:min-w-96 gap-1">
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('saldo');
              setCategoriaAtiva(null);
            }}
            className={`flex-1 py-2 px-4 text-xs font-semibold uppercase tracking-widest transition-all rounded-full cursor-pointer ${
              abaAtiva === 'saldo'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Estoque
          </button>
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('categorias');
              setBusca('');
            }}
            className={`flex-1 py-2 px-4 text-xs font-semibold uppercase tracking-widest transition-all rounded-full cursor-pointer ${
              abaAtiva === 'categorias'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Categorias
          </button>
          <button
            type="button"
            onClick={() => {
              setAbaAtiva('historico');
              setCategoriaAtiva(null);
            }}
            className={`flex-1 py-2 px-4 text-xs font-semibold uppercase tracking-widest transition-all rounded-full cursor-pointer ${
              abaAtiva === 'historico'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Movimentos
          </button>
        </div>

        {/* Botões Rápidos (+ Produto / + Categoria) */}
        <div className="w-full sm:w-auto flex items-center justify-end gap-2">
          {abaAtiva === 'categorias' ? (
            <>
              {categorias.length > 0 && !categoriaAtiva && (
                <button
                  type="button"
                  onClick={() => setModoGerenciarCategorias(prev => !prev)}
                  className={`h-9 px-4 rounded-full text-xs font-semibold uppercase tracking-widest border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    modoGerenciarCategorias
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <LucideIcons.SlidersHorizontal size={13} />
                  <span>{modoGerenciarCategorias ? 'Concluir' : 'Organizar'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={abrirModalNovaCategoria}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 border border-indigo-800 shadow-sm px-5 h-9 rounded-full text-xs uppercase tracking-widest font-semibold text-white transition-all active:scale-95 cursor-pointer"
              >
                <LucideIcons.Plus size={14} strokeWidth={2.5} />
                <span>Categoria</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={abrirModalNovoProduto}
              className="w-full sm:w-auto justify-center flex items-center gap-1.5 bg-indigo-700 hover:bg-indigo-800 border border-indigo-800 shadow-sm px-5 h-9 rounded-full text-xs uppercase tracking-widest font-semibold text-white transition-all active:scale-95 cursor-pointer"
            >
              <LucideIcons.Plus size={14} strokeWidth={2.5} />
              <span>Produto</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL — DESKTOP PREENCHIDO (MAX-W-6XL) & 100% RESPONSIVO */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 space-y-6 relative z-10">
        {/* ========================================================= */}
        {/* ABA 1: ESTOQUE (PESQUISA + VISÃO GERAL: URGENTE & POPULARES) */}
        {/* ========================================================= */}
        {abaAtiva === 'saldo' && (
          <div className="animate-in fade-in duration-200 space-y-6">
            {/* BARRA DE PESQUISA */}
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <LucideIcons.Search size={18} strokeWidth={2.2} />
              </div>
              <input
                type="text"
                placeholder="PESQUISAR PRODUTO..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-11 pr-11 h-11 bg-white border border-slate-200/90 rounded-full shadow-xs focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 font-medium text-xs sm:text-sm text-slate-800 transition-all uppercase placeholder:normal-case placeholder:font-medium placeholder:text-xs placeholder:tracking-wider placeholder:text-slate-400"
              />
              {busca !== '' && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <LucideIcons.X size={18} strokeWidth={2.2} />
                </button>
              )}
            </div>

            {busca.trim() === '' ? (
              /* VISÃO GERAL: URGENTE + POPULARES (APARECE DIRETO AO ENTRAR NA TELA DE ESTOQUE) */
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-semibold text-slate-500 tracking-widest uppercase">
                    Visão Geral
                  </h2>
                  <button
                    type="button"
                    onClick={() => setAbaAtiva('categorias')}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Ver por categorias ({categorias.length})</span>
                    <LucideIcons.ChevronRight size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
                  {/* CARD 1: URGENTE (ESTOQUE CRÍTICO / BAIXO) */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border-t-4 border-rose-500 border-x border-b border-x-slate-200 border-b-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                        <span>Urgente</span>
                      </h3>
                      <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                        {produtosEmCritico.length}{' '}
                        {produtosEmCritico.length === 1 ? 'alerta' : 'alertas'}
                      </span>
                    </div>

                    {produtosEmCritico.length === 0 ? (
                      <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                          <LucideIcons.ShieldCheck size={20} strokeWidth={2} />
                        </div>
                        <p className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
                          Estoque Seguro
                        </p>
                        <p className="text-xs text-slate-400">
                          Todos os itens ativos estão com mais de 10 unidades.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {produtosEmCritico.slice(0, 6).map(p => {
                          const zerado = (p.estoque || 0) <= 0;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setProdutoDetalhe(p)}
                              className="w-full flex justify-between items-center bg-rose-50/50 hover:bg-rose-50 p-3 rounded-2xl border border-rose-100 transition-all text-left cursor-pointer active:scale-95 group"
                            >
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className="w-9 h-9 rounded-xl bg-white border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                                  {renderizarIconeDinamicamente(p.categoria, '', 18)}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-800 text-xs block truncate uppercase tracking-wide">
                                    {p.nome}
                                  </span>
                                  <span className="text-xs text-slate-400 uppercase tracking-wider">
                                    {p.categoria}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`font-bold text-xs uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-2xs ${
                                    zerado
                                      ? 'bg-rose-600 text-white border-rose-600'
                                      : 'bg-white text-rose-600 border-rose-200'
                                  }`}
                                >
                                  {zerado ? 'Esgotado' : `Resta ${p.estoque}`}
                                </span>
                                <LucideIcons.ChevronRight
                                  size={15}
                                  className="text-rose-300 group-hover:text-rose-600 transition-colors"
                                />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* CARD 2: POPULARES (MAIS VENDIDOS) */}
                  <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border-t-4 border-amber-400 border-x border-b border-x-slate-200 border-b-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <LucideIcons.Star size={16} className="text-amber-500 fill-amber-400" />
                        <span>Populares</span>
                      </h3>
                      <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                        Mais saídos
                      </span>
                    </div>

                    {maisVendidos.length === 0 ? (
                      <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center">
                          <LucideIcons.TrendingUp size={20} strokeWidth={2} />
                        </div>
                        <p className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
                          Sem vendas registradas
                        </p>
                        <p className="text-xs text-slate-400">
                          Os itens mais vendidos nas comandas aparecerão aqui.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {maisVendidos.map((p, index) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setProdutoDetalhe(p)}
                            className="w-full flex justify-between items-center p-3 rounded-2xl bg-slate-50/70 hover:bg-amber-50/40 transition-all border border-slate-200/70 hover:border-amber-200 text-left cursor-pointer active:scale-95 group"
                          >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <span className="w-8 h-8 shrink-0 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center font-bold text-xs tabular-nums">
                                {index + 1}º
                              </span>
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800 text-xs block truncate uppercase tracking-wide">
                                  {p.nome}
                                </span>
                                <span className="text-xs text-slate-400 uppercase tracking-wider">
                                  Saldo: {p.estoque || 0} un
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-amber-700 bg-white border border-amber-200 px-2.5 py-1 rounded-lg font-bold text-xs uppercase tracking-wider tabular-nums shadow-2xs">
                                {p.qtdVendida} vendidos
                              </span>
                              <LucideIcons.ChevronRight
                                size={15}
                                className="text-slate-300 group-hover:text-amber-600 transition-colors"
                              />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* RESULTADOS DA PESQUISA DIRETA NA ABA ESTOQUE */
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold tracking-wider text-slate-600 uppercase">
                    Resultados da Pesquisa ({produtosExibidos.length})
                  </h2>
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Limpar busca
                  </button>
                </div>

                {produtosExibidos.length === 0 ? (
                  <div className="text-center py-14 bg-white rounded-3xl border border-dashed border-slate-300">
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest">
                      Nenhum produto encontrado para "{busca}".
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {produtosExibidos.map(renderProdutoCard)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 2: CATEGORIAS (BOTÕES DE CATEGORIA IGUAL À IMAGEM)     */}
        {/* ========================================================= */}
        {abaAtiva === 'categorias' && (
          <div className="animate-in fade-in duration-200 space-y-6">
            {!categoriaAtiva ? (
              <>
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                    {modoGerenciarCategorias ? 'Organizar e Editar Categorias' : 'Filtrar por Categoria'}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {categorias.length} {categorias.length === 1 ? 'categoria' : 'categorias'}
                  </span>
                </div>

                {categorias.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 shadow-xs">
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-4">
                      Você ainda não criou nenhuma categoria.
                    </p>
                    <button
                      type="button"
                      onClick={abrirModalNovaCategoria}
                      className="bg-indigo-50 text-indigo-600 font-semibold uppercase tracking-widest px-6 py-3 rounded-2xl text-xs border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-xs cursor-pointer"
                    >
                      Criar Primeira Categoria
                    </button>
                  </div>
                ) : !modoGerenciarCategorias ? (
                  /* GRADE DE CARDS DE CATEGORIAS (EXATAMENTE COMO NA IMAGEM ANEXADA) */
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
                    {categorias.map(cat => {
                      const itensNessaCat = produtosComEstoque.filter(
                        p => p.categoria === cat.nome
                      ).length;
                      return (
                        <div key={cat.id} className="relative group">
                          <button
                            type="button"
                            onClick={() => setCategoriaAtiva(cat.nome)}
                            className="w-full bg-white border border-slate-200/90 p-5 rounded-3xl flex flex-col items-center justify-center gap-2.5 shadow-xs hover:border-indigo-300 hover:-translate-y-1 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                          >
                            <div className="w-13 h-13 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                              {renderizarIconeDinamicamente(
                                cat.icone,
                                'text-slate-600 group-hover:text-indigo-600 transition-colors',
                                26
                              )}
                            </div>
                            <div className="text-center w-full mt-0.5">
                              <span className="font-semibold text-slate-800 text-xs block truncate uppercase tracking-wider group-hover:text-indigo-700">
                                {cat.nome}
                              </span>
                              <span className="text-xs text-slate-400 font-medium uppercase tracking-widest block mt-0.5">
                                {itensNessaCat} {itensNessaCat === 1 ? 'Item' : 'Itens'}
                              </span>
                            </div>
                          </button>

                          {/* Atalho discreto para editar categoria direto no card */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                abrirModalEditarCategoria(cat);
                              }}
                              title={`Editar ${cat.nome}`}
                              className="opacity-0 group-hover:opacity-100 focus:opacity-100 absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200 flex items-center justify-center transition-all cursor-pointer"
                            >
                              <LucideIcons.Pencil size={12} strokeWidth={2.2} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* MODO ORGANIZAR (REORDENAR / EDITAR / EXCLUIR CATEGORIAS) */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categorias.map((cat, index) => {
                      const numProdutos = produtosComEstoque.filter(
                        p => p.categoria === cat.nome
                      ).length;
                      return (
                        <div
                          key={cat.id}
                          className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-xs flex items-center justify-between hover:border-slate-300 transition-all"
                        >
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <div className="flex flex-col gap-0.5 pl-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moverCategoria(index, 'sobe')}
                                className="text-slate-400 hover:text-indigo-600 disabled:opacity-25 transition-colors cursor-pointer"
                                title="Mover para cima"
                              >
                                <LucideIcons.ChevronUp size={20} strokeWidth={2.5} />
                              </button>
                              <button
                                type="button"
                                disabled={index === categorias.length - 1}
                                onClick={() => moverCategoria(index, 'desce')}
                                className="text-slate-400 hover:text-indigo-600 disabled:opacity-25 transition-colors cursor-pointer"
                                title="Mover para baixo"
                              >
                                <LucideIcons.ChevronDown size={20} strokeWidth={2.5} />
                              </button>
                            </div>

                            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
                              {renderizarIconeDinamicamente(cat.icone, 'text-indigo-600', 22)}
                            </div>

                            <div className="min-w-0 flex-1 pr-2">
                              <h4 className="font-semibold text-slate-800 tracking-tight uppercase text-xs sm:text-sm truncate">
                                {cat.nome}
                              </h4>
                              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                                {numProdutos} {numProdutos === 1 ? 'Item' : 'Itens'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pr-1">
                            <button
                              type="button"
                              onClick={() => abrirModalEditarCategoria(cat)}
                              className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/80 hover:border-indigo-200 transition-colors cursor-pointer active:scale-95"
                              title="Editar categoria"
                            >
                              <LucideIcons.Pencil size={16} strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluirCategoria(cat)}
                              className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 border border-slate-200/80 hover:border-rose-200 transition-colors cursor-pointer active:scale-95"
                              title="Excluir categoria"
                            >
                              <LucideIcons.Trash2 size={16} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* PRODUTOS DA CATEGORIA SELECIONADA */
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoriaAtiva(null);
                        setBusca('');
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-100 transition-colors active:scale-95 cursor-pointer shrink-0"
                    >
                      <LucideIcons.ArrowLeft size={18} strokeWidth={2.2} />
                    </button>
                    <div>
                      <h2 className="text-sm font-bold tracking-tight text-slate-800 uppercase">
                        {categoriaAtiva}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {produtosExibidos.length}{' '}
                        {produtosExibidos.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
                      </p>
                    </div>
                  </div>

                  {/* Busca rápida dentro da categoria */}
                  <div className="relative w-full sm:w-64">
                    <LucideIcons.Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder={`Buscar em ${categoriaAtiva}...`}
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      className="w-full h-9 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    />
                    {busca && (
                      <button
                        type="button"
                        onClick={() => setBusca('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <LucideIcons.X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {produtosExibidos.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
                    <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-3">
                      Nenhum produto nesta categoria.
                    </p>
                    <button
                      type="button"
                      onClick={abrirModalNovoProduto}
                      className="h-9 px-5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold uppercase tracking-wider hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      + Adicionar Produto em {categoriaAtiva}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {produtosExibidos.map(renderProdutoCard)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 3: MOVIMENTOS (COM OPÇÃO DE DESFAZER/EXCLUIR P/ ADMIN) */}
        {/* ========================================================= */}
        {abaAtiva === 'historico' && (
          <div className="animate-in fade-in duration-200 space-y-5">
            {/* Barra de Filtros e Busca de Movimentações */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'entrada', label: 'Compras' },
                    { id: 'inventario', label: 'Ajustes' },
                    { id: 'estorno', label: 'Estornos' }
                  ] as const
                ).map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroMovimento(f.id)}
                    className={`h-8 px-3.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                      filtroMovimento === f.id
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <LucideIcons.Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Filtrar por produto ou autor..."
                  value={buscaMovimento}
                  onChange={e => setBuscaMovimento(e.target.value)}
                  className="w-full h-9 pl-9 pr-8 bg-white border border-slate-200 rounded-full text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all shadow-2xs"
                />
                {buscaMovimento && (
                  <button
                    type="button"
                    onClick={() => setBuscaMovimento('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <LucideIcons.X size={14} />
                  </button>
                )}
              </div>
            </div>

            {movimentosExibidos.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 shadow-xs">
                <p className="text-slate-400 font-semibold text-xs uppercase tracking-widest">
                  Nenhuma movimentação encontrada.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {movimentosExibidos.map(log => {
                  const isEntrada = log.tipo === 'entrada';
                  const isEstorno = log.tipo === 'estorno';

                  return (
                    <div
                      key={log.id}
                      className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase tracking-widest border ${
                                isEntrada
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isEstorno
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {isEntrada ? 'Compra' : isEstorno ? 'Estorno' : 'Ajuste'}
                            </span>

                            <span className="text-xs text-slate-400 font-medium tabular-nums">
                              {formatarData(log.data)} às {formatarHora(log.data)}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-800 text-sm tracking-tight uppercase truncate">
                            {log.produtoNome}
                          </h4>

                          <p className="text-xs text-slate-400 font-medium mt-0.5 truncate">
                            Lançado por: <span className="text-slate-600">{log.usuarioNome}</span>
                            {isEntrada && log.precoCusto > 0 && (
                              <span> • Custo: {formatarMoeda(log.precoCusto)}</span>
                            )}
                          </p>
                        </div>

                        <div className="text-right pl-3 border-l border-slate-100 shrink-0 flex flex-col items-end justify-center">
                          <span
                            className={`font-bold text-lg tabular-nums leading-none ${
                              log.quantidade > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {log.quantidade > 0 ? `+${log.quantidade}` : log.quantidade}
                          </span>
                          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 mt-1">
                            unid.
                          </span>
                        </div>
                      </div>

                      {/* AÇÃO ADMIN: DESFAZER / EXCLUIR LANÇAMENTO */}
                      {isAdmin && (
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-400">
                            Reverte o saldo automaticamente
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDesfazerMovimento(log)}
                            className="h-7 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                            title="Desfazer e excluir este lançamento de estoque"
                          >
                            <LucideIcons.RotateCcw size={12} strokeWidth={2.2} />
                            <span>Desfazer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: CRIAR / EDITAR CATEGORIA                           */}
      {/* ========================================================= */}
      {modalNovaCategoriaAberto && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !salvandoCategoria && setModalNovaCategoriaAberto(false)}
          />
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200 flex flex-col max-h-screen">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 uppercase">
                {editandoCategoriaId ? 'Editar Categoria' : 'Nova Categoria'}
              </h3>
              <button
                type="button"
                onClick={() => setModalNovaCategoriaAberto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <LucideIcons.X size={15} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 px-0.5 pb-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: Cervejas"
                  value={textoNovaCategoria}
                  onChange={e => setTextoNovaCategoria(e.target.value)}
                  className="w-full h-11 bg-slate-50 px-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white font-semibold text-slate-800 uppercase tracking-wider text-sm transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                  Ícone Visual
                </label>
                <div className="h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-2.5 grid grid-cols-5 gap-2">
                  {OPCOES_ICONES.map(iconeName => {
                    const isSelected = iconeName === iconeSelecionado;
                    return (
                      <button
                        key={iconeName}
                        type="button"
                        onClick={() => setIconeSelecionado(iconeName)}
                        className={`h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs border border-indigo-600'
                            : 'bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                        }`}
                      >
                        {renderizarIconeDinamicamente(iconeName, '', 20)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalNovaCategoriaAberto(false)}
                disabled={salvandoCategoria}
                className="flex-1 h-11 bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider rounded-2xl text-xs transition-all hover:bg-slate-200 active:scale-95 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSalvarCategoria}
                disabled={salvandoCategoria}
                className="flex-1 h-11 bg-slate-900 text-white font-semibold uppercase tracking-wider rounded-2xl text-xs transition-all hover:bg-slate-800 shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {salvandoCategoria ? (
                  <LucideIcons.Loader2 size={15} className="animate-spin" />
                ) : (
                  <span>{editandoCategoriaId ? 'Salvar' : 'Criar'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR / EDITAR PRODUTO                             */}
      {/* ========================================================= */}
      {modalNovoProduto && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div
            className="absolute inset-0"
            onClick={() => !salvandoProduto && setModalNovoProduto(false)}
          />
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 my-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold tracking-tight text-slate-900 uppercase">
                {editandoId ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button
                type="button"
                onClick={() => !salvandoProduto && setModalNovoProduto(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <LucideIcons.X size={15} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Toggle Ativo no Cardápio */}
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Exibir no Cardápio</p>
                  <p className="text-xs text-slate-400">
                    Disponível para lançamento nas comandas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setNovoProdAtivo(!novoProdAtivo)}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                    novoProdAtivo ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                      novoProdAtivo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Foto do Produto */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                  Foto do Produto (Opcional)
                </label>
                <div className="flex justify-center px-4 py-4 border-2 border-slate-200 border-dashed rounded-2xl relative hover:border-indigo-400 hover:bg-slate-50/70 transition-colors bg-white group cursor-pointer overflow-hidden">
                  {imagemPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagemPreview}
                        alt="Preview"
                        className="mx-auto h-24 w-24 object-cover rounded-2xl shadow-xs border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault();
                          setImagemPreview(null);
                          setNovoProdImagemFile(null);
                          setNovoProdImagemUrl('');
                        }}
                        className="absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full p-1 shadow-xs hover:bg-rose-200 transition-colors border border-rose-200 cursor-pointer"
                      >
                        <LucideIcons.X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center pointer-events-none">
                      <div className="mx-auto h-9 w-9 text-slate-400 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                        <LucideIcons.ImagePlus size={18} strokeWidth={1.8} />
                      </div>
                      <div className="text-xs font-medium text-slate-500">
                        <span className="text-indigo-600 font-semibold">Toque</span> para escolher uma foto
                      </div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider">
                        PNG, JPG ou WEBP (Máx. 5MB)
                      </p>
                    </div>
                  )}
                  {!imagemPreview && (
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/png, image/jpeg, image/jpg, image/webp"
                      onChange={handleImageChange}
                    />
                  )}
                </div>
              </div>

              {/* Nome do Produto */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={novoProdNome}
                  onChange={e => setNovoProdNome(e.target.value)}
                  placeholder="Ex: Cerveja Heineken"
                  className="w-full h-10 bg-slate-50 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 focus:bg-white font-semibold uppercase text-slate-800 text-xs sm:text-sm transition-all"
                />
              </div>

              {/* Categoria e Tamanho */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
                    Categoria *
                  </label>
                  <select
                    value={novoProdCat}
                    onChange={e => setNovoProdCat(e.target.value)}
                    className="w-full h-10 bg-slate-50 px-3 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 focus:bg-white text-xs font-semibold text-slate-700 transition-all uppercase"
                  >
                    {categorias.length === 0 && (
                      <option value="" disabled>
                        Crie uma categoria
                      </option>
                    )}
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.nome}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
                    Tamanho / Tipo
                  </label>
                  <input
                    type="text"
                    value={novoProdSubCat}
                    onChange={e => setNovoProdSubCat(e.target.value)}
                    placeholder="Ex: 600ml, Lata"
                    className="w-full h-10 bg-slate-50 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 focus:bg-white font-medium text-xs text-slate-800 transition-all uppercase"
                  />
                </div>
              </div>

              {/* Preço de Venda e Custo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={novoProdVenda}
                    onChange={e => setNovoProdVenda(e.target.value)}
                    className="w-full h-10 bg-slate-50 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-600 focus:bg-white text-center font-semibold text-sm text-emerald-700 transition-all tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1">
                    Custo Unit. (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={novoProdCusto}
                    onChange={e => setNovoProdCusto(e.target.value)}
                    className="w-full h-10 bg-slate-50 px-3.5 rounded-xl border border-slate-200 outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-500 focus:bg-white text-center font-medium text-sm text-slate-700 transition-all tabular-nums"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => !salvandoProduto && setModalNovoProduto(false)}
                  disabled={salvandoProduto}
                  className="flex-1 h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold uppercase tracking-wider rounded-2xl text-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarProduto}
                  disabled={salvandoProduto}
                  className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold uppercase tracking-wider rounded-2xl text-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 cursor-pointer"
                >
                  {salvandoProduto ? (
                    <>
                      <LucideIcons.Loader2 size={15} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Produto</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: DETALHES DO PRODUTO E AÇÕES RÁPIDAS DE ESTOQUE     */}
      {/* ========================================================= */}
      {produtoDetalhe && !modalEntradaAberto && !modalInventarioAberto && !modalNovoProduto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setProdutoDetalhe(null)} />
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setProdutoDetalhe(null)}
              aria-label="Fechar"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <LucideIcons.X size={15} />
            </button>

            <div className="flex items-center gap-4 mb-5 pr-6">
              {produtoDetalhe.imagem_url ? (
                <img
                  src={produtoDetalhe.imagem_url}
                  alt={produtoDetalhe.nome}
                  className="w-18 h-18 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0"
                />
              ) : (
                <div className="w-18 h-18 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 text-slate-500">
                  {renderizarIconeDinamicamente(produtoDetalhe.categoria, '', 30)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug mb-1 truncate uppercase">
                  {produtoDetalhe.nome}
                </h3>
                <span
                  className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md inline-block border ${
                    produtoDetalhe.ativo !== false
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {produtoDetalhe.ativo !== false ? 'Cardápio Ativo' : 'Oculto no Cardápio'}
                </span>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1 truncate">
                  {produtoDetalhe.categoria}{' '}
                  {produtoDetalhe.subcategoria && `• ${produtoDetalhe.subcategoria}`}
                </p>
              </div>
            </div>

            {/* Resumo de Saldo e Preço */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between">
                <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider">
                  Estoque Atual
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={`text-2xl font-bold tabular-nums leading-none ${
                      (produtoDetalhe.estoque || 0) <= 10 && produtoDetalhe.ativo !== false
                        ? 'text-rose-600'
                        : 'text-slate-900'
                    }`}
                  >
                    {produtoDetalhe.estoque || 0}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 uppercase">un</span>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 flex flex-col justify-between">
                <span className="font-semibold text-slate-400 text-xs uppercase tracking-wider">
                  Preço Venda
                </span>
                <span className="text-lg font-bold text-emerald-700 tabular-nums leading-none mt-1">
                  {formatarMoeda(produtoDetalhe.preco)}
                </span>
              </div>
            </div>

            {/* Botões de Movimentação: Compra e Ajuste */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <button
                type="button"
                onClick={() => {
                  setQtdForm('');
                  setCustoDigitado(
                    produtoDetalhe.precoCusto ? produtoDetalhe.precoCusto.toString() : ''
                  );
                  setModalEntradaAberto(true);
                }}
                className="bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold uppercase tracking-wider py-3 rounded-2xl text-xs transition-all flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <LucideIcons.PackagePlus size={20} className="text-emerald-600" />
                <span>Lançar Compra</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setQtdForm(String(produtoDetalhe.estoque || 0));
                  setModalInventarioAberto(true);
                }}
                className="bg-amber-50/70 hover:bg-amber-50 border border-amber-200 text-amber-800 font-semibold uppercase tracking-wider py-3 rounded-2xl text-xs transition-all flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
              >
                <LucideIcons.Scale size={20} className="text-amber-600" />
                <span>Ajustar Saldo</span>
              </button>
            </div>

            {/* Ações Administrativas do Produto */}
            <div className="flex gap-2.5 mb-2.5">
              <button
                type="button"
                onClick={() => abrirModalEditarProduto(produtoDetalhe)}
                className="flex-1 h-10 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-semibold uppercase tracking-wider rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LucideIcons.Pencil size={14} />
                <span>Editar</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(produtoDetalhe.id)}
                className="flex-1 h-10 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-semibold uppercase tracking-wider rounded-xl text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {produtoDetalhe.ativo !== false ? (
                  <>
                    <LucideIcons.EyeOff size={14} />
                    <span>Ocultar</span>
                  </>
                ) : (
                  <>
                    <LucideIcons.Eye size={14} />
                    <span>Reativar</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleExcluirProduto(produtoDetalhe.id)}
              className="w-full h-10 bg-white text-rose-600 font-semibold uppercase tracking-wider rounded-xl border border-rose-200 hover:bg-rose-50 text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LucideIcons.Trash2 size={14} />
              <span>Excluir Produto</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: LANÇAR COMPRA OU AJUSTAR BALANÇO                   */}
      {/* ========================================================= */}
      {(modalEntradaAberto || modalInventarioAberto) && produtoDetalhe && (
        <div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => !carregandoAcaoEstoque && fecharModaisEstoque()}
          />
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 relative animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            <div className="text-center mb-5">
              <h3 className="text-base font-bold tracking-tight text-slate-900 uppercase">
                {modalEntradaAberto ? 'Lançar Compra' : 'Ajuste de Balanço'}
              </h3>
              <span className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 py-1 px-3 rounded-full inline-block border border-indigo-100 max-w-full truncate">
                {produtoDetalhe.nome}
              </span>
            </div>

            <div className="space-y-4">
              {modalEntradaAberto ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5 text-center">
                      Qtd Adicionada *
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      autoFocus
                      placeholder="Ex: 24"
                      value={qtdForm}
                      onChange={e => setQtdForm(e.target.value)}
                      className="w-full h-12 bg-slate-50 px-3 rounded-2xl border border-slate-200 text-center font-bold text-lg text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5 text-center">
                      Custo Unit. (R$)
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={custoDigitado}
                      onChange={e => setCustoDigitado(e.target.value)}
                      placeholder="0,00"
                      className="w-full h-12 bg-slate-50 px-3 rounded-2xl border border-slate-200 text-center font-semibold text-lg text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 focus:bg-white transition-all tabular-nums"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 text-center block mb-2">
                    Quantidade Real na Prateleira (Atual: {produtoDetalhe.estoque || 0} un)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    autoFocus
                    placeholder={`Atual: ${produtoDetalhe.estoque || 0}`}
                    value={qtdForm}
                    onChange={e => setQtdForm(e.target.value)}
                    className="w-full h-14 bg-slate-50 px-4 rounded-2xl border border-slate-200 text-center font-bold text-2xl text-slate-900 outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-500 focus:bg-white transition-all tabular-nums"
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={fecharModaisEstoque}
                  disabled={carregandoAcaoEstoque}
                  className="flex-1 h-11 bg-slate-100 text-slate-600 hover:bg-slate-200 font-semibold uppercase tracking-wider rounded-2xl text-xs transition-colors active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={carregandoAcaoEstoque}
                  onClick={modalEntradaAberto ? handleConfirmarEntrada : handleConfirmarInventario}
                  className={`flex-1 h-11 text-white font-semibold uppercase tracking-wider rounded-2xl text-xs transition-all shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 ${
                    modalEntradaAberto
                      ? 'bg-indigo-600 hover:bg-indigo-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {carregandoAcaoEstoque ? (
                    <LucideIcons.Loader2 size={15} className="animate-spin" />
                  ) : (
                    <span>Confirmar</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ModalConfirmacao {...modalConfirmacao} onCancelar={fecharConfirmacao} />
    </div>
  );
}
