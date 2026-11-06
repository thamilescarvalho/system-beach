// src/context/AppProvider.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { AppContext } from './AppContext';
import type { EmpresaSaaS } from './AppContext';
import type {
  Mesa,
  ItemComanda,
  VendaFechada,
  Garcom,
  Produto,
  MovimentacaoEstoque,
  Pagamento,
  Categoria,
  PagamentoGarcom,
  NovoPagamentoGarcom,
  CategoriaPagamentoGarcom,
  StatusPagamentoGarcom,
  MetaFinanceira,
  NovaMetaFinanceira,
  CargoUsuario,
  StatusUsuario
} from '../types';

interface DBMesa {
  id: number;
  numero: number;
  status: 'livre' | 'ocupada';
  garcom_id?: string;
  garcom_nome?: string;
  nome_cliente?: string;
  itens?: ItemComanda[];
  empresa_id?: string;
}

interface DBProduto {
  id: number;
  nome: string;
  categoria: string;
  subcategoria?: string;
  imagem_url?: string;
  preco: number;
  preco_custo: number;
  estoque?: number;
  ativo: boolean;
  empresa_id?: string;
}

interface DBVenda {
  id: string;
  numero_mesa: number;
  total: number;
  pagamentos?: Pagamento[];
  itens?: ItemComanda[];
  garcom_nome: string;
  nome_cliente?: string;
  status: string;
  data_fechamento: string;
  cancelado_por?: string;
  motivo_cancelamento?: string;
  data_cancelamento?: string;
  empresa_id?: string;
}

interface DBUsuario {
  id: string;
  nome: string;
  avatar: string;
  cargo: CargoUsuario;
  email?: string;
  status?: StatusUsuario;
  empresa_id?: string;
}

interface DBHistorico {
  id: string;
  produto_id: number;
  produto_nome: string;
  tipo: string;
  quantidade: number;
  preco_custo: number;
  usuario_nome: string;
  data: string;
  empresa_id?: string;
}

interface DBCategoria {
  id: number;
  nome: string;
  icone: string;
  ativo: boolean;
  ordem: number;
  empresa_id?: string;
}

interface DBPagamentoGarcomRow {
  id: string;
  garcom_id: string;
  garcom_nome: string;
  valor: number;
  data_pagamento: string;
  descricao: string;
  categoria: string;
  status: string;
}

const IMPERSONATION_STORAGE_KEY = 'tsystem_impersonated_user_id';

