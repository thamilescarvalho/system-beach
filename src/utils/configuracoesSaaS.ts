// src/utils/configuracoesSaaS.ts
import { supabase } from '../lib/supabase';
import { registrarFaturaPaga } from './faturasSaaS';

export type IdCicloCobranca = 'mensal' | 'trimestral' | 'semestral' | 'anual';

export interface CicloAssinaturaConfig {
  id: IdCicloCobranca;
  nome: string;
  periodicidadeLabel: string;
  meses: number;
  diasVigencia: number;
  valorMensalEquivalente: number;
  valorTotalCiclo: number;
  descontoPercentual: number;
  destaqueBadge: string;
  linkCheckoutDireto: string;
  ativo: boolean;
}

export interface ConfiguracaoGlobalSaaS {
  nomeSistema: string;
  subtituloLogin: string;
  textoRodapeLogin: string;
  textoBotaoCadastroLogin: string;
  whatsappSuporte: string;
  mensagemWhatsappPadrao: string;
  planoNome: string;
  planoBadgeTopo: string;
  planoSubtitulo: string;
  promocaoAtiva: boolean;
  promocaoTextoBanner: string;
  textoBotaoTesteGratis: string;
  recursosPlano: string[];
  mpAccessToken: string;
  ciclos: Record<IdCicloCobranca, CicloAssinaturaConfig>;
}

export interface DadosPixMercadoPago {
  paymentId: string;
  status: string;
  qrCodeCopiaECola: string;
  qrCodeBase64: string;
  ticketUrl: string;
  valor: number;
  cicloId: IdCicloCobranca;
  criadoEm: string;
}

