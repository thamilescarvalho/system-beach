// src/pages/MeuPerfil.tsx
import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header';
import { AvatarUsuario } from '../components/AvatarUsuario';
import { isAvatarImagem } from '../utils/avatar';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { formatarTelefoneBR, validarEmail } from '../utils/validadores';

const EMOJIS_PERFIL = [
  '⚡', '🐋', '🌈', '🦖', '😎', '🐱',
  '🤖', '👑', '🔥', '🚀', '🍕', '🎮',
  '🌴', '🏖️', '🍹', '☀️', '🦀', '🐬'
];

export function MeuPerfil() {
  const navigate = useNavigate();
  const {
    garcomLogado,
    dadosEmpresa,
    uploadFotoPerfil,
    atualizarMeuPerfil,
    alterarMeuEmail,
    alterarMinhaSenha
  } = useAppContext();

  const inputFotoRef = useRef<HTMLInputElement>(null);

  const obterEmojiInicial = (avatarAtual?: string, userId?: string): string => {
    if (avatarAtual && !isAvatarImagem(avatarAtual)) {
      return avatarAtual;
    }
    if (userId) {
      try {
        const salvo = localStorage.getItem(`tsystem_emoji_${userId}`);
        if (salvo && !isAvatarImagem(salvo)) return salvo;
      } catch {
        // Ignora erro de storage
      }
    }
    return '🦖';
  };

  // Estados de Identidade e Dados Cadastrais
  const [usuarioSyncId, setUsuarioSyncId] = useState<string | null>(() => garcomLogado?.id ?? null);
  const [nome, setNome] = useState<string>(() => garcomLogado?.nome || '');
  const [telefone, setTelefone] = useState<string>(() =>
    garcomLogado?.telefone ? formatarTelefoneBR(garcomLogado.telefone) : ''
  );
  const [emojiSelecionado, setEmojiSelecionado] = useState<string>(() =>
    obterEmojiInicial(garcomLogado?.avatar, garcomLogado?.id)
  );
  const [fotoUrl, setFotoUrl] = useState<string | null>(() =>
    isAvatarImagem(garcomLogado?.avatar) ? (garcomLogado?.avatar || null) : null
  );
  const [modoVisual, setModoVisual] = useState<'foto' | 'emoji'>(() =>
    isAvatarImagem(garcomLogado?.avatar) ? 'foto' : 'emoji'
  );

  const [enviandoFoto, setEnviandoFoto] = useState<boolean>(false);
  const [salvandoCadastro, setSalvandoCadastro] = useState<boolean>(false);
  const [feedbackCadastro, setFeedbackCadastro] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Estados de Dados de Acesso — E-mail
  const [novoEmail, setNovoEmail] = useState<string>(() => garcomLogado?.email || '');
  const [senhaConfirmacaoEmail, setSenhaConfirmacaoEmail] = useState<string>('');
  const [salvandoEmail, setSalvandoEmail] = useState<boolean>(false);
  const [feedbackEmail, setFeedbackEmail] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Estados de Dados de Acesso — Senha
  const [senhaAtual, setSenhaAtual] = useState<string>('');
  const [novaSenha, setNovaSenha] = useState<string>('');
  const [confirmarSenha, setConfirmarSenha] = useState<string>('');
  const [mostrarSenhas, setMostrarSenhas] = useState<boolean>(false);
  const [salvandoSenha, setSalvandoSenha] = useState<boolean>(false);
  const [feedbackSenha, setFeedbackSenha] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  if (garcomLogado && garcomLogado.id !== usuarioSyncId) {
    setUsuarioSyncId(garcomLogado.id);
    setNome(garcomLogado.nome || '');
    setNovoEmail(garcomLogado.email || '');
    if (garcomLogado.telefone) {
      setTelefone(formatarTelefoneBR(garcomLogado.telefone));
    }
    const temFoto = isAvatarImagem(garcomLogado.avatar);
    setFotoUrl(temFoto ? garcomLogado.avatar : null);
    setModoVisual(temFoto ? 'foto' : 'emoji');
    setEmojiSelecionado(obterEmojiInicial(garcomLogado.avatar, garcomLogado.id));
  }

  // Sincroniza metadados iniciais da sessão (telefone e emoji preferido)
  useEffect(() => {
    if (!garcomLogado) return;

    let ativo = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!ativo || !session?.user || session.user.id !== garcomLogado.id) return;
      const meta = session.user.user_metadata || {};
      if (typeof meta.telefone === 'string' && meta.telefone) {
        setTelefone(formatarTelefoneBR(meta.telefone));
      }
      if (typeof meta.avatar_emoji === 'string' && meta.avatar_emoji && !isAvatarImagem(meta.avatar_emoji)) {
        setEmojiSelecionado(meta.avatar_emoji);
      }
    });

    return () => {
      ativo = false;
    };
  }, [garcomLogado]);

  if (!garcomLogado) return null;

  const avatarPreview = modoVisual === 'foto' && fotoUrl ? fotoUrl : emojiSelecionado;
  const labelCargo =
    garcomLogado.cargo === 'super_admin'
      ? 'Super Admin'
      : garcomLogado.cargo === 'admin'
        ? 'Administrador'
        : 'Garçom';

  const handleSelecionarArquivoFoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setFeedbackCadastro(null);
    setEnviandoFoto(true);
    try {
      const urlGerada = await uploadFotoPerfil(file);
      setFotoUrl(urlGerada);
      setModoVisual('foto');
      await atualizarMeuPerfil({
        nome: nome.trim() || garcomLogado.nome,
        avatar: urlGerada,
        emojiPreferido: emojiSelecionado,
        telefone
      });
      setFeedbackCadastro({ tipo: 'sucesso', texto: 'Foto de perfil atualizada com sucesso!' });
    } catch (err) {
      setFeedbackCadastro({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível enviar a foto.'
      });
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleRemoverFoto = async () => {
    setFeedbackCadastro(null);
    setFotoUrl(null);
    setModoVisual('emoji');
    setSalvandoCadastro(true);
    try {
      await atualizarMeuPerfil({
        nome: nome.trim() || garcomLogado.nome,
        avatar: emojiSelecionado,
        emojiPreferido: emojiSelecionado,
        telefone
      });
      setFeedbackCadastro({ tipo: 'sucesso', texto: 'Foto removida. Seu emoji foi restaurado no perfil.' });
    } catch (err) {
      setFeedbackCadastro({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível atualizar o avatar.'
      });
    } finally {
      setSalvandoCadastro(false);
    }
  };

  const handleSelecionarEmoji = (emoji: string) => {
    setEmojiSelecionado(emoji);
    setModoVisual('emoji');
    setFeedbackCadastro(null);
  };

  const handleSalvarCadastro = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackCadastro(null);

    const nomeLimpo = nome.trim();
    if (nomeLimpo.length < 2) {
      setFeedbackCadastro({ tipo: 'erro', texto: 'Informe seu nome com pelo menos 2 caracteres.' });
      return;
    }

    const avatarParaSalvar = modoVisual === 'foto' && fotoUrl ? fotoUrl : emojiSelecionado;

    setSalvandoCadastro(true);
    try {
      await atualizarMeuPerfil({
        nome: nomeLimpo,
        avatar: avatarParaSalvar,
        emojiPreferido: emojiSelecionado,
        telefone
      });
      setFeedbackCadastro({ tipo: 'sucesso', texto: 'Dados cadastrais salvos com sucesso!' });
    } catch (err) {
      setFeedbackCadastro({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao salvar os dados cadastrais.'
      });
    } finally {
      setSalvandoCadastro(false);
    }
  };

  const emailFoiAlterado =
    novoEmail.trim().toLowerCase() !== (garcomLogado.email || '').trim().toLowerCase();

  const handleSalvarEmail = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackEmail(null);

    const emailLimpo = novoEmail.trim().toLowerCase();
    if (!validarEmail(emailLimpo)) {
      setFeedbackEmail({ tipo: 'erro', texto: 'Informe um endereço de e-mail válido.' });
      return;
    }
    if (!emailFoiAlterado) {
      setFeedbackEmail({ tipo: 'erro', texto: 'O e-mail informado já é o seu e-mail atual.' });
      return;
    }
    if (!senhaConfirmacaoEmail) {
      setFeedbackEmail({ tipo: 'erro', texto: 'Digite sua senha atual para confirmar a alteração de e-mail.' });
      return;
    }

    setSalvandoEmail(true);
    try {
      await alterarMeuEmail(emailLimpo, senhaConfirmacaoEmail);
      setSenhaConfirmacaoEmail('');
      setFeedbackEmail({
        tipo: 'sucesso',
        texto: 'E-mail de acesso atualizado com sucesso!'
      });
    } catch (err) {
      setFeedbackEmail({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível alterar o e-mail.'
      });
    } finally {
      setSalvandoEmail(false);
    }
  };

  const handleSalvarSenha = async (e: FormEvent) => {
    e.preventDefault();
    setFeedbackSenha(null);

    if (!senhaAtual) {
      setFeedbackSenha({ tipo: 'erro', texto: 'Digite sua senha atual.' });
      return;
    }
    if (novaSenha.length < 6) {
      setFeedbackSenha({ tipo: 'erro', texto: 'A nova senha deve ter no mínimo 6 caracteres.' });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setFeedbackSenha({ tipo: 'erro', texto: 'A confirmação da nova senha não confere.' });
      return;
    }

    setSalvandoSenha(true);
    try {
      await alterarMinhaSenha(senhaAtual, novaSenha);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setFeedbackSenha({ tipo: 'sucesso', texto: 'Senha de acesso atualizada com segurança!' });
    } catch (err) {
      setFeedbackSenha({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Não foi possível alterar a senha.'
      });
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white font-sans flex flex-col relative antialiased text-slate-800">
      {/* HEADER GLOBAL */}
      <Header />

      {/* CONTEÚDO PRINCIPAL — MESMA PALETA E LINGUAGEM VISUAL DA PÁGINA ADMIN */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 pt-22 pb-28 md:pt-24 md:pb-12 md:pl-24">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight">
              Meu Perfil
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Gerencie sua foto de perfil, emoji, dados cadastrais e credenciais de acesso
            </p>
          </div>

          {(garcomLogado.cargo === 'admin' || garcomLogado.cargo === 'super_admin') && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="self-start sm:self-auto h-9 px-4 rounded-full bg-slate-100 hover:bg-slate-200/80 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LucideIcons.ArrowLeft size={14} strokeWidth={1.8} />
              <span>Voltar às Configurações</span>
            </button>
          )}
        </div>

        {/* GRID RESPONSIVO DESKTOP + MOBILE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* COLUNA ESQUERDA: IDENTIDADE VISUAL (FOTO + EMOJI) */}
          <div className="lg:col-span-5 space-y-4">
            {/* CARD DE FOTO DE PERFIL E RESUMO */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5">
              <div className="bg-white rounded-3xl border border-slate-200/50 p-5 sm:p-6 flex flex-col items-center text-center shadow-2xs">
                <div className="relative group">
                  <AvatarUsuario
                    avatar={avatarPreview}
                    nome={nome || garcomLogado.nome}
                    className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200/90 shadow-inner"
                    emojiClassName="text-5xl"
                    fallbackEmoji={emojiSelecionado}
                  />
                  <button
                    type="button"
                    onClick={() => inputFotoRef.current?.click()}
                    disabled={enviandoFoto}
                    title="Alterar foto de perfil"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-900 hover:bg-black text-white border-2 border-white shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                  >
                    {enviandoFoto ? (
                      <LucideIcons.Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LucideIcons.Camera size={14} strokeWidth={2} />
                    )}
                  </button>
                  <input
                    ref={inputFotoRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleSelecionarArquivoFoto}
                    className="hidden"
                  />
                </div>

                <h2 className="mt-4 text-base font-medium text-slate-900 tracking-tight truncate max-w-full">
                  {nome.trim() || garcomLogado.nome}
                </h2>
                <p className="text-xs text-slate-400 truncate max-w-full mt-0.5">
                  {garcomLogado.email || 'Sem e-mail vinculado'}
                </p>

                <div className="mt-2.5 flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-full">
                    {labelCargo}
                  </span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200/60 px-2.5 py-0.5 rounded-full truncate max-w-48">
                    {dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA}
                  </span>
                </div>

                {/* Ações de Foto */}
                <div className="mt-5 w-full flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => inputFotoRef.current?.click()}
                    disabled={enviandoFoto}
                    className="flex-1 min-w-32 h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-60 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <LucideIcons.Upload size={14} strokeWidth={1.8} />
                    <span>{fotoUrl && modoVisual === 'foto' ? 'Trocar foto' : 'Enviar foto'}</span>
                  </button>

                  {fotoUrl && (
                    <button
                      type="button"
                      onClick={
                        modoVisual === 'foto'
                          ? handleRemoverFoto
                          : () => setModoVisual('foto')
                      }
                      disabled={salvandoCadastro}
                      className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      {modoVisual === 'foto' ? (
                        <>
                          <LucideIcons.Smile size={14} strokeWidth={1.8} />
                          <span>Usar emoji</span>
                        </>
                      ) : (
                        <>
                          <LucideIcons.Image size={14} strokeWidth={1.8} />
                          <span>Usar foto</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                  Quando uma foto de perfil está ativa, ela aparece automaticamente no cabeçalho superior e nas telas do sistema no lugar do emoji.
                </p>
              </div>
            </div>

            {/* CARD DE ESCOLHA DE EMOJI */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5">
              <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <LucideIcons.Smile size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Emoji do Perfil</h3>
                      <p className="text-xs text-slate-400">
                        Exibido quando você optar por não usar foto
                      </p>
                    </div>
                  </div>
                  <span className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-xl">
                    {emojiSelecionado}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {EMOJIS_PERFIL.map((itemEmoji) => {
                    const ativo = emojiSelecionado === itemEmoji && modoVisual === 'emoji';
                    return (
                      <button
                        key={itemEmoji}
                        type="button"
                        onClick={() => handleSelecionarEmoji(itemEmoji)}
                        className={`h-10 rounded-2xl text-xl flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                          ativo
                            ? 'bg-yellow-50 border-2 border-yellow-400 shadow-2xs scale-105'
                            : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/60'
                        }`}
                      >
                        {itemEmoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: DADOS CADASTRAIS + DADOS DE ACESSO */}
          <div className="lg:col-span-7 space-y-4">
            {/* BLOCO 1: DADOS CADASTRAIS */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5">
              <form
                onSubmit={handleSalvarCadastro}
                className="bg-white rounded-3xl border border-slate-200/50 p-5 sm:p-6 space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <LucideIcons.UserRound size={18} strokeWidth={1.8} className="text-slate-700" />
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Dados Cadastrais</h3>
                      <p className="text-xs text-slate-400">
                        Informações de identificação exibidas nas comandas e relatórios
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Nome de exibição
                    </label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Seu nome completo"
                      maxLength={60}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={telefone}
                      onChange={(e) => setTelefone(formatarTelefoneBR(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Nível de acesso
                    </label>
                    <div className="w-full h-10 px-3.5 rounded-xl bg-slate-100/80 border border-slate-200/70 text-xs font-medium text-slate-500 flex items-center justify-between">
                      <span>{labelCargo}</span>
                      <LucideIcons.Lock size={13} className="text-slate-400" />
                    </div>
                  </div>
                </div>

                {feedbackCadastro && (
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                      feedbackCadastro.tipo === 'sucesso'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {feedbackCadastro.tipo === 'sucesso' ? (
                      <LucideIcons.CheckCircle2 size={15} className="shrink-0" />
                    ) : (
                      <LucideIcons.AlertCircle size={15} className="shrink-0" />
                    )}
                    <span>{feedbackCadastro.texto}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={salvandoCadastro}
                    className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-60 text-white text-xs font-medium flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    {salvandoCadastro ? (
                      <LucideIcons.Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LucideIcons.Check size={14} strokeWidth={2} />
                    )}
                    <span>Salvar dados cadastrais</span>
                  </button>
                </div>
              </form>
            </div>

            {/* BLOCO 2: DADOS DE ACESSO — E-MAIL */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5">
              <form
                onSubmit={handleSalvarEmail}
                className="bg-white rounded-3xl border border-slate-200/50 p-5 sm:p-6 space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <LucideIcons.Mail size={18} strokeWidth={1.8} className="text-slate-700" />
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">E-mail de Acesso</h3>
                      <p className="text-xs text-slate-400">
                        Utilizado para entrar na sua conta no sistema
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className={emailFoiAlterado ? 'sm:col-span-1' : 'sm:col-span-2'}>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Endereço de e-mail
                    </label>
                    <input
                      type="email"
                      value={novoEmail}
                      onChange={(e) => setNovoEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-800 outline-none transition-all"
                    />
                  </div>

                  {emailFoiAlterado && (
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">
                        Senha atual (confirmação)
                      </label>
                      <input
                        type="password"
                        value={senhaConfirmacaoEmail}
                        onChange={(e) => setSenhaConfirmacaoEmail(e.target.value)}
                        placeholder="Confirme sua senha"
                        className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-800 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                {feedbackEmail && (
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                      feedbackEmail.tipo === 'sucesso'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {feedbackEmail.tipo === 'sucesso' ? (
                      <LucideIcons.CheckCircle2 size={15} className="shrink-0" />
                    ) : (
                      <LucideIcons.AlertCircle size={15} className="shrink-0" />
                    )}
                    <span>{feedbackEmail.texto}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={salvandoEmail || !emailFoiAlterado}
                    className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-black disabled:bg-slate-100 disabled:text-slate-400 text-white text-xs font-medium flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {salvandoEmail ? (
                      <LucideIcons.Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LucideIcons.MailCheck size={14} strokeWidth={2} />
                    )}
                    <span>Atualizar e-mail</span>
                  </button>
                </div>
              </form>
            </div>

            {/* BLOCO 3: DADOS DE ACESSO — SENHA */}
            <div className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-1.5">
              <form
                onSubmit={handleSalvarSenha}
                className="bg-white rounded-3xl border border-slate-200/50 p-5 sm:p-6 space-y-4 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <LucideIcons.KeyRound size={18} strokeWidth={1.8} className="text-slate-700" />
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">Segurança e Senha</h3>
                      <p className="text-xs text-slate-400">
                        Altere sua senha de acesso mediante confirmação da senha atual
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarSenhas((v) => !v)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    {mostrarSenhas ? <LucideIcons.EyeOff size={14} /> : <LucideIcons.Eye size={14} />}
                    <span>{mostrarSenhas ? 'Ocultar' : 'Mostrar'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Senha atual
                    </label>
                    <input
                      type={mostrarSenhas ? 'text' : 'password'}
                      value={senhaAtual}
                      onChange={(e) => setSenhaAtual(e.target.value)}
                      placeholder="••••••"
                      autoComplete="current-password"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Nova senha
                    </label>
                    <input
                      type={mostrarSenhas ? 'text' : 'password'}
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Confirmar nova senha
                    </label>
                    <input
                      type={mostrarSenhas ? 'text' : 'password'}
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-slate-900 text-sm text-slate-800 outline-none transition-all"
                    />
                  </div>
                </div>

                {feedbackSenha && (
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                      feedbackSenha.tipo === 'sucesso'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {feedbackSenha.tipo === 'sucesso' ? (
                      <LucideIcons.CheckCircle2 size={15} className="shrink-0" />
                    ) : (
                      <LucideIcons.AlertCircle size={15} className="shrink-0" />
                    )}
                    <span>{feedbackSenha.texto}</span>
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={salvandoSenha}
                    className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-black disabled:opacity-60 text-white text-xs font-medium flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                  >
                    {salvandoSenha ? (
                      <LucideIcons.Loader2 size={14} className="animate-spin" />
                    ) : (
                      <LucideIcons.ShieldCheck size={14} strokeWidth={2} />
                    )}
                    <span>Atualizar senha</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
