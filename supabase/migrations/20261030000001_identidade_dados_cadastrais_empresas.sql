-- ==============================================================================
-- T-SYSTEM BEACH — IDENTIDADE VISUAL (WHITE-LABEL) E DADOS CADASTRAIS DAS EMPRESAS
-- Data: 2026-10-30
-- Objetivo:
--   1. Criar a coluna "nome_exibicao" (nome que o proprietário escolhe para aparecer
--      no topo do sistema no lugar de "System Beach").
--   2. Criar a coluna "email_contato" (e-mail oficial do estabelecimento).
--   3. Blindar os dados cadastrais (nome fantasia, CPF/CNPJ, telefone, e-mail):
--      somente o Super Admin (ou o servidor) pode alterá-los.
--   4. Criar a RPC segura "atualizar_identidade_estabelecimento" para o proprietário
--      (admin) personalizar APENAS o nome de exibição da sua própria empresa.
-- Script idempotente: pode ser executado mais de uma vez com segurança.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: NOVAS COLUNAS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.empresas
  ADD COLUMN IF NOT EXISTS nome_exibicao text,
  ADD COLUMN IF NOT EXISTS email_contato text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'empresas_nome_exibicao_tamanho_chk'
  ) THEN
    ALTER TABLE public.empresas
      ADD CONSTRAINT empresas_nome_exibicao_tamanho_chk
      CHECK (nome_exibicao IS NULL OR char_length(nome_exibicao) BETWEEN 2 AND 40);
  END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 2: PREENCHE O E-MAIL DE CONTATO DAS EMPRESAS JÁ EXISTENTES
-- (usa o e-mail do administrador responsável; executado ANTES da blindagem)
-- ------------------------------------------------------------------------------
UPDATE public.empresas e
SET email_contato = sub.email
FROM (
  SELECT DISTINCT ON (u.empresa_id) u.empresa_id, lower(trim(u.email)) AS email
  FROM public.usuarios u
  WHERE u.cargo IN ('admin', 'super_admin')
    AND u.email IS NOT NULL
    AND u.deletado_em IS NULL
  ORDER BY u.empresa_id, (u.cargo = 'admin') DESC
) AS sub
WHERE e.id = sub.empresa_id
  AND e.email_contato IS NULL;

-- ------------------------------------------------------------------------------
-- PASSO 3: BLINDAGEM DOS DADOS DE LICENÇA E CADASTRAIS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_licenca_empresas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF v_role = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura
       OR NEW.data_vencimento IS DISTINCT FROM OLD.data_vencimento
       OR NEW.valor_mensalidade IS DISTINCT FROM OLD.valor_mensalidade THEN
      RAISE EXCEPTION 'Violação de Segurança: apenas o sistema de faturamento ou o Super Admin podem alterar dados de licença.';
    END IF;

    IF NEW.nome_fantasia IS DISTINCT FROM OLD.nome_fantasia
       OR NEW.documento IS DISTINCT FROM OLD.documento
       OR NEW.telefone IS DISTINCT FROM OLD.telefone
       OR NEW.email_contato IS DISTINCT FROM OLD.email_contato THEN
      RAISE EXCEPTION 'Violação de Segurança: dados cadastrais só podem ser alterados pelo Super Admin.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_proteger_empresas ON public.empresas;
CREATE TRIGGER tr_proteger_empresas
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_licenca_empresas();

-- ------------------------------------------------------------------------------
-- PASSO 4: E-MAIL DE CONTATO AUTOMÁTICO PARA NOVOS ESTABELECIMENTOS
-- Quando o primeiro administrador é criado (onboarding / painel master),
-- o e-mail dele vira o e-mail de contato da empresa (se ainda estiver vazio).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preencher_email_contato_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_anterior text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF NEW.cargo = 'admin' AND NEW.email IS NOT NULL AND NEW.empresa_id IS NOT NULL THEN
    -- Eleva o contexto apenas durante este UPDATE pontual e restaura logo em seguida
    PERFORM set_config('request.jwt.claim.role', 'service_role', true);

    UPDATE public.empresas
    SET email_contato = lower(trim(NEW.email))
    WHERE id = NEW.empresa_id
      AND email_contato IS NULL;

    PERFORM set_config('request.jwt.claim.role', COALESCE(v_role_anterior, ''), true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_preencher_email_contato_empresa ON public.usuarios;
CREATE TRIGGER tr_preencher_email_contato_empresa
  AFTER INSERT ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.preencher_email_contato_empresa();

-- ------------------------------------------------------------------------------
-- PASSO 5: RPC SEGURA — PROPRIETÁRIO PERSONALIZA O NOME DE EXIBIÇÃO
-- - Admin: somente a própria empresa.
-- - Super Admin: qualquer empresa (inclusive durante "Assumir Identidade").
-- - Texto vazio volta para o nome padrão "System Beach".
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atualizar_identidade_estabelecimento(
  p_empresa_id uuid,
  p_nome_exibicao text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text := NULLIF(regexp_replace(trim(COALESCE(p_nome_exibicao, '')), '\s+', ' ', 'g'), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  IF NOT public.is_super_admin() THEN
    IF NOT public.is_admin_workspace() OR p_empresa_id IS DISTINCT FROM public.meu_empresa_id() THEN
      RAISE EXCEPTION 'Acesso negado: apenas o proprietário pode personalizar o estabelecimento.';
    END IF;
  END IF;

  IF v_nome IS NOT NULL AND char_length(v_nome) NOT BETWEEN 2 AND 40 THEN
    RAISE EXCEPTION 'O nome de exibição deve ter entre 2 e 40 caracteres.';
  END IF;

  UPDATE public.empresas
  SET nome_exibicao = v_nome
  WHERE id = p_empresa_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado.';
  END IF;

  RETURN v_nome;
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_identidade_estabelecimento(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_identidade_estabelecimento(uuid, text) TO authenticated;
