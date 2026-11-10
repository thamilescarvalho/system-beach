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
    <div className="min-h-screen w-full flex flex-col justify-center bg-slate-100 font-sans text-slate-900 antialiased selection:bg-slate-900 selection:text-white relative overflow-x-hidden">
      {/* ILUMINAÇÃO ATMOSFÉRICA SUTIL DE FUNDO (EFEITO PROFUNDIDADE) */}
      <div className="pointer-events-none fixed -top-32 left-1/4 w-96 h-96 rounded-full bg-slate-200/80 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 right-1/4 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />

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
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-11 h-11 rounded-4xl bg-amber-500 border border-amber-500 flex items-center justify-center text-amber-100 shadow-md shadow-slate-900/15 shrink-0">
                      <LucideIcons.Umbrella size={21} strokeWidth={2.5} />
                    </div>

                    <div className="min-w-0">
                      <span className="block text-[11px] font-sans uppercase tracking-widest text-slate-400">
                        {configSaaS.nomeSistema}
                      </span>
                      <h2 className="text-[14px] sm:text-lg font-sans text-slate-600 tracking-tight truncate">
                        {configSaaS.subtituloLogin}
                      </h2>
                    </div>
                  </div>

                  {/* Formulário de Autenticação */}
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
                      <div className="flex items-center justify-between px-1">
                        <label
                          htmlFor="login-senha"
                          className="block text-xs font-sans text-slate-600"
                        >
                          Senha
                        </label>
                        {capsLockAtivo && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-sans text-slate-500 animate-in fade-in">
                            <LucideIcons.ArrowBigUpDash size={12} /> Caps Lock ativo
                          </span>
                        )}
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
                        className="group inline-flex items-center gap-2.5 text-left select-none cursor-pointer py-1"
                      >
                        <span
                          className={`w-5 h-5 rounded-lg flex items-center justify-center border transition-all duration-200 shadow-2xs ${
                            manterConectado
                              ? 'bg-amber-600 border-amber-700 text-white'
                              : 'bg-slate-100 border-slate-300 text-transparent group-hover:border-slate-400'
                          }`}
                        >
                          <LucideIcons.Check size={12} strokeWidth={3} />
                        </span>
                        <span className="text-xs font-sans text-slate-600 group-hover:text-slate-900 transition-colors">
                          Manter conectado neste aparelho
                        </span>
                      </button>
                    </div>

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
                </div>

                {/* Rodapé Cadastro / Contratação */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="bg-slate-100/80 border border-slate-200/70 rounded-3xl p-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 pl-1 truncate">
                      {configSaaS.textoRodapeLogin}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate('/cadastro')}
                      className="h-8 px-3.5 rounded-full bg-white hover:bg-slate-900 text-slate-900 hover:text-white border border-slate-200/90 hover:border-slate-900 text-xs font-sans shadow-2xs transition-all cursor-pointer shrink-0 active:scale-95"
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
