-- ==============================================================================
-- REMOÇÃO DEFINITIVA DA FUNCIONALIDADE LEGADA DE METAS FINANCEIRAS
-- Remove políticas RLS e a tabela public.metas_financeiras do banco de dados.
-- ==============================================================================

DROP POLICY IF EXISTS "rls_metas_select" ON public.metas_financeiras;
DROP POLICY IF EXISTS "rls_metas_write" ON public.metas_financeiras;
DROP TABLE IF EXISTS public.metas_financeiras CASCADE;
