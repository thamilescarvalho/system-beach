// src/pages/Admin.tsx
import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header'; 
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import {
  formatarCpfCnpj,
  formatarTelefoneBR,
  extrairDigitos,
  validarDocumentoBrasil,
  validarTelefoneBR,
  validarEmail
} from '../utils/validadores';

interface OpcaoMenuAdmin {
  title: string;
  icon: ReactNode;
  bg: string;
  shadow: string;
  onClick: () => void;
}

const LIMITE_NOME_EXIBICAO = 40;

export function Admin() {
  const navigate = useNavigate();
  const { dadosEmpresa, atualizarDadosMinhaEmpresa, garcomLogado } = useAppContext();

  // Controle de permissão de acesso: somente Admin do estabelecimento ou Super Admin
  const isAdmin = garcomLogado?.cargo === 'admin' || garcomLogado?.cargo === 'super_admin';

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

    // Validações de integridade
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
      }, 1000);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar os dados. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const nomePreview = nomeExibicao.trim() || nomeFantasia.trim() || NOME_PADRAO_SISTEMA;
  const previewPersonalizado = nomeExibicao.trim().length > 0;

  const menuOptions: OpcaoMenuAdmin[] = [
    { 
      title: 'Financeiro', 
      icon: <LucideIcons.Wallet size={18} strokeWidth={2} className="text-white" />, 
      bg: 'from-green-600 to-green-950 border-green-600/50',
      shadow: 'shadow-green-100/30 hover:shadow-green-100/50',
      onClick: () => navigate('/admin/financeiro')
    },
    { 
      title: 'Estoque',  
      icon: <LucideIcons.Box size={18} strokeWidth={2} className="text-white" />, 
      bg: 'from-cyan-600 to-cyan-950 border-cyan-600/50',
      shadow: 'shadow-cyan-100/30 hover:shadow-cyan-100/50',
      onClick: () => navigate('/admin/estoque')
    },
    { 
      title: 'Equipe', 
      icon: <LucideIcons.Users size={18} strokeWidth={2} className="text-white" />, 
      bg: 'from-slate-600 to-slate-950 border-slate-700/60',
      shadow: 'shadow-slate-100/30 hover:shadow-slate-100/50',
      onClick: () => navigate('/admin/equipe')
    },
    {
      title: 'Minha Empresa',
      icon: <LucideIcons.Store size={18} strokeWidth={2} className="text-white" />,
      bg: 'from-fuchsia-600 to-fuchsia-950 border-fuchsia-600/50',
      shadow: 'shadow-fuchsia-100/30 hover:shadow-fuchsia-100/50',
      onClick: abrirModalEmpresa
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative overflow-hidden">
      
      {/* HEADER GLOBAL */}
      <Header />

      {/* FUNDO AMBIENTE */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-lg max-h-lg bg-cyan-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-lg max-h-lg bg-blue-400/10 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000" />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full flex flex-col items-center justify-center px-4 pt-20 pb-20 md:pt-20 md:pb-6 md:pl-24 relative z-10">
        
        {/* Título de Seção */}
        <div className="mb-4 md:mb-10 flex flex-col items-center gap-1.5 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center gap-2 text-slate-500">
            <LucideIcons.ShieldCheck size={16} strokeWidth={2} className="text-slate-400" />
            <h1 className="text-[12px] md:text-xl font-sans tracking-widest uppercase text-center font-medium">
              Gestão Integrada
            </h1>
          </div>
        </div>

        {/* BOTÕES QUICK ACTIONS 3D */}
        <div className="w-full relative z-10 animate-in zoom-in-95 duration-500 mx-auto max-w-70 md:max-w-150">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-5">
            {menuOptions.map((opt) => (
              <button
                key={opt.title}
                type="button"
                onClick={opt.onClick}
                className={`
                  group relative w-full aspect-square rounded-2xl md:rounded-3xl
                  bg-linear-to-br ${opt.bg} border
                  shadow-xl ${opt.shadow}
                  hover:-translate-y-1 hover:shadow-2xl 
                  active:scale-95 active:translate-y-0
                  transition-all duration-300 ease-out flex flex-col items-center justify-center gap-2 overflow-hidden cursor-pointer
                `}
              >
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* CAIXA DO ÍCONE COM EFEITO 3D */}
                <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl md:rounded-xl bg-white/20 backdrop-blur-md shadow-inner border border-white/40 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 relative z-10">
                  {opt.icon}
                </div>
                
                {/* TEXTOS */}
                <div className="text-center flex flex-col items-center w-full relative z-10 px-2">
                  <span className="font-sans text-white text-[8px] md:text-[10px] tracking-widest uppercase mb-0.5 font-medium">
                    {opt.title}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

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
                <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100 flex items-center justify-center shrink-0">
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
              <span className="text-xs font-medium text-slate-400 block mb-2 pl-0.5">Pré-visualização do Header</span>
              <div className="h-12 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between px-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <LucideIcons.Umbrella size={18} strokeWidth={2.2} className="text-fuchsia-600 shrink-0" />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium text-slate-800 tracking-tight leading-none truncate">
                      {nomePreview}
                    </span>
                    {previewPersonalizado && (
                      <span className="text-[10px] text-slate-400 leading-none">{NOME_PADRAO_SISTEMA}</span>
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

              {/* Informações da Licença Atual (Informativo protegido) */}
              {dadosEmpresa?.status_assinatura && (
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 font-medium">
                      <LucideIcons.ShieldCheck size={14} className="text-emerald-500" />
                      Status do Plano:
                    </span>
                    <span className="font-semibold capitalize text-slate-900">
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
                  className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-fuchsia-800 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-slate-900/20 hover:shadow-md cursor-pointer"
                >
                  {salvando ? (
                    <>
                      <LucideIcons.Loader2 size={15} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <LucideIcons.Check size={15} />
                      <span>Salvar Minha Empresa</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
