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
    <div className="min-h-screen bg-white font-sans flex flex-col relative antialiased text-slate-800">
      {/* HEADER GLOBAL */}
      <Header />

      {/* CONTEÚDO PRINCIPAL — ESTILO SETTINGS MINIMALISTA */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 pt-22 pb-28 md:pt-24 md:pb-12 md:pl-24">
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
                  <span className="text-xs text-slate-400 hidden sm:inline">Caixa, metas e relatórios</span>
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
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
          onClick={() => setModalNotificacoes(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 p-6 pb-8 sm:pb-6 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4 sm:hidden" />

            <div className="flex items-start justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200/80 flex items-center justify-center shrink-0">
                  <LucideIcons.Bell size={20} strokeWidth={1.9} />
                </div>
                <div>
                  <h2 className="text-base font-medium text-slate-900 tracking-tight">
                    Notificações e Alertas
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure avisos sonoros e notificações em tempo real.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNotificacoes(false)}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <LucideIcons.X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Alerta Sonoro */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    {alertaSonoroAtivo ? (
                      <LucideIcons.Volume2 size={16} className="text-yellow-600" />
                    ) : (
                      <LucideIcons.VolumeX size={16} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">Alerta Sonoro</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Toca um aviso sonoro quando pedidos ficam prontos no bar ou cozinha.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={alertaSonoroAtivo}
                  onClick={handleToggleSom}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    alertaSonoroAtivo ? 'bg-yellow-500' : 'bg-slate-200'
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
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <LucideIcons.BellRing
                      size={16}
                      className={
                        notificacoesNavegadorAtivo && permissaoNavegador === 'granted'
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-800">Notificações do Dispositivo</p>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      Exibe alertas na tela do celular ou computador mesmo em segundo plano.
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
                      ? 'bg-emerald-500'
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
                className="w-full h-10 rounded-4xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <LucideIcons.Play size={14} className="text-yellow-600" />
                <span>Testar som de alerta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTÃO DA MINHA EMPRESA (DADOS CADASTRAIS + IDENTIDADE) */}
      {modalEmpresa && isAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200"
          onClick={() => !salvando && setModalEmpresa(false)}
        >
          <div
            className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 p-6 pb-8 sm:pb-6 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 font-sans max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4 sm:hidden" />

            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-yellow-50 text-yellow-600 border border-yellow-200/80 flex items-center justify-center shrink-0">
                  <LucideIcons.Store size={20} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-medium text-slate-900 tracking-tight leading-tight truncate">
                    Minha Empresa
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate">
                    Identidade do sistema e dados cadastrais oficiais do estabelecimento.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !salvando && setModalEmpresa(false)}
                aria-label="Fechar"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <LucideIcons.X size={16} />
              </button>
            </div>

            {/* PRÉ-VISUALIZAÇÃO AO VIVO DO HEADER */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 mb-5">
              <span className="text-xs font-medium text-slate-400 block mb-2 pl-0.5">
                Pré-visualização do Header
              </span>
              <div className="h-12 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between px-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <LucideIcons.Umbrella size={18} strokeWidth={2.2} className="text-yellow-600 shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-normal uppercase text-slate-600 tracking-wide leading-none truncate">
                      {nomePreview}
                    </span>
                    {previewPersonalizado && (
                      <span className="text-[9px] uppercase text-yellow-800 leading-none">
                        {NOME_PADRAO_SISTEMA}
                      </span>
                    )}
                  </div>
                </div>
                <LucideIcons.Bell size={16} className="text-slate-300 shrink-0" />
              </div>
            </div>

            <form onSubmit={handleSalvarEmpresa} className="space-y-4">
              {/* Nome Oficial e Nome de Exibição */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="nome-fantasia" className="text-xs font-medium text-slate-700 pl-0.5">
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
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between px-0.5">
                    <label htmlFor="nome-exibicao" className="text-xs font-medium text-slate-700">
                      Nome no Header (Branding Personalizado)
                    </label>
                    <span className="text-[11px] text-slate-400 tabular-nums">
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
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 pl-0.5">
                    O nome que os colaboradores verão no topo de todas as páginas do sistema.
                  </p>
                </div>
              </div>

              {/* Documento e Telefone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label htmlFor="documento-empresa" className="text-xs font-medium text-slate-700 pl-0.5">
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
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="telefone-empresa" className="text-xs font-medium text-slate-700 pl-0.5">
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
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 tabular-nums placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* E-mail de Contato Comercial */}
              <div className="space-y-1">
                <label htmlFor="email-empresa" className="text-xs font-medium text-slate-700 pl-0.5">
                  E-mail Oficial da Empresa
                </label>
                <div className="relative">
                  <LucideIcons.Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email-empresa"
                    type="email"
                    value={emailContato}
                    onChange={(e) => {
                      setEmailContato(e.target.value);
                      setErro('');
                    }}
                    placeholder="contato@barracacoral.com"
                    className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Informações da Licença Atual */}
              {dadosEmpresa?.status_assinatura && (
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <LucideIcons.ShieldCheck size={14} className="text-emerald-500" />
                      Status do Plano:
                    </span>
                    <span className="font-medium capitalize text-slate-900">
                      {dadosEmpresa.status_assinatura === 'ativa'
                        ? 'Plano Ativo'
                        : dadosEmpresa.status_assinatura === 'degustacao'
                          ? 'Período de Degustação (Trial)'
                          : 'Aguardando Ativação'}
                    </span>
                  </div>
                  {dadosEmpresa.data_vencimento && (
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Vencimento da Licença:</span>
                      <span className="tabular-nums font-medium text-slate-700">
                        {new Date(dadosEmpresa.data_vencimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback de Erro ou Sucesso */}
              {erro && (
                <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5">
                  <LucideIcons.AlertCircle size={15} className="shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              {sucesso && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
                  <LucideIcons.CheckCircle2 size={15} className="shrink-0" />
                  <span>Dados do estabelecimento atualizados com sucesso!</span>
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => setModalEmpresa(false)}
                  className="h-10 px-4 rounded-4xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="h-10 px-5 rounded-4xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-slate-900/20 cursor-pointer"
                >
                  {salvando ? (
                    <>
                      <LucideIcons.Loader2 size={15} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <LucideIcons.Check size={15} />
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