interface RespostaCriacaoPixMP {
  id?: number | string;
  status?: string;
  status_detail?: string;
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

interface RespostaConsultaPagamentoMP {
  id?: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
}

const STORAGE_CONFIG_KEY = 'tsystem_saas_global_config_v1';

/**
 * Domínio oficial de produção do T-System Beach.
 */
export const URL_DOMINIO_PRODUCAO = 'https://www.t-systembeach.com.br';

/**
 * Retorna a URL base pública e segura (HTTPS) do sistema para redirecionamentos de e-mail
 * do Supabase e callbacks (back_urls / auto_return) do Mercado Pago.
 * Garante que mesmo em ambiente local (localhost) os links externos apontem para o domínio oficial.
 */
export function obterUrlBaseSistema(): string {
  const envUrl = ((import.meta.env.VITE_SITE_URL as string | undefined) || '').trim().replace(/\/$/, '');
  if (envUrl && envUrl.startsWith('https://')) {
    return envUrl;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    const isLocal =
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.startsWith('http://');
    if (!isLocal && origin.startsWith('https://')) {
      return origin;
    }
  }

  return URL_DOMINIO_PRODUCAO;
}

export const CONFIGURACAO_SAAS_PADRAO: ConfiguracaoGlobalSaaS = {
  nomeSistema: 'T-System Beach',
  subtituloLogin: 'Acessar Estabelecimento',
  textoRodapeLogin: 'Ainda não possui cadastro?',
  textoBotaoCadastroLogin: 'Contrate aqui uma assinatura',
  whatsappSuporte: (import.meta.env.VITE_WHATSAPP_SUPORTE as string | undefined) || '5585999999999',
  mensagemWhatsappPadrao: 'Olá! Preciso de atendimento sobre o T-System Beach.',
  planoNome: 'Assinatura Premium',
  planoBadgeTopo: 'Plano Oficial',
  planoSubtitulo:
    'Selecione a periodicidade da sua assinatura para gerar seu PIX imediato ou prosseguir ao checkout seguro do Mercado Pago.',
  promocaoAtiva: false,
  promocaoTextoBanner: 'Oferta Especial: economize até 33% contratando os ciclos com desconto progressivo!',
  textoBotaoTesteGratis: 'Deseja testar antes de pagar? Fale conosco para solicitar 7 dias grátis',
  recursosPlano: [
    'Mapa de Guarda-sóis e Mesas ilimitados em tempo real',
    'Comandas mobile ágeis sincronizadas com Bar e Cozinha',
    'Gestão de Caixa, Estoque, Equipe e Metas Financeiras',
    'Impressão térmica Bluetooth/USB e Suporte dedicado'
  ],
  mpAccessToken: '',
  ciclos: {
    mensal: {
      id: 'mensal',
      nome: 'Mensal',
      periodicidadeLabel: 'Cobrança mensal sem fidelidade',
      meses: 1,
      diasVigencia: 30,
      valorMensalEquivalente: 149.90,
      valorTotalCiclo: 149.90,
      descontoPercentual: 0,
      destaqueBadge: '',
      linkCheckoutDireto: (import.meta.env.VITE_MP_LINK_MENSAL as string | undefined) || '',
      ativo: true
    },
    trimestral: {
      id: 'trimestral',
      nome: 'Trimestral',
      periodicidadeLabel: 'Cobrado a cada 3 meses',
      meses: 3,
      diasVigencia: 90,
      valorMensalEquivalente: 134.90,
      valorTotalCiclo: 404.70,
      descontoPercentual: 10,
      destaqueBadge: '',
      linkCheckoutDireto: (import.meta.env.VITE_MP_LINK_TRIMESTRAL as string | undefined) || '',
      ativo: true
    },
    semestral: {
      id: 'semestral',
      nome: 'Semestral',
      periodicidadeLabel: 'Cobrado a cada 6 meses',
      meses: 6,
      diasVigencia: 180,
      valorMensalEquivalente: 119.90,
      valorTotalCiclo: 719.40,
      descontoPercentual: 20,
      destaqueBadge: 'Mais Escolhido',
      linkCheckoutDireto: (import.meta.env.VITE_MP_LINK_SEMESTRAL as string | undefined) || '',
      ativo: true
    },
    anual: {
      id: 'anual',
      nome: 'Anual',
      periodicidadeLabel: 'Cobrado anualmente',
      meses: 12,
      diasVigencia: 365,
      valorMensalEquivalente: 99.90,
      valorTotalCiclo: 1198.80,
      descontoPercentual: 33,
      destaqueBadge: 'Maior Economia',
      linkCheckoutDireto: (import.meta.env.VITE_MP_LINK_ANUAL as string | undefined) || '',
      ativo: true
    }
  }
};

function mesclarConfiguracao(parcial?: Partial<ConfiguracaoGlobalSaaS> | null): ConfiguracaoGlobalSaaS {
  if (!parcial || typeof parcial !== 'object') {
    return CONFIGURACAO_SAAS_PADRAO;
  }

  const ciclosParciais = parcial.ciclos || ({} as Partial<Record<IdCicloCobranca, CicloAssinaturaConfig>>);

  return {
    ...CONFIGURACAO_SAAS_PADRAO,
    ...parcial,
    recursosPlano:
      Array.isArray(parcial.recursosPlano) && parcial.recursosPlano.length > 0
        ? parcial.recursosPlano
        : CONFIGURACAO_SAAS_PADRAO.recursosPlano,
    ciclos: {
      mensal: { ...CONFIGURACAO_SAAS_PADRAO.ciclos.mensal, ...(ciclosParciais.mensal || {}) },
      trimestral: { ...CONFIGURACAO_SAAS_PADRAO.ciclos.trimestral, ...(ciclosParciais.trimestral || {}) },
      semestral: { ...CONFIGURACAO_SAAS_PADRAO.ciclos.semestral, ...(ciclosParciais.semestral || {}) },
      anual: { ...CONFIGURACAO_SAAS_PADRAO.ciclos.anual, ...(ciclosParciais.anual || {}) }
    }
  };
}

export function obterConfiguracaoGlobalLocal(): ConfiguracaoGlobalSaaS {
  if (typeof window === 'undefined') return CONFIGURACAO_SAAS_PADRAO;
  try {
    const salvo = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (!salvo) return CONFIGURACAO_SAAS_PADRAO;
    const parsed = JSON.parse(salvo) as Partial<ConfiguracaoGlobalSaaS>;
    return mesclarConfiguracao(parsed);
  } catch {
    return CONFIGURACAO_SAAS_PADRAO;
  }
}

export async function carregarConfiguracaoGlobalSaaS(): Promise<ConfiguracaoGlobalSaaS> {
  const local = obterConfiguracaoGlobalLocal();
  try {
    const { data, error } = await supabase
      .from('configuracoes_saas')
      .select('dados')
      .eq('id', 'global')
      .maybeSingle();

    if (!error && data?.dados && typeof data.dados === 'object') {
      const mesclado = mesclarConfiguracao(data.dados as Partial<ConfiguracaoGlobalSaaS>);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(mesclado));
      }
      return mesclado;
    }
  } catch {
    // Se a tabela configuracoes_saas ainda não existir no banco, utiliza o cache local perfeitamente
  }
  return local;
}

export async function salvarConfiguracaoGlobalSaaS(
  novaConfig: ConfiguracaoGlobalSaaS
): Promise<{ salvoNaNuvem: boolean }> {
  const normalizada = mesclarConfiguracao(novaConfig);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(normalizada));
  }

  try {
    const { error } = await supabase
      .from('configuracoes_saas')
      .upsert(
        [
          {
            id: 'global',
            dados: normalizada,
            updated_at: new Date().toISOString()
          }
        ],
        { onConflict: 'id' }
      );

    return { salvoNaNuvem: !error };
  } catch {
    return { salvoNaNuvem: false };
  }
}

