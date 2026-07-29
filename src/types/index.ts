// src/types/index.ts

export interface Categoria {
  id: number;
  nome: string;
  icone: string;
  ativo: boolean;
  ordem?: number;
}

export interface Produto {
  id: number;
  nome: string;
  preco: number;
  categoria: string;
  subcategoria?: string;
  imagem_url?: string;
  estoque?: number;
  precoCusto?: number;
  ativo?: boolean;
}

export interface ItemComanda {
  id: string;
  produto: Produto;
  quantidade: number;
  observacao?: string;
  statusCozinha?: 'pendente' | 'pronto' | 'entregue';
  horaPedido?: string;
}

export interface Mesa {
  id: number;
  numero: number;
  status: 'livre' | 'ocupada';
  itens: ItemComanda[];
  nomeCliente?: string;
  garcomId?: string;
  garcomNome?: string;
}

export type MetodoPagamento = 'PIX' | 'Crédito' | 'Débito' | 'Dinheiro';

export interface Pagamento {
  metodo: MetodoPagamento;
  valor: number;
}

export interface VendaFechada {
  id: string;
  numeroMesa: number;
  nomeCliente: string;
  garcomNome: string;
  itens: ItemComanda[];
  total: number;
  dataFechamento: string;
  pagamentos: Pagamento[];
  status?: 'concluida' | 'cancelada';
  canceladoPor?: string;
  dataCancelamento?: string;
  motivoCancelamento?: string;
}

export interface Garcom {
  id: string;
  nome: string;
  avatar: string;
  pin: string;
  cargo?: 'garcom' | 'admin';
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  precoCusto: number;
  data: string;
  usuarioNome: string;
  tipo: 'entrada' | 'inventario' | 'estorno';
}