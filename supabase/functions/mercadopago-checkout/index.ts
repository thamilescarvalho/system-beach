// supabase/functions/mercadopago-checkout/index.ts
// ==============================================================================
// EDGE FUNCTION: GATEWAY SERVER-SIDE MERCADO PAGO (ZERO-TRUST)
// Responsável por manter o MP_ACCESS_TOKEN exclusivamente no servidor e executar:
//   1. createPreference     : Gera Checkout Pro oficial com preço calculado no servidor.
//   2. createPix            : Gera pagamento PIX oficial com QR Code e Copia e Cola.
//   3. verifyPayment        : Valida pagamento aprovado no Mercado Pago, renova licença
//                             e registra as faturas quitadas no banco.
//   4. getIntegrationStatus : Retorna status mascarado da integração (apenas Super Admin).
//   5. saveAndTestToken     : Valida e salva o Access Token no cofre privado (apenas Super Admin).
//   6. testConnection       : Testa o token ativo do servidor contra /users/me (apenas Super Admin).
// ==============================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const ORIGENS_OFICIAIS = [
  'https://www.t-systembeach.com.br',
  'https://t-systembeach.com.br',
]

function resolverOrigemPermitida(req: Request): string {
  const origin = (req.headers.get('Origin') || '').trim().replace(/\/$/, '')
  const allowedEnv = (Deno.env.get('ALLOWED_ORIGIN') || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean)

  if (origin) {
    if (ORIGENS_OFICIAIS.includes(origin) || allowedEnv.includes(origin)) {
      return origin
    }
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return origin
    }
  }

  return allowedEnv[0] || ORIGENS_OFICIAIS[0]
}

function getCorsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': resolverOrigemPermitida(req),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

interface CicloConfig {
  id: 'mensal' | 'trimestral' | 'semestral' | 'anual';
  nome: string;
  titulo: string;
  meses: number;
  diasVigencia: number;
  valorTotal: number;
  valorMensalEquivalente: number;
}

const TABELA_CICLOS_PADRAO: Record<string, CicloConfig> = {
  mensal: {
    id: 'mensal',
    nome: 'Mensal',
    titulo: 'T-System Beach • Assinatura Premium (Mensal)',
    meses: 1,
    diasVigencia: 30,
    valorTotal: 149.90,
    valorMensalEquivalente: 149.90
  },
  trimestral: {
    id: 'trimestral',
    nome: 'Trimestral',
    titulo: 'T-System Beach • Assinatura Premium (Trimestral)',
    meses: 3,
    diasVigencia: 90,
    valorTotal: 404.70,
    valorMensalEquivalente: 134.90
  },
  semestral: {
    id: 'semestral',
    nome: 'Semestral',
    titulo: 'T-System Beach • Assinatura Premium (Semestral)',
    meses: 6,
    diasVigencia: 180,
    valorTotal: 719.40,
    valorMensalEquivalente: 119.90
  },
  anual: {
    id: 'anual',
    nome: 'Anual',
    titulo: 'T-System Beach • Assinatura Premium (Anual)',
    meses: 12,
    diasVigencia: 365,
    valorTotal: 1198.80,
    valorMensalEquivalente: 99.90
  }
}

interface CheckoutRequestBody {
  action?: 'createPreference' | 'createPix' | 'verifyPayment' | 'getIntegrationStatus' | 'saveAndTestToken' | 'testConnection';
  cicloId?: string;
  origin?: string;
  redirectPath?: string;
  paymentId?: string;
  faturaId?: string;
  token?: string;
}

interface EmpresaRow {
  id: string;
  nome_fantasia: string;
  status_assinatura: string | null;
  data_vencimento: string | null;
  valor_mensalidade: number | null;
  ciclo_cobranca: string | null;
  documento: string | null;
  email_contato: string | null;
  mp_ultimo_pagamento_id: string | null;
}

interface MercadoPagoPreferenceResponse {
  id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  message?: string;
}

