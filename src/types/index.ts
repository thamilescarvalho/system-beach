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

//  TIPOS FINANCEIROS (LEDGER GARÇONS) 

export type CategoriaPagamentoGarcom = 'Vale' | 'Comissão' | 'Salário' | 'Bônus' | 'Outros';
export type StatusPagamentoGarcom = 'pago' | 'agendado' | 'pendente' | 'pendente_faturamento' | 'cancelado';

/** Estrutura Frontend */
export interface PagamentoGarcom {
  id: string;
  garcomId: string;
  garcomNome: string;
  valor: number;
  data: string; // YYYY-MM-DD
  descricao: string;
  categoria: CategoriaPagamentoGarcom;
  status: StatusPagamentoGarcom;
}

export type NovoPagamentoGarcom = Omit<PagamentoGarcom, 'id'>;

export interface DBPagamentoGarcom {
  id: string;
  garcom_id: string;
  garcom_nome: string;
  valor: number | string;
  data_pagamento: string;
  descricao: string;
  categoria: string;
  status: string;
  created_at?: string;
}

// META 
export interface MetaFinanceira {
  id: string;
  dataInicio: string;
  dataFim: string;
  valorAlvo: number;
  status: 'ativa' | 'inativa';
}

export type NovaMetaFinanceira = Omit<MetaFinanceira, 'id' | 'status'>;

export interface DBMetaFinanceira {
  id: string;
  data_inicio: string;
  data_fim: string;
  valor_alvo: number | string;
  status: string;
  created_at?: string;
}