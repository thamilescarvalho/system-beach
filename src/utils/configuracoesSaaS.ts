// src/utils/configuracoesSaaS.ts
import { supabase } from '../lib/supabase';

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

export interface StatusIntegracaoMercadoPago {
  configured: boolean;
  source: 'env' | 'vault' | 'legacy' | 'none';
  maskedPreview: string;
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

function mesclarConfiguracao(parcial?: (Partial<ConfiguracaoGlobalSaaS> & { mpAccessToken?: unknown }) | null): ConfiguracaoGlobalSaaS {
  if (!parcial || typeof parcial !== 'object') {
    return CONFIGURACAO_SAAS_PADRAO;
  }

  // Garante que nenhuma credencial sensível legada permaneça no objeto público/cache
  const restante = { ...parcial };
  delete restante.mpAccessToken;

  const ciclosParciais = restante.ciclos || ({} as Partial<Record<IdCicloCobranca, CicloAssinaturaConfig>>);

  return {
    ...CONFIGURACAO_SAAS_PADRAO,
    ...restante,
    recursosPlano:
      Array.isArray(restante.recursosPlano) && restante.recursosPlano.length > 0
        ? restante.recursosPlano
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
    const parsed = JSON.parse(salvo) as Partial<ConfiguracaoGlobalSaaS> & { mpAccessToken?: unknown };
    const limpo = mesclarConfiguracao(parsed);
    if ('mpAccessToken' in parsed) {
      localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(limpo));
    }
    return limpo;
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
      const mesclado = mesclarConfiguracao(data.dados as Partial<ConfiguracaoGlobalSaaS> & { mpAccessToken?: unknown });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(mesclado));
      }
      return mesclado;
    }
  } catch {
    // Se a tabela configuracoes_saas ainda não existir no banco, utiliza o cache local
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
 * Gera uma cobrança PIX instantânea exclusivamente via Edge Function no servidor (Zero-Trust).
 */
export async function gerarPagamentoPixMercadoPago(params: {
  cicloId: IdCicloCobranca;
  faturaId?: string;
}): Promise<DadosPixMercadoPago> {
  const { data, error } = await supabase.functions.invoke<DadosPixMercadoPago & { error?: string }>(
    'mercadopago-checkout',
    {
      body: {
        action: 'createPix',
        cicloId: params.cicloId,
        faturaId: params.faturaId
      }
    }
  );

  if (error || !data?.qrCodeCopiaECola) {
    throw new Error(
      data?.error ||
        error?.message ||
        'Não foi possível gerar o QR Code PIX no servidor. Tente novamente em instantes.'
    );
  }

  return data;
}

/**
 * Cria uma preferência de Checkout Pro exclusivamente via Edge Function no servidor.
 */
export async function criarCheckoutMercadoPago(params: {
  cicloId: IdCicloCobranca;
  redirectPath: '/assinatura-pendente' | '/admin/assinatura';
}): Promise<{ init_point: string }> {
  const originUrl = obterUrlBaseSistema();

  const { data, error } = await supabase.functions.invoke<{ init_point?: string; error?: string }>(
    'mercadopago-checkout',
    {
      body: {
        action: 'createPreference',
        cicloId: params.cicloId,
        origin: originUrl,
        redirectPath: params.redirectPath
      }
    }
  );

  if (error || !data?.init_point) {
    throw new Error(
      data?.error ||
        error?.message ||
        'Não foi possível iniciar o Checkout Pro do Mercado Pago.'
    );
  }

  return { init_point: data.init_point };
}

/**
 * Consulta o status em tempo real de um pagamento PIX ou Checkout via Edge Function.
 * Quando aprovado, o próprio servidor ativa/renova a assinatura e registra as faturas.
 */
export async function consultarStatusPagamentoMercadoPago(
  paymentId: string
): Promise<{ approved: boolean; status: string; externalReference?: string }> {
  if (!paymentId) {
    return { approved: false, status: 'unknown' };
  }

  const { data, error } = await supabase.functions.invoke<{
    approved?: boolean;
    status?: string;
    externalReference?: string;
  }>('mercadopago-checkout', {
    body: {
      action: 'verifyPayment',
      paymentId
    }
  });

  if (error || !data) {
    return { approved: false, status: 'error' };
  }

  return {
    approved: Boolean(data.approved),
    status: String(data.status || 'pending'),
    externalReference: data.externalReference
  };
}

export async function obterStatusIntegracaoMercadoPago(): Promise<StatusIntegracaoMercadoPago> {
  const { data, error } = await supabase.functions.invoke<StatusIntegracaoMercadoPago>(
    'mercadopago-checkout',
    {
      body: { action: 'getIntegrationStatus' }
    }
  );

  if (error || !data) {
    return { configured: false, source: 'none', maskedPreview: '' };
  }
  return data;
}

export async function salvarETestarTokenMercadoPago(token: string): Promise<{
  ok: boolean;
  accountLabel?: string;
  maskedPreview?: string;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    accountLabel?: string;
    maskedPreview?: string;
    error?: string;
  }>('mercadopago-checkout', {
    body: {
      action: 'saveAndTestToken',
      token
    }
  });

  if (error && !data) {
    return { ok: false, error: error.message || 'Falha ao validar token no servidor.' };
  }

  return {
    ok: Boolean(data?.ok),
    accountLabel: data?.accountLabel,
    maskedPreview: data?.maskedPreview,
    error: data?.error
  };
}

export async function testarConexaoMercadoPagoServidor(): Promise<{
  ok: boolean;
  accountLabel?: string;
  maskedPreview?: string;
  error?: string;
}> {
  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    accountLabel?: string;
    maskedPreview?: string;
    error?: string;
  }>('mercadopago-checkout', {
    body: { action: 'testConnection' }
  });

  if (error && !data) {
    return { ok: false, error: error.message || 'Falha ao testar conexão no servidor.' };
  }

  return {
    ok: Boolean(data?.ok),
    accountLabel: data?.accountLabel,
    maskedPreview: data?.maskedPreview,
    error: data?.error
  };
}