/**
 * Identifica se a chave colada é uma Public Key (formato UUID: APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 * em vez do Access Token (formato longo com ID da aplicação, data, hash e user ID).
 */
export function ehPublicKeyMercadoPago(chave: string): boolean {
  const limpa = chave.trim();
  return /^(APP_USR|TEST)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpa);
}

/**
 * Retorna o Access Token do Mercado Pago configurado no banco/painel Super Admin ou na variável de ambiente VITE_MP_ACCESS_TOKEN.
 */
export function obterAccessTokenMercadoPago(configSaaS?: ConfiguracaoGlobalSaaS): string {
  const tokenPainel = configSaaS?.mpAccessToken?.trim() || '';
  if (tokenPainel) return tokenPainel;
  const tokenEnv = ((import.meta.env.VITE_MP_ACCESS_TOKEN as string | undefined) || '').trim();
  return tokenEnv;
}

/**
 * Realiza chamadas à API oficial do Mercado Pago contornando bloqueios de CORS do navegador
 * (usa a rota proxy /api-mp configurada no Vite/Vercel e faz fallback direto para api.mercadopago.com).
 */
export async function requisitarApiMercadoPago(
  caminho: string,
  init: RequestInit
): Promise<Response> {
  const caminhoNormalizado = caminho.startsWith('/') ? caminho : `/${caminho}`;

  try {
    const resProxy = await fetch(`/api-mp${caminhoNormalizado}`, init);
    const contentType = resProxy.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return resProxy;
    }
  } catch {
    // Segue para chamada direta
  }

  return fetch(`https://api.mercadopago.com${caminhoNormalizado}`, init);
}

/**
 * Gera uma cobrança PIX instantânea diretamente na API v1/payments do Mercado Pago (compatível com conta Pessoa Física e Jurídica).
 * Retorna o QR Code em Base64 e o código PIX Copia e Cola.
 */
export async function gerarPagamentoPixMercadoPago(params: {
  valor: number;
  descricao: string;
  emailPagador?: string;
  nomePagador?: string;
  documentoPagador?: string;
  externalReference: string;
  cicloId: IdCicloCobranca;
  tokenMP: string;
}): Promise<DadosPixMercadoPago> {
  const tokenLimpo = params.tokenMP.trim();

  if (!tokenLimpo) {
    throw new Error(
      'Access Token do Mercado Pago não configurado. Adicione VITE_MP_ACCESS_TOKEN no arquivo .env ou configure no painel Super Admin (/master).'
    );
  }

  if (ehPublicKeyMercadoPago(tokenLimpo)) {
    throw new Error(
      'A chave configurada é uma Public Key (formato curto). Para gerar PIX, utilize o Access Token de Produção (APP_USR-...) do Mercado Pago.'
    );
  }

  const valorNumerico = Number(params.valor.toFixed(2));
  if (Number.isNaN(valorNumerico) || valorNumerico <= 0) {
    throw new Error('O valor da cobrança PIX deve ser maior que zero.');
  }

  const emailValido =
    params.emailPagador && params.emailPagador.includes('@')
      ? params.emailPagador.trim().toLowerCase()
      : 'assinatura@tsystembeach.com.br';

  const nomePartes = (params.nomePagador || 'Cliente Estabelecimento').trim().split(/\s+/);
  const primeiroNome = nomePartes[0] || 'Cliente';
  const sobrenome = nomePartes.slice(1).join(' ') || 'Estabelecimento';

  const docDigitos = (params.documentoPagador || '').replace(/\D/g, '');
  const identificacaoValida =
    docDigitos.length === 11
      ? { type: 'CPF', number: docDigitos }
      : docDigitos.length === 14
        ? { type: 'CNPJ', number: docDigitos }
        : undefined;

  const idempotencyKey =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `pix_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  const supabaseUrl = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) || '').trim().replace(/\/$/, '');
  const webhookUrl = supabaseUrl.startsWith('https://')
    ? `${supabaseUrl}/functions/v1/mercadopago-webhook`
    : undefined;

  const payload: Record<string, unknown> = {
    transaction_amount: valorNumerico,
    description: params.descricao,
    payment_method_id: 'pix',
    external_reference: params.externalReference,
    ...(webhookUrl ? { notification_url: webhookUrl } : {}),
    payer: {
      email: emailValido,
      first_name: primeiroNome,
      last_name: sobrenome,
      ...(identificacaoValida ? { identification: identificacaoValida } : {})
    }
  };

  const response = await requisitarApiMercadoPago('/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenLimpo}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': idempotencyKey
    },
    body: JSON.stringify(payload)
  });

  const data = (await response.json()) as RespostaCriacaoPixMP;

  if (!response.ok) {
    const detalheCausa = data.cause?.[0]?.description || data.message || '';
    if (
      detalheCausa.toLowerCase().includes('collector') ||
      detalheCausa.toLowerCase().includes('key') ||
      detalheCausa.toLowerCase().includes('pix')
    ) {
      throw new Error(
        `Mercado Pago recusou a geração do PIX (${detalheCausa}). Certifique-se de que sua conta Mercado Pago possui pelo menos uma Chave PIX cadastrada e ativa.`
      );
    }
    if (response.status === 401) {
      throw new Error(
        'Access Token inválido ou expirado (401 Unauthorized). Verifique seu Access Token de Produção no painel do Mercado Pago Developers.'
      );
    }
    throw new Error(
      detalheCausa
        ? `Erro Mercado Pago: ${detalheCausa}`
        : 'Não foi possível gerar o QR Code PIX no Mercado Pago.'
    );
  }

  const txData = data.point_of_interaction?.transaction_data;
  const qrCodeCopiaECola = txData?.qr_code || '';
  const qrCodeBase64 = txData?.qr_code_base64 || '';

  if (!qrCodeCopiaECola) {
    throw new Error('O Mercado Pago não retornou o código PIX Copia e Cola para esta transação.');
  }

  return {
    paymentId: String(data.id || ''),
    status: String(data.status || 'pending'),
    qrCodeCopiaECola,
    qrCodeBase64,
    ticketUrl: txData?.ticket_url || '',
    valor: valorNumerico,
    cicloId: params.cicloId,
    criadoEm: new Date().toISOString()
  };
}

/**
 * Consulta o status em tempo real de um pagamento PIX ou Checkout no Mercado Pago.
 */
export async function consultarStatusPagamentoMercadoPago(
  paymentId: string,
  tokenMP: string
): Promise<{ approved: boolean; status: string; externalReference?: string }> {
  const tokenLimpo = tokenMP.trim();
  if (!paymentId || !tokenLimpo || ehPublicKeyMercadoPago(tokenLimpo)) {
    return { approved: false, status: 'unknown' };
  }

  const res = await requisitarApiMercadoPago(`/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenLimpo}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    return { approved: false, status: 'error' };
  }

  const data = (await res.json()) as RespostaConsultaPagamentoMP;
  const status = String(data.status || 'pending');
  return {
    approved: status === 'approved',
    status,
    externalReference: data.external_reference
  };
}

