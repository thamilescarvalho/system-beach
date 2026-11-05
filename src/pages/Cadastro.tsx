// src/pages/Cadastro.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../lib/supabase';
import { VitrineSistemaDesktop } from '../components/VitrineSistemaDesktop';
import { BotaoWhatsappFlutuante } from '../components/BotaoWhatsappFlutuante';
import {
  extrairDigitos,
  formatarCpfCnpj,
  validarDocumentoBrasil,
  formatarTelefoneBR,
  validarTelefoneBR,
  validarEmail
} from '../utils/validadores';
import { obterUrlBaseSistema } from '../utils/configuracoesSaaS';

export function Cadastro() {
  const navigate = useNavigate();

  // Dados do Estabelecimento e Responsável
  const [nomeEmpresa, setNomeEmpresa] = useState<string>('');
  const [documento, setDocumento] = useState<string>('');
  const [nomeUsuario, setNomeUsuario] = useState<string>('');
  const [telefone, setTelefone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [mostrarSenha, setMostrarSenha] = useState<boolean>(false);
  const [aceitouTermos, setAceitouTermos] = useState<boolean>(false);

  // Controle de Interface e Confirmação de E-mail
  const [loading, setLoading] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');
  const [aguardandoConfirmacaoEmail, setAguardandoConfirmacaoEmail] = useState<boolean>(false);
  const [reenviandoEmail, setReenviandoEmail] = useState<boolean>(false);
  const [mensagemReenvio, setMensagemReenvio] = useState<string>('');
  const [cooldownReenvio, setCooldownReenvio] = useState<number>(0);

  const statusDocumento = validarDocumentoBrasil(documento);
  const digitosDoc = extrairDigitos(documento);
  const telefoneValido = validarTelefoneBR(telefone);
  const emailValido = validarEmail(email);

  useEffect(() => {
    if (cooldownReenvio <= 0) return;
    const timer = setInterval(() => {
      setCooldownReenvio((atual) => (atual > 1 ? atual - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownReenvio]);

  const handleCadastrarEstabelecimento = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nomeEmpresa.trim().length < 3) {
      return setErro('Informe o nome do estabelecimento (mínimo de 3 caracteres).');
    }
    if (!statusDocumento.valido) {
      return setErro('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido no Brasil.');
    }
    if (nomeUsuario.trim().length < 3) {
      return setErro('Informe o nome completo do responsável.');
    }
    if (!telefoneValido) {
      return setErro('Informe um telefone/WhatsApp válido com DDD (ex: (85) 99999-0000).');
    }
    if (!emailValido) {
      return setErro('Informe um endereço de e-mail válido.');
    }
    if (senha.length < 6) {
      return setErro('A senha deve ter no mínimo 6 caracteres.');
    }
    if (!aceitouTermos) {
      return setErro('Aceite os Termos de Uso e a Política de Privacidade (LGPD) para prosseguir.');
    }

    setLoading(true);
    setErro('');

    try {
      const emailLimpo = email.trim().toLowerCase();
      const docLimpo = extrairDigitos(documento);
      const telLimpo = extrairDigitos(telefone);

      // 1. Cria credencial no Supabase Auth enviando link de confirmação para o e-mail
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailLimpo,
        password: senha,
        options: {
          emailRedirectTo: `${obterUrlBaseSistema()}/login?confirmado=sucesso`,
          data: {
            nome_empresa: nomeEmpresa.trim(),
            documento: docLimpo,
            nome_usuario: nomeUsuario.trim(),
            telefone: telLimpo,
            requer_plano_inicial: true
          }
        }
      });

      if (authError) {
        const msgLower = authError.message.toLowerCase();
        if (msgLower.includes('already registered')) {
          throw new Error('Este e-mail já possui cadastro. Faça login ou recupere sua senha.');
        }
        if (
          msgLower.includes('rate limit') ||
          msgLower.includes('over_email_send_rate_limit') ||
          msgLower.includes('limite de envio')
        ) {
          throw new Error(
            'Muitas solicitações de envio de e-mail em poucos minutos. Aguarde um instante ou verifique sua caixa de entrada.'
          );
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Não foi possível iniciar o cadastro. Tente novamente.');
      }

      // 2. Se o Supabase já liberou sessão imediata, registra o Estabelecimento no banco agora (como pendente);
      // caso contrário, será registrado automaticamente assim que o usuário confirmar o link do e-mail.
      if (authData.session) {
        const { error: rpcError } = await supabase.rpc('criar_workspace_onboarding', {
          p_nome_empresa: nomeEmpresa.trim(),
          p_nome_usuario: nomeUsuario.trim(),
          p_email: emailLimpo,
          p_documento: docLimpo,
          p_telefone: telLimpo
        });

        if (rpcError) {
          const { data: empresaData } = await supabase
            .from('empresas')
            .insert([{
              nome_fantasia: nomeEmpresa.trim(),
              documento: docLimpo,
              telefone: telLimpo,
              status_assinatura: 'pendente',
              data_vencimento: null
            }])
            .select('id')
            .single();

          if (empresaData) {
            await supabase.from('usuarios').insert([{
              id: authData.user.id,
              nome: nomeUsuario.trim(),
              email: emailLimpo,
              telefone: telLimpo,
              cargo: 'admin',
              status: 'ativo',
              avatar: '👑',
              empresa_id: empresaData.id
            }]);
          }
        }

        // Encerra a sessão temporária para exigir a confirmação de e-mail antes do primeiro acesso
        await supabase.auth.signOut();
      }

      // Salva o e-mail para facilitar quando o usuário voltar do link de confirmação
      localStorage.setItem('tsystem_saved_email', emailLimpo);
      setAguardandoConfirmacaoEmail(true);
    } catch (err: unknown) {
      const mensagem = err instanceof Error ? err.message : 'Ocorreu um erro ao realizar o cadastro.';
      setErro(mensagem);
    } finally {
      setLoading(false);
    }
  };

  const handleReenviarEmailConfirmacao = async () => {
    if (cooldownReenvio > 0 || reenviandoEmail) return;
    setReenviandoEmail(true);
    setMensagemReenvio('');
    setErro('');

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${obterUrlBaseSistema()}/login?confirmado=sucesso`
        }
      });

      if (error) throw error;
      setMensagemReenvio('Novo link de confirmação enviado! Verifique sua caixa de entrada e o Spam.');
      setCooldownReenvio(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Não foi possível reenviar o e-mail agora.';
      setErro(msg);
    } finally {
      setReenviandoEmail(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-slate-100/70 font-sans text-slate-900 selection:bg-slate-900 selection:text-white relative overflow-y-auto">
      <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-stretch justify-center p-4 sm:p-6 lg:p-10 gap-8 relative z-10 min-h-screen lg:min-h-0 lg:my-auto">
        {/* COLUNA ESQUERDA: VITRINE INTERATIVA DO SISTEMA (DESKTOP) */}
        <VitrineSistemaDesktop />

        {/* COLUNA DIREITA: CARD DE CADASTRO OU CONFIRMAÇÃO DE E-MAIL */}
        <div className="w-full max-w-md mx-auto lg:mx-0 lg:w-1/2 flex flex-col justify-center">
          <div className="w-full bg-white border border-slate-200/80 rounded-4xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            {aguardandoConfirmacaoEmail ? (
              /* TELA DE CONFIRMAÇÃO DE E-MAIL VIA CAIXA DE ENTRADA */
              <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs mb-4">
                  <LucideIcons.MailCheck size={28} strokeWidth={2.2} />
                </div>

                <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">
                  Quase tudo pronto
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-2">
                  Confirme seu E-mail
                </h2>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-xs mb-5">
                  Enviamos um link de confirmação para{' '}
                  <strong className="text-slate-900 font-bold">{email.trim().toLowerCase()}</strong>.
                  Clique no link recebido na sua caixa de entrada para ativar o estabelecimento{' '}
                  <strong className="text-slate-900 font-bold">{nomeEmpresa.trim()}</strong>.
                </p>

                <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-left space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <LucideIcons.CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                    <span>{statusDocumento.tipo}: {documento} validado</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <LucideIcons.Phone size={15} className="text-emerald-600 shrink-0" />
                    <span>Contato: {telefone} registrado</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <LucideIcons.Crown size={15} className="text-fuchsia-700 shrink-0" />
                    <span>Contratação da Assinatura Premium após o login</span>
                  </div>
                </div>

                {mensagemReenvio && (
                  <div className="w-full flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs font-semibold mb-4">
                    <LucideIcons.Check size={16} className="shrink-0" />
                    <span>{mensagemReenvio}</span>
                  </div>
                )}

                {erro && (
                  <div className="w-full flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-2xl text-xs font-semibold mb-4">
                    <LucideIcons.AlertCircle size={16} className="shrink-0" />
                    <span>{erro}</span>
                  </div>
                )}

                <div className="w-full space-y-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem('tsystem_email_confirmado_aviso', 'true');
                      navigate('/login?confirmado=sucesso');
                    }}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-900/15 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Já confirmei meu e-mail</span>
                    <LucideIcons.ArrowRight size={16} strokeWidth={2.5} />
                  </button>

                  <button
                    type="button"
                    disabled={reenviandoEmail || cooldownReenvio > 0}
                    onClick={handleReenviarEmailConfirmacao}
                    className="w-full h-11 bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {reenviandoEmail ? (
                      <LucideIcons.Loader2 size={15} className="animate-spin" />
                    ) : (
                      <LucideIcons.RefreshCw size={15} />
                    )}
                    <span>
                      {cooldownReenvio > 0
                        ? `Reenviar e-mail em ${cooldownReenvio}s`
                        : 'Reenviar link de confirmação'}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* FORMULÁRIO DE CADASTRO DE ESTABELECIMENTO */
              <>
                {/* Cabeçalho */}
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-fuchsia-800 flex items-center justify-center text-white shadow-md shadow-slate-900/15 mb-2.5">
                    <LucideIcons.Umbrella size={22} strokeWidth={2.3} />
                  </div>

                  <span className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">
                    T-System Beach
                  </span>
                  <h2 className="text-sm sm:text-base uppercase font-medium text-slate-800 tracking-wider">
                    Cadastrar Estabelecimento:
                  </h2>
                </div>

                <form onSubmit={handleCadastrarEstabelecimento} className="space-y-3.5" noValidate>
                  {/* Nome do Estabelecimento */}
                  <div className="space-y-1">
                    <label
                      htmlFor="cad-empresa"
                      className="block text-xs font-medium text-slate-600 uppercase tracking-wider pl-1"
                    >
                      Nome do Estabelecimento
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                        <LucideIcons.Store size={17} strokeWidth={2} />
                      </div>
                      <input
                        id="cad-empresa"
                        type="text"
                        value={nomeEmpresa}
                        onChange={(e) => setNomeEmpresa(e.target.value)}
                        className="w-full h-11 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-900 text-slate-900 text-sm font-medium rounded-4xl pl-10 pr-4 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                        required
                      />
                    </div>
                  </div>

                  {/* CPF/CNPJ */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <label
                        htmlFor="cad-documento"
                        className="block text-xs font-medium text-slate-600 uppercase tracking-wider"
                      >
                        CPF/CNPJ
                      </label>
                      {digitosDoc.length > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            statusDocumento.valido ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {statusDocumento.valido ? (
                            <>
                              <LucideIcons.CheckCircle2 size={13} /> {statusDocumento.tipo} válido
                            </>
                          ) : (
                            <>
                              <LucideIcons.Info size={13} /> Digite CPF (11) ou CNPJ (14)
                            </>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                        <LucideIcons.FileCheck2 size={17} strokeWidth={2} />
                      </div>
                      <input
                        id="cad-documento"
                        type="text"
                        inputMode="numeric"
                        value={documento}
                        onChange={(e) => setDocumento(formatarCpfCnpj(e.target.value))}
                        className={`w-full h-11 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border text-slate-900 text-sm font-medium rounded-4xl pl-10 pr-4 outline-none focus:ring-4 transition-all placeholder:text-slate-400 tabular-nums ${
                          digitosDoc.length > 0 && statusDocumento.valido
                            ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-500/10'
                            : 'border-slate-200 focus:border-slate-700 focus:ring-slate-900/5'
                        }`}
                        required
                      />
                    </div>
                  </div>

                  {/* Nome do Responsável e Telefone (Obrigatório) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="cad-responsavel"
                        className="block text-xs font-medium text-slate-600 uppercase tracking-wider pl-1"
                      >
                        Nome do responsável
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                          <LucideIcons.User size={17} strokeWidth={2} />
                        </div>
                        <input
                          id="cad-responsavel"
                          type="text"
                          autoComplete="name"
                          value={nomeUsuario}
                          onChange={(e) => setNomeUsuario(e.target.value)}
                          className="w-full h-11 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-900 text-slate-900 text-sm font-medium rounded-4xl pl-10 pr-3 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="cad-telefone"
                        className="block text-xs font-medium text-slate-600 uppercase tracking-wider pl-1"
                      >
                        Telefone
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                          <LucideIcons.Phone size={17} strokeWidth={2} />
                        </div>
                        <input
                          id="cad-telefone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={telefone}
                          onChange={(e) => setTelefone(formatarTelefoneBR(e.target.value))}
                          className={`w-full h-11 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border text-slate-900 text-sm font-medium rounded-4xl pl-10 pr-3 outline-none focus:ring-4 transition-all placeholder:text-slate-400 tabular-nums ${
                            telefone.length > 0 && telefoneValido
                              ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-500/10'
                              : 'border-slate-200 focus:border-slate-900 focus:ring-slate-900/5'
                          }`}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* E-mail e Senha */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="cad-email"
                        className="block text-xs font-medium text-slate-600 uppercase tracking-wider pl-1"
                      >
                        E-mail de Acesso
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                          <LucideIcons.Mail size={17} strokeWidth={2} />
                        </div>
                        <input
                          id="cad-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-900 text-slate-900 text-sm font-medium rounded-4xl pl-10 pr-3 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label
                        htmlFor="cad-senha"
                        className="block text-xs font-medium text-slate-600 uppercase tracking-wider pl-1"
                      >
                        Senha (Mín. 6)
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-900 transition-colors">
                          <LucideIcons.Lock size={17} strokeWidth={2} />
                        </div>
                        <input
                          id="cad-senha"
                          type={mostrarSenha ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={senha}
                          onChange={(e) => setSenha(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-11 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-900 text-slate-900 text-sm font-medium rounded-4xl pl-10 pr-10 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all placeholder:text-slate-400"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarSenha((prev) => !prev)}
                          aria-label={mostrarSenha ? 'Ocultar senha' : 'Ver senha digitada'}
                          className="absolute inset-y-1 right-1 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 active:scale-90 transition-all cursor-pointer"
                        >
                          {mostrarSenha ? (
                            <LucideIcons.EyeOff size={16} strokeWidth={2} />
                          ) : (
                            <LucideIcons.Eye size={16} strokeWidth={2} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* LGPD */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={aceitouTermos}
                    onClick={() => setAceitouTermos((prev) => !prev)}
                    className="w-full flex items-start gap-3 p-4 rounded-4xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 text-left transition-colors cursor-pointer"
                  >
                    <span
                      className={`mt-1.5 w-3 h-3 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                        aceitouTermos
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <LucideIcons.Check size={11} strokeWidth={3} />
                    </span>
                    <span className="text-xs text-slate-500 font-sans leading-snug">
                      Declaro que li e concordo com os{' '}
                      <strong className="text-slate-700">Termos de Uso</strong> e a{' '}
                      <strong className="text-slate-700">Política de Privacidade (LGPD)</strong>.
                    </span>
                  </button>

                  {erro && (
                    <div className="flex items-start gap-2 text-rose-700 bg-rose-50 border border-rose-200/80 p-3 rounded-2xl animate-in zoom-in-95 duration-200">
                      <LucideIcons.AlertCircle size={17} strokeWidth={2.5} className="shrink-0 mt-0.5 text-rose-600" />
                      <span className="text-xs font-semibold leading-relaxed">{erro}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-900/15 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <LucideIcons.Loader2 size={18} className="animate-spin" />
                        <span>Validando e Criando...</span>
                      </>
                    ) : (
                      <>
                        <span>Concluir Cadastro</span>
                        <LucideIcons.ArrowRight size={17} strokeWidth={2.5} />
                      </>
                    )}
                  </button>
                </form>

                {/* Rodapé: Voltar para Login */}
                <div className="mt-5 pt-4 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500 font-medium">
                    Já possui cadastro?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="text-slate-900 font-medium underline underline-offset-4 hover:text-fuchsia-600 transition-colors cursor-pointer"
                    >
                      Acessar Estabelecimento
                    </button>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Botão Wpp Flutuante */}
      <BotaoWhatsappFlutuante mensagem="Olá! Quero tirar uma dúvida sobre a assinatura do T-System Beach." />
    </div>
  );
}
