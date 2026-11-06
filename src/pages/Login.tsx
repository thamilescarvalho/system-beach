// src/pages/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { VitrineSistemaDesktop } from '../components/VitrineSistemaDesktop';
import { BotaoWhatsappFlutuante } from '../components/BotaoWhatsappFlutuante';
import {
  carregarConfiguracaoGlobalSaaS,
  obterConfiguracaoGlobalLocal,
  type ConfiguracaoGlobalSaaS,
} from '../utils/configuracoesSaaS';

const STORAGE_SAVED_EMAIL = 'tsystem_saved_email';
const STORAGE_REMEMBER_ME = 'tsystem_remember_me';
const SESSION_ACTIVE_TAB = 'tsystem_active_tab_session';
const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO_SEGUNDOS = 30;

export function Login() {
  const navigate = useNavigate();
  const contexto = useAppContext();

  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem(STORAGE_SAVED_EMAIL) || '';
  });
  const [senha, setSenha] = useState<string>('');
  const [mostrarSenha, setMostrarSenha] = useState<boolean>(false);
  const [manterConectado, setManterConectado] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_REMEMBER_ME) !== 'false';
  });

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

  const confirmacaoEmailVisivel =
    !avisoConfirmacaoFechado &&
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
    if (contexto?.garcomLogado && !contexto.carregandoContexto) {
      const cargo = contexto.garcomLogado.cargo;
      if (cargo === 'super_admin') {
        navigate('/master', { replace: true });
      } else if (!contexto.verificarAcessoLiberado()) {
        navigate('/assinatura-pendente', { replace: true });
      } else if (cargo === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [contexto, navigate]);

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
    <div className="min-h-screen w-full flex bg-slate-100/70 font-sans text-slate-900 selection:bg-slate-900 selection:text-white relative overflow-hidden">
      {/* MODAL */}
      {confirmacaoEmailVisivel && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-confirmacao-email"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-300"
        >
          <div className="w-full max-w-sm bg-white border border-slate-200/90 rounded-3xl shadow-2xl shadow-slate-900/15 p-6 sm:p-7 text-center relative animate-in zoom-in-95 duration-300">
            <button
              type="button"
              onClick={fecharAvisoConfirmacao}
              aria-label="Fechar aviso"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <LucideIcons.X size={15} strokeWidth={2.3} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <LucideIcons.CheckCircle2 size={24} strokeWidth={2.2} />
            </div>

            <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">
              Verificação Concluída
            </span>

            <h3
              id="titulo-confirmacao-email"
              className="text-base font-bold text-slate-900 tracking-tight leading-snug mb-2"
            >
              Seu e-mail e cadastro foi confirmado com sucesso
            </h3>

            <p className="text-xs text-slate-500 font-medium leading-relaxed mb-5">
              Sua conta está validada. Entre com seu e-mail e senha abaixo para acessar a página de contratação da{' '}
              <strong className="text-slate-800">Assinatura Premium</strong>.
            </p>

            <button
              type="button"
              onClick={fecharAvisoConfirmacao}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-4xl shadow-md shadow-slate-900/10 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Continuar para o Login</span>
              <LucideIcons.ArrowRight size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-stretch justify-center p-4 sm:p-6 lg:p-10 gap-8 relative z-10 min-h-screen lg:min-h-0 lg:my-auto">
        {/* COLUNA ESQUERDA: VITRINE INTERATIVA DO SISTEMA (DESKTOP) */}
        <VitrineSistemaDesktop />

        {/* COLUNA DIREITA / CARD PRINCIPAL DE LOGIN */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:w-1/2 flex flex-col justify-center">
          <div className="w-full bg-white border border-slate-200/80 rounded-4xl shadow-xl shadow-slate-200/50 p-6 sm:p-9 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {/* Cabeçalho */}
            <div className="flex flex-col items-center text-center mb-7">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-800 flex items-center justify-center text-white shadow-md shadow-slate-900/15 mb-3">
                <LucideIcons.Umbrella size={24} strokeWidth={2.3} />
              </div>

              <span className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1">
                {configSaaS.nomeSistema}
              </span>
              <h2 className="text-xs sm:text-sm font-medium uppercase text-slate-800 tracking-tight">
                {configSaaS.subtituloLogin}
              </h2>
            </div>

            {/* Formulário de Autenticação */}
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* E-mail */}
              <div className="space-y-1.5">
                <label
                  htmlFor="login-email"
                  className="block text-xs font-bold text-slate-600 uppercase tracking-wider pl-1"
                >
                  E-mail de acesso
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <LucideIcons.Mail size={18} strokeWidth={2} />
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-900 text-slate-900 text-sm font-medium rounded-2xl pl-11 pr-4 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Senha com botão */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label
                    htmlFor="login-senha"
                    className="block text-xs font-bold text-slate-600 uppercase tracking-wider"
                  >
                    Senha segura
                  </label>
                  {capsLockAtivo && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 animate-in fade-in">
                      <LucideIcons.ArrowBigUpDash size={14} /> Caps Lock ativo
                    </span>
                  )}
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                    <LucideIcons.Lock size={18} strokeWidth={2} />
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
                    className="w-full h-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-900 text-slate-900 text-sm font-medium rounded-2xl pl-11 pr-12 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((prev) => !prev)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha digitada'}
                    title={mostrarSenha ? 'Ocultar senha' : 'Ver senha digitada'}
                    className="absolute inset-y-1.5 right-1.5 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:scale-90 transition-all cursor-pointer"
                  >
                    {mostrarSenha ? (
                      <LucideIcons.EyeOff size={18} strokeWidth={2} />
                    ) : (
                      <LucideIcons.Eye size={18} strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              {/* Manter Conectado */}
              <div className="flex items-center justify-between pt-1 px-0.5 gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={manterConectado}
                  onClick={() => setManterConectado((prev) => !prev)}
                  className="group inline-flex items-center gap-2.5 text-left select-none cursor-pointer py-1"
                >
                  <span
                    className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all duration-200 ${
                      manterConectado
                        ? 'bg-fuchsia-900 border-fuchsia-900 text-white'
                        : 'bg-slate-100 border-slate-300 text-transparent group-hover:border-slate-400'
                    }`}
                  >
                    <LucideIcons.Check size={13} strokeWidth={3} />
                  </span>
                  <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                    Manter conectado
                  </span>
                </button>

                <span
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 shrink-0"
                  title="Conexão criptografada"
                >
                  <LucideIcons.ShieldCheck size={14} className="text-emerald-600" />
                  Seguro
                </span>
              </div>

              {/* Alerta de Erro */}
              {erro && (
                <div className="flex items-start gap-2.5 text-rose-700 bg-rose-50 border border-rose-200/80 p-3.5 rounded-2xl animate-in zoom-in-95 duration-200">
                  <LucideIcons.AlertCircle size={18} strokeWidth={2.5} className="shrink-0 mt-0.5 text-rose-600" />
                  <span className="text-xs font-semibold leading-relaxed">{erro}</span>
                </div>
              )}

              {/* Botão Principal */}
              <button
                type="submit"
                disabled={loading || bloqueioSegundos > 0}
                className="w-full h-12 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-4xl shadow-lg shadow-slate-900/15 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <LucideIcons.Loader2 size={18} className="animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : bloqueioSegundos > 0 ? (
                  <>
                    <LucideIcons.Timer size={18} />
                    <span>Aguarde {bloqueioSegundos}s</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <LucideIcons.ArrowRight size={17} strokeWidth={2.5} />
                  </>
                )}
              </button>
            </form>

            {/* Rodapé: Link para Cadastro / Assinatura */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">
                {configSaaS.textoRodapeLogin}{' '}
                <button
                  type="button"
                  onClick={() => navigate('/cadastro')}
                  className="text-slate-900 font-medium underline underline-offset-4 hover:text-fuchsia-600 transition-colors cursor-pointer"
                >
                  {configSaaS.textoBotaoCadastroLogin}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botão Flutuante do WhatsApp */}
      <BotaoWhatsappFlutuante mensagem="Olá! Preciso de suporte no acesso ao T-System Beach." />
    </div>
  );
}
