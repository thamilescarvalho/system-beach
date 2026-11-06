// src/pages/AdminUsuarios.tsx
import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Header } from '../components/Header';
import { AvatarUsuario } from '../components/AvatarUsuario';
import { supabase } from '../lib/supabase';
import type { Garcom } from '../types';
import * as LucideIcons from 'lucide-react';
import { ModalConfirmacao } from '../components/ModalConfirmacao';
import { obterUrlBaseSistema } from '../utils/configuracoesSaaS';

interface SeletorAvatarProps {
  avatarAtual: string;
  setAvatar: (avatar: string) => void;
  opcoes: string[];
}

const SeletorAvatarDropdown = ({ avatarAtual, setAvatar, opcoes }: SeletorAvatarProps) => {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="flex items-center gap-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 p-2 pr-2 rounded-full transition-all duration-200 group active:scale-95"
      >
        <div className="w-9 h-9 bg-white shadow-xs border border-slate-100 rounded-full flex items-center justify-center text-xl group-hover:scale-105 transition-transform">
          {avatarAtual}
        </div>
        <LucideIcons.ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute top-full left-0 m-2 bg-white rounded-3xl p-3 shadow-xl border border-slate-100 z-50 w-64 animate-in fade-in zoom-in-95 duration-200">
            <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400 mb-2 px-1 text-center">
              Selecione
            </p>
            <div className="grid grid-cols-4 gap-2">
              {opcoes.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setAvatar(a); setAberto(false); }}
                  className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center transition-all duration-200 active:scale-90 ${
                    avatarAtual === a
                      ? 'bg-indigo-50 border-2 border-indigo-500 shadow-xs scale-105'
                      : 'bg-slate-100 border border-transparent hover:bg-slate-200 hover:scale-105'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export function AdminUsuarios() {
  const contexto = useAppContext();
  const garcomLogado = contexto.garcomLogado;

  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null);
  const [loading, setLoading] = useState(false);

  const mostrarToast = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo });
    setTimeout(() => setToast(null), 4000);
  };

  const avataresDisponiveis = ['⚡', '🐋', '🌈', '🦖', '😎', '🐱', '🤖', '👑', '🔥', '🚀', '🍕', '🎮'];

  // ESTADOS: CRIAÇÃO
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [avatar, setAvatar] = useState(avataresDisponiveis[0]);
  const [cargo, setCargo] = useState<'admin' | 'garcom'>('garcom');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // ESTADOS: EDIÇÃO
  const [usuarioEditando, setUsuarioEditando] = useState<Garcom | null>(null);
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    aberto: boolean;
    titulo: string;
    descricao: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: 'perigo' | 'aviso' | 'primario';
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

  useEffect(() => {
    if (usuarioEditando) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [usuarioEditando]);

  const limparFormulario = () => {
    setNome('');
    setEmail('');
    setSenha('');
    setCargo('garcom');
    setAvatar(avataresDisponiveis[0]);
    setMostrarSenha(false);
    setUsuarioEditando(null);
  };

  const abrirModalEditar = (usuario: Garcom) => {
    setUsuarioEditando(usuario);
    setNome(usuario.nome);
    setEmail(usuario.email || '');
    setCargo(usuario.cargo === 'admin' ? 'admin' : 'garcom');
    setAvatar(usuario.avatar || avataresDisponiveis[0]);
    setSenha('');
  };

  // HANDLER: CRIAR USUÁRIO (VIA EDGE FUNCTION ADMIN-AUTH PARA NÃO DESLOGAR O ADMIN)
  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nome.trim().length < 3) {
      mostrarToast('O nome deve ter no mínimo 3 letras.', 'erro');
      return;
    }
    if (!email.trim().includes('@')) {
      mostrarToast('Informe um e-mail válido.', 'erro');
      return;
    }
    if (senha.length < 6) {
      mostrarToast('A senha deve ter no mínimo 6 caracteres.', 'erro');
      return;
    }

    setLoading(true);

    try {
      const emailLimpo = email.trim().toLowerCase();
      // 1. Tenta a RPC nativa do PostgreSQL (100% atômica, rápida e imune a falhas de Edge Function)
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'admin_criar_usuario_estabelecimento',
        {
          p_email: emailLimpo,
          p_senha: senha,
          p_nome: nome.trim(),
          p_cargo: cargo,
          p_avatar: avatar,
          p_empresa_id: garcomLogado?.empresaId
        }
      );

      if (!rpcError && rpcData && typeof rpcData === 'object' && 'user_id' in rpcData) {
        await contexto.carregarDados(true);
      } else {
        // 2. Fallback resiliente para Edge Function admin-auth
        const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-auth', {
          body: {
            action: 'createUser',
            newEmail: emailLimpo,
            password: senha,
            nome: nome.trim(),
            cargo,
            avatar,
            empresaId: garcomLogado?.empresaId
          }
        });

        if (fnError || !fnData?.user?.id) {
          let msgErro = rpcError?.message;
          if (!msgErro) {
            if (fnError && typeof fnError === 'object' && 'context' in fnError) {
              try {
                const corpo = await (fnError as { context: Response }).context.json();
                if (corpo?.error) msgErro = corpo.error;
                else if (corpo?.message) msgErro = corpo.message;
              } catch {
                msgErro = fnError.message;
              }
            } else if (fnError?.message) {
              msgErro = fnError.message;
            } else if ((fnData as { error?: string } | null)?.error) {
              msgErro = (fnData as { error?: string }).error!;
            }
          }
          throw new Error(msgErro || 'Erro ao criar usuário.');
        }

        const fallbackUserId = fnData.user.id as string;
        await contexto.adicionarUsuario({
          id: fallbackUserId,
          nome: nome.trim(),
          email: emailLimpo,
          cargo,
          avatar,
          status: 'ativo',
          empresaId: garcomLogado?.empresaId
        });
      }

      mostrarToast(`Usuário ${nome.trim()} criado com sucesso!`, 'sucesso');
      limparFormulario();
    } catch (error: unknown) {
      console.error(error);
      if (error instanceof Error) {
        if (error.message.includes('already registered')) {
          mostrarToast('Este e-mail já está em uso no sistema.', 'erro');
        } else {
          mostrarToast(error.message, 'erro');
        }
      } else {
        mostrarToast('Ocorreu um erro inesperado.', 'erro');
      }
    } finally {
      setLoading(false);
    }
  };

  // HANDLER: SALVAR EDIÇÃO GERAL
  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioEditando) return;
    if (nome.trim().length < 3) {
      mostrarToast('O nome deve ter no mínimo 3 letras.', 'erro');
      return;
    }
    if (!email.trim().includes('@')) {
      mostrarToast('Informe um e-mail válido.', 'erro');
      return;
    }

    setLoading(true);

    try {
      await contexto.editarUsuario(usuarioEditando.id, {
        nome: nome.trim(),
        email: email.trim(),
        cargo: usuarioEditando.cargo === 'super_admin' ? 'super_admin' : cargo,
        avatar
      });

      mostrarToast(`Perfil de ${nome.trim()} atualizado.`, 'sucesso');
      limparFormulario();
    } catch (error) {
      console.error(error);
      mostrarToast('Erro ao atualizar o usuário.', 'erro');
    } finally {
      setLoading(false);
    }
  };

  // HANDLER: RESET DE SENHA
  const handleResetarSenha = async () => {
    if (!email) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${obterUrlBaseSistema()}/login`
      });
      if (error) throw error;
      mostrarToast('E-mail de redefinição de senha enviado com sucesso!', 'sucesso');
    } catch (error) {
      console.error(error);
      mostrarToast('Erro ao enviar e-mail de redefinição.', 'erro');
    } finally {
      setLoading(false);
    }
  };

  // HANDLER: BLOQUEAR / DESBLOQUEAR
  const handleToggleBloqueio = async () => {
    if (!usuarioEditando) return;

    const statusAtual = usuarioEditando.status || 'ativo';
    const novoStatus = statusAtual === 'bloqueado' ? 'ativo' : 'bloqueado';

    setLoading(true);
    try {
      await contexto.editarUsuario(usuarioEditando.id, {
        status: novoStatus
      });

      setUsuarioEditando({ ...usuarioEditando, status: novoStatus });
      mostrarToast(`Usuário ${novoStatus === 'bloqueado' ? 'bloqueado' : 'desbloqueado'} com sucesso!`, 'sucesso');
    } catch (error) {
      console.error(error);
      mostrarToast('Erro ao alterar status do usuário.', 'erro');
    } finally {
      setLoading(false);
    }
  };

  // HANDLER: EXCLUIR USUÁRIO
  const excluirUsuario = (id: string, nomeUsuario: string) => {
    if (id === garcomLogado?.id) {
      mostrarToast('Você não pode excluir a sua própria conta.', 'erro');
      return;
    }

    setModalConfirmacao({
      aberto: true,
      titulo: 'Remover Colaborador?',
      descricao: `Deseja remover permanentemente o acesso de "${nomeUsuario}" ao sistema? Esta ação não pode ser desfeita.`,
      textoConfirmar: 'Remover Acesso',
      tipo: 'perigo',
      onConfirmar: async () => {
        fecharConfirmacao();
        try {
          await contexto.removerUsuario(id);
          mostrarToast('Usuário removido com sucesso.', 'sucesso');
          setUsuarioEditando(null);
        } catch (error) {
          console.error('Erro ao excluir:', error);
          mostrarToast('Ocorreu um erro ao excluir o usuário.', 'erro');
        }
      }
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 selection:bg-indigo-200 selection:text-indigo-900 text-slate-800 flex flex-col relative pt-20 md:pt-24 md:pl-18 pb-28 font-sans">
      {/* NOTIFICAÇÃO FLUTUANTE */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-100 animate-in fade-in slide-in-from-top-4 duration-300 w-11/12 max-w-sm flex justify-center">
          <div className={`px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-xl flex items-center gap-3 text-xs sm:text-[13px] font-semibold tracking-tight ${
            toast.tipo === 'sucesso'
              ? 'bg-slate-900/95 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-900/95 text-rose-400 border-rose-500/30'
          }`}>
            {toast.tipo === 'sucesso' ? <LucideIcons.CheckCircle2 size={18} className="shrink-0" /> : <LucideIcons.AlertCircle size={18} className="shrink-0" />}
            <span className="truncate">{toast.mensagem}</span>
          </div>
        </div>
      )}

      {/* HEADER */}
      <Header />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-5 md:px-8 mt-4 md:mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* LADO ESQUERDO: FORMULÁRIO DE CRIAÇÃO */}
          <section className="lg:col-span-5 bg-white p-5 sm:p-6 md:p-8 rounded-4xl shadow-xs border border-slate-200">
            <div className="flex flex-col gap-6 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-50 text-fuchsia-800 flex items-center justify-center shrink-0 border border-slate-100">
                  <LucideIcons.UserPlus size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Novo Usuário</h2>
                </div>
              </div>
            </div>

            <form onSubmit={handleCriarUsuario} className="space-y-5">
              {/* Avatar Selector */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                  Avatar de Perfil
                </label>
                <SeletorAvatarDropdown avatarAtual={avatar} setAvatar={setAvatar} opcoes={avataresDisponiveis} />
              </div>

              {/* Nome */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                  Nome do usuário
                </label>
                <div className="relative">
                  <LucideIcons.User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-slate-50 h-11 pl-11 pr-3 rounded-full outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 font-medium text-[13px] uppercase text-slate-700 border border-slate-200 transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                  E-mail Corporativo
                </label>
                <div className="relative">
                  <LucideIcons.Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 h-11 pl-11 pr-3 rounded-full outline-none focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-100 font-medium text-[13px] text-slate-700 border border-slate-200 transition-all placeholder:text-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Senha e Cargo */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                    Senha Segura
                  </label>
                  <div className="relative">
                    <LucideIcons.Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      placeholder="Min. 6 dígitos"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      minLength={6}
                      className="w-full bg-slate-50 h-11 pl-11 pr-12 rounded-2xl outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 font-bold text-sm text-slate-800 border border-slate-200 transition-all placeholder:text-slate-300 placeholder:font-medium"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-xs"
                    >
                      {mostrarSenha ? <LucideIcons.EyeOff size={14} /> : <LucideIcons.Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-2 pl-1">
                    Permissão
                  </label>
                  <div className="flex gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 h-11">
                    <button
                      type="button"
                      onClick={() => setCargo('garcom')}
                      className={`flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                        cargo === 'garcom' ? 'bg-white text-slate-800 shadow-xs border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Garçom
                    </button>
                    <button
                      type="button"
                      onClick={() => setCargo('admin')}
                      className={`flex-1 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                        cargo === 'admin' ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Botão Salvar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-slate-800 hover:bg-slate-900 shadow-lg shadow-slate-900/20 text-white font-bold h-11 rounded-4xl uppercase tracking-widest transition-all active:scale-95 text-[11px] flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? <LucideIcons.Loader2 size={18} className="animate-spin" /> : <><LucideIcons.Check size={18} strokeWidth={2.5} /> Confirmar Cadastro</>}
              </button>
            </form>
          </section>

          {/* LADO DIREITO: LISTA DA EQUIPE */}
          <section className="lg:col-span-7">
            <div className="flex items-center justify-between mb-5 px-2">
              <h2 className="text-xs font-medium text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Membros da Equipe
              </h2>
              <span className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xs">
                {contexto.usuarios.length} Usuários
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {contexto.usuarios.map(u => {
                const isBloqueado = u.status === 'bloqueado';
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => abrirModalEditar(u)}
                    className={`group w-full bg-white p-3.5 rounded-4xl flex items-center justify-between shadow-xs border hover:shadow-md active:scale-95 transition-all duration-300 text-left ${
                      isBloqueado ? 'border-rose-200 opacity-70' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 relative">
                      {isBloqueado && (
                        <div className="absolute -top-1 -left-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white z-10" title="Usuário Bloqueado" />
                      )}
                      <AvatarUsuario
                        avatar={u.avatar}
                        nome={u.nome}
                        className={`w-11 h-11 rounded-full border group-hover:scale-110 transition-transform duration-300 ${
                          isBloqueado ? 'bg-rose-50 border-rose-100 grayscale' : 'bg-slate-50 border-slate-100'
                        }`}
                        emojiClassName="text-2xl"
                      />
                      <div className="flex flex-col min-w-0 pr-2">
                        <p className={`font-semibold text-[13px] uppercase tracking-tight truncate ${
                          isBloqueado ? 'text-rose-900 line-through decoration-rose-300/50' : 'text-slate-800'
                        }`}>
                          {u.nome}
                        </p>
                        <span className={`w-max text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md mt-1 border ${
                          (u.cargo === 'admin' || u.cargo === 'super_admin') && !isBloqueado ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {isBloqueado ? 'Bloqueado' : (u.cargo === 'super_admin' ? 'Super Admin' : u.cargo === 'admin' ? 'Admin' : 'Garçom')}
                        </span>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-4xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors shrink-0">
                      <LucideIcons.Pencil size={16} strokeWidth={2.5} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* MODAL DE EDIÇÃO */}
      {usuarioEditando && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setUsuarioEditando(null)} />

          <div className="bg-white rounded-4xl w-full max-w-sm p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-0.5">Editar Perfil</h3>
              </div>
              <button
                type="button"
                onClick={() => setUsuarioEditando(null)}
                className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-4xl flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors active:scale-95"
              >
                <LucideIcons.X size={17} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleSalvarEdicao} className="space-y-3.5">
              <div className="flex justify-center -mt-5">
                <SeletorAvatarDropdown
                  avatarAtual={avatar}
                  setAvatar={setAvatar}
                  opcoes={avataresDisponiveis}
                />
              </div>

              {/* Nome */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">Nome</label>
                <div className="relative">
                  <LucideIcons.User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full bg-slate-50 h-10 pl-11 pr-3 rounded-full outline-none uppercase focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 font-medium text-[13px] text-slate-800 border border-slate-200 transition-all"
                    required
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">E-mail Corporativo</label>
                <div className="relative">
                  <LucideIcons.Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 h-10 pl-11 pr-3 rounded-full outline-none font-medium text-[13px] text-slate-800 border border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Permissão */}
              <div className="pt-1">
                <label className="text-[10px] font-medium text-slate-400 uppercase tracking-widest block mb-1.5 pl-2">Acesso</label>
                {usuarioEditando.cargo === 'super_admin' ? (
                  <div className="flex items-center justify-center gap-1.5 bg-indigo-50 p-1.5 rounded-full border border-indigo-200 h-10 text-indigo-700 text-xs font-bold uppercase tracking-widest">
                    <LucideIcons.ShieldCheck size={15} />
                    <span>Super Admin</span>
                  </div>
                ) : (
                  <div className="flex gap-1.5 bg-slate-50 p-1.5 rounded-full border border-slate-200 h-10">
                    <button
                      type="button"
                      onClick={() => setCargo('garcom')}
                      className={`flex-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                        cargo === 'garcom' ? 'bg-white text-slate-800 shadow-xs border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Garçom
                    </button>
                    <button
                      type="button"
                      onClick={() => setCargo('admin')}
                      className={`flex-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                        cargo === 'admin' ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Admin
                    </button>
                  </div>
                )}
              </div>

              {/* Ações Rápidas (Segurança) */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleResetarSenha}
                  disabled={loading}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 h-9 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <LucideIcons.Key size={13} strokeWidth={2.5} /> Reset Senha
                </button>
                <button
                  type="button"
                  onClick={handleToggleBloqueio}
                  disabled={loading}
                  className={`flex-1 border h-9 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                    usuarioEditando.status === 'bloqueado'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                  }`}
                >
                  {usuarioEditando.status === 'bloqueado' ? (
                    <><LucideIcons.Unlock size={13} strokeWidth={2.5} /> Desbloquear</>
                  ) : (
                    <><LucideIcons.Lock size={13} strokeWidth={2.5} /> Bloquear Conta</>
                  )}
                </button>
              </div>

              {/* Salvar / Excluir */}
              <div className="pt-3 mt-3 border-t border-slate-100 flex gap-3">
                {garcomLogado?.id !== usuarioEditando.id && (
                  <button
                    type="button"
                    onClick={() => excluirUsuario(usuarioEditando.id, usuarioEditando.nome)}
                    className="w-10 h-10 bg-white text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-full flex items-center justify-center transition-all shrink-0 active:scale-95"
                    title="Excluir Usuário Permanentemente"
                  >
                    <LucideIcons.Trash2 size={17} />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-70 shadow-lg shadow-slate-600/30 text-white font-bold h-10 rounded-full uppercase tracking-widest transition-all active:scale-95 text-[11px] flex items-center justify-center gap-2"
                >
                  {loading ? <LucideIcons.Loader2 size={16} className="animate-spin" /> : <><LucideIcons.Save size={16} /> Atualizar usuário</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ModalConfirmacao {...modalConfirmacao} onCancelar={fecharConfirmacao} />
    </div>
  );
}
