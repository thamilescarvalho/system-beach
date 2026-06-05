// src/context/AppContext.tsx
import { createContext, useState, ReactNode } from 'react';
import type { Mesa, ItemComanda, VendaFechada, Garcom, Produto, MovimentacaoEstoque, Pagamento } from '../types';

const cardapioInicial: Produto[] = [
  { id: 1, nome: 'Cerveja Pilsen 600ml', preco: 14.50, categoria: 'Cervejas', estoque: 50, precoCusto: 7.00, ativo: true },
  { id: 2, nome: 'Heineken Long Neck', preco: 12.00, categoria: 'Cervejas', estoque: 30, precoCusto: 6.00, ativo: true },
  { id: 3, nome: 'Água de Coco Natural', preco: 8.00, categoria: 'Bebidas', estoque: 20, precoCusto: 3.00, ativo: true },
  { id: 4, nome: 'Refrigerante Lata', preco: 6.00, categoria: 'Bebidas', estoque: 40, precoCusto: 2.50, ativo: true },
  { id: 5, nome: 'Caipirinha de Limão', preco: 22.00, categoria: 'Drinks', ativo: true },
  { id: 6, nome: 'Porção de Fritas G', preco: 35.00, categoria: 'Petiscos', ativo: true },
  { id: 7, nome: 'Isca de Peixe', preco: 58.00, categoria: 'Petiscos', ativo: true },
];

const mesasIniciais: Mesa[] = [
  { id: 1, numero: 1, status: 'livre', itens: [], nomeCliente: '' },
  { id: 2, numero: 2, status: 'livre', itens: [], nomeCliente: '' },
  { id: 3, numero: 3, status: 'livre', itens: [], nomeCliente: '' },
  { id: 4, numero: 4, status: 'livre', itens: [], nomeCliente: '' },
  { id: 5, numero: 5, status: 'livre', itens: [], nomeCliente: '' },
  { id: 6, numero: 6, status: 'livre', itens: [], nomeCliente: '' },
];

interface AppContextType {
  mesas: Mesa[];
  historicoVendas: VendaFechada[];
  garcomLogado: Garcom | null;
  setGarcomLogado: (garcom: Garcom | null) => void;
  usuarios: Garcom[]; 
  produtos: Produto[];
  historicoEstoque: MovimentacaoEstoque[];
  editarProduto: (id: number, atualizacao: Partial<Produto>) => void;
  
  adicionarProduto: (produto: Omit<Produto, 'id'>) => void;
  excluirProduto: (id: number) => void;
  alternarStatusProduto: (id: number) => void;
  
  darEntradaEstoque: (idProduto: number, qtdAdicionada: number, precoCusto: number, usuario: string) => void;
  registrarInventario: (idProduto: number, qtdFisicaReal: number, usuario: string) => void;
  
  adicionarUsuario: (usuario: Garcom) => void;
  removerUsuario: (id: string) => void;
  editarUsuario: (id: string, dadosAtualizados: Partial<Garcom>) => void;
  
  adicionarMesa: (numero: number) => void;
  removerMesa: (numero: number) => void;
  
  // ATUALIZADO COM "ENTREGUE"
  atualizarStatusCozinha: (numeroMesa: number, idItem: string, status: 'pendente' | 'pronto' | 'entregue') => void;

