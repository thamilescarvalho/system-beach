// src/pages/AdminAssinatura.tsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import {
  obterConfiguracaoGlobalLocal,
  carregarConfiguracaoGlobalSaaS,
  type ConfiguracaoGlobalSaaS
} from '../utils/configuracoesSaaS';

export function AdminAssinatura() {
  const navigate = useNavigate();
  const { dadosEmpresa } = useAppContext();

  const [configSaaS, setConfigSaaS] = useState<ConfiguracaoGlobalSaaS>(() =>
    obterConfiguracaoGlobalLocal()
  );

  useEffect(() => {
    let ativo = true;
    carregarConfiguracaoGlobalSaaS().then((remoto) => {
      if (ativo) {
        setConfigSaaS(remoto);
      }
    });
    return () => {
      ativo = false;
    };
  }, []);

  const valorMensalPadraoGlobal = configSaaS.ciclos.mensal.valorMensalEquivalente || 149.9;

  // Cálculo de dias restantes e status da assinatura atual
  const infoVencimento = useMemo(() => {
    const status = dadosEmpresa?.status_assinatura || 'pendente';
    const dataStr = dadosEmpresa?.data_vencimento;

    if (!dataStr) {
      return {
        status,
        dataFormatada: 'Sem vencimento',
        diasRestantes: null as number | null,
        vencida: status !== 'ativa',
        progressoPct: 0
      };
    }

    const apenasData = dataStr.split('T')[0];
    const [ano, mes, dia] = apenasData.split('-').map(Number);
    const dataLimite = new Date(ano, (mes || 1) - 1, dia || 1, 23, 59, 59, 999);
    const agora = new Date();
    const diffDias = Math.ceil((dataLimite.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
    const progressoPct = Math.max(0, Math.min(100, Math.round((diffDias / 30) * 100)));

    return {
      status,
      dataFormatada: dataLimite.toLocaleDateString('pt-BR'),
      diasRestantes: diffDias,
      vencida: diffDias < 0,
      progressoPct
    };
  }, [dadosEmpresa?.data_vencimento, dadosEmpresa?.status_assinatura]);

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const assinaturaOk = infoVencimento.status === 'ativa' && !infoVencimento.vencida;
  const emTeste = infoVencimento.status === 'degustacao' && !infoVencimento.vencida;

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans flex flex-col relative antialiased text-slate-800">
      <Header />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 pt-22 pb-28 md:pt-24 md:pb-12 md:pl-24">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Assinatura e Faturas
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA}
            </p>
          </div>

          <span
            className={`self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-medium border shadow-2xs ${
              assinaturaOk
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : emTeste
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                assinaturaOk
                  ? 'bg-emerald-500 animate-pulse'
                  : emTeste
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-rose-500'
              }`}
            />
            {assinaturaOk
              ? 'Assinatura Ativa'
              : emTeste
                ? 'Período de Teste'
                : 'Pagamento Pendente'}
          </span>
        </div>

        {/* GRID DESKTOP + MOBILE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUNA ESQUERDA: PLANO ATUAL + RECURSOS */}
          <div className="lg:col-span-7 space-y-5">
            {/* CARD 5D: RESUMO DO PLANO E VENCIMENTO */}
            <section className="bg-slate-100/80 border border-slate-200/70 rounded-3xl p-1.5 shadow-sm">
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-yellow-50 to-amber-100 border border-yellow-200/80 text-yellow-700 flex items-center justify-center shadow-xs shrink-0">
                      <LucideIcons.Crown size={22} strokeWidth={1.9} />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-400">Plano contratado</span>
                      <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                        {dadosEmpresa?.plano_nome || configSaaS.planoNome}
                      </h2>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-slate-400 block">Mensalidade atual</span>
                    <div className="flex items-baseline sm:justify-end gap-1">
                      <span className="text-2xl font-semibold text-slate-900 tabular-nums">
                        {formatarMoeda(Number(dadosEmpresa?.valor_mensalidade ?? valorMensalPadraoGlobal))}
                      </span>
                      <span className="text-xs text-slate-400">/mês</span>
                    </div>
                  </div>
                </div>

                {/* Grade de Métricas da Assinatura */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <LucideIcons.Repeat size={14} className="text-slate-600" />
                      <span>Recorrência</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 capitalize">
                      {dadosEmpresa?.ciclo_cobranca || 'Mensal'}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <LucideIcons.Calendar size={14} className="text-slate-600" />
                      <span>Vencimento</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">
                      {infoVencimento.dataFormatada}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50/90 border border-slate-200/60">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <LucideIcons.Clock size={14} className="text-slate-600" />
                      <span>Prazo restante</span>
                    </div>
                    <p
                      className={`text-sm font-semibold tabular-nums ${
                        infoVencimento.diasRestantes !== null && infoVencimento.diasRestantes >= 5
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {infoVencimento.diasRestantes === null
                        ? 'Não definido'
                        : infoVencimento.diasRestantes >= 0
                          ? `${infoVencimento.diasRestantes} dias`
                          : 'Fatura vencida'}
                    </p>
                  </div>
                </div>

                {infoVencimento.diasRestantes !== null && infoVencimento.diasRestantes >= 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Vigência do período</span>
                      <span className="tabular-nums">{infoVencimento.progressoPct}% restante</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          infoVencimento.diasRestantes >= 5 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${infoVencimento.progressoPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* CARD 5D: RECURSOS INCLUÍDOS */}
            <section className="bg-slate-100/80 border border-slate-200/70 rounded-3xl p-1.5 shadow-sm">
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center shrink-0">
                    <LucideIcons.ShieldCheck size={16} strokeWidth={2} />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Incluído na sua assinatura
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {configSaaS.recursosPlano.map((item, idx) => (
                    <div
                      key={`${idx}-${item}`}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-50/80 border border-slate-200/50 text-xs text-slate-700"
                    >
                      <LucideIcons.Check size={14} strokeWidth={2.5} className="text-emerald-600 shrink-0" />
                      <span className="leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA: AÇÕES DE RENOVAÇÃO E FATURAS */}
          <div className="lg:col-span-5 space-y-5">
            {/* CARD 5D PREMIUM: RENOVAR / GERENCIAR CICLO */}
            <section className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-700/80 rounded-3xl p-6 text-white shadow-xl space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                  <LucideIcons.QrCode size={22} className="text-yellow-400" />
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-medium">
                  PIX sem taxa
                </span>
              </div>

              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  Ciclos, PIX e Faturas
                </h2>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Escolha o ciclo ideal com desconto progressivo, pague via PIX instantâneo ou acesse seus recibos fiscais.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/admin/assinatura/renovar')}
                  className="w-full h-12 px-5 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
                >
                  <LucideIcons.Sparkles size={16} />
                  <span>Renovar Assinatura</span>
                  <LucideIcons.ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/admin/assinatura/renovar')}
                  className="w-full h-11 px-5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
                >
                  <LucideIcons.ReceiptText size={15} className="text-slate-300" />
                  <span>Ver Histórico de Faturas</span>
                </button>
              </div>
            </section>

            {/* CARD DE CONFIANÇA / SEGURANÇA SAAS */}
            <section className="bg-slate-100/80 border border-slate-200/70 rounded-3xl p-1.5 shadow-sm">
              <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <LucideIcons.Zap size={17} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">Liberação Automática</h3>
                    <p className="text-xs text-slate-500">Confirmação em segundos via Mercado Pago.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <LucideIcons.FileCheck2 size={17} />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900">Padrão Fiscal SaaS</h3>
                    <p className="text-xs text-slate-500">Recibos RPS/NFS-e organizados por competência.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
