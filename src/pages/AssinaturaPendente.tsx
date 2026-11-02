// src/pages/AssinaturaPendente.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../context/AppContext';
import { BotaoWhatsappFlutuante } from '../components/BotaoWhatsappFlutuante';
import {
  obterConfiguracaoGlobalLocal,
  carregarConfiguracaoGlobalSaaS,
  ehPublicKeyMercadoPago,
  requisitarApiMercadoPago,
  type ConfiguracaoGlobalSaaS,
  type IdCicloCobranca,
  type CicloAssinaturaConfig
} from '../utils/configuracoesSaaS';

interface RespostaCheckoutMP {
  init_point?: string;
  sandbox_init_point?: string;
  approved?: boolean;
  status?: string;
  error?: string;
}

interface RespostaPreferenciaDiretaMP {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
}

interface RespostaPagamentoDiretoMP {
  id?: number;
  status?: string;
  external_reference?: string;
}

const ORDEM_CICLOS: IdCicloCobranca[] = ['mensal', 'trimestral', 'semestral', 'anual'];

export function AssinaturaPendente() {
  const contexto = useAppContext();
  const navigate = useNavigate();
  const empresa = contexto?.dadosEmpresa;
  const loading = contexto?.carregandoContexto;

  const [configSaaS, setConfigSaaS] = useState<ConfiguracaoGlobalSaaS>(() => obterConfiguracaoGlobalLocal());
  const [cicloSelecionadoId, setCicloSelecionadoId] = useState<IdCicloCobranca>(() => {
    const cicloEmpresa = empresa?.ciclo_cobranca as IdCicloCobranca | undefined;
    if (cicloEmpresa && ORDEM_CICLOS.includes(cicloEmpresa)) {
      return cicloEmpresa;
    }
    return 'semestral';
  });
  const [gerandoCheckout, setGerandoCheckout] = useState<boolean>(false);
  const [sincronizandoAcesso, setSincronizandoAcesso] = useState<boolean>(false);
  const [avisoCheckout, setAvisoCheckout] = useState<{ tipo: 'sucesso' | 'info' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarConfiguracaoGlobalSaaS().then((remoto) => {
      if (ativo) setConfigSaaS(remoto);
    });
    return () => {
      ativo = false;
    };
  }, []);

  // Verifica se o Super Admin definiu um valor mensal personalizado para este cliente específico
  const valorMensalPadraoGlobal = configSaaS.ciclos.mensal.valorMensalEquivalente || 149.90;
  const valorMensalEmpresa = empresa?.valor_mensalidade;
  const possuiValorPersonalizadoCliente =
    typeof valorMensalEmpresa === 'number' &&
    valorMensalEmpresa > 0 &&
    Math.abs(valorMensalEmpresa - valorMensalPadraoGlobal) > 0.01;

  // Calcula os ciclos ativos aplicando preços globais ou o preço personalizado do cliente
  const listaCiclosCalculados: CicloAssinaturaConfig[] = useMemo(() => {
    const ciclosBase = ORDEM_CICLOS.map((id) => configSaaS.ciclos[id]).filter((c) => c.ativo);
    const lista = ciclosBase.length > 0 ? ciclosBase : [configSaaS.ciclos.mensal];

    if (!possuiValorPersonalizadoCliente || !valorMensalEmpresa) {
      return lista;
    }

    const cicloPreferencialCliente = (empresa?.ciclo_cobranca as IdCicloCobranca | undefined) || 'mensal';

    return lista.map((ciclo) => {
      if (ciclo.id === cicloPreferencialCliente) {
        const totalPersonalizado = Number((valorMensalEmpresa * ciclo.meses).toFixed(2));
        return {
          ...ciclo,
          valorMensalEquivalente: Number(valorMensalEmpresa.toFixed(2)),
          valorTotalCiclo: totalPersonalizado,
          periodicidadeLabel:
            ciclo.meses === 1
              ? 'Valor exclusivo liberado para seu estabelecimento'
              : `Cobrado R$ ${totalPersonalizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a cada ${ciclo.meses} meses`
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
            : `Cobrado R$ ${totalProp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a cada ${ciclo.meses} meses`
      };
    });
  }, [configSaaS.ciclos, empresa?.ciclo_cobranca, possuiValorPersonalizadoCliente, valorMensalEmpresa]);

  const cicloAtual =
    listaCiclosCalculados.find((c) => c.id === cicloSelecionadoId) || listaCiclosCalculados[0];

  // Redireciona automaticamente para o painel assim que a assinatura estiver ativa
  useEffect(() => {
    if (contexto && !loading && empresa) {
      if (contexto.verificarAcessoLiberado()) {
        const destino = contexto.garcomLogado?.cargo === 'admin' ? '/admin' : '/';
        navigate(destino, { replace: true });
      }
    }
  }, [contexto, empresa, loading, navigate]);

  // Verifica automaticamente o retorno do Mercado Pago quando o cliente volta do checkout
  const verificarRetornoMercadoPago = useCallback(async () => {
    if (typeof window === 'undefined' || !contexto || !empresa?.id) return;
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id') || params.get('collection_id');
    const statusUrl = params.get('status') || params.get('collection_status') || params.get('retorno_mp');
    const cicloRetorno = (params.get('ciclo') as IdCicloCobranca | null) || 'semestral';

    if (!paymentId && !statusUrl) return;

    setSincronizandoAcesso(true);
    try {
      let aprovadoConfirmado = false;

      if (paymentId) {
        // 1. Tenta confirmar via Edge Function
        const { data } = await supabase.functions.invoke<RespostaCheckoutMP>('mercadopago-checkout', {
          body: {
            action: 'verifyPayment',
            paymentId
          }
        });

        if (data?.approved) {
          aprovadoConfirmado = true;
        } else {
          // 2. Se o token estiver configurado no painel/env, verifica diretamente na API do Mercado Pago
          const tokenMP =
            configSaaS.mpAccessToken.trim() ||
            ((import.meta.env.VITE_MP_ACCESS_TOKEN as string | undefined) || '').trim();

          if (tokenMP && !ehPublicKeyMercadoPago(tokenMP)) {
            const mpRes = await requisitarApiMercadoPago(
              `/v1/payments/${encodeURIComponent(paymentId)}`,
              {
                headers: {
                  Authorization: `Bearer ${tokenMP}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            if (mpRes.ok) {
              const payData = (await mpRes.json()) as RespostaPagamentoDiretoMP;
              if (payData.status === 'approved') {
                aprovadoConfirmado = true;
                const cicloCfg = configSaaS.ciclos[cicloRetorno] || configSaaS.ciclos.mensal;
                const vencimento = new Date();
                vencimento.setDate(vencimento.getDate() + (cicloCfg.diasVigencia || 30));

                await supabase
                  .from('empresas')
                  .update({
                    status_assinatura: 'ativa',
                    plano_nome: configSaaS.planoNome,
                    ciclo_cobranca: cicloCfg.id,
                    data_vencimento: vencimento.toISOString(),
                    mp_ultimo_pagamento_id: String(payData.id || paymentId)
                  })
                  .eq('id', empresa.id);
              }
            }
          }
        }
      }

      if (aprovadoConfirmado) {
        setAvisoCheckout({
          tipo: 'sucesso',
          texto: 'Pagamento aprovado no Mercado Pago! Liberando o acesso do seu estabelecimento...'
        });
      } else if (statusUrl === 'pending' || statusUrl === 'pendente') {
        setAvisoCheckout({
          tipo: 'info',
          texto: 'Seu pagamento está em processamento no Mercado Pago. Assim que compensado, seu acesso será liberado.'
        });
      }

      await contexto.carregarDados(false);
      window.history.replaceState({}, '', '/assinatura-pendente');
    } catch {
      await contexto.carregarDados(false);
    } finally {
      setSincronizandoAcesso(false);
    }
  }, [configSaaS, contexto, empresa]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void verificarRetornoMercadoPago();
    }, 0);
    return () => clearTimeout(timer);
  }, [verificarRetornoMercadoPago]);

  const handleSair = () => {
    contexto?.setGarcomLogado(null);
    navigate('/login', { replace: true });
  };

  const handleVerificarLiberacao = async () => {
    if (!contexto || sincronizandoAcesso) return;
    setSincronizandoAcesso(true);
    setAvisoCheckout(null);
    try {
      await contexto.carregarDados(false);
      if (!contexto.verificarAcessoLiberado()) {
        setAvisoCheckout({
          tipo: 'info',
          texto: 'Ainda não identificamos uma assinatura ativa. Se você acabou de efetuar o pagamento no Mercado Pago, aguarde alguns segundos e clique novamente.'
        });
      }
    } finally {
      setSincronizandoAcesso(false);
    }
  };

  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const statusAssinatura = empresa?.status_assinatura || 'pendente';
  const isPrimeiroAcessoPendente = statusAssinatura === 'pendente' || !empresa?.data_vencimento;
  const isDegustacaoExpirada = statusAssinatura === 'degustacao' && Boolean(empresa?.data_vencimento);

  const whatsappSuporte = configSaaS.whatsappSuporte || '5585999999999';
  const nomeEstabelecimento = empresa?.nome_fantasia || 'Meu Estabelecimento';
  const emailResponsavel = contexto?.garcomLogado?.email || '';

  const obterLinkDiretoConfigurado = (ciclo: CicloAssinaturaConfig): string => {
    if (ciclo.linkCheckoutDireto && ciclo.linkCheckoutDireto.trim().startsWith('http')) {
      return ciclo.linkCheckoutDireto.trim();
    }
    const envMap: Record<IdCicloCobranca, string | undefined> = {
      mensal: import.meta.env.VITE_MP_LINK_MENSAL as string | undefined,
      trimestral: import.meta.env.VITE_MP_LINK_TRIMESTRAL as string | undefined,
      semestral: import.meta.env.VITE_MP_LINK_SEMESTRAL as string | undefined,
      anual: import.meta.env.VITE_MP_LINK_ANUAL as string | undefined
    };
    return (
      envMap[ciclo.id] ||
      (import.meta.env.VITE_MERCADOPAGO_CHECKOUT_URL as string | undefined) ||
      ''
    ).trim();
  };

  const handleIrParaCheckoutMercadoPago = async () => {
    if (gerandoCheckout) return;
    setGerandoCheckout(true);
    setAvisoCheckout(null);

    try {
      // 1. Tenta gerar preferência via Edge Function oficial no Supabase (`mercadopago-checkout`)
      const { data, error } = await supabase.functions.invoke<RespostaCheckoutMP>('mercadopago-checkout', {
        body: {
          action: 'createPreference',
          cicloId: cicloAtual.id,
          origin: window.location.origin
        }
      });

      if (!error && data?.init_point) {
        window.location.assign(data.init_point);
        return;
      }

      // 2. Se o Super Admin cadastrou o Access Token do Mercado Pago no painel /master (ou .env),
      // cria a preferência real diretamente na API oficial do Mercado Pago (Checkout Pro com PIX e Cartão)
      const tokenMP =
        configSaaS.mpAccessToken.trim() ||
        ((import.meta.env.VITE_MP_ACCESS_TOKEN as string | undefined) || '').trim();

      if (tokenMP) {
        if (ehPublicKeyMercadoPago(tokenMP)) {
          setAvisoCheckout({
            tipo: 'erro',
            texto:
              'Foi colada a "Public Key" no painel /master em vez do "Access Token". Acesse /master → Mercado Pago & Textos e cole o 2º campo (Access Token) do Mercado Pago.'
          });
          return;
        }

        const originUrl = window.location.origin.replace(/\/$/, '');
        const externalRef = `${empresa?.id || 'estabelecimento'}|${cicloAtual.id}`;

        const prefPayload = {
          items: [
            {
              id: `plano_${cicloAtual.id}`,
              title: `${configSaaS.nomeSistema} • ${configSaaS.planoNome} (${cicloAtual.nome})`,
              description: `Assinatura ${cicloAtual.nome} para ${nomeEstabelecimento}`,
              category_id: 'services',
              quantity: 1,
              currency_id: 'BRL',
              unit_price: Number(cicloAtual.valorTotalCiclo)
            }
          ],
          payer: {
            email: emailResponsavel || undefined
          },
          external_reference: externalRef,
          back_urls: {
            success: `${originUrl}/assinatura-pendente?retorno_mp=aprovado&ciclo=${cicloAtual.id}`,
            pending: `${originUrl}/assinatura-pendente?retorno_mp=pendente&ciclo=${cicloAtual.id}`,
            failure: `${originUrl}/assinatura-pendente?retorno_mp=falha&ciclo=${cicloAtual.id}`
          },
          auto_return: 'approved',
          statement_descriptor: 'TSYSTEMBEACH'
        };

        const mpRes = await requisitarApiMercadoPago('/checkout/preferences', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${tokenMP}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(prefPayload)
        });

        const prefData = (await mpRes.json()) as RespostaPreferenciaDiretaMP;
        if (mpRes.ok && prefData.init_point) {
          window.location.assign(prefData.init_point);
          return;
        }
      }

      // 3. Verifica se há um Link Direto de Pagamento do Mercado Pago configurado para o ciclo
      const linkDiretoMP = obterLinkDiretoConfigurado(cicloAtual);
      if (linkDiretoMP) {
        const ref = `${empresa?.id || 'estabelecimento'}|${cicloAtual.id}`;
        const separador = linkDiretoMP.includes('?') ? '&' : '?';
        window.location.assign(`${linkDiretoMP}${separador}external_reference=${encodeURIComponent(ref)}`);
        return;
      }

      // 4. Caso nenhuma credencial/link do Mercado Pago tenha sido inserida ainda, exibe aviso claro (SEM redirecionar para WhatsApp)
      setAvisoCheckout({
        tipo: 'erro',
        texto:
          'Credencial do Mercado Pago pendente: acesse seu painel Super Admin (/master → aba Planos & Mercado Pago) e insira seu Access Token (APP_USR-...) ou Link de Checkout para abrir o pagamento real.'
      });
    } catch {
      setAvisoCheckout({
        tipo: 'erro',
        texto: 'Não foi possível conectar ao servidor do Mercado Pago. Verifique sua conexão e tente novamente.'
      });
    } finally {
      setGerandoCheckout(false);
    }
  };

  const linkSolicitarTesteGratis = `https://wa.me/${whatsappSuporte}?text=${encodeURIComponent(
    `Olá! Concluí o cadastro e a confirmação de e-mail do estabelecimento *${nomeEstabelecimento}* (${emailResponsavel}) no ${configSaaS.nomeSistema} e gostaria de solicitar a liberação de *7 dias grátis* para testar o sistema antes de efetuar o pagamento.`
  )}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex flex-col items-center justify-center gap-3 font-sans p-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-fuchsia-800 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">
          Sincronizando Estabelecimento...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-100/70 font-sans text-slate-900 selection:bg-slate-900 selection:text-white py-6 px-4 sm:px-6 lg:py-10 flex flex-col items-center justify-center relative overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* TOPO DA PÁGINA: IDENTIDADE E ESTABELECIMENTO LOGADO */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-3xl px-5 py-3.5 shadow-sm mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-800 text-white flex items-center justify-center shadow-sm shrink-0">
              <LucideIcons.Umbrella size={20} strokeWidth={2.3} />
            </div>
            <div className="text-center sm:text-left">
              <span className="block text-xs font-bold uppercase tracking-widest text-slate-400">
                {configSaaS.nomeSistema}
              </span>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                {nomeEstabelecimento}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {isPrimeiroAcessoPendente
                ? 'Aguardando Contratação'
                : isDegustacaoExpirada
                  ? 'Período de Teste Concluído'
                  : 'Assinatura Pendente'}
            </span>

            <button
              type="button"
              onClick={handleSair}
              title="Encerrar sessão"
              className="h-9 px-3 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LucideIcons.LogOut size={14} strokeWidth={2.3} />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* BANNER DE PROMOÇÃO GLOBAL OU CONDIÇÃO ESPECIAL DO CLIENTE */}
        {(configSaaS.promocaoAtiva || possuiValorPersonalizadoCliente) && (
          <div className="bg-slate-900 text-white rounded-3xl px-5 py-3.5 mb-5 flex items-center justify-center gap-2.5 text-center shadow-md animate-in fade-in duration-300">
            <LucideIcons.Sparkles size={17} className="text-fuchsia-400 shrink-0" />
            <p className="text-xs font-bold tracking-wide">
              {possuiValorPersonalizadoCliente
                ? `Condição Especial Liberada para ${nomeEstabelecimento}: valores personalizados aplicados abaixo!`
                : configSaaS.promocaoTextoBanner}
            </p>
          </div>
        )}

        {/* CARD PRINCIPAL DE CONTRATAÇÃO DO PLANO */}
        <div className="bg-white border border-slate-200/80 rounded-4xl shadow-xl shadow-slate-200/50 p-5 sm:p-8 lg:p-9">
          {/* Cabeçalho do Plano */}
          <div className="text-center max-w-xl mx-auto mb-7">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-50 border border-fuchsia-200/70 text-fuchsia-800 text-xs font-bold uppercase tracking-widest mb-2.5">
              <LucideIcons.Crown size={14} strokeWidth={2.3} />
              {configSaaS.planoBadgeTopo}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase mb-1.5">
              {configSaaS.planoNome}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              {configSaaS.planoSubtitulo}
            </p>
          </div>

          {/* Alerta de Retorno ou Erro do Checkout */}
          {avisoCheckout && (
            <div
              className={`flex items-start gap-2.5 p-4 rounded-2xl border text-xs font-semibold mb-6 animate-in fade-in duration-200 ${
                avisoCheckout.tipo === 'sucesso'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : avisoCheckout.tipo === 'erro'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              {avisoCheckout.tipo === 'sucesso' ? (
                <LucideIcons.CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : avisoCheckout.tipo === 'erro' ? (
                <LucideIcons.AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <LucideIcons.Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{avisoCheckout.texto}</span>
            </div>
          )}

          {/* SELETOR DE CICLO DE COBRANÇA: MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
            {listaCiclosCalculados.map((ciclo) => {
              const ativo = ciclo.id === cicloAtual.id;
              return (
                <button
                  key={ciclo.id}
                  type="button"
                  onClick={() => setCicloSelecionadoId(ciclo.id)}
                  className={`relative text-left p-4 rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                    ativo
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/15 -translate-y-0.5'
                      : 'bg-slate-50/80 hover:bg-white text-slate-900 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-xs font-extrabold uppercase tracking-wider ${
                          ativo ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {ciclo.nome}
                      </span>

                      {ciclo.descontoPercentual > 0 ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            ativo
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                          }`}
                        >
                          -{ciclo.descontoPercentual}%
                        </span>
                      ) : (
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            ativo ? 'border-white bg-white text-slate-900' : 'border-slate-300'
                          }`}
                        >
                          {ativo && <LucideIcons.Check size={11} strokeWidth={3} />}
                        </span>
                      )}
                    </div>

                    {ciclo.destaqueBadge && (
                      <span
                        className={`inline-block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                          ativo ? 'text-fuchsia-300' : 'text-fuchsia-800'
                        }`}
                      >
                        ★ {ciclo.destaqueBadge}
                      </span>
                    )}

                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={`text-xs font-bold ${ativo ? 'text-slate-300' : 'text-slate-400'}`}>
                        R$
                      </span>
                      <span className="text-2xl font-black tracking-tight tabular-nums">
                        {formatarMoeda(ciclo.valorMensalEquivalente)}
                      </span>
                      <span className={`text-xs font-semibold ${ativo ? 'text-slate-300' : 'text-slate-400'}`}>
                        /mês
                      </span>
                    </div>
                  </div>

                  <p
                    className={`text-xs font-medium mt-3 pt-2.5 border-t leading-snug ${
                      ativo ? 'text-slate-300 border-slate-800' : 'text-slate-500 border-slate-200/70'
                    }`}
                  >
                    {ciclo.periodicidadeLabel}
                  </p>
                </button>
              );
            })}
          </div>

          {/* RESUMO DO PLANO + BENEFÍCIOS INCLUÍDOS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center bg-slate-50 border border-slate-200/80 rounded-3xl p-5 sm:p-6 mb-6">
            <div className="lg:col-span-7 space-y-2.5">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tudo incluído na {configSaaS.planoNome}:
              </span>
              {configSaaS.recursosPlano.map((recurso, idx) => (
                <div key={`${idx}-${recurso}`} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700">
                  <div className="w-5 h-5 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                    <LucideIcons.Check size={13} strokeWidth={3} />
                  </div>
                  <span>{recurso}</span>
                </div>
              ))}
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ciclo Selecionado
                  </span>
                  <strong className="text-sm font-black text-slate-900 uppercase">
                    {configSaaS.planoNome} • {cicloAtual.nome}
                  </strong>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-fuchsia-50 text-fuchsia-800 text-xs font-bold">
                  {cicloAtual.meses === 1 ? '1 mês' : `${cicloAtual.meses} meses`}
                </span>
              </div>

              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-semibold text-slate-500">Total no checkout:</span>
                <strong className="text-lg font-black text-slate-900 tabular-nums">
                  R$ {formatarMoeda(cicloAtual.valorTotalCiclo)}
                </strong>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <LucideIcons.ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                Checkout oficial Mercado Pago (PIX ou Cartão)
              </p>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO: IR PARA O CHECKOUT DO MERCADO PAGO OU SOLICITAR 7 DIAS GRÁTIS */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleIrParaCheckoutMercadoPago}
              disabled={gerandoCheckout}
              className="w-full h-13 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-900/15 hover:shadow-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2.5 px-4 cursor-pointer"
            >
              {gerandoCheckout ? (
                <>
                  <LucideIcons.Loader2 size={18} className="animate-spin shrink-0" />
                  <span>Abrindo Checkout Oficial do Mercado Pago...</span>
                </>
              ) : (
                <>
                  <LucideIcons.CreditCard size={18} strokeWidth={2.3} className="shrink-0" />
                  <span>
                    Ir para o Checkout Mercado Pago • {cicloAtual.nome} (R$ {formatarMoeda(cicloAtual.valorTotalCiclo)})
                  </span>
                  <LucideIcons.ArrowRight size={17} strokeWidth={2.5} className="shrink-0" />
                </>
              )}
            </button>

            {/* Opção controlada para solicitar 7 dias de teste gratuito entrando em contato com o Super Admin */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={linkSolicitarTesteGratis}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 h-11 px-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 text-emerald-800 text-xs font-bold tracking-tight flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <LucideIcons.MessageCircle size={16} strokeWidth={2.3} className="text-emerald-600 shrink-0" />
                <span>{configSaaS.textoBotaoTesteGratis}</span>
              </a>

              <button
                type="button"
                onClick={handleVerificarLiberacao}
                disabled={sincronizandoAcesso}
                className="w-full sm:w-auto h-11 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200/70 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {sincronizandoAcesso ? (
                  <LucideIcons.Loader2 size={15} className="animate-spin" />
                ) : (
                  <LucideIcons.RefreshCw size={15} />
                )}
                <span>Já efetuei o pagamento</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botão Flutuante Minimalista do WhatsApp */}
      <BotaoWhatsappFlutuante
        mensagem={`Olá! Estou na página da ${configSaaS.planoNome} do estabelecimento ${nomeEstabelecimento} e gostaria de atendimento.`}
      />
    </div>
  );
}
