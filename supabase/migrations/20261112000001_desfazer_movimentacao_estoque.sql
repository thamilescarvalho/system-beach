-- ==============================================================================
-- T-SYSTEM BEACH — DESFAZER / EXCLUIR LANÇAMENTO DE ESTOQUE (ADMIN)
-- Data: 2026-11-12
-- Objetivo:
--   1. Permitir que Administradores do estabelecimento (ou Super Admin) possam
--      desfazer/excluir um lançamento de compra ou ajuste de inventário no estoque.
--   2. Criar a RPC atômica `public.desfazer_movimentacao_estoque(p_historico_id uuid)`
--      que reverte o saldo do produto (nunca abaixo de zero) e remove o registro
--      da tabela `public.historico_estoque` na mesma transação.
--   3. Habilitar política RLS de DELETE na tabela `public.historico_estoque`
--      restrita a Administradores da própria empresa com assinatura ativa.
-- Script 100% idempotente: seguro para executar direto no Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: POLÍTICA RLS DE EXCLUSÃO EM HISTORICO_ESTOQUE (SOMENTE ADMIN)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.historico_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_hist_estoque_delete" ON public.historico_estoque;
CREATE POLICY "rls_hist_estoque_delete" ON public.historico_estoque
  FOR DELETE TO authenticated
  USING (
    (
      empresa_id = public.meu_empresa_id()
      AND public.is_admin_workspace()
      AND public.assinatura_empresa_ativa(empresa_id)
    )
    OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- PASSO 2: RPC ATÔMICA — DESFAZER E EXCLUIR MOVIMENTAÇÃO DE ESTOQUE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desfazer_movimentacao_estoque(
  p_historico_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid := public.meu_empresa_id();
  v_is_super boolean := public.is_super_admin();
  v_is_admin boolean := public.is_admin_workspace();
  v_mov record;
  v_novo_estoque integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada.';
  END IF;

  IF NOT v_is_admin AND NOT v_is_super THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem desfazer movimentações de estoque.';
  END IF;

  SELECT id, produto_id, produto_nome, tipo, quantidade, empresa_id
    INTO v_mov
  FROM public.historico_estoque
  WHERE id = p_historico_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movimentação de estoque não encontrada.';
  END IF;

  IF NOT v_is_super AND v_mov.empresa_id IS DISTINCT FROM v_empresa_id THEN
    RAISE EXCEPTION 'Violação Multi-Tenant: você só pode desfazer movimentações da sua própria empresa.';
  END IF;

  IF NOT v_is_super AND NOT public.assinatura_empresa_ativa(v_mov.empresa_id) THEN
    RAISE EXCEPTION 'Assinatura inativa: regularize seu plano para realizar alterações de estoque.';
  END IF;

  -- Reverte o impacto da movimentação no saldo do produto (sem deixar negativo)
  UPDATE public.produtos
  SET estoque = GREATEST(0, COALESCE(estoque, 0) - COALESCE(v_mov.quantidade, 0))
  WHERE id = v_mov.produto_id
    AND empresa_id = v_mov.empresa_id
  RETURNING estoque INTO v_novo_estoque;

  -- Remove o lançamento do histórico
  DELETE FROM public.historico_estoque
  WHERE id = p_historico_id
    AND empresa_id = v_mov.empresa_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'id_excluido', p_historico_id,
    'produto_id', v_mov.produto_id,
    'novo_estoque', COALESCE(v_novo_estoque, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.desfazer_movimentacao_estoque(uuid) TO authenticated;
