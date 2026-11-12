-- ==============================================================================
-- Migration: Bloquear exclusão via API/Painel de faturas já pagas
-- ==============================================================================
-- Garante que faturas com status = 'paga' (confirmadas via PIX) não possam ser
-- apagadas pela aplicação ou API autenticada (RLS), permitindo remoção apenas
-- diretamente pelo banco de dados (SQL Editor / service_role).

DROP POLICY IF EXISTS "faturas_empresa_modificacao" ON public.faturas_assinatura;
DROP POLICY IF EXISTS "faturas_empresa_insert" ON public.faturas_assinatura;
DROP POLICY IF EXISTS "faturas_empresa_update" ON public.faturas_assinatura;
DROP POLICY IF EXISTS "faturas_empresa_delete" ON public.faturas_assinatura;

CREATE POLICY "faturas_empresa_insert" ON public.faturas_assinatura
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR empresa_id = public.meu_empresa_id()
    OR empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "faturas_empresa_update" ON public.faturas_assinatura
  FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin()
    OR empresa_id = public.meu_empresa_id()
    OR empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR empresa_id = public.meu_empresa_id()
    OR empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "faturas_empresa_delete" ON public.faturas_assinatura
  FOR DELETE
  TO authenticated
  USING (
    status <> 'paga'
    AND (
      public.is_super_admin()
      OR empresa_id = public.meu_empresa_id()
      OR empresa_id IN (
        SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()
      )
    )
  );
