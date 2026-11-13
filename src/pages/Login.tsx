// src/pages/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { VitrineSistemaDesktop } from '../components/VitrineSistemaDesktop';
import { BotaoWhatsappFlutuante } from '../components/BotaoWhatsappFlutuante';
import {
  carregarConfiguracaoGlobalSaaS,
  obterConfiguracaoGlobalLocal,
  obterUrlBaseSistema,
  type ConfiguracaoGlobalSaaS,
} from '../utils/configuracoesSaaS';

const STORAGE_SAVED_EMAIL = 'tsystem_saved_email';
const STORAGE_REMEMBER_ME = 'tsystem_remember_me';
const SESSION_ACTIVE_TAB = 'tsystem_active_tab_session';
const SESSION_PASSWORD_RECOVERY = 'tsystem_password_recovery_mode';
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_SEGUNDOS = 30;

type ModoTelaLogin = 'login' | 'recuperar' | 'redefinir';

function detectarModoRecuperacaoInicial(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  const search = window.location.search;
  return (
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    search.includes('modo=redefinir-senha') ||
    sessionStorage.getItem(SESSION_PASSWORD_RECOVERY) === 'true'
  );
}

export function Login() {
  const navigate = useNavigate();
  const contexto = useAppContext();

  const [modoTela, setModoTela] = useState<ModoTelaLogin>(() =>
    detectarModoRecuperacaoInicial() ? 'redefinir' : 'login'
  );

  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem(STORAGE_SAVED_EMAIL) || '';
  });
  const [senha, setSenha] = useState<string>('');
  const [mostrarSenha, setMostrarSenha] = useState<boolean>(false);
  const [manterConectado, setManterConectado] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_REMEMBER_ME) !== 'false';
  });

  // Estados exclusivos para Recuperação / Redefinição de Senha
  const [novaSenha, setNovaSenha] = useState<string>('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState<string>('');
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState<boolean>(false);
  const [mostrarConfirmarNovaSenha, setMostrarConfirmarNovaSenha] = useState<boolean>(false);
  const [sucessoMensagem, setSucessoMensagem] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [capsLockAtivo, setCapsLockAtivo] = useState<boolean>(false);
  const [tentativasFalhas, setTentativasFalhas] = useState<number>(0);
  const [bloqueioSegundos, setBloqueioSegundos] = useState<number>(0);
  const [avisoConfirmacaoFechado, setAvisoConfirmacaoFechado] = useState<boolean>(false);
  const [configSaaS, setConfigSaaS] = useState<ConfiguracaoGlobalSaaS>(() =>
    obterConfiguracaoGlobalLocal()
  );

  useEffect(() => {
    let cancelado = false;
    carregarConfiguracaoGlobalSaaS().then((remota) => {
      if (!cancelado) setConfigSaaS(remota);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  // Escuta eventos PASSWORD_RECOVERY do Supabase caso o token seja processado após a montagem
  useEffect(() => {
    if (detectarModoRecuperacaoInicial()) {
      sessionStorage.setItem(SESSION_PASSWORD_RECOVERY, 'true');
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem(SESSION_PASSWORD_RECOVERY, 'true');
        setErro('');
        setSucessoMensagem('');
        setModoTela('redefinir');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isUrlRecuperacao = detectarModoRecuperacaoInicial() || modoTela === 'redefinir';

  const confirmacaoEmailVisivel =
    !avisoConfirmacaoFechado &&
    !isUrlRecuperacao &&
    typeof window !== 'undefined' &&
    (window.location.search.includes('confirmado=sucesso') ||
      window.location.search.includes('token_hash=') ||
      window.location.hash.includes('type=signup') ||
      window.location.hash.includes('access_token=') ||
      sessionStorage.getItem('tsystem_email_confirmado_aviso') === 'true');

  const fecharAvisoConfirmacao = () => {
    setAvisoConfirmacaoFechado(true);
    sessionStorage.removeItem('tsystem_email_confirmado_aviso');
    if (typeof window !== 'undefined') {
      const emailSalvo = localStorage.getItem(STORAGE_SAVED_EMAIL);
      if (emailSalvo && !email) {
        setEmail(emailSalvo);
      }
      window.history.replaceState({}, '', '/login');
    }
  };

  useEffect(() => {
    // Enquanto o usuário estiver redefinindo a senha via link de recuperação, não redireciona automaticamente
    if (
      modoTela === 'redefinir' ||
      sessionStorage.getItem(SESSION_PASSWORD_RECOVERY) === 'true'
    ) {
      return;
    }

    if (contexto?.garcomLogado && !contexto.carregandoContexto) {
      const cargo = contexto.garcomLogado.cargo;
      if (cargo === 'super_admin') {
        navigate('/master', { replace: true });
      } else if (!contexto.verificarAcessoLiberado()) {
        navigate('/assinatura-pendente', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [contexto, navigate, modoTela]);

  useEffect(() => {
    if (bloqueioSegundos <= 0) return;
    const timer = setInterval(() => {
      setBloqueioSegundos((atual) => (atual > 1 ? atual - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [bloqueioSegundos]);

  const verificarCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockAtivo(e.getModifierState('CapsLock'));
  };

  const alternarModo = (novoModo: ModoTelaLogin) => {
    setErro('');
    setSucessoMensagem('');
    if (novoModo !== 'redefinir') {
      sessionStorage.removeItem(SESSION_PASSWORD_RECOVERY);
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }
    }
    setModoTela(novoModo);
  };

  const handleSolicitarRecuperacao = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !emailLimpo.includes('@')) {
      setErro('Informe um e-mail válido para receber o link de redefinição.');
      return;
    }

    setLoading(true);
    setErro('');
    setSucessoMensagem('');

    try {
      const redirectUrl = `${obterUrlBaseSistema()}/login?modo=redefinir-senha`;
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
        redirectTo: redirectUrl,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('rate limit') || msg.includes('security purposes') || msg.includes('60 seconds')) {
          setErro('Por segurança, aguarde 60 segundos antes de solicitar um novo link de e-mail.');
        } else {
          setErro(`Não foi possível enviar o e-mail (${error.message}). Tente novamente em instantes.`);
        }
      } else {
        localStorage.setItem(STORAGE_SAVED_EMAIL, emailLimpo);
        setSucessoMensagem(
          `Se a conta ${emailLimpo} estiver cadastrada, enviamos o link de redefinição! Verifique a Caixa de Entrada e a pasta Spam.`
        );
      }
    } catch {
      setErro('Erro de conexão ao solicitar recuperação de senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.trim().length < 6) {
      setErro('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErro('As senhas digitadas não coincidem. Verifique e tente novamente.');
      return;
    }

    setLoading(true);
    setErro('');
    setSucessoMensagem('');

    try {
      const { data: sessaoData } = await supabase.auth.getSession();
      if (!sessaoData?.session) {
        setErro(
          'O link do e-mail expirou ou já foi utilizado. Solicite um novo link clicando em "Enviar novo link" abaixo.'
        );
        setLoading(false);
        return;
      }

      const { data: updateData, error } = await supabase.auth.updateUser({
        password: novaSenha.trim(),
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('different from the old password') || msg.includes('same_password')) {
          setErro('A nova senha deve ser diferente da senha anterior.');
        } else {
          setErro('Não foi possível atualizar a senha. Solicite um novo link de recuperação.');
        }
        setLoading(false);
        return;
      }

      const emailAtualizado = updateData.user?.email?.trim().toLowerCase() || email.trim().toLowerCase();
      sessionStorage.removeItem(SESSION_PASSWORD_RECOVERY);
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/login');
      }

      if (emailAtualizado) {
        setEmail(emailAtualizado);
        localStorage.setItem(STORAGE_SAVED_EMAIL, emailAtualizado);
      }

      setSenha(novaSenha.trim());
      setNovaSenha('');
      setConfirmarNovaSenha('');

      // Autentica imediatamente na aplicação para abrir o painel sem fricção
      if (emailAtualizado && contexto?.autenticarUsuario) {
        const autenticado = await contexto.autenticarUsuario(emailAtualizado, novaSenha.trim());
        if (autenticado) {
          setModoTela('login');
          setLoading(false);
          return;
        }
      }

      setSucessoMensagem('Sua nova senha foi salva com sucesso! Clique em Entrar para acessar.');
      setModoTela('login');
    } catch {
      setErro('Ocorreu um erro inesperado ao salvar sua nova senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (bloqueioSegundos > 0) return;

    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !senha.trim()) {
      setErro('Preencha seu e-mail e senha para continuar.');
      return;
    }

    setLoading(true);
    setErro('');
    setSucessoMensagem('');

    try {
      sessionStorage.setItem(SESSION_ACTIVE_TAB, 'true');
      if (manterConectado) {
        localStorage.setItem(STORAGE_REMEMBER_ME, 'true');
        localStorage.setItem(STORAGE_SAVED_EMAIL, emailLimpo);
      } else {
        localStorage.setItem(STORAGE_REMEMBER_ME, 'false');
        localStorage.removeItem(STORAGE_SAVED_EMAIL);
      }

      const sucesso = await contexto?.autenticarUsuario(emailLimpo, senha);

      if (!sucesso) {
        const novasTentativas = tentativasFalhas + 1;
        setTentativasFalhas(novasTentativas);

        if (novasTentativas >= MAX_TENTATIVAS) {
          setBloqueioSegundos(TEMPO_BLOQUEIO_SEGUNDOS);
          setTentativasFalhas(0);
          setErro('Muitas tentativas incorretas. Aguarde 30 segundos por segurança.');
        } else {
          setErro('Credenciais inválidas. Verifique seu e-mail e senha.');
        }
        setLoading(false);
      }
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Erro inesperado ao conectar.';
      setErro(mensagem);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex flex-col justify-center pt-safe pb-safe bg-slate-100 font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white relative overflow-x-hidden">
      {/* ILUMINAÇÃO ATMOSFÉRICA SUTIL DE FUNDO (EFEITO PROFUNDIDADE) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -top-32 left-1/4 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(226, 232, 240, 0.85) 0%, rgba(226, 232, 240, 0) 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-32 right-1/4 w-96 h-96 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%)' }}
      />

      {/* MODAL DE CONFIRMAÇÃO DE E-MAIL */}
      {confirmacaoEmailVisivel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmacao-email"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-300"
        >
          <div className="w-full max-w-sm bg-slate-200/70 border border-slate-200 rounded-4xl p-2 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-white border border-slate-200/90 rounded-4xl p-6 text-center relative">
              <button
                type="button"
                onClick={fecharAvisoConfirmacao}
                aria-label="Fechar aviso"
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <LucideIcons.X size={15} strokeWidth={2.2} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                <LucideIcons.CheckCircle2 size={24} strokeWidth={2} />
              </div>

              <span className="inline-block text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-1">
                Verificação Concluída
              </span>

              <h3
                id="titulo-confirmacao-email"
                className="text-base font-semibold text-slate-900 tracking-tight leading-snug mb-2"
              >
                Seu e-mail e cadastro foram confirmados
              </h3>

              <p className="text-xs text-slate-500 leading-relaxed mb-5">
                Sua conta está validada. Entre com seu e-mail e senha abaixo para acessar a página de contratação da{' '}
                <strong className="font-medium text-slate-800">Assinatura Premium</strong>.
              </p>

              <button
                type="button"
                onClick={fecharAvisoConfirmacao}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs uppercase tracking-wider rounded-full shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continuar para o Login</span>
                <LucideIcons.ArrowRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTAINER PRINCIPAL (PREENCHIDO NO DESKTOP & 100% RESPONSIVO NO CELULAR) */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 relative z-10">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* COLUNA ESQUERDA: VITRINE INTERATIVA DO SISTEMA (DESKTOP 7 COLUNAS) */}
          <VitrineSistemaDesktop />

          {/* COLUNA DIREITA: CARD DE AUTENTICAÇÃO BENTO 5D (5 COLUNAS NO DESKTOP, 100% NO MOBILE) */}
          <div className="w-full max-w-md mx-auto lg:max-w-none lg:col-span-5 flex flex-col justify-center">
            {/* Moldura Externa Esculpida (Bento Tray 5D) */}
            <div className="w-full h-full bg-slate-200/60 border border-slate-200/90 rounded-4xl p-2 shadow-inner flex flex-col">
              {/* Superfície Elevada Principal */}
              <div className="w-full flex-1 bg-white border border-slate-200/80 rounded-4xl shadow-xl shadow-slate-300/50 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Topo Mobile / Badge de Status */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-medium text-slate-600 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Acesso Seguro</span>
                    </span>

                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <LucideIcons.ShieldCheck size={14} className="text-emerald-600" />
                      <span>SSL Ativo</span>
                    </span>
                  </div>

                  {/* Identidade Principal */}
                  <div className="flex items-center gap-3.5 sm:gap-4 mb-6">
                    <div className="w-11 h-11 rounded-4xl bg-amber-500 border border-amber-500 flex items-center justify-center text-amber-100 shadow-md shadow-slate-900/15 shrink-0">
                      {modoTela === 'redefinir' ? (
                        <LucideIcons.KeyRound size={20} strokeWidth={2.4} />
                      ) : modoTela === 'recuperar' ? (
                        <LucideIcons.MailCheck size={20} strokeWidth={2.4} />
                      ) : (
                        <LucideIcons.Umbrella size={21} strokeWidth={2.5} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="block text-[11px] font-sans uppercase tracking-widest text-slate-400 truncate">
                        {configSaaS.nomeSistema}
                      </span>
                      <h2 className="text-[14px] sm:text-lg font-sans text-slate-600 tracking-tight truncate">
                        {modoTela === 'redefinir'
                          ? 'Criar Nova Senha'
                          : modoTela === 'recuperar'
                            ? 'Recuperar Acesso'
                            : configSaaS.subtituloLogin}
                      </h2>
                    </div>
                  </div>

                  {/* MODO 1: FORMULÁRIO PADRÃO DE AUTENTICAÇÃO */}
                  {modoTela === 'login' && (
                    <form onSubmit={handleLogin} className="space-y-4" noValidate>
                      {/* Campo E-mail */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="login-email"
                          className="block text-xs font-sans text-slate-600 pl-1"
                        >
                          E-mail
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                            <LucideIcons.Mail size={17} strokeWidth={1.9} />
                          </div>
                          <input
                            id="login-email"
                            type="email"
                            inputMode="email"
                            autoComplete="username"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="seuemail@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 bg-slate-100/75 hover:bg-slate-100 focus:bg-white border border-slate-200/90 focus:border-slate-900 text-slate-900 text-sm font-normal rounded-3xl pl-11 pr-4 outline-none shadow-inner focus:shadow-sm transition-all placeholder:text-slate-400"
                            required
                          />
                        </div>
                      </div>

                      {/* Campo Senha */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 px-1">
                          <label
                            htmlFor="login-senha"
                            className="block text-xs font-sans text-slate-600 shrink-0"
                          >
                            Senha
                          </label>
                          <div className="flex items-center gap-2 min-w-0">
                            {capsLockAtivo && (
                              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-sans text-slate-500 animate-in fade-in shrink-0">
                                <LucideIcons.ArrowBigUpDash size={12} /> Caps Lock
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => alternarModo('recuperar')}
                              className="text-[11px] font-sans text-slate-500 hover:text-slate-900 underline underline-offset-2 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Esqueceu a senha?
                            </button>
                          </div>
                        </div>

                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                            <LucideIcons.Lock size={17} strokeWidth={1.9} />
                          </div>
                          <input
                            id="login-senha"
                            type={mostrarSenha ? 'text' : 'password'}
                            autoComplete="current-password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            onKeyUp={verificarCapsLock}
                            onKeyDown={verificarCapsLock}
                            placeholder="••••••••"
                            className="w-full h-12 bg-slate-100/75 hover:bg-slate-100 focus:bg-white border border-slate-200/90 focus:border-slate-900 text-slate-900 text-sm font-normal rounded-3xl pl-11 pr-12 outline-none shadow-inner focus:shadow-sm transition-all placeholder:text-slate-400"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarSenha((prev) => !prev)}
                            aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha digitada'}
                            title={mostrarSenha ? 'Ocultar senha' : 'Ver senha digitada'}
                            className="absolute inset-y-1.5 right-1.5 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:scale-90 transition-all cursor-pointer"
                          >
                            {mostrarSenha ? (
                              <LucideIcons.EyeOff size={17} strokeWidth={1.9} />
                            ) : (
                              <LucideIcons.Eye size={17} strokeWidth={1.9} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Opção Manter Conectado */}
                      <div className="flex items-center justify-between pt-1 px-1 gap-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={manterConectado}
                          onClick={() => setManterConectado((prev) => !prev)}
                          className="group inline-flex items-center gap-2.5 text-left select-none cursor-pointer py-1 min-w-0"
                        >
                          <span
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all duration-200 shadow-2xs shrink-0 ${
                              manterConectado
                                ? 'bg-amber-600 border-amber-700 text-white'
                                : 'bg-slate-100 border-slate-300 text-transparent group-hover:border-slate-400'
                            }`}
                          >
                            <LucideIcons.Check size={12} strokeWidth={3} />
                          </span>
                          <span className="text-xs font-sans text-slate-600 group-hover:text-slate-900 transition-colors truncate">
                            Manter conectado neste aparelho
                          </span>
                        </button>
                      </div>

                      {/* Alerta de Sucesso */}
                      {sucessoMensagem && (
                        <div className="flex items-start gap-2.5 text-emerald-800 bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-2xl animate-in zoom-in-95 duration-200">
                          <LucideIcons.CheckCircle2
                            size={17}
                            strokeWidth={2}
                            className="shrink-0 mt-0.5 text-emerald-600"
                          />
                          <span className="text-xs font-sans leading-relaxed">{sucessoMensagem}</span>
                        </div>
                      )}

                      {/* Alerta de Erro */}
                      {erro && (
                        <div className="flex items-start gap-2.5 text-rose-700 bg-rose-50 border border-rose-200/80 p-3.5 rounded-2xl animate-in zoom-in-95 duration-200">
                          <LucideIcons.AlertCircle
                            size={17}
                            strokeWidth={2}
                            className="shrink-0 mt-0.5 text-rose-600"
                          />
                          <span className="text-xs font-sans leading-relaxed">{erro}</span>
                        </div>
                      )}

                      {/* Botão Principal de Acesso */}
                      <button
                        type="submit"
                        disabled={loading || bloqueioSegundos > 0}
                        className="w-full h-10 mt-1 bg-slate-600 hover:bg-slate-800 text-white font-medium text-xs uppercase tracking-wider rounded-full shadow-lg shadow-slate-900/15 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <LucideIcons.Loader2 size={17} className="animate-spin" />
                            <span>Entrando</span>
                          </>
                        ) : bloqueioSegundos > 0 ? (
                          <>
                            <LucideIcons.Timer size={17} />
                            <span>Aguarde {bloqueioSegundos}s</span>
                          </>
                        ) : (
                          <>
                            <span>Entrar</span>
                            <LucideIcons.ArrowRight size={16} strokeWidth={2.2} />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* MODO 2: SOLICITAR LINK DE RECUPERAÇÃO POR E-MAIL */}
                  {modoTela === 'recuperar' && (
                    <form onSubmit={handleSolicitarRecuperacao} className="space-y-4 animate-in fade-in duration-200" noValidate>
                      <p className="text-xs text-slate-500 leading-relaxed px-1">
                        Informe o e-mail da sua conta. Enviaremos um link seguro para você definir uma nova senha imediatamente.
                      </p>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="recuperar-email"
                          className="block text-xs font-sans text-slate-600 pl-1"
                        >
                          E-mail da conta
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                            <LucideIcons.Mail size={17} strokeWidth={1.9} />
                          </div>
                          <input
                            id="recuperar-email"
                            type="email"
                            inputMode="email"
                            autoComplete="username"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            placeholder="seuemail@exemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 bg-slate-100/75 hover:bg-slate-100 focus:bg-white border border-slate-200/90 focus:border-slate-900 text-slate-900 text-sm font-normal rounded-3xl pl-11 pr-4 outline-none shadow-inner focus:shadow-sm transition-all placeholder:text-slate-400"
                            required
                          />
                        </div>
                      </div>

                      {sucessoMensagem && (
                        <div className="flex items-start gap-2.5 text-emerald-800 bg-emerald-50 border border-emerald-200/80 p-3.5 rounded-2xl animate-in zoom-in-95 duration-200">
                          <LucideIcons.CheckCircle2
                            size={17}
                            strokeWidth={2}
                            className="shrink-0 mt-0.5 text-emerald-600"
                          />
                          <span className="text-xs font-sans leading-relaxed">{sucessoMensagem}</span>
                        </div>
                      )}

                      {erro && (
                        <div className="flex items-start gap-2.5 text-rose-700 bg-rose-50 border border-rose-200/80 p-3.5 rounded-2xl animate-in zoom-in-95 duration-200">
                          <LucideIcons.AlertCircle
                            size={17}
                            strokeWidth={2}
                            className="shrink-0 mt-0.5 text-rose-600"
                          />
                          <span className="text-xs font-sans leading-relaxed">{erro}</span>
                        </div>
                      )}

                      <div className="space-y-2.5 pt-1">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs uppercase tracking-wider rounded-full shadow-lg shadow-slate-900/15 hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <>
                              <LucideIcons.Loader2 size={17} className="animate-spin" />
                              <span>Enviando link</span>
                            </>
                          ) : (
                            <>
                              <span>Enviar link de recuperação</span>
                              <LucideIcons.Send size={15} strokeWidth={2.2} />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => alternarModo('login')}
                          className="w-full h-10 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium text-xs rounded-full border border-slate-200/80 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LucideIcons.ArrowLeft size={15} strokeWidth={2} />
                          <span>Voltar para o Login</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* MODO 3: CRIAR NOVA SENHA (ABERTO PELO LINK DO E-MAIL) */}
                  {modoTela === 'redefinir' && (
                    <form onSubmit={handleSalvarNovaSenha} className="space-y-4 animate-in fade-in duration-200" noValidate>
                      <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5">
                        <LucideIcons.ShieldCheck size={17} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-700 leading-relaxed">
                          Link de segurança validado. Escolha sua nova senha abaixo (mínimo de 6 caracteres) para liberar seu acesso.
                        </p>
                      </div>

                      {/* Campo Nova Senha */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="nova-senha"
                          className="block text-xs font-sans text-slate-600 pl-1"
                        >
                          Nova senha
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                            <LucideIcons.Lock size={17} strokeWidth={1.9} />
                          </div>
                          <input
                            id="nova-senha"
                            type={mostrarNovaSenha ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full h-12 bg-slate-100/75 hover:bg-slate-100 focus:bg-white border border-slate-200/90 focus:border-slate-900 text-slate-900 text-sm font-normal rounded-3xl pl-11 pr-12 outline-none shadow-inner focus:shadow-sm transition-all placeholder:text-slate-400"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarNovaSenha((prev) => !prev)}
                            aria-label={mostrarNovaSenha ? 'Ocultar nova senha' : 'Ver nova senha'}
                            className="absolute inset-y-1.5 right-1.5 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:scale-90 transition-all cursor-pointer"
                          >
                            {mostrarNovaSenha ? (
                              <LucideIcons.EyeOff size={17} strokeWidth={1.9} />
                            ) : (
                              <LucideIcons.Eye size={17} strokeWidth={1.9} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Campo Confirmar Nova Senha */}
                      <div className="space-y-1.5">
                        <label
                          htmlFor="confirmar-nova-senha"
                          className="block text-xs font-sans text-slate-600 pl-1"
                        >
                          Confirmar nova senha
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                            <LucideIcons.CheckCircle2 size={17} strokeWidth={1.9} />
                          </div>
                          <input
                            id="confirmar-nova-senha"
                            type={mostrarConfirmarNovaSenha ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={confirmarNovaSenha}
                            onChange={(e) => setConfirmarNovaSenha(e.target.value)}
                            placeholder="Repita a nova senha"
                            className="w-full h-12 bg-slate-100/75 hover:bg-slate-100 focus:bg-white border border-slate-200/90 focus:border-slate-900 text-slate-900 text-sm font-normal rounded-3xl pl-11 pr-12 outline-none shadow-inner focus:shadow-sm transition-all placeholder:text-slate-400"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarConfirmarNovaSenha((prev) => !prev)}
                            aria-label={mostrarConfirmarNovaSenha ? 'Ocultar confirmação' : 'Ver confirmação'}
                            className="absolute inset-y-1.5 right-1.5 w-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:scale-90 transition-all cursor-pointer"
                          >
                            {mostrarConfirmarNovaSenha ? (
                              <LucideIcons.EyeOff size={17} strokeWidth={1.9} />
                            ) : (
                              <LucideIcons.Eye size={17} strokeWidth={1.9} />
                            )}
                          </button>
                        </div>
                      </div>

                      {erro && (
                        <div className="flex flex-col gap-2 text-rose-700 bg-rose-50 border border-rose-200/80 p-3.5 rounded-2xl animate-in zoom-in-95 duration-200">
                          <div className="flex items-start gap-2.5">
                            <LucideIcons.AlertCircle
                              size={17}
                              strokeWidth={2}
                              className="shrink-0 mt-0.5 text-rose-600"
                            />
                            <span className="text-xs font-sans leading-relaxed">{erro}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => alternarModo('recuperar')}
                            className="self-start text-[11px] font-medium text-rose-800 underline underline-offset-2 hover:text-rose-950 cursor-pointer pl-6"
                          >
                            Enviar novo link para o meu e-mail
                          </button>
                        </div>
                      )}

                      <div className="space-y-2.5 pt-1">
                        <button
                          type="submit"
                          disabled={loading}
                          className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs uppercase tracking-wider rounded-full shadow-lg shadow-slate-900/15 hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {loading ? (
                            <>
                              <LucideIcons.Loader2 size={17} className="animate-spin" />
                              <span>Salvando senha</span>
                            </>
                          ) : (
                            <>
                              <span>Salvar Nova Senha e Entrar</span>
                              <LucideIcons.ArrowRight size={16} strokeWidth={2.2} />
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => alternarModo('login')}
                          className="w-full h-10 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium text-xs rounded-full border border-slate-200/80 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <LucideIcons.ArrowLeft size={15} strokeWidth={2} />
                          <span>Cancelar e voltar ao Login</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Rodapé Cadastro / Contratação */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="bg-slate-100/80 border border-slate-200/70 rounded-3xl p-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 pl-1 truncate min-w-0">
                      {configSaaS.textoRodapeLogin}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/cadastro')}
                      className="h-8 px-3.5 rounded-full bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-200/90 hover:border-slate-900 text-xs font-sans shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95 whitespace-nowrap"
                    >
                      {configSaaS.textoBotaoCadastroLogin}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botão WhatsApp */}
      <BotaoWhatsappFlutuante mensagem="Olá! Preciso de suporte no acesso ao T-System Beach." />
    </div>
  );
}
