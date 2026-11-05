// supabase/functions/mercadopago-checkout/index.ts
// ==============================================================================
// EDGE FUNCTION: CHECKOUT PRO OFICIAL DO MERCADO PAGO + VERIFICAÇÃO DE RETORNO
// Funções:
//   1. createPreference: Gera link dinâmico e seguro (Checkout Pro) no Mercado Pago
//      para o ciclo escolhido (mensal, trimestral, semestral, anual), respeitando
//      preços promocionais globais (configuracoes_saas) e preços personalizados
//      definidos pelo Super Admin para um estabelecimento específico (empresas).
//   2. verifyPayment: Verifica instantaneamente o payment_id quando o cliente é
//      redirecionado de volta do Mercado Pago após pagar, liberando o acesso na hora.
// ==============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CicloConfig {
  id: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  titulo: string;
  meses: number;
  diasVigencia: number;
  valorTotal: number;
  valorMensalEquivalente: number;
}

const TABELA_CICLOS_PADRAO: Record<string, CicloConfig> = {
  mensal: {
    id: 'mensal',
    titulo: 'T-System Beach • Assinatura Premium (Mensal)',
    meses: 1,
    diasVigencia: 30,
    valorTotal: 149.90,
    valorMensalEquivalente: 149.90
  },
  trimestral: {
    id: 'trimestral',
    titulo: 'T-System Beach • Assinatura Premium (Trimestral)',
    meses: 3,
    diasVigencia: 90,
    valorTotal: 404.70,
    valorMensalEquivalente: 134.90
  },
  semestral: {
    id: 'semestral',
    titulo: 'T-System Beach • Assinatura Premium (Semestral)',
    meses: 6,
    diasVigencia: 180,
    valorTotal: 719.40,
    valorMensalEquivalente: 119.90
  },
  anual: {
    id: 'anual',
    titulo: 'T-System Beach • Assinatura Premium (Anual)',
    meses: 12,
    diasVigencia: 365,
    valorTotal: 1198.80,
    valorMensalEquivalente: 99.90
  }
}

interface CheckoutRequestBody {
  action?: 'createPreference' | 'verifyPayment';
  cicloId?: string;
  origin?: string;
  paymentId?: string;
}

interface MercadoPagoPreferenceResponse {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
}

interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  external_reference?: string;
  transaction_amount?: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Variáveis do Supabase não configuradas.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação ausente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida ou expirada.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Carrega configurações globais do SaaS (se cadastradas no painel Super Admin)
    const { data: configRow } = await supabaseAdmin
      .from('configuracoes_saas')
      .select('dados')
      .eq('id', 'global')
      .maybeSingle()

    const configDados = (configRow?.dados || {}) as Record<string, unknown>
    const tokenConfiguradoPainel = typeof configDados.mpAccessToken === 'string' ? configDados.mpAccessToken.trim() : ''
    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN') || tokenConfiguradoPainel

    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({
          error: 'Access Token do Mercado Pago ainda não configurado.',
          code: 'MP_NOT_CONFIGURED'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, empresa_id')
      .eq('id', user.id)
      .single()

    if (!perfil?.empresa_id) {
      return new Response(
        JSON.stringify({ error: 'Estabelecimento não localizado para este usuário.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const { data: empresa } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_fantasia, data_vencimento, valor_mensalidade, ciclo_cobranca, mp_ultimo_pagamento_id')
      .eq('id', perfil.empresa_id)
      .single()

    if (!empresa) {
      return new Response(
        JSON.stringify({ error: 'Registro do estabelecimento não encontrado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as CheckoutRequestBody
    const action = body.action || 'createPreference'

    // ==========================================================================
    // AÇÃO 2: VERIFICAR PAGAMENTO NO RETORNO DO MERCADO PAGO
    // ==========================================================================
    if (action === 'verifyPayment' && body.paymentId) {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(body.paymentId)}`, {
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!mpRes.ok) {
        return new Response(
          JSON.stringify({ approved: false, error: 'Não foi possível consultar o pagamento.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const payment = (await mpRes.json()) as MercadoPagoPaymentResponse
      const refParts = (payment.external_reference || '').split(/[|_]/)
      const refEmpresaId = refParts[0]
      const refCicloId = refParts[1] || 'mensal'
      const cicloConfig = TABELA_CICLOS_PADRAO[refCicloId] || TABELA_CICLOS_PADRAO.mensal

      if (payment.status === 'approved' && refEmpresaId === empresa.id) {
        if (empresa.mp_ultimo_pagamento_id !== String(payment.id)) {
          const agora = new Date()
          const vencimentoAtual = empresa.data_vencimento ? new Date(empresa.data_vencimento) : agora
          const baseCalculo = vencimentoAtual > agora ? vencimentoAtual : agora
          baseCalculo.setDate(baseCalculo.getDate() + cicloConfig.diasVigencia)

          await supabaseAdmin
            .from('empresas')
            .update({
              status_assinatura: 'ativa',
              plano_nome: 'Assinatura Premium',
              ciclo_cobranca: cicloConfig.id,
              valor_mensalidade: cicloConfig.valorMensalEquivalente,
              data_vencimento: baseCalculo.toISOString(),
              mp_ultimo_pagamento_id: String(payment.id)
            })
            .eq('id', empresa.id)
        }

        return new Response(
          JSON.stringify({ approved: true, status: payment.status, ciclo: cicloConfig.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      return new Response(
        JSON.stringify({ approved: false, status: payment.status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ==========================================================================
    // AÇÃO 1: CRIAR PREFERÊNCIA DE CHECKOUT PRO NO MERCADO PAGO
    // ==========================================================================
    const cicloIdReq = body.cicloId || 'semestral'
    const cicloPadrao = TABELA_CICLOS_PADRAO[cicloIdReq] || TABELA_CICLOS_PADRAO.semestral

    // Verifica se o Super Admin alterou os preços globais no painel /master
    const ciclosGlobais = (configDados.ciclos || {}) as Record<string, Record<string, unknown>>
    const cicloGlobal = ciclosGlobais[cicloPadrao.id] || {}
    let valorTotalFinal = Number(cicloGlobal.valorTotalCiclo ?? cicloPadrao.valorTotal)

    // Se o Super Admin definiu um preço mensal personalizado para este cliente específico em `empresas.valor_mensalidade`
    const valorMensalCliente = Number(empresa.valor_mensalidade ?? 149.90)
    const valorMensalPadrao = Number(ciclosGlobais.mensal?.valorMensalEquivalente ?? 149.90)
    if (valorMensalCliente > 0 && Math.abs(valorMensalCliente - valorMensalPadrao) > 0.01) {
      if (empresa.ciclo_cobranca === cicloPadrao.id) {
        valorTotalFinal = Number((valorMensalCliente * cicloPadrao.meses).toFixed(2))
      } else {
        const fatorDesconto = valorTotalFinal / (valorMensalPadrao * cicloPadrao.meses)
        valorTotalFinal = Number((valorMensalCliente * cicloPadrao.meses * fatorDesconto).toFixed(2))
      }
    }

    const rawOrigin = (body.origin || 'https://www.t-systembeach.com.br').trim().replace(/\/$/, '')
    const originUrl =
      rawOrigin.startsWith('https://') && !rawOrigin.includes('localhost') && !rawOrigin.includes('127.0.0.1')
        ? rawOrigin
        : 'https://www.t-systembeach.com.br'
    const externalReference = `${empresa.id}|${cicloPadrao.id}`
    const webhookUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/mercadopago-webhook`

    const preferencePayload = {
      items: [
        {
          id: `assinatura_premium_${cicloPadrao.id}`,
          title: cicloPadrao.titulo,
          description: `Licença SaaS T-System Beach para ${empresa.nome_fantasia} (${cicloPadrao.diasVigencia} dias)`,
          category_id: 'services',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: valorTotalFinal
        }
      ],
      payer: {
        name: perfil.nome,
        email: perfil.email || user.email
      },
      external_reference: externalReference,
      back_urls: {
        success: `${originUrl}/assinatura-pendente?retorno_mp=aprovado&ciclo=${cicloPadrao.id}`,
        pending: `${originUrl}/assinatura-pendente?retorno_mp=pendente&ciclo=${cicloPadrao.id}`,
        failure: `${originUrl}/assinatura-pendente?retorno_mp=falha&ciclo=${cicloPadrao.id}`
      },
      auto_return: 'approved',
      notification_url: webhookUrl,
      statement_descriptor: 'TSYSTEMBEACH'
    }

    const mpPrefRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferencePayload)
    })

    const prefData = (await mpPrefRes.json()) as MercadoPagoPreferenceResponse

    if (!mpPrefRes.ok || !prefData.init_point) {
      return new Response(
        JSON.stringify({
          error: prefData.message || 'Falha ao gerar preferência no Mercado Pago.',
          code: 'MP_PREFERENCE_ERROR'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify({
        preferenceId: prefData.id,
        init_point: prefData.init_point,
        sandbox_init_point: prefData.sandbox_init_point
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno ao iniciar checkout.'
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
