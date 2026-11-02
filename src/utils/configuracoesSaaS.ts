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
  mpAccessToken: string;
  ciclos: Record<IdCicloCobranca, CicloAssinaturaConfig>;
}

const STORAGE_CONFIG_KEY = 'tsystem_saas_global_config_v1';

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
    'Selecione a periodicidade da sua assinatura para prosseguir ao checkout seguro do Mercado Pago e liberar seu acesso imediatamente.',
  promocaoAtiva: false,
  promocaoTextoBanner: 'Oferta Especial: economize até 33% contratando os ciclos com desconto progressivo!',
  textoBotaoTesteGratis: 'Deseja testar antes de pagar? Fale conosco para solicitar 7 dias grátis',
  recursosPlano: [
    'Mapa de Guarda-sóis e Mesas ilimitados em tempo real',
    'Comandas mobile ágeis sincronizadas com Bar e Cozinha',
    'Gestão de Caixa, Estoque, Equipe e Metas Financeiras',
    'Segurança corporativa multi-empresa e Suporte dedicado'
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
    // Se retornou JSON válido do proxy (mesmo que 400/401 da API do MP), usamos a resposta do proxy
    if (contentType.includes('application/json')) {
      return resProxy;
    }
  } catch {
    // Segue para chamada direta
  }

  return fetch(`https://api.mercadopago.com${caminhoNormalizado}`, init);
}
