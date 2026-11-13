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
  statusCozinha?: 'pendente' | 'preparo' | 'pronto' | 'entregue';
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
  contaId?: string | null;
  status?: 'concluida' | 'cancelada';
  canceladoPor?: string;
  dataCancelamento?: string;
  motivoCancelamento?: string;
}

export type CargoUsuario = 'garcom' | 'admin' | 'super_admin';
export type StatusUsuario = 'ativo' | 'bloqueado';

export interface Garcom {
  id: string;
  nome: string;
  avatar: string;
  email?: string;
  status?: StatusUsuario;
  cargo?: CargoUsuario;
  empresaId?: string;
  telefone?: string;
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
  notaCompraId?: string;
}

// TIPOS FINANCEIROS (LEDGER GARÇONS)
export type CategoriaPagamentoGarcom = 'Vale' | 'Comissão' | 'Salário' | 'Bônus' | 'Outros';
export type StatusPagamentoGarcom = 'pago' | 'agendado' | 'pendente' | 'pendente_faturamento' | 'cancelado';

export interface PagamentoGarcom {
  id: string;
  garcomId: string;
  garcomNome: string;
  valor: number;
  data: string; // YYYY-MM-DD
  descricao: string;
  categoria: CategoriaPagamentoGarcom;
  status: StatusPagamentoGarcom;
  contaId?: string | null;
  metodoPagamento?: string;
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
  conta_id?: string | null;
  metodo_pagamento?: string | null;
  created_at?: string;
  empresa_id?: string;
}

// META FINANCEIRA
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
  empresa_id?: string;
}

// ==============================================================================
// TIPOS FINTECH: CONTAS FINANCEIRAS, FLUXO DE CAIXA E NOTAS DE COMPRA (ESTOQUE)
// ==============================================================================
export type TipoContaFinanceira = 'dinheiro' | 'banco' | 'maquininha' | 'cofre';

export interface ContaFinanceira {
  id: string;
  nome: string;
  tipo: TipoContaFinanceira;
  saldoInicial: number;
  cor: string;
  icone: string;
  recebeDinheiroPdv: boolean;
  recebeDigitalPdv: boolean;
  ativo: boolean;
  padrao: boolean;
  createdAt?: string;
}

export type NovaContaFinanceira = Omit<ContaFinanceira, 'id' | 'createdAt' | 'padrao'> & {
  padrao?: boolean;
};

export interface DBContaFinanceira {
  id: string;
  empresa_id: string;
  nome: string;
  tipo: string;
  saldo_inicial: number | string;
  cor: string;
  icone: string;
  recebe_dinheiro_pdv: boolean;
  recebe_digital_pdv: boolean;
  ativo: boolean;
  padrao: boolean;
  deletado_em?: string | null;
  created_at?: string;
}

export type TipoMovimentacaoCaixa = 'entrada' | 'saida' | 'transferencia';

export interface MovimentacaoCaixa {
  id: string;
  contaId: string;
  contaDestinoId?: string | null;
  notaCompraId?: string | null;
  tipo: TipoMovimentacaoCaixa;
  categoria: string;
  metodoPagamento: string;
  valor: number;
  dataMovimentacao: string;
  descricao: string;
  usuarioNome: string;
  createdAt?: string;
}

export type NovaMovimentacaoCaixa = Omit<MovimentacaoCaixa, 'id' | 'createdAt' | 'notaCompraId'>;

export interface DBMovimentacaoCaixa {
  id: string;
  empresa_id: string;
  conta_id: string;
  conta_destino_id?: string | null;
  nota_compra_id?: string | null;
  tipo: string;
  categoria: string;
  metodo_pagamento: string;
  valor: number | string;
  data_movimentacao: string;
  descricao?: string | null;
  usuario_nome: string;
  deletado_em?: string | null;
  created_at?: string;
}

export interface ItemNotaCompraInput {
  produtoId: number;
  produtoNome: string;
  quantidade: number;
  valorUnitario: number;
}

export interface ItemNotaCompra extends ItemNotaCompraInput {
  id: string;
  notaId: string;
  valorTotalItem: number;
}

export interface DBItemNotaCompra {
  id: string;
  nota_id: string;
  empresa_id: string;
  produto_id: number;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number | string;
  valor_total_item: number | string;
}

export interface NotaCompraEstoque {
  id: string;
  fornecedor: string;
  numeroNota?: string;
  dataCompra: string; // YYYY-MM-DD
  valorItens: number;
  valorExtras: number;
  valorTotal: number;
  formaPagamento: string;
  contaId?: string | null;
  lancarNoCaixa: boolean;
  movimentacaoCaixaId?: string | null;
  status: 'ativa' | 'estornada';
  observacoes?: string;
  usuarioNome: string;
  canceladoPor?: string;
  dataCancelamento?: string;
  createdAt?: string;
  itens: ItemNotaCompra[];
}

export interface NovaNotaCompraInput {
  fornecedor: string;
  numeroNota?: string;
  dataCompra: string;
  itens: ItemNotaCompraInput[];
  valorExtras?: number;
  formaPagamento: string;
  contaId?: string | null;
  lancarNoCaixa: boolean;
  observacoes?: string;
  usuarioNome?: string;
}

export interface DBNotaCompraEstoque {
  id: string;
  empresa_id: string;
  fornecedor: string;
  numero_nota?: string | null;
  data_compra: string;
  valor_itens: number | string;
  valor_extras: number | string;
  valor_total: number | string;
  forma_pagamento: string;
  conta_id?: string | null;
  lancar_no_caixa: boolean;
  movimentacao_caixa_id?: string | null;
  status: string;
  observacoes?: string | null;
  usuario_nome: string;
  cancelado_por?: string | null;
  data_cancelamento?: string | null;
  created_at?: string;
  itens_nota_compra?: DBItemNotaCompra[];
}
