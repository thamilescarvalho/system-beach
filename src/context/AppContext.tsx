// src/context/AppContext.tsx
/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Mesa, ItemComanda, VendaFechada, Garcom, Produto, MovimentacaoEstoque, Pagamento, Categoria } from '../types';

interface DBMesa { id: number; numero: number; status: 'livre' | 'ocupada'; garcom_id?: string; garcom_nome?: string; nome_cliente?: string; itens?: ItemComanda[]; }
interface DBProduto { id: number; nome: string; categoria: string; subcategoria?: string; imagem_url?: string; preco: number; preco_custo: number; estoque?: number; ativo: boolean; }
interface DBVenda { id: string; numero_mesa: number; total: number; pagamentos?: Pagamento[]; itens?: ItemComanda[]; garcom_nome: string; nome_cliente?: string; status: string; data_fechamento: string; cancelado_por?: string; motivo_cancelamento?: string; data_cancelamento?: string; }
interface DBUsuario { id: string; nome: string; avatar: string; cargo: 'admin' | 'garcom'; pin?: string; }
interface DBHistorico { id: string; produto_id: number; produto_nome: string; tipo: string; quantidade: number; preco_custo: number; usuario_nome: string; data: string; }
interface DBCategoria { id: number; nome: string; icone: string; ativo: boolean; ordem: number; }

interface AppContextType {
  mesas: Mesa[];
  historicoVendas: VendaFechada[];
  garcomLogado: Garcom | null;
  setGarcomLogado: (garcom: Garcom | null) => void;
  usuarios: Garcom[]; 
  produtos: Produto[];
  categorias: Categoria[];
  historicoEstoque: MovimentacaoEstoque[];
  
  uploadImagemProduto: (file: File) => Promise<string | null>;
  autenticarUsuario: (id: string, pinDigitado: string) => Promise<boolean>; 
  
  adicionarProduto: (produto: Omit<Produto, 'id'>) => Promise<void>;
  editarProduto: (id: number, atualizacao: Partial<Produto>) => Promise<void>;
  excluirProduto: (id: number) => Promise<void>;
  alternarStatusProduto: (id: number) => Promise<void>;

  adicionarCategoria: (nome: string, icone: string) => Promise<void>;
  editarCategoria: (id: number, nome: string, icone: string) => Promise<void>;
  excluirCategoria: (id: number) => Promise<void>;
  reordenarCategorias: (categoriasReordenadas: Categoria[]) => Promise<void>;
  
  darEntradaEstoque: (idProduto: number, qtdAdicionada: number, precoCusto: number, usuario: string) => Promise<void>;
  registrarInventario: (idProduto: number, qtdFisicaReal: number, usuario: string) => Promise<void>;
  
  adicionarUsuario: (usuario: Garcom) => Promise<void>;
  removerUsuario: (id: string) => Promise<void>;
  editarUsuario: (id: string, dadosAtualizados: Partial<Garcom>) => Promise<void>;
  
  adicionarMesa: (numero: number) => Promise<void>;
  removerMesa: (numero: number) => Promise<void>;
  
