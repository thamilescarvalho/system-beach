// src/context/AppContext.ts
import { createContext, useContext } from 'react';
import type {
  Mesa, ItemComanda, VendaFechada, Garcom, Produto,
  MovimentacaoEstoque, Pagamento, Categoria, PagamentoGarcom,
  NovoPagamentoGarcom, StatusPagamentoGarcom, MetaFinanceira, NovaMetaFinanceira
} from '../types';

export interface EmpresaSaaS {
  id: string;
  nome_fantasia: string;
  status_assinatura: string;
  data_vencimento: string;
  valor_mensalidade?: number;
  plano_nome?: string;
  ciclo_cobranca?: string;
  documento?: string;
  telefone?: string;
  nome_exibicao?: string;
  email_contato?: string;
}

/** Nome padrão da plataforma, exibido quando o estabelecimento não personalizou sua identidade. */
export const NOME_PADRAO_SISTEMA = 'T-System Beach';

export interface AppContextType {
  dadosEmpresa: EmpresaSaaS | null | undefined;
  carregandoContexto: boolean;
  verificarAcessoLiberado: () => boolean;
  carregarDados: (silencioso?: boolean) => Promise<void>;
  atualizarIdentidadeEmpresa: (nomeExibicao: string) => Promise<void>;
  atualizarDadosMinhaEmpresa: (dados: {
    nome_fantasia: string;
    nome_exibicao?: string;
    documento?: string;
    telefone?: string;
    email_contato?: string;
  }) => Promise<void>;
  mesas: Mesa[];
  historicoVendas: VendaFechada[];
  garcomLogado: Garcom | null;
  setGarcomLogado: (garcom: Garcom | null) => void;
  usuarios: Garcom[];
  garcons: Garcom[];
  produtos: Produto[];
  categorias: Categoria[];
  historicoEstoque: MovimentacaoEstoque[];
  historicoPagamentos: PagamentoGarcom[];
  uploadImagemProduto: (file: File) => Promise<string | null>;
  autenticarUsuario: (email: string, senha: string) => Promise<boolean>;
  metaAtiva: MetaFinanceira | null;
  salvarMetaFinanceira: (dados: NovaMetaFinanceira) => Promise<void>;
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
  editarMesa: (id: number | string, atualizacao: { numero: number }) => Promise<void>;
  removerMesa: (numero: number) => Promise<void>;
  atualizarStatusCozinha: (numeroMesa: number, idItem: string, status: 'pendente' | 'pronto' | 'entregue') => Promise<void>;
  salvarComanda: (numeroMesa: number, itens: ItemComanda[], nomeCliente: string) => Promise<void>;
  finalizarMesa: (numeroMesa: number, valorTaxa: number, pagamentosRealizados: Pagamento[]) => Promise<void>;
  cancelarVenda: (idVenda: string, motivo: string, adminNome: string) => Promise<void>;
  registrarValeFuncionario: (dados: NovoPagamentoGarcom) => Promise<void>;
  excluirPagamentoGarcom: (id: string) => Promise<void>;
  atualizarStatusPagamentoGarcom: (id: string, novoStatus: StatusPagamentoGarcom) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext deve ser usado dentro de um AppProvider. Violação de Arquitetura.');
  }
  return context;
}
