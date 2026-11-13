-- ==============================================================================
-- MIGRATION: Conta Padrão por Estabelecimento e Roteamento de Vendas das Mesas
-- Data: 2026-11-13
-- Objetivos:
--   1. Adicionar coluna `conta_id` em `public.vendas` referenciando `contas_financeiras`
--   2. Garantir no máximo 1 conta ativa marcada como `padrao = true` por estabelecimento
--   3. Trigger BEFORE INSERT em `vendas` (SECURITY DEFINER) para vincular
--      automaticamente toda venda de mesa à conta padrão vigente (sem expor contas a garçons)
--   4. RPC atômica `definir_conta_financeira_padrao(p_conta_id)` com blindagem multi-tenant
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. VÍNCULO DE CONTA NA TABELA DE VENDAS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.vendas
  ADD COLUMN IF NOT EXISTS conta_id uuid REFERENCES public.contas_financeiras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vendas_empresa_conta
  ON public.vendas (empresa_id, conta_id);

-- ------------------------------------------------------------------------------
-- 2. NORMALIZAR E GARANTIR UNICIDADE DE CONTA PADRÃO POR EMPRESA
-- ------------------------------------------------------------------------------
UPDATE public.contas_financeiras
SET padrao = false
WHERE padrao = true
  AND (deletado_em IS NOT NULL OR ativo = false);

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY empresa_id
      ORDER BY padrao DESC, created_at ASC, id ASC
    ) AS rn
  FROM public.contas_financeiras
  WHERE deletado_em IS NULL
    AND ativo = true
)
UPDATE public.contas_financeiras c
SET padrao = (r.rn = 1)
FROM ranked r
WHERE c.id = r.id
  AND c.padrao IS DISTINCT FROM (r.rn = 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_contas_financeiras_padrao_empresa
  ON public.contas_financeiras (empresa_id)
  WHERE padrao = true AND deletado_em IS NULL AND ativo = true;

-- ------------------------------------------------------------------------------
-- 3. TRIGGER BEFORE INSERT EM `vendas` -> VINCULA CONTA PADRÃO VIGENTE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_vendas_atribuir_conta_padrao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta_valida uuid;
BEGIN
  IF NEW.empresa_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Caso venha uma conta explícita, valida se pertence ao mesmo estabelecimento
  IF NEW.conta_id IS NOT NULL THEN
    SELECT c.id INTO v_conta_valida
    FROM public.contas_financeiras c
    WHERE c.id = NEW.conta_id
      AND c.empresa_id = NEW.empresa_id
      AND c.deletado_em IS NULL
    LIMIT 1;

    IF v_conta_valida IS NOT NULL THEN
      NEW.conta_id := v_conta_valida;
      RETURN NEW;
    END IF;
  END IF;

  -- Caso contrário (fechamento padrão de mesa no salão), vincula à conta padrão vigente
  SELECT c.id INTO v_conta_valida
  FROM public.contas_financeiras c
  WHERE c.empresa_id = NEW.empresa_id
    AND c.deletado_em IS NULL
    AND c.ativo = true
  ORDER BY c.padrao DESC, c.created_at ASC, c.id ASC
  LIMIT 1;

  NEW.conta_id := v_conta_valida;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_vendas_atribuir_conta_padrao ON public.vendas;
CREATE TRIGGER tr_vendas_atribuir_conta_padrao
  BEFORE INSERT ON public.vendas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_vendas_atribuir_conta_padrao();

-- ------------------------------------------------------------------------------
-- 4. RPC ATÔMICA: DEFINIR QUAL CONTA RECEBERÁ AS VENDAS DAS MESAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.definir_conta_financeira_padrao(
  p_conta_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conta public.contas_financeiras%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.';
  END IF;

  SELECT * INTO v_conta
  FROM public.contas_financeiras
  WHERE id = p_conta_id
    AND deletado_em IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conta financeira não encontrada.';
  END IF;

  IF NOT public.is_super_admin() THEN
    IF v_conta.empresa_id IS DISTINCT FROM public.meu_empresa_id()
       OR NOT public.is_admin_workspace() THEN
      RAISE EXCEPTION 'Acesso negado à configuração de contas deste estabelecimento.';
    END IF;
    IF NOT public.auth_assinatura_ativa() THEN
      RAISE EXCEPTION 'Assinatura inativa para alterar a conta padrão.';
    END IF;
  END IF;

  -- Lock em todas as contas ativas do estabelecimento para troca atômica sem colisão
  PERFORM id
  FROM public.contas_financeiras
  WHERE empresa_id = v_conta.empresa_id
    AND deletado_em IS NULL
  FOR UPDATE;

  UPDATE public.contas_financeiras
  SET padrao = false
  WHERE empresa_id = v_conta.empresa_id
    AND deletado_em IS NULL
    AND padrao = true
    AND id <> p_conta_id;

  UPDATE public.contas_financeiras
  SET padrao = true,
      ativo = true
  WHERE id = p_conta_id;

  RETURN jsonb_build_object(
    'conta_id', p_conta_id,
    'nome', v_conta.nome,
    'empresa_id', v_conta.empresa_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.definir_conta_financeira_padrao(uuid) TO authenticated;
