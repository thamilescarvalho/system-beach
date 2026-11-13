// src/pages/SuperAdminDashboard.tsx
import { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { AppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import type { Garcom } from '../types';
import {
  formatarCpfCnpj,
  formatarTelefoneBR,
  extrairDigitos,
  validarDocumentoBrasil,
  validarTelefoneBR,
  validarEmail
} from '../utils/validadores';
import {
  obterConfiguracaoGlobalLocal,
  carregarConfiguracaoGlobalSaaS,
  salvarConfiguracaoGlobalSaaS,
  ehPublicKeyMercadoPago,
  obterStatusIntegracaoMercadoPago,
  salvarETestarTokenMercadoPago,
  testarConexaoMercadoPagoServidor,
  CONFIGURACAO_SAAS_PADRAO,
  type ConfiguracaoGlobalSaaS,
  type IdCicloCobranca,
  type StatusIntegracaoMercadoPago
} from '../utils/configuracoesSaaS';
import { ModalConfirmacao, type TipoModalConfirmacao } from '../components/ModalConfirmacao';
import { AvatarUsuario } from '../components/AvatarUsuario';
import {
  carregarFaturasGeradasBancoEmpresa,
  excluirFaturaNaoPaga,
  type FaturaAssinatura
} from '../utils/faturasSaaS';

interface EmpresaMaster {
  id: string;
  nome_fantasia: string;
  status_assinatura: 'ativa' | 'degustacao' | 'pendente' | 'bloqueada' | 'inadimplente' | string;
  data_vencimento: string | null;
  created_at?: string;
  valor_mensalidade?: number;
  plano_nome?: string;
  ciclo_cobranca?: IdCicloCobranca | string;
  documento?: string;
  telefone?: string;
  nome_exibicao?: string | null;
  email_contato?: string | null;
}

interface DBUsuario {
  id: string;
  nome: string;
  avatar: string;
  email: string;
  cargo: 'admin' | 'garcom' | 'super_admin';
  status?: string;
  empresa_id: string;
}


interface DBCategoriaClone {
  id: number;
  nome: string;
  icone: string;
  ativo: boolean;
  ordem: number;
  empresa_id?: string;
}

interface DBProdutoClone {
  id: number;
  nome: string;
  categoria: string;
  subcategoria?: string | null;
  imagem_url?: string | null;
  preco: number;
  preco_custo: number;
  estoque?: number | null;
  ativo: boolean;
  empresa_id?: string;
}

type AbaMaster = 'estabelecimentos' | 'planos' | 'mercadopago_cms' | 'financeiro';
type FiltroStatusEmpresa = 'todas' | 'ativas' | 'degustacao' | 'pendentes' | 'bloqueadas';
type ModoClonagemCardapio = 'mesclar' | 'substituir';
type ModoEstoqueClonagem = 'manter' | 'zerar';

const LISTA_CICLOS_IDS: IdCicloCobranca[] = ['mensal', 'trimestral', 'semestral', 'anual'];

function extrairMensagemErro(error: unknown): string {
  if (!error) return 'Falha desconhecida no servidor.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const errObj = error as { message?: string; error_description?: string; details?: string };
    if (errObj.message) {
      if (errObj.message.includes('already registered')) return 'Este e-mail já está cadastrado no sistema.';
      if (errObj.message.includes('6 characters')) return 'A senha deve conter no mínimo 6 caracteres.';
      return errObj.message;
    }
  }
  return 'Erro interno de comunicação com o banco de dados.';
}

/** moeda brasileira (1234.5 → "1.234,50"). */
function formatarMoedaBR(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Converte em centavos */
function converterDigitacaoEmMoeda(texto: string): number {
  const digitos = extrairDigitos(texto).slice(0, 9);
  return digitos ? Number(digitos) / 100 : 0;
}

/** Dias restantes até o fim do dia de vencimento (negativo = vencido). */
function calcularDiasRestantes(dataISO: string): number | null {
  if (!dataISO) return null;
  const [ano, mes, dia] = dataISO.split('T')[0].split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  const limite = new Date(ano, mes - 1, dia, 23, 59, 59);
  return Math.ceil((limite.getTime() - Date.now()) / 86_400_000) - 1;
}

interface ItemMenuMasterProps {
  icone: React.ReactNode;
  titulo: string;
  subtitulo?: string;
  ativo?: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}

function ItemMenuMaster({ icone, titulo, subtitulo, ativo, onClick, badge }: ItemMenuMasterProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-all duration-150 text-left cursor-pointer active:scale-[0.99] ${
        ativo
          ? 'bg-white text-slate-900 shadow-2xs font-medium'
          : 'hover:bg-white hover:shadow-2xs text-slate-700'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 ${ativo ? 'text-slate-900' : 'text-slate-600 group-hover:text-slate-900'}`}>
          {icone}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{titulo}</p>
          {subtitulo && <p className="text-[11px] text-slate-400 font-normal leading-tight truncate">{subtitulo}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge}
        <LucideIcons.ChevronRight
          size={14}
          strokeWidth={1.8}
          className={`transition-all ${
            ativo
              ? 'text-slate-900 translate-x-0.5'
              : 'text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

export function SuperAdminDashboard() {
  const contexto = useContext(AppContext);
  const navigate = useNavigate();

  // Navegação Principal do Command Center
  const [abaAtiva, setAbaAtiva] = useState<AbaMaster>('estabelecimentos');
  const [menuAberto, setMenuAberto] = useState<boolean>(false);
  const [empresas, setEmpresas] = useState<EmpresaMaster[]>([]);
  const [empresaIdsComSuperAdmin, setEmpresaIdsComSuperAdmin] = useState<Set<string>>(() => new Set());
  const [contagemUsuariosPorEmpresa, setContagemUsuariosPorEmpresa] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);

  // Modal de Confirmação 
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    aberto: boolean;
    titulo: string;
    descricao: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: TipoModalConfirmacao;
    iconePersonalizado?: React.ReactNode;
    onConfirmar: () => void | Promise<void>;
  }>({
    aberto: false,
    titulo: '',
    descricao: '',
    onConfirmar: () => {}
  });

  const fecharConfirmacao = () => {
    setModalConfirmacao((prev) => ({ ...prev, aberto: false }));
  };

  // Filtros e Navegação Nível 2 (Usuários de um Estabelecimento)
  const [busca, setBusca] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusEmpresa>('todas');
  const [buscaFinanceiro, setBuscaFinanceiro] = useState<string>('');
  const [filtroFinanceiro, setFiltroFinanceiro] = useState<string>('todos');
  const [empresaSelecionada, setEmpresaSelecionada] = useState<EmpresaMaster | null>(null);
  const [usuariosDaEmpresa, setUsuariosDaEmpresa] = useState<Garcom[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState<boolean>(false);

  // Modal: Criar Novo Estabelecimento pelo Super Admin
  const [modalNovoCliente, setModalNovoCliente] = useState<boolean>(false);
  const [novoNomeEmpresa, setNovoNomeEmpresa] = useState<string>('');
  const [novoNomeAdmin, setNovoNomeAdmin] = useState<string>('');
  const [novoEmailAdmin, setNovoEmailAdmin] = useState<string>('');
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState<string>('');
  const [novoModalidadeInicial, setNovoModalidadeInicial] = useState<'degustacao' | 'ativa' | 'pendente'>('degustacao');
  const [loadingCriacao, setLoadingCriacao] = useState<boolean>(false);

  // Modal: Editar Licença, Ciclo e Preço Personalizado de um Cliente
  const [empresaEdicao, setEmpresaEdicao] = useState<EmpresaMaster | null>(null);
  const [editNome, setEditNome] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('ativa');
  const [editCiclo, setEditCiclo] = useState<IdCicloCobranca>('mensal');
  const [editVencimento, setEditVencimento] = useState<string>('');
  const [editMensalidade, setEditMensalidade] = useState<number>(149.90);
  const [editNomeExibicao, setEditNomeExibicao] = useState<string>('');
  const [editDocumento, setEditDocumento] = useState<string>('');
  const [editTelefone, setEditTelefone] = useState<string>('');
  const [editEmailContato, setEditEmailContato] = useState<string>('');
  const [abaEdicaoEmpresa, setAbaEdicaoEmpresa] = useState<'dados' | 'licenca'>('dados');
  const [erroEdicaoEmpresa, setErroEdicaoEmpresa] = useState<string>('');
  const [loadingEdicao, setLoadingEdicao] = useState<boolean>(false);
  const [faturasClienteEdicao, setFaturasClienteEdicao] = useState<FaturaAssinatura[]>([]);
  const [carregandoFaturasCliente, setCarregandoFaturasCliente] = useState<boolean>(false);
  const [filtroStatusFaturaEdicao, setFiltroStatusFaturaEdicao] = useState<'todas' | 'paga' | 'pendente' | 'em_atraso'>('todas');
  const [confirmandoExclusaoFaturaId, setConfirmandoExclusaoFaturaId] = useState<string | null>(null);
  const [excluindoFaturaId, setExcluindoFaturaId] = useState<string | null>(null);

  // Modais: Gestão de Usuários do Estabelecimento
  const [usuarioEdicao, setUsuarioEdicao] = useState<Garcom | null>(null);
  const [editUserNome, setEditUserNome] = useState<string>('');
  const [editUserEmail, setEditUserEmail] = useState<string>('');
  const [editUserCargo, setEditUserCargo] = useState<'admin' | 'garcom' | 'super_admin'>('garcom');
  const [editUserStatus, setEditUserStatus] = useState<'ativo' | 'bloqueado'>('ativo');
  const [loadingEditUser, setLoadingEditUser] = useState<boolean>(false);

  const [modalNovoUsuario, setModalNovoUsuario] = useState<boolean>(false);
  const [novoUserNome, setNovoUserNome] = useState<string>('');
  const [novoUserEmail, setNovoUserEmail] = useState<string>('');
  const [novoUserSenha, setNovoUserSenha] = useState<string>('');
  const [novoUserCargo, setNovoUserCargo] = useState<'admin' | 'garcom'>('garcom');
  const [loadingCreateUser, setLoadingCreateUser] = useState<boolean>(false);

  // Estado Global de Planos, Promoções, Mercado Pago e Textos (CMS)
  const [configSaaS, setConfigSaaS] = useState<ConfiguracaoGlobalSaaS>(() => obterConfiguracaoGlobalLocal());
  const [salvandoConfig, setSalvandoConfig] = useState<boolean>(false);
  const [novoTokenMP, setNovoTokenMP] = useState<string>('');
  const [mostrarTokenMP, setMostrarTokenMP] = useState<boolean>(false);
  const [statusIntegracaoMP, setStatusIntegracaoMP] = useState<StatusIntegracaoMercadoPago | null>(null);
  const [testandoMP, setTestandoMP] = useState<boolean>(false);
  const [statusTesteMP, setStatusTesteMP] = useState<{ ok: boolean; msg: string } | null>(null);
  const [novoRecursoTexto, setNovoRecursoTexto] = useState<string>('');

  // Modal: Clonador de Cardápio (Categorias + Produtos + Fotos)
  const [modalClonarCardapio, setModalClonarCardapio] = useState<boolean>(false);
  const [empresaOrigemCloneId, setEmpresaOrigemCloneId] = useState<string>('');
  const [empresaDestinoCloneId, setEmpresaDestinoCloneId] = useState<string>('');
  const [categoriasOrigemClone, setCategoriasOrigemClone] = useState<DBCategoriaClone[]>([]);
  const [produtosOrigemClone, setProdutosOrigemClone] = useState<DBProdutoClone[]>([]);
  const [categoriasSelecionadasClone, setCategoriasSelecionadasClone] = useState<string[]>([]);
  const [modoClone, setModoClone] = useState<ModoClonagemCardapio>('mesclar');
  const [modoEstoqueClone, setModoEstoqueClone] = useState<ModoEstoqueClonagem>('manter');
  const [carregandoOrigemClone, setCarregandoOrigemClone] = useState<boolean>(false);
  const [executandoClone, setExecutandoClone] = useState<boolean>(false);

  const mostrarToast = useCallback((mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Segurança
  useEffect(() => {
    if (contexto?.garcomLogado?.cargo !== 'super_admin') {
      navigate('/login');
    }
  }, [contexto?.garcomLogado, navigate]);

  // Atalho de Teclado (Ctrl+K / ⌘K para alternar Menu e Escape para fechar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMenuAberto((prev) => !prev);
      } else if (e.key === 'Escape') {
        setMenuAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Bloqueio de scroll do body quando o menu lateral estiver aberto
  useEffect(() => {
    if (menuAberto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuAberto]);

  const ehUsuarioSuperAdmin = (u: { cargo?: string | null }) => u.cargo === 'super_admin';
  const cargoLogado = contexto?.garcomLogado?.cargo;
  const empresaIdLogado = contexto?.garcomLogado?.empresaId;

  const carregarEmpresas = useCallback(async () => {
    try {
      // 1. Tenta a RPC Enterprise 'super_admin_listar_estabelecimentos' (SECURITY DEFINER)
      // Essa RPC lê diretamente do banco sem ser afetada por filtros ou limitações de RLS client-side
      const { data: rpcEmpresas, error: rpcError } = await supabase.rpc('super_admin_listar_estabelecimentos');

      if (!rpcError && Array.isArray(rpcEmpresas)) {
        const listaEmpresas = rpcEmpresas as (EmpresaMaster & { total_usuarios?: number })[];
        const mapaContagem: Record<string, number> = {};
        const idsSuper = new Set<string>();

        for (const e of listaEmpresas) {
          mapaContagem[e.id] = Number(e.total_usuarios || 0);
        }

        // Identifica os estabelecimentos com Super Admin vinculado
        const { data: usersData } = await supabase
          .from('usuarios')
          .select('id, email, cargo, empresa_id')
          .is('deletado_em', null);

        if (usersData) {
          for (const u of usersData) {
            if (!u.empresa_id) continue;
            if (ehUsuarioSuperAdmin(u)) {
              idsSuper.add(u.empresa_id);
            }
          }
        }

        if (cargoLogado === 'super_admin' && empresaIdLogado && idsSuper.size === 0) {
          idsSuper.add(empresaIdLogado);
        }

        setEmpresas(listaEmpresas);
        setEmpresaIdsComSuperAdmin(idsSuper);
        setContagemUsuariosPorEmpresa(mapaContagem);
        return;
      }

      // 2. Fallback resiliente: consulta direta em caso de RPC ainda não executada no banco
      const [resEmpresas, resUsuarios] = await Promise.all([
        supabase
          .from('empresas')
          .select('*')
          .order('nome_fantasia', { ascending: true }),
        supabase
          .from('usuarios')
          .select('id, nome, avatar, email, cargo, status, empresa_id, deletado_em')
          .is('deletado_em', null)
      ]);

      if (resEmpresas.error) throw resEmpresas.error;

      const listaEmpresas = (resEmpresas.data as EmpresaMaster[] | null) || [];
      const listaUsuarios = (resUsuarios.data as DBUsuario[] | null) || [];

      const idsSuper = new Set<string>();
      const mapaContagem: Record<string, number> = {};

      for (const u of listaUsuarios) {
        if (!u.empresa_id) continue;
        mapaContagem[u.empresa_id] = (mapaContagem[u.empresa_id] || 0) + 1;
        if (ehUsuarioSuperAdmin(u)) {
          idsSuper.add(u.empresa_id);
        }
      }

      if (cargoLogado === 'super_admin' && empresaIdLogado && idsSuper.size === 0) {
        idsSuper.add(empresaIdLogado);
      }

      setEmpresas(listaEmpresas);
      setEmpresaIdsComSuperAdmin(idsSuper);
      setContagemUsuariosPorEmpresa(mapaContagem);
    } catch {
      mostrarToast('Falha ao carregar estabelecimentos.', 'erro');
    } finally {
      setLoading(false);
    }
  }, [cargoLogado, empresaIdLogado, mostrarToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void carregarEmpresas();
    }, 0);
    carregarConfiguracaoGlobalSaaS().then((cfg) => {
      setConfigSaaS(cfg);
    });
    obterStatusIntegracaoMercadoPago()
      .then((status) => {
        setStatusIntegracaoMP(status);
      })
      .catch(() => null);
    return () => clearTimeout(timer);
  }, [carregarEmpresas]);

  // Carregar usuários do estabelecimento selecionado
  const abrirEmpresa = async (empresa: EmpresaMaster) => {
    setEmpresaSelecionada(empresa);
    setLoadingUsuarios(true);
    try {
      // 1. Tenta a RPC Enterprise 'super_admin_listar_usuarios_empresa'
      const { data: rpcUsers, error: rpcErr } = await supabase.rpc(
        'super_admin_listar_usuarios_empresa',
        { p_empresa_id: empresa.id }
      );

      if (!rpcErr && Array.isArray(rpcUsers)) {
        const lista = (rpcUsers as DBUsuario[]).map((u) => ({
          id: u.id,
          nome: u.nome,
          avatar: u.avatar,
          email: u.email,
          cargo: u.cargo,
          status: (u.status as 'ativo' | 'bloqueado') || 'ativo',
          empresaId: u.empresa_id
        }));
        setUsuariosDaEmpresa(lista);
        setContagemUsuariosPorEmpresa((prev) => ({ ...prev, [empresa.id]: lista.length }));
        return;
      }

      // 2. Fallback para consulta direta
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresa.id)
        .is('deletado_em', null)
        .order('cargo', { ascending: true });
      if (error) throw error;
      if (data) {
        const lista = (data as DBUsuario[]).map((u) => ({
          id: u.id,
          nome: u.nome,
          avatar: u.avatar,
          email: u.email,
          cargo: u.cargo,
          status: (u.status as 'ativo' | 'bloqueado') || 'ativo',
          empresaId: u.empresa_id
        }));
        setUsuariosDaEmpresa(lista);
        setContagemUsuariosPorEmpresa((prev) => ({ ...prev, [empresa.id]: lista.length }));
      }
    } catch {
      mostrarToast('Erro ao listar contas do estabelecimento.', 'erro');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const entrarComoUsuario = (usuario: Garcom) => {
    setModalConfirmacao({
      aberto: true,
      titulo: 'Assumir Identidade',
      descricao: `Deseja alternar sua sessão para acessar e operar o sistema como "${usuario.nome}" (${
        usuario.cargo === 'admin' ? 'Administrador' : 'Garçom'
      })?`,
      textoConfirmar: 'Acessar Conta',
      tipo: 'primario',
      iconePersonalizado: <LucideIcons.UserCheck size={22} strokeWidth={2.2} />,
      onConfirmar: () => {
        fecharConfirmacao();
        contexto?.setGarcomLogado(usuario);
        navigate(usuario.cargo === 'admin' ? '/admin' : '/');
      }
    });
  };

  const executarExclusaoEmpresa = async (empresa: EmpresaMaster) => {
    try {
      // Verificação real no banco: garante que nenhuma conta super_admin pertença a este empresa.id
      const { data: usuariosVinculados } = await supabase
        .from('usuarios')
        .select('id, email, cargo')
        .eq('empresa_id', empresa.id)
        .is('deletado_em', null);

      const contemSuperAdminReal = (usuariosVinculados || []).some((u) =>
        ehUsuarioSuperAdmin(u)
      );

      if (contemSuperAdminReal) {
        mostrarToast(
          'Proteção ativa: Este estabelecimento possui a conta Super Admin vinculada e não pode ser excluído.',
          'erro'
        );
        return;
      }

      await supabase.functions
        .invoke('admin-auth', {
          body: { action: 'deleteWorkspace', empresaId: empresa.id }
        })
        .catch(() => null);

      // Limpeza segura em cascata das tabelas filhas antes de remover o estabelecimento
      await Promise.allSettled([
        supabase.from('mesas').delete().eq('empresa_id', empresa.id),
        supabase.from('produtos').delete().eq('empresa_id', empresa.id),
        supabase.from('categorias').delete().eq('empresa_id', empresa.id),
        supabase.from('historico_estoque').delete().eq('empresa_id', empresa.id),
        supabase.from('pagamentos_garcons').delete().eq('empresa_id', empresa.id),
        supabase.from('metas_financeiras').delete().eq('empresa_id', empresa.id),
        supabase.from('faturas_assinatura').delete().eq('empresa_id', empresa.id),
        supabase.from('vendas').delete().eq('empresa_id', empresa.id)
      ]);

      await supabase.from('usuarios').delete().eq('empresa_id', empresa.id);
      const { error } = await supabase.from('empresas').delete().eq('id', empresa.id);
      if (error) throw error;

      setEmpresas((prev) => prev.filter((e) => e.id !== empresa.id));
      if (empresaSelecionada?.id === empresa.id) setEmpresaSelecionada(null);

      mostrarToast(`Estabelecimento "${empresa.nome_fantasia}" excluído definitivamente.`, 'sucesso');
    } catch (error: unknown) {
      mostrarToast(`Erro ao excluir: ${extrairMensagemErro(error)}`, 'erro');
    }
  };

  const handleExcluirEmpresa = (empresa: EmpresaMaster) => {
    // Verifica pelo vínculo real do ID do estabelecimento com a conta Super Admin (e nunca apenas pelo texto do nome)
    if (empresaIdsComSuperAdmin.has(empresa.id)) {
      mostrarToast(
        'Proteção ativa: Este estabelecimento contém uma conta Super Admin e não pode ser excluído.',
        'erro'
      );
      return;
    }

    setModalConfirmacao({
      aberto: true,
      titulo: 'Excluir Estabelecimento?',
      descricao: `ATENÇÃO CRÍTICA:\n\nDeseja realmente excluir permanentemente o estabelecimento "${empresa.nome_fantasia}"?\n\nEsta ação removerá todos os usuários, cardápios e dados vinculados.`,
      textoConfirmar: 'Excluir Definitivamente',
      tipo: 'perigo',
      iconePersonalizado: <LucideIcons.Trash2 size={22} strokeWidth={2.2} />,
      onConfirmar: async () => {
        fecharConfirmacao();
        await executarExclusaoEmpresa(empresa);
      }
    });
  };

  const executarExclusaoUsuario = async (usuario: Garcom) => {
    try {
      await supabase.functions
        .invoke('admin-auth', {
          body: { action: 'deleteUser', userId: usuario.id }
        })
        .catch(() => null);

      const { error } = await supabase.from('usuarios').delete().eq('id', usuario.id);
      if (error) throw error;

      setUsuariosDaEmpresa((prev) => prev.filter((u) => u.id !== usuario.id));
      mostrarToast(`Usuário "${usuario.nome}" removido com sucesso!`, 'sucesso');
    } catch (error: unknown) {
      mostrarToast(`Erro ao excluir usuário: ${extrairMensagemErro(error)}`, 'erro');
    }
  };

  const handleExcluirUsuario = (usuario: Garcom) => {
    if (!empresaSelecionada) return;
    if (ehUsuarioSuperAdmin(usuario)) {
      mostrarToast(
        'Contas Super Admin são protegidas e não podem ser excluídas.',
        'erro'
      );
      return;
    }

    setModalConfirmacao({
      aberto: true,
      titulo: 'Remover Usuário?',
      descricao: `Tem certeza que deseja remover o usuário "${usuario.nome}" (${usuario.email || 'sem e-mail'}) deste estabelecimento?`,
      textoConfirmar: 'Remover Usuário',
      tipo: 'perigo',
      iconePersonalizado: <LucideIcons.UserX size={22} strokeWidth={2.2} />,
      onConfirmar: async () => {
        fecharConfirmacao();
        await executarExclusaoUsuario(usuario);
      }
    });
  };

  const abrirModalEditUsuario = (usuario: Garcom) => {
    const isSuperAdminAccount = ehUsuarioSuperAdmin(usuario);
    setUsuarioEdicao(usuario);
    setEditUserNome(usuario.nome);
    setEditUserEmail(usuario.email || '');
    setEditUserCargo(
      isSuperAdminAccount
        ? 'super_admin'
        : usuario.cargo === 'admin'
          ? 'admin'
          : 'garcom'
    );
    setEditUserStatus((usuario.status as 'ativo' | 'bloqueado') || 'ativo');
  };

  const handleSalvarEdicaoUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEdicao || !empresaSelecionada) return;

    const emailFinal = editUserEmail.trim().toLowerCase();
    const isSuperAdminAccount = ehUsuarioSuperAdmin(usuarioEdicao);

    // Promoção a Super Admin só ocorre diretamente no banco de dados
    if (editUserCargo === 'super_admin' && !isSuperAdminAccount) {
      mostrarToast(
        'Segurança: Promoção a Super Admin não é permitida pela interface.',
        'erro'
      );
      return;
    }

    const cargoValidado: 'admin' | 'garcom' | 'super_admin' = isSuperAdminAccount
      ? 'super_admin'
      : editUserCargo === 'admin'
        ? 'admin'
        : 'garcom';

    setLoadingEditUser(true);
    try {
      const emailAlvo = emailFinal;

      // 1. Executa a RPC atômica que sincroniza auth.users e public.usuarios
      const { error: rpcError } = await supabase.rpc('admin_atualizar_usuario_estabelecimento', {
        p_usuario_id: usuarioEdicao.id,
        p_nome: editUserNome.trim(),
        p_email: emailAlvo,
        p_cargo: cargoValidado,
        p_avatar: usuarioEdicao.avatar ?? null,
        p_status: editUserStatus ?? null
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Falha ao sincronizar dados e credenciais do usuário.');
      }

      setUsuariosDaEmpresa((prev) =>
        prev.map((u) =>
          u.id === usuarioEdicao.id
            ? {
                ...u,
                nome: editUserNome.trim(),
                email: emailAlvo,
                cargo: cargoValidado,
                status: editUserStatus
              }
            : u
        )
      );

      mostrarToast('Usuário atualizado com sucesso!', 'sucesso');
      setUsuarioEdicao(null);
    } catch (error: unknown) {
      mostrarToast(`Erro ao salvar usuário: ${extrairMensagemErro(error)}`, 'erro');
    } finally {
      setLoadingEditUser(false);
    }
  };

  const handleCriarNovoUsuarioEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaSelecionada) return;

    setLoadingCreateUser(true);
    try {
      const novoAvatar = novoUserCargo === 'admin' ? '👑' : '👤';
      const emailLimpo = novoUserEmail.trim().toLowerCase();

      // 1. Tenta a RPC nativa do banco (100% atômica, rápida e independente de Edge Function)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'admin_criar_usuario_estabelecimento',
        {
          p_email: emailLimpo,
          p_senha: novoUserSenha,
          p_nome: novoUserNome.trim(),
          p_cargo: novoUserCargo,
          p_avatar: novoAvatar,
          p_empresa_id: empresaSelecionada.id
        }
      );

      if (rpcError || !rpcData || !(rpcData as { user_id?: string }).user_id) {
        // 2. Fallback para Edge Function admin-auth
        const { data: authData, error: fnError } = await supabase.functions.invoke('admin-auth', {
          body: {
            action: 'createUser',
            newEmail: emailLimpo,
            password: novoUserSenha,
            nome: novoUserNome.trim(),
            cargo: novoUserCargo,
            avatar: novoAvatar,
            empresaId: empresaSelecionada.id
          }
        });

        if (fnError || !authData?.user?.id) {
          let msg = rpcError?.message;
          if (!msg) {
            if (fnError && typeof fnError === 'object' && 'context' in fnError) {
              try {
                const corpo = await (fnError as { context: Response }).context.json();
                if (corpo?.error) msg = corpo.error;
                else if (corpo?.message) msg = corpo.message;
              } catch {
                msg = fnError.message;
              }
            } else if (fnError?.message) {
              msg = fnError.message;
            } else if ((authData as { error?: string } | null)?.error) {
              msg = (authData as { error?: string }).error!;
            }
          }
          throw new Error(msg || 'Não foi possível cadastrar o usuário.');
        }

        const userId = authData.user.id as string;

        const { error: perfilError } = await supabase.from('usuarios').upsert([
          {
            id: userId,
            nome: novoUserNome.trim(),
            email: emailLimpo,
            cargo: novoUserCargo,
            status: 'ativo',
            avatar: novoAvatar,
            empresa_id: empresaSelecionada.id
          }
        ]);

        if (perfilError) throw perfilError;
      }

      mostrarToast(`Novo usuário "${novoUserNome}" adicionado!`, 'sucesso');
      setModalNovoUsuario(false);
      setNovoUserNome('');
      setNovoUserEmail('');
      setNovoUserSenha('');

      await abrirEmpresa(empresaSelecionada);
    } catch (error: unknown) {
      mostrarToast(`Falha ao adicionar usuário: ${extrairMensagemErro(error)}`, 'erro');
    } finally {
      setLoadingCreateUser(false);
    }
  };

  // Criar Novo Estabelecimento pelo Super Admin
  const handleCriarClienteMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCriacao(true);
    let idEmpresaCriada: string | null = null;

    try {
      const dataVenc = new Date();
      if (novoModalidadeInicial === 'degustacao') {
        dataVenc.setDate(dataVenc.getDate() + 7);
      } else if (novoModalidadeInicial === 'ativa') {
        dataVenc.setDate(dataVenc.getDate() + 30);
      }

      const payloadEmpresa: Record<string, unknown> = {
        nome_fantasia: novoNomeEmpresa.trim(),
        status_assinatura: novoModalidadeInicial,
        data_vencimento: novoModalidadeInicial === 'pendente' ? null : dataVenc.toISOString(),
        valor_mensalidade:
          novoModalidadeInicial === 'degustacao'
            ? 0
            : configSaaS.ciclos.mensal.valorMensalEquivalente
      };

      let resEmpresa = await supabase.from('empresas').insert([payloadEmpresa]).select('id').single();

      if (resEmpresa.error?.message.includes('valor_mensalidade')) {
        delete payloadEmpresa.valor_mensalidade;
        resEmpresa = await supabase.from('empresas').insert([payloadEmpresa]).select('id').single();
      }
      if (resEmpresa.error || !resEmpresa.data) {
        throw new Error(resEmpresa.error?.message || 'Falha ao registrar estabelecimento.');
      }

      idEmpresaCriada = resEmpresa.data.id;
      const emailLimpo = novoEmailAdmin.trim().toLowerCase();

      const { data: authData, error: fnError } = await supabase.functions.invoke('admin-auth', {
        body: {
          action: 'createUser',
          newEmail: emailLimpo,
          password: novaSenhaAdmin,
          nome: novoNomeAdmin.trim(),
          cargo: 'admin',
          avatar: '👑',
          empresaId: idEmpresaCriada
        }
      });

      if (fnError || !authData?.user?.id) {
        if (idEmpresaCriada) {
          await supabase.from('empresas').delete().eq('id', idEmpresaCriada);
          idEmpresaCriada = null;
        }

        const { data: idEmpresaRpc, error: rpcErr } = await supabase.rpc(
          'super_admin_criar_estabelecimento',
          {
            p_email: emailLimpo,
            p_senha: novaSenhaAdmin,
            p_nome_empresa: novoNomeEmpresa.trim(),
            p_nome_usuario: novoNomeAdmin.trim(),
            p_modalidade_inicial: novoModalidadeInicial,
            p_valor_mensalidade:
              novoModalidadeInicial === 'degustacao'
                ? 0
                : configSaaS.ciclos.mensal.valorMensalEquivalente
          }
        );

        if (rpcErr || !idEmpresaRpc) {
          const msg =
            (authData as { error?: string } | null)?.error ||
            rpcErr?.message ||
            fnError?.message ||
            'Não foi possível gerar credencial de acesso.';
          throw new Error(msg);
        }
      } else {
        const userId = authData.user.id as string;

        const { error: perfilError } = await supabase.from('usuarios').upsert([
          {
            id: userId,
            nome: novoNomeAdmin.trim(),
            email: emailLimpo,
            cargo: 'admin',
            status: 'ativo',
            avatar: '👑',
            empresa_id: idEmpresaCriada
          }
        ]);
        if (perfilError) throw perfilError;
      }

      mostrarToast('Estabelecimento criado com sucesso!', 'sucesso');
      setModalNovoCliente(false);
      setNovoNomeEmpresa('');
      setNovoNomeAdmin('');
      setNovoEmailAdmin('');
      setNovaSenhaAdmin('');

      await carregarEmpresas();
    } catch (error: unknown) {
      if (idEmpresaCriada) await supabase.from('empresas').delete().eq('id', idEmpresaCriada);
      mostrarToast(`Falha: ${extrairMensagemErro(error)}`, 'erro');
    } finally {
      setLoadingCriacao(false);
    }
  };

  // Carrega faturas geradas no banco para o cliente em edição
  const carregarFaturasClienteEdicao = useCallback(async (empresaId: string) => {
    setCarregandoFaturasCliente(true);
    try {
      const lista = await carregarFaturasGeradasBancoEmpresa(empresaId);
      setFaturasClienteEdicao(lista);
    } finally {
      setCarregandoFaturasCliente(false);
    }
  }, []);

  // Excluir fatura NÃO paga do cliente
  const handleExcluirFaturaCliente = async (fatura: FaturaAssinatura) => {
    if (!empresaEdicao || fatura.status === 'paga') return;
    setExcluindoFaturaId(fatura.id);
    try {
      const res = await excluirFaturaNaoPaga(fatura.id, empresaEdicao.id);
      if (!res.ok) {
        mostrarToast(res.erro || 'Não foi possível excluir a fatura.', 'erro');
        return;
      }
      setFaturasClienteEdicao((prev) => prev.filter((item) => item.id !== fatura.id));
      setConfirmandoExclusaoFaturaId(null);
      mostrarToast('Fatura excluída com sucesso.', 'sucesso');
    } finally {
      setExcluindoFaturaId(null);
    }
  };

  // Abrir Modal de Edição Completa do Cliente (Dados Cadastrais + Licença)
  const abrirModalEdicao = (empresa: EmpresaMaster) => {
    setEmpresaEdicao(empresa);
    setAbaEdicaoEmpresa('dados');
    setErroEdicaoEmpresa('');
    setFiltroStatusFaturaEdicao('todas');
    setConfirmandoExclusaoFaturaId(null);
    setFaturasClienteEdicao([]);
    void carregarFaturasClienteEdicao(empresa.id);
    setEditNome(empresa.nome_fantasia);
    setEditNomeExibicao(empresa.nome_exibicao || '');
    setEditDocumento(empresa.documento ? formatarCpfCnpj(empresa.documento) : '');
    setEditTelefone(empresa.telefone ? formatarTelefoneBR(empresa.telefone) : '');
    setEditEmailContato(empresa.email_contato || '');
    setEditStatus(empresa.status_assinatura || 'ativa');
    const cicloEmp = (empresa.ciclo_cobranca as IdCicloCobranca | undefined) || 'mensal';
    setEditCiclo(LISTA_CICLOS_IDS.includes(cicloEmp) ? cicloEmp : 'mensal');
    setEditMensalidade(
      typeof empresa.valor_mensalidade === 'number'
        ? empresa.valor_mensalidade
        : configSaaS.ciclos.mensal.valorMensalEquivalente
    );
    setEditVencimento(empresa.data_vencimento ? empresa.data_vencimento.split('T')[0] : '');
  };

  const handleSalvarEdicaoEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaEdicao) return;

    // Validação dos dados cadastrais antes de enviar ao banco
    const nomeLimpo = editNome.trim().replace(/\s+/g, ' ');
    const nomeExibicaoLimpo = editNomeExibicao.trim().replace(/\s+/g, ' ');
    const documentoDigitos = extrairDigitos(editDocumento);
    const telefoneDigitos = extrairDigitos(editTelefone);
    const emailLimpo = editEmailContato.trim().toLowerCase();

    const falhar = (mensagem: string, aba: 'dados' | 'licenca') => {
      setErroEdicaoEmpresa(mensagem);
      setAbaEdicaoEmpresa(aba);
    };

    if (nomeLimpo.length < 3) return falhar('O nome do estabelecimento deve ter no mínimo 3 caracteres.', 'dados');
    if (nomeExibicaoLimpo.length === 1 || nomeExibicaoLimpo.length > 40) {
      return falhar('O nome de exibição deve ter entre 2 e 40 caracteres.', 'dados');
    }
    if (documentoDigitos && !validarDocumentoBrasil(documentoDigitos).valido) {
      return falhar('CPF ou CNPJ inválido. Confira os números digitados.', 'dados');
    }
    if (telefoneDigitos && !validarTelefoneBR(telefoneDigitos)) {
      return falhar('Telefone inválido. Use DDD + número.', 'dados');
    }
    if (emailLimpo && !validarEmail(emailLimpo)) {
      return falhar('E-mail de contato inválido.', 'dados');
    }
    if (editStatus !== 'pendente' && !editVencimento) {
      return falhar('Informe a data de vencimento da licença.', 'licenca');
    }

    setErroEdicaoEmpresa('');
    setLoadingEdicao(true);
    try {
      const valorFinal = editStatus === 'degustacao' ? 0 : Number(editMensalidade.toFixed(2));
      const vencimentoFinal = editStatus === 'pendente' && !editVencimento ? null : editVencimento || null;

      const payload = {
        nome_fantasia: nomeLimpo,
        nome_exibicao: nomeExibicaoLimpo || null,
        documento: documentoDigitos || null,
        telefone: telefoneDigitos || null,
        email_contato: emailLimpo || null,
        status_assinatura: editStatus,
        ciclo_cobranca: editCiclo,
        plano_nome: configSaaS.planoNome,
        data_vencimento: vencimentoFinal,
        valor_mensalidade: valorFinal
      };

      const { error } = await supabase.from('empresas').update(payload).eq('id', empresaEdicao.id);
      if (error) {
        if (error.message.includes('nome_exibicao') || error.message.includes('email_contato')) {
          throw new Error(
            'Execute a migration 20261030000001_identidade_dados_cadastrais_empresas.sql no Supabase para habilitar estes campos.'
          );
        }
        throw error;
      }

      setEmpresas((prev) =>
        prev.map((emp) =>
          emp.id === empresaEdicao.id
            ? {
                ...emp,
                ...payload,
                documento: payload.documento ?? undefined,
                telefone: payload.telefone ?? undefined
              }
            : emp
        )
      );
      mostrarToast('Dados do estabelecimento salvos com sucesso!', 'sucesso');
      setEmpresaEdicao(null);
    } catch (error) {
      setErroEdicaoEmpresa(extrairMensagemErro(error));
    } finally {
      setLoadingEdicao(false);
    }
  };

  const executarToggleBloqueio = async (empresa: EmpresaMaster, novoStatus: string) => {
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'super_admin_alternar_bloqueio_empresa',
        { p_empresa_id: empresa.id, p_novo_status: novoStatus }
      );

      let statusAplicado = novoStatus;

      if (rpcError) {
        const { error: updateError } = await supabase
          .from('empresas')
          .update({ status_assinatura: novoStatus })
          .eq('id', empresa.id);
        if (updateError) throw updateError;
      } else if (rpcData && typeof rpcData === 'object' && 'novo_status' in rpcData) {
        statusAplicado = (rpcData as { novo_status: string }).novo_status;
      }

      setEmpresas((prev) =>
        prev.map((e) => (e.id === empresa.id ? { ...e, status_assinatura: statusAplicado } : e))
      );

      if (contexto?.dadosEmpresa?.id === empresa.id) {
        void contexto.carregarDados(true);
      }

      mostrarToast(
        `Estabelecimento ${statusAplicado === 'bloqueada' ? 'suspenso' : 'liberado'} com sucesso!`,
        'sucesso'
      );
    } catch (err: unknown) {
      console.error('Erro ao alterar status:', err);
      mostrarToast(`Erro ao alterar status: ${extrairMensagemErro(err)}`, 'erro');
    }
  };

  const handleToggleBloqueio = (empresa: EmpresaMaster) => {
    const isAtualmenteBloqueada =
      empresa.status_assinatura === 'bloqueada' || empresa.status_assinatura === 'inadimplente';
    const novoStatus = isAtualmenteBloqueada ? 'ativa' : 'bloqueada';

    if (!isAtualmenteBloqueada) {
      // Confirmação para suspensão
      setModalConfirmacao({
        aberto: true,
        titulo: 'Suspender Estabelecimento?',
        descricao: `Deseja suspender temporariamente o acesso do estabelecimento "${empresa.nome_fantasia}"?\n\nOs usuários deste estabelecimento serão bloqueados até a reativação.`,
        textoConfirmar: 'Suspender Acesso',
        tipo: 'aviso',
        iconePersonalizado: <LucideIcons.Lock size={22} strokeWidth={2.2} />,
        onConfirmar: async () => {
          fecharConfirmacao();
          await executarToggleBloqueio(empresa, novoStatus);
        }
      });
    } else {
      // Desbloqueio imediato
      void executarToggleBloqueio(empresa, novoStatus);
    }
  };

  // Salvar Configurações Globais de Planos, Preços, Promoções, Mercado Pago e Textos
  const handleSalvarConfiguracoesSaaS = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSalvandoConfig(true);
    try {
      const resultado = await salvarConfiguracaoGlobalSaaS(configSaaS);
      if (resultado.salvoNaNuvem) {
        mostrarToast('Planos, preços e configurações sincronizados no banco e no sistema!', 'sucesso');
      } else {
        mostrarToast('Configurações salvas e aplicadas imediatamente neste navegador!', 'sucesso');
      }
    } catch {
      mostrarToast('Erro ao salvar configurações.', 'erro');
    } finally {
      setSalvandoConfig(false);
    }
  };

  const atualizarCicloGlobal = (
    cicloId: IdCicloCobranca,
    campo: keyof ConfiguracaoGlobalSaaS['ciclos'][IdCicloCobranca],
    valor: string | number | boolean
  ) => {
    setConfigSaaS((prev) => {
      const cicloAtual = prev.ciclos[cicloId];
      const atualizado = { ...cicloAtual, [campo]: valor };

      // Se alterou o valor mensal equivalente, recalcula automaticamente o valor total do ciclo
      if (campo === 'valorMensalEquivalente' && typeof valor === 'number') {
        atualizado.valorTotalCiclo = Number((valor * cicloAtual.meses).toFixed(2));
      }
      // Se alterou o valor total do ciclo, recalcula automaticamente o valor mensal equivalente
      if (campo === 'valorTotalCiclo' && typeof valor === 'number' && cicloAtual.meses > 0) {
        atualizado.valorMensalEquivalente = Number((valor / cicloAtual.meses).toFixed(2));
      }

      return {
        ...prev,
        ciclos: {
          ...prev.ciclos,
          [cicloId]: atualizado
        }
      };
    });
  };

  const handleTestarConexaoMercadoPago = async () => {
    const token = novoTokenMP.trim();

    if (token && ehPublicKeyMercadoPago(token)) {
      setStatusTesteMP({
        ok: false,
        msg: 'Atenção: você colou a "Public Key" (1º campo curto em formato UUID). Volte no painel do Mercado Pago e copie o 2º campo chamado "Access Token" (ele fica logo abaixo da Public Key e é um código mais longo terminado em números).'
      });
      return;
    }

    setTestandoMP(true);
    setStatusTesteMP(null);
    try {
      if (token) {
        const resp = await salvarETestarTokenMercadoPago(token);
        if (!resp.ok) {
          setStatusTesteMP({
            ok: false,
            msg:
              resp.error ||
              'Access Token inválido ou expirado. Certifique-se de copiar o 2º campo "Access Token" em Mercado Pago Developers → Credenciais.'
          });
          return;
        }

        setNovoTokenMP('');
        setStatusIntegracaoMP({
          configured: true,
          source: 'vault',
          maskedPreview: resp.maskedPreview || ''
        });
        setStatusTesteMP({
          ok: true,
          msg: `Conectado e salvo com segurança no servidor! Conta Mercado Pago: ${resp.accountLabel || 'Validada'}`
        });
      } else {
        const resp = await testarConexaoMercadoPagoServidor();
        if (!resp.ok) {
          setStatusTesteMP({
            ok: false,
            msg:
              resp.error ||
              'Nenhum token ativo configurado no servidor ou credencial expirada. Cole um novo Access Token acima e clique em Salvar e Testar.'
          });
          return;
        }

        setStatusIntegracaoMP((prev) => ({
          configured: true,
          source: prev?.source && prev.source !== 'none' ? prev.source : 'vault',
          maskedPreview: resp.maskedPreview || prev?.maskedPreview || ''
        }));
        setStatusTesteMP({
          ok: true,
          msg: `Conexão com o servidor validada! Conta Mercado Pago: ${resp.accountLabel || 'Ativa'}`
        });
      }
    } catch {
      setStatusTesteMP({
        ok: false,
        msg: 'Não foi possível validar o token no servidor agora. Tente novamente em instantes.'
      });
    } finally {
      setTestandoMP(false);
    }
  };

  // Carrega em paralelo as categorias e produtos da empresa de origem selecionada no Clonador
  const carregarCardapioOrigem = useCallback(async (origemId: string) => {
    if (!origemId) {
      setCategoriasOrigemClone([]);
      setProdutosOrigemClone([]);
      setCategoriasSelecionadasClone([]);
      return;
    }

    setCarregandoOrigemClone(true);
    try {
      const [resCats, resProds] = await Promise.all([
        supabase
          .from('categorias')
          .select('*')
          .eq('empresa_id', origemId)
          .is('deletado_em', null)
          .order('ordem', { ascending: true }),
        supabase
          .from('produtos')
          .select('*')
          .eq('empresa_id', origemId)
          .is('deletado_em', null)
          .order('id', { ascending: true })
      ]);

      const cats = (resCats.data as DBCategoriaClone[] | null) || [];
      const prods = (resProds.data as DBProdutoClone[] | null) || [];

      // Caso existam produtos cujas categorias ainda não estejam registradas na tabela categorias, garante na lista
      const nomesCategoriasExistentes = new Set(cats.map((c) => c.nome));
      const catsExtras: DBCategoriaClone[] = [];
      prods.forEach((p, idx) => {
        if (p.categoria && !nomesCategoriasExistentes.has(p.categoria)) {
          nomesCategoriasExistentes.add(p.categoria);
          catsExtras.push({
            id: -(idx + 1),
            nome: p.categoria,
            icone: 'Utensils',
            ativo: true,
            ordem: cats.length + catsExtras.length
          });
        }
      });

      const todasCategorias = [...cats, ...catsExtras];
      setCategoriasOrigemClone(todasCategorias);
      setProdutosOrigemClone(prods);
      setCategoriasSelecionadasClone(todasCategorias.map((c) => c.nome));
    } catch {
      mostrarToast('Não foi possível carregar o cardápio do estabelecimento de origem.', 'erro');
    } finally {
      setCarregandoOrigemClone(false);
    }
  }, [mostrarToast]);

  const abrirModalClonarCardapio = (empresaClicada?: EmpresaMaster) => {
    const empresaOficial =
      empresas.find((e) => empresaIdsComSuperAdmin.has(e.id)) ||
      empresas.find((e) => e.nome_fantasia.trim().toUpperCase() === 'T-SYSTEM BEACH OFICIAL');

    let origemId = empresaOficial?.id || empresas[0]?.id || '';
    let destinoId = '';

    if (empresaClicada) {
      if (empresaOficial && empresaClicada.id !== empresaOficial.id) {
        origemId = empresaOficial.id;
        destinoId = empresaClicada.id;
      } else {
        origemId = empresaClicada.id;
        const outra = empresas.find((e) => e.id !== empresaClicada.id);
        destinoId = outra?.id || '';
      }
    } else if (empresas.length > 1) {
      const outra = empresas.find((e) => e.id !== origemId);
      destinoId = outra?.id || '';
    }

    setEmpresaOrigemCloneId(origemId);
    setEmpresaDestinoCloneId(destinoId);
    setModoClone('mesclar');
    setModoEstoqueClone('manter');
    setModalClonarCardapio(true);
    if (origemId) {
      void carregarCardapioOrigem(origemId);
    }
  };

  const alternarCategoriaClone = (nomeCategoria: string) => {
    setCategoriasSelecionadasClone((prev) =>
      prev.includes(nomeCategoria)
        ? prev.filter((c) => c !== nomeCategoria)
        : [...prev, nomeCategoria]
    );
  };

  const handleExecutarClonagemCardapio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaOrigemCloneId || !empresaDestinoCloneId) {
      mostrarToast('Selecione o estabelecimento de origem e o de destino.', 'erro');
      return;
    }
    if (empresaOrigemCloneId === empresaDestinoCloneId) {
      mostrarToast('O estabelecimento de destino deve ser diferente da origem.', 'erro');
      return;
    }
    if (categoriasSelecionadasClone.length === 0) {
      mostrarToast('Selecione pelo menos uma categoria para clonar.', 'erro');
      return;
    }

    const catsParaClonar = categoriasOrigemClone.filter((c) =>
      categoriasSelecionadasClone.includes(c.nome)
    );
    const prodsParaClonar = produtosOrigemClone.filter((p) =>
      categoriasSelecionadasClone.includes(p.categoria)
    );

    if (catsParaClonar.length === 0 && prodsParaClonar.length === 0) {
      mostrarToast('O estabelecimento de origem não possui itens nas categorias selecionadas.', 'erro');
      return;
    }

    setExecutandoClone(true);
    try {
      const agoraIso = new Date().toISOString();

      if (modoClone === 'substituir') {
        // Move cardápio anterior do destino para lixeira lógica (seguro contra quebra de histórico)
        await Promise.all([
          supabase
            .from('categorias')
            .update({ deletado_em: agoraIso, ativo: false })
            .eq('empresa_id', empresaDestinoCloneId)
            .is('deletado_em', null),
          supabase
            .from('produtos')
            .update({ deletado_em: agoraIso, ativo: false })
            .eq('empresa_id', empresaDestinoCloneId)
            .is('deletado_em', null)
        ]);
      }

      // Busca o que já está ativo no destino para evitar duplicidades no modo 'mesclar'
      const [resCatsDestino, resProdsDestino] = await Promise.all([
        supabase
          .from('categorias')
          .select('nome, ordem')
          .eq('empresa_id', empresaDestinoCloneId)
          .is('deletado_em', null),
        supabase
          .from('produtos')
          .select('nome, categoria')
          .eq('empresa_id', empresaDestinoCloneId)
          .is('deletado_em', null)
      ]);

      const nomesCatsDestino = new Set(
        ((resCatsDestino.data as { nome: string }[] | null) || []).map((c) =>
          c.nome.trim().toLowerCase()
        )
      );
      const chavesProdsDestino = new Set(
        ((resProdsDestino.data as { nome: string; categoria: string }[] | null) || []).map(
          (p) => `${p.categoria.trim().toLowerCase()}::${p.nome.trim().toLowerCase()}`
        )
      );

      const ordemBase = ((resCatsDestino.data as { nome: string }[] | null) || []).length;

      const novasCategoriasPayload = catsParaClonar
        .filter((c) => !nomesCatsDestino.has(c.nome.trim().toLowerCase()))
        .map((c, idx) => ({
          nome: c.nome.trim(),
          icone: c.icone || 'Utensils',
          ativo: c.ativo !== false,
          ordem: ordemBase + idx,
          empresa_id: empresaDestinoCloneId
        }));

      const novosProdutosPayload = prodsParaClonar
        .filter(
          (p) =>
            !chavesProdsDestino.has(
              `${p.categoria.trim().toLowerCase()}::${p.nome.trim().toLowerCase()}`
            )
        )
        .map((p) => ({
          nome: p.nome.trim(),
          categoria: p.categoria.trim(),
          subcategoria: p.subcategoria || null,
          imagem_url: p.imagem_url || null,
          preco: Number(p.preco || 0),
          preco_custo: Number(p.preco_custo || 0),
          estoque: modoEstoqueClone === 'zerar' ? 0 : Number(p.estoque ?? 0),
          ativo: p.ativo !== false,
          empresa_id: empresaDestinoCloneId
        }));

      if (novasCategoriasPayload.length > 0) {
        const { error: errCats } = await supabase.from('categorias').insert(novasCategoriasPayload);
        if (errCats) throw errCats;
      }

      if (novosProdutosPayload.length > 0) {
        const { error: errProds } = await supabase.from('produtos').insert(novosProdutosPayload);
        if (errProds) throw errProds;
      }

      const nomeDestino =
        empresas.find((e) => e.id === empresaDestinoCloneId)?.nome_fantasia || 'Destino';

      mostrarToast(
        `Cardápio clonado para "${nomeDestino}": ${novasCategoriasPayload.length} categorias e ${novosProdutosPayload.length} produtos copiados com fotos!`,
        'sucesso'
      );
      setModalClonarCardapio(false);
    } catch (error: unknown) {
      mostrarToast(`Erro ao clonar cardápio: ${extrairMensagemErro(error)}`, 'erro');
    } finally {
      setExecutandoClone(false);
    }
  };

  const handleSair = async () => {
    await supabase.auth.signOut();
    contexto?.setGarcomLogado(null);
    navigate('/login');
  };

  const navegarParaSecao = (secao: AbaMaster) => {
    setAbaAtiva(secao);
    setEmpresaSelecionada(null);
    setMenuAberto(false);
  };

  const aplicarFiltroMenu = (status: FiltroStatusEmpresa) => {
    setAbaAtiva('estabelecimentos');
    setEmpresaSelecionada(null);
    setFiltroStatus(status);
    setMenuAberto(false);
  };

  const handleCopiarWebhookMenu = () => {
    navigator.clipboard
      .writeText(urlWebhookOficial)
      .then(() => {
        mostrarToast('URL do Webhook Mercado Pago copiada com sucesso!', 'sucesso');
      })
      .catch(() => {
        mostrarToast('Não foi possível copiar o webhook automaticamente.', 'erro');
      });
    setMenuAberto(false);
  };

  const handleAtualizarDadosMenu = async () => {
    setMenuAberto(false);
    setLoading(true);
    await carregarEmpresas();
    mostrarToast('Dados sincronizados com o banco!', 'sucesso');
  };

  const empresasFiltradas = empresas.filter((e) => {
    const termo = busca.toLowerCase().trim();
    const matchNome = e.nome_fantasia.toLowerCase().includes(termo);
    const matchDoc = (e.documento || '').includes(termo);
    const matchTel = (e.telefone || '').includes(termo);
    if (!matchNome && !matchDoc && !matchTel) return false;

    if (filtroStatus === 'ativas') return e.status_assinatura === 'ativa';
    if (filtroStatus === 'degustacao') return e.status_assinatura === 'degustacao';
    if (filtroStatus === 'pendentes') return e.status_assinatura === 'pendente';
    if (filtroStatus === 'bloqueadas') {
      return e.status_assinatura === 'bloqueada' || e.status_assinatura === 'inadimplente';
    }
    return true;
  });

  const totalEmpresas = empresas.length;
  const ativasEmDia = empresas.filter((e) => e.status_assinatura === 'ativa').length;
  const emDegustacao = empresas.filter((e) => e.status_assinatura === 'degustacao').length;
  const aguardandoPlano = empresas.filter((e) => e.status_assinatura === 'pendente').length;
  const mrrEstimado = empresas
    .filter((e) => e.status_assinatura === 'ativa')
    .reduce((acc, curr) => {
      const valor = typeof curr.valor_mensalidade === 'number'
        ? curr.valor_mensalidade
        : (configSaaS.ciclos[curr.ciclo_cobranca as IdCicloCobranca]?.valorMensalEquivalente ?? configSaaS.ciclos.mensal.valorMensalEquivalente);
      return acc + Number(valor || 0);
    }, 0);

  const empresasEmRisco = empresas.filter(
    (e) => e.status_assinatura === 'pendente' || e.status_assinatura === 'bloqueada' || e.status_assinatura === 'inadimplente'
  );

  const receitaEmRisco = empresasEmRisco.reduce((acc, curr) => {
    const valor = typeof curr.valor_mensalidade === 'number'
      ? curr.valor_mensalidade
      : (configSaaS.ciclos[curr.ciclo_cobranca as IdCicloCobranca]?.valorMensalEquivalente ?? configSaaS.ciclos.mensal.valorMensalEquivalente);
    return acc + Number(valor || 0);
  }, 0);

  const empresasFinanceiroFiltradas = empresas.filter((e) => {
    const termo = buscaFinanceiro.toLowerCase().trim();
    const matchNome = e.nome_fantasia.toLowerCase().includes(termo) || (e.nome_exibicao || '').toLowerCase().includes(termo);
    const matchDoc = (e.documento || '').includes(termo);
    if (!matchNome && !matchDoc) return false;

    if (filtroFinanceiro === 'ativa') return e.status_assinatura === 'ativa';
    if (filtroFinanceiro === 'degustacao') return e.status_assinatura === 'degustacao';
    if (filtroFinanceiro === 'pendente') return e.status_assinatura === 'pendente';
    if (filtroFinanceiro === 'bloqueada') return e.status_assinatura === 'bloqueada' || e.status_assinatura === 'inadimplente';
    return true;
  });

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://edpubwaxpzwnqlyjscwk.supabase.co';
  const urlWebhookOficial = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/mercadopago-webhook`;

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center font-sans gap-4 pt-safe pb-safe">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-fuchsia-800 rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-500 animate-pulse">
          Carregando Command Center...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full bg-slate-100/70 text-slate-900 font-sans pb-safe-24 relative overflow-x-hidden selection:bg-slate-900 selection:text-white">
      {/* TOAST FLUTUANTE */}
      {toast && (
        <div className="fixed top-safe-5 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300 px-4 w-full max-w-md">
          <div
            className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-medium tracking-tight border backdrop-blur-md ${
              toast.tipo === 'sucesso'
                ? 'bg-white/95 text-emerald-700 border-emerald-200'
                : 'bg-white/95 text-rose-700 border-rose-200'
            }`}
          >
            {toast.tipo === 'sucesso' ? (
              <LucideIcons.CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <LucideIcons.AlertCircle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{toast.mensagem}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          DRAWER / MENU LATERAL ESTILO ADMIN (CINZA EM BRANCO GELO, MINIMALISTA)
      ===================================================================== */}
      {menuAberto && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop com blur suave */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMenuAberto(false)}
            aria-hidden="true"
          />

          {/* Painel do Menu (Paleta Cinza sobre Branco Gelo #F8F9FA, idêntico ao padrão Admin) */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de Navegação do Command Center"
            className="relative w-full max-w-sm sm:max-w-md bg-slate-50 border-r border-slate-200/80 shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-left duration-300"
          >
            {/* Cabeçalho do Menu */}
            <div className="p-4 sm:p-5 pt-safe-4 sm:pt-safe-5 border-b border-slate-200/70 bg-white/70 backdrop-blur-md flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <AvatarUsuario
                  avatar="👑"
                  nome="Super Admin"
                  className="w-10 h-10 rounded-2xl bg-slate-900 text-white shadow-xs border border-slate-800"
                  emojiClassName="text-xl"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">Super Admin</p>
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600 border border-slate-200/60 uppercase tracking-wider">
                      Master
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {contexto?.garcomLogado?.email || 'Super Admin'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200/80 shadow-2xs hover:shadow-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                title="Fechar Menu (Esc)"
              >
                <LucideIcons.X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Conteúdo com Grupos de Ações (Estilo Admin Settings) */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
              {/* GRUPO 1: MÓDULOS PRINCIPAIS */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  Módulos do Sistema
                </p>
                <div className="bg-slate-100/75 border border-slate-200/60 rounded-3xl p-1.5 space-y-0.5">
                  <ItemMenuMaster
                    icone={<LucideIcons.Building2 size={18} strokeWidth={1.8} />}
                    titulo="Estabelecimentos"
                    subtitulo="Clientes cadastrados e licenças"
                    ativo={abaAtiva === 'estabelecimentos'}
                    onClick={() => navegarParaSecao('estabelecimentos')}
                    badge={
                      <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-[11px] font-medium text-slate-700">
                        {totalEmpresas}
                      </span>
                    }
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.Wallet size={18} strokeWidth={1.8} />}
                    titulo="Financeiro T-System"
                    subtitulo="Panorama financeiro, faturamento e MRR"
                    ativo={abaAtiva === 'financeiro'}
                    onClick={() => navegarParaSecao('financeiro')}
                    badge={
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100/90 text-[11px] font-semibold text-emerald-800">
                        R$ {formatarMoedaBR(mrrEstimado)}
                      </span>
                    }
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.Crown size={18} strokeWidth={1.8} />}
                    titulo="Planos & Promoções"
                    subtitulo="Preços por ciclo e avisos"
                    ativo={abaAtiva === 'planos'}
                    onClick={() => navegarParaSecao('planos')}
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.CreditCard size={18} strokeWidth={1.8} />}
                    titulo="Mercado Pago & Textos"
                    subtitulo="Credenciais de pagamento e copy"
                    ativo={abaAtiva === 'mercadopago_cms'}
                    onClick={() => navegarParaSecao('mercadopago_cms')}
                  />
                </div>
              </div>

              {/* GRUPO 2: ATALHOS RÁPIDOS DE CLIENTES */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  Filtros Rápidos
                </p>
                <div className="bg-slate-100/75 border border-slate-200/60 rounded-3xl p-1.5 space-y-0.5">
                  <ItemMenuMaster
                    icone={<LucideIcons.CheckCircle2 size={18} strokeWidth={1.8} className="text-emerald-600" />}
                    titulo="Clientes Ativos"
                    subtitulo="Assinaturas em dia"
                    ativo={abaAtiva === 'estabelecimentos' && filtroStatus === 'ativas'}
                    onClick={() => aplicarFiltroMenu('ativas')}
                    badge={
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100/80 text-[11px] font-medium text-emerald-800">
                        {ativasEmDia}
                      </span>
                    }
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.Clock size={18} strokeWidth={1.8} className="text-amber-600" />}
                    titulo="Clientes em Teste Grátis"
                    subtitulo="Período de degustação"
                    ativo={abaAtiva === 'estabelecimentos' && filtroStatus === 'degustacao'}
                    onClick={() => aplicarFiltroMenu('degustacao')}
                    badge={
                      <span className="px-2 py-0.5 rounded-full bg-amber-100/80 text-[11px] font-medium text-amber-800">
                        {emDegustacao}
                      </span>
                    }
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.AlertTriangle size={18} strokeWidth={1.8} className="text-orange-600" />}
                    titulo="Pagamento Pendente"
                    subtitulo="Aguardando confirmação"
                    ativo={abaAtiva === 'estabelecimentos' && filtroStatus === 'pendentes'}
                    onClick={() => aplicarFiltroMenu('pendentes')}
                    badge={
                      <span className="px-2 py-0.5 rounded-full bg-orange-100/80 text-[11px] font-medium text-orange-800">
                        {aguardandoPlano}
                      </span>
                    }
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.Lock size={18} strokeWidth={1.8} className="text-slate-500" />}
                    titulo="Estabelecimentos Suspensos"
                    subtitulo="Acesso temporariamente bloqueado"
                    ativo={abaAtiva === 'estabelecimentos' && filtroStatus === 'bloqueadas'}
                    onClick={() => aplicarFiltroMenu('bloqueadas')}
                    badge={
                      <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-[11px] font-medium text-slate-700">
                        {empresas.filter((e) => e.status_assinatura === 'bloqueada' || e.status_assinatura === 'inadimplente').length}
                      </span>
                    }
                  />
                </div>
              </div>

              {/* GRUPO 3: AÇÕES & FERRAMENTAS */}
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-2">
                  Ações & Ferramentas
                </p>
                <div className="bg-slate-100/75 border border-slate-200/60 rounded-3xl p-1.5 space-y-0.5">
                  <ItemMenuMaster
                    icone={<LucideIcons.PlusCircle size={18} strokeWidth={1.8} className="text-slate-800" />}
                    titulo="Cadastrar Novo Cliente"
                    subtitulo="Criar estabelecimento e admin inicial"
                    onClick={() => {
                      setMenuAberto(false);
                      setModalNovoCliente(true);
                    }}
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.Copy size={18} strokeWidth={1.8} className="text-slate-800" />}
                    titulo="Clonar Cardápio"
                    subtitulo="Replicar categorias e produtos"
                    onClick={() => {
                      setMenuAberto(false);
                      abrirModalClonarCardapio();
                    }}
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.Link2 size={18} strokeWidth={1.8} className="text-slate-800" />}
                    titulo="Copiar URL Webhook MP"
                    subtitulo="Endpoint de retorno de pagamento"
                    onClick={handleCopiarWebhookMenu}
                  />

                  <ItemMenuMaster
                    icone={<LucideIcons.RefreshCw size={18} strokeWidth={1.8} className="text-slate-800" />}
                    titulo="Sincronizar Dados"
                    subtitulo="Recarregar clientes e usuários"
                    onClick={handleAtualizarDadosMenu}
                  />
                </div>
              </div>
            </div>

            {/* Rodapé do Menu com Logout */}
            <div className="p-4 border-t border-slate-200/70 bg-white/70 backdrop-blur-md space-y-2">
              <button
                type="button"
                onClick={handleSair}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/70 shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all duration-150 text-xs font-medium cursor-pointer"
              >
                <LucideIcons.LogOut size={15} strokeWidth={1.8} />
                <span>Encerrar Sessão</span>
              </button>
              <p className="text-[10px] text-center text-slate-400">
                Pressione <kbd className="px-1.5 py-0.5 bg-slate-200/60 rounded text-[9px] font-mono text-slate-600">Esc</kbd> para fechar ou <kbd className="px-1.5 py-0.5 bg-slate-200/60 rounded text-[9px] font-mono text-slate-600">Ctrl+K</kbd>
              </p>
            </div>
          </aside>
        </div>
      )}

      {/* HEADER SUPER ADMIN COMMAND CENTER */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 pt-safe z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Lado Esquerdo: Botão Menu + Identidade Command Center */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMenuAberto(true)}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0"
              title="Abrir Menu do Sistema (Ctrl + K)"
              aria-label="Abrir menu de navegação"
            >
              <LucideIcons.Menu size={16} strokeWidth={2} />
            </button>

            <div className="w-8 h-8 bg-slate-900 text-white rounded-lg hidden sm:flex items-center justify-center shadow-xs shrink-0">
              <LucideIcons.ShieldCheck size={16} strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-medium text-slate-900 tracking-tight leading-none mb-0.5 truncate">
                Command Center
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="truncate">{configSaaS.nomeSistema} · Super Admin</span>
              </p>
            </div>
          </div>

          {/* Centro: Indicador Sutil do Módulo Ativo (Não polui a tela, visual limpo) */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/60 text-xs text-slate-600 font-medium shadow-2xs">
            {abaAtiva === 'estabelecimentos' && (
              <>
                <LucideIcons.Building2 size={13} className="text-slate-700" />
                <span>Estabelecimentos</span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-500 font-normal">{totalEmpresas} clientes</span>
              </>
            )}
            {abaAtiva === 'financeiro' && (
              <>
                <LucideIcons.Wallet size={13} className="text-emerald-600" />
                <span>Financeiro T-System</span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-slate-500 font-normal">MRR R$ {formatarMoedaBR(mrrEstimado)}</span>
              </>
            )}
            {abaAtiva === 'planos' && (
              <>
                <LucideIcons.Crown size={13} className="text-amber-600" />
                <span>Planos & Promoções</span>
              </>
            )}
            {abaAtiva === 'mercadopago_cms' && (
              <>
                <LucideIcons.CreditCard size={13} className="text-sky-600" />
                <span>Mercado Pago & Textos</span>
              </>
            )}
          </div>

          {/* Lado Direito: Ações Rápidas Alinhadas (Totalmente responsivo, sem quebra em mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botão Clonar Cardápio - Formato Ícone Minimalista 3D */}
            <button
              type="button"
              onClick={() => abrirModalClonarCardapio()}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0"
              title="Clonar cardápio entre estabelecimentos"
              aria-label="Clonar cardápio"
            >
              <LucideIcons.Copy size={15} strokeWidth={1.9} />
            </button>

            {/* Botão Novo Cliente - Exposto no Header como solicitado, adaptável no mobile */}
            <button
              type="button"
              onClick={() => setModalNovoCliente(true)}
              className="h-8 px-2.5 sm:px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm shadow-slate-900/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Cadastrar Novo Cliente"
            >
              <LucideIcons.Plus size={14} strokeWidth={2.2} />
              <span className="hidden sm:inline">Novo cliente</span>
              <span className="sm:hidden">Novo</span>
            </button>

            {/* Encerrar Sessão */}
            <button
              type="button"
              onClick={handleSair}
              className="w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-rose-600 border border-slate-200 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0"
              title="Encerrar Sessão"
              aria-label="Encerrar sessão"
            >
              <LucideIcons.LogOut size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-5 sm:mt-6 relative z-10">
        {/* =====================================================================
            ABA 1: GESTÃO DE ESTABELECIMENTOS, LICENÇAS E PREÇOS PERSONALIZADOS
        ===================================================================== */}
        {abaAtiva === 'estabelecimentos' && (
          <>
            {!empresaSelecionada ? (
              <div className="animate-in fade-in duration-300">

                {/* CARDS DE MÉTRICAS FINANCEIRAS E OPERACIONAIS (RESPONSIVOS & LIMPOS) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-6">
                  {/* Card 1: Receita MRR */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400 font-medium truncate">Receita MRR</span>
                      <div className="w-7 h-7 bg-fuchsia-50 text-fuchsia-700 rounded-xl flex items-center justify-center shrink-0">
                        <LucideIcons.DollarSign size={15} strokeWidth={2.3} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-slate-900 tracking-tight tabular-nums truncate">
                      R$ {mrrEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    <span className="text-[10px] text-slate-400 mt-1 font-normal truncate">mensalidade recorrente</span>
                  </div>

                  {/* Card 2: Estabelecimentos */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400 font-medium truncate">Empresas</span>
                      <div className="w-7 h-7 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
                        <LucideIcons.Building2 size={15} strokeWidth={2} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-slate-900 tracking-tight truncate">
                      {totalEmpresas} {totalEmpresas === 1 ? 'Cliente' : 'Clientes'}
                    </h3>
                    <span className="text-[10px] text-slate-400 mt-1 font-normal truncate">cadastrados no SaaS</span>
                  </div>

                  {/* Card 3: Assinaturas Pagas */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400 font-medium truncate">Assinaturas</span>
                      <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                        <LucideIcons.CheckCircle2 size={15} strokeWidth={2.2} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-emerald-600 tracking-tight truncate">
                      {ativasEmDia} {ativasEmDia === 1 ? 'Ativa' : 'Ativas'}
                    </h3>
                    <span className="text-[10px] text-emerald-600/80 mt-1 font-normal truncate">em dia e operando</span>
                  </div>

                  {/* Card 4: Trial / Pendentes */}
                  <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-400 font-medium truncate">Trial / Pend.</span>
                      <div className="w-7 h-7 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <LucideIcons.Sparkles size={15} strokeWidth={2} />
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-amber-600 tracking-tight truncate">
                      {emDegustacao} Trial · {aguardandoPlano} Pend.
                    </h3>
                    <span className="text-[10px] text-amber-600/80 mt-1 font-normal truncate">requerem atenção</span>
                  </div>
                </div>

                {/* BARRA DE BUSCA E FILTROS RÁPIDOS */}
                <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row justify-between items-center gap-2">
                  <div className="relative w-full md:w-96">
                    <LucideIcons.Search
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                      className="w-full h-9 pl-10 pr-4 bg-slate-50 rounded-xl border border-slate-200/80 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-full md:w-auto">
                    {(
                      [
                        { id: 'todas', label: 'Todos' },
                        { id: 'ativas', label: 'Ativas' },
                        { id: 'degustacao', label: 'Teste grátis' },
                        { id: 'pendentes', label: 'Pendentes' },
                        { id: 'bloqueadas', label: 'Suspensas' }
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFiltroStatus(f.id)}
                        className={`h-7 px-3 rounded-lg text-xs font-medium tracking-tight transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                          filtroStatus === f.id
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GRID DE ESTABELECIMENTOS — MINIMALISTA, SOFISTICADO E COM EFEITO 3D */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {empresasFiltradas.map((emp) => {
                    const isBloqueada =
                      emp.status_assinatura === 'bloqueada' || emp.status_assinatura === 'inadimplente';
                    const isDegustacao = emp.status_assinatura === 'degustacao';
                    const isPendente = emp.status_assinatura === 'pendente';
                    const temSuperAdmin = empresaIdsComSuperAdmin.has(emp.id);
                    const qtdUsuarios = contagemUsuariosPorEmpresa[emp.id] || 0;

                    return (
                      <div
                        key={emp.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => abrirModalEdicao(emp)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            abrirModalEdicao(emp);
                          }
                        }}
                        className="group relative bg-linear-to-b from-white to-slate-50/40 px-4 py-3.5 rounded-3xl border border-slate-200/85 shadow-xs hover:shadow-lg hover:border-slate-300/90 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 flex flex-col justify-between gap-3 cursor-pointer select-none"
                      >
                        {/* Cabeçalho Minimalista: Emoji + Nome + Status */}
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-lg shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200 ${
                                temSuperAdmin
                                  ? 'bg-linear-to-b from-fuchsia-50 to-white border-fuchsia-200/80'
                                  : 'bg-linear-to-b from-white to-slate-100/80 border-slate-200/80'
                              }`}
                            >
                              <span role="img" aria-label="Estabelecimento">
                                {temSuperAdmin ? '👑' : isBloqueada ? '🔒' : isDegustacao ? '✨' : '🏖️'}
                              </span>
                            </div>

                            <div className="min-w-0">
                              <h3 className="text-sm font-medium text-slate-900 group-hover:text-fuchsia-950 tracking-tight truncate transition-colors">
                                {emp.nome_fantasia}
                              </h3>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                                {temSuperAdmin ? (
                                  <span className="text-fuchsia-700 font-medium">
                                    Workspace Oficial · Super Admin
                                  </span>
                                ) : (
                                  <span>{emp.nome_exibicao || 'Toque para ver dados e licença'}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shadow-2xs ${
                              isBloqueada
                                ? 'bg-rose-50/90 text-rose-700 border-rose-200/70'
                                : isPendente
                                  ? 'bg-slate-100/90 text-slate-600 border-slate-200/80'
                                  : isDegustacao
                                    ? 'bg-amber-50/90 text-amber-700 border-amber-200/70'
                                    : 'bg-emerald-50/90 text-emerald-700 border-emerald-200/70'
                            }`}
                          >
                            <span role="img" aria-hidden="true" className="text-[10px] leading-none">
                              {isBloqueada ? '🔴' : isPendente ? '⏳' : isDegustacao ? '🎁' : '🟢'}
                            </span>
                            <span>
                              {isBloqueada
                                ? 'Suspenso'
                                : isPendente
                                  ? 'Pendente'
                                  : isDegustacao
                                    ? 'Teste'
                                    : 'Ativo'}
                            </span>
                          </span>
                        </div>

                        {/* Rodapé Minimalista: Indicador de Detalhes + Quick Actions 3D Compactas */}
                        <div className="pt-2.5 border-t border-slate-100/90 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-slate-700 transition-colors truncate">
                            <LucideIcons.SlidersHorizontal size={12} strokeWidth={1.9} />
                            <span>Detalhes e licença</span>
                            <LucideIcons.ChevronRight
                              size={12}
                              strokeWidth={2}
                              className="opacity-60 group-hover:translate-x-0.5 transition-transform"
                            />
                          </span>

                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => abrirModalEdicao(emp)}
                              className="h-7 px-2.5 rounded-xl bg-linear-to-b from-white to-slate-50 hover:from-slate-900 hover:to-slate-800 text-slate-600 hover:text-white border border-slate-200/90 hover:border-slate-900 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 flex items-center gap-1 text-[11px] font-medium cursor-pointer"
                              title="Editar dados e licença"
                            >
                              <LucideIcons.PencilLine size={12} strokeWidth={2} />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirEmpresa(emp)}
                              className="h-7 px-2 rounded-xl bg-linear-to-b from-white to-slate-50 hover:from-white hover:to-white text-slate-500 hover:text-slate-900 border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 flex items-center justify-center gap-1 text-[11px] font-medium cursor-pointer"
                              title="Equipe / Assumir identidade"
                            >
                              <LucideIcons.Users size={12} strokeWidth={2} />
                              {qtdUsuarios > 0 && (
                                <span className="text-[10px] tabular-nums text-slate-400">
                                  {qtdUsuarios}
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirModalClonarCardapio(emp)}
                              className="w-7 h-7 rounded-xl bg-linear-to-b from-white to-slate-50 hover:from-white hover:to-white text-slate-500 hover:text-fuchsia-700 border border-slate-200/90 hover:border-fuchsia-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer"
                              title="Clonar cardápio para este estabelecimento"
                            >
                              <LucideIcons.Copy size={12} strokeWidth={2} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleBloqueio(emp)}
                              className={`w-7 h-7 rounded-xl bg-linear-to-b from-white to-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer ${
                                isBloqueada
                                  ? 'text-emerald-600 hover:text-emerald-700 hover:border-emerald-200'
                                  : 'text-slate-500 hover:text-amber-600 hover:border-amber-200'
                              }`}
                              title={isBloqueada ? 'Liberar acesso' : 'Suspender acesso'}
                            >
                              {isBloqueada ? (
                                <LucideIcons.Unlock size={12} strokeWidth={2} />
                              ) : (
                                <LucideIcons.Lock size={12} strokeWidth={2} />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExcluirEmpresa(emp)}
                              className={`w-7 h-7 rounded-xl bg-linear-to-b from-white to-slate-50 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer ${
                                temSuperAdmin
                                  ? 'text-slate-300 hover:text-slate-400'
                                  : 'text-slate-400 hover:text-rose-600 hover:border-rose-200'
                              }`}
                              title={
                                temSuperAdmin
                                  ? 'Protegido (contém a conta Super Admin)'
                                  : 'Excluir estabelecimento'
                              }
                            >
                              {temSuperAdmin ? (
                                <LucideIcons.ShieldCheck size={12} strokeWidth={2} />
                              ) : (
                                <LucideIcons.Trash2 size={12} strokeWidth={2} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* VIEW NÍVEL 2: USUÁRIOS DO ESTABELECIMENTO SELECIONADO */
              <div className="animate-in fade-in duration-300">
                <button
                  type="button"
                  onClick={() => setEmpresaSelecionada(null)}
                  className="mb-4 h-8 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200/90 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <LucideIcons.ArrowLeft size={14} strokeWidth={2.2} />
                  <span>Voltar para Estabelecimentos</span>
                </button>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-medium text-slate-900 tracking-tight mb-0.5">
                      {empresaSelecionada.nome_fantasia}
                    </h2>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5">
                      <LucideIcons.Users size={13} className="text-fuchsia-700" />
                      <span>Equipe vinculada e acesso rápido (Impersonation)</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalNovoUsuario(true)}
                    className="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm shadow-slate-900/15 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <LucideIcons.UserPlus size={14} strokeWidth={2} />
                    <span>Novo usuário</span>
                  </button>
                </div>

                {loadingUsuarios ? (
                  <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-fuchsia-800 rounded-full animate-spin" />
                  </div>
                ) : usuariosDaEmpresa.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-xs">
                    <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <LucideIcons.Users size={20} strokeWidth={1.8} />
                    </div>
                    <h3 className="text-sm font-medium text-slate-800 mb-1">
                      Nenhum usuário vinculado a este estabelecimento
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                      Adicione um administrador ou garçom para liberar o acesso operacional desta equipe.
                    </p>
                    <button
                      type="button"
                      onClick={() => setModalNovoUsuario(true)}
                      className="h-8 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <LucideIcons.UserPlus size={13} />
                      <span>Adicionar primeiro usuário</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {usuariosDaEmpresa.map((u) => (
                      <div
                        key={u.id}
                        className="group bg-linear-to-b from-white to-slate-50/40 p-4 rounded-3xl border border-slate-200/85 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <AvatarUsuario
                              avatar={u.avatar}
                              nome={u.nome}
                              className="w-10 h-10 bg-linear-to-b from-white to-slate-100/80 rounded-2xl border border-slate-200/80 shadow-2xs shrink-0"
                              emojiClassName="text-lg"
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-slate-900 truncate">
                                {u.nome}
                              </h4>
                              <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${
                              u.cargo === 'super_admin'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200/80'
                                : u.cargo === 'admin'
                                  ? 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200/80'
                                  : 'bg-slate-100 text-slate-700 border-slate-200/80'
                            }`}
                          >
                            {u.cargo === 'super_admin'
                              ? 'Super Admin'
                              : u.cargo === 'admin'
                                ? 'Admin'
                                : 'Garçom'}
                          </span>
                        </div>

                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              u.status === 'bloqueado'
                                ? 'bg-rose-50 text-rose-700 border-rose-200/70'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200/70'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.status === 'bloqueado' ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                            />
                            {u.status === 'bloqueado' ? 'Bloqueado' : 'Ativo'}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => entrarComoUsuario(u)}
                              className="h-7 px-2.5 rounded-xl bg-slate-900 hover:bg-fuchsia-800 text-white text-[11px] font-medium shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              title="Assumir identidade deste usuário"
                            >
                              <LucideIcons.KeyRound size={12} strokeWidth={2} />
                              <span>Acessar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => abrirModalEditUsuario(u)}
                              className="w-7 h-7 rounded-xl bg-linear-to-b from-white to-slate-50 hover:from-white hover:to-white text-slate-500 hover:text-slate-900 border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                              title="Editar usuário"
                            >
                              <LucideIcons.UserCog size={12} strokeWidth={2} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleExcluirUsuario(u)}
                              className="w-7 h-7 rounded-xl bg-linear-to-b from-white to-slate-50 hover:from-rose-50 hover:to-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200/90 hover:border-rose-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                              title="Remover usuário"
                            >
                              <LucideIcons.Trash2 size={12} strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* =====================================================================
            ABA 2: CONTROLE DE PLANOS, PREÇOS E PROMOÇÕES ("ASSINATURA PREMIUM")
        ===================================================================== */}
        {abaAtiva === 'planos' && (
          <form onSubmit={handleSalvarConfiguracoesSaaS} className="space-y-6 animate-in fade-in duration-300">
            {/* Cabeçalho da Aba de Planos */}
            <div className="bg-white p-6 rounded-4xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fuchsia-800 mb-1">
                  <LucideIcons.Crown size={14} />
                  Motor Comercial de Planos
                </span>
                <h2 className="text-lg sm:text-xl font-medium text-slate-900 tracking-tight">
                  Preços, Ciclos & Promoções da Assinatura
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Altere os valores mensais, descontos progressivos e textos exibidos na tela de contratação.
                </p>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setModalConfirmacao({
                      aberto: true,
                      titulo: 'Restaurar Configurações?',
                      descricao: 'Deseja restaurar todos os planos, ciclos e preços para as configurações originais de fábrica?',
                      textoConfirmar: 'Restaurar Padrão',
                      tipo: 'aviso',
                      iconePersonalizado: <LucideIcons.RotateCcw size={22} strokeWidth={2.2} />,
                      onConfirmar: () => {
                        fecharConfirmacao();
                        setConfigSaaS(CONFIGURACAO_SAAS_PADRAO);
                        mostrarToast('Planos e ciclos restaurados para os padrões!', 'sucesso');
                      }
                    });
                  }}
                  className="h-11 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all active:scale-95 cursor-pointer"
                >
                  Restaurar Padrão
                </button>
                <button
                  type="submit"
                  disabled={salvandoConfig}
                  className="flex-1 sm:flex-initial h-11 px-5 rounded-2xl bg-slate-900 hover:bg-fuchsia-800 text-white text-xs font-medium shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {salvandoConfig ? (
                    <LucideIcons.Loader2 size={16} className="animate-spin" />
                  ) : (
                    <LucideIcons.Save size={16} />
                  )}
                  <span>Salvar Planos e Preços</span>
                </button>
              </div>
            </div>

            {/* Banner de Promoção Global */}
            <div className="bg-white p-6 rounded-4xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 tracking-tight flex items-center gap-2">
                    <LucideIcons.Sparkles size={17} className="text-fuchsia-800" />
                    <span>Campanha / Banner de Promoção no Topo</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Quando ativado, exibe uma faixa de destaque acima dos cards de planos em `/assinatura-pendente`.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setConfigSaaS((prev) => ({ ...prev, promocaoAtiva: !prev.promocaoAtiva }))
                  }
                  className={`h-10 px-4 rounded-2xl text-xs font-medium   flex items-center gap-2 transition-all cursor-pointer ${
                    configSaaS.promocaoAtiva
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <LucideIcons.Power size={14} />
                  <span>{configSaaS.promocaoAtiva ? 'Promoção Ativa' : 'Promoção Desativada'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Nome do Plano Principal
                  </label>
                  <input
                    type="text"
                    value={configSaaS.planoNome}
                    onChange={(e) => setConfigSaaS((prev) => ({ ...prev, planoNome: e.target.value }))}
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Selo de Topo (Badge)
                  </label>
                  <input
                    type="text"
                    value={configSaaS.planoBadgeTopo}
                    onChange={(e) =>
                      setConfigSaaS((prev) => ({ ...prev, planoBadgeTopo: e.target.value }))
                    }
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Texto do Banner de Promoção
                  </label>
                  <input
                    type="text"
                    value={configSaaS.promocaoTextoBanner}
                    onChange={(e) =>
                      setConfigSaaS((prev) => ({ ...prev, promocaoTextoBanner: e.target.value }))
                    }
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 pl-1">
                  Subtítulo / Descrição Comercial do Plano
                </label>
                <input
                  type="text"
                  value={configSaaS.planoSubtitulo}
                  onChange={(e) =>
                    setConfigSaaS((prev) => ({ ...prev, planoSubtitulo: e.target.value }))
                  }
                  className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                />
              </div>
            </div>

            {/* CARDS DE EDIÇÃO DOS 4 CICLOS: MENSAL, TRIMESTRAL, SEMESTRAL E ANUAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {LISTA_CICLOS_IDS.map((cicloId) => {
                const ciclo = configSaaS.ciclos[cicloId];
                return (
                  <div
                    key={ciclo.id}
                    className={`bg-white p-5 rounded-4xl border transition-all flex flex-col justify-between ${
                      ciclo.ativo ? 'border-slate-200/90 shadow-xs' : 'border-slate-200/50 opacity-60'
                    }`}
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-xs font-medium text-slate-400 block">
                            Ciclo {ciclo.meses} {ciclo.meses === 1 ? 'Mês' : 'Meses'}
                          </span>
                          <h4 className="text-base font-medium text-slate-900">
                            {ciclo.nome}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => atualizarCicloGlobal(ciclo.id, 'ativo', !ciclo.ativo)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-medium  cursor-pointer ${
                            ciclo.ativo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {ciclo.ativo ? 'Visível' : 'Oculto'}
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">
                          Valor Mensal Equivalente (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={ciclo.valorMensalEquivalente}
                          onChange={(e) =>
                            atualizarCicloGlobal(
                              ciclo.id,
                              'valorMensalEquivalente',
                              Number(e.target.value)
                            )
                          }
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-medium text-slate-900 tabular-nums focus:bg-white focus:border-slate-900 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">
                          Valor Total Cobrado no Checkout (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={ciclo.valorTotalCiclo}
                          onChange={(e) =>
                            atualizarCicloGlobal(ciclo.id, 'valorTotalCiclo', Number(e.target.value))
                          }
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-medium text-fuchsia-900 tabular-nums focus:bg-white focus:border-slate-900 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">
                            Desconto (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="90"
                            value={ciclo.descontoPercentual}
                            onChange={(e) =>
                              atualizarCicloGlobal(
                                ciclo.id,
                                'descontoPercentual',
                                Number(e.target.value)
                              )
                            }
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-900 tabular-nums focus:bg-white focus:border-slate-900 outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">
                            Dias Vigência
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={ciclo.diasVigencia}
                            onChange={(e) =>
                              atualizarCicloGlobal(ciclo.id, 'diasVigencia', Number(e.target.value))
                            }
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-900 tabular-nums focus:bg-white focus:border-slate-900 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">
                          Selo de Destaque (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Mais Escolhido"
                          value={ciclo.destaqueBadge}
                          onChange={(e) =>
                            atualizarCicloGlobal(ciclo.id, 'destaqueBadge', e.target.value)
                          }
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">
                          Legenda do Ciclo
                        </label>
                        <input
                          type="text"
                          value={ciclo.periodicidadeLabel}
                          onChange={(e) =>
                            atualizarCicloGlobal(ciclo.id, 'periodicidadeLabel', e.target.value)
                          }
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-medium text-slate-700 focus:bg-white focus:border-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* LISTA DE BENEFÍCIOS INCLUSOS NO PLANO */}
            <div className="bg-white p-6 rounded-4xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-medium text-slate-900 tracking-tight flex items-center gap-2">
                <LucideIcons.CheckCircle2 size={17} className="text-emerald-600" />
                <span>Itens e Benefícios Exibidos no Card do Plano</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {configSaaS.recursosPlano.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const copia = [...configSaaS.recursosPlano];
                        copia[index] = e.target.value;
                        setConfigSaaS((prev) => ({ ...prev, recursosPlano: copia }));
                      }}
                      className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setConfigSaaS((prev) => ({
                          ...prev,
                          recursosPlano: prev.recursosPlano.filter((_, i) => i !== index)
                        }));
                      }}
                      className="w-10 h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 cursor-pointer"
                      title="Remover benefício"
                    >
                      <LucideIcons.Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={novoRecursoTexto}
                  onChange={(e) => setNovoRecursoTexto(e.target.value)}
                  placeholder="Adicionar novo benefício ao plano..."
                  className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-3.5 text-xs font-medium text-slate-800 focus:bg-white focus:border-slate-900 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!novoRecursoTexto.trim()) return;
                    setConfigSaaS((prev) => ({
                      ...prev,
                      recursosPlano: [...prev.recursosPlano, novoRecursoTexto.trim()]
                    }));
                    setNovoRecursoTexto('');
                  }}
                  className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <LucideIcons.Plus size={15} />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* =====================================================================
            ABA 3: INTEGRAÇÃO MERCADO PAGO REAL & TEXTOS DO SISTEMA (CMS)
        ===================================================================== */}
        {abaAtiva === 'mercadopago_cms' && (
          <form onSubmit={handleSalvarConfiguracoesSaaS} className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-4xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 mb-1">
                  <LucideIcons.ShieldCheck size={14} />
                  Checkout Oficial & Textos
                </span>
                <h2 className="text-lg sm:text-xl font-medium text-slate-900 tracking-tight">
                  Integração Mercado Pago & Textos do Sistema
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Configure seu Access Token do Mercado Pago para abrir o checkout real (PIX e Cartão) com os valores que você definir.
                </p>
              </div>

              <button
                type="submit"
                disabled={salvandoConfig}
                className="w-full sm:w-auto h-11 px-5 rounded-2xl bg-slate-900 hover:bg-fuchsia-800 text-white text-xs font-medium shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {salvandoConfig ? (
                  <LucideIcons.Loader2 size={16} className="animate-spin" />
                ) : (
                  <LucideIcons.Save size={16} />
                )}
                <span>Salvar Configurações</span>
              </button>
            </div>

            {/* SEÇÃO 1: CREDENCIAL OFICIAL DO MERCADO PAGO */}
            <div className="bg-white p-6 rounded-4xl border border-slate-200/80 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm font-medium text-slate-900 tracking-tight flex items-center gap-2">
                  <LucideIcons.CreditCard size={18} className="text-fuchsia-800" />
                  <span>1. Checkout Pro Automático do Mercado Pago (PIX e Cartão)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                  Ao colar seu <strong>Access Token</strong> abaixo (obtido em{' '}
                  <a
                    href="https://www.mercadopago.com.br/developers/panel/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fuchsia-800 underline font-medium"
                  >
                    Mercado Pago Developers → Suas aplicações → Credenciais
                  </a>
                  ), o botão <strong>"Ir para o Checkout Mercado Pago"</strong> gera automaticamente a cobrança real com o valor exato do ciclo ou do preço personalizado do cliente.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
                  <label className="text-xs font-medium text-slate-600 block">
                    Novo Access Token do Mercado Pago (armazenado com segurança apenas no servidor)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {statusIntegracaoMP && (
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-lg border ${
                          statusIntegracaoMP.configured
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-amber-700 bg-amber-50 border-amber-200'
                        }`}
                      >
                        <LucideIcons.ShieldCheck size={13} />
                        {statusIntegracaoMP.configured
                          ? `Ativo (${statusIntegracaoMP.maskedPreview || statusIntegracaoMP.source})`
                          : 'Não configurado no servidor'}
                      </span>
                    )}
                    {ehPublicKeyMercadoPago(novoTokenMP) && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                        <LucideIcons.AlertTriangle size={13} />
                        Isso é uma Public Key! Copie o 2º campo (Access Token)
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type={mostrarTokenMP ? 'text' : 'password'}
                      value={novoTokenMP}
                      onChange={(e) => setNovoTokenMP(e.target.value)}
                      placeholder={
                        statusIntegracaoMP?.configured
                          ? `Token ativo: ${statusIntegracaoMP.maskedPreview || '••••'} (cole apenas para substituir)`
                          : 'APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000'
                      }
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 text-base sm:text-xs font-mono text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarTokenMP((prev) => !prev)}
                      className="absolute inset-y-1.5 right-2 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {mostrarTokenMP ? <LucideIcons.EyeOff size={16} /> : <LucideIcons.Eye size={16} />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestarConexaoMercadoPago}
                    disabled={testandoMP}
                    className="h-11 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
                  >
                    {testandoMP ? (
                      <LucideIcons.Loader2 size={15} className="animate-spin" />
                    ) : (
                      <LucideIcons.PlugZap size={15} />
                    )}
                    <span>
                      {novoTokenMP.trim() ? 'Salvar e Testar Token' : 'Testar Conexão Servidor'}
                    </span>
                  </button>
                </div>

                {statusTesteMP && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2 ${
                      statusTesteMP.ok
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {statusTesteMP.ok ? (
                      <LucideIcons.CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    ) : (
                      <LucideIcons.AlertCircle size={16} className="text-rose-600 shrink-0" />
                    )}
                    <span>{statusTesteMP.msg}</span>
                  </div>
                )}
              </div>

              {/* URL do Webhook para copiar com 1 clique */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600">
                    URL de Webhook Oficial (Para colar em Notificações Webhooks no Mercado Pago):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(urlWebhookOficial);
                      mostrarToast('URL do Webhook copiada!', 'sucesso');
                    }}
                    className="px-3 py-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LucideIcons.Copy size={13} />
                    <span>Copiar URL</span>
                  </button>
                </div>
                <p className="text-xs font-mono text-slate-700 break-all">{urlWebhookOficial}</p>
              </div>

              {/* Links diretos opcionais por ciclo */}
              <div className="pt-2">
                <span className="text-xs font-medium text-slate-500 block mb-3">
                  Links Diretos de Pagamento por Ciclo (Opcional — usado apenas se não preencher o Access Token acima):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {LISTA_CICLOS_IDS.map((cid) => (
                    <div key={cid} className="space-y-1">
                      <label className="text-xs font-medium text-slate-600 pl-1">
                        Link Checkout {configSaaS.ciclos[cid].nome}
                      </label>
                      <input
                        type="url"
                        placeholder="https://mpago.la/..."
                        value={configSaaS.ciclos[cid].linkCheckoutDireto}
                        onChange={(e) =>
                          atualizarCicloGlobal(cid, 'linkCheckoutDireto', e.target.value)
                        }
                        className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-800 focus:bg-white focus:border-slate-900 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: TEXTOS DO SISTEMA E WHATSAPP COMERCIAL */}
            <div className="bg-white p-6 rounded-4xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-medium text-slate-900 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3">
                <LucideIcons.Type size={18} className="text-fuchsia-800" />
                <span>2. Personalização de Textos & WhatsApp de Atendimento</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Nome do Sistema
                  </label>
                  <input
                    type="text"
                    value={configSaaS.nomeSistema}
                    onChange={(e) =>
                      setConfigSaaS((prev) => ({ ...prev, nomeSistema: e.target.value }))
                    }
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    WhatsApp de Suporte (&quot;Obtenha Suporte&quot; no Admin + Comercial)
                  </label>
                  <input
                    type="text"
                    value={configSaaS.whatsappSuporte}
                    onChange={(e) =>
                      setConfigSaaS((prev) => ({ ...prev, whatsappSuporte: e.target.value }))
                    }
                    placeholder="5585999999999"
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 tabular-nums focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Título na Tela de Login
                  </label>
                  <input
                    type="text"
                    value={configSaaS.subtituloLogin}
                    onChange={(e) =>
                      setConfigSaaS((prev) => ({ ...prev, subtituloLogin: e.target.value }))
                    }
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Texto do Botão de Solicitar 7 Dias Grátis (Página de Planos)
                  </label>
                  <input
                    type="text"
                    value={configSaaS.textoBotaoTesteGratis}
                    onChange={(e) =>
                      setConfigSaaS((prev) => ({ ...prev, textoBotaoTesteGratis: e.target.value }))
                    }
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Texto do Link de Assinatura (Rodapé do Login)
                  </label>
                  <input
                    type="text"
                    value={configSaaS.textoBotaoCadastroLogin}
                    onChange={(e) =>
                      setConfigSaaS((prev) => ({
                        ...prev,
                        textoBotaoCadastroLogin: e.target.value
                      }))
                    }
                    className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* =====================================================================
            ABA 4: PAINEL FINANCEIRO EXECUTIVO · T-SYSTEM BEACH
        ===================================================================== */}
        {abaAtiva === 'financeiro' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Cabeçalho do Painel Financeiro */}
            <div className="bg-white p-5 sm:p-6 rounded-4xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 mb-1">
                  <LucideIcons.ShieldCheck size={14} />
                  Controle Executivo & Faturamento
                </span>
                <h2 className="text-lg sm:text-xl font-medium text-slate-900 tracking-tight">
                  Financeiro · T-System Beach
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Panorama completo de receita recorrente (MRR), contratos por ciclo e saúde de pagamento dos clientes.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAbaAtiva('planos')}
                  className="flex-1 sm:flex-initial h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium border border-slate-200/70 shadow-2xs hover:shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <LucideIcons.Crown size={14} className="text-amber-600" />
                  <span>Ajustar Preços</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAbaAtiva('mercadopago_cms')}
                  className="flex-1 sm:flex-initial h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium border border-slate-200/70 shadow-2xs hover:shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <LucideIcons.CreditCard size={14} className="text-sky-600" />
                  <span>Mercado Pago</span>
                </button>
                <button
                  type="button"
                  onClick={handleAtualizarDadosMenu}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 shadow-2xs hover:shadow-xs active:scale-95 transition-all flex items-center justify-center cursor-pointer shrink-0"
                  title="Atualizar dados do banco"
                >
                  <LucideIcons.RefreshCw size={14} />
                </button>
              </div>
            </div>

            {/* CARDS DE KPIS FINANCEIROS (ESTILO FINTECH) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: MRR */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium truncate">Receita Mensal (MRR)</span>
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                    <LucideIcons.DollarSign size={16} strokeWidth={2.3} />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums truncate">
                  R$ {formatarMoedaBR(mrrEstimado)}
                </h3>
                <span className="text-[11px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                  <LucideIcons.CheckCircle2 size={12} />
                  {ativasEmDia} {ativasEmDia === 1 ? 'cliente ativo' : 'clientes ativos'}
                </span>
              </div>

              {/* Card 2: ARR Estimado */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium truncate">ARR Anual Projetado</span>
                  <div className="w-8 h-8 bg-sky-50 text-sky-700 rounded-xl flex items-center justify-center shrink-0">
                    <LucideIcons.TrendingUp size={16} strokeWidth={2.3} />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums truncate">
                  R$ {formatarMoedaBR(mrrEstimado * 12)}
                </h3>
                <span className="text-[11px] text-slate-400 mt-1.5 font-normal truncate">
                  Projeção 12 meses
                </span>
              </div>

              {/* Card 3: Ticket Médio */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium truncate">Ticket Médio / Cliente</span>
                  <div className="w-8 h-8 bg-fuchsia-50 text-fuchsia-700 rounded-xl flex items-center justify-center shrink-0">
                    <LucideIcons.PiggyBank size={16} strokeWidth={2.3} />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums truncate">
                  R$ {formatarMoedaBR(ativasEmDia > 0 ? mrrEstimado / ativasEmDia : 0)}
                </h3>
                <span className="text-[11px] text-slate-400 mt-1.5 font-normal truncate">
                  Média por assinatura
                </span>
              </div>

              {/* Card 4: Em Atenção / Inadimplência */}
              <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400 font-medium truncate">Receita em Risco</span>
                  <div className="w-8 h-8 bg-rose-50 text-rose-700 rounded-xl flex items-center justify-center shrink-0">
                    <LucideIcons.AlertTriangle size={16} strokeWidth={2.3} />
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight tabular-nums truncate">
                  R$ {formatarMoedaBR(receitaEmRisco)}
                </h3>
                <span className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                  <LucideIcons.Lock size={12} />
                  {empresasEmRisco.length} {empresasEmRisco.length === 1 ? 'cliente requer atenção' : 'clientes requerem atenção'}
                </span>
              </div>
            </div>

            {/* DISTRIBUIÇÃO POR CICLO DE FATURAMENTO */}
            <div className="bg-white p-5 sm:p-6 rounded-4xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                    Distribuição por Ciclo de Contrato
                  </h3>
                  <p className="text-xs text-slate-400">
                    Volume de clientes e receita mensal proporcional em cada ciclo de cobrança
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LISTA_CICLOS_IDS.map((cId) => {
                  const cfgCiclo = configSaaS.ciclos[cId];
                  const qtd = empresas.filter((e) => (e.ciclo_cobranca || 'mensal') === cId).length;
                  const receitaCiclo = empresas
                    .filter((e) => (e.ciclo_cobranca || 'mensal') === cId && e.status_assinatura === 'ativa')
                    .reduce((acc, curr) => acc + (curr.valor_mensalidade ?? cfgCiclo.valorMensalEquivalente), 0);

                  return (
                    <div
                      key={cId}
                      className="bg-slate-50/80 border border-slate-200/70 rounded-2xl p-3.5 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                          {cfgCiclo.nome}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-[10px] font-medium text-slate-600">
                          {qtd} {qtd === 1 ? 'cliente' : 'clientes'}
                        </span>
                      </div>
                      <p className="text-base font-semibold text-slate-900 tracking-tight">
                        R$ {formatarMoedaBR(receitaCiclo)}
                        <span className="text-[10px] font-normal text-slate-400">/mês</span>
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Valor tabela: R$ {formatarMoedaBR(cfgCiclo.valorTotalCiclo)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TABELA DE CONTROLE FINANCEIRO DOS CLIENTES */}
            <div className="bg-white p-5 sm:p-6 rounded-4xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                    Gestão de Mensalidades por Estabelecimento
                  </h3>
                  <p className="text-xs text-slate-400">
                    Acompanhe datas de vencimento, ciclos e status de cobrança de cada cliente
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <LucideIcons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou CPF/CNPJ..."
                      value={buscaFinanceiro}
                      onChange={(e) => setBuscaFinanceiro(e.target.value)}
                      className="h-8 pl-8 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all w-48 sm:w-60"
                    />
                  </div>

                  <select
                    value={filtroFinanceiro}
                    onChange={(e) => setFiltroFinanceiro(e.target.value)}
                    className="h-8 px-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-slate-900 transition-all cursor-pointer"
                  >
                    <option value="todos">Todos os status</option>
                    <option value="ativa">Ativos</option>
                    <option value="degustacao">Em Teste</option>
                    <option value="pendente">Pendentes</option>
                    <option value="bloqueada">Suspensos</option>
                  </select>
                </div>
              </div>

              {/* Grid de Cards de Estabelecimentos Financeiros */}
              <div className="space-y-2.5">
                {empresasFinanceiroFiltradas.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <LucideIcons.ReceiptText size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium text-slate-500">Nenhum estabelecimento encontrado com os filtros atuais.</p>
                  </div>
                ) : (
                  empresasFinanceiroFiltradas.map((emp) => {
                    const diasRestantes = emp.data_vencimento ? calcularDiasRestantes(emp.data_vencimento) : null;
                    const cicloId = (emp.ciclo_cobranca as IdCicloCobranca) || 'mensal';
                    const valorMensal = typeof emp.valor_mensalidade === 'number'
                      ? emp.valor_mensalidade
                      : (configSaaS.ciclos[cicloId]?.valorMensalEquivalente ?? configSaaS.ciclos.mensal.valorMensalEquivalente);

                    const statusAssinatura = emp.status_assinatura || 'ativa';
                    const isBloqueado = statusAssinatura === 'bloqueada' || statusAssinatura === 'inadimplente';

                    return (
                      <div
                        key={emp.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 hover:bg-white border border-slate-200/70 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 text-lg">
                            🏢
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {emp.nome_fantasia}
                              </p>
                              {emp.nome_exibicao && (
                                <span className="text-[11px] text-slate-400 font-normal truncate hidden sm:inline">
                                  ({emp.nome_exibicao})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span className="capitalize">{cicloId}</span>
                              <span className="text-slate-300">·</span>
                              <span className="font-medium text-slate-800">
                                R$ {formatarMoedaBR(valorMensal)}/mês
                              </span>
                              {emp.documento && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span className="font-mono text-[11px] text-slate-400">
                                    {formatarCpfCnpj(emp.documento)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                          <div className="text-left sm:text-right">
                            <p className="text-[11px] text-slate-400">Vencimento</p>
                            <p className="text-xs font-medium text-slate-800">
                              {emp.data_vencimento ? emp.data_vencimento.split('T')[0].split('-').reverse().join('/') : 'Sem data'}
                            </p>
                            {diasRestantes !== null && (
                              <span
                                className={`text-[10px] font-semibold ${
                                  diasRestantes < 0
                                    ? 'text-rose-600'
                                    : diasRestantes <= 5
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {diasRestantes < 0
                                  ? `Vencido há ${Math.abs(diasRestantes)} dias`
                                  : diasRestantes === 0
                                  ? 'Vence hoje'
                                  : `${diasRestantes} dias restantes`}
                              </span>
                            )}
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                              isBloqueado
                                ? 'bg-rose-100 text-rose-800'
                                : statusAssinatura === 'degustacao'
                                ? 'bg-amber-100 text-amber-800'
                                : statusAssinatura === 'pendente'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isBloqueado
                              ? 'Suspenso'
                              : statusAssinatura === 'degustacao'
                              ? 'Degustação'
                              : statusAssinatura === 'pendente'
                              ? 'Pendente'
                              : 'Ativo'}
                          </span>

                          <button
                            type="button"
                            onClick={() => abrirModalEdicao(emp)}
                            className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs hover:shadow-xs active:scale-95 transition-all text-xs font-medium cursor-pointer"
                          >
                            Editar
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =======================================================================
          MODAL 1: EDITAR CONTA DE USUÁRIO
      ======================================================================= */}
      {usuarioEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-4xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-medium text-slate-900 tracking-tight flex items-center gap-2">
                  <LucideIcons.UserCog size={18} className="text-fuchsia-800" />
                  <span>Editar Conta do Usuário</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Altere permissões e dados do colaborador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioEdicao(null)}
                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <LucideIcons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoUsuario} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 pl-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={editUserNome}
                  onChange={(e) => setEditUserNome(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 pl-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Cargo
                  </label>
                  {ehUsuarioSuperAdmin(usuarioEdicao) ? (
                    <div className="w-full bg-indigo-50 border border-indigo-200 text-indigo-800 h-11 px-3 rounded-2xl flex items-center gap-1.5 text-xs font-medium">
                      <LucideIcons.ShieldCheck size={15} className="shrink-0" />
                      <span>Super Admin</span>
                    </div>
                  ) : (
                    <select
                      value={editUserCargo === 'admin' ? 'admin' : 'garcom'}
                      onChange={(e) => setEditUserCargo(e.target.value as 'admin' | 'garcom')}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-xs font-medium"
                    >
                      <option value="admin">Admin</option>
                      <option value="garcom">Garçom</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Status
                  </label>
                  <select
                    value={editUserStatus}
                    onChange={(e) => setEditUserStatus(e.target.value as 'ativo' | 'bloqueado')}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-xs font-medium"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingEditUser}
                className="w-full h-11 mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingEditUser ? (
                  <LucideIcons.Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Salvar Alterações</span>
                    <LucideIcons.Check size={17} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 2: CRIAR NOVO USUÁRIO PARA O ESTABELECIMENTO
      ======================================================================= */}
      {modalNovoUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-4xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-medium text-slate-900 tracking-tight flex items-center gap-2">
                  <LucideIcons.UserPlus size={18} className="text-fuchsia-800" />
                  <span>Cadastrar Novo Usuário</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Vinculado a {empresaSelecionada?.nome_fantasia}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoUsuario(false)}
                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <LucideIcons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleCriarNovoUsuarioEmpresa} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 pl-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={novoUserNome}
                  onChange={(e) => setNovoUserNome(e.target.value)}
                  required
                  placeholder="Ex: João da Silva"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 pl-1">
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  value={novoUserEmail}
                  onChange={(e) => setNovoUserEmail(e.target.value)}
                  required
                  placeholder="joao@estabelecimento.com"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Senha Inicial
                  </label>
                  <input
                    type="password"
                    value={novoUserSenha}
                    onChange={(e) => setNovoUserSenha(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Cargo
                  </label>
                  <select
                    value={novoUserCargo}
                    onChange={(e) => setNovoUserCargo(e.target.value as 'admin' | 'garcom')}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-xs font-medium"
                  >
                    <option value="garcom">Garçom</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingCreateUser}
                className="w-full h-11 mt-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingCreateUser ? (
                  <LucideIcons.Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Criar Usuário</span>
                    <LucideIcons.Check size={17} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 3: EDIÇÃO COMPLETA DO CLIENTE (DADOS CADASTRAIS + LICENÇA)
      ======================================================================= */}
      {empresaEdicao && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200 font-sans"
          onClick={() => !loadingEdicao && setEmpresaEdicao(null)}
        >
          <div
            className="bg-white border border-slate-200/80 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 max-h-screen overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
                  <LucideIcons.Store size={18} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-medium text-slate-900 tracking-tight truncate">
                    {empresaEdicao.nome_fantasia}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">Editar estabelecimento</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmpresaEdicao(null)}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <LucideIcons.X size={15} />
              </button>
            </div>

            {/* Abas segmentadas */}
            <div className="px-6">
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                {(
                  [
                    { id: 'dados', label: 'Dados cadastrais', icone: LucideIcons.IdCard },
                    { id: 'licenca', label: 'Licença', icone: LucideIcons.CalendarClock }
                  ] as const
                ).map((aba) => (
                  <button
                    key={aba.id}
                    type="button"
                    onClick={() => setAbaEdicaoEmpresa(aba.id)}
                    className={`h-8 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      abaEdicaoEmpresa === aba.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <aba.icone size={14} />
                    <span>{aba.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSalvarEdicaoEmpresa} className="px-6 pt-5 pb-6 space-y-4">
              {abaEdicaoEmpresa === 'dados' ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 pl-0.5">Nome do estabelecimento</label>
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        required
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 pl-0.5">Nome de exibição</label>
                      <input
                        type="text"
                        value={editNomeExibicao}
                        maxLength={40}
                        onChange={(e) => setEditNomeExibicao(e.target.value)}
                        placeholder="System Beach"
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 pl-0.5">CPF / CNPJ</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editDocumento}
                        onChange={(e) => setEditDocumento(formatarCpfCnpj(e.target.value))}
                        placeholder="000.000.000-00"
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-0.5">
                        <label className="text-xs font-medium text-slate-600">Telefone / WhatsApp</label>
                        {extrairDigitos(editTelefone).length >= 10 && (
                          <a
                            href={`https://wa.me/55${extrairDigitos(editTelefone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>Abrir WhatsApp</span>
                            <LucideIcons.ArrowUpRight size={11} />
                          </a>
                        )}
                      </div>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={editTelefone}
                        onChange={(e) => setEditTelefone(formatarTelefoneBR(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 pl-0.5">E-mail de contato</label>
                    <div className="relative">
                      <LucideIcons.Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={editEmailContato}
                        onChange={(e) => setEditEmailContato(e.target.value)}
                        placeholder="contato@estabelecimento.com"
                        className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                      />
                    </div>
                    <p className="text-xs text-slate-400 pl-0.5">
                      E-mail comercial da empresa. O login dos usuários é editado na aba Equipe.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 pl-0.5">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => {
                          const novoSt = e.target.value;
                          setEditStatus(novoSt);
                          if (novoSt === 'degustacao') setEditMensalidade(0);
                        }}
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all cursor-pointer"
                      >
                        <option value="ativa">Ativa (paga)</option>
                        <option value="degustacao">Teste grátis</option>
                        <option value="pendente">Aguardando contratação</option>
                        <option value="bloqueada">Suspensa</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 pl-0.5">Modalidade</label>
                      <select
                        value={editCiclo}
                        onChange={(e) => {
                          const novoCiclo = e.target.value as IdCicloCobranca;
                          setEditCiclo(novoCiclo);
                          if (editStatus !== 'degustacao') {
                            setEditMensalidade(configSaaS.ciclos[novoCiclo].valorMensalEquivalente);
                          }
                        }}
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all cursor-pointer"
                      >
                        <option value="mensal">Mensal</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 pl-0.5">Valor mensal</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">R$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatarMoedaBR(editMensalidade)}
                          onChange={(e) => setEditMensalidade(converterDigitacaoEmMoeda(e.target.value))}
                          disabled={editStatus === 'degustacao'}
                          className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 tabular-nums text-right focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 pl-0.5">Vencimento</label>
                      <input
                        type="date"
                        value={editVencimento}
                        onChange={(e) => setEditVencimento(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 tabular-nums focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Resumo da vigência definido pela data de vencimento + modalidade */}
                  {(() => {
                    const dias = calcularDiasRestantes(editVencimento);
                    const totalCiclo = editMensalidade * (configSaaS.ciclos[editCiclo]?.meses || 1);
                    return (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-3">
                        <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
                          <LucideIcons.CalendarCheck2 size={15} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            {dias === null
                              ? 'Sem data de vencimento'
                              : dias < 0
                                ? `Vencida há ${Math.abs(dias)} dia(s)`
                                : dias === 0
                                  ? 'Vence hoje'
                                  : `${dias} dia(s) restantes`}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums shrink-0">
                          {editStatus === 'degustacao'
                            ? 'Isento'
                            : `R$ ${formatarMoedaBR(totalCiclo)} / ciclo`}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Faturas geradas para este estabelecimento */}
                  <div className="pt-3 border-t border-slate-200/80 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <LucideIcons.Receipt size={14} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-slate-800 truncate">
                            Faturas geradas do cliente
                          </h4>
                          <p className="text-xs text-slate-400">
                            {faturasClienteEdicao.length}{' '}
                            {faturasClienteEdicao.length === 1 ? 'fatura registrada' : 'faturas registradas'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => empresaEdicao && void carregarFaturasClienteEdicao(empresaEdicao.id)}
                        disabled={carregandoFaturasCliente}
                        className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Atualizar faturas"
                      >
                        <LucideIcons.RefreshCw
                          size={13}
                          className={carregandoFaturasCliente ? 'animate-spin' : ''}
                        />
                        <span>Atualizar</span>
                      </button>
                    </div>

                    {/* Filtros rápidos de status */}
                    {faturasClienteEdicao.length > 0 && (() => {
                      const qtdPagas = faturasClienteEdicao.filter((f) => f.status === 'paga').length;
                      const qtdAbertas = faturasClienteEdicao.filter((f) => f.status === 'pendente').length;
                      const qtdAtraso = faturasClienteEdicao.filter((f) => f.status === 'em_atraso').length;

                      const filtros: Array<{
                        id: 'todas' | 'paga' | 'pendente' | 'em_atraso';
                        label: string;
                        qtd: number;
                      }> = [
                        { id: 'todas', label: 'Todas', qtd: faturasClienteEdicao.length },
                        { id: 'paga', label: 'Pagas', qtd: qtdPagas },
                        { id: 'pendente', label: 'Em aberto', qtd: qtdAbertas },
                        { id: 'em_atraso', label: 'Em atraso', qtd: qtdAtraso }
                      ];

                      return (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {filtros.map((filtro) => (
                            <button
                              key={filtro.id}
                              type="button"
                              onClick={() => setFiltroStatusFaturaEdicao(filtro.id)}
                              className={`h-7 px-2.5 rounded-lg text-xs font-medium transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                filtroStatusFaturaEdicao === filtro.id
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                              }`}
                            >
                              <span>{filtro.label}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded-md text-xs tabular-nums ${
                                  filtroStatusFaturaEdicao === filtro.id
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white text-slate-500'
                                }`}
                              >
                                {filtro.qtd}
                              </span>
                            </button>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Lista de Faturas */}
                    {carregandoFaturasCliente ? (
                      <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <LucideIcons.Loader2 size={15} className="animate-spin" />
                        <span>Carregando faturas do cliente...</span>
                      </div>
                    ) : (() => {
                      const faturasFiltradas = faturasClienteEdicao.filter((f) =>
                        filtroStatusFaturaEdicao === 'todas' ? true : f.status === filtroStatusFaturaEdicao
                      );

                      if (faturasClienteEdicao.length === 0) {
                        return (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center space-y-1">
                            <p className="text-xs font-medium text-slate-600">
                              Nenhuma fatura gerada no banco para este cliente.
                            </p>
                            <p className="text-xs text-slate-400">
                              As faturas aparecem aqui assim que forem emitidas ou pagas via PIX.
                            </p>
                          </div>
                        );
                      }

                      if (faturasFiltradas.length === 0) {
                        return (
                          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-4 py-4 text-center text-xs text-slate-500">
                            Nenhuma fatura encontrada para o filtro selecionado.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {faturasFiltradas.map((fatura) => {
                            const ehPaga = fatura.status === 'paga';
                            const ehAtraso = fatura.status === 'em_atraso';
                            const ehCancelada = fatura.status === 'cancelada';

                            const badgeClasses = ehPaga
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ehAtraso
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : ehCancelada
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200';

                            const statusLabel = ehPaga
                              ? 'Paga'
                              : ehAtraso
                                ? 'Em atraso'
                                : ehCancelada
                                  ? 'Cancelada'
                                  : 'Em aberto';

                            const vencimentoFmt = new Date(fatura.dataVencimento).toLocaleDateString('pt-BR');
                            const pagamentoFmt = fatura.dataPagamento
                              ? new Date(fatura.dataPagamento).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : null;

                            const confirmandoEsta = confirmandoExclusaoFaturaId === fatura.id;
                            const excluindoEsta = excluindoFaturaId === fatura.id;

                            return (
                              <div
                                key={fatura.id}
                                className="rounded-xl border border-slate-200/80 bg-white p-3 space-y-2 shadow-xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${badgeClasses}`}
                                      >
                                        {ehPaga ? (
                                          <LucideIcons.CheckCircle2 size={12} />
                                        ) : ehAtraso ? (
                                          <LucideIcons.AlertTriangle size={12} />
                                        ) : (
                                          <LucideIcons.Clock size={12} />
                                        )}
                                        <span>{statusLabel}</span>
                                      </span>
                                      <span className="text-xs font-semibold text-slate-900 truncate">
                                        {fatura.competencia}
                                      </span>
                                      <span className="text-xs text-slate-400 font-mono truncate">
                                        {fatura.id}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                      <span>
                                        {fatura.planoNome} · {fatura.cicloNome}
                                      </span>
                                      <span className="tabular-nums">Venc.: {vencimentoFmt}</span>
                                    </div>

                                    {ehPaga && (
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-emerald-700 bg-emerald-50/70 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                                        <span className="inline-flex items-center gap-1 font-medium">
                                          <LucideIcons.BadgeCheck size={13} />
                                          {pagamentoFmt
                                            ? `Pago em ${pagamentoFmt}`
                                            : 'Pagamento confirmado'}
                                        </span>
                                        {fatura.formaPagamento && (
                                          <span className="text-emerald-600">{fatura.formaPagamento}</span>
                                        )}
                                        {fatura.paymentIdMp && (
                                          <span className="font-mono text-emerald-600">
                                            MP #{fatura.paymentIdMp}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                    <span className="text-sm font-semibold text-slate-900 tabular-nums">
                                      R$ {formatarMoedaBR(fatura.valor)}
                                    </span>

                                    {ehPaga ? (
                                      <span
                                        className="inline-flex items-center gap-1 text-xs text-slate-400"
                                        title="Faturas pagas não podem ser apagadas pelo painel, apenas diretamente no banco de dados."
                                      >
                                        <LucideIcons.Lock size={12} />
                                        <span>Protegida</span>
                                      </span>
                                    ) : confirmandoEsta ? (
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => void handleExcluirFaturaCliente(fatura)}
                                          disabled={excluindoEsta}
                                          className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                          {excluindoEsta ? (
                                            <LucideIcons.Loader2 size={12} className="animate-spin" />
                                          ) : (
                                            <LucideIcons.Trash2 size={12} />
                                          )}
                                          <span>Confirmar</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmandoExclusaoFaturaId(null)}
                                          disabled={excluindoEsta}
                                          className="h-7 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmandoExclusaoFaturaId(fatura.id)}
                                        className="h-7 px-2.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                                        title="Excluir fatura não paga"
                                      >
                                        <LucideIcons.Trash2 size={12} />
                                        <span>Excluir</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {erroEdicaoEmpresa && (
                <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
                  <LucideIcons.AlertCircle size={15} className="shrink-0 mt-px" />
                  <span>{erroEdicaoEmpresa}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEmpresaEdicao(null)}
                  className="h-9 px-4 mt-3 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingEdicao}
                  className="h-9 px-4 mt-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm shadow-slate-900/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {loadingEdicao ? (
                    <LucideIcons.Loader2 size={14} className="animate-spin" />
                  ) : (
                    <LucideIcons.Check size={14} />
                  )}
                  <span>Salvar alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL 4: CRIAR NOVO ESTABELECIMENTO PELO SUPER ADMIN
      ======================================================================= */}
      {modalNovoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-4xl w-full max-w-md p-6 sm:p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-5 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-medium text-slate-900 tracking-tight flex items-center gap-2">
                  <LucideIcons.Rocket size={18} className="text-fuchsia-800" />
                  <span>Criar Novo Estabelecimento</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Cadastre o cliente e escolha se ele iniciará com 7 dias grátis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !loadingCriacao && setModalNovoCliente(false)}
                className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <LucideIcons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleCriarClienteMaster} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 pl-1">
                  Nome do Estabelecimento
                </label>
                <input
                  type="text"
                  value={novoNomeEmpresa}
                  onChange={(e) => setNovoNomeEmpresa(e.target.value)}
                  required
                  placeholder="Ex: Barraca Coral Beach"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 pl-1">
                  Nome do Responsável
                </label>
                <input
                  type="text"
                  value={novoNomeAdmin}
                  onChange={(e) => setNovoNomeAdmin(e.target.value)}
                  required
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500 pl-1">
                  E-mail de Login
                </label>
                <input
                  type="email"
                  value={novoEmailAdmin}
                  onChange={(e) => setNovoEmailAdmin(e.target.value)}
                  required
                  placeholder="admin@barracacoral.com"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Senha Inicial
                  </label>
                  <input
                    type="password"
                    value={novaSenhaAdmin}
                    onChange={(e) => setNovaSenhaAdmin(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-4 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500 pl-1">
                    Modalidade Inicial
                  </label>
                  <select
                    value={novoModalidadeInicial}
                    onChange={(e) =>
                      setNovoModalidadeInicial(
                        e.target.value as 'degustacao' | 'ativa' | 'pendente'
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 h-11 px-3 rounded-2xl focus:border-slate-900 focus:bg-white outline-none text-xs font-medium"
                  >
                    <option value="degustacao">🎁 7 Dias Grátis (Trial)</option>
                    <option value="ativa">🟢 Ativa (+30 Dias)</option>
                    <option value="pendente">⏳ Aguardando Pagamento</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loadingCriacao}
                className="w-full h-12 mt-4 bg-slate-900 hover:bg-fuchsia-800 text-white rounded-2xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {loadingCriacao ? (
                  <LucideIcons.Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <span>Criar Estabelecimento</span>
                    <LucideIcons.Sparkles size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CLONADOR INTELIGENTE DE CARDÁPIO (SAAS MULTI-TENANT)
      ===================================================================== */}
      {modalClonarCardapio && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 font-sans">
          <div className="bg-white rounded-4xl p-6 sm:p-7 w-full max-w-xl shadow-2xl border border-slate-100 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start gap-3 mb-5">
              <div>
                <h3 className="text-base font-medium text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-fuchsia-50 text-fuchsia-800 flex items-center justify-center shrink-0">
                    <LucideIcons.Copy size={16} strokeWidth={2.2} />
                  </div>
                  <span>Clonador Inteligente de Cardápio</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Copie categorias, subcategorias, preços, custos e fotos entre estabelecimentos em lote.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !executandoClone && setModalClonarCardapio(false)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer shrink-0"
              >
                <LucideIcons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecutarClonagemCardapio} className="space-y-4">
              {/* SELEÇÃO DE ORIGEM E DESTINO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-3xl border border-slate-200/80">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 pl-1">
                    <LucideIcons.UploadCloud size={14} className="text-fuchsia-800" />
                    <span>Copiar de (Origem)</span>
                  </label>
                  <select
                    value={empresaOrigemCloneId}
                    onChange={(e) => {
                      const novoId = e.target.value;
                      setEmpresaOrigemCloneId(novoId);
                      void carregarCardapioOrigem(novoId);
                    }}
                    required
                    className="w-full bg-white border border-slate-200 text-slate-900 h-11 px-3 rounded-2xl focus:border-slate-900 outline-none text-xs font-medium"
                  >
                    <option value="" disabled>
                      Selecione a origem...
                    </option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome_fantasia}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5 pl-1">
                    <LucideIcons.DownloadCloud size={14} className="text-emerald-600" />
                    <span>Enviar para (Destino)</span>
                  </label>
                  <select
                    value={empresaDestinoCloneId}
                    onChange={(e) => setEmpresaDestinoCloneId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 text-slate-900 h-11 px-3 rounded-2xl focus:border-slate-900 outline-none text-xs font-medium"
                  >
                    <option value="" disabled>
                      Selecione o destino...
                    </option>
                    {empresas
                      .filter((emp) => emp.id !== empresaOrigemCloneId)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome_fantasia}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* RESUMO EM TEMPO REAL DO CARDÁPIO DE ORIGEM */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <LucideIcons.Layers size={14} className="text-fuchsia-800" />
                    <span>Conteúdo do Cardápio de Origem</span>
                  </span>
                  {carregandoOrigemClone ? (
                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <LucideIcons.Loader2 size={13} className="animate-spin" />
                      Lendo cardápio...
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {categoriasOrigemClone.length} categorias
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-800">
                        {produtosOrigemClone.length} produtos
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        {produtosOrigemClone.filter((p) => Boolean(p.imagem_url)).length} com foto
                      </span>
                    </div>
                  )}
                </div>

                {!carregandoOrigemClone && categoriasOrigemClone.length === 0 ? (
                  <div className="py-4 text-center text-xs font-medium text-slate-400 bg-slate-50 rounded-2xl">
                    Nenhuma categoria ou produto cadastrado neste estabelecimento de origem.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-0.5">
                      <span>Selecione as categorias que deseja copiar:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const nomes = Array.from(
                            new Set([
                              ...categoriasOrigemClone.map((c) => c.nome),
                              ...produtosOrigemClone.map((p) => p.categoria).filter(Boolean)
                            ])
                          );
                          if (categoriasSelecionadasClone.length === nomes.length) {
                            setCategoriasSelecionadasClone([]);
                          } else {
                            setCategoriasSelecionadasClone(nomes);
                          }
                        }}
                        className="text-fuchsia-800 hover:underline font-medium cursor-pointer"
                      >
                        {categoriasSelecionadasClone.length === categoriasOrigemClone.length
                          ? 'Desmarcar todas'
                          : 'Selecionar todas'}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                      {categoriasOrigemClone.map((cat) => {
                        const selecionada = categoriasSelecionadasClone.includes(cat.nome);
                        const qtdProd = produtosOrigemClone.filter(
                          (p) => p.categoria.trim().toLowerCase() === cat.nome.trim().toLowerCase()
                        ).length;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => alternarCategoriaClone(cat.nome)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 border cursor-pointer ${
                              selecionada
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <LucideIcons.Check
                              size={12}
                              className={selecionada ? 'text-emerald-400' : 'opacity-30'}
                            />
                            <span>{cat.nome}</span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-md ${
                                selecionada ? 'bg-white/15 text-white' : 'bg-slate-200/70 text-slate-600'
                              }`}
                            >
                              {qtdProd}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* OPÇÕES AVANÇADAS DE CLONAGEM (MODO E ESTOQUE) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <LucideIcons.GitMerge size={14} className="text-slate-500" />
                    <span>Modo de Cópia</span>
                  </span>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setModoClone('mesclar')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${
                        modoClone === 'mesclar'
                          ? 'bg-white text-slate-900 border-slate-900 shadow-xs'
                          : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60'
                      }`}
                    >
                      <span>Mesclar (não duplica existentes)</span>
                      {modoClone === 'mesclar' && (
                        <LucideIcons.CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoClone('substituir')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${
                        modoClone === 'substituir'
                          ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-xs'
                          : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60'
                      }`}
                    >
                      <span>Substituir cardápio do destino</span>
                      {modoClone === 'substituir' && (
                        <LucideIcons.AlertTriangle size={14} className="text-rose-600 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                    <LucideIcons.PackageCheck size={14} className="text-slate-500" />
                    <span>Estoque Inicial dos Produtos</span>
                  </span>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setModoEstoqueClone('manter')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${
                        modoEstoqueClone === 'manter'
                          ? 'bg-white text-slate-900 border-slate-900 shadow-xs'
                          : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60'
                      }`}
                    >
                      <span>Manter mesmo estoque da origem</span>
                      {modoEstoqueClone === 'manter' && (
                        <LucideIcons.CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setModoEstoqueClone('zerar')}
                      className={`w-full px-3 py-2 rounded-xl text-left text-xs font-medium transition-all border flex items-center justify-between cursor-pointer ${
                        modoEstoqueClone === 'zerar'
                          ? 'bg-white text-slate-900 border-slate-900 shadow-xs'
                          : 'bg-transparent text-slate-500 border-transparent hover:bg-white/60'
                      }`}
                    >
                      <span>Iniciar estoque zerado (0 un)</span>
                      {modoEstoqueClone === 'zerar' && (
                        <LucideIcons.CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  executandoClone ||
                  carregandoOrigemClone ||
                  !empresaOrigemCloneId ||
                  !empresaDestinoCloneId ||
                  categoriasSelecionadasClone.length === 0
                }
                className="w-full h-12 mt-2 bg-slate-900 hover:bg-fuchsia-800 text-white rounded-2xl text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                {executandoClone ? (
                  <>
                    <LucideIcons.Loader2 size={17} className="animate-spin" />
                    <span>Clonando Categorias, Produtos e Fotos...</span>
                  </>
                ) : (
                  <>
                    <LucideIcons.CopyCheck size={16} />
                    <span>Clonar Cardápio Completo Agora</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO STANDARDIZADO */}
      <ModalConfirmacao
        aberto={modalConfirmacao.aberto}
        titulo={modalConfirmacao.titulo}
        descricao={modalConfirmacao.descricao}
        textoConfirmar={modalConfirmacao.textoConfirmar}
        textoCancelar={modalConfirmacao.textoCancelar}
        tipo={modalConfirmacao.tipo}
        iconePersonalizado={modalConfirmacao.iconePersonalizado}
        onConfirmar={modalConfirmacao.onConfirmar}
        onCancelar={fecharConfirmacao}
      />
    </div>
  );
}
