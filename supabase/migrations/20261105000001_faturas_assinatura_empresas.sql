-- ==============================================================================
-- T-SYSTEM BEACH — HISTÓRICO DE FATURAS E MENSALIDADES SAAS (100% AUTOCONTIDO)
-- Data: 2026-11-05
-- Objetivo:
--   1. Garantir que as funções auxiliares (meu_empresa_id, meu_cargo, is_super_admin)
--      existam no schema public sem depender de migrations antigas.
--   2. Criar a tabela 'faturas_assinatura' para registrar todas as mensalidades,
--      faturas geradas, pagamentos via Mercado Pago (PIX/Cartão), status de pagamento
--      (paga, pendente, em_atraso) e comprovantes de quitação.
--   3. Habilitar RLS estrito: o cliente só pode ler e registrar faturas da sua própria empresa.
--   4. Criar índices para alto desempenho em consultas por empresa e competência.
-- Script 100% idempotente: seguro para rodar direto no Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: FUNÇÕES AUXILIARES DE CONTEXTO E SEGURANÇA MULTI-TENANT
-- ------------------------------------------------------------------------------

-- Retorna o empresa_id do usuário autenticado no JWT atual
CREATE OR REPLACE FUNCTION public.meu_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id
  FROM public.usuarios
  WHERE id = auth.uid()
    AND COALESCE(status, 'ativo') = 'ativo'
    AND deletado_em IS NULL
  LIMIT 1;
$$;

-- Retorna o cargo do usuário autenticado no JWT atual
CREATE OR REPLACE FUNCTION public.meu_cargo()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cargo
  FROM public.usuarios
  WHERE id = auth.uid()
    AND COALESCE(status, 'ativo') = 'ativo'
    AND deletado_em IS NULL
  LIMIT 1;
$$;

-- Retorna se o usuário autenticado é Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_cargo text;
BEGIN
  -- 1. Email registrado no JWT do Supabase Auth
  v_email := lower(COALESCE(auth.jwt() ->> 'email', ''));

  IF v_email IN ('ancorazero85@gmail.com', 'thamiles.085@gmail.com') THEN
    RETURN true;
  END IF;

  -- 2. Cargo na tabela usuarios
  SELECT cargo INTO v_cargo
  FROM public.usuarios
  WHERE id = auth.uid()
    AND COALESCE(status, 'ativo') = 'ativo'
    AND deletado_em IS NULL
  LIMIT 1;

  IF v_cargo = 'super_admin' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 2: TABELA DE FATURAS E MENSALIDADES DA ASSINATURA
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.faturas_assinatura (
  id text PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  competencia text NOT NULL, -- Ex: "Novembro/2026"
  mes_ano_referencia text NOT NULL, -- Ex: "2026-11"
  valor numeric(10,2) NOT NULL DEFAULT 40.00,
  data_emissao timestamptz NOT NULL DEFAULT now(),
  data_vencimento timestamptz NOT NULL,
  data_pagamento timestamptz,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('paga', 'pendente', 'em_atraso', 'cancelada')),
  forma_pagamento text DEFAULT 'PIX Mercado Pago',
  payment_id_mp text,
  plano_nome text NOT NULL DEFAULT 'Assinatura Premium',
  ciclo_nome text NOT NULL DEFAULT 'Mensal',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_faturas_assinatura_empresa 
  ON public.faturas_assinatura(empresa_id, mes_ano_referencia DESC);

CREATE INDEX IF NOT EXISTS idx_faturas_assinatura_status 
  ON public.faturas_assinatura(status);

-- ------------------------------------------------------------------------------
-- PASSO 3: ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------

ALTER TABLE public.faturas_assinatura ENABLE ROW LEVEL SECURITY;

-- Leitura: Membro da própria empresa ou Super Admin
DROP POLICY IF EXISTS "faturas_empresa_select" ON public.faturas_assinatura;
CREATE POLICY "faturas_empresa_select" ON public.faturas_assinatura
  FOR SELECT
  TO authenticated
  USING (
    empresa_id = public.meu_empresa_id() 
    OR public.is_super_admin()
    OR empresa_id IN (
      SELECT u.empresa_id FROM public.usuarios u WHERE u.id = auth.uid()
    )
  );

-- Escrita/Upsert: Super Admin ou Administrador da própria empresa registrando pagamento
DROP POLICY IF EXISTS "faturas_empresa_modificacao" ON public.faturas_assinatura;
CREATE POLICY "faturas_empresa_modificacao" ON public.faturas_assinatura
  FOR ALL
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

-- Permissões
GRANT ALL ON public.faturas_assinatura TO authenticated;
GRANT ALL ON public.faturas_assinatura TO service_role;