interface MercadoPagoPaymentResponse {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  message?: string;
  cause?: Array<{ code?: number | string; description?: string }>;
  point_of_interaction?: {
    transaction_data?: {
      qr_code?: string;
      qr_code_base64?: string;
      ticket_url?: string;
    };
  };
}

interface RespostaUsuarioMP {
  id?: number;
  nickname?: string;
  email?: string;
}

function ehPublicKeyMercadoPago(chave: string): boolean {
  const limpa = chave.trim()
  return /^(APP_USR|TEST)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpa)
}

function mascararToken(token: string): string {
  const limpo = token.trim()
  if (!limpo) return ''
  if (limpo.length <= 14) return '••••••••'
  return `${limpo.slice(0, 10)}••••••${limpo.slice(-4)}`
}

async function obterTokenMercadoPago(
  supabaseAdmin: SupabaseClient,
  configDadosPublicos: Record<string, unknown>
): Promise<{ token: string; source: 'env' | 'vault' | 'legacy' | 'none' }> {
  const tokenEnv = (Deno.env.get('MP_ACCESS_TOKEN') || '').trim()
  if (tokenEnv) {
    return { token: tokenEnv, source: 'env' }
  }

  try {
    const { data: privado } = await supabaseAdmin
      .from('configuracoes_saas_privadas')
      .select('mp_access_token')
      .eq('id', 'global')
      .maybeSingle()

    const tokenVault = typeof privado?.mp_access_token === 'string' ? privado.mp_access_token.trim() : ''
    if (tokenVault) {
      return { token: tokenVault, source: 'vault' }
    }
  } catch {
    // Tabela privada pode ainda não ter sido migrada em ambientes antigos
  }

  const tokenLegacy = typeof configDadosPublicos.mpAccessToken === 'string'
    ? configDadosPublicos.mpAccessToken.trim()
    : ''
  if (tokenLegacy) {
    return { token: tokenLegacy, source: 'legacy' }
  }

  return { token: '', source: 'none' }
}

function calcularValoresCiclo(
  cicloIdReq: string | undefined,
  empresa: EmpresaRow,
  configDados: Record<string, unknown>
) {
  const cicloPadrao = TABELA_CICLOS_PADRAO[cicloIdReq || 'semestral'] || TABELA_CICLOS_PADRAO.semestral
  const ciclosGlobais = (configDados.ciclos || {}) as Record<string, Record<string, unknown>>
  const cicloGlobal = ciclosGlobais[cicloPadrao.id] || {}

  let valorTotalFinal = Number(cicloGlobal.valorTotalCiclo ?? cicloPadrao.valorTotal)
  const valorMensalPadrao = Number(ciclosGlobais.mensal?.valorMensalEquivalente ?? 149.90)
  const valorMensalCliente = Number(empresa.valor_mensalidade ?? valorMensalPadrao)

  if (valorMensalCliente > 0 && Math.abs(valorMensalCliente - valorMensalPadrao) > 0.01) {
    if (empresa.ciclo_cobranca === cicloPadrao.id) {
      valorTotalFinal = Number((valorMensalCliente * cicloPadrao.meses).toFixed(2))
    } else {
      const fatorDesconto = valorTotalFinal / (valorMensalPadrao * cicloPadrao.meses)
      valorTotalFinal = Number((valorMensalCliente * cicloPadrao.meses * fatorDesconto).toFixed(2))
    }
  }

  const valorMensalEquivalente = Number((valorTotalFinal / cicloPadrao.meses).toFixed(2))
  const planoNome =
    typeof configDados.planoNome === 'string' && configDados.planoNome.trim()
      ? configDados.planoNome.trim()
      : 'Assinatura Premium'

  return {
    cicloPadrao,
    planoNome,
    valorTotalFinal: Number(valorTotalFinal.toFixed(2)),
    valorMensalEquivalente
  }
}

