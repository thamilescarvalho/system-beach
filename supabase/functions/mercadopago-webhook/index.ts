// supabase/functions/mercadopago-webhook/index.ts
// ==============================================================================
// WEBHOOK OFICIAL MERCADO PAGO — LIBERAÇÃO E RENOVAÇÃO AUTOMÁTICA DE ASSINATURA
// Como funciona:
//   1. No Checkout do Mercado Pago (PIX ou Cartão), enviamos em `external_reference`
//      o formato `UUID_DA_EMPRESA|CICLO` (ex: `uuid|semestral`).
//   2. Quando o cliente paga, o Mercado Pago notifica esta Edge Function.
//   3. A função consulta a API oficial do Mercado Pago com seu MP_ACCESS_TOKEN
//      para confirmar que o pagamento realmente foi aprovado (`status === 'approved'`).
//   4. Se aprovado, ativa imediatamente o acesso da empresa (`status_assinatura = 'ativa'`)
//      e adiciona os dias correspondentes ao ciclo contratado (30, 90, 180 ou 365 dias)!
// ==============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

interface MercadoPagoWebhookBody {
  action?: string;
  type?: string;
  data?: {
    id?: string | number;
  };
}

interface MercadoPagoPaymentResponse {
  id: number;
  status: string;
  external_reference?: string;
  transaction_amount?: number;
}

interface CicloInfo {
  id: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  dias: number;
  valorMensal: number;
}

const CICLOS_VIGENCIA: Record<string, CicloInfo> = {
  mensal: { id: 'mensal', dias: 30, valorMensal: 149.90 },
  trimestral: { id: 'trimestral', dias: 90, valorMensal: 134.90 },
  semestral: { id: 'semestral', dias: 180, valorMensal: 119.90 },
  anual: { id: 'anual', dias: 365, valorMensal: 99.90 }
}

function identificarCicloPorValorOuRef(cicloRef?: string, valorPago?: number): CicloInfo {
  if (cicloRef && CICLOS_VIGENCIA[cicloRef]) {
    return CICLOS_VIGENCIA[cicloRef]
  }
  if (typeof valorPago === 'number') {
    if (valorPago >= 1000) return CICLOS_VIGENCIA.anual
    if (valorPago >= 600) return CICLOS_VIGENCIA.semestral
    if (valorPago >= 350) return CICLOS_VIGENCIA.trimestral
  }
  return CICLOS_VIGENCIA.mensal
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ received: true }), { status: 200 })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.' }),
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    let mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN') ?? ''
    if (!mpAccessToken) {
      try {
        const { data: configPriv } = await supabaseAdmin
          .from('configuracoes_saas_privadas')
          .select('mp_access_token')
          .eq('id', 'global')
          .maybeSingle()
        if (typeof configPriv?.mp_access_token === 'string') {
          mpAccessToken = configPriv.mp_access_token.trim()
        }
      } catch {
        // Fallback para ambientes antes da migration
      }
    }
    if (!mpAccessToken) {
      const { data: configRow } = await supabaseAdmin
        .from('configuracoes_saas')
        .select('dados')
        .eq('id', 'global')
        .maybeSingle()
      const dados = (configRow?.dados || {}) as Record<string, unknown>
      if (typeof dados.mpAccessToken === 'string') {
        mpAccessToken = dados.mpAccessToken.trim()
      }
    }

    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({ error: 'MP_ACCESS_TOKEN não configurado.' }),
        { status: 500 }
      )
    }

    const url = new URL(req.url)
    const body = (await req.json().catch(() => ({}))) as MercadoPagoWebhookBody
    const paymentId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id')
    const topic = body?.type || url.searchParams.get('type') || url.searchParams.get('topic')

    if (!paymentId || (topic && topic !== 'payment')) {
      return new Response(JSON.stringify({ ignored: true }), { status: 200 })
    }

    // Consulta a fonte da verdade diretamente na API do Mercado Pago (Zero-Trust)
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!mpRes.ok) {
      return new Response(JSON.stringify({ error: 'Falha ao consultar pagamento no Mercado Pago.' }), { status: 400 })
    }

    const payment = (await mpRes.json()) as MercadoPagoPaymentResponse
    const rawRef = payment.external_reference || ''
    const [empresaId, cicloRef] = rawRef.split(/[|_]/)

    if (payment.status === 'approved' && empresaId) {
      const { data: empresaAtual } = await supabaseAdmin
        .from('empresas')
        .select('id, data_vencimento, mp_ultimo_pagamento_id, valor_mensalidade')
        .eq('id', empresaId)
        .single()

      // Idempotência: evita somar os dias duas vezes para o mesmo pagamento
      if (empresaAtual && empresaAtual.mp_ultimo_pagamento_id !== String(payment.id)) {
        const cicloInfo = identificarCicloPorValorOuRef(cicloRef, payment.transaction_amount)
        const agora = new Date()
        const vencimentoAtual = empresaAtual.data_vencimento ? new Date(empresaAtual.data_vencimento) : agora
        const baseCalculo = vencimentoAtual > agora ? vencimentoAtual : agora
        baseCalculo.setDate(baseCalculo.getDate() + cicloInfo.dias)
        const novoVencimentoIso = baseCalculo.toISOString()

        const valorPagoReal = Number(payment.transaction_amount || cicloInfo.valorMensal)

        await supabaseAdmin
          .from('empresas')
          .update({
            status_assinatura: 'ativa',
            plano_nome: 'Assinatura Premium',
            ciclo_cobranca: cicloInfo.id,
            valor_mensalidade: valorPagoReal,
            data_vencimento: novoVencimentoIso,
            mp_ultimo_pagamento_id: String(payment.id)
          })
          .eq('id', empresaId)

        // Registra a fatura paga na tabela faturas_assinatura
        const mesesNomes = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ]
        const mesAno = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
        const competencia = `${mesesNomes[agora.getMonth()]}/${agora.getFullYear()}`
        const idFatura = `FAT-${mesAno.replace('-', '')}-${empresaId.substring(0, 6).toUpperCase()}`

        await supabaseAdmin
          .from('faturas_assinatura')
          .upsert([
            {
              id: idFatura,
              empresa_id: empresaId,
              competencia,
              mes_ano_referencia: mesAno,
              valor: valorPagoReal,
              data_emissao: agora.toISOString(),
              data_vencimento: novoVencimentoIso,
              data_pagamento: agora.toISOString(),
              status: 'paga',
              forma_pagamento: 'PIX / Mercado Pago',
              payment_id_mp: String(payment.id),
              plano_nome: 'Assinatura Premium',
              ciclo_nome: cicloInfo.id.charAt(0).toUpperCase() + cicloInfo.id.slice(1)
            }
          ], { onConflict: 'id' })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro no processamento do webhook.'
    return new Response(JSON.stringify({ error: msg }), { status: 400 })
  }
})