  salvarComanda: (numeroMesa: number, itens: ItemComanda[], nomeCliente: string) => void;
  finalizarMesa: (numeroMesa: number, incluirServico: boolean, pagamentosRealizados: Pagamento[]) => void;
  cancelarVenda: (idVenda: string, motivo: string, adminNome: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [mesas, setMesas] = useState<Mesa[]>(mesasIniciais);
  const [historicoVendas, setHistoricoVendas] = useState<VendaFechada[]>([]);
  const [garcomLogado, setGarcomLogado] = useState<Garcom | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>(cardapioInicial);
  const [historicoEstoque, setHistoricoEstoque] = useState<MovimentacaoEstoque[]>([]);

  const [usuarios, setUsuarios] = useState<Garcom[]>([
    { id: 'admin-dev', nome: 'Thamiles (Dev)', avatar: '👩‍💻', pin: '0000', cargo: 'admin' }
  ]);

  const adicionarProduto = (novo: Omit<Produto, 'id'>) => {
    const id = Math.max(...produtos.map(p => p.id), 0) + 1;
    setProdutos(prev => [...prev, { ...novo, id, ativo: true }]);
  };
  const excluirProduto = (id: number) => setProdutos(prev => prev.filter(p => p.id !== id));
  const alternarStatusProduto = (id: number) => setProdutos(prev => prev.map(p => p.id === id ? { ...p, ativo: !p.ativo } : p));
  const editarProduto = (id: number, atualizacao: Partial<Produto>) => {
    setProdutos(prev => prev.map(p => p.id === id ? { ...p, ...atualizacao } : p));
  };

  const registrarLogEstoque = (produtoId: number, nome: string, qtd: number, custo: number, usuario: string, tipo: 'entrada'|'inventario'|'estorno') => {
    const novaMovimentacao: MovimentacaoEstoque = { id: Date.now().toString(), produtoId, produtoNome: nome, quantidade: qtd, precoCusto: custo, data: new Date().toISOString(), usuarioNome: usuario, tipo };
    setHistoricoEstoque(prev => [novaMovimentacao, ...prev]);
  };

  const darEntradaEstoque = (idProduto: number, qtdAdicionada: number, precoCusto: number, usuario: string) => {
    setProdutos(prev => prev.map(p => {
      if (p.id === idProduto) return { ...p, estoque: (p.estoque || 0) + qtdAdicionada, precoCusto };
      return p;
    }));
    const nomeProd = produtos.find(p => p.id === idProduto)?.nome || 'Produto';
    registrarLogEstoque(idProduto, nomeProd, qtdAdicionada, precoCusto, usuario, 'entrada');
  };

  const registrarInventario = (idProduto: number, qtdFisicaReal: number, usuario: string) => {
    let diff = 0;
    setProdutos(prev => prev.map(p => {
      if (p.id === idProduto) { diff = qtdFisicaReal - (p.estoque || 0); return { ...p, estoque: qtdFisicaReal }; }
      return p;
    }));
    const prod = produtos.find(p => p.id === idProduto);
    if (diff !== 0 && prod) registrarLogEstoque(idProduto, prod.nome, diff, prod.precoCusto || 0, usuario, 'inventario');
  };

  const adicionarUsuario = (novoUsuario: Garcom) => setUsuarios(prev => [...prev, novoUsuario]);
  const editarUsuario = (id: string, dadosAtualizados: Partial<Garcom>) => setUsuarios(prev => prev.map(u => u.id === id ? { ...u, ...dadosAtualizados } : u));
  const removerUsuario = (id: string) => { if (id !== 'admin-dev') setUsuarios(prev => prev.filter(u => u.id !== id)); };

  const adicionarMesa = (numero: number) => {
    setMesas(prev => {
      if (prev.some(m => m.numero === numero)) return prev;
      const novaMesa: Mesa = { id: Date.now(), numero, status: 'livre', itens: [], nomeCliente: '' };
      return [...prev, novaMesa].sort((a, b) => a.numero - b.numero);
    });
  };
  const removerMesa = (numero: number) => setMesas(prev => prev.filter(m => m.numero !== numero));

  // --- KDS COZINHA ---
  const atualizarStatusCozinha = (numeroMesa: number, idItem: string, status: 'pendente' | 'pronto' | 'entregue') => {
    setMesas(prev => prev.map(m => {
      if (m.numero === numeroMesa) {
        return { ...m, itens: m.itens.map(i => i.id === idItem ? { ...i, statusCozinha: status } : i) };
      }
      return m;
    }));
  };

  const salvarComanda = (numero: number, itens: ItemComanda[], nomeCliente: string) => {
    const diferencasEstoque = new Map<number, number>();
    
    setMesas(mesasAtuais => 
      mesasAtuais.map(mesa => {
        if (mesa.numero === numero) {
          const itensParaCozinha = itens.map(itemNovo => {
            const itemAntigo = mesa.itens.find(i => i.produto.id === itemNovo.produto.id);
            let novoStatus = itemNovo.statusCozinha || 'pendente';
            
            // Se aumentou a quantidade, avisa a cozinha de novo!
            if (itemAntigo && itemNovo.quantidade > itemAntigo.quantidade) { novoStatus = 'pendente'; }
            
            return { ...itemNovo, statusCozinha: novoStatus, horaPedido: itemNovo.horaPedido || new Date().toISOString() };
          });

          itens.forEach(itemNovo => {
            const quantidadeAntiga = mesa.itens.find(i => i.produto.id === itemNovo.produto.id)?.quantidade || 0;
            diferencasEstoque.set(itemNovo.produto.id, itemNovo.quantidade - quantidadeAntiga);
          });
          mesa.itens.forEach(itemAntigo => {
            if (!itens.find(i => i.produto.id === itemAntigo.produto.id)) diferencasEstoque.set(itemAntigo.produto.id, -itemAntigo.quantidade);
          });

          const novoStatus = itens.length > 0 ? 'ocupada' : 'livre';
          let donoId = mesa.garcomId; let donoNome = mesa.garcomNome;
          if (novoStatus === 'ocupada') {
            if (!donoId && garcomLogado) { donoId = garcomLogado.id; donoNome = garcomLogado.nome; }
          } else { donoId = undefined; donoNome = undefined; }
          
          return { ...mesa, status: novoStatus, itens: itensParaCozinha, nomeCliente, garcomId: donoId, garcomNome: donoNome };
        }
        return mesa;
      })
    );
    if (diferencasEstoque.size > 0) {
      setProdutos(produtosAtuais => produtosAtuais.map(p => {
        const diff = diferencasEstoque.get(p.id);
        if (diff !== undefined && p.estoque !== undefined) return { ...p, estoque: Math.max(0, p.estoque - diff) };
        return p;
      }));
    }
  };

  const finalizarMesa = (numero: number, incluirServico = false, pagamentosRealizados: Pagamento[] = []) => {
    const mesa = mesas.find(m => m.numero === numero);
    if (mesa && mesa.status === 'ocupada' && mesa.itens.length > 0) {
      let totalDaMesa = mesa.itens.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
      const itensFinais = [...mesa.itens];
      if (incluirServico) {
        const valorServico = totalDaMesa * 0.10;
        totalDaMesa += valorServico;
        itensFinais.push({ id: 'taxa-servico-10', produto: { id: 999, nome: 'Taxa de Serviço (10%)', preco: valorServico, categoria: 'Outros', ativo: true }, quantidade: 1 });
      }
      const novaVenda: VendaFechada = { 
        id: Date.now().toString() + Math.random().toString().substring(2, 6), 
        numeroMesa: mesa.numero, nomeCliente: mesa.nomeCliente || '', garcomNome: garcomLogado?.nome || 'Sistema', 
        itens: itensFinais, total: totalDaMesa, pagamentos: pagamentosRealizados, dataFechamento: new Date().toISOString() 
      };
      setHistoricoVendas(historicoAntigo => [...historicoAntigo, novaVenda]);
    }
    setMesas(mesasAtuais => mesasAtuais.map(m => m.numero === numero ? { ...m, status: 'livre', itens: [], nomeCliente: '', garcomId: undefined, garcomNome: undefined } : m));
  };

  const cancelarVenda = (idVenda: string, motivo: string, adminNome: string) => {
    const venda = historicoVendas.find(v => v.id === idVenda);
    if (!venda || venda.status === 'cancelada') return;

    setHistoricoVendas(prev => prev.map(v => 
      v.id === idVenda ? { ...v, status: 'cancelada', canceladoPor: adminNome, dataCancelamento: new Date().toISOString(), motivoCancelamento: motivo } : v
    ));

    const produtosDevolvidos = new Map<number, number>();
    venda.itens.forEach(item => { if (item.produto.id !== 999) produtosDevolvidos.set(item.produto.id, item.quantidade); });

    if (produtosDevolvidos.size > 0) {
      setProdutos(prevProdutos => prevProdutos.map(p => {
        const qtdDevolvida = produtosDevolvidos.get(p.id);
        if (qtdDevolvida && p.estoque !== undefined) return { ...p, estoque: p.estoque + qtdDevolvida };
        return p;
      }));
      venda.itens.forEach(item => { if (item.produto.id !== 999) registrarLogEstoque(item.produto.id, item.produto.nome, item.quantidade, item.produto.precoCusto || 0, adminNome, 'estorno'); });
    }
  };

  return (
    <AppContext.Provider value={{ mesas, historicoVendas, garcomLogado, setGarcomLogado, usuarios, produtos, historicoEstoque, adicionarProduto, excluirProduto, alternarStatusProduto, darEntradaEstoque, registrarInventario, adicionarUsuario, removerUsuario, editarUsuario, adicionarMesa, removerMesa, atualizarStatusCozinha, salvarComanda, finalizarMesa, cancelarVenda, editarProduto }}>
      {children}
    </AppContext.Provider>
  );
}