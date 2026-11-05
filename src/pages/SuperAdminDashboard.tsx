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
  requisitarApiMercadoPago,
  CONFIGURACAO_SAAS_PADRAO,
  type ConfiguracaoGlobalSaaS,
  type IdCicloCobranca
} from '../utils/configuracoesSaaS';
import { ModalConfirmacao, type TipoModalConfirmacao } from '../components/ModalConfirmacao';

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

interface RespostaUsuarioMP {
  id?: number;
  nickname?: string;
  email?: string;
  site_id?: string;
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

type AbaMaster = 'estabelecimentos' | 'planos' | 'mercadopago_cms';
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

export function SuperAdminDashboard() {
  const contexto = useContext(AppContext);
  const navigate = useNavigate();

  // Navegação Principal do Command Center
  const [abaAtiva, setAbaAtiva] = useState<AbaMaster>('estabelecimentos');
  const [empresas, setEmpresas] = useState<EmpresaMaster[]>([]);
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
  const [mostrarTokenMP, setMostrarTokenMP] = useState<boolean>(false);
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

  const carregarEmpresas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('*')
        .order('nome_fantasia', { ascending: true });
      if (error) throw error;
      if (data) setEmpresas(data as EmpresaMaster[]);
    } catch {
      mostrarToast('Falha ao carregar estabelecimentos.', 'erro');
    } finally {
      setLoading(false);
    }
  }, [mostrarToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void carregarEmpresas();
    }, 0);
    carregarConfiguracaoGlobalSaaS().then((cfg) => {
      setConfigSaaS(cfg);
    });
    return () => clearTimeout(timer);
  }, [carregarEmpresas]);

  // Carregar usuários do estabelecimento selecionado
  const abrirEmpresa = async (empresa: EmpresaMaster) => {
    setEmpresaSelecionada(empresa);
    setLoadingUsuarios(true);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresa.id)
        .order('cargo', { ascending: true });
      if (error) throw error;
      if (data) {
        setUsuariosDaEmpresa(
          (data as DBUsuario[]).map((u) => ({
            id: u.id,
            nome: u.nome,
            avatar: u.avatar,
            email: u.email,
            cargo: u.cargo,
            status: (u.status as 'ativo' | 'bloqueado') || 'ativo',
            empresaId: u.empresa_id
          }))
        );
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

  const EMAIL_SUPER_ADMIN_OFICIAL = 'ancorazero85@gmail.com';

  const executarExclusaoEmpresa = async (empresa: EmpresaMaster) => {
    try {
      await supabase.functions
        .invoke('admin-auth', {
          body: { action: 'deleteWorkspace', empresaId: empresa.id }
        })
        .catch(() => null);

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
    if (empresa.nome_fantasia.trim().toUpperCase() === 'T-SYSTEM BEACH OFICIAL') {
      mostrarToast(
        'Proteção ativa: O estabelecimento T-SYSTEM BEACH OFICIAL contém a conta Super Admin e não pode ser excluído.',
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
    if (
      usuario.cargo === 'super_admin' ||
      (usuario.email || '').trim().toLowerCase() === EMAIL_SUPER_ADMIN_OFICIAL
    ) {
      mostrarToast(
        'A conta Super Admin (ancorazero85@gmail.com) é protegida e não pode ser excluída.',
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
    const isSuperAdminOficial =
      (usuario.email || '').trim().toLowerCase() === EMAIL_SUPER_ADMIN_OFICIAL;
    setUsuarioEdicao(usuario);
    setEditUserNome(usuario.nome);
    setEditUserEmail(usuario.email || '');
    setEditUserCargo(
      isSuperAdminOficial
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

    const emailOriginal = (usuarioEdicao.email || '').trim().toLowerCase();
    const emailFinal = editUserEmail.trim().toLowerCase();
    const isSuperAdminOficial =
      emailOriginal === EMAIL_SUPER_ADMIN_OFICIAL || emailFinal === EMAIL_SUPER_ADMIN_OFICIAL;

    // Trava estrita: somente ancorazero85@gmail.com pode ter o cargo super_admin
    if (editUserCargo === 'super_admin' && !isSuperAdminOficial) {
      mostrarToast(
        'Segurança: Somente o usuário oficial (ancorazero85@gmail.com) pode ter o cargo Super Admin.',
        'erro'
      );
      return;
    }

    const cargoValidado: 'admin' | 'garcom' | 'super_admin' = isSuperAdminOficial
      ? 'super_admin'
      : editUserCargo === 'admin'
        ? 'admin'
        : 'garcom';

    setLoadingEditUser(true);
    try {
      const payload = {
        nome: editUserNome.trim(),
        email: isSuperAdminOficial ? EMAIL_SUPER_ADMIN_OFICIAL : emailFinal,
        cargo: cargoValidado,
        status: editUserStatus
      };

      const { error } = await supabase.from('usuarios').update(payload).eq('id', usuarioEdicao.id);
      if (error) throw error;

      await supabase.functions
        .invoke('admin-auth', {
          body: {
            userId: usuarioEdicao.id,
            newEmail: payload.email,
            status: editUserStatus
          }
        })
        .catch(() => null);

      setUsuariosDaEmpresa((prev) =>
        prev.map((u) =>
          u.id === usuarioEdicao.id
            ? {
                ...u,
                nome: payload.nome,
                email: payload.email,
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

  // Abrir Modal de Edição Completa do Cliente (Dados Cadastrais + Licença)
  const abrirModalEdicao = (empresa: EmpresaMaster) => {
    setEmpresaEdicao(empresa);
    setAbaEdicaoEmpresa('dados');
    setErroEdicaoEmpresa('');
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
    const token = configSaaS.mpAccessToken.trim();
    if (!token) {
      setStatusTesteMP({
        ok: false,
        msg: 'Insira o seu Access Token (2º campo em Credenciais do Mercado Pago) no campo acima para testar.'
      });
      return;
    }

    if (ehPublicKeyMercadoPago(token)) {
      setStatusTesteMP({
        ok: false,
        msg: 'Atenção: você colou a "Public Key" (1º campo curto em formato UUID). Volte no painel do Mercado Pago e copie o 2º campo chamado "Access Token" (ele fica logo abaixo da Public Key e é um código mais longo terminado em números).'
      });
      return;
    }

    setTestandoMP(true);
    setStatusTesteMP(null);
    try {
      const res = await requisitarApiMercadoPago('/users/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        setStatusTesteMP({
          ok: false,
          msg: 'Access Token inválido ou expirado. Certifique-se de copiar o 2º campo "Access Token" em Mercado Pago Developers → Credenciais.'
        });
        return;
      }

      const dadosConta = (await res.json()) as RespostaUsuarioMP;
      await salvarConfiguracaoGlobalSaaS({
        ...configSaaS,
        mpAccessToken: token
      });
      setStatusTesteMP({
        ok: true,
        msg: `Conectado e salvo com sucesso! Conta Mercado Pago: ${dadosConta.nickname || dadosConta.email || dadosConta.id}`
      });
    } catch {
      setStatusTesteMP({
        ok: false,
        msg: 'Não foi possível validar o token agora. Verifique se copiou o campo "Access Token" completo.'
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
    const empresaOficial = empresas.find(
      (e) => e.nome_fantasia.trim().toUpperCase() === 'T-SYSTEM BEACH OFICIAL'
    );

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

  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://edpubwaxpzwnqlyjscwk.supabase.co';
  const urlWebhookOficial = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/mercadopago-webhook`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-fuchsia-800 rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-500 animate-pulse">
          Carregando Command Center...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-100/70 text-slate-900 font-sans pb-24 relative overflow-x-hidden selection:bg-slate-900 selection:text-white">
      {/* TOAST FLUTUANTE */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300 px-4 w-full max-w-md">
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

      {/* HEADER SUPER ADMIN COMMAND CENTER */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-linear-to-br from-fuchsia-600 to-fuchsia-900 text-white rounded-xl flex items-center justify-center shadow-md shadow-fuchsia-900/20 shrink-0">
                <LucideIcons.ShieldCheck size={18} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-medium text-slate-900 tracking-tight leading-none mb-1 truncate">
                  Command Center
                </h1>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {configSaaS.nomeSistema} · Super Admin
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSair}
              className="sm:hidden w-10 h-10 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer"
              title="Sair"
            >
              <LucideIcons.LogOut size={18} strokeWidth={2.3} />
            </button>
          </div>

          {/* Navegação por Abas (Quick Actions) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => {
                setAbaAtiva('estabelecimentos');
                setEmpresaSelecionada(null);
              }}
              className={`flex-1 sm:flex-initial h-8 px-3.5 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                abaAtiva === 'estabelecimentos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LucideIcons.Building2 size={14} />
              <span>Estabelecimentos</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('planos')}
              className={`flex-1 sm:flex-initial h-8 px-3.5 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                abaAtiva === 'planos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LucideIcons.Crown size={14} />
              <span className="sm:inline hidden">Planos & Promoções</span>
              <span className="sm:hidden">Planos & Preços</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva('mercadopago_cms')}
              className={`flex-1 sm:flex-initial h-8 px-3.5 rounded-xl text-xs font-medium tracking-tight transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                abaAtiva === 'mercadopago_cms'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LucideIcons.CreditCard size={14} />
              <span className="sm:inline hidden">Mercado Pago & Textos</span>
              <span className="sm:hidden">Mercado Pago</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => abrirModalClonarCardapio()}
              className="h-8 px-3 rounded-lg bg-white text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Clonar categorias, produtos e fotos entre estabelecimentos"
            >
              <LucideIcons.Copy size={14} className="text-fuchsia-700" />
              <span>Clonar cardápio</span>
            </button>
            <button
              type="button"
              onClick={() => setModalNovoCliente(true)}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm shadow-slate-900/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LucideIcons.Plus size={14} />
              <span>Novo cliente</span>
            </button>
            <button
              type="button"
              onClick={handleSair}
              className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:text-rose-600 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
              title="Encerrar Sessão"
            >
              <LucideIcons.LogOut size={14} />
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
                {/* Botões Mobile para Novo Estabelecimento e Clonagem */}
                <div className="sm:hidden mb-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => abrirModalClonarCardapio()}
                    className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 h-10 px-3 rounded-2xl text-xs font-medium shadow-xs active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LucideIcons.Copy size={14} className="text-fuchsia-700" />
                    <span>Clonar Cardápio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalNovoCliente(true)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 px-3 rounded-2xl text-xs font-medium shadow-md shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LucideIcons.Plus size={15} strokeWidth={2.3} />
                    <span>Novo Cliente</span>
                  </button>
                </div>

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

                {/* GRID DE ESTABELECIMENTOS COM QUICK ACTIONS E EFEITO 3D */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {empresasFiltradas.map((emp) => {
                    const isBloqueada =
                      emp.status_assinatura === 'bloqueada' || emp.status_assinatura === 'inadimplente';
                    const isDegustacao = emp.status_assinatura === 'degustacao';
                    const isPendente = emp.status_assinatura === 'pendente';
                    const valorMensalCliente =
                      typeof emp.valor_mensalidade === 'number'
                        ? emp.valor_mensalidade
                        : configSaaS.ciclos.mensal.valorMensalEquivalente;
                    const cicloCliente = configSaaS.ciclos[(emp.ciclo_cobranca as IdCicloCobranca) || 'mensal']?.id || 'mensal';
                    const diasLicenca = calcularDiasRestantes(emp.data_vencimento || '');

                    return (
                      <div
                        key={emp.id}
                        className="group bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-3 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-center text-slate-500 shrink-0 group-hover:text-fuchsia-700 group-hover:border-fuchsia-200 transition-colors">
                                <LucideIcons.Store size={18} strokeWidth={1.8} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-sm font-medium text-slate-900 tracking-tight truncate">
                                  {emp.nome_fantasia}
                                </h3>
                                <p className="text-xs text-slate-400 truncate">
                                  {emp.nome_exibicao || emp.email_contato || 'Sem identidade personalizada'}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                isBloqueada
                                  ? 'bg-rose-50 text-rose-700'
                                  : isPendente
                                    ? 'bg-slate-100 text-slate-600'
                                    : isDegustacao
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isBloqueada
                                    ? 'bg-rose-500'
                                    : isPendente
                                      ? 'bg-slate-400'
                                      : isDegustacao
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                }`}
                              />
                              {isBloqueada ? 'Suspenso' : isPendente ? 'Pendente' : isDegustacao ? 'Teste' : 'Ativo'}
                            </span>
                          </div>

                          <dl className="space-y-2 text-xs mb-1">
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-slate-400 flex items-center gap-1.5">
                                <LucideIcons.CalendarDays size={13} />
                                Vencimento
                              </dt>
                              <dd className="text-slate-700 tabular-nums">
                                {emp.data_vencimento
                                  ? new Date(emp.data_vencimento).toLocaleDateString('pt-BR')
                                  : '—'}
                                {diasLicenca !== null && (
                                  <span className={`ml-1.5 ${diasLicenca < 0 ? 'text-rose-500' : diasLicenca <= 7 ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {diasLicenca < 0 ? 'vencida' : `${diasLicenca}d`}
                                  </span>
                                )}
                              </dd>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-slate-400 flex items-center gap-1.5">
                                <LucideIcons.Wallet size={13} />
                                Mensalidade
                              </dt>
                              <dd className="text-slate-700 tabular-nums">
                                {isDegustacao
                                  ? 'Isento'
                                  : `R$ ${formatarMoedaBR(valorMensalCliente)}`}
                                <span className="ml-1.5 text-slate-400 capitalize">{cicloCliente}</span>
                              </dd>
                            </div>

                            {emp.documento && (
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-slate-400 flex items-center gap-1.5">
                                  <LucideIcons.FileCheck2 size={13} />
                                  CPF/CNPJ
                                </dt>
                                <dd className="text-slate-700 tabular-nums">{formatarCpfCnpj(emp.documento)}</dd>
                              </div>
                            )}

                            {emp.telefone && (
                              <div className="flex items-center justify-between gap-3">
                                <dt className="text-slate-400 flex items-center gap-1.5">
                                  <LucideIcons.Phone size={13} />
                                  WhatsApp
                                </dt>
                                <dd>
                                  <a
                                    href={`https://wa.me/55${emp.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-700 hover:underline tabular-nums inline-flex items-center gap-1"
                                  >
                                    <span>{formatarTelefoneBR(emp.telefone)}</span>
                                    <LucideIcons.ArrowUpRight size={12} />
                                  </a>
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {/* Quick Actions do Estabelecimento */}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirModalEdicao(emp)}
                            className="flex-1 h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm shadow-slate-900/20 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <LucideIcons.PencilLine size={13} />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => abrirEmpresa(emp)}
                            className="w-8 h-8 rounded-lg bg-white text-slate-500 hover:text-slate-900 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
                            title="Equipe / Assumir identidade"
                          >
                            <LucideIcons.Users size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => abrirModalClonarCardapio(emp)}
                            className="w-8 h-8 rounded-lg bg-white text-slate-500 hover:text-fuchsia-700 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
                            title="Clonar cardápio para este estabelecimento"
                          >
                            <LucideIcons.Copy size={14} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleBloqueio(emp)}
                            className={`w-8 h-8 rounded-lg bg-white border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                              isBloqueada ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-500 hover:text-amber-600'
                            }`}
                            title={isBloqueada ? 'Liberar acesso' : 'Suspender acesso'}
                          >
                            {isBloqueada ? <LucideIcons.Unlock size={14} /> : <LucideIcons.Lock size={14} />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExcluirEmpresa(emp)}
                            className="w-8 h-8 rounded-lg bg-white text-slate-400 hover:text-rose-600 hover:border-rose-200 border border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
                            title="Excluir estabelecimento"
                          >
                            <LucideIcons.Trash2 size={14} />
                          </button>
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
                  className="mb-5 flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors bg-white px-4 py-2.5 rounded-2xl shadow-xs border border-slate-200 active:scale-95 cursor-pointer"
                >
                  <LucideIcons.ArrowLeft size={15} strokeWidth={2.5} />
                  <span>Voltar para Estabelecimentos</span>
                </button>

                <div className="bg-white p-6 rounded-4xl border border-slate-200/80 shadow-xs mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-medium text-slate-900 tracking-tight mb-1">
                      {empresaSelecionada.nome_fantasia}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                      <LucideIcons.Users size={15} className="text-fuchsia-800" />
                      <span>Gestão de Contas e Acesso Rápido (Impersonation)</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalNovoUsuario(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-4 rounded-2xl text-xs font-medium transition-all active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <LucideIcons.UserPlus size={15} strokeWidth={2.3} />
                    <span>Adicionar Usuário</span>
                  </button>
                </div>

                {loadingUsuarios ? (
                  <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-fuchsia-800 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {usuariosDaEmpresa.map((u) => (
                      <div
                        key={u.id}
                        className="bg-white p-6 rounded-4xl border border-slate-200/80 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-center text-xl shrink-0">
                                {u.avatar}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-medium text-slate-900 truncate">
                                  {u.nome}
                                </h4>
                                <p className="text-xs font-medium text-slate-500 truncate">{u.email}</p>
                              </div>
                            </div>

                            <span
                              className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium   shrink-0 ${
                                u.cargo === 'super_admin'
                                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                  : u.cargo === 'admin'
                                    ? 'bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.cargo === 'super_admin'
                                ? 'Super Admin'
                                : u.cargo === 'admin'
                                  ? 'Admin'
                                  : 'Garçom'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mb-5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium   border ${
                                u.status === 'bloqueado'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.status === 'bloqueado' ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                              />
                              {u.status === 'bloqueado' ? 'Bloqueado' : 'Ativo'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => entrarComoUsuario(u)}
                            className="w-full h-10 bg-slate-900 hover:bg-fuchsia-800 text-white rounded-2xl text-xs font-medium transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <LucideIcons.KeyRound size={15} strokeWidth={2.3} />
                            <span>Assumir Identidade</span>
                          </button>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => abrirModalEditUsuario(u)}
                              className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <LucideIcons.UserCog size={14} />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExcluirUsuario(u)}
                              className="h-9 px-3 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl text-xs font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
                            >
                              <LucideIcons.Trash2 size={14} />
                              <span>Excluir</span>
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

              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 pl-1">
                  <label className="text-xs font-medium text-slate-600 block">
                    Access Token do Mercado Pago (2º campo em Credenciais — NÃO é a Public Key)
                  </label>
                  {ehPublicKeyMercadoPago(configSaaS.mpAccessToken) && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
                      <LucideIcons.AlertTriangle size={13} />
                      Isso é uma Public Key! Copie o 2º campo (Access Token)
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type={mostrarTokenMP ? 'text' : 'password'}
                      value={configSaaS.mpAccessToken}
                      onChange={(e) =>
                        setConfigSaaS((prev) => ({ ...prev, mpAccessToken: e.target.value }))
                      }
                      placeholder="APP_USR-0000000000000000-000000-00000000000000000000000000000000-000000000"
                      className="w-full h-11 bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-11 text-xs font-mono text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
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
                    <span>Testar Conexão Mercado Pago</span>
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
                  {(usuarioEdicao.email || '').trim().toLowerCase() === EMAIL_SUPER_ADMIN_OFICIAL ? (
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
            className="bg-white border border-slate-200/80 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg shadow-2xl animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 max-h-screen overflow-y-auto"
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
                      <label className="text-xs font-medium text-slate-600 pl-0.5">Telefone / WhatsApp</label>
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

      {/* MODAL DE CONFIRMAÇÃO STANDARDIZADO (PADRÃO IFOOD / CLEAN COM CANTOS 3XL) */}
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
