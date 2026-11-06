// src/pages/AdminAssinaturaRenovar.tsx
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
  adicionarMesesNoMesmoDia,
  formatarCompetencia,
  formatarMesAno,
  type FaturaAssinatura,
  type StatusFatura
} from '../utils/faturasSaaS';

interface RespostaPreferenciaMP {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
}

const ORDEM_CICLOS: IdCicloCobranca[] = ['mensal', 'trimestral', 'semestral', 'anual'];

export function AdminAssinaturaRenovar() {
  const { dadosEmpresa, garcomLogado, carregarDados } = useAppContext();

  const [configSaaS, setConfigSaaS] = useState<ConfiguracaoGlobalSaaS>(() =>
    obterConfiguracaoGlobalLocal()
  );

  const [cicloSelecionadoId, setCicloSelecionadoId] = useState<IdCicloCobranca>(() => {
    const cicloEmp = dadosEmpresa?.ciclo_cobranca as IdCicloCobranca | undefined;
    if (cicloEmp && ORDEM_CICLOS.includes(cicloEmp)) {
      return cicloEmp;
    }
    return 'trimestral';
  });

  // Estados do PIX (QR Code + Copia e Cola)
  const [dadosPix, setDadosPix] = useState<DadosPixMercadoPago | null>(null);
  const [faturaAlvoPix, setFaturaAlvoPix] = useState<FaturaAssinatura | null>(null);
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
  const [faturasSalvas, setFaturasSalvas] = useState<FaturaAssinatura[]>([]);
  const [carregandoFaturas, setCarregandoFaturas] = useState<boolean>(true);
  const [faturaReciboSelecionada, setFaturaReciboSelecionada] = useState<FaturaAssinatura | null>(null);

  const secaoPixRef = useRef<HTMLDivElement>(null);

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
      setFaturasSalvas(lista);
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
          setFaturasSalvas(lista);
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

  const dataSelecaoHoje = useMemo(() => new Date(), []);
  const diaVencimentoSelecionado = dataSelecaoHoje.getDate();

  /**
   * Cronograma de faturas mensais vinculadas ao PIX para o ciclo selecionado.
   * Caso o cliente escolha Trimestral em diante (3, 6 ou 12 meses), gera uma fatura ligada ao PIX
   * para cada mês referente àquele ciclo com vencimento exatamente no mesmo dia que está sendo selecionado,
   * sem uso de boleto e com preparação fiscal SaaS (RPS/NFS-e).
   */
  const faturasExibidasCiclo: FaturaAssinatura[] = useMemo(() => {
    const empresaId = dadosEmpresa?.id || 'EMP001';
    const prefixoEmpresa = empresaId.substring(0, 6).toUpperCase();
    const qtdMeses = Math.max(1, cicloSelecionado.meses);
    const valorMensal = Number(cicloSelecionado.valorMensalEquivalente.toFixed(2));
    const planoNome = dadosEmpresa?.plano_nome || configSaaS.planoNome;

    const mapaPagas = new Map<string, FaturaAssinatura>();
    faturasSalvas.forEach((f) => {
      if (f.status === 'paga') {
        mapaPagas.set(f.mesAnoReferencia, f);
      }
    });

    const cronogramaMensal: FaturaAssinatura[] = [];

    for (let i = 0; i < qtdMeses; i += 1) {
      const dataVencMes = adicionarMesesNoMesmoDia(
        dataSelecaoHoje,
        i,
        diaVencimentoSelecionado
      );
      const competenciaBase = formatarCompetencia(dataVencMes);
      const mesAnoRef = formatarMesAno(dataVencMes);
      const faturaJaPaga = mapaPagas.get(mesAnoRef);

      if (faturaJaPaga && pagamentoConfirmado) {
        cronogramaMensal.push(faturaJaPaga);
        continue;
      }

      const statusFatura: StatusFatura = pagamentoConfirmado ? 'paga' : 'pendente';
      const idFatura = `FAT-${mesAnoRef.replace('-', '')}-${prefixoEmpresa}-${String(i + 1).padStart(2, '0')}`;
      const codigoFiscal = `RPS-PIX-${mesAnoRef.replace('-', '')}-${String(i + 1).padStart(2, '0')}`;

      cronogramaMensal.push({
        id: idFatura,
        empresaId,
        competencia: qtdMeses > 1 ? `${competenciaBase} • Mês ${i + 1}/${qtdMeses}` : competenciaBase,
        mesAnoReferencia: mesAnoRef,
        valor: valorMensal,
        dataEmissao: dataSelecaoHoje.toISOString(),
        dataVencimento: dataVencMes.toISOString(),
        dataPagamento: pagamentoConfirmado ? new Date().toISOString() : undefined,
        status: statusFatura,
        formaPagamento: 'PIX Vinculado (Sem Boleto)',
        paymentIdMp: dadosPix?.paymentId,
        planoNome,
        cicloNome: cicloSelecionado.nome,
        parcelaNumero: i + 1,
        totalParcelasCiclo: qtdMeses,
        codigoFiscalSerie: codigoFiscal,
        regimeTributarioSaaS: 'Serviço SaaS • Código LC 116/03 (1.05)'
      });
    }

    // Inclui também faturas históricas pagas de meses anteriores ao ciclo atual
    const mesesCronograma = new Set(cronogramaMensal.map((c) => c.mesAnoReferencia));
    const historicasAnteriores = faturasSalvas.filter(
      (f) => f.status === 'paga' && !mesesCronograma.has(f.mesAnoReferencia)
    );

    return [...cronogramaMensal, ...historicasAnteriores];
  }, [
    cicloSelecionado,
    configSaaS.planoNome,
    dadosEmpresa?.id,
    dadosEmpresa?.plano_nome,
    dadosPix?.paymentId,
    dataSelecaoHoje,
    diaVencimentoSelecionado,
    faturasSalvas,
    pagamentoConfirmado
  ]);

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
            texto: `Pagamento PIX confirmado! As faturas do ciclo ${cicloPago.nome} foram quitadas e sua assinatura renovada.`
          });
        } else if (!silencioso) {
          setMensagemFeedback({
            tipo: 'info',
            texto:
              'Aguardando compensação do PIX no Mercado Pago. Assim que concluir no app do seu banco, a confirmação ocorre automaticamente.'
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

  const handleGerarPix = async (faturaEspecifica?: FaturaAssinatura) => {
    if (gerandoPix) return;
    setGerandoPix(true);
    setMensagemFeedback(null);
    setPagamentoConfirmado(false);
    setFaturaAlvoPix(faturaEspecifica || null);

    try {
      if (!tokenMPAtivo) {
        throw new Error(
          'Credencial do Mercado Pago não configurada no servidor. Entre em contato com o suporte.'
        );
      }

      const nomeEstab = dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA;
      const emailPagador =
        dadosEmpresa?.email_contato || garcomLogado?.email || 'cliente@tsystembeach.com.br';

      const valorCobranca = faturaEspecifica
        ? faturaEspecifica.valor
        : cicloSelecionado.valorTotalCiclo;

      const descricaoCobranca = faturaEspecifica
        ? `${configSaaS.nomeSistema} • Fatura ${faturaEspecifica.competencia} (${cicloSelecionado.nome}) - ${nomeEstab}`
        : `${configSaaS.nomeSistema} - ${configSaaS.planoNome} (${cicloSelecionado.nome}) - ${nomeEstab}`;

      const pixGerado = await gerarPagamentoPixMercadoPago({
        valor: valorCobranca,
        descricao: descricaoCobranca,
        emailPagador,
        nomePagador: garcomLogado?.nome || nomeEstab,
        documentoPagador: dadosEmpresa?.documento,
        externalReference: `${dadosEmpresa?.id || 'empresa'}|${cicloSelecionado.id}|${faturaEspecifica?.id || 'ciclo'}`,
        cicloId: cicloSelecionado.id,
        tokenMP: tokenMPAtivo
      });

      setDadosPix(pixGerado);
      if (secaoPixRef.current) {
        secaoPixRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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

  return (
    <div className="min-h-screen bg-slate-50/40 font-sans flex flex-col relative antialiased text-slate-800">
      <Header />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-22 pb-28 md:pt-24 md:pb-14 md:pl-24">
        {/* Cabeçalho da Página */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-medium text-slate-900 tracking-tight">
              Renovar Assinatura
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha a periodicidade desejada e gere o QR Code PIX para liberação imediata.
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-4xl text-xs font-medium bg-yellow-50 border border-yellow-200/80 text-yellow-800 shadow-2xs shrink-0">
            <LucideIcons.Sparkles size={13} className="text-yellow-600" />
            <span>PIX sem taxa</span>
          </span>
        </div>

        <div className="space-y-5">
          {/* CARD 1: SELEÇÃO DE CICLOS E GERAÇÃO DO QR CODE PIX */}
          <section
            ref={secaoPixRef}
            className="bg-white border border-slate-200/80 rounded-4xl p-5 sm:p-6 shadow-xs space-y-5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-4xl bg-yellow-50 border border-yellow-200/70 text-yellow-600 flex items-center justify-center shrink-0">
                  <LucideIcons.Layers size={17} strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-slate-900">
                    Ciclos disponíveis
                  </h2>
                  <p className="text-xs text-slate-400">
                    Vencimento mensal fixado todo dia {String(diaVencimentoSelecionado).padStart(2, '0')}
                  </p>
                </div>
              </div>

              {cicloSelecionado.descontoPercentual > 0 && (
                <span className="px-2.5 py-1 rounded-4xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[11px] font-medium">
                  Economia de {cicloSelecionado.descontoPercentual}%
                </span>
              )}
            </div>

            {/* Grade de Ciclos com Efeito 3D e Borda rounded-4xl */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {listaCiclosCalculados.map((ciclo) => {
                const selecionado = ciclo.id === cicloSelecionado.id;
                return (
                  <button
                    key={ciclo.id}
                    type="button"
                    onClick={() => {
                      setCicloSelecionadoId(ciclo.id);
                      setDadosPix(null);
                      setFaturaAlvoPix(null);
                      setPagamentoConfirmado(false);
                      setMensagemFeedback(null);
                    }}
                    className={`p-3.5 rounded-4xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5 active:scale-[0.99] ${
                      selecionado
                        ? 'bg-linear-to-b from-yellow-50/70 to-white border-yellow-400 ring-2 ring-yellow-400/25 shadow-sm'
                        : 'bg-slate-50/70 hover:bg-white border-slate-200/80 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-xs font-medium text-slate-800">{ciclo.nome}</span>
                      {ciclo.descontoPercentual > 0 && (
                        <span className="px-2 py-0.5 rounded-4xl bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200/60">
                          -{ciclo.descontoPercentual}%
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-900 tabular-nums">
                        {formatarMoeda(ciclo.valorMensalEquivalente)}
                        <span className="text-[10px] font-normal text-slate-400">/mês</span>
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                        {ciclo.meses > 1
                          ? `${ciclo.meses}x faturas PIX (${formatarMoeda(ciclo.valorTotalCiclo)})`
                          : `${ciclo.diasVigencia} dias de acesso`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Mensagem de Feedback */}
            {mensagemFeedback && (
              <div
                className={`flex items-start gap-2.5 p-3.5 rounded-4xl border text-xs ${
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

            {/* QR Code PIX Gerado ou Botões de Ação */}
            {dadosPix ? (
              <div className="bg-slate-50/70 border border-slate-200/90 rounded-4xl p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-4xl bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center">
                      <LucideIcons.QrCode size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-900">
                        {faturaAlvoPix
                          ? `PIX • Fatura ${faturaAlvoPix.competencia}`
                          : `PIX Gerado • Ciclo ${cicloSelecionado.nome}`}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Escaneie o QR Code ou copie o código PIX abaixo
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-900 tabular-nums">
                    {formatarMoeda(dadosPix.valor)}
                  </span>
                </div>

                {dadosPix.qrCodeBase64 && (
                  <div className="flex flex-col items-center justify-center py-2">
                    <div className="p-3.5 bg-white border border-slate-200 rounded-4xl shadow-xs">
                      <img
                        src={`data:image/png;base64,${dadosPix.qrCodeBase64}`}
                        alt="QR Code PIX Mercado Pago"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Sincronizado em tempo real com o Mercado Pago
                    </span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 block pl-1">
                    Código PIX Copia e Cola:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={dadosPix.qrCodeCopiaECola}
                      className="flex-1 h-10 px-4 rounded-4xl bg-white border border-slate-200 text-xs font-mono text-slate-700 select-all outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopiarCodigoPix}
                      className={`h-10 px-4 rounded-4xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95 ${
                        copiadoPix
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {copiadoPix ? (
                        <>
                          <LucideIcons.Check size={14} />
                          <span>Copiado</span>
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

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => {
                      setDadosPix(null);
                      setFaturaAlvoPix(null);
                    }}
                    className="w-full sm:w-auto h-9 px-4 rounded-4xl text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    Alterar ciclo
                  </button>

                  <button
                    type="button"
                    disabled={verificandoPagamento || pagamentoConfirmado}
                    onClick={() => void verificarStatusPix(false)}
                    className="w-full sm:w-auto h-9 px-4 rounded-4xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {verificandoPagamento ? (
                      <>
                        <LucideIcons.Loader2 size={14} className="animate-spin" />
                        <span>Verificando pagamento...</span>
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
              /* Botão Gerar QR Code PIX (sem repetir valor dentro do botão) + Checkout */
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={gerandoPix}
                  onClick={() => void handleGerarPix()}
                  className="flex-1 h-11 rounded-4xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {gerandoPix ? (
                    <>
                      <LucideIcons.Loader2 size={16} className="animate-spin" />
                      <span>Gerando QR Code PIX...</span>
                    </>
                  ) : (
                    <>
                      <LucideIcons.QrCode size={16} className="text-yellow-400" />
                      <span>Gerar QR Code PIX</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={abrindoCheckout}
                  onClick={handleAbrirCheckoutCartao}
                  className="h-11 px-5 rounded-4xl bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
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

          {/* CARD 2: HISTÓRICO DE MENSALIDADES E FATURAS (COM CRONOGRAMA MENSAL PIX E PREPARO FISCAL SAAS) */}
          <section className="bg-white border border-slate-200/80 rounded-4xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-9 h-9 rounded-4xl bg-slate-100 border border-slate-200/70 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <LucideIcons.ReceiptText size={17} strokeWidth={1.9} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-medium text-slate-900">
                      Histórico de Mensalidades e Faturas
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-4xl bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/70">
                      {cicloSelecionado.meses > 1
                        ? `${cicloSelecionado.meses} faturas mensais PIX`
                        : '1 fatura mensal PIX'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {cicloSelecionado.meses > 1
                      ? `Cronograma do ciclo ${cicloSelecionado.nome}: 1 fatura PIX para cada mês com vencimento todo dia ${String(diaVencimentoSelecionado).padStart(2, '0')}.`
                      : `Fatura mensal vinculada ao PIX com vencimento no dia ${String(diaVencimentoSelecionado).padStart(2, '0')} e conformidade fiscal SaaS.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void atualizarHistoricoFaturas()}
                title="Atualizar faturas"
                className="w-8 h-8 rounded-4xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors cursor-pointer shrink-0"
              >
                <LucideIcons.RotateCcw size={13} className={carregandoFaturas ? 'animate-spin' : ''} />
              </button>
            </div>

            {carregandoFaturas && faturasExibidasCiclo.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-yellow-500 rounded-full animate-spin" />
                <span>Carregando faturas...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {faturasExibidasCiclo.map((fatura) => {
                  const isPaga = fatura.status === 'paga';
                  const isAtraso = fatura.status === 'em_atraso';
                  const dataVencFormatada = new Date(fatura.dataVencimento).toLocaleDateString('pt-BR');
                  const dataPagFormatada = fatura.dataPagamento
                    ? new Date(fatura.dataPagamento).toLocaleDateString('pt-BR')
                    : dataVencFormatada;

                  return (
                    <div
                      key={fatura.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-4xl bg-slate-50/60 hover:bg-white border border-slate-200/75 hover:border-slate-300/90 shadow-2xs hover:shadow-xs transition-all gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-4xl flex items-center justify-center shrink-0 border ${
                            isPaga
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/70'
                              : isAtraso
                                ? 'bg-rose-50 text-rose-600 border-rose-200/70'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200/80'
                          }`}
                        >
                          {isPaga ? (
                            <LucideIcons.CheckCircle2 size={17} strokeWidth={2} />
                          ) : (
                            <LucideIcons.QrCode size={16} strokeWidth={2} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                              {fatura.competencia}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-4xl text-[10px] font-medium ${
                                isPaga
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                                  : isAtraso
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200/70'
                                    : 'bg-white text-slate-600 border border-slate-200/80'
                              }`}
                            >
                              {isPaga ? 'Quitada via PIX' : 'Fatura PIX'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
                            <span>
                              {isPaga
                                ? `Liquidada em ${dataPagFormatada}`
                                : `Vencimento: ${dataVencFormatada}`}
                            </span>
                            {fatura.codigoFiscalSerie && (
                              <span className="font-mono text-[10px] text-slate-400">
                                • {fatura.codigoFiscalSerie}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pl-12 sm:pl-0">
                        <span className="text-sm font-medium text-slate-900 tabular-nums">
                          {formatarMoeda(fatura.valor)}
                        </span>

                        {isPaga ? (
                          <button
                            type="button"
                            onClick={() => setFaturaReciboSelecionada(fatura)}
                            className="h-8 px-3.5 rounded-4xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                          >
                            <LucideIcons.FileText size={13} className="text-slate-500" />
                            <span>Recibo Fiscal</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={gerandoPix}
                            onClick={() => void handleGerarPix(fatura)}
                            className="h-8 px-3.5 rounded-4xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <LucideIcons.QrCode size={13} className="text-yellow-400" />
                            <span>PIX Mês</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rodapé de Conformidade Fiscal SaaS (Sem Boleto) */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <LucideIcons.ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                <span>
                  Faturas geradas exclusivamente via PIX (isento de taxa de boleto bancário).
                </span>
              </div>
              <span className="font-mono text-[10px] text-slate-400">
                Padrão Fiscal SaaS • RPS / NFS-e
              </span>
            </div>
          </section>
        </div>
      </main>

      {/* MODAL DE RECIBO / DOCUMENTO AUXILIAR DE FATURA SAAS */}
      {faturaReciboSelecionada && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setFaturaReciboSelecionada(null)}
        >
          <div
            className="w-full max-w-sm bg-white border border-slate-100 rounded-4xl shadow-2xl p-6 relative font-sans animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFaturaReciboSelecionada(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-4xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <LucideIcons.X size={15} />
            </button>

            <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-4xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mb-2">
                <LucideIcons.CheckCircle2 size={24} strokeWidth={2} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                Recibo Fiscal de Fatura SaaS
              </span>
              <h3 className="text-lg font-medium text-slate-900 mt-0.5">
                {formatarMoeda(faturaReciboSelecionada.valor)}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {faturaReciboSelecionada.codigoFiscalSerie || faturaReciboSelecionada.id}
              </p>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-slate-600 border-b border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Estabelecimento:</span>
                <span className="font-medium text-slate-900 text-right truncate max-w-44">
                  {dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA}
                </span>
              </div>

              {dadosEmpresa?.documento && (
                <div className="flex justify-between">
                  <span className="text-slate-400">CPF / CNPJ Tomador:</span>
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
                <span className="text-slate-400">Plano / Ciclo:</span>
                <span className="text-slate-800">
                  {faturaReciboSelecionada.planoNome} ({faturaReciboSelecionada.cicloNome})
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Vencimento da Fatura:</span>
                <span className="text-slate-800">
                  {new Date(faturaReciboSelecionada.dataVencimento).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Método de Liquidação:</span>
                <span className="font-medium text-emerald-700">
                  PIX Mercado Pago
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Classificação Fiscal:</span>
                <span className="text-slate-700 text-right">
                  {faturaReciboSelecionada.regimeTributarioSaaS || 'Licenciamento SaaS (ISS)'}
                </span>
              </div>
            </div>

            <div className="pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-10 rounded-4xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LucideIcons.Printer size={14} />
                <span>Imprimir Comprovante</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
