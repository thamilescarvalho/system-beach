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
        dataFormatada: 'Sem vencimento definido',
        diasRestantes: null as number | null,
        vencida: status !== 'ativa'
      };
    }

    const apenasData = dataStr.split('T')[0];
    const [ano, mes, dia] = apenasData.split('-').map(Number);
    const dataLimite = new Date(ano, (mes || 1) - 1, dia || 1, 23, 59, 59, 999);
    const agora = new Date();
    const diffDias = Math.ceil((dataLimite.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));

    return {
      status,
      dataFormatada: dataLimite.toLocaleDateString('pt-BR'),
      diasRestantes: diffDias,
      vencida: diffDias < 0
    };
  }, [dadosEmpresa?.data_vencimento, dadosEmpresa?.status_assinatura]);

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-slate-50/40 font-sans flex flex-col relative antialiased text-slate-800">
      {/* HEADER GLOBAL */}
      <Header />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 pt-22 pb-28 md:pt-24 md:pb-12 md:pl-24">
        {/* Cabeçalho */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight">
              Assinatura e Faturas
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA}
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-4xl text-xs font-medium border ${
              infoVencimento.status === 'ativa' && !infoVencimento.vencida
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : infoVencimento.status === 'degustacao' && !infoVencimento.vencida
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                infoVencimento.status === 'ativa' && !infoVencimento.vencida
                  ? 'bg-emerald-500'
                  : infoVencimento.status === 'degustacao' && !infoVencimento.vencida
                    ? 'bg-yellow-500'
                    : 'bg-rose-500'
              }`}
            />
            {infoVencimento.status === 'ativa' && !infoVencimento.vencida
              ? 'Assinatura Ativa'
              : infoVencimento.status === 'degustacao' && !infoVencimento.vencida
                ? 'Período de Teste'
                : 'Pagamento Pendente'}
          </span>
        </div>

        <div className="space-y-4">
          {/* BLOCO 1: RESUMO DO PLANO ATUAL E PRÓXIMO VENCIMENTO */}
          <section className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-2 space-y-1">
            <div className="flex items-center justify-between px-4 py-3 rounded-4xl bg-white/85">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-4xl bg-yellow-50 border border-yellow-200/70 text-yellow-600 flex items-center justify-center shrink-0">
                  <LucideIcons.Crown size={16} strokeWidth={1.9} />
                </div>
                <span className="text-sm font-normal text-slate-800 truncate">Plano contratado</span>
              </div>
              <span className="text-xs font-medium text-slate-900">
                {dadosEmpresa?.plano_nome || configSaaS.planoNome}
              </span>
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-4xl bg-white/85">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-4xl bg-slate-50 border border-slate-200/70 text-slate-700 flex items-center justify-center shrink-0">
                  <LucideIcons.Repeat size={16} strokeWidth={1.9} />
                </div>
                <span className="text-sm font-normal text-slate-800 truncate">Ciclo e mensalidade</span>
              </div>
              <span className="text-xs font-medium text-slate-700 capitalize tabular-nums">
                {dadosEmpresa?.ciclo_cobranca || 'Mensal'} •{' '}
                {formatarMoeda(Number(dadosEmpresa?.valor_mensalidade ?? valorMensalPadraoGlobal))}/mês
              </span>
            </div>

            <div className="flex items-center justify-between px-4 py-3 rounded-4xl bg-white/85">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-4xl bg-slate-50 border border-slate-200/70 text-slate-700 flex items-center justify-center shrink-0">
                  <LucideIcons.Calendar size={16} strokeWidth={1.9} />
                </div>
                <span className="text-sm font-normal text-slate-800 truncate">Vencimento da fatura</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-900 tabular-nums">
                  {infoVencimento.dataFormatada}
                </span>
                {infoVencimento.diasRestantes !== null && (
                  <span
                    className={`px-2.5 py-0.5 rounded-4xl text-[10px] font-medium tabular-nums ${
                      infoVencimento.diasRestantes >= 5
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {infoVencimento.diasRestantes >= 0
                      ? `${infoVencimento.diasRestantes}d restantes`
                      : 'Vencida'}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* BLOCO 2: O QUE ESTÁ INCLUÍDO NO SEU PLANO */}
          <section className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3 px-1">
              <LucideIcons.ShieldCheck size={16} strokeWidth={2} className="text-emerald-600" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                O que está incluído na sua assinatura
              </h2>
            </div>

            <div className="space-y-1.5">
              {configSaaS.recursosPlano.map((item, idx) => (
                <div
                  key={`${idx}-${item}`}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-4xl bg-white/85 text-xs text-slate-700"
                >
                  <LucideIcons.Check size={14} strokeWidth={2.5} className="text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* BLOCO 3: BOTÃO MINIMALISTA PARA RENOVAR ASSINATURA E ACESSAR FATURAS PIX */}
          <section className="bg-white border border-slate-200/80 rounded-4xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-4xl bg-yellow-50 border border-yellow-200/80 text-yellow-600 flex items-center justify-center shrink-0">
                <LucideIcons.QrCode size={19} strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-slate-900">
                  Ciclos, PIX e Histórico de Faturas
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  Escolha a recorrência, gere o QR Code PIX ou consulte suas faturas mensais.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/admin/assinatura/renovar')}
              className="h-11 px-5 rounded-4xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer shrink-0"
            >
              <LucideIcons.Sparkles size={15} className="text-yellow-400" />
              <span>Renovar Assinatura</span>
              <LucideIcons.ArrowRight size={15} />
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
