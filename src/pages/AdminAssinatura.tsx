// src/pages/AdminAssinatura.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import {
  obterConfiguracaoGlobalLocal,
  carregarConfiguracaoGlobalSaaS,
  obterAccessTokenMercadoPago,
  ehPublicKeyMercadoPago,
  gerarPagamentoPixMercadoPago,
  consultarStatusPagamentoMercadoPago,
  ativarOuRenovarAssinaturaAposPagamento,
  requisitarApiMercadoPago,
  obterUrlBaseSistema,
  type ConfiguracaoGlobalSaaS,
  type IdCicloCobranca,
  type CicloAssinaturaConfig,
  type DadosPixMercadoPago
} from '../utils/configuracoesSaaS';
import {
  carregarFaturasEmpresa,
  type FaturaAssinatura
} from '../utils/faturasSaaS';

interface RespostaPreferenciaMP {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
}

const ORDEM_CICLOS: IdCicloCobranca[] = ['mensal', 'trimestral', 'semestral', 'anual'];

export function AdminAssinatura() {
  const { dadosEmpresa, garcomLogado, carregarDados } = useAppContext();

  const [configSaaS, setConfigSaaS] = useState<ConfiguracaoGlobalSaaS>(() =>
    obterConfiguracaoGlobalLocal()
  );
  const [cicloSelecionadoId, setCicloSelecionadoId] = useState<IdCicloCobranca>(() => {
    const cicloEmp = dadosEmpresa?.ciclo_cobranca as IdCicloCobranca | undefined;
    if (cicloEmp && ORDEM_CICLOS.includes(cicloEmp)) {
      return cicloEmp;
    }
    return 'mensal';
  });

  // Estados do PIX (QR Code + Copia e Cola)
  const [dadosPix, setDadosPix] = useState<DadosPixMercadoPago | null>(null);
  const [gerandoPix, setGerandoPix] = useState<boolean>(false);
  const [abrindoCheckout, setAbrindoCheckout] = useState<boolean>(false);
  const [verificandoPagamento, setVerificandoPagamento] = useState<boolean>(false);
  const [copiadoPix, setCopiadoPix] = useState<boolean>(false);
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState<boolean>(false);
  const [mensagemFeedback, setMensagemFeedback] = useState<{
    tipo: 'sucesso' | 'erro' | 'info';
    texto: string;
  } | null>(null);

  // Histórico de Faturas / Mensalidades
  const [faturas, setFaturas] = useState<FaturaAssinatura[]>([]);
  const [carregandoFaturas, setCarregandoFaturas] = useState<boolean>(true);
  const [faturaReciboSelecionada, setFaturaReciboSelecionada] = useState<FaturaAssinatura | null>(null);

  const secaoPagamentoRef = useRef<HTMLDivElement>(null);

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

  const tokenMPAtivo = useMemo(
    () => obterAccessTokenMercadoPago(configSaaS),
    [configSaaS]
  );

  // Carrega e sincroniza o histórico de faturas
  const atualizarHistoricoFaturas = useCallback(async () => {
    if (!dadosEmpresa?.id) return;
    try {
      setCarregandoFaturas(true);
      const lista = await carregarFaturasEmpresa(dadosEmpresa.id, dadosEmpresa);
      setFaturas(lista);
    } catch {
      // Ignora erro
    } finally {
      setCarregandoFaturas(false);
    }
  }, [dadosEmpresa]);

  useEffect(() => {
    let cancelado = false;
    if (!dadosEmpresa?.id) return;

    carregarFaturasEmpresa(dadosEmpresa.id, dadosEmpresa)
      .then((lista) => {
        if (!cancelado) {
          setFaturas(lista);
          setCarregandoFaturas(false);
        }
      })
      .catch(() => {
        if (!cancelado) {
          setCarregandoFaturas(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [dadosEmpresa]);

  // Cálculo dos ciclos respeitando eventual valor personalizado definido para este estabelecimento
  const valorMensalPadraoGlobal = configSaaS.ciclos.mensal.valorMensalEquivalente || 149.9;
  const valorMensalEmpresa = dadosEmpresa?.valor_mensalidade;
  const possuiValorPersonalizado =
    typeof valorMensalEmpresa === 'number' &&
    valorMensalEmpresa > 0 &&
    Math.abs(valorMensalEmpresa - valorMensalPadraoGlobal) > 0.01;

  const listaCiclosCalculados: CicloAssinaturaConfig[] = useMemo(() => {
    const ciclosBase = ORDEM_CICLOS.map((id) => configSaaS.ciclos[id]).filter((c) => c.ativo);
    const lista = ciclosBase.length > 0 ? ciclosBase : [configSaaS.ciclos.mensal];

    if (!possuiValorPersonalizado || !valorMensalEmpresa) {
      return lista;
    }

    const cicloPreferencial =
      (dadosEmpresa?.ciclo_cobranca as IdCicloCobranca | undefined) || 'mensal';

    return lista.map((ciclo) => {
      if (ciclo.id === cicloPreferencial) {
        const totalPersonalizado = Number((valorMensalEmpresa * ciclo.meses).toFixed(2));
        return {
          ...ciclo,
          valorMensalEquivalente: Number(valorMensalEmpresa.toFixed(2)),
          valorTotalCiclo: totalPersonalizado,
          periodicidadeLabel:
            ciclo.meses === 1
              ? 'Valor exclusivo do seu estabelecimento'
              : `Total de R$ ${totalPersonalizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a cada ${ciclo.meses} meses`
        };
      }

      const fatorDesconto = 1 - (ciclo.descontoPercentual || 0) / 100;
      const mensalProp = Number((valorMensalEmpresa * fatorDesconto).toFixed(2));
      const totalProp = Number((mensalProp * ciclo.meses).toFixed(2));
      return {
        ...ciclo,
        valorMensalEquivalente: mensalProp,
        valorTotalCiclo: totalProp,
        periodicidadeLabel:
          ciclo.meses === 1
            ? 'Cobrança mensal sem fidelidade'
            : `Total de R$ ${totalProp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a cada ${ciclo.meses} meses`
      };
    });
  }, [configSaaS.ciclos, dadosEmpresa?.ciclo_cobranca, possuiValorPersonalizado, valorMensalEmpresa]);

  const cicloSelecionado =
    listaCiclosCalculados.find((c) => c.id === cicloSelecionadoId) || listaCiclosCalculados[0];

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

  // Verifica se o PIX gerado foi pago
  const verificarStatusPix = useCallback(
    async (silencioso = false) => {
      if (!dadosPix?.paymentId || !tokenMPAtivo || !dadosEmpresa?.id || pagamentoConfirmado) return;

      if (!silencioso) setVerificandoPagamento(true);
      try {
        const res = await consultarStatusPagamentoMercadoPago(dadosPix.paymentId, tokenMPAtivo);
        if (res.approved) {
          setPagamentoConfirmado(true);
          const cicloPago =
            listaCiclosCalculados.find((c) => c.id === dadosPix.cicloId) || cicloSelecionado;

          await ativarOuRenovarAssinaturaAposPagamento({
            empresaId: dadosEmpresa.id,
            dataVencimentoAtual: dadosEmpresa.data_vencimento,
            statusAssinaturaAtual: dadosEmpresa.status_assinatura,
            planoNome: configSaaS.planoNome,
            ciclo: cicloPago,
            paymentId: dadosPix.paymentId
          });

          await carregarDados(true);
          await atualizarHistoricoFaturas();
          setMensagemFeedback({
            tipo: 'sucesso',
            texto: `Pagamento PIX aprovado! Sua fatura (${cicloPago.nome}) foi quitada e a assinatura renovada com sucesso.`
          });
        } else if (!silencioso) {
          setMensagemFeedback({
            tipo: 'info',
            texto:
              'Pagamento ainda aguardando compensação no Mercado Pago. Assim que pagar no app do seu banco, a confirmação ocorre em segundos.'
          });
        }
      } catch {
        if (!silencioso) {
          setMensagemFeedback({
            tipo: 'erro',
            texto: 'Não foi possível consultar o status agora. Tente novamente em instantes.'
          });
        }
      } finally {
        if (!silencioso) setVerificandoPagamento(false);
      }
    },
    [
      carregarDados,
      configSaaS.planoNome,
      cicloSelecionado,
      dadosEmpresa,
      dadosPix,
      listaCiclosCalculados,
      pagamentoConfirmado,
      tokenMPAtivo,
      atualizarHistoricoFaturas
    ]
  );

  // Polling automático a cada 5 segundos enquanto o QR Code PIX estiver aberto aguardando pagamento
  useEffect(() => {
    if (!dadosPix || pagamentoConfirmado) return;
    const interval = setInterval(() => {
      void verificarStatusPix(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [dadosPix, pagamentoConfirmado, verificarStatusPix]);

  const handleGerarPix = async () => {
    if (gerandoPix) return;
    setGerandoPix(true);
    setMensagemFeedback(null);
    setPagamentoConfirmado(false);

    try {
      if (!tokenMPAtivo) {
        throw new Error(
          'Credencial do Mercado Pago não configurada no servidor. Entre em contato com o suporte.'
        );
      }

      const nomeEstab = dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA;
      const emailPagador =
        dadosEmpresa?.email_contato || garcomLogado?.email || 'cliente@tsystembeach.com.br';

      const pixGerado = await gerarPagamentoPixMercadoPago({
        valor: cicloSelecionado.valorTotalCiclo,
        descricao: `${configSaaS.nomeSistema} - ${configSaaS.planoNome} (${cicloSelecionado.nome}) - ${nomeEstab}`,
        emailPagador,
        nomePagador: garcomLogado?.nome || nomeEstab,
        documentoPagador: dadosEmpresa?.documento,
        externalReference: `${dadosEmpresa?.id || 'empresa'}|${cicloSelecionado.id}`,
        cicloId: cicloSelecionado.id,
        tokenMP: tokenMPAtivo
      });

      setDadosPix(pixGerado);
    } catch (err: unknown) {
      setMensagemFeedback({
        tipo: 'erro',
        texto:
          err instanceof Error
            ? err.message
            : 'Erro ao comunicar com o Mercado Pago para gerar o PIX.'
      });
    } finally {
      setGerandoPix(false);
    }
  };

  const handleCopiarCodigoPix = async () => {
    if (!dadosPix?.qrCodeCopiaECola) return;
    try {
      await navigator.clipboard.writeText(dadosPix.qrCodeCopiaECola);
      setCopiadoPix(true);
      setTimeout(() => setCopiadoPix(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleAbrirCheckoutCartao = async () => {
    if (abrindoCheckout) return;
    setAbrindoCheckout(true);
    setMensagemFeedback(null);

    try {
      if (!tokenMPAtivo) {
        throw new Error(
          'Credencial do Mercado Pago não configurada no servidor. Entre em contato com o suporte.'
        );
      }

      if (ehPublicKeyMercadoPago(tokenMPAtivo)) {
        throw new Error(
          'Credencial inválida no servidor. Entre em contato com o suporte.'
        );
      }

      const originUrl = obterUrlBaseSistema();
      const nomeEstab = dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA;
      const supabaseUrl = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || '').replace(/\/$/, '');
      const webhookUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/mercadopago-webhook` : undefined;

      const prefPayload: Record<string, unknown> = {
        items: [
          {
            id: `plano_${cicloSelecionado.id}`,
            title: `${configSaaS.nomeSistema} • ${configSaaS.planoNome} (${cicloSelecionado.nome})`,
            description: `Assinatura ${cicloSelecionado.nome} para ${nomeEstab}`,
            category_id: 'services',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: Number(cicloSelecionado.valorTotalCiclo)
          }
        ],
        payer: {
          email: dadosEmpresa?.email_contato || garcomLogado?.email || undefined
        },
        external_reference: `${dadosEmpresa?.id || 'estabelecimento'}|${cicloSelecionado.id}`,
        back_urls: {
          success: `${originUrl}/admin/assinatura?retorno_mp=aprovado&ciclo=${cicloSelecionado.id}`,
          pending: `${originUrl}/admin/assinatura?retorno_mp=pendente&ciclo=${cicloSelecionado.id}`,
          failure: `${originUrl}/admin/assinatura?retorno_mp=falha&ciclo=${cicloSelecionado.id}`
        },
        auto_return: 'approved',
        notification_url: webhookUrl,
        statement_descriptor: 'TSYSTEMBEACH'
      };

      const mpRes = await requisitarApiMercadoPago('/checkout/preferences', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenMPAtivo}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prefPayload)
      });

      const prefData = (await mpRes.json()) as RespostaPreferenciaMP;
      if (mpRes.ok && prefData.init_point) {
        window.location.assign(prefData.init_point);
        return;
      }

      throw new Error(prefData.message || 'Não foi possível abrir o Checkout Pro do Mercado Pago.');
    } catch (err: unknown) {
      setMensagemFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao abrir checkout do Mercado Pago.'
      });
    } finally {
      setAbrindoCheckout(false);
    }
  };

  const handlePagarFaturaPendente = () => {
    if (secaoPagamentoRef.current) {
      secaoPagamentoRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    void handleGerarPix();
  };

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col relative antialiased text-slate-800">
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
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
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
          <section className="bg-slate-100/75 border border-slate-200/60 rounded-2xl p-1.5 space-y-0.5">
            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/70">
              <div className="flex items-center gap-3 min-w-0">
                <LucideIcons.Crown size={18} strokeWidth={1.8} className="text-yellow-600 shrink-0" />
                <span className="text-sm font-normal text-slate-800 truncate">Plano contratado</span>
              </div>
              <span className="text-xs font-medium text-slate-900">
                {dadosEmpresa?.plano_nome || configSaaS.planoNome}
              </span>
            </div>

            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/70">
              <div className="flex items-center gap-3 min-w-0">
                <LucideIcons.Repeat size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                <span className="text-sm font-normal text-slate-800 truncate">Ciclo e mensalidade</span>
              </div>
              <span className="text-xs font-medium text-slate-700 capitalize tabular-nums">
                {dadosEmpresa?.ciclo_cobranca || 'Mensal'} •{' '}
                {formatarMoeda(Number(dadosEmpresa?.valor_mensalidade ?? valorMensalPadraoGlobal))}/mês
              </span>
            </div>

            <div className="flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/70">
              <div className="flex items-center gap-3 min-w-0">
                <LucideIcons.Calendar size={18} strokeWidth={1.8} className="text-slate-700 shrink-0" />
                <span className="text-sm font-normal text-slate-800 truncate">Vencimento da fatura</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-900 tabular-nums">
                  {infoVencimento.dataFormatada}
                </span>
                {infoVencimento.diasRestantes !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium tabular-nums ${
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
          <section className="bg-slate-100/75 border border-slate-200/60 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <LucideIcons.ShieldCheck size={16} strokeWidth={2} className="text-emerald-600" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                O que está incluído na sua assinatura
              </h2>
            </div>

            <div className="space-y-2">
              {configSaaS.recursosPlano.map((item, idx) => (
                <div
                  key={`${idx}-${item}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/80 text-xs text-slate-700"
                >
                  <LucideIcons.Check size={14} strokeWidth={2.5} className="text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* BLOCO 3: PAGAR FATURA OU RENOVAR COM PIX IMEDIATO (MERCADO PAGO) */}
          <section
            ref={secaoPagamentoRef}
            className="bg-slate-100/75 border border-slate-200/60 rounded-2xl p-4 space-y-4"
          >
            <div>
              <h2 className="text-sm font-medium text-slate-900">
                Pagar fatura ou renovar assinatura
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha o ciclo e gere o QR Code PIX para liberação automática na hora.
              </p>
            </div>

            {/* Seletor de Ciclos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {listaCiclosCalculados.map((ciclo) => {
                const selecionado = ciclo.id === cicloSelecionado.id;
                return (
                  <button
                    key={ciclo.id}
                    type="button"
                    onClick={() => {
                      setCicloSelecionadoId(ciclo.id);
                      setDadosPix(null);
                      setPagamentoConfirmado(false);
                      setMensagemFeedback(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selecionado
                        ? 'bg-white border-yellow-400 ring-2 ring-yellow-400/25 shadow-xs'
                        : 'bg-white/60 hover:bg-white border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-medium text-slate-800">{ciclo.nome}</span>
                      {ciclo.descontoPercentual > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                          -{ciclo.descontoPercentual}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 tabular-nums">
                      {formatarMoeda(ciclo.valorTotalCiclo)}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {ciclo.diasVigencia} dias de acesso
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Feedback de Erro / Sucesso */}
            {mensagemFeedback && (
              <div
                className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs ${
                  mensagemFeedback.tipo === 'sucesso'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : mensagemFeedback.tipo === 'erro'
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {mensagemFeedback.tipo === 'sucesso' ? (
                  <LucideIcons.CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : mensagemFeedback.tipo === 'erro' ? (
                  <LucideIcons.AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                ) : (
                  <LucideIcons.Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{mensagemFeedback.texto}</span>
              </div>
            )}

            {/* EXIBIÇÃO DO QR CODE PIX E COPIA E COLA QUANDO GERADO */}
            {dadosPix ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <LucideIcons.QrCode size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-900">
                        PIX Gerado • {cicloSelecionado.nome}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Escaneie o QR Code ou use o Pix Copia e Cola
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-900 tabular-nums">
                    {formatarMoeda(dadosPix.valor)}
                  </span>
                </div>

                {/* Imagem do QR Code Base64 oficial do Mercado Pago */}
                {dadosPix.qrCodeBase64 && (
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
                      <img
                        src={`data:image/png;base64,${dadosPix.qrCodeBase64}`}
                        alt="QR Code PIX Mercado Pago"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Aguardando pagamento em tempo real...
                    </span>
                  </div>
                )}

                {/* Campo Pix Copia e Cola */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 block">
                    Código PIX Copia e Cola:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={dadosPix.qrCodeCopiaECola}
                      className="flex-1 h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopiarCodigoPix}
                      className={`h-10 px-4 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                        copiadoPix
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {copiadoPix ? (
                        <>
                          <LucideIcons.Check size={14} />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <LucideIcons.Copy size={14} />
                          <span>Copiar PIX</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Botões de verificação manual ou troca */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDadosPix(null)}
                    className="w-full sm:w-auto h-9 px-3 rounded-xl text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Alterar ciclo ou método
                  </button>

                  <button
                    type="button"
                    disabled={verificandoPagamento || pagamentoConfirmado}
                    onClick={() => void verificarStatusPix(false)}
                    className="w-full sm:w-auto h-9 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {verificandoPagamento ? (
                      <>
                        <LucideIcons.Loader2 size={14} className="animate-spin" />
                        <span>Verificando no Mercado Pago...</span>
                      </>
                    ) : (
                      <>
                        <LucideIcons.RefreshCw size={14} />
                        <span>Já paguei, confirmar agora</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Botões para Gerar PIX ou Abrir Checkout */
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={gerandoPix}
                  onClick={handleGerarPix}
                  className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {gerandoPix ? (
                    <>
                      <LucideIcons.Loader2 size={16} className="animate-spin" />
                      <span>Gerando QR Code PIX...</span>
                    </>
                  ) : (
                    <>
                      <LucideIcons.QrCode size={16} className="text-yellow-400" />
                      <span>
                        Gerar QR Code PIX • {formatarMoeda(cicloSelecionado.valorTotalCiclo)}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={abrindoCheckout}
                  onClick={handleAbrirCheckoutCartao}
                  className="h-11 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {abrindoCheckout ? (
                    <LucideIcons.Loader2 size={15} className="animate-spin" />
                  ) : (
                    <LucideIcons.CreditCard size={15} className="text-slate-500" />
                  )}
                  <span>Cartão / Checkout</span>
                </button>
              </div>
            )}
          </section>

          {/* BLOCO 4: HISTÓRICO DE FATURAS E MENSALIDADES (PADRÃO GRANDES EMPRESAS SAAS) */}
          <section className="bg-slate-100/75 border border-slate-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LucideIcons.ReceiptText size={18} strokeWidth={1.8} className="text-slate-700" />
                <div>
                  <h2 className="text-sm font-medium text-slate-900">
                    Histórico de Mensalidades e Faturas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Acompanhe faturas pagas, recibos fiscais e vencimentos da sua assinatura.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void atualizarHistoricoFaturas()}
                title="Atualizar lista"
                className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <LucideIcons.RotateCcw size={13} className={carregandoFaturas ? 'animate-spin' : ''} />
              </button>
            </div>

            {carregandoFaturas && faturas.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-yellow-500 rounded-full animate-spin" />
                <span>Carregando faturas...</span>
              </div>
            ) : faturas.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-white/70 rounded-xl border border-dashed border-slate-200">
                Nenhuma fatura registrada até o momento.
              </div>
            ) : (
              <div className="space-y-1.5">
                {faturas.map((fatura) => {
                  const isPaga = fatura.status === 'paga';
                  const isAtraso = fatura.status === 'em_atraso';
                  const dataFormatada = fatura.dataPagamento
                    ? new Date(fatura.dataPagamento).toLocaleDateString('pt-BR')
                    : new Date(fatura.dataVencimento).toLocaleDateString('pt-BR');

                  return (
                    <div
                      key={fatura.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-all gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isPaga
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : isAtraso
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}
                        >
                          {isPaga ? (
                            <LucideIcons.CheckCircle2 size={18} strokeWidth={2} />
                          ) : isAtraso ? (
                            <LucideIcons.AlertCircle size={18} strokeWidth={2} />
                          ) : (
                            <LucideIcons.Clock size={18} strokeWidth={2} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {fatura.competencia}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                                isPaga
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                  : isAtraso
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/80'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200/80'
                              }`}
                            >
                              {isPaga ? 'Pago' : isAtraso ? 'Em atraso' : 'Pendente'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {isPaga
                              ? `Quitado em ${dataFormatada} via ${fatura.formaPagamento || 'PIX'}`
                              : `Vencimento em ${dataFormatada}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <span className="text-sm font-medium text-slate-900 tabular-nums">
                          {formatarMoeda(fatura.valor)}
                        </span>

                        {isPaga ? (
                          <button
                            type="button"
                            onClick={() => setFaturaReciboSelecionada(fatura)}
                            className="h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            <LucideIcons.FileText size={13} className="text-slate-500" />
                            <span>Recibo</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePagarFaturaPendente}
                            className="h-8 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            <LucideIcons.QrCode size={13} className="text-yellow-400" />
                            <span>Pagar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* MODAL DE RECIBO / COMPROVANTE DE FATURA PAGA */}
      {faturaReciboSelecionada && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFaturaReciboSelecionada(null)}
        >
          <div
            className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 relative font-sans animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fechar */}
            <button
              type="button"
              onClick={() => setFaturaReciboSelecionada(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <LucideIcons.X size={15} />
            </button>

            {/* Cabeçalho do Recibo */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-2">
                <LucideIcons.CheckCircle2 size={24} strokeWidth={2} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                Comprovante de Pagamento
              </span>
              <h3 className="text-lg font-medium text-slate-900 mt-0.5">
                {formatarMoeda(faturaReciboSelecionada.valor)}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {faturaReciboSelecionada.id}
              </p>
            </div>

            {/* Detalhes da Fatura */}
            <div className="py-4 space-y-2.5 text-xs text-slate-600 border-b border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Estabelecimento:</span>
                <span className="font-medium text-slate-900 text-right truncate max-w-44">
                  {dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA}
                </span>
              </div>

              {dadosEmpresa?.documento && (
                <div className="flex justify-between">
                  <span className="text-slate-400">CPF / CNPJ:</span>
                  <span className="font-mono text-slate-700">
                    {dadosEmpresa.documento}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-slate-400">Competência:</span>
                <span className="font-medium text-slate-900">
                  {faturaReciboSelecionada.competencia}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Plano:</span>
                <span className="text-slate-800">
                  {faturaReciboSelecionada.planoNome} ({faturaReciboSelecionada.cicloNome})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Data de Liquidação:</span>
                <span className="text-slate-800">
                  {faturaReciboSelecionada.dataPagamento
                    ? new Date(faturaReciboSelecionada.dataPagamento).toLocaleDateString('pt-BR')
                    : 'Confirmado'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Método de Quitação:</span>
                <span className="font-medium text-emerald-700">
                  {faturaReciboSelecionada.formaPagamento || 'PIX Instantâneo'}
                </span>
              </div>

              {faturaReciboSelecionada.paymentIdMp && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Autenticação MP:</span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {faturaReciboSelecionada.paymentIdMp}
                  </span>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LucideIcons.Printer size={14} />
                <span>Imprimir Recibo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
