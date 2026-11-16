// src/pages/Comanda.tsx
import { useState, useMemo, useEffect, useRef } from 'react';
import type { ElementType } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import { imprimirCupomTermico } from '../utils/impressoraTermica';
import { MenuSimplesDropdown } from '../components/financeiro/BotaoEmojiFiltro';
import type { Produto, ItemComanda, Pagamento, MetodoPagamento, Categoria } from '../types';
import * as LucideIcons from 'lucide-react';

function obterNomeIconeLucideCategoria(nomeCategoria?: string, nomeIcone?: string): string {
  if (nomeIcone && nomeIcone !== 'Package' && nomeIcone in LucideIcons) {
    return nomeIcone;
  }

  const nome = (nomeCategoria || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (nome.includes('CAIPIRINHA') || nome.includes('DRINK') || nome.includes('COQUET')) return 'Martini';
  if (nome.includes('CERVEJA') || nome.includes('CHOPP')) return 'Beer';
  if (nome.includes('VINHO')) return 'Wine';
  if (
    nome.includes('DESTILAD') ||
    nome.includes('WHISKY') ||
    nome.includes('VODKA') ||
    nome.includes('DOSE') ||
    nome.includes('CACHACA') ||
    nome.includes('GIN')
  ) {
    return 'GlassWater';
  }
  if (nome.includes('BEBIDA') || nome.includes('REFRI') || nome.includes('SUCO') || nome.includes('AGUA')) {
    return 'CupSoda';
  }
  if (nome.includes('CAFE')) return 'Coffee';
  if (
    nome.includes('CAMARAO') ||
    nome.includes('PEIXE') ||
    nome.includes('PORC') ||
    nome.includes('PETISC') ||
    nome.includes('FRIT')
  ) {
    return 'Fish';
  }
  if (nome.includes('PIZZA')) return 'Pizza';
  if (nome.includes('LANCHE') || nome.includes('HAMBURG') || nome.includes('SANDUICH')) return 'Sandwich';
  if (nome.includes('CARNE') || nome.includes('CHURRASC') || nome.includes('ESPET')) return 'Beef';
  if (nome.includes('SALAD')) return 'Salad';
  if (nome.includes('SOPA') || nome.includes('CALDO')) return 'Soup';
  if (nome.includes('REFEI') || nome.includes('ALMOC') || nome.includes('PRATO') || nome.includes('JANT')) {
    return 'UtensilsCrossed';
  }
  if (nome.includes('BOLO') || nome.includes('TORTA')) return 'CakeSlice';
  if (nome.includes('SOBREMES') || nome.includes('DOCE') || nome.includes('SORVET') || nome.includes('ACAI')) {
    return 'IceCreamCone';
  }
  if (nome.includes('GUARDA') || nome.includes('PRAIA') || nome.includes('ALUGUEL') || nome.includes('CADEIRA')) {
    return 'Umbrella';
  }
  if (nome.includes('GELO')) return 'Snowflake';

  return nomeIcone || 'Package';
}

interface IconeCategoriaProps {
  nomeCategoria: string;
  categorias: Categoria[];
  className?: string;
  size?: number;
}

function IconeCategoria({ nomeCategoria, categorias, className = '', size = 20 }: IconeCategoriaProps) {
  const categoriaDoBanco = categorias.find(
    (c) => c.nome.toLowerCase() === nomeCategoria.toLowerCase()
  );
  const iconeNome = obterNomeIconeLucideCategoria(nomeCategoria, categoriaDoBanco?.icone);
  const IconeComponente =
    (LucideIcons as unknown as Record<string, ElementType>)[iconeNome] || LucideIcons.Package;

  return <IconeComponente className={className} size={size} strokeWidth={1.75} />;
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

      let novoStatus: 'pronto' | 'pendente' | 'preparo' | 'entregue';
      if (existente.statusCozinha === 'pronto' || item.statusCozinha === 'pronto') {
        novoStatus = 'pronto';
      } else if (existente.statusCozinha === 'pendente' || item.statusCozinha === 'pendente') {
        novoStatus = 'pendente';
      } else if (existente.statusCozinha === 'preparo' || item.statusCozinha === 'preparo') {
        novoStatus = 'preparo';
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
  const contexto = useAppContext();
  
  const mesaAtual = contexto.mesas.find(m => m.numero === Number(idMesa));
  const categorias = useMemo(() => contexto.categorias || [], [contexto.categorias]);

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

  const cardapioAtivo = useMemo(() => (contexto.produtos || []).filter(p => p.ativo !== false && p.id !== 999), [contexto.produtos]);
  
  const categoriasDisponiveis = useMemo(() => {
    if (categorias && categorias.length > 0) {
      return [...categorias]
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        .map(c => c.nome.trim().toUpperCase());
    }
    return Array.from(new Set(cardapioAtivo.map(p => extrairNomeCategoria(p.categoria).trim().toUpperCase())));
  }, [categorias, cardapioAtivo]);

  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [subcategoriaAtiva, setSubcategoriaAtiva] = useState<string | null>(null);
  const [buscaCardapio, setBuscaCardapio] = useState('');
  const [mostrarItens, setMostrarItens] = useState(false);
  const [statusSalvo, setStatusSalvo] = useState(false);

  const [mensagemToast, setMensagemToast] = useState<{
    texto: string;
    tipo: 'info' | 'alerta';
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const dispararToast = (texto: string, tipo: 'info' | 'alerta' = 'info') => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setMensagemToast({ texto, tipo });
    toastTimerRef.current = window.setTimeout(() => {
      setMensagemToast(null);
      toastTimerRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);
  
  const [etapaModal, setEtapaModal] = useState<0 | 1 | 2>(0);
  const [itemEditandoObs, setItemEditandoObs] = useState<ItemComanda | null>(null);
  const [textoObs, setTextoObs] = useState('');
  
  const [valorTaxa, setValorTaxa] = useState<number>(0);
  const [inputTaxa, setInputTaxa] = useState<string>('');
  const [tipoDesconto, setTipoDesconto] = useState<'fixo' | 'porcentagem'>('fixo');
  const [inputDesconto, setInputDesconto] = useState<string>('');
  
  const [pagamentosLancados, setPagamentosLancados] = useState<Pagamento[]>([]);
  const [valorDigitado, setValorDigitado] = useState('');
  const [consumoAberto, setConsumoAberto] = useState(false);
  const [alertaValor, setAlertaValor] = useState<{
    tipo: 'menor' | 'maior';
    lancado: number;
    total: number;
    diferenca: number;
  } | null>(null);

  const manipularProduto = (produto: Produto, acao: 'mais' | 'menos') => {
    setItensPedidos(prev => {
      const existe = prev.find(item => item.produto.id === produto.id);
      if (acao === 'mais') {
        if (produto.estoque !== undefined) {
          const qtdAtualNaMesa = existe ? existe.quantidade : 0;
          if (qtdAtualNaMesa >= produto.estoque) {
            dispararToast(
              `Sem estoque! Restam ${produto.estoque} un. de ${produto.nome.toUpperCase()}.`,
              'alerta'
            );
            return prev;
          }
        }
        dispararToast(`+1 ${produto.nome.toUpperCase()} adicionado`);
        if (existe) {
          return prev.map(item => item.produto.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item);
        }
        return [...prev, { id: `item_ui_${Date.now()}`, produto, quantidade: 1, statusCozinha: 'pendente' }];
      } else {
        if (!existe) return prev;
        dispararToast(`${produto.nome.toUpperCase()} atualizado`);
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
      contexto.atualizarStatusCozinha(Number(idMesa), itemCru.id, 'entregue');
    });

    setItensPedidos(prev => prev.map(item => 
      item.produto.id === produtoId ? { ...item, statusCozinha: 'entregue' } : item
    ));
    dispararToast("Item marcado como entregue!");
  };

  const valorTotalMenu = itensPedidos.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
  const quantidadeTotalItens = itensPedidos.reduce((total, item) => total + item.quantidade, 0);
  
  const taxaDigitada = useMemo(() => {
    const limpo = inputTaxa.replace(',', '.');
    const num = parseFloat(limpo);
    return isNaN(num) || num < 0 ? 0 : num;
  }, [inputTaxa]);

  const descontoCalculado = useMemo(() => {
    const limpo = inputDesconto.replace(',', '.');
    const num = parseFloat(limpo);
    if (isNaN(num) || num <= 0) return 0;
    if (tipoDesconto === 'porcentagem') {
      const pct = Math.min(100, Math.max(0, num));
      return (valorTotalMenu * pct) / 100;
    }
    return Math.min(valorTotalMenu + taxaDigitada, num);
  }, [inputDesconto, tipoDesconto, valorTotalMenu, taxaDigitada]);

  const totalCobrarFinal = useMemo(() => {
    return Math.max(0, (valorTotalMenu + taxaDigitada) - descontoCalculado);
  }, [valorTotalMenu, taxaDigitada, descontoCalculado]);

  const totalJaPago = useMemo(() => {
    return pagamentosLancados.reduce((acc, pag) => acc + pag.valor, 0);
  }, [pagamentosLancados]);

  const faltaPagar = useMemo(() => {
    const diff = totalCobrarFinal - totalJaPago;
    return diff > 0.009 ? diff : 0;
  }, [totalCobrarFinal, totalJaPago]);

  const troco = useMemo(() => {
    const excesso = totalJaPago - totalCobrarFinal;
    return excesso > 0.009 ? excesso : 0;
  }, [totalJaPago, totalCobrarFinal]);

  const handleConfirmarPedido = async () => {
    if (idMesa) {
      await contexto.salvarComanda(Number(idMesa), itensPedidos, nomeCliente);
      setStatusSalvo(true);
      dispararToast("Comanda salva com sucesso!");
      setTimeout(() => setStatusSalvo(false), 2000);
    }
  };

  const abrirModalFechamento = () => {
    setInputTaxa(valorTaxa > 0 ? valorTaxa.toString() : '');
    setInputDesconto('');
    setPagamentosLancados([]);
    setValorDigitado('');
    setConsumoAberto(false);
    setAlertaValor(null);
    setEtapaModal(1);
  };

  const avancaParaPagamento = () => {
    setValorTaxa(taxaDigitada);
    setPagamentosLancados([]); 
    setValorDigitado('');
    setAlertaValor(null);
    setEtapaModal(2);
  };

  const handleImprimirComanda = async () => {
    await imprimirCupomTermico({
      nomeEstabelecimento:
        contexto.dadosEmpresa?.nome_exibicao ||
        contexto.dadosEmpresa?.nome_fantasia ||
        NOME_PADRAO_SISTEMA,
      documentoEstabelecimento: contexto.dadosEmpresa?.documento || undefined,
      telefoneEstabelecimento: contexto.dadosEmpresa?.telefone || undefined,
      numeroMesa: Number(idMesa),
      nomeCliente: nomeCliente.trim() || 'Consumidor',
      garcomNome: contexto.garcomLogado?.nome || 'Equipe',
      itens: itensPedidos,
      subtotal: valorTotalMenu,
      taxaGuardaSol: taxaDigitada,
      desconto: descontoCalculado,
      totalFinal: totalCobrarFinal,
      pagamentos: pagamentosLancados,
      troco,
      isPreConta: pagamentosLancados.length === 0
    });
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
    const digitadoSemMetodo = parseFloat(valorDigitado.replace(',', '.'));
    const valorLancadoEfetivo =
      pagamentosLancados.length > 0
        ? totalJaPago
        : !isNaN(digitadoSemMetodo) && digitadoSemMetodo > totalCobrarFinal
        ? digitadoSemMetodo
        : totalJaPago;

    const centavosPago = Math.round(valorLancadoEfetivo * 100);
    const centavosTotal = Math.round(totalCobrarFinal * 100);

    if (centavosPago < centavosTotal) {
      setAlertaValor({
        tipo: 'menor',
        lancado: valorLancadoEfetivo,
        total: totalCobrarFinal,
        diferenca: (centavosTotal - centavosPago) / 100,
      });
      return;
    }

    if (centavosPago > centavosTotal) {
      setAlertaValor({
        tipo: 'maior',
        lancado: valorLancadoEfetivo,
        total: totalCobrarFinal,
        diferenca: (centavosPago - centavosTotal) / 100,
      });
      return;
    }

    await contexto.finalizarMesa(Number(idMesa), taxaDigitada, pagamentosLancados, descontoCalculado);
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

  const termoBuscaCardapio = buscaCardapio.trim().toLowerCase();
  const produtosBuscaRapida = useMemo(() => {
    if (!termoBuscaCardapio) return [];
    return cardapioAtivo.filter((p) => {
      const catNome = extrairNomeCategoria(p.categoria).toLowerCase();
      const subNome = (p.subcategoria || '').toLowerCase();
      return (
        p.nome.toLowerCase().includes(termoBuscaCardapio) ||
        catNome.includes(termoBuscaCardapio) ||
        subNome.includes(termoBuscaCardapio)
      );
    });
  }, [cardapioAtivo, termoBuscaCardapio]);

  const temAlteracoesPendentes = useMemo(() => {
    if (!mesaAtual || mesaAtual.numero !== mesaIdCarregada) return false;
    if (nomeCliente.trim() !== (mesaAtual.nomeCliente || '').trim()) return true;

    const originais = agruparItensParaInterface(mesaAtual.itens || []);
    if (originais.length !== itensPedidos.length) return true;

    const mapaOriginais = new Map(originais.map((i) => [i.produto.id, i]));
    return itensPedidos.some((atual) => {
      const orig = mapaOriginais.get(atual.produto.id);
      if (!orig) return true;
      return (
        orig.quantidade !== atual.quantidade ||
        (orig.observacao || '') !== (atual.observacao || '')
      );
    });
  }, [mesaAtual, mesaIdCarregada, nomeCliente, itensPedidos]);

  const renderizarCardProduto = (produto: Produto) => {
    const estaEsgotado = produto.estoque !== undefined && produto.estoque <= 0;
    const catNome = extrairNomeCategoria(produto.categoria);
    const qtdNaMesa = itensPedidos.find((i) => i.produto.id === produto.id)?.quantidade || 0;

    return (
      <button
        key={produto.id}
        type="button"
        onClick={() => !estaEsgotado && manipularProduto(produto, 'mais')}
        disabled={estaEsgotado}
        className={`group relative flex flex-col justify-between p-2 sm:p-2.5 rounded-4xl border text-left font-sans transition-all duration-200 ${
          estaEsgotado
            ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
            : 'bg-white border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 active:scale-[0.98] cursor-pointer'
        }`}
      >
        {/* FOTO EM DESTAQUE */}
        <div className="relative w-full aspect-square rounded-3xl bg-slate-50 border border-slate-100/90 overflow-hidden flex items-center justify-center select-none">
          {produto.imagem_url ? (
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                estaEsgotado ? 'opacity-50 grayscale' : ''
              }`}
            />
          ) : (
            <div
              className={`w-12 h-12 rounded-2xl bg-white border border-slate-200/70 shadow-2xs flex items-center justify-center text-slate-400 transition-transform duration-300 group-hover:scale-105 ${
                estaEsgotado ? 'opacity-40' : ''
              }`}
            >
              <IconeCategoria nomeCategoria={catNome} categorias={categorias} size={22} />
            </div>
          )}

          {qtdNaMesa > 0 && !estaEsgotado && (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-900/90 backdrop-blur-xs text-white text-[10px] font-semibold tabular-nums shadow-xs">
              {qtdNaMesa}x
            </span>
          )}

          {estaEsgotado && (
            <span className="absolute inset-x-2 bottom-2 text-center text-[9px] bg-rose-50/95 border border-rose-200/80 text-rose-500 px-2 py-1 rounded-full font-semibold uppercase tracking-wider backdrop-blur-xs">
              Esgotado
            </span>
          )}
        </div>

        {/* NOME DO PRODUTO */}
        <div className="px-1 pt-2 pb-1 flex-1 flex flex-col justify-start select-none">
          <p
            className={`text-[11px] sm:text-xs font-medium tracking-tight uppercase leading-snug line-clamp-2 min-h-8 ${
              estaEsgotado ? 'text-slate-400 line-through' : 'text-slate-700'
            }`}
          >
            {produto.nome}
          </p>
        </div>

        {/* BARRA INFERIOR COMPACTA SLATE-100 */}
        <div className="mt-1 w-full p-1.5 pl-2.5 rounded-3xl bg-slate-100 border border-slate-200/70 flex items-center justify-between gap-1.5 select-none">
          <div className="min-w-0 flex flex-col">
            <span className="text-[11px] sm:text-xs font-medium text-slate-400 tabular-nums leading-none">
              {formatarMoeda(produto.preco)}
            </span>
            <span
              className={`text-[9px] font-medium uppercase tracking-wide truncate block mt-0.5 ${
                estaEsgotado ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {estaEsgotado ? 'Esgotado' : (produto.subcategoria || 'UNID.')}
            </span>
          </div>

          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all shadow-2xs ${
              estaEsgotado
                ? 'bg-slate-200/70 text-slate-400 border border-slate-200'
                : 'bg-white border border-slate-200/90 text-slate-400 group-hover:text-slate-600 group-hover:border-slate-300 group-hover:scale-105'
            }`}
          >
            {estaEsgotado ? (
              <LucideIcons.X size={13} strokeWidth={2} />
            ) : (
              <LucideIcons.Plus size={14} strokeWidth={2} />
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-dvh bg-slate-50 font-sans pt-22 sm:pt-24 md:pt-24 md:pl-18 pb-32 lg:pb-28 relative overflow-hidden select-none">
      
      {/* TOAST DE NOTIFICAÇÃO */}
      {mensagemToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-md flex justify-center animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="bg-slate-900/95 text-white px-5 py-3 rounded-full shadow-xl backdrop-blur-md border border-white/10 flex items-center gap-3 max-w-full">
            <span
              className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${
                mensagemToast.tipo === 'alerta' ? 'bg-amber-400' : 'bg-teal-400'
              }`}
            ></span>
            <span className="text-[11px] font-bold uppercase tracking-widest truncate">
              {mensagemToast.texto}
            </span>
          </div>
        </div>
      )}

      {/* FUNDO */}
      <div
        aria-hidden="true"
        className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 rounded-full pointer-events-none bg-radial from-teal-400/15 to-transparent blur-2xl"
      />
      <div
        aria-hidden="true"
        className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] max-w-125 max-h-125 rounded-full pointer-events-none bg-radial from-indigo-400/15 to-transparent blur-2xl"
      />

      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-8 relative z-10 flex flex-col lg:grid lg:grid-cols-[1fr_420px] gap-6 lg:gap-8 items-start">
        
        {/* LADO ESQUERDO: MENU / CARDÁPIO */}
        <div className="w-full space-y-5 order-2 lg:order-1">
          {/* BUSCA RÁPIDA DE PRODUTOS */}
          <div className="relative">
            <LucideIcons.Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={buscaCardapio}
              onChange={(e) => setBuscaCardapio(e.target.value)}
              placeholder="Buscar produto"
              className="w-full h-11 pl-10 pr-9 rounded-full bg-white border border-slate-200 shadow-2xs text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
            />
            {buscaCardapio && (
              <button
                type="button"
                onClick={() => setBuscaCardapio('')}
                aria-label="Limpar busca"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <LucideIcons.X size={14} />
              </button>
            )}
          </div>

          {termoBuscaCardapio ? (
            <section className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  Resultados ({produtosBuscaRapida.length})
                </span>
                <button
                  type="button"
                  onClick={() => setBuscaCardapio('')}
                  className="text-[11px] font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
                >
                  Limpar busca
                </button>
              </div>
              {produtosBuscaRapida.length === 0 ? (
                <p className="text-center text-[11px] uppercase tracking-widest font-medium text-slate-400 py-10 bg-white rounded-4xl border border-slate-200 border-dashed select-none">
                  <span>Nenhum produto encontrado para &ldquo;{buscaCardapio}&rdquo;.</span>
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                  {produtosBuscaRapida.map((produto) => renderizarCardProduto(produto))}
                </div>
              )}
            </section>
          ) : !categoriaAtiva ? (
            <section className="space-y-4 animate-in fade-in duration-300">
              <h3 className="flex items-center justify-center gap-3 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-4 select-none">
                <div className="w-12 h-px bg-slate-200"></div> <span>Categorias</span> <div className="w-12 h-px bg-slate-200"></div>
              </h3>
              {categoriasDisponiveis.length === 0 ? (
                <div className="bg-white p-8 rounded-4xl border border-dashed border-slate-300 text-center shadow-2xs select-none">
                  <p className="text-slate-400 font-medium text-sm"><span>O cardápio está vazio.</span></p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                  {categoriasDisponiveis.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategoriaAtiva(cat);
                        setSubcategoriaAtiva(null);
                      }}
                      className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.97] transition-all group cursor-pointer"
                    >
                      <div className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-50 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-center mb-2.5 text-slate-500 group-hover:text-slate-700 group-hover:scale-105 transition-all duration-200">
                        <IconeCategoria nomeCategoria={cat} categorias={categorias} size={22} />
                      </div>
                      <span className="text-[11px] font-medium text-slate-700 uppercase tracking-tight text-center leading-tight line-clamp-2 select-none">
                        <span>{cat}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between gap-2 px-1 mb-3">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2.5 uppercase select-none min-w-0 flex-1">
                  <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-500 shrink-0">
                    <IconeCategoria nomeCategoria={categoriaAtiva} categorias={categorias} size={18} />
                  </span>
                  <span className="truncate">{categoriaAtiva}</span>
                </h3>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {subcategoriasDisponiveis.length > 0 && (
                    <MenuSimplesDropdown
                      opcoes={[
                        { chave: '__TODOS__', label: 'Todos' },
                        ...subcategoriasDisponiveis.map((sub) => ({ chave: sub, label: sub }))
                      ]}
                      valor={subcategoriaAtiva ?? '__TODOS__'}
                      onChange={(val) => setSubcategoriaAtiva(val === '__TODOS__' ? null : val)}
                      tituloMenu="Filtrar tamanho / variação"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCategoriaAtiva(null);
                      setSubcategoriaAtiva(null);
                    }}
                    className="h-8 px-3 sm:px-3.5 rounded-full bg-white border border-slate-200/90 hover:bg-slate-50 hover:text-slate-800 text-xs font-medium text-slate-600 inline-flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <LucideIcons.ArrowLeft size={13} strokeWidth={2} />
                    <span>Voltar</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
                {produtosExibidosMenu.length === 0 ? (
                   <p className="col-span-full text-center text-[11px] uppercase tracking-widest font-medium text-slate-400 py-10 bg-white rounded-4xl border border-slate-200 border-dashed select-none"><span>Nenhum produto nesta variação.</span></p>
                ) : (
                  produtosExibidosMenu.map((produto) => renderizarCardProduto(produto))
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
              className="w-full pl-12 pr-5 h-13 bg-white rounded-full shadow-sm border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100 font-sans text-slate-800 transition-all uppercase tracking-wide text-[12px]" 
            />
          </div>

          <section>
            <button
              type="button"
              onClick={() => setMostrarItens(!mostrarItens)}
              aria-expanded={mostrarItens}
              className="w-full relative overflow-hidden rounded-4xl bg-linear-to-br from-emerald-900 to-emerald-950 border border-emerald-800/60 shadow-lg shadow-emerald-950/15 active:scale-[0.99] transition-all p-5 sm:p-6 text-left group cursor-pointer"
            >
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none"
              />
              <div
                aria-hidden="true"
                className="absolute -left-12 -bottom-16 w-40 h-40 rounded-full bg-teal-400/10 blur-2xl pointer-events-none"
              />
              <div className="flex justify-between items-start relative z-10 select-none">
                <div>
                  <h2 className="text-emerald-200/80 text-[10px] font-medium uppercase tracking-[0.2em] mb-1.5">
                    <span>Total da Mesa</span>
                  </h2>
                  <p className="text-3xl sm:text-4xl font-semibold tracking-tight text-white tabular-nums leading-none">
                    <span>{formatarMoeda(valorTotalMenu)}</span>
                  </p>
                </div>
                <div
                  className={`w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center transition-transform duration-300 ease-out text-emerald-100 ${
                    mostrarItens ? 'rotate-180' : ''
                  }`}
                >
                  <LucideIcons.ChevronDown size={18} strokeWidth={2} />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-emerald-100 text-[10px] font-medium uppercase tracking-widest relative z-10 bg-emerald-500/20 border border-emerald-400/20 px-3 py-1.5 rounded-full select-none">
                <span className="flex h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
                <span>{quantidadeTotalItens} {quantidadeTotalItens === 1 ? 'Item Adicionado' : 'Itens Adicionados'}</span>
              </div>
            </button>

            <div
              className={`grid transition-all duration-300 ease-out ${
                mostrarItens
                  ? 'grid-rows-[1fr] opacity-100 translate-y-0 mt-3'
                  : 'grid-rows-[0fr] opacity-0 -translate-y-1 mt-0 pointer-events-none'
              }`}
            >
              <div className="overflow-hidden">
                <div className="bg-white rounded-4xl border border-slate-200/80 p-2.5 shadow-sm lg:max-h-[50vh] lg:overflow-y-auto scrollbar-hide">
                  {itensPedidos.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 text-[11px] font-medium uppercase tracking-widest select-none">
                      <span>Nenhum item na mesa.</span>
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {itensPedidos.map((item) => {
                        const itemCatNome = extrairNomeCategoria(item.produto.categoria);
                        const produtoCatalogo = cardapioAtivo.find((p) => p.id === item.produto.id);
                        const tamanhoItem = (
                          item.produto.subcategoria ||
                          produtoCatalogo?.subcategoria ||
                          ''
                        ).trim();

                        return (
                          <div key={item.id} className="flex flex-col p-2 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden">
                            <div className="flex items-start gap-3">
                              <div className="shrink-0">
                                {item.produto.imagem_url ? (
                                  <img
                                    src={item.produto.imagem_url}
                                    alt={item.produto.nome}
                                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200/80 shadow-2xs"
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 shadow-2xs">
                                    <IconeCategoria nomeCategoria={itemCatNome} categorias={categorias} size={20} />
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 min-h-14">
                                <div className="flex items-start justify-between gap-2 w-full select-none">
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-medium text-slate-700 text-xs leading-tight uppercase truncate">
                                      <span>{item.produto.nome}</span>
                                    </span>
                                    {item.observacao && (
                                      <span className="text-[9px] text-sky-600 font-medium uppercase tracking-wider bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md truncate max-w-full inline-block mt-1 self-start">
                                        <span>OBS: {item.observacao}</span>
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setItemEditandoObs(item);
                                      setTextoObs(item.observacao || '');
                                    }}
                                    aria-label="Adicionar observação"
                                    className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50 transition-colors active:scale-90 shrink-0 cursor-pointer"
                                  >
                                    <LucideIcons.MessageSquarePlus size={12} strokeWidth={2} />
                                  </button>
                                </div>

                                <div className="flex items-center justify-between gap-2 w-full mt-1.5 select-none">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                    <span className="text-xs text-slate-400 font-medium tabular-nums">
                                      <span>{formatarMoeda(item.produto.preco)}</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200/80 text-[9px] font-medium uppercase tracking-wider text-slate-400 truncate max-w-24">
                                      <span>{tamanhoItem || 'UNID.'}</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-slate-200/90 shadow-2xs shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => manipularProduto(item.produto, 'menos')}
                                      aria-label="Diminuir quantidade"
                                      className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500 active:scale-95 transition-all cursor-pointer"
                                    >
                                      <LucideIcons.Minus size={12} strokeWidth={2} />
                                    </button>
                                    <span className="font-medium text-slate-700 text-xs w-5 text-center tabular-nums">
                                      <span>{item.quantidade}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => manipularProduto(item.produto, 'mais')}
                                      aria-label="Aumentar quantidade"
                                      className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 active:scale-95 transition-all cursor-pointer"
                                    >
                                      <LucideIcons.Plus size={12} strokeWidth={2} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {item.statusCozinha === 'pronto' && (
                              <button
                                type="button"
                                onClick={() => marcarComoEntregue(item.produto.id)}
                                className="mt-2.5 w-full bg-emerald-700 hover:bg-emerald-800 text-white py-2 rounded-3xl text-[10px] font-medium uppercase tracking-widest transition-all flex items-center justify-center gap-2 select-none shadow-xs cursor-pointer"
                              >
                                <LucideIcons.BellRing size={13} strokeWidth={2} className="animate-bounce" />
                                <span>Entregar na Mesa</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* BARRA FIXA INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 md:left-18 px-4 md:px-8 pt-3 pb-safe-4 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-lg shadow-slate-900/5 select-none">
        <div className="flex items-center gap-3 sm:gap-4 max-w-6xl mx-auto">
          <button
            type="button"
            onClick={abrirModalFechamento}
            className="flex-1 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 h-11 rounded-2xl font-semibold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <LucideIcons.Receipt size={16} strokeWidth={2} />
            <span>Fechar Conta</span>
          </button>
          <button
            type="button"
            onClick={handleConfirmarPedido}
            className="flex-1 bg-teal-800 hover:bg-teal-900 text-white h-11 rounded-2xl font-semibold text-xs uppercase tracking-wider shadow-lg shadow-teal-700/20 px-4 py-2 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <LucideIcons.Save size={16} strokeWidth={2} />
            <span>{statusSalvo ? 'Salvo!' : 'Salvar'}</span>
            {temAlteracoesPendentes && !statusSalvo && (
              <span
                aria-label="Alterações pendentes"
                className="w-2 h-2 rounded-full bg-amber-300 animate-pulse shrink-0"
              />
            )}
          </button>
        </div>
      </div>

      {/* MODAL: OBSERVAÇÃO */}
      {itemEditandoObs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 select-none">
          <div className="absolute inset-0" onClick={() => setItemEditandoObs(null)}></div>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 flex flex-col relative z-50 animate-in zoom-in-95 duration-200 font-sans">
            <h3 className="text-[15px] font-semibold text-slate-800 mb-1 tracking-tight">Nota para a Cozinha</h3>
            <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-widest mb-4 bg-blue-50 border border-blue-100 inline-block px-3 py-1 rounded-full truncate max-w-full">
              {itemEditandoObs.produto.nome}
            </p>
            <textarea
              autoFocus
              value={textoObs}
              onChange={(e) => setTextoObs(e.target.value)}
              placeholder="Ex: Sem cebola, gelo à parte..."
              className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 outline-none focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100 resize-none h-32 text-slate-800 font-medium text-[13px] mb-5 transition-all"
            />
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setItemEditandoObs(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium h-11 rounded-xl text-xs active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarObservacao}
                className="flex-[1.4] bg-slate-900 hover:bg-black text-white font-semibold h-11 rounded-xl shadow-md text-xs active:scale-95 transition-all"
              >
                Salvar Nota
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FECHAMENTO DE CONTA & PAGAMENTO (DESIGN MINIMALISTA) */}
      {etapaModal > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200 select-none">
          <div className="absolute inset-0" onClick={() => setEtapaModal(0)}></div>
          <div className="bg-white rounded-3xl sm:rounded-4xl p-5 sm:p-6 w-full max-w-md shadow-2xl shadow-slate-900/10 border border-slate-100 relative z-50 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 font-sans">
            
            {/* CABEÇALHO PADRÃO CLEAN */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 mb-3.5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                  {etapaModal === 1 ? (
                    <LucideIcons.Receipt size={18} strokeWidth={1.8} />
                  ) : (
                    <LucideIcons.CreditCard size={18} strokeWidth={1.8} />
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-slate-800 tracking-tight">
                      {etapaModal === 1 ? 'Fechar Comanda' : 'Baixa de Pagamento'}
                    </h3>
                    <span className="text-[10px] font-medium text-teal-700 bg-teal-50 border border-teal-100/80 px-2 py-0.5 rounded-md">
                      Mesa {idMesa}
                    </span>
                  </div>
                  <p className="text-[11px] font-normal text-slate-400">
                    {etapaModal === 1
                      ? (nomeCliente ? `Cliente: ${nomeCliente}` : 'Valor Guarda-Sol e descontos')
                      : `Total a pagar: ${formatarMoeda(totalCobrarFinal)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleImprimirComanda}
                  className="h-8 px-2.5 rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-200/80 text-teal-800 text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Imprimir Conta de Consumo"
                >
                  <LucideIcons.Printer size={14} strokeWidth={1.9} />
                  <span>Imprimir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEtapaModal(0)}
                  className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all active:scale-90"
                >
                  <LucideIcons.X size={15} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* ETAPA 1: AJUSTES DA COMANDA (CONSUMO EXPANSÍVEL + VALOR GUARDA-SOL + DESCONTO + RESUMO) */}
            {etapaModal === 1 && (
              <div className="flex flex-col space-y-2.5 overflow-y-auto pr-0.5">
                {/* BLOCO: CONSUMO DA MESA (CLICÁVEL COM EFEITO SLIDE UP/DOWN) */}
                <div className="bg-slate-50/70 border border-slate-100/90 rounded-2xl overflow-hidden transition-colors">
                  <button
                    type="button"
                    onClick={() => setConsumoAberto(prev => !prev)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/60 flex items-center justify-center text-slate-500 shadow-2xs shrink-0">
                        <LucideIcons.ShoppingBag size={15} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 leading-tight">Consumo da Mesa</p>
                        <p className="text-[10px] text-slate-400">
                          {quantidadeTotalItens} {quantidadeTotalItens === 1 ? 'item lançado' : 'itens lançados'} • Toque para {consumoAberto ? 'recolher' : 'ver itens'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-slate-700 tabular-nums">
                        {formatarMoeda(valorTotalMenu)}
                      </span>
                      <div
                        className={`w-6 h-6 rounded-full bg-white border border-slate-200/70 flex items-center justify-center text-slate-400 transition-transform duration-300 ${
                          consumoAberto ? 'rotate-180 text-slate-700' : ''
                        }`}
                      >
                        <LucideIcons.ChevronDown size={13} strokeWidth={2.2} />
                      </div>
                    </div>
                  </button>

                  {/* LISTA EXPANSÍVEL COM EFEITO SUAVE DE DESLIZAR (ABRIR / SUBIR SUMINDO) */}
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${
                      consumoAberto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-3 pb-3 pt-1 border-t border-slate-200/60 space-y-1.5 max-h-44 overflow-y-auto">
                        {itensPedidos.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-2">
                            Nenhum item lançado nesta mesa.
                          </p>
                        ) : (
                          itensPedidos.map((item) => {
                            const prodCat = cardapioAtivo.find((p) => p.id === item.produto.id);
                            const tamanhoModal = (
                              item.produto.subcategoria ||
                              prodCat?.subcategoria ||
                              ''
                            ).trim();

                            return (
                              <div
                                key={item.id}
                                className="bg-white rounded-xl px-2.5 py-2 border border-slate-100 flex items-center justify-between gap-2 text-xs shadow-2xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] flex items-center justify-center shrink-0 tabular-nums">
                                    {item.quantidade}x
                                  </span>
                                  <span className="font-medium text-slate-700 truncate text-[11px] uppercase">
                                    {item.produto.nome}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/80 text-[9px] font-medium uppercase tracking-wider text-slate-400 shrink-0">
                                    {tamanhoModal || 'UNID.'}
                                  </span>
                                </div>
                                <span className="font-semibold text-slate-700 tabular-nums text-[11px] shrink-0">
                                  {formatarMoeda(item.produto.preco * item.quantidade)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* LINHA COMPACTA: VALOR GUARDA-SOL */}
                <div className="bg-slate-50/70 border border-slate-100/90 rounded-2xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shadow-2xs shrink-0">
                      <LucideIcons.Umbrella size={15} strokeWidth={1.8} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 truncate">Valor Guarda-Sol</span>
                  </div>

                  <div className="relative flex items-center w-28 shrink-0">
                    <span className="absolute left-2.5 text-[11px] font-semibold text-slate-400 pointer-events-none select-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputTaxa}
                      onChange={(e) => setInputTaxa(e.target.value.replace(/[^0-9.,]/g, ''))}
                      placeholder="0,00"
                      className="w-full bg-white pl-7 pr-2.5 h-9 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-xs font-semibold text-slate-700 text-right transition-all tabular-nums outline-none shadow-2xs"
                    />
                  </div>
                </div>

                {/* LINHA COMPACTA: DESCONTO NA COMANDA */}
                <div className="bg-slate-50/70 border border-slate-100/90 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs shrink-0">
                      <LucideIcons.Tag size={15} strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-slate-700 block leading-tight">Desconto</span>
                      {descontoCalculado > 0 && (
                        <span className="text-[10px] font-semibold text-emerald-600 tabular-nums">
                          -{formatarMoeda(descontoCalculado)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="bg-slate-200/70 p-0.5 rounded-lg flex items-center">
                      <button
                        type="button"
                        onClick={() => setTipoDesconto('fixo')}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                          tipoDesconto === 'fixo'
                            ? 'bg-white text-slate-800 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        R$
                      </button>
                      <button
                        type="button"
                        onClick={() => setTipoDesconto('porcentagem')}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                          tipoDesconto === 'porcentagem'
                            ? 'bg-white text-slate-800 shadow-2xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        %
                      </button>
                    </div>

                    <div className="relative flex items-center w-24">
                      <span className="absolute left-2.5 text-[11px] font-semibold text-slate-400 pointer-events-none select-none">
                        {tipoDesconto === 'fixo' ? 'R$' : '%'}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={inputDesconto}
                        onChange={(e) => setInputDesconto(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder={tipoDesconto === 'fixo' ? '0,00' : '0'}
                        className="w-full bg-white pl-7 pr-2.5 h-9 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-xs font-semibold text-slate-700 text-right transition-all tabular-nums outline-none shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* RESUMO TOTAL DA CONTA */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>Consumo</span>
                    <span className="tabular-nums font-medium">{formatarMoeda(valorTotalMenu)}</span>
                  </div>
                  {taxaDigitada > 0 && (
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>Valor Guarda-Sol</span>
                      <span className="tabular-nums font-medium text-sky-700">+{formatarMoeda(taxaDigitada)}</span>
                    </div>
                  )}
                  {descontoCalculado > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600">
                      <span>Desconto concedido</span>
                      <span className="tabular-nums font-medium">-{formatarMoeda(descontoCalculado)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-100 pt-2 flex items-baseline justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total a Cobrar</p>
                    </div>
                    <span className="text-2xl font-bold text-slate-800 tabular-nums">
                      {formatarMoeda(totalCobrarFinal)}
                    </span>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex gap-2.5 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEtapaModal(0)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium h-11 rounded-xl text-xs active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={avancaParaPagamento}
                    className="flex-[1.4] bg-slate-900 hover:bg-black text-white font-semibold h-11 rounded-xl shadow-md text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span>Ir para Pagamento</span>
                    <LucideIcons.ArrowRight size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2: BAIXA DE PAGAMENTO */}
            {etapaModal === 2 && (
              <div className="flex flex-col space-y-3 overflow-y-auto pr-0.5">
                {/* CARD DO TOTAL A PAGAR */}
                <div className="bg-slate-50/80 border border-slate-100/90 rounded-2xl p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total a Pagar</span>
                    <span className="text-xl font-bold text-slate-800 tabular-nums">{formatarMoeda(totalCobrarFinal)}</span>
                  </div>
                  {(taxaDigitada > 0 || descontoCalculado > 0) && (
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      {taxaDigitada > 0 && (
                        <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md font-medium">
                          Valor Guarda-Sol: +{formatarMoeda(taxaDigitada)}
                        </span>
                      )}
                      {descontoCalculado > 0 && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-medium">
                          Desconto: -{formatarMoeda(descontoCalculado)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* FORMULÁRIO DE LANÇAMENTO DE PAGAMENTO */}
                <div className="space-y-2.5">
                  <div className="bg-slate-50/70 border border-slate-100/90 rounded-2xl p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-slate-700 block leading-tight">Valor do Lançamento</span>
                      {faltaPagar > 0 ? (
                        <button
                          type="button"
                          onClick={() => setValorDigitado(faltaPagar.toFixed(2))}
                          className="text-[10px] font-medium text-teal-600 hover:text-teal-700 hover:underline"
                        >
                          Usar restante ({formatarMoeda(faltaPagar)})
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400">Escolha a forma abaixo</span>
                      )}
                    </div>

                    <div className="relative flex items-center w-32 shrink-0">
                      <span className="absolute left-2.5 text-[11px] font-semibold text-slate-400 pointer-events-none select-none">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valorDigitado}
                        onChange={(e) => setValorDigitado(e.target.value.replace(/[^0-9.,]/g, ''))}
                        placeholder={faltaPagar > 0 ? faltaPagar.toFixed(2) : '0,00'}
                        className="w-full bg-white pl-7 pr-2.5 h-9 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 text-xs font-semibold text-slate-700 text-right transition-all tabular-nums outline-none shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* MÉTODOS DE PAGAMENTO */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAdicionarPagamento('PIX')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 flex items-center gap-2.5 transition-all active:scale-[0.98] shadow-2xs text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 shrink-0 group-hover:scale-105 transition-transform">
                        <LucideIcons.QrCode size={16} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700 leading-none mb-0.5">PIX</p>
                        <p className="text-[10px] text-slate-400 leading-none">Instantâneo</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdicionarPagamento('Crédito')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 flex items-center gap-2.5 transition-all active:scale-[0.98] shadow-2xs text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-105 transition-transform">
                        <LucideIcons.CreditCard size={16} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700 leading-none mb-0.5">Crédito</p>
                        <p className="text-[10px] text-slate-400 leading-none">Cartão</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdicionarPagamento('Débito')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 flex items-center gap-2.5 transition-all active:scale-[0.98] shadow-2xs text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
                        <LucideIcons.CreditCard size={16} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700 leading-none mb-0.5">Débito</p>
                        <p className="text-[10px] text-slate-400 leading-none">Cartão</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAdicionarPagamento('Dinheiro')}
                      className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 flex items-center gap-2.5 transition-all active:scale-[0.98] shadow-2xs text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                        <LucideIcons.Banknote size={16} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-700 leading-none mb-0.5">Dinheiro</p>
                        <p className="text-[10px] text-slate-400 leading-none">Espécie</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* LISTA DE PAGAMENTOS JÁ REGISTRADOS */}
                {pagamentosLancados.length > 0 && (
                  <div className="space-y-1.5 bg-slate-50/60 p-2.5 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                      Pagamentos Lançados ({pagamentosLancados.length})
                    </span>
                    <div className="space-y-1.5">
                      {pagamentosLancados.map((pag, idx) => (
                        <div key={idx} className="bg-white rounded-xl p-2 px-3 border border-slate-200/80 flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                            <span className="text-teal-600"><LucideIcons.CheckCircle2 size={15} strokeWidth={2} /></span>
                            <span>{pag.metodo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 tabular-nums">{formatarMoeda(pag.valor)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoverPagamento(idx)}
                              className="w-6 h-6 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors active:scale-90"
                              title="Remover pagamento"
                            >
                              <LucideIcons.Trash2 size={13} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STATUS DO LANÇAMENTO */}
                {faltaPagar > 0 ? (
                  <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-2.5 px-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                      <LucideIcons.Clock size={15} strokeWidth={2} />
                      <span>Falta Receber</span>
                    </div>
                    <span className="text-amber-800 font-bold text-sm tabular-nums">
                      {formatarMoeda(faltaPagar)}
                    </span>
                  </div>
                ) : troco > 0 ? (
                  <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 px-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-700 text-xs font-medium">
                      <LucideIcons.AlertCircle size={15} strokeWidth={2} />
                      <span>Valor Acima do Total</span>
                    </div>
                    <span className="text-rose-700 font-bold text-sm tabular-nums">
                      +{formatarMoeda(troco)}
                    </span>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 px-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                      <LucideIcons.CheckCircle2 size={16} strokeWidth={2.2} />
                      <span>Valor Exato Lançado</span>
                    </div>
                    <span className="text-emerald-800 font-bold text-sm tabular-nums">
                      {formatarMoeda(totalJaPago)}
                    </span>
                  </div>
                )}

                {/* BOTÕES DE AÇÃO */}
                <div className="flex gap-2.5 pt-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEtapaModal(1)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium h-11 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <LucideIcons.ArrowLeft size={14} strokeWidth={2} />
                    <span>Ajustes</span>
                  </button>
                  <button
                    type="button"
                    onClick={concluirMesaFinal}
                    className="flex-[1.4] bg-slate-900 hover:bg-black text-white font-semibold h-11 rounded-xl shadow-md transition-all text-xs flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                  >
                    <LucideIcons.CheckCircle2 size={15} strokeWidth={2} />
                    <span>Encerrar Mesa</span>
                  </button>
                </div>
              </div>
            )}

            {/* POPUP DE ALERTA DE DIVERGÊNCIA DE VALOR (MENOR OU MAIOR QUE O TOTAL A PAGAR) */}
            {alertaValor && (
              <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                <div className="bg-white rounded-3xl p-5 w-full max-w-xs border border-slate-100 shadow-2xl text-center space-y-3.5 animate-in zoom-in-95 duration-150">
                  <div
                    className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center border ${
                      alertaValor.tipo === 'menor'
                        ? 'bg-amber-50 border-amber-200 text-amber-600'
                        : 'bg-rose-50 border-rose-200 text-rose-600'
                    }`}
                  >
                    <LucideIcons.AlertTriangle size={22} strokeWidth={2} />
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                      {alertaValor.tipo === 'menor'
                        ? 'Valor menor que o total'
                        : 'Valor maior que o total'}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      O valor lançado (
                      <strong className="text-slate-700 tabular-nums">
                        {formatarMoeda(alertaValor.lancado)}
                      </strong>
                      ) é{' '}
                      <strong
                        className={
                          alertaValor.tipo === 'menor' ? 'text-amber-700' : 'text-rose-600'
                        }
                      >
                        {alertaValor.tipo === 'menor' ? 'menor' : 'maior'}
                      </strong>{' '}
                      que o valor total a pagar (
                      <strong className="text-slate-800 tabular-nums">
                        {formatarMoeda(alertaValor.total)}
                      </strong>
                      ). Ajuste os pagamentos antes de encerrar a mesa.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAlertaValor(null)}
                    className="w-full h-10 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-all active:scale-95"
                  >
                    Entendi, ajustar valor
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
