-- ==============================================================================
-- T-SYSTEM BEACH — SEGURANÇA SAAS: ISOLAMENTO DE SEGREDOS E BLINDAGEM DE FATURAS
-- Data: 2026-11-13
-- Objetivo:
--   1. Criar a tabela privada `configuracoes_saas_privadas` (sem acesso via anon/authenticated)
--      para armazenar credenciais sensíveis (MP Access Token) acessíveis somente
--      pelas Edge Functions via `service_role`.
--   2. Migrar eventual `mpAccessToken` salvo em `configuracoes_saas.dados` para a tabela
--      privada e remover o segredo da tabela pública, bloqueando futuras gravações
--      acidentais via trigger.
--   3. Restringir escrita em `faturas_assinatura` para que somente `service_role`
--      ou `super_admin` possam marcar uma fatura como `paga`.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: TABELA PRIVADA DE CREDENCIAIS DO SAAS (APENAS SERVICE_ROLE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracoes_saas_privadas (
  id text PRIMARY KEY DEFAULT 'global',
  mp_access_token text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_saas_privadas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.configuracoes_saas_privadas FROM PUBLIC;
REVOKE ALL ON public.configuracoes_saas_privadas FROM anon;
REVOKE ALL ON public.configuracoes_saas_privadas FROM authenticated;
GRANT ALL ON public.configuracoes_saas_privadas TO service_role;

-- Migra o token existente (se houver) de configuracoes_saas.dados e limpa o campo público
DO $$
DECLARE
  v_token text;
BEGIN
  SELECT NULLIF(trim(COALESCE(dados->>'mpAccessToken', '')), '')
  INTO v_token
  FROM public.configuracoes_saas
  WHERE id = 'global';

  IF v_token IS NOT NULL THEN
    INSERT INTO public.configuracoes_saas_privadas (id, mp_access_token, updated_at)
    VALUES ('global', v_token, now())
    ON CONFLICT (id) DO UPDATE
      SET mp_access_token = COALESCE(NULLIF(trim(public.configuracoes_saas_privadas.mp_access_token), ''), EXCLUDED.mp_access_token),
          updated_at = now();
  END IF;

  UPDATE public.configuracoes_saas
  SET dados = COALESCE(dados, '{}'::jsonb) - 'mpAccessToken',
      updated_at = now()
  WHERE dados ? 'mpAccessToken';
END $$;

-- Trigger para impedir que `mpAccessToken` volte a ser gravado na tabela pública
CREATE OR REPLACE FUNCTION public.sanitizar_configuracoes_saas_publicas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.dados := COALESCE(NEW.dados, '{}'::jsonb) - 'mpAccessToken';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sanitizar_configuracoes_saas ON public.configuracoes_saas;
CREATE TRIGGER tr_sanitizar_configuracoes_saas
  BEFORE INSERT OR UPDATE ON public.configuracoes_saas
  FOR EACH ROW
  EXECUTE FUNCTION public.sanitizar_configuracoes_saas_publicas();

-- ------------------------------------------------------------------------------
-- PASSO 2: BLINDAGEM DE FATURAS PAGAS (CLIENTES NÃO PODEM FORJAR STATUS 'paga')
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "faturas_empresa_modificacao" ON public.faturas_assinatura;
DROP POLICY IF EXISTS "faturas_empresa_insert" ON public.faturas_assinatura;
DROP POLICY IF EXISTS "faturas_empresa_update" ON public.faturas_assinatura;
DROP POLICY IF EXISTS "faturas_empresa_inserir_pendente" ON public.faturas_assinatura;
DROP POLICY IF EXISTS "faturas_super_admin_gerencia" ON public.faturas_assinatura;

CREATE POLICY "faturas_empresa_inserir_pendente" ON public.faturas_assinatura
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      (empresa_id = public.meu_empresa_id() OR empresa_id IN (SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()))
      AND status IN ('pendente', 'em_atraso')
    )
  );

CREATE POLICY "faturas_super_admin_gerencia" ON public.faturas_assinatura
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());