/**
 * Ativa ou renova a assinatura do estabelecimento no Supabase após confirmação de pagamento aprovado no Mercado Pago.
 * Caso o estabelecimento já possua dias restantes vigentes, soma os novos dias ao vencimento atual.
 */
export async function ativarOuRenovarAssinaturaAposPagamento(params: {
  empresaId: string;
  dataVencimentoAtual?: string;
  statusAssinaturaAtual?: string;
  planoNome: string;
  ciclo: CicloAssinaturaConfig;
  paymentId: string;
}): Promise<string> {
  const agora = new Date();
  let baseData = agora;

  if (params.dataVencimentoAtual && params.statusAssinaturaAtual === 'ativa') {
    const atualParsed = new Date(params.dataVencimentoAtual);
    if (!Number.isNaN(atualParsed.getTime()) && atualParsed.getTime() > agora.getTime()) {
      baseData = atualParsed;
    }
  }

  const novoVencimento = new Date(baseData.getTime());
  novoVencimento.setDate(novoVencimento.getDate() + (params.ciclo.diasVigencia || 30));
  const novoVencimentoIso = novoVencimento.toISOString();

  await supabase
    .from('empresas')
    .update({
      status_assinatura: 'ativa',
      plano_nome: params.planoNome,
      ciclo_cobranca: params.ciclo.id,
      valor_mensalidade: params.ciclo.valorMensalEquivalente,
      data_vencimento: novoVencimentoIso
    })
    .eq('id', params.empresaId);

  // Registra formalmente a(s) fatura(s) correspondente(s) como Paga(s) no histórico
  await registrarFaturaPaga({
    empresaId: params.empresaId,
    valor: params.ciclo.valorTotalCiclo,
    valorMensalEquivalente: params.ciclo.valorMensalEquivalente,
    mesesCiclo: params.ciclo.meses,
    planoNome: params.planoNome,
    cicloNome: params.ciclo.nome,
    paymentIdMp: params.paymentId,
    formaPagamento: 'PIX Mercado Pago',
    dataVencimento: novoVencimentoIso
  }).catch(() => null);

  return novoVencimentoIso;
}