function mapearUsuarioDB(perfil: DBUsuario): Garcom {
  return {
    id: perfil.id,
    nome: perfil.nome,
    avatar: perfil.avatar,
    cargo: perfil.cargo,
    email: perfil.email || '',
    status: perfil.status || 'ativo',
    empresaId: perfil.empresa_id
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [dadosEmpresa, setDadosEmpresa] = useState<EmpresaSaaS | null | undefined>(undefined);
  const [carregandoContexto, setCarregandoContexto] = useState<boolean>(true);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [historicoVendas, setHistoricoVendas] = useState<VendaFechada[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [historicoEstoque, setHistoricoEstoque] = useState<MovimentacaoEstoque[]>([]);
  const [usuarios, setUsuarios] = useState<Garcom[]>([]);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<PagamentoGarcom[]>([]);
  const [metaAtiva, setMetaAtiva] = useState<MetaFinanceira | null>(null);
  const [garcomLogado, setGarcomLogadoState] = useState<Garcom | null>(null);

  const realtimeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFluxoConfirmacaoEmailRef = useRef<boolean>(
    typeof window !== 'undefined' &&
      (window.location.hash.includes('type=signup') ||
        window.location.hash.includes('access_token=') ||
        window.location.search.includes('confirmado=sucesso') ||
        window.location.search.includes('token_hash='))
  );

  const obterEmpresaId = useCallback((): string | undefined => {
    return garcomLogado?.empresaId;
  }, [garcomLogado?.empresaId]);

  // Busca o perfil em public.usuarios ou provisiona automaticamente caso o usuário tenha acabado de confirmar o e-mail de cadastro
  const obterOuProvisionarPerfil = useCallback(async (
    userId: string,
    emailUsuario?: string,
    metadata?: Record<string, unknown>
  ): Promise<DBUsuario | null> => {
    let { data: perfil } = await supabase
      .from('usuarios')
      .select('id, nome, avatar, cargo, empresa_id, email, status')
      .eq('id', userId)
      .maybeSingle();

    if (!perfil && emailUsuario) {
      const resPorEmail = await supabase
        .from('usuarios')
        .select('id, nome, avatar, cargo, empresa_id, email, status')
        .eq('email', emailUsuario.trim().toLowerCase())
        .maybeSingle();
      perfil = resPorEmail.data;
    }

    if (!perfil && metadata) {
      const nomeEmpresa = typeof metadata.nome_empresa === 'string' ? metadata.nome_empresa : undefined;
      const nomeUsuario = typeof metadata.nome_usuario === 'string' ? metadata.nome_usuario : undefined;
      const documento = typeof metadata.documento === 'string' ? metadata.documento : null;
      const telefone = typeof metadata.telefone === 'string' ? metadata.telefone : null;
      const emailLimpo = (emailUsuario || '').trim().toLowerCase();

      if (nomeEmpresa && nomeUsuario) {
        const { error: rpcError } = await supabase.rpc('criar_workspace_onboarding', {
          p_nome_empresa: nomeEmpresa,
          p_nome_usuario: nomeUsuario,
          p_email: emailLimpo,
          p_documento: documento,
          p_telefone: telefone
        });

        if (rpcError) {
          const { data: novaEmpresa } = await supabase
            .from('empresas')
            .insert([{
              nome_fantasia: nomeEmpresa,
              documento,
              telefone,
              status_assinatura: 'pendente',
              data_vencimento: null
            }])
            .select('id')
            .single();

          if (novaEmpresa) {
            await supabase.from('usuarios').insert([{
              id: userId,
              nome: nomeUsuario,
              email: emailLimpo,
              telefone,
              cargo: 'admin',
              status: 'ativo',
              avatar: '👑',
              empresa_id: novaEmpresa.id
            }]);
          }
        }

        const resNovoPerfil = await supabase
          .from('usuarios')
          .select('id, nome, avatar, cargo, empresa_id, email, status')
          .eq('id', userId)
          .maybeSingle();
        perfil = resNovoPerfil.data;
      }
    }

    // Se o perfil acabou de ser provisionado via auto-atendimento (/cadastro), garante que a empresa inicie como 'pendente'
    if (perfil?.empresa_id && metadata?.requer_plano_inicial === true) {
      await supabase
        .from('empresas')
        .update({
          status_assinatura: 'pendente',
          data_vencimento: null
        })
        .eq('id', perfil.empresa_id);

      await supabase.auth.updateUser({
        data: { requer_plano_inicial: false }
      }).catch(() => null);
    }

    return (perfil as DBUsuario | null) ?? null;
  }, []);

  const carregarENormalizarEmpresa = useCallback(async (
    empresaId: string,
    metadata?: Record<string, unknown>
  ): Promise<EmpresaSaaS | null> => {
    const { data: rawEmpresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .limit(1)
      .maybeSingle();

    if (!rawEmpresa) return null;

    const statusAtual = String(rawEmpresa.status_assinatura || 'pendente');
    const valorMensal = Number(rawEmpresa.valor_mensalidade ?? 149.90);
    const veioDeAutoAtendimentoSemTrialSuperAdmin = metadata?.requer_plano_inicial === true;

    if (veioDeAutoAtendimentoSemTrialSuperAdmin) {
      await supabase
        .from('empresas')
        .update({
          status_assinatura: 'pendente',
          data_vencimento: null
        })
        .eq('id', empresaId);

      await supabase.auth.updateUser({
        data: { requer_plano_inicial: false }
      }).catch(() => null);

      return {
        id: String(rawEmpresa.id),
        nome_fantasia: String(rawEmpresa.nome_fantasia || ''),
        status_assinatura: 'pendente',
        data_vencimento: '',
        valor_mensalidade: valorMensal,
        plano_nome: String(rawEmpresa.plano_nome || 'Assinatura Premium'),
        ciclo_cobranca: String(rawEmpresa.ciclo_cobranca || 'semestral'),
        documento: String(rawEmpresa.documento || ''),
        telefone: String(rawEmpresa.telefone || ''),
        nome_exibicao: String(rawEmpresa.nome_exibicao || ''),
        email_contato: String(rawEmpresa.email_contato || '')
      };
    }

    return {
      id: String(rawEmpresa.id),
      nome_fantasia: String(rawEmpresa.nome_fantasia || ''),
      status_assinatura: statusAtual,
      data_vencimento: String(rawEmpresa.data_vencimento || ''),
      valor_mensalidade: valorMensal,
      plano_nome: String(rawEmpresa.plano_nome || 'Assinatura Premium'),
      ciclo_cobranca: String(rawEmpresa.ciclo_cobranca || 'semestral'),
      documento: String(rawEmpresa.documento || ''),
      telefone: String(rawEmpresa.telefone || ''),
      nome_exibicao: String(rawEmpresa.nome_exibicao || ''),
      email_contato: String(rawEmpresa.email_contato || '')
    };
  }, []);

  const sincronizarSessaoSegura = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.location.search.includes('token_hash=')) {
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        if (tokenHash) {
          await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup'
          }).catch(() => null);
        }
      }

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        if (isFluxoConfirmacaoEmailRef.current) {
          sessionStorage.setItem('tsystem_email_confirmado_aviso', 'true');
        }
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        localStorage.removeItem('coral_device_session');
        setGarcomLogadoState(null);
        setCarregandoContexto(false);
        return;
      }

      if (isFluxoConfirmacaoEmailRef.current) {
        isFluxoConfirmacaoEmailRef.current = false;
        sessionStorage.setItem('tsystem_email_confirmado_aviso', 'true');
        if (session.user.email) {
          localStorage.setItem('tsystem_saved_email', session.user.email.trim().toLowerCase());
        }
        const perfilConfirmado = await obterOuProvisionarPerfil(
          session.user.id,
          session.user.email,
          session.user.user_metadata
        );
        if (perfilConfirmado?.empresa_id) {
          await carregarENormalizarEmpresa(perfilConfirmado.empresa_id, session.user.user_metadata);
        }
        await supabase.auth.signOut();
        setGarcomLogadoState(null);
        setCarregandoContexto(false);
        return;
      }

      // Se o usuário desmarcou "Manter conectado" e fechou o navegador, encerra a sessão ao reabrir
      if (localStorage.getItem('tsystem_remember_me') === 'false' && !sessionStorage.getItem('tsystem_active_tab_session')) {
        await supabase.auth.signOut();
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        setGarcomLogadoState(null);
        setCarregandoContexto(false);
        return;
      }
      sessionStorage.setItem('tsystem_active_tab_session', 'true');

      const perfilReal = await obterOuProvisionarPerfil(
        session.user.id,
        session.user.email,
        session.user.user_metadata
      );

      if (!perfilReal || perfilReal.status === 'bloqueado') {
        await supabase.auth.signOut();
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        setGarcomLogadoState(null);
        setCarregandoContexto(false);
        return;
      }

      const impersonatedUserId = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (perfilReal.cargo === 'super_admin' && impersonatedUserId) {
        const { data: perfilImpersonado } = await supabase
          .from('usuarios')
          .select('id, nome, avatar, cargo, empresa_id, email, status')
          .eq('id', impersonatedUserId)
          .maybeSingle();

        if (perfilImpersonado) {
          const usuarioImpersonado = mapearUsuarioDB(perfilImpersonado as DBUsuario);
          if (usuarioImpersonado.empresaId) {
            const empresaImp = await carregarENormalizarEmpresa(usuarioImpersonado.empresaId);
            setDadosEmpresa(empresaImp);
          } else {
            setCarregandoContexto(false);
          }
          setGarcomLogadoState(usuarioImpersonado);
          return;
        }
      }

      const usuarioMapeado = mapearUsuarioDB(perfilReal);
      if (usuarioMapeado.empresaId) {
        const empresaValidada = await carregarENormalizarEmpresa(
          usuarioMapeado.empresaId,
          session.user.user_metadata
        );
        setDadosEmpresa(empresaValidada);
      } else {
        setCarregandoContexto(false);
      }
      setGarcomLogadoState(usuarioMapeado);
    } catch {
      setGarcomLogadoState(null);
      setCarregandoContexto(false);
    }
  }, [carregarENormalizarEmpresa, obterOuProvisionarPerfil]);

  useEffect(() => {
    localStorage.removeItem('coral_device_session');
    const inicializacaoSessao = setTimeout(() => {
      void sincronizarSessaoSegura();
    }, 0);

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        setGarcomLogadoState(null);
        setDadosEmpresa(null);
        setCarregandoContexto(false);
      } else if (event === 'SIGNED_IN' && isFluxoConfirmacaoEmailRef.current) {
        void sincronizarSessaoSegura();
      }
    });

    return () => {
      clearTimeout(inicializacaoSessao);
      authListener.subscription.unsubscribe();
    };
  }, [sincronizarSessaoSegura]);

  const setGarcomLogado = useCallback((garcom: Garcom | null) => {
    if (!garcom) {
      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
      localStorage.removeItem('coral_device_session');
      void supabase.auth.signOut();
      setGarcomLogadoState(null);
      setCarregandoContexto(false);
      return;
    }

    if (garcomLogado?.cargo === 'super_admin' && garcom.id !== garcomLogado.id) {
      sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, garcom.id);
    }
    if (garcom.empresaId && garcom.empresaId !== garcomLogado?.empresaId) {
      setCarregandoContexto(true);
    }
    setGarcomLogadoState(garcom);
  }, [garcomLogado]);

  const registrarAuditoria = async (acao: string, entidade: string, detalhes: string) => {
    const eid = obterEmpresaId();
    if (!eid || !garcomLogado?.id) return;

    await supabase.from('auditoria_logs').insert([{
      empresa_id: eid,
      usuario_id: garcomLogado.id,
      usuario_nome: garcomLogado.nome,
      acao,
      entidade,
      detalhes
    }]);
  };

  const verificarAcessoLiberado = useCallback((): boolean => {
    if (garcomLogado?.cargo === 'super_admin') return true;
    if (!dadosEmpresa) return false;
    if (dadosEmpresa.status_assinatura !== 'ativa' && dadosEmpresa.status_assinatura !== 'degustacao') return false;
    if (!dadosEmpresa.data_vencimento) {
      return dadosEmpresa.status_assinatura === 'ativa';
    }
    const dataApenas = dadosEmpresa.data_vencimento.split('T')[0];
    const [ano, mes, dia] = dataApenas.split('-');
    const dataLimite = new Date(Number(ano), Number(mes) - 1, Number(dia), 23, 59, 59, 999);
    const dataAtual = new Date();
    return dataAtual.getTime() <= dataLimite.getTime();
  }, [garcomLogado, dadosEmpresa]);

  const carregarDados = useCallback(async (silencioso = false) => {
    const eid = obterEmpresaId();
    if (!eid) return;

    if (!silencioso) {
      setCarregandoContexto(true);
    }

    try {
      const [resMesas, resProds, resVendas, resUsers, resHist, resCats, resPagamentos, resMeta, resEmpresa] = await Promise.all([
        supabase.from('mesas').select('*').eq('empresa_id', eid).is('deletado_em', null).order('numero'),
        supabase.from('produtos').select('*').eq('empresa_id', eid).is('deletado_em', null).order('id'),
        supabase.from('vendas').select('*').eq('empresa_id', eid).order('data_fechamento', { ascending: false }).limit(500),
        supabase.from('usuarios').select('id, nome, avatar, cargo, empresa_id, email, status').eq('empresa_id', eid).is('deletado_em', null),
        supabase.from('historico_estoque').select('*').eq('empresa_id', eid).order('data', { ascending: false }).limit(300),
        supabase.from('categorias').select('*').eq('empresa_id', eid).is('deletado_em', null).order('ordem', { ascending: true }),
        supabase.from('pagamentos_garcons').select('*').eq('empresa_id', eid).is('deletado_em', null).order('data_pagamento', { ascending: false }).limit(200),
        supabase.from('metas_financeiras').select('*').eq('empresa_id', eid).eq('status', 'ativa').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('empresas').select('*').eq('id', eid).limit(1).maybeSingle()
      ]);

      let dadosMesas = resMesas.data as DBMesa[] | null;
      if (dadosMesas && dadosMesas.length === 0) {
        const mesasPadrao = [1, 2, 3, 4, 5, 6].map(n => ({ numero: n, status: 'livre', itens: [], empresa_id: eid }));
        const { error } = await supabase.from('mesas').insert(mesasPadrao);
        if (!error) {
          const novasMesas = await supabase.from('mesas').select('*').eq('empresa_id', eid).is('deletado_em', null).order('numero');
          dadosMesas = novasMesas.data as DBMesa[] | null;
        }
      }

      if (dadosMesas) {
        setMesas(dadosMesas.map((m: DBMesa) => ({
          id: m.id,
          numero: m.numero,
          status: m.status,
          garcomId: m.garcom_id,
          garcomNome: m.garcom_nome,
          nomeCliente: m.nome_cliente || '',
          itens: m.itens || []
        })));
      }

      if (resProds.data) {
        setProdutos((resProds.data as DBProduto[]).map((p: DBProduto) => ({
          id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          subcategoria: p.subcategoria,
          imagem_url: p.imagem_url,
          preco: Number(p.preco),
          precoCusto: Number(p.preco_custo),
          estoque: p.estoque,
          ativo: p.ativo
        })));
      }

      if (resCats.data) {
        setCategorias((resCats.data as DBCategoria[]).map((c: DBCategoria) => ({
          id: c.id,
          nome: c.nome,
          icone: c.icone,
          ativo: c.ativo,
          ordem: c.ordem
        })));
      }

      if (resVendas.data) {
        setHistoricoVendas((resVendas.data as DBVenda[]).map((v: DBVenda) => ({
          id: v.id,
          numeroMesa: v.numero_mesa,
          total: Number(v.total),
          pagamentos: v.pagamentos || [],
          itens: v.itens || [],
          garcomNome: v.garcom_nome,
          nomeCliente: v.nome_cliente || '',
          status: (v.status === 'fechada' ? 'concluida' : v.status) as 'concluida' | 'cancelada',
          dataFechamento: v.data_fechamento,
          canceladoPor: v.cancelado_por,
          motivoCancelamento: v.motivo_cancelamento,
          dataCancelamento: v.data_cancelamento
        })));
      }

      if (resUsers.data) {
        setUsuarios((resUsers.data as DBUsuario[]).map(mapearUsuarioDB));
      }

      if (resHist.data) {
        setHistoricoEstoque((resHist.data as DBHistorico[]).map((h: DBHistorico) => ({
          id: h.id,
          produtoId: h.produto_id,
          produtoNome: h.produto_nome,
          tipo: h.tipo as 'entrada' | 'inventario' | 'estorno',
          quantidade: h.quantidade,
          precoCusto: Number(h.preco_custo),
          usuarioNome: h.usuario_nome,
          data: h.data
        })));
      }

      if (resPagamentos.data) {
        setHistoricoPagamentos((resPagamentos.data as DBPagamentoGarcomRow[]).map((p: DBPagamentoGarcomRow): PagamentoGarcom => ({
          id: p.id,
          garcomId: p.garcom_id,
          garcomNome: p.garcom_nome,
          valor: Number(p.valor),
          data: p.data_pagamento,
          descricao: p.descricao,
          categoria: p.categoria as CategoriaPagamentoGarcom,
          status: p.status as StatusPagamentoGarcom
        })));
      }

      if (resMeta.data) {
        setMetaAtiva({
          id: resMeta.data.id,
          dataInicio: resMeta.data.data_inicio,
          dataFim: resMeta.data.data_fim,
          valorAlvo: Number(resMeta.data.valor_alvo),
          status: 'ativa'
        });
      } else {
        setMetaAtiva(null);
      }

      if (resEmpresa.data) {
        const statusBanco = String(resEmpresa.data.status_assinatura || 'pendente');
        const valorMensalBanco = Number(resEmpresa.data.valor_mensalidade ?? 149.90);
        setDadosEmpresa({
          id: resEmpresa.data.id,
          nome_fantasia: resEmpresa.data.nome_fantasia,
          status_assinatura: statusBanco,
          data_vencimento: resEmpresa.data.data_vencimento || '',
          valor_mensalidade: valorMensalBanco,
          plano_nome: resEmpresa.data.plano_nome || 'Assinatura Premium',
          ciclo_cobranca: resEmpresa.data.ciclo_cobranca || 'semestral',
          documento: resEmpresa.data.documento || '',
          telefone: resEmpresa.data.telefone || '',
          nome_exibicao: resEmpresa.data.nome_exibicao || '',
          email_contato: resEmpresa.data.email_contato || ''
        });
      } else {
        setDadosEmpresa(null);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Supabase:', err);
      setDadosEmpresa(null);
    } finally {
      setCarregandoContexto(false);
    }
  }, [obterEmpresaId]);

  // Personalização: nome exibido no topo do sistema
  const atualizarIdentidadeEmpresa = useCallback(async (nomeExibicao: string): Promise<void> => {
    const eid = obterEmpresaId();
    if (!eid) throw new Error('Estabelecimento não identificado.');

    const { data, error } = await supabase.rpc('atualizar_identidade_estabelecimento', {
      p_empresa_id: eid,
      p_nome_exibicao: nomeExibicao.trim()
    });
    if (error) throw new Error(error.message);

    const nomeSalvo = typeof data === 'string' ? data : '';
    setDadosEmpresa((prev) => (prev ? { ...prev, nome_exibicao: nomeSalvo } : prev));
  }, [obterEmpresaId]);

  // Gestão: o administrador edita os dados cadastrais da sua própria empresa
  const atualizarDadosMinhaEmpresa = useCallback(async (dados: {
    nome_fantasia: string;
    nome_exibicao?: string;
    documento?: string;
    telefone?: string;
    email_contato?: string;
  }): Promise<void> => {
    const eid = obterEmpresaId();
    if (!eid) throw new Error('Estabelecimento não identificado.');

    const payloadRpc = {
      p_empresa_id: eid,
      p_nome_fantasia: dados.nome_fantasia.trim(),
      p_nome_exibicao: dados.nome_exibicao ? dados.nome_exibicao.trim() : null,
      p_documento: dados.documento ? dados.documento.replace(/\D/g, '') : null,
      p_telefone: dados.telefone ? dados.telefone.replace(/\D/g, '') : null,
      p_email_contato: dados.email_contato ? dados.email_contato.trim().toLowerCase() : null
    };

    let rpcSuccess = false;
    try {
      const { data, error } = await supabase.rpc('atualizar_dados_minha_empresa', payloadRpc);
      if (!error && data) {
        rpcSuccess = true;
      }
    } catch {
      rpcSuccess = false;
    }

    if (!rpcSuccess) {
      const payloadDireto = {
        nome_fantasia: payloadRpc.p_nome_fantasia,
        nome_exibicao: payloadRpc.p_nome_exibicao,
        documento: payloadRpc.p_documento,
        telefone: payloadRpc.p_telefone,
        email_contato: payloadRpc.p_email_contato
      };

      const { error: errUpdate } = await supabase
        .from('empresas')
        .update(payloadDireto)
        .eq('id', eid);

      if (errUpdate) {
        throw new Error(errUpdate.message);
      }
    }

    setDadosEmpresa((prev) => (prev ? {
      ...prev,
      nome_fantasia: payloadRpc.p_nome_fantasia,
      nome_exibicao: payloadRpc.p_nome_exibicao ?? '',
      documento: payloadRpc.p_documento ?? '',
      telefone: payloadRpc.p_telefone ?? '',
      email_contato: payloadRpc.p_email_contato ?? ''
    } : prev));
  }, [obterEmpresaId]);

  // Logout automático por inatividade (30 minutos) — Otimizado com Throttle + Passive Listeners
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let ultimoResetMs = 0;
    const fazerLogout = () => setGarcomLogado(null);

    const resetarTimer = () => {
      const agora = Date.now();
      if (agora - ultimoResetMs < 10000) return;
      ultimoResetMs = agora;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(fazerLogout, 30 * 60 * 1000);
    };

    if (garcomLogado) {
      resetarTimer();
      window.addEventListener('mousemove', resetarTimer, { passive: true });
      window.addEventListener('keydown', resetarTimer, { passive: true });
      window.addEventListener('touchstart', resetarTimer, { passive: true });
      window.addEventListener('click', resetarTimer, { passive: true });
      window.addEventListener('scroll', resetarTimer, { passive: true });
    }

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetarTimer);
      window.removeEventListener('keydown', resetarTimer);
      window.removeEventListener('touchstart', resetarTimer);
      window.removeEventListener('click', resetarTimer);
      window.removeEventListener('scroll', resetarTimer);
    };
  }, [garcomLogado, setGarcomLogado]);

  // Carregamento inicial da empresa + WebSocket Realtime quando um pedido/mesa é alterado por outro aparelho
  useEffect(() => {
    const eid = obterEmpresaId();
    if (!eid) return;

    const timer = setTimeout(() => {
      void carregarDados(false);
    }, 0);

    const agendarAtualizacaoSilenciosa = () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      realtimeDebounceRef.current = setTimeout(() => {
        void carregarDados(true);
      }, 300);
    };

    const channel = supabase
      .channel(`tenant-sync-${eid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesas', filter: `empresa_id=eq.${eid}` }, agendarAtualizacaoSilenciosa)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos', filter: `empresa_id=eq.${eid}` }, agendarAtualizacaoSilenciosa)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas', filter: `empresa_id=eq.${eid}` }, agendarAtualizacaoSilenciosa)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categorias', filter: `empresa_id=eq.${eid}` }, agendarAtualizacaoSilenciosa)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresas', filter: `id=eq.${eid}` }, agendarAtualizacaoSilenciosa)
      .subscribe();

    return () => {
      clearTimeout(timer);
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      void supabase.removeChannel(channel);
    };
  }, [carregarDados, obterEmpresaId]);

  const autenticarUsuario = async (email: string, senha: string): Promise<boolean> => {
    isFluxoConfirmacaoEmailRef.current = false;
    sessionStorage.removeItem('tsystem_email_confirmado_aviso');
    sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    const emailLimpo = email.trim().toLowerCase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: emailLimpo,
      password: senha
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        throw new Error('Seu e-mail ainda não foi confirmado. Clique no link enviado para sua caixa de entrada.');
      }
      return false;
    }

    if (!authData.user) return false;

    const perfil = await obterOuProvisionarPerfil(
      authData.user.id,
      emailLimpo,
      authData.user.user_metadata
    );

    if (perfil) {
      if (perfil.status === 'bloqueado') {
        await supabase.auth.signOut();
        throw new Error('Conta bloqueada pelo Administrador.');
      }
      const usuarioMapeado = mapearUsuarioDB(perfil);
      if (usuarioMapeado.empresaId) {
        setCarregandoContexto(true);
        const empresaValidada = await carregarENormalizarEmpresa(
          usuarioMapeado.empresaId,
          authData.user.user_metadata
        );
        setDadosEmpresa(empresaValidada);
      }
      setGarcomLogadoState(usuarioMapeado);
      return true;
    }
    return false;
  };

  const uploadImagemProduto = async (file: File): Promise<string | null> => {
    try {
      const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!tiposPermitidos.includes(file.type)) {
        throw new Error('Formato de imagem não suportado. Use PNG, JPG ou WEBP.');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('A imagem excede o limite máximo de 5MB.');
      }

      const extLimpa = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pastaTenant = obterEmpresaId() || 'geral';
      const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
      const filePath = `${pastaTenant}/${uuid}.${extLimpa}`;

      const { error: uploadError } = await supabase.storage.from('produtos').upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  // ==========================================
  // MEU PERFIL (DADOS CADASTRAIS, FOTO, EMOJI E ACESSO)
  // ==========================================
  const comprimirERecortarFotoPerfil = async (file: File): Promise<{ blob: Blob; dataUrl: string; ext: string; mime: string }> => {
    const bitmap = await createImageBitmap(file);
    const lado = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - lado) / 2;
    const sy = (bitmap.height - lado) / 2;
    const tamanhoFinal = Math.min(320, lado);

    const canvas = document.createElement('canvas');
    canvas.width = tamanhoFinal;
    canvas.height = tamanhoFinal;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      throw new Error('Não foi possível processar a imagem.');
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, sx, sy, lado, lado, 0, 0, tamanhoFinal, tamanhoFinal);
    bitmap.close();

    const dataUrlWebp = canvas.toDataURL('image/webp', 0.85);
    const usaWebp = dataUrlWebp.startsWith('data:image/webp');
    const dataUrl = usaWebp ? dataUrlWebp : canvas.toDataURL('image/jpeg', 0.88);
    const mime = usaWebp ? 'image/webp' : 'image/jpeg';
    const ext = usaWebp ? 'webp' : 'jpg';

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, 0.86)
    );
    if (!blob) throw new Error('Falha ao comprimir a imagem de perfil.');
    return { blob, dataUrl, ext, mime };
  };

  const uploadFotoPerfil = async (file: File): Promise<string> => {
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
      throw new Error('Formato não suportado. Use PNG, JPG ou WEBP.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('A imagem deve ter no máximo 5MB.');
    }

    const { blob, dataUrl, ext, mime } = await comprimirERecortarFotoPerfil(file);

    try {
      const pastaTenant = obterEmpresaId() || 'geral';
      const userId = garcomLogado?.id || 'user';
      const filePath = `${pastaTenant}/avatares/${userId}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage.from('produtos').upload(filePath, blob, {
        contentType: mime,
        upsert: true
      });
      if (!uploadError) {
        const { data } = supabase.storage.from('produtos').getPublicUrl(filePath);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // Fallback seguro para Data URL otimizada caso o bucket bloqueie escrita
    }

    return dataUrl;
  };

  const atualizarMeuPerfil = async (dados: { nome: string; avatar: string; emojiPreferido?: string; telefone?: string }) => {
    if (!garcomLogado) {
      throw new Error('Nenhum usuário autenticado.');
    }

    const nomeLimpo = dados.nome.trim();
    if (nomeLimpo.length < 2) {
      throw new Error('Informe um nome válido com pelo menos 2 caracteres.');
    }

    const avatarFinal = dados.avatar.trim() || '👤';

    const { error: dbError } = await supabase
      .from('usuarios')
      .update({
        nome: nomeLimpo,
        avatar: avatarFinal
      })
      .eq('id', garcomLogado.id);

    if (dbError) {
      throw new Error('Não foi possível atualizar os dados do perfil.');
    }

    if (dados.emojiPreferido) {
      try {
        localStorage.setItem(`tsystem_emoji_${garcomLogado.id}`, dados.emojiPreferido);
      } catch {
        // Ignora erro de storage local
      }
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && session.user.id === garcomLogado.id) {
      await supabase.auth.updateUser({
        data: {
          nome_usuario: nomeLimpo,
          avatar_emoji: dados.emojiPreferido || undefined,
          telefone: dados.telefone !== undefined ? dados.telefone : undefined
        }
      }).catch(() => null);
    }

    setGarcomLogadoState(prev => prev ? { ...prev, nome: nomeLimpo, avatar: avatarFinal } : prev);
    setUsuarios(prev => prev.map(u => u.id === garcomLogado.id ? { ...u, nome: nomeLimpo, avatar: avatarFinal } : u));
    await registrarAuditoria('EDICAO', 'PERFIL', `Usuário '${nomeLimpo}' atualizou seu próprio perfil.`);
  };

  const alterarMeuEmail = async (novoEmail: string, senhaAtual: string) => {
    if (!garcomLogado) throw new Error('Nenhum usuário autenticado.');
    const emailLimpo = novoEmail.trim().toLowerCase();
    if (!emailLimpo || !emailLimpo.includes('@')) {
      throw new Error('Informe um endereço de e-mail válido.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || session.user.id !== garcomLogado.id || !session.user.email) {
      throw new Error('Para alterar dados de acesso, acesse diretamente com sua conta.');
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: senhaAtual
    });
    if (reauthError) {
      throw new Error('A senha atual informada está incorreta.');
    }

    const { error: authUpdateErr } = await supabase.auth.updateUser({ email: emailLimpo });
    if (authUpdateErr) {
      throw new Error(
        authUpdateErr.message.toLowerCase().includes('already')
          ? 'Este e-mail já está em uso por outra conta.'
          : 'Não foi possível atualizar o e-mail de acesso.'
      );
    }

    await supabase.from('usuarios').update({ email: emailLimpo }).eq('id', garcomLogado.id);
    await supabase.functions.invoke('admin-auth', {
      body: { userId: garcomLogado.id, newEmail: emailLimpo }
    }).catch(() => null);

    localStorage.setItem('tsystem_saved_email', emailLimpo);
    setGarcomLogadoState(prev => prev ? { ...prev, email: emailLimpo } : prev);
    setUsuarios(prev => prev.map(u => u.id === garcomLogado.id ? { ...u, email: emailLimpo } : u));
  };

  const alterarMinhaSenha = async (senhaAtual: string, novaSenha: string) => {
    if (!garcomLogado) throw new Error('Nenhum usuário autenticado.');
    if (novaSenha.length < 6) {
      throw new Error('A nova senha deve ter no mínimo 6 caracteres.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || session.user.id !== garcomLogado.id || !session.user.email) {
      throw new Error('Para alterar sua senha, acesse diretamente com sua conta.');
    }

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: senhaAtual
    });
    if (reauthError) {
      throw new Error('A senha atual informada está incorreta.');
    }

    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      throw new Error(
        error.message.toLowerCase().includes('different')
          ? 'A nova senha deve ser diferente da senha atual.'
          : 'Não foi possível atualizar a senha. Tente novamente.'
      );
    }
  };

  const adicionarCategoria = async (nome: string, icone: string) => {
    const eid = obterEmpresaId();
    const novaOrdem = categorias.length;
    await supabase.from('categorias').insert([{ nome, icone, ativo: true, ordem: novaOrdem, empresa_id: eid }]);
    await registrarAuditoria('CRIACAO', 'CATEGORIA', `Categoria '${nome}' criada.`);
    await carregarDados(true);
  };

  const editarCategoria = async (id: number, nome: string, icone: string) => {
    const eid = obterEmpresaId();
    await supabase.from('categorias').update({ nome, icone }).eq('id', id).eq('empresa_id', eid);
    await carregarDados(true);
  };

  const excluirCategoria = async (id: number) => {
    const eid = obterEmpresaId();
    const cat = categorias.find(c => c.id === id);
    await supabase.from('categorias').update({ deletado_em: new Date().toISOString(), ativo: false }).eq('id', id).eq('empresa_id', eid);
    await registrarAuditoria('EXCLUSAO', 'CATEGORIA', `Categoria '${cat?.nome}' movida para lixeira oculta.`);
    await carregarDados(true);
  };

  const reordenarCategorias = async (categoriasReordenadas: Categoria[]) => {
    const eid = obterEmpresaId();
    setCategorias(categoriasReordenadas);
    for (const cat of categoriasReordenadas) {
      await supabase.from('categorias').update({ ordem: cat.ordem }).eq('id', cat.id).eq('empresa_id', eid);
    }
  };

  const adicionarProduto = async (novo: Omit<Produto, 'id'>) => {
    const eid = obterEmpresaId();
    await supabase.from('produtos').insert([{
      nome: novo.nome,
      categoria: novo.categoria,
      subcategoria: novo.subcategoria,
      imagem_url: novo.imagem_url,
      preco: novo.preco,
      preco_custo: novo.precoCusto,
      estoque: novo.estoque,
      ativo: true,
      empresa_id: eid
    }]);
    await registrarAuditoria('CRIACAO', 'PRODUTO', `Produto '${novo.nome}' adicionado ao catálogo.`);
    await carregarDados(true);
  };

  const editarProduto = async (id: number, atualizacao: Partial<Produto>) => {
    const eid = obterEmpresaId();
    await supabase.from('produtos').update({
      nome: atualizacao.nome,
      categoria: atualizacao.categoria,
      subcategoria: atualizacao.subcategoria,
      imagem_url: atualizacao.imagem_url,
      preco: atualizacao.preco,
      preco_custo: atualizacao.precoCusto,
      ativo: atualizacao.ativo
    }).eq('id', id).eq('empresa_id', eid);
    await carregarDados(true);
  };

  const excluirProduto = async (id: number) => {
    const eid = obterEmpresaId();
    const p = produtos.find(x => x.id === id);
    await supabase.from('produtos').update({ deletado_em: new Date().toISOString(), ativo: false }).eq('id', id).eq('empresa_id', eid);
    await registrarAuditoria('EXCLUSAO', 'PRODUTO', `Produto '${p?.nome}' movido para lixeira oculta.`);
    await carregarDados(true);
  };

  const alternarStatusProduto = async (id: number) => {
    const eid = obterEmpresaId();
    const p = produtos.find(x => x.id === id);
    if (p) {
      await supabase.from('produtos').update({ ativo: !p.ativo }).eq('id', id).eq('empresa_id', eid);
      await carregarDados(true);
    }
  };

  const registrarLogEstoque = async (produtoId: number, nome: string, qtd: number, custo: number, usuario: string, tipo: string) => {
    const eid = obterEmpresaId();
    await supabase.from('historico_estoque').insert([{
      produto_id: produtoId,
      produto_nome: nome,
      tipo,
      quantidade: qtd,
      preco_custo: custo,
      usuario_nome: usuario,
      empresa_id: eid
    }]);
  };

  const darEntradaEstoque = async (idProduto: number, qtdAdicionada: number, precoCusto: number, usuario: string) => {
    const eid = obterEmpresaId();
    const p = produtos.find(x => x.id === idProduto);
    if (p) {
      await supabase.from('produtos').update({ estoque: (p.estoque || 0) + qtdAdicionada, preco_custo: precoCusto }).eq('id', idProduto).eq('empresa_id', eid);
      await registrarLogEstoque(idProduto, p.nome, qtdAdicionada, precoCusto, usuario, 'entrada');
      await registrarAuditoria('EDICAO', 'ESTOQUE', `Entrada de ${qtdAdicionada}x no produto '${p.nome}'.`);
      await carregarDados(true);
    }
  };

  const registrarInventario = async (idProduto: number, qtdFisicaReal: number, usuario: string) => {
    const eid = obterEmpresaId();
    const p = produtos.find(x => x.id === idProduto);
    if (p) {
      const diff = qtdFisicaReal - (p.estoque || 0);
      await supabase.from('produtos').update({ estoque: qtdFisicaReal }).eq('id', idProduto).eq('empresa_id', eid);
      if (diff !== 0) {
        await registrarLogEstoque(idProduto, p.nome, diff, p.precoCusto || 0, usuario, 'inventario');
        await registrarAuditoria('EDICAO', 'ESTOQUE', `Inventário ajustado para ${qtdFisicaReal} no produto '${p.nome}'.`);
      }
      await carregarDados(true);
    }
  };

  const adicionarUsuario = async (novoUsuario: Garcom) => {
    const eid = obterEmpresaId();
    await supabase.from('usuarios').upsert([{
      id: novoUsuario.id,
      nome: novoUsuario.nome,
      avatar: novoUsuario.avatar,
      email: novoUsuario.email?.toLowerCase(),
      cargo: novoUsuario.cargo,
      status: 'ativo',
      empresa_id: eid
    }]);
    await registrarAuditoria('CRIACAO', 'USUARIO', `Colaborador '${novoUsuario.nome}' adicionado à equipe.`);
    await carregarDados(true);
  };

  const editarUsuario = async (id: string, dadosAtualizados: Partial<Garcom>) => {
    const eid = obterEmpresaId();
    const { error: dbError } = await supabase.from('usuarios').update({ ...dadosAtualizados }).eq('id', id).eq('empresa_id', eid);
    if (dbError) throw dbError;
    if (dadosAtualizados.email !== undefined || dadosAtualizados.status !== undefined) {
      await supabase.functions.invoke('admin-auth', {
        body: { userId: id, newEmail: dadosAtualizados.email, status: dadosAtualizados.status }
      }).catch(e => console.error(e));
    }
    await carregarDados(true);
  };

  const removerUsuario = async (id: string) => {
    const eid = obterEmpresaId();
    const u = usuarios.find(x => x.id === id);
    await supabase.from('usuarios').update({ deletado_em: new Date().toISOString(), status: 'bloqueado' }).eq('id', id).eq('empresa_id', eid);
    await supabase.functions.invoke('admin-auth', {
      body: { action: 'deleteUser', userId: id }
    }).catch(() => null);
    await registrarAuditoria('EXCLUSAO', 'USUARIO', `Colaborador '${u?.nome}' bloqueado e movido para lixeira oculta.`);
    await carregarDados(true);
  };

  const adicionarMesa = async (numero: number) => {
    const eid = obterEmpresaId();
    if (!mesas.some(m => m.numero === numero)) {
      await supabase.from('mesas').insert([{ numero, status: 'livre', itens: [], empresa_id: eid }]);
      await registrarAuditoria('CRIACAO', 'MESA', `Mesa/Guarda-sol ${numero} criada.`);
      await carregarDados(true);
    }
  };

  const editarMesa = async (id: number | string, atualizacao: { numero: number }) => {
    const eid = obterEmpresaId();
    await supabase.from('mesas').update({ numero: atualizacao.numero }).eq('id', id).eq('empresa_id', eid);
    await carregarDados(true);
  };

  const removerMesa = async (numero: number) => {
    const eid = obterEmpresaId();
    await supabase.from('mesas').update({ deletado_em: new Date().toISOString(), status: 'desativada' }).eq('numero', numero).eq('empresa_id', eid);
    await registrarAuditoria('EXCLUSAO', 'MESA', `Mesa/Guarda-sol ${numero} movida para lixeira oculta.`);
    await carregarDados(true);
  };

  const atualizarStatusCozinha = async (numeroMesa: number, idItem: string, status: 'pendente' | 'preparo' | 'pronto' | 'entregue') => {
    const eid = obterEmpresaId();
    const mesa = mesas.find(m => m.numero === numeroMesa);
    if (!mesa || !eid) return;

    const novosItens = mesa.itens.map(i => i.id === idItem ? { ...i, statusCozinha: status } : i);
    setMesas(prev => prev.map(m => m.numero === numeroMesa ? { ...m, itens: novosItens } : m));

    if (status === 'preparo') {
      await supabase.from('mesas').update({ itens: novosItens }).eq('numero', numeroMesa).eq('empresa_id', eid);
    } else {
      const { error: rpcErr } = await supabase.rpc('atualizar_status_item_cozinha', {
        p_numero_mesa: numeroMesa,
        p_item_id: idItem,
        p_novo_status: status
      });

      if (rpcErr) {
        await supabase.from('mesas').update({ itens: novosItens }).eq('numero', numeroMesa).eq('empresa_id', eid);
      }
    }
    await carregarDados(true);
  };

  const salvarComanda = async (numero: number, itens: ItemComanda[], nomeCliente: string) => {
    const eid = obterEmpresaId();
    const mesa = mesas.find(m => m.numero === numero);
    if (!mesa || !eid) return;

    const diferencasEstoque = new Map<number, number>();
    const itensFinaisParaMesa: ItemComanda[] = [];
    const qtdAntigaPorProduto = new Map<number, number>();

    mesa.itens.forEach(item => {
      qtdAntigaPorProduto.set(item.produto.id, (qtdAntigaPorProduto.get(item.produto.id) || 0) + item.quantidade);
    });

    const qtdNovaPorProduto = new Map<number, number>();
    itens.forEach(item => {
      qtdNovaPorProduto.set(item.produto.id, (qtdNovaPorProduto.get(item.produto.id) || 0) + item.quantidade);
    });

    for (const [prodId, novaQtd] of qtdNovaPorProduto) {
      const antiga = qtdAntigaPorProduto.get(prodId) || 0;
      diferencasEstoque.set(prodId, novaQtd - antiga);
    }

    for (const [prodId, antigaQtd] of qtdAntigaPorProduto) {
      if (!qtdNovaPorProduto.has(prodId)) {
        diferencasEstoque.set(prodId, -antigaQtd);
      }
    }

    const produtosUnicosCart = Array.from(new Set(itens.map(i => i.produto.id)));
    produtosUnicosCart.forEach(prodId => {
      const novaQtdTotal = qtdNovaPorProduto.get(prodId) || 0;
      const itensAntigosDesseProduto = mesa.itens.filter(i => i.produto.id === prodId);
      const antigaQtdTotal = qtdAntigaPorProduto.get(prodId) || 0;
      const itemInterface = itens.find(i => i.produto.id === prodId)!;

      if (novaQtdTotal > antigaQtdTotal) {
        const antigosAtualizados = itensAntigosDesseProduto.map(antigo => ({
          ...antigo,
          observacao: itemInterface.observacao
        }));
        itensFinaisParaMesa.push(...antigosAtualizados);
        const diff = novaQtdTotal - antigaQtdTotal;
        itensFinaisParaMesa.push({
          ...itemInterface,
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          quantidade: diff,
          statusCozinha: 'pendente',
          horaPedido: new Date().toISOString()
        });
      } else if (novaQtdTotal === antigaQtdTotal) {
        const antigosAtualizados = itensAntigosDesseProduto.map(antigo => ({
          ...antigo,
          observacao: itemInterface.observacao
        }));
        itensFinaisParaMesa.push(...antigosAtualizados);
      } else {
        let toRemove = antigaQtdTotal - novaQtdTotal;
        const sortedAntigos = [...itensAntigosDesseProduto].sort((a, b) => {
          if (a.statusCozinha === 'pendente' && b.statusCozinha !== 'pendente') return -1;
          if (a.statusCozinha !== 'pendente' && b.statusCozinha === 'pendente') return 1;
          return 0;
        });

        for (const oldItem of sortedAntigos) {
          if (toRemove <= 0) {
            itensFinaisParaMesa.push({ ...oldItem, observacao: itemInterface.observacao });
          } else if (oldItem.quantidade > toRemove) {
            itensFinaisParaMesa.push({ ...oldItem, quantidade: oldItem.quantidade - toRemove, observacao: itemInterface.observacao });
            toRemove = 0;
          } else {
            toRemove -= oldItem.quantidade;
          }
        }
      }
    });

    const clienteLimpo = nomeCliente.trim();
    const novoStatus: 'livre' | 'ocupada' = (itensFinaisParaMesa.length > 0 || clienteLimpo.length > 0) ? 'ocupada' : 'livre';

    let donoId: string | null | undefined = mesa.garcomId;
    let donoNome: string | null | undefined = mesa.garcomNome;

    if (novoStatus === 'ocupada') {
      if (!donoId && garcomLogado) {
        donoId = garcomLogado.id;
        donoNome = garcomLogado.nome;
      }
    } else {
      donoId = null;
      donoNome = null;
    }

    // 1. Atualização
    setMesas(prev => prev.map(m => m.numero === numero ? {
      ...m,
      status: novoStatus,
      itens: itensFinaisParaMesa,
      nomeCliente: clienteLimpo,
      garcomId: donoId || undefined,
      garcomNome: donoNome || undefined
    } : m));

    // 2. Persistência no Supabase
    await supabase.from('mesas').update({
      status: novoStatus,
      itens: itensFinaisParaMesa,
      nome_cliente: clienteLimpo,
      garcom_id: donoId,
      garcom_nome: donoNome
    }).eq('numero', numero).eq('empresa_id', eid);

    // 3. Atualização de Estoque
    for (const [id, diff] of diferencasEstoque) {
      if (diff === 0) continue;
      const p = produtos.find(x => x.id === id);
      if (p && p.estoque !== undefined) {
        const { error: rpcEstErr } = await supabase.rpc('ajustar_estoque_atomico', {
          p_produto_id: id,
          p_delta: -diff
        });
        if (rpcEstErr) {
          await supabase.from('produtos').update({ estoque: Math.max(0, p.estoque - diff) }).eq('id', id).eq('empresa_id', eid);
        }
      }
    }

    // 4. Sincronização final com o banco
    await carregarDados(true);
  };

  const finalizarMesa = async (numero: number, valorTaxa = 0, pagamentosRealizados: Pagamento[] = [], valorDesconto = 0) => {
    const eid = obterEmpresaId();
    const mesa = mesas.find(m => m.numero === numero);
    if (mesa && mesa.status === 'ocupada' && eid) {
      let totalDaMesa = mesa.itens.reduce((total, item) => total + (item.produto.preco * item.quantidade), 0);
      const itensFinais = [...mesa.itens];

      if (valorTaxa > 0) {
        totalDaMesa += valorTaxa;
        itensFinais.push({
          id: `taxa-${Date.now()}`,
          produto: { id: 999, nome: 'Valor Guarda-Sol', preco: valorTaxa, categoria: 'Outros', ativo: true, precoCusto: 0 },
          quantidade: 1,
          statusCozinha: 'entregue'
        });
      }

      if (valorDesconto > 0) {
        const descontoEfetivo = Math.min(totalDaMesa, valorDesconto);
        totalDaMesa = Math.max(0, Number((totalDaMesa - descontoEfetivo).toFixed(2)));
        itensFinais.push({
          id: `desconto-${Date.now()}`,
          produto: { id: 998, nome: 'Desconto Aplicado', preco: -descontoEfetivo, categoria: 'Outros', ativo: true, precoCusto: 0 },
          quantidade: 1,
          statusCozinha: 'entregue'
        });
      }

      await supabase.from('vendas').insert([{
        numero_mesa: mesa.numero,
        nome_cliente: mesa.nomeCliente || '',
        garcom_nome: garcomLogado?.nome || 'Sistema',
        itens: itensFinais,
        total: totalDaMesa,
        pagamentos: pagamentosRealizados,
        status: 'fechada',
        empresa_id: eid
      }]);

      await supabase.from('mesas').update({
        status: 'livre',
        itens: [],
        garcom_id: null,
        garcom_nome: null,
        nome_cliente: null
      }).eq('numero', numero).eq('empresa_id', eid);

      await carregarDados(true);
    }
  };

  const cancelarVenda = async (idVenda: string, motivo: string, adminNome: string) => {
    const eid = obterEmpresaId();
    const venda = historicoVendas.find(v => v.id === idVenda);
    if (!venda || venda.status === 'cancelada' || !eid) return;

    await supabase.from('vendas').update({
      status: 'cancelada',
      cancelado_por: adminNome,
      motivo_cancelamento: motivo,
      data_cancelamento: new Date().toISOString()
    }).eq('id', idVenda).eq('empresa_id', eid);

    for (const item of venda.itens) {
      if (item.produto.id !== 999 && item.produto.id !== 998) {
        const { data: pData } = await supabase
          .from('produtos')
          .select('id, estoque, preco_custo, nome')
          .eq('id', item.produto.id)
          .eq('empresa_id', eid)
          .single();

        if (pData && pData.estoque !== null) {
          const { error: rpcEstErr } = await supabase.rpc('ajustar_estoque_atomico', {
            p_produto_id: pData.id,
            p_delta: item.quantidade
          });
          if (rpcEstErr) {
            await supabase
              .from('produtos')
              .update({ estoque: pData.estoque + item.quantidade })
              .eq('id', pData.id)
              .eq('empresa_id', eid);
          }
          await registrarLogEstoque(pData.id, pData.nome, item.quantidade, pData.preco_custo || 0, adminNome, 'estorno');
        }
      }
    }

    await registrarAuditoria('CANCELAMENTO', 'VENDA', `Venda #${venda.numeroMesa} de R$${venda.total.toFixed(2)} cancelada por ${adminNome}. Motivo: ${motivo}`);
    await carregarDados(true);
  };

  const registrarValeFuncionario = async (dados: NovoPagamentoGarcom): Promise<void> => {
    const eid = obterEmpresaId();
    const payload = {
      garcom_id: dados.garcomId,
      garcom_nome: dados.garcomNome,
      valor: dados.valor,
      data_pagamento: dados.data,
      descricao: dados.descricao,
      categoria: dados.categoria,
      status: dados.status,
      empresa_id: eid
    };
    const { data, error } = await supabase.from('pagamentos_garcons').insert([payload]).select('*').single();
    if (error) throw error;
    if (data) {
      setHistoricoPagamentos(prev => [{
        id: data.id,
        garcomId: data.garcom_id,
        garcomNome: data.garcom_nome,
        valor: Number(data.valor),
        data: data.data_pagamento,
        descricao: data.descricao,
        categoria: data.categoria as CategoriaPagamentoGarcom,
        status: data.status as StatusPagamentoGarcom
      }, ...prev]);
    }
    await carregarDados(true);
  };

  const excluirPagamentoGarcom = async (id: string): Promise<void> => {
    const eid = obterEmpresaId();
    await supabase.from('pagamentos_garcons').update({ deletado_em: new Date().toISOString() }).eq('id', id).eq('empresa_id', eid);
    await registrarAuditoria('EXCLUSAO', 'FINANCEIRO', 'Vale removido.');
    setHistoricoPagamentos(prev => prev.filter(p => p.id !== id));
    await carregarDados(true);
  };

  const atualizarStatusPagamentoGarcom = async (id: string, novoStatus: StatusPagamentoGarcom): Promise<void> => {
    const eid = obterEmpresaId();
    const { error } = await supabase.from('pagamentos_garcons').update({ status: novoStatus }).eq('id', id).eq('empresa_id', eid);
    if (error) throw error;
    setHistoricoPagamentos(prev => prev.map(p => p.id === id ? { ...p, status: novoStatus } : p));
    await carregarDados(true);
  };

  const salvarMetaFinanceira = async (dados: NovaMetaFinanceira): Promise<void> => {
    const eid = obterEmpresaId();
    const payload = {
      data_inicio: dados.dataInicio,
      data_fim: dados.dataFim,
      valor_alvo: Number(dados.valorAlvo),
      status: 'ativa',
      empresa_id: eid
    };
    const { data, error } = await supabase.from('metas_financeiras').insert([payload]).select('*').single();
    if (error) throw error;
    if (data) {
      setMetaAtiva({
        id: data.id,
        dataInicio: data.data_inicio,
        dataFim: data.data_fim,
        valorAlvo: Number(data.valor_alvo),
        status: data.status as 'ativa' | 'inativa'
      });
    }
    await carregarDados(true);
  };

  return (
    <AppContext.Provider value={{
      dadosEmpresa,
      carregandoContexto,
      verificarAcessoLiberado,
      carregarDados,
      atualizarIdentidadeEmpresa,
      atualizarDadosMinhaEmpresa,
      mesas,
      historicoVendas,
      garcomLogado,
      setGarcomLogado,
      usuarios,
      garcons: usuarios,
      produtos,
      categorias,
      historicoEstoque,
      historicoPagamentos,
      metaAtiva,
      salvarMetaFinanceira,
      uploadImagemProduto,
      autenticarUsuario,
      adicionarProduto,
      excluirProduto,
      alternarStatusProduto,
      adicionarCategoria,
      editarCategoria,
      excluirCategoria,
      reordenarCategorias,
      darEntradaEstoque,
      registrarInventario,
      adicionarUsuario,
      removerUsuario,
      editarUsuario,
      adicionarMesa,
      editarMesa,
      removerMesa,
      atualizarStatusCozinha,
      salvarComanda,
      finalizarMesa,
      cancelarVenda,
      editarProduto,
      registrarValeFuncionario,
      excluirPagamentoGarcom,
      atualizarStatusPagamentoGarcom,
      uploadFotoPerfil,
      atualizarMeuPerfil,
      alterarMeuEmail,
      alterarMinhaSenha
    }}>
      {children}
    </AppContext.Provider>
  );
}
