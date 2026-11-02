-- ==============================================================================
-- T-SYSTEM BEACH — AUTONOMIA DO ADMINISTRADOR: GESTÃO DA MINHA EMPRESA
-- Data: 2026-10-31
-- Objetivo:
--   1. Permitir que o ADMINISTRADOR (proprietário do estabelecimento) altere os
--      dados cadastrais da sua própria empresa (nome, exibição, CPF/CNPJ, telefone, e-mail).
--   2. Manter estritamente bloqueada a alteração de dados de licença e faturamento
--      (status_assinatura, data_vencimento, valor_mensalidade), que continuam
--      sendo exclusivos do Super Admin e dos webhooks de pagamento.
--   3. Criar a RPC segura "atualizar_dados_minha_empresa" com validações estritas.
-- Script idempotente: seguro para rodar no Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: ATUALIZAR TRIGGER DE BLINDAGEM DE LICENÇAS E DADOS CADASTRAIS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_licenca_empresas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
  v_is_super boolean := public.is_super_admin();
  v_is_admin boolean := public.is_admin_workspace();
  v_minha_empresa uuid := public.meu_empresa_id();
BEGIN
  -- Service role (Edge Functions/Webhooks) e Super Admin possuem acesso irrestrito
  IF v_role = 'service_role' OR v_is_super THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- 1. Dados de Licença e Pagamento: NUNCA podem ser alterados pelo cliente
    IF NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura
       OR NEW.data_vencimento IS DISTINCT FROM OLD.data_vencimento
       OR NEW.valor_mensalidade IS DISTINCT FROM OLD.valor_mensalidade THEN
      RAISE EXCEPTION 'Violação de Segurança: apenas o sistema de faturamento ou o Super Admin podem alterar dados de licença.';
    END IF;

    -- 2. Dados Cadastrais: Apenas o Administrador da PRÓPRIA empresa pode alterar
    IF v_is_admin AND (OLD.id = v_minha_empresa) THEN
      -- Permitido ao administrador da empresa atualizar dados cadastrais e de contato
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Acesso negado: apenas o administrador titular do estabelecimento pode alterar dados cadastrais.';
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
-- PASSO 2: RPC SEGURA — ADMIN ATUALIZA DADOS DA SUA PRÓPRIA EMPRESA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atualizar_dados_minha_empresa(
  p_empresa_id uuid,
  p_nome_fantasia text,
  p_nome_exibicao text DEFAULT NULL,
  p_documento text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_email_contato text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_super boolean := public.is_super_admin();
  v_minha_empresa uuid := public.meu_empresa_id();
  v_nome_limpo text := trim(COALESCE(p_nome_fantasia, ''));
  v_exibicao_limpo text := NULLIF(trim(COALESCE(p_nome_exibicao, '')), '');
  v_doc_limpo text := NULLIF(regexp_replace(COALESCE(p_documento, ''), '\D', '', 'g'), '');
  v_tel_limpo text := NULLIF(regexp_replace(COALESCE(p_telefone, ''), '\D', '', 'g'), '');
  v_email_limpo text := NULLIF(lower(trim(COALESCE(p_email_contato, ''))), '');
  v_empresa_atualizada public.empresas%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada.';
  END IF;

  -- Validação de permissão: deve ser Super Admin ou Admin da respectiva empresa
  IF NOT v_is_super THEN
    IF NOT public.is_admin_workspace() OR p_empresa_id IS DISTINCT FROM v_minha_empresa THEN
      RAISE EXCEPTION 'Acesso negado: você só pode gerenciar os dados da sua própria empresa.';
    END IF;
  END IF;

  -- Validações básicas de integridade
  IF length(v_nome_limpo) < 3 THEN
    RAISE EXCEPTION 'O nome do estabelecimento deve ter no mínimo 3 caracteres.';
  END IF;

  IF v_exibicao_limpo IS NOT NULL AND length(v_exibicao_limpo) NOT BETWEEN 2 AND 40 THEN
    RAISE EXCEPTION 'O nome de exibição deve ter entre 2 e 40 caracteres.';
  END IF;

  UPDATE public.empresas
  SET
    nome_fantasia = v_nome_limpo,
    nome_exibicao = v_exibicao_limpo,
    documento = v_doc_limpo,
    telefone = v_tel_limpo,
    email_contato = v_email_limpo
  WHERE id = p_empresa_id
  RETURNING * INTO v_empresa_atualizada;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado.';
  END IF;

  RETURN jsonb_build_object(
    'id', v_empresa_atualizada.id,
    'nome_fantasia', v_empresa_atualizada.nome_fantasia,
    'nome_exibicao', v_empresa_atualizada.nome_exibicao,
    'documento', v_empresa_atualizada.documento,
    'telefone', v_empresa_atualizada.telefone,
    'email_contato', v_empresa_atualizada.email_contato
  );
END;
$$;

REVOKE ALL ON FUNCTION public.atualizar_dados_minha_empresa(uuid, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.atualizar_dados_minha_empresa(uuid, text, text, text, text, text) TO authenticated;