  atualizarStatusCozinha: (numeroMesa: number, idItem: string, status: 'pendente' | 'pronto' | 'entregue') => Promise<void>;
  salvarComanda: (numeroMesa: number, itens: ItemComanda[], nomeCliente: string) => Promise<void>;
  finalizarMesa: (numeroMesa: number, incluirServico: boolean, pagamentosRealizados: Pagamento[]) => Promise<void>;
  cancelarVenda: (idVenda: string, motivo: string, adminNome: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

const cifrarSessao = (dados: object) => { try { const jsonStr = encodeURIComponent(JSON.stringify(dados)); return btoa(jsonStr).split('').reverse().join(''); } catch { return ''; } };
const decifrarSessao = (cifra: string) => { try { const revertido = atob(cifra.split('').reverse().join('')); return JSON.parse(decodeURIComponent(revertido)); } catch { return null; } };

export function AppProvider({ children }: { children: ReactNode }) {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [historicoVendas, setHistoricoVendas] = useState<VendaFechada[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [historicoEstoque, setHistoricoEstoque] = useState<MovimentacaoEstoque[]>([]);
  const [usuarios, setUsuarios] = useState<Garcom[]>([]);
  
  const [garcomLogado, setGarcomLogadoState] = useState<Garcom | null>(() => {
    const salvo = localStorage.getItem('coral_device_session');
    return salvo ? decifrarSessao(salvo) : null;
  });

  const setGarcomLogado = (garcom: Garcom | null) => {
    if (garcom) { localStorage.setItem('coral_device_session', cifrarSessao(garcom)); } else { localStorage.removeItem('coral_device_session'); }
    setGarcomLogadoState(garcom);
  };

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const fazerLogout = () => setGarcomLogado(null);
    const resetarTimer = () => { clearTimeout(timeoutId); timeoutId = setTimeout(fazerLogout, 30 * 60 * 1000); };
    if (garcomLogado) {
      resetarTimer(); window.addEventListener('mousemove', resetarTimer); window.addEventListener('keydown', resetarTimer); window.addEventListener('touchstart', resetarTimer); window.addEventListener('click', resetarTimer); window.addEventListener('scroll', resetarTimer);
    }
    return () => {
      clearTimeout(timeoutId); window.removeEventListener('mousemove', resetarTimer); window.removeEventListener('keydown', resetarTimer); window.removeEventListener('touchstart', resetarTimer); window.removeEventListener('click', resetarTimer); window.removeEventListener('scroll', resetarTimer);
    };
  }, [garcomLogado]);

  const carregarDados = useCallback(async () => {
    try {
      const [resMesas, resProds, resVendas, resUsers, resHist, resCats] = await Promise.all([
        supabase.from('mesas').select('*').order('numero'),
        supabase.from('produtos').select('*').order('id'),
        supabase.from('vendas').select('*').order('data_fechamento', { ascending: false }),
        supabase.from('usuarios').select('id, nome, avatar, cargo'), 
        supabase.from('historico_estoque').select('*').order('data', { ascending: false }),
        supabase.from('categorias').select('*').order('ordem', { ascending: true }) // Garante que a ordem visual seja respeitada
      ]);

      let dadosMesas = resMesas.data;
      if (dadosMesas && dadosMesas.length === 0) {
        const mesasPadrao = [1, 2, 3, 4, 5, 6].map(n => ({ numero: n, status: 'livre', itens: [] }));
        const { error } = await supabase.from('mesas').insert(mesasPadrao);
        if (!error) { const novasMesas = await supabase.from('mesas').select('*').order('numero'); dadosMesas = novasMesas.data; }
      }
      if (dadosMesas) setMesas(dadosMesas.map((m: DBMesa) => ({ id: m.id, numero: m.numero, status: m.status, garcomId: m.garcom_id, garcomNome: m.garcom_nome, nomeCliente: m.nome_cliente || '', itens: m.itens || [] })));
      if (resProds.data) setProdutos(resProds.data.map((p: DBProduto) => ({ id: p.id, nome: p.nome, categoria: p.categoria, subcategoria: p.subcategoria, imagem_url: p.imagem_url, preco: Number(p.preco), precoCusto: Number(p.preco_custo), estoque: p.estoque, ativo: p.ativo })));
      if (resCats.data) setCategorias(resCats.data.map((c: DBCategoria) => ({ id: c.id, nome: c.nome, icone: c.icone, ativo: c.ativo, ordem: c.ordem })));
      if (resVendas.data) setHistoricoVendas(resVendas.data.map((v: DBVenda) => ({ id: v.id, numeroMesa: v.numero_mesa, total: Number(v.total), pagamentos: v.pagamentos || [], itens: v.itens || [], garcomNome: v.garcom_nome, nomeCliente: v.nome_cliente || '', status: (v.status === 'fechada' ? 'concluida' : v.status) as 'concluida' | 'cancelada', dataFechamento: v.data_fechamento, canceladoPor: v.cancelado_por, motivoCancelamento: v.motivo_cancelamento, dataCancelamento: v.data_cancelamento })));
      if (resUsers.data) setUsuarios(resUsers.data.map((u: DBUsuario) => ({ id: u.id, nome: u.nome, avatar: u.avatar, pin: '***', cargo: u.cargo })));
      if (resHist.data) setHistoricoEstoque(resHist.data.map((h: DBHistorico) => ({ id: h.id, produtoId: h.produto_id, produtoNome: h.produto_nome, tipo: h.tipo as 'entrada' | 'inventario' | 'estorno', quantidade: h.quantidade, precoCusto: Number(h.preco_custo), usuarioNome: h.usuario_nome, data: h.data })));
    } catch (err) { console.error("Erro fatal ao carregar dados:", err); }
  }, []);

  useEffect(() => {
    const inicializar = async () => await carregarDados(); inicializar();
    const channel = supabase.channel('db-changes').on('postgres_changes', { event: '*', schema: 'public' }, () => { carregarDados(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [carregarDados]);

  const autenticarUsuario = async (id: string, pinDigitado: string): Promise<boolean> => { try { const { data, error } = await supabase.from('usuarios').select('id, nome, avatar, cargo').eq('id', id).eq('pin', pinDigitado).single(); if (data && !error) { setGarcomLogado({ id: data.id, nome: data.nome, avatar: data.avatar, cargo: data.cargo, pin: '***' }); return true; } return false; } catch { return false; } };
  const uploadImagemProduto = async (file: File): Promise<string | null> => { try { const fileExt = file.name.split('.').pop(); const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('produtos').upload(fileName, file); if (uploadError) throw uploadError; const { data } = supabase.storage.from('produtos').getPublicUrl(fileName); return data.publicUrl; } catch (error) { console.error('Erro ao enviar imagem:', error); return null; } };

  // =========================================================================
  // CATEGORIAS: Agora forçamos o App a recarregar após cada ação (Sem delay!)
  // =========================================================================
  const adicionarCategoria = async (nome: string, icone: string) => {
    const novaOrdem = categorias.length;
    await supabase.from('categorias').insert([{ nome, icone, ativo: true, ordem: novaOrdem }]);
    await carregarDados(); // <--- O SEGREDO AQUI
  };

  const editarCategoria = async (id: number, nome: string, icone: string) => {
    await supabase.from('categorias').update({ nome, icone }).eq('id', id);
    await carregarDados(); // <--- O SEGREDO AQUI
  };

  const excluirCategoria = async (id: number) => {
    await supabase.from('categorias').delete().eq('id', id);
    await carregarDados(); // <--- O SEGREDO AQUI
  };

  const reordenarCategorias = async (categoriasReordenadas: Categoria[]) => {
    setCategorias(categoriasReordenadas); // Atualiza instantaneamente a tela pro usuário não ver travando
    for (const cat of categoriasReordenadas) {
      await supabase.from('categorias').update({ ordem: cat.ordem }).eq('id', cat.id);
    }
  };

  // =========================================================================
  // PRODUTOS: Mesma coisa, garantia de tela atualizada rápido
  // =========================================================================
  const adicionarProduto = async (novo: Omit<Produto, 'id'>) => { 
    await supabase.from('produtos').insert([{ nome: novo.nome, categoria: novo.categoria, subcategoria: novo.subcategoria, imagem_url: novo.imagem_url, preco: novo.preco, preco_custo: novo.precoCusto, estoque: novo.estoque, ativo: true }]); 
    await carregarDados();
  };
  const editarProduto = async (id: number, atualizacao: Partial<Produto>) => { 
    await supabase.from('produtos').update({ nome: atualizacao.nome, categoria: atualizacao.categoria, subcategoria: atualizacao.subcategoria, imagem_url: atualizacao.imagem_url, preco: atualizacao.preco, preco_custo: atualizacao.precoCusto, ativo: atualizacao.ativo }).eq('id', id); 
    await carregarDados();
  };
  const excluirProduto = async (id: number) => { 
    await supabase.from('produtos').delete().eq('id', id); 
    await carregarDados();
  };
  const alternarStatusProduto = async (id: number) => { 
    const p = produtos.find(x => x.id === id); 
    if (p) {
      await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', id); 
      await carregarDados();
    }
  };

  const registrarLogEstoque = async (produtoId: number, nome: string, qtd: number, custo: number, usuario: string, tipo: string) => { await supabase.from('historico_estoque').insert([{ produto_id: produtoId, produto_nome: nome, tipo, quantidade: qtd, preco_custo: custo, usuario_nome: usuario }]); };
  const darEntradaEstoque = async (idProduto: number, qtdAdicionada: number, precoCusto: number, usuario: string) => { const p = produtos.find(x => x.id === idProduto); if (p) { await supabase.from('produtos').update({ estoque: (p.estoque || 0) + qtdAdicionada, preco_custo: precoCusto }).eq('id', idProduto); await registrarLogEstoque(idProduto, p.nome, qtdAdicionada, precoCusto, usuario, 'entrada'); await carregarDados(); } };
  const registrarInventario = async (idProduto: number, qtdFisicaReal: number, usuario: string) => { const p = produtos.find(x => x.id === idProduto); if (p) { const diff = qtdFisicaReal - (p.estoque || 0); await supabase.from('produtos').update({ estoque: qtdFisicaReal }).eq('id', idProduto); if (diff !== 0) await registrarLogEstoque(idProduto, p.nome, diff, p.precoCusto || 0, usuario, 'inventario'); await carregarDados(); } };
  const adicionarUsuario = async (novoUsuario: Garcom) => { await supabase.from('usuarios').insert([{ nome: novoUsuario.nome, avatar: novoUsuario.avatar, pin: novoUsuario.pin, cargo: novoUsuario.cargo }]); await carregarDados(); };
  const editarUsuario = async (id: string, dadosAtualizados: Partial<Garcom>) => { await supabase.from('usuarios').update({ ...dadosAtualizados }).eq('id', id); await carregarDados(); };
  const removerUsuario = async (id: string) => { await supabase.from('usuarios').delete().eq('id', id); await carregarDados(); };
  const adicionarMesa = async (numero: number) => { if (!mesas.some(m => m.numero === numero)) { await supabase.from('mesas').insert([{ numero, status: 'livre', itens: [] }]); await carregarDados(); } };
  const removerMesa = async (numero: number) => { await supabase.from('mesas').delete().eq('numero', numero); await carregarDados(); };
  const atualizarStatusCozinha = async (numeroMesa: number, idItem: string, status: 'pendente' | 'pronto' | 'entregue') => { const mesa = mesas.find(m => m.numero === numeroMesa); if (mesa) { const novosItens = mesa.itens.map(i => i.id === idItem ? { ...i, statusCozinha: status } : i); await supabase.from('mesas').update({ itens: novosItens }).eq('numero', numeroMesa); } };
  
  const salvarComanda = async (numero: number, itens: ItemComanda[], nomeCliente: string) => {
    const mesa = mesas.find(m => m.numero === numero); if (!mesa) return; const diferencasEstoque = new Map<number, number>(); const itensFinaisParaMesa: ItemComanda[] = []; const qtdAntigaPorProduto = new Map<number, number>(); mesa.itens.forEach(item => { qtdAntigaPorProduto.set(item.produto.id, (qtdAntigaPorProduto.get(item.produto.id) || 0) + item.quantidade); }); const qtdNovaPorProduto = new Map<number, number>(); itens.forEach(item => { qtdNovaPorProduto.set(item.produto.id, (qtdNovaPorProduto.get(item.produto.id) || 0) + item.quantidade); }); for (const [prodId, novaQtd] of qtdNovaPorProduto) { const antiga = qtdAntigaPorProduto.get(prodId) || 0; diferencasEstoque.set(prodId, novaQtd - antiga); } for (const [prodId, antigaQtd] of qtdAntigaPorProduto) { if (!qtdNovaPorProduto.has(prodId)) { diferencasEstoque.set(prodId, -antigaQtd); } } const produtosUnicosCart = Array.from(new Set(itens.map(i => i.produto.id))); produtosUnicosCart.forEach(prodId => { const novaQtdTotal = qtdNovaPorProduto.get(prodId) || 0; const itensAntigosDesseProduto = mesa.itens.filter(i => i.produto.id === prodId); const antigaQtdTotal = qtdAntigaPorProduto.get(prodId) || 0; if (novaQtdTotal > antigaQtdTotal) { itensFinaisParaMesa.push(...itensAntigosDesseProduto); const diff = novaQtdTotal - antigaQtdTotal; const itemTemplate = itens.find(i => i.produto.id === prodId)!; itensFinaisParaMesa.push({ ...itemTemplate, id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, quantidade: diff, statusCozinha: 'pendente', horaPedido: new Date().toISOString() }); } else if (novaQtdTotal === antigaQtdTotal) { itensFinaisParaMesa.push(...itensAntigosDesseProduto); } else { let toRemove = antigaQtdTotal - novaQtdTotal; const sortedAntigos = [...itensAntigosDesseProduto].sort((a, b) => { if (a.statusCozinha === 'pendente' && b.statusCozinha !== 'pendente') return -1; if (a.statusCozinha !== 'pendente' && b.statusCozinha === 'pendente') return 1; return 0; }); for (const oldItem of sortedAntigos) { if (toRemove <= 0) { itensFinaisParaMesa.push(oldItem); } else if (oldItem.quantidade > toRemove) { itensFinaisParaMesa.push({ ...oldItem, quantidade: oldItem.quantidade - toRemove }); toRemove = 0; } else { toRemove -= oldItem.quantidade; } } } });
    const novoStatus = itensFinaisParaMesa.length > 0 ? 'ocupada' : 'livre'; let donoId = mesa.garcomId; let donoNome = mesa.garcomNome; if (novoStatus === 'ocupada') { if (!donoId && garcomLogado) { donoId = garcomLogado.id; donoNome = garcomLogado.nome; } } else { donoId = undefined; donoNome = undefined; }
    await supabase.from('mesas').update({ status: novoStatus, itens: itensFinaisParaMesa, nome_cliente: nomeCliente, garcom_id: donoId, garcom_nome: donoNome }).eq('numero', numero);
    for (const [id, diff] of diferencasEstoque) { if (diff === 0) continue; const p = produtos.find(x => x.id === id); if (p && p.estoque !== undefined) { await supabase.from('produtos').update({ estoque: Math.max(0, p.estoque - diff) }).eq('id', id); } }
  };

  const finalizarMesa = async (numero: number, incluirServico = false, pagamentosRealizados: Pagamento[] = []) => { const mesa = mesas.find(m => m.numero === numero); if (mesa && mesa.status === 'ocupada' && mesa.itens.length > 0) { let totalDaMesa = mesa.itens.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0); const itensFinais = [...mesa.itens]; if (incluirServico) { const valorServico = totalDaMesa * 0.10; totalDaMesa += valorServico; itensFinais.push({ id: 'taxa-servico-10', produto: { id: 999, nome: 'Taxa de Serviço (10%)', preco: valorServico, categoria: 'Outros', ativo: true }, quantidade: 1, statusCozinha: 'entregue' }); } await supabase.from('vendas').insert([{ numero_mesa: mesa.numero, nome_cliente: mesa.nomeCliente || '', garcom_nome: garcomLogado?.nome || 'Sistema', itens: itensFinais, total: totalDaMesa, pagamentos: pagamentosRealizados, status: 'fechada' }]); await supabase.from('mesas').update({ status: 'livre', itens: [], garcom_id: null, garcom_nome: null, nome_cliente: null }).eq('numero', numero); } };
  const cancelarVenda = async (idVenda: string, motivo: string, adminNome: string) => { const venda = historicoVendas.find(v => v.id === idVenda); if (!venda || venda.status === 'cancelada') return; await supabase.from('vendas').update({ status: 'cancelada', cancelado_por: adminNome, motivo_cancelamento: motivo, data_cancelamento: new Date().toISOString() }).eq('id', idVenda); for (const item of venda.itens) { if (item.produto.id !== 999) { const p = produtos.find(x => x.id === item.produto.id); if (p && p.estoque !== undefined) { await supabase.from('produtos').update({ estoque: p.estoque + item.quantidade }).eq('id', p.id); await registrarLogEstoque(p.id, p.nome, item.quantidade, p.precoCusto || 0, adminNome, 'estorno'); } } } };

  return (
    <AppContext.Provider value={{ mesas, historicoVendas, garcomLogado, setGarcomLogado, usuarios, produtos, categorias, historicoEstoque, uploadImagemProduto, autenticarUsuario, adicionarProduto, excluirProduto, alternarStatusProduto, adicionarCategoria, editarCategoria, excluirCategoria, reordenarCategorias, darEntradaEstoque, registrarInventario, adicionarUsuario, removerUsuario, editarUsuario, adicionarMesa, removerMesa, atualizarStatusCozinha, salvarComanda, finalizarMesa, cancelarVenda, editarProduto }}>
      {children}
    </AppContext.Provider>
  );
}