function adicionarMesesNoMesmoDia(dataBase: Date, mesesParaAdicionar: number, diaRef: number): Date {
  const anoDestino = dataBase.getFullYear()
  const mesDestino = dataBase.getMonth() + mesesParaAdicionar
  const primeiroDoMes = new Date(anoDestino, mesDestino, 1, 12, 0, 0, 0)
  const ultimoDiaMes = new Date(primeiroDoMes.getFullYear(), primeiroDoMes.getMonth() + 1, 0).getDate()
  const diaFinal = Math.min(diaRef, ultimoDiaMes)
  return new Date(primeiroDoMes.getFullYear(), primeiroDoMes.getMonth(), diaFinal, 12, 0, 0, 0)
}

async function ativarEmpresaEFaturas(params: {
  supabaseAdmin: SupabaseClient;
  empresa: EmpresaRow;
  ciclo: CicloConfig;
  planoNome: string;
  valorMensalEquivalente: number;
  valorPagoTotal: number;
  paymentId: string;
}) {
  const { supabaseAdmin, empresa, ciclo, planoNome, valorMensalEquivalente, valorPagoTotal, paymentId } = params

  const agora = new Date()
  let baseCalculo = new Date(agora.getTime())
  if (empresa.data_vencimento && empresa.status_assinatura === 'ativa') {
    const vencAtual = new Date(empresa.data_vencimento)
    if (!Number.isNaN(vencAtual.getTime()) && vencAtual.getTime() > agora.getTime()) {
      baseCalculo = new Date(vencAtual.getTime())
    }
  }
  baseCalculo.setDate(baseCalculo.getDate() + ciclo.diasVigencia)
  const novoVencimentoIso = baseCalculo.toISOString()

  if (empresa.mp_ultimo_pagamento_id !== paymentId) {
    await supabaseAdmin
      .from('empresas')
      .update({
        status_assinatura: 'ativa',
        plano_nome: planoNome,
        ciclo_cobranca: ciclo.id,
        valor_mensalidade: valorMensalEquivalente,
        data_vencimento: novoVencimentoIso,
        mp_ultimo_pagamento_id: paymentId
      })
      .eq('id', empresa.id)
  }

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  const diaBase = agora.getDate()
  const qtdMeses = Math.max(1, ciclo.meses)
  const valorParcela = Number((valorPagoTotal / qtdMeses).toFixed(2))
  const prefixoEmpresa = empresa.id.substring(0, 6).toUpperCase()

  const rows = []
  for (let i = 0; i < qtdMeses; i += 1) {
    const dataVencMes = adicionarMesesNoMesmoDia(agora, i, diaBase)
    const mesAno = `${dataVencMes.getFullYear()}-${String(dataVencMes.getMonth() + 1).padStart(2, '0')}`
    const competenciaBase = `${mesesNomes[dataVencMes.getMonth()]}/${dataVencMes.getFullYear()}`
    rows.push({
      id: `FAT-${mesAno.replace('-', '')}-${prefixoEmpresa}`,
      empresa_id: empresa.id,
      competencia: qtdMeses > 1 ? `${competenciaBase} (${i + 1}/${qtdMeses})` : competenciaBase,
      mes_ano_referencia: mesAno,
      valor: valorParcela,
      data_emissao: agora.toISOString(),
      data_vencimento: dataVencMes.toISOString(),
      data_pagamento: agora.toISOString(),
      status: 'paga',
      forma_pagamento: 'PIX / Mercado Pago',
      payment_id_mp: paymentId,
      plano_nome: planoNome,
      ciclo_nome: ciclo.nome
    })
  }

  await supabaseAdmin
    .from('faturas_assinatura')
    .upsert(rows, { onConflict: 'id' })
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

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

    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, cargo, status, empresa_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!perfil || perfil.status === 'bloqueado') {
      return new Response(
        JSON.stringify({ error: 'Perfil de usuário não encontrado ou bloqueado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { data: configRow } = await supabaseAdmin
      .from('configuracoes_saas')
      .select('dados')
      .eq('id', 'global')
      .maybeSingle()

    const configDados = (configRow?.dados || {}) as Record<string, unknown>
    const body = (await req.json().catch(() => ({}))) as CheckoutRequestBody
    const action = body.action || 'createPreference'

    // ==========================================================================
    // AÇÕES ADMINISTRATIVAS DO SUPER ADMIN (COFRE DE CREDENCIAIS)
    // ==========================================================================
    if (action === 'getIntegrationStatus' || action === 'saveAndTestToken' || action === 'testConnection') {
      if (perfil.cargo !== 'super_admin') {
        return new Response(
          JSON.stringify({ error: 'Apenas o Super Admin pode gerenciar credenciais do gateway.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      if (action === 'getIntegrationStatus') {
        const { token, source } = await obterTokenMercadoPago(supabaseAdmin, configDados)
        return new Response(
          JSON.stringify({
            configured: Boolean(token),
            source,
            maskedPreview: token ? mascararToken(token) : ''
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      if (action === 'saveAndTestToken') {
        const novoToken = (body.token || '').trim()
        if (!novoToken) {
          return new Response(
            JSON.stringify({ ok: false, error: 'Informe o Access Token do Mercado Pago.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }
        if (ehPublicKeyMercadoPago(novoToken)) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'Você colou a Public Key. Utilize o 2º campo chamado "Access Token" do Mercado Pago.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        const mpUserRes = await fetch('https://api.mercadopago.com/users/me', {
          headers: { Authorization: `Bearer ${novoToken}` }
        })

        if (!mpUserRes.ok) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: 'Access Token inválido ou expirado segundo a API do Mercado Pago.'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          )
        }

        const dadosConta = (await mpUserRes.json()) as RespostaUsuarioMP

        const { error: upsertPrivErr } = await supabaseAdmin
          .from('configuracoes_saas_privadas')
          .upsert([{ id: 'global', mp_access_token: novoToken, updated_at: new Date().toISOString() }], {
            onConflict: 'id'
          })

        if (upsertPrivErr) {
          throw new Error('Não foi possível salvar o token no cofre seguro do banco de dados.')
        }

        // Remove eventual cópia legada do campo público
        if (configDados.mpAccessToken) {
          const dadosLimpos = { ...configDados }
          delete dadosLimpos.mpAccessToken
          await supabaseAdmin
            .from('configuracoes_saas')
            .update({ dados: dadosLimpos, updated_at: new Date().toISOString() })
            .eq('id', 'global')
        }

        return new Response(
          JSON.stringify({
            ok: true,
            accountLabel: dadosConta.nickname || dadosConta.email || String(dadosConta.id || ''),
            maskedPreview: mascararToken(novoToken)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // testConnection: testa o token já armazenado no servidor
      const { token } = await obterTokenMercadoPago(supabaseAdmin, configDados)
      if (!token) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Nenhum Access Token configurado no servidor.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const mpTestRes = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!mpTestRes.ok) {
        return new Response(
          JSON.stringify({ ok: false, error: 'O Access Token salvo no servidor está inválido ou expirado.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      const dadosConta = (await mpTestRes.json()) as RespostaUsuarioMP
      return new Response(
        JSON.stringify({
          ok: true,
          accountLabel: dadosConta.nickname || dadosConta.email || String(dadosConta.id || ''),
          maskedPreview: mascararToken(token)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ==========================================================================
    // AÇÕES DE COBRANÇA DO ESTABELECIMENTO (EXIGE TOKEN ATIVO NO SERVIDOR)
    // ==========================================================================
    const { token: mpAccessToken } = await obterTokenMercadoPago(supabaseAdmin, configDados)
    if (!mpAccessToken || ehPublicKeyMercadoPago(mpAccessToken)) {
      return new Response(
        JSON.stringify({
          error: 'Gateway de pagamento Mercado Pago ainda não configurado no servidor.',
          code: 'MP_NOT_CONFIGURED'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    if (!perfil.empresa_id) {
      return new Response(
        JSON.stringify({ error: 'Estabelecimento não localizado para este usuário.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const { data: empresa } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_fantasia, status_assinatura, data_vencimento, valor_mensalidade, ciclo_cobranca, documento, email_contato, mp_ultimo_pagamento_id')
      .eq('id', perfil.empresa_id)
      .single()

    if (!empresa) {
      return new Response(
        JSON.stringify({ error: 'Registro do estabelecimento não encontrado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      )
    }

    const empresaTyped = empresa as EmpresaRow

    // ==========================================================================
    // AÇÃO: VERIFICAR PAGAMENTO (PIX OU RETORNO DO CHECKOUT PRO)
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
          JSON.stringify({ approved: false, status: 'error', error: 'Não foi possível consultar o pagamento.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const payment = (await mpRes.json()) as MercadoPagoPaymentResponse
      const refParts = (payment.external_reference || '').split(/[|_]/)
      const refEmpresaId = refParts[0]
      const refCicloId = refParts[1] || 'mensal'
      const { cicloPadrao, planoNome, valorTotalFinal, valorMensalEquivalente } = calcularValoresCiclo(
        refCicloId,
        empresaTyped,
        configDados
      )

      if (payment.status === 'approved' && refEmpresaId === empresaTyped.id) {
        const valorPagoReal = Number(payment.transaction_amount || valorTotalFinal)
        await ativarEmpresaEFaturas({
          supabaseAdmin,
          empresa: empresaTyped,
          ciclo: cicloPadrao,
          planoNome,
          valorMensalEquivalente,
          valorPagoTotal: valorPagoReal,
          paymentId: String(payment.id)
        })

        return new Response(
          JSON.stringify({
            approved: true,
            status: payment.status,
            ciclo: cicloPadrao.id,
            externalReference: payment.external_reference
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      return new Response(
        JSON.stringify({
          approved: false,
          status: payment.status,
          externalReference: payment.external_reference
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ==========================================================================
    // AÇÃO: GERAR PIX INSTANTÂNEO NO SERVIDOR
    // ==========================================================================
    if (action === 'createPix') {
      const { cicloPadrao, planoNome, valorTotalFinal } = calcularValoresCiclo(
        body.cicloId,
        empresaTyped,
        configDados
      )

      let valorCobranca = valorTotalFinal
      let refFatura = 'ciclo'
      let competenciaFatura = ''

      if (body.faturaId) {
        const { data: faturaRow } = await supabaseAdmin
          .from('faturas_assinatura')
          .select('id, empresa_id, valor, status, competencia')
          .eq('id', body.faturaId)
          .eq('empresa_id', empresaTyped.id)
          .maybeSingle()

        if (faturaRow && faturaRow.status !== 'paga' && Number(faturaRow.valor) > 0) {
          valorCobranca = Number(Number(faturaRow.valor).toFixed(2))
          refFatura = faturaRow.id
          competenciaFatura = faturaRow.competencia || ''
        }
      }

      const emailValido = (empresaTyped.email_contato || perfil.email || user.email || 'assinatura@tsystembeach.com.br')
        .trim()
        .toLowerCase()
      const nomePartes = (perfil.nome || empresaTyped.nome_fantasia || 'Cliente Estabelecimento').trim().split(/\s+/)
      const primeiroNome = nomePartes[0] || 'Cliente'
      const sobrenome = nomePartes.slice(1).join(' ') || 'Estabelecimento'

      const docDigitos = (empresaTyped.documento || '').replace(/\D/g, '')
      const identificacao =
        docDigitos.length === 11
          ? { type: 'CPF', number: docDigitos }
          : docDigitos.length === 14
            ? { type: 'CNPJ', number: docDigitos }
            : undefined

      const nomeSistema =
        typeof configDados.nomeSistema === 'string' && configDados.nomeSistema.trim()
          ? configDados.nomeSistema.trim()
          : 'T-System Beach'

      const descricao = competenciaFatura
        ? `${nomeSistema} • Fatura ${competenciaFatura} (${cicloPadrao.nome}) - ${empresaTyped.nome_fantasia}`
        : `${nomeSistema} • ${planoNome} (${cicloPadrao.nome}) - ${empresaTyped.nome_fantasia}`

      const webhookUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/mercadopago-webhook`

      const pixPayload = {
        transaction_amount: valorCobranca,
        description: descricao,
        payment_method_id: 'pix',
        external_reference: `${empresaTyped.id}|${cicloPadrao.id}|${refFatura}`,
        notification_url: webhookUrl,
        payer: {
          email: emailValido,
          first_name: primeiroNome,
          last_name: sobrenome,
          ...(identificacao ? { identification: identificacao } : {})
        }
      }

      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID()
        },
        body: JSON.stringify(pixPayload)
      })

      const payData = (await mpRes.json()) as MercadoPagoPaymentResponse
      if (!mpRes.ok) {
        const detalhe = payData.cause?.[0]?.description || payData.message || 'Falha ao gerar cobrança PIX.'
        return new Response(
          JSON.stringify({ error: `Mercado Pago: ${detalhe}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const txData = payData.point_of_interaction?.transaction_data
      if (!txData?.qr_code) {
        return new Response(
          JSON.stringify({ error: 'O Mercado Pago não retornou o código PIX Copia e Cola.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      return new Response(
        JSON.stringify({
          paymentId: String(payData.id || ''),
          status: String(payData.status || 'pending'),
          qrCodeCopiaECola: txData.qr_code,
          qrCodeBase64: txData.qr_code_base64 || '',
          ticketUrl: txData.ticket_url || '',
          valor: valorCobranca,
          cicloId: cicloPadrao.id,
          criadoEm: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ==========================================================================
    // AÇÃO: CRIAR PREFERÊNCIA DE CHECKOUT PRO NO MERCADO PAGO
    // ==========================================================================
    const { cicloPadrao, valorTotalFinal } = calcularValoresCiclo(body.cicloId, empresaTyped, configDados)

    const rawOrigin = (body.origin || 'https://www.t-systembeach.com.br').trim().replace(/\/$/, '')
    const originUrl =
      rawOrigin.startsWith('https://') && !rawOrigin.includes('localhost') && !rawOrigin.includes('127.0.0.1')
        ? rawOrigin
        : 'https://www.t-systembeach.com.br'

    const redirectPath =
      body.redirectPath === '/admin/assinatura' ? '/admin/assinatura' : '/assinatura-pendente'
    const externalReference = `${empresaTyped.id}|${cicloPadrao.id}`
    const webhookUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/mercadopago-webhook`

    const preferencePayload = {
      items: [
        {
          id: `assinatura_premium_${cicloPadrao.id}`,
          title: cicloPadrao.titulo,
          description: `Licença SaaS T-System Beach para ${empresaTyped.nome_fantasia} (${cicloPadrao.diasVigencia} dias)`,
          category_id: 'services',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: valorTotalFinal
        }
      ],
      payer: {
        name: perfil.nome,
        email: empresaTyped.email_contato || perfil.email || user.email
      },
      external_reference: externalReference,
      back_urls: {
        success: `${originUrl}${redirectPath}?retorno_mp=aprovado&ciclo=${cicloPadrao.id}`,
        pending: `${originUrl}${redirectPath}?retorno_mp=pendente&ciclo=${cicloPadrao.id}`,
        failure: `${originUrl}${redirectPath}?retorno_mp=falha&ciclo=${cicloPadrao.id}`
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
    const msg = err instanceof Error ? err.message : 'Erro interno ao processar pagamento.'
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
