// src/pages/Admin.tsx
import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header';
import { AvatarUsuario } from '../components/AvatarUsuario';
import { ModalConfirmacao } from '../components/ModalConfirmacao';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import {
  carregarConfiguracaoGlobalSaaS,
  obterConfiguracaoGlobalLocal
} from '../utils/configuracoesSaaS';
import { obterConfiguracaoImpressora } from '../utils/impressoraTermica';
import {
  formatarCpfCnpj,
  formatarTelefoneBR,
  extrairDigitos,
  validarDocumentoBrasil,
  validarTelefoneBR,
  validarEmail
} from '../utils/validadores';

const LIMITE_NOME_EXIBICAO = 40;

export function Admin() {
  const navigate = useNavigate();
  const { dadosEmpresa, atualizarDadosMinhaEmpresa, garcomLogado, setGarcomLogado } = useAppContext();

  // Controle de permissão de acesso: somente Admin do estabelecimento ou Super Admin
  const isAdmin = garcomLogado?.cargo === 'admin' || garcomLogado?.cargo === 'super_admin';

  // Configuração global SaaS (WhatsApp de Suporte definido pelo Super Admin)
  const [whatsappSuporte, setWhatsappSuporte] = useState<string>(
    () => obterConfiguracaoGlobalLocal().whatsappSuporte
  );

  useEffect(() => {
    let ativo = true;
    carregarConfiguracaoGlobalSaaS()
      .then((cfg) => {
        if (ativo && cfg.whatsappSuporte) {
          setWhatsappSuporte(cfg.whatsappSuporte);
        }
      })
      .catch(() => {
        // Mantém fallback local
      });
    return () => {
      ativo = false;
    };
  }, []);

  // Estado da Impressora Térmica
  const [configImpressora] = useState(() => obterConfiguracaoImpressora());

  // Estado de Notificações (Sincronizado com Header)
  const [modalNotificacoes, setModalNotificacoes] = useState<boolean>(false);
  const [alertaSonoroAtivo, setAlertaSonoroAtivo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const salvo = localStorage.getItem('tsystem_alerta_som');
      return salvo !== null ? salvo === 'true' : true;
    } catch {
      return true;
    }
  });
  const [notificacoesNavegadorAtivo, setNotificacoesNavegadorAtivo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const salvo = localStorage.getItem('tsystem_notificacoes_navegador');
      if (salvo !== null) return salvo === 'true';
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });
  const [permissaoNavegador, setPermissaoNavegador] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  useEffect(() => {
    const sync = () => {
      try {
        const som = localStorage.getItem('tsystem_alerta_som');
        if (som !== null) setAlertaSonoroAtivo(som === 'true');
        const nav = localStorage.getItem('tsystem_notificacoes_navegador');
        if (nav !== null) setNotificacoesNavegadorAtivo(nav === 'true');
        if (typeof window !== 'undefined' && 'Notification' in window) {
          setPermissaoNavegador(Notification.permission);
        }
      } catch {
        // Ignora
      }
    };
    window.addEventListener('tsystem:notificacoes-sync', sync);
    return () => window.removeEventListener('tsystem:notificacoes-sync', sync);
  }, []);

  const tocarSomTeste = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const agora = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, agora);
      gain1.gain.setValueAtTime(0, agora);
      gain1.gain.linearRampToValueAtTime(0.18, agora + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, agora + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(agora);
      osc1.stop(agora + 0.27);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, agora + 0.1);
      gain2.gain.setValueAtTime(0, agora + 0.1);
      gain2.gain.linearRampToValueAtTime(0.22, agora + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, agora + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(agora + 0.1);
      osc2.stop(agora + 0.52);
    } catch {
      // Ignora
    }
  };

  const handleToggleSom = () => {
    const novo = !alertaSonoroAtivo;
    setAlertaSonoroAtivo(novo);
    try {
      localStorage.setItem('tsystem_alerta_som', novo ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('tsystem:notificacoes-sync'));
    } catch {
      // Ignora
    }
    if (novo) tocarSomTeste();
  };

  const handleToggleNotificacaoNavegador = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Seu navegador não oferece suporte a notificações nativas.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert(
        'As notificações estão bloqueadas nas configurações do navegador. Clique no cadeado ao lado do endereço do site para permitir.'
      );
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const res = await Notification.requestPermission();
        setPermissaoNavegador(res);
        const habilitado = res === 'granted';
        setNotificacoesNavegadorAtivo(habilitado);
        localStorage.setItem('tsystem_notificacoes_navegador', habilitado ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('tsystem:notificacoes-sync'));
        if (habilitado) {
          new Notification('Notificações Ativadas 🔔', {
            body: 'Você receberá alertas em tempo real de pedidos prontos e avisos operacionais.',
            icon: '/favicon.ico'
          });
        }
      } catch {
        // Ignora
      }
      return;
    }

    const novo = !notificacoesNavegadorAtivo;
    setNotificacoesNavegadorAtivo(novo);
    try {
      localStorage.setItem('tsystem_notificacoes_navegador', novo ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('tsystem:notificacoes-sync'));
    } catch {
      // Ignora
    }
  };

  // Modal: Gestão Completa da Minha Empresa (Identidade + Dados Cadastrais)
  const [modalEmpresa, setModalEmpresa] = useState<boolean>(false);
  const [nomeFantasia, setNomeFantasia] = useState<string>('');
  const [nomeExibicao, setNomeExibicao] = useState<string>('');
  const [documento, setDocumento] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [emailContato, setEmailContato] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [sucesso, setSucesso] = useState<boolean>(false);

  // Modal: Excluir Conta
  const [modalExcluirConta, setModalExcluirConta] = useState<boolean>(false);
  const [excluindoConta, setExcluindoConta] = useState<boolean>(false);

  const abrirModalEmpresa = () => {
    if (dadosEmpresa) {
      setNomeFantasia(dadosEmpresa.nome_fantasia || '');
      setNomeExibicao(dadosEmpresa.nome_exibicao || '');
      setDocumento(dadosEmpresa.documento ? formatarCpfCnpj(dadosEmpresa.documento) : '');
      setTelefone(dadosEmpresa.telefone ? formatarTelefoneBR(dadosEmpresa.telefone) : '');
      setEmailContato(dadosEmpresa.email_contato || '');
    }
    setErro('');
    setSucesso(false);
    setModalEmpresa(true);
  };

  const handleSalvarEmpresa = async (e: FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nomeFantasia.trim().replace(/\s+/g, ' ');
    const exibicaoLimpa = nomeExibicao.trim().replace(/\s+/g, ' ');
    const docLimpo = extrairDigitos(documento);
    const telLimpo = extrairDigitos(telefone);
    const emailLimpo = emailContato.trim().toLowerCase();

    if (nomeLimpo.length < 3) {
      setErro('O nome do estabelecimento deve ter no mínimo 3 caracteres.');
      return;
    }
    if (exibicaoLimpa.length === 1 || exibicaoLimpa.length > LIMITE_NOME_EXIBICAO) {
      setErro(`O nome de exibição deve ter entre 2 e ${LIMITE_NOME_EXIBICAO} caracteres.`);
      return;
    }
    if (docLimpo && !validarDocumentoBrasil(docLimpo).valido) {
      setErro('CPF ou CNPJ inválido. Verifique os dígitos informados.');
      return;
    }
    if (telLimpo && !validarTelefoneBR(telLimpo)) {
      setErro('Telefone / WhatsApp inválido. Digite DDD + número completo.');
      return;
    }
    if (emailLimpo && !validarEmail(emailLimpo)) {
      setErro('E-mail de contato comercial inválido.');
      return;
    }

    setSalvando(true);
    setErro('');
    setSucesso(false);

    try {
      await atualizarDadosMinhaEmpresa({
        nome_fantasia: nomeLimpo,
        nome_exibicao: exibicaoLimpa || undefined,
        documento: docLimpo || undefined,
        telefone: telLimpo || undefined,
        email_contato: emailLimpo || undefined
      });

      setSucesso(true);
      setTimeout(() => {
        setModalEmpresa(false);
      }, 900);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar os dados. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleObterSuporte = () => {
    const nomeEstab = dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA;
    const msg = `Olá! Preciso de suporte no sistema para o estabelecimento *${nomeEstab}*.`;
    const digitos = whatsappSuporte.replace(/\D/g, '');
    const numeroFinal = digitos.startsWith('55') ? digitos : `55${digitos}`;
    const url = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLogout = () => {
    setGarcomLogado(null);
    navigate('/login');
  };

  const handleConfirmarExclusaoConta = async () => {
    if (!dadosEmpresa?.id) return;
    setExcluindoConta(true);
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ status_assinatura: 'suspensa' })
        .eq('id', dadosEmpresa.id);

      if (error) throw error;

      setModalExcluirConta(false);
      setGarcomLogado(null);
      navigate('/login');
    } catch {
      alert('Não foi possível processar o encerramento agora. Entre em contato com o suporte.');
    } finally {
      setExcluindoConta(false);
    }
  };

  const nomePreview = nomeExibicao.trim() || nomeFantasia.trim() || NOME_PADRAO_SISTEMA;
  const previewPersonalizado = nomeExibicao.trim().length > 0;

  return (
    <div className="min-h-dvh bg-white font-sans flex flex-col relative antialiased text-slate-800 md:pl-18">
      {/* HEADER GLOBAL */}
      <Header />

      {/* CONTEÚDO PRINCIPAL — ESTILO SETTINGS MINIMALISTA */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 pt-22 pb-28 md:pt-24 md:pb-12">
        {/* Cabeçalho da Página */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight">
            Configurações
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* COLUNA PRINCIPAL: MEU PERFIL + GESTÃO & ESTABELECIMENTO */}
          <div className="lg:col-span-7 space-y-4">
            {/* GRUPO 1: MEU PERFIL, GESTÃO & ESTABELECIMENTO */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => navigate('/perfil')}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.UserRound size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Meu Perfil</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">Dados, acesso e foto</span>
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/financeiro')}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.Wallet size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Financeiro</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">Caixa, métricas e relatórios</span>
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/estoque')}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.Package size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Estoque</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">Produtos e cardápio</span>
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/equipe')}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.Users size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Usuários</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">Garçons e acessos</span>
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={abrirModalEmpresa}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.Store size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Minha Empresa</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 truncate max-w-36 sm:max-w-48">
                    {dadosEmpresa?.nome_exibicao || dadosEmpresa?.nome_fantasia || 'Editar dados'}
                  </span>
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/assinatura')}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.CreditCard size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Assinatura</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">
                    {dadosEmpresa?.status_assinatura === 'ativa'
                      ? 'Plano ativo'
                      : dadosEmpresa?.status_assinatura === 'degustacao'
                        ? 'Período de teste'
                        : 'Ver fatura e plano'}
                  </span>
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>
            </div>
          </div>

          {/* COLUNA SECUNDÁRIA: IDENTIDADE (DESKTOP), NOTIFICAÇÕES, IMPRESSORA, SUPORTE & SESSÃO */}
          <div className="lg:col-span-5 space-y-4">
            {/* RESUMO RÁPIDO DO PERFIL LOGADO (DESKTOP) */}
            {garcomLogado && (
              <div className="hidden lg:block bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5">
                <button
                  type="button"
                  onClick={() => navigate('/perfil')}
                  className="group w-full bg-white hover:bg-slate-50/60 rounded-3xl border border-slate-200/50 p-4 flex items-center justify-between gap-3 transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <AvatarUsuario
                      avatar={garcomLogado.avatar}
                      nome={garcomLogado.nome}
                      className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200/90 shadow-inner"
                      emojiClassName="text-2xl"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{garcomLogado.nome}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {garcomLogado.email || (garcomLogado.cargo === 'super_admin' ? 'Super Admin' : 'Administrador')}
                      </p>
                    </div>
                  </div>
                  <span className="h-8 px-3 rounded-full bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-xs font-medium text-slate-700 flex items-center gap-1 transition-colors shrink-0">
                    <span>Editar</span>
                    <LucideIcons.ChevronRight size={14} strokeWidth={1.8} />
                  </span>
                </button>
              </div>
            )}

            {/* GRUPO 2: NOTIFICAÇÕES & IMPRESSORA */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={() => setModalNotificacoes(true)}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.Bell size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Notificações</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">
                    {alertaSonoroAtivo ? 'Som ativo' : 'Silenciado'}
                  </span>
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/impressora')}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.Printer size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Impressora</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">
                    {configImpressora.dispositivoPareadoNome || `Bobina ${configImpressora.larguraPapel}`}
                  </span>
                  <LucideIcons.ChevronRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>
            </div>

            {/* GRUPO 3: SUPORTE */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={handleObterSuporte}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.LifeBuoy size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Obtenha suporte</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 hidden sm:inline">WhatsApp</span>
                  <LucideIcons.ArrowUpRight
                    size={15}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all"
                  />
                </div>
              </button>
            </div>

            {/* GRUPO 4: SESSÃO & ENCERRAMENTO */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5 space-y-0.5">
              <button
                type="button"
                onClick={handleLogout}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.LogOut size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                  <span className="text-sm font-normal text-slate-800 truncate">Fazer logout</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModalExcluirConta(true)}
                className="group w-full flex items-center justify-between px-4 py-3 rounded-4xl hover:bg-rose-50/70 transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <LucideIcons.Trash2
                    size={18}
                    strokeWidth={1.8}
                    className="text-slate-700 group-hover:text-rose-600 transition-colors shrink-0"
                  />
                  <span className="text-sm font-normal text-slate-800 group-hover:text-rose-600 transition-colors truncate">
                    Excluir conta
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: PREFERÊNCIAS DE NOTIFICAÇÕES */}
      {modalNotificacoes && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setModalNotificacoes(false)}
        >
          <div
            className="relative w-full max-w-xs sm:max-w-md bg-white rounded-3xl border border-slate-100 ring-1 ring-slate-900/5 shadow-2xl shadow-slate-900/15 max-h-[82dvh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-150 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-slate-50/70 to-transparent"
            />

            <div className="relative z-10 px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/70 shadow-2xs flex items-center justify-center shrink-0">
                  <LucideIcons.Bell size={17} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900 tracking-tight leading-tight truncate">
                    Notificações e Alertas
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    Avisos sonoros e alertas em tempo real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNotificacoes(false)}
                aria-label="Fechar"
                className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <LucideIcons.X size={14} />
              </button>
            </div>

            <div className="relative z-10 p-4 space-y-2.5 overflow-y-auto">
              {/* Alerta Sonoro */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {alertaSonoroAtivo ? (
                      <LucideIcons.Volume2 size={15} strokeWidth={1.8} className="text-amber-600" />
                    ) : (
                      <LucideIcons.VolumeX size={15} strokeWidth={1.8} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">Alerta Sonoro</p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Aviso sonoro quando pedidos ficam prontos.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={alertaSonoroAtivo}
                  onClick={handleToggleSom}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    alertaSonoroAtivo ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      alertaSonoroAtivo ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Notificações Nativas do Navegador */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <LucideIcons.BellRing
                      size={15}
                      strokeWidth={1.8}
                      className={
                        notificacoesNavegadorAtivo && permissaoNavegador === 'granted'
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">Notificações do Dispositivo</p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                      Exibe alertas na tela mesmo em segundo plano.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificacoesNavegadorAtivo && permissaoNavegador === 'granted'}
                  onClick={handleToggleNotificacaoNavegador}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    notificacoesNavegadorAtivo && permissaoNavegador === 'granted'
                      ? 'bg-emerald-600'
                      : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                      notificacoesNavegadorAtivo && permissaoNavegador === 'granted'
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Botão de Teste de Som */}
              <button
                type="button"
                onClick={tocarSomTeste}
                className="w-full h-9 rounded-full border border-slate-200/90 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <LucideIcons.Play size={13} strokeWidth={1.8} className="text-slate-500" />
                <span>Testar som de alerta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTÃO DA MINHA EMPRESA (DADOS CADASTRAIS + IDENTIDADE) */}
      {modalEmpresa && isAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-150"
          onClick={() => !salvando && setModalEmpresa(false)}
        >
          <div
            className="relative w-full max-w-xs sm:max-w-md bg-white rounded-3xl border border-slate-100 ring-1 ring-slate-900/5 shadow-2xl shadow-slate-900/15 max-h-[85dvh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-150 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Brilho especular 5D superior */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-b from-slate-50/70 to-transparent"
            />

            {/* Cabeçalho compacto */}
            <div className="relative z-10 px-4 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-slate-50 text-slate-600 border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
                  <LucideIcons.Store size={17} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900 tracking-tight leading-tight truncate">
                    Minha Empresa
                  </h2>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5">
                    Identidade e dados cadastrais
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !salvando && setModalEmpresa(false)}
                aria-label="Fechar"
                className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <LucideIcons.X size={14} />
              </button>
            </div>

            {/* Corpo rolável compacto */}
            <form onSubmit={handleSalvarEmpresa} className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3">
              {/* PRÉ-VISUALIZAÇÃO AO VIVO DO HEADER */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block mb-1.5 pl-0.5">
                  Pré-visualização do Header
                </span>
                <div className="h-10 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center justify-between px-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <LucideIcons.Umbrella size={15} strokeWidth={1.8} className="text-slate-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-medium uppercase text-slate-700 tracking-wide leading-none truncate">
                        {nomePreview}
                      </span>
                      {previewPersonalizado && (
                        <span className="text-[9px] uppercase text-slate-400 leading-none mt-0.5">
                          {NOME_PADRAO_SISTEMA}
                        </span>
                      )}
                    </div>
                  </div>
                  <LucideIcons.Bell size={14} strokeWidth={1.8} className="text-slate-300 shrink-0" />
                </div>
              </div>

              {/* Nome Oficial e Nome de Exibição */}
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <label htmlFor="nome-fantasia" className="text-[11px] font-medium text-slate-600 pl-0.5 block">
                    Nome do Estabelecimento *
                  </label>
                  <input
                    id="nome-fantasia"
                    type="text"
                    required
                    value={nomeFantasia}
                    onChange={(e) => {
                      setNomeFantasia(e.target.value);
                      setErro('');
                    }}
                    placeholder="Ex: Barraca Coral Beach"
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between px-0.5">
                    <label htmlFor="nome-exibicao" className="text-[11px] font-medium text-slate-600">
                      Nome no Header (Branding)
                    </label>
                    <span className="text-[10px] text-slate-400 tabular-nums">
                      {nomeExibicao.length}/{LIMITE_NOME_EXIBICAO}
                    </span>
                  </div>
                  <input
                    id="nome-exibicao"
                    type="text"
                    maxLength={LIMITE_NOME_EXIBICAO}
                    value={nomeExibicao}
                    onChange={(e) => {
                      setNomeExibicao(e.target.value);
                      setErro('');
                    }}
                    placeholder={`Deixe vazio para usar "${NOME_PADRAO_SISTEMA}"`}
                    className="w-full h-9 px-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Documento e Telefone em 2 colunas */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label htmlFor="documento-empresa" className="text-[11px] font-medium text-slate-600 pl-0.5 block">
                    CPF ou CNPJ
                  </label>
                  <input
                    id="documento-empresa"
                    type="text"
                    inputMode="numeric"
                    value={documento}
                    onChange={(e) => {
                      setDocumento(formatarCpfCnpj(e.target.value));
                      setErro('');
                    }}
                    placeholder="00.000.000/0000-00"
                    className="w-full h-9 px-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 tabular-nums placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="telefone-empresa" className="text-[11px] font-medium text-slate-600 pl-0.5 block">
                    WhatsApp / Telefone
                  </label>
                  <input
                    id="telefone-empresa"
                    type="tel"
                    inputMode="numeric"
                    value={telefone}
                    onChange={(e) => {
                      setTelefone(formatarTelefoneBR(e.target.value));
                      setErro('');
                    }}
                    placeholder="(00) 00000-0000"
                    className="w-full h-9 px-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 tabular-nums placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* E-mail de Contato Comercial */}
              <div className="space-y-1">
                <label htmlFor="email-empresa" className="text-[11px] font-medium text-slate-600 pl-0.5 block">
                  E-mail Oficial da Empresa
                </label>
                <div className="relative">
                  <LucideIcons.Mail size={14} strokeWidth={1.8} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email-empresa"
                    type="email"
                    value={emailContato}
                    onChange={(e) => {
                      setEmailContato(e.target.value);
                      setErro('');
                    }}
                    placeholder="contato@barracacoral.com"
                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-2 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Informações da Licença Atual */}
              {dadosEmpresa?.status_assinatura && (
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <LucideIcons.ShieldCheck size={13} strokeWidth={1.8} className="text-emerald-600 shrink-0" />
                    <span>
                      {dadosEmpresa.status_assinatura === 'ativa'
                        ? 'Plano Ativo'
                        : dadosEmpresa.status_assinatura === 'degustacao'
                          ? 'Degustação (Trial)'
                          : 'Aguardando Ativação'}
                    </span>
                  </span>
                  {dadosEmpresa.data_vencimento && (
                    <span className="tabular-nums text-slate-400">
                      Vence {new Date(dadosEmpresa.data_vencimento).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              )}

              {/* Feedback de Erro ou Sucesso */}
              {erro && (
                <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  <LucideIcons.AlertCircle size={14} className="shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              {sucesso && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                  <LucideIcons.CheckCircle2 size={14} className="shrink-0" />
                  <span>Dados atualizados com sucesso!</span>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => setModalEmpresa(false)}
                  className="h-9 px-3.5 rounded-full border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-medium text-slate-600 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="h-9 px-4 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {salvando ? (
                    <>
                      <LucideIcons.Loader2 size={14} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <LucideIcons.Check size={14} strokeWidth={2} />
                      <span>Salvar alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO: EXCLUIR CONTA */}
      <ModalConfirmacao
        aberto={modalExcluirConta}
        titulo="Encerrar conta do estabelecimento?"
        descricao="Ao confirmar, o acesso do estabelecimento será suspenso imediatamente e sua sessão será desconectada. Para reativar no futuro, será necessário contatar o suporte."
        textoConfirmar="Sim, encerrar conta"
        textoCancelar="Cancelar"
        tipo="perigo"
        carregando={excluindoConta}
        onConfirmar={handleConfirmarExclusaoConta}
        onCancelar={() => setModalExcluirConta(false)}
      />
    </div>
  );
}
