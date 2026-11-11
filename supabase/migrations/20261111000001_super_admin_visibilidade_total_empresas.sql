-- ==============================================================================
-- T-SYSTEM BEACH — SUPER ADMIN: VISIBILIDADE TOTAL E CORREÇÃO DE LOGIN (SEM RECURSÃO RLS)
--                  (100% AUTOCONTIDO, ZERO-TRUST & ENTERPRISE MULTI-TENANT)
-- Data: 2026-11-11
-- Objetivo:
--   1. Eliminar a recursão infinita de RLS (erro 42P17) na tabela public.usuarios
--      que impedia a leitura do perfil após o login e causava a mensagem
--      "Credenciais inválidas. Verifique seu e-mail e senha." no Login.
--   2. Incluir de forma autocontida as funções auxiliares SECURITY DEFINER:
--      meu_empresa_id(), meu_cargo(), is_super_admin(), is_admin_workspace().
--   3. Garantir que o Super Admin veja todos os estabelecimentos (incluindo BARRACA CORAL)
--      e clientes comuns vejam apenas o próprio estabelecimento.
--   4. Disponibilizar as RPCs enterprise 'super_admin_listar_estabelecimentos' e
--      'super_admin_listar_usuarios_empresa'.
-- Script 100% idempotente: seguro para executar direto no Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: FUNÇÕES AUXILIARES DE CONTEXTO E SEGURANÇA (SECURITY DEFINER = BYPASS RLS)
-- Importante: Toda consulta a public.usuarios é feita exclusivamente dentro destas
-- funções SECURITY DEFINER para jamais gerar recursão nas políticas RLS.
-- ------------------------------------------------------------------------------

-- 1.1 Retorna o empresa_id do usuário autenticado (por UID ou fallback por e-mail do JWT)
CREATE OR REPLACE FUNCTION public.meu_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_emp_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT empresa_id INTO v_emp_id
  FROM public.usuarios
  WHERE id = v_uid
    AND COALESCE(status, 'ativo') = 'ativo'
    AND deletado_em IS NULL
  LIMIT 1;

  IF v_emp_id IS NOT NULL THEN
    RETURN v_emp_id;
  END IF;

  v_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email <> '' THEN
    SELECT empresa_id INTO v_emp_id
    FROM public.usuarios
    WHERE lower(trim(email)) = v_email
      AND COALESCE(status, 'ativo') = 'ativo'
      AND deletado_em IS NULL
    LIMIT 1;
  END IF;

  RETURN v_emp_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.meu_empresa_id() TO authenticated, anon;

-- 1.2 Retorna o cargo do usuário autenticado (por UID ou fallback por e-mail do JWT)
CREATE OR REPLACE FUNCTION public.meu_cargo()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_cargo text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT cargo INTO v_cargo
  FROM public.usuarios
  WHERE id = v_uid
    AND COALESCE(status, 'ativo') = 'ativo'
    AND deletado_em IS NULL
  LIMIT 1;

  IF v_cargo IS NOT NULL THEN
    RETURN v_cargo;
  END IF;

  v_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email <> '' THEN
    SELECT cargo INTO v_cargo
    FROM public.usuarios
    WHERE lower(trim(email)) = v_email
      AND COALESCE(status, 'ativo') = 'ativo'
      AND deletado_em IS NULL
    LIMIT 1;
  END IF;

  RETURN v_cargo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.meu_cargo() TO authenticated, anon;

-- 1.3 Verifica se o usuário é Super Admin (Zero-Trust por e-mail e cargo)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_cargo text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- 1. E-mail oficial único de Super Admin
  v_email := lower(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email = 'ancorazero85@gmail.com' THEN
    RETURN true;
  END IF;

  -- 2. Cargo no user_metadata do token JWT
  IF lower(COALESCE(auth.jwt() -> 'user_metadata' ->> 'cargo', '')) = 'super_admin' THEN
    RETURN true;
  END IF;

  -- 3. Cargo na tabela public.usuarios (via função SECURITY DEFINER sem recursão)
  v_cargo := public.meu_cargo();
  IF v_cargo = 'super_admin' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

-- 1.4 Verifica se o usuário é Administrador de Workspace ou Super Admin
CREATE OR REPLACE FUNCTION public.is_admin_workspace()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  RETURN COALESCE(public.meu_cargo() IN ('admin', 'super_admin'), false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_workspace() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- PASSO 2: POLÍTICAS DE RLS NA TABELA PUBLIC.EMPRESAS (LIVRES DE SUBQUERIES RECURSIVAS)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_empresas_select" ON public.empresas;
DROP POLICY IF EXISTS "rls_empresas_insert" ON public.empresas;
DROP POLICY IF EXISTS "rls_empresas_update" ON public.empresas;
DROP POLICY IF EXISTS "rls_empresas_delete" ON public.empresas;
DROP POLICY IF EXISTS "Enable read access for authenticated users based on company" ON public.empresas;
DROP POLICY IF EXISTS "empresas_tenant_isolation" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_policy" ON public.empresas;

-- LEITURA: Super Admin vê TODAS as empresas. Clientes veem somente a sua empresa.
CREATE POLICY "rls_empresas_select" ON public.empresas
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR id = public.meu_empresa_id()
  );

-- INSERÇÃO: Super Admin ou Onboarding do sistema
CREATE POLICY "rls_empresas_insert" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (current_setting('request.jwt.claim.role', true) = 'service_role')
  );

-- ATUALIZAÇÃO: Super Admin ou Administrador titular
CREATE POLICY "rls_empresas_update" ON public.empresas
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      id = public.meu_empresa_id()
      AND public.is_admin_workspace()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      id = public.meu_empresa_id()
      AND public.is_admin_workspace()
    )
  );

-- EXCLUSÃO: Exclusivo do Super Admin
CREATE POLICY "rls_empresas_delete" ON public.empresas
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ------------------------------------------------------------------------------
-- PASSO 3: POLÍTICAS DE RLS NA TABELA PUBLIC.USUARIOS (SEM SUBQUERY INLINE = ZERO RECURSÃO)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_usuarios_select" ON public.usuarios;
DROP POLICY IF EXISTS "rls_usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "rls_usuarios_update" ON public.usuarios;
DROP POLICY IF EXISTS "rls_usuarios_delete" ON public.usuarios;

-- LEITURA: Super Admin vê todos; usuário vê seu próprio registro (por ID ou e-mail JWT) e colegas da mesma empresa.
CREATE POLICY "rls_usuarios_select" ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR lower(trim(COALESCE(email, ''))) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR empresa_id = public.meu_empresa_id()
    OR public.is_super_admin()
  );

-- INSERÇÃO: Super Admin ou Administrador cadastrando na sua própria empresa
CREATE POLICY "rls_usuarios_insert" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_super_admin()
    OR (
      empresa_id = public.meu_empresa_id()
      AND public.is_admin_workspace()
    )
    OR (current_setting('request.jwt.claim.role', true) = 'service_role')
  );

-- ATUALIZAÇÃO: Super Admin, Administrador da empresa ou próprio usuário
CREATE POLICY "rls_usuarios_update" ON public.usuarios
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
    OR (
      empresa_id = public.meu_empresa_id()
      AND public.is_admin_workspace()
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR id = auth.uid()
    OR (
      empresa_id = public.meu_empresa_id()
      AND public.is_admin_workspace()
    )
  );

-- EXCLUSÃO: Super Admin ou Administrador titular
CREATE POLICY "rls_usuarios_delete" ON public.usuarios
  FOR DELETE TO authenticated
  USING (
    public.is_super_admin()
    OR (
      empresa_id = public.meu_empresa_id()
      AND public.is_admin_workspace()
    )
  );

-- ------------------------------------------------------------------------------
-- PASSO 4: RPC ENTERPRISE — LISTAGEM TOTAL DE ESTABELECIMENTOS PARA O COMMAND CENTER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.super_admin_listar_estabelecimentos()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_jwt_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_is_super boolean;
  v_estabelecimentos jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado. Faça login no sistema para continuar.';
  END IF;

  v_is_super := (
    v_jwt_email = 'ancorazero85@gmail.com'
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = v_user_id AND cargo = 'super_admin'
    )
  );

  IF NOT v_is_super THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode listar todos os estabelecimentos.';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'nome_fantasia', e.nome_fantasia,
        'status_assinatura', COALESCE(e.status_assinatura, 'ativa'),
        'data_vencimento', e.data_vencimento,
        'created_at', e.created_at,
        'valor_mensalidade', COALESCE(e.valor_mensalidade, 149.90),
        'plano_nome', COALESCE(e.plano_nome, 'Assinatura Premium'),
        'ciclo_cobranca', COALESCE(e.ciclo_cobranca, 'mensal'),
        'documento', e.documento,
        'telefone', e.telefone,
        'nome_exibicao', e.nome_exibicao,
        'email_contato', e.email_contato,
        'total_usuarios', (
          SELECT COUNT(*)
          FROM public.usuarios u
          WHERE u.empresa_id = e.id
            AND u.deletado_em IS NULL
        )
      ) ORDER BY e.nome_fantasia ASC
    ),
    '[]'::jsonb
  ) INTO v_estabelecimentos
  FROM public.empresas e;

  RETURN v_estabelecimentos;
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_listar_estabelecimentos() TO authenticated;

-- ------------------------------------------------------------------------------
-- PASSO 5: RPC ENTERPRISE — LISTAGEM DE USUÁRIOS DE QUALQUER ESTABELECIMENTO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.super_admin_listar_usuarios_empresa(p_empresa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_jwt_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_is_super boolean;
  v_usuarios jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado.';
  END IF;

  v_is_super := (
    v_jwt_email = 'ancorazero85@gmail.com'
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = v_user_id AND cargo = 'super_admin'
    )
  );

  IF NOT v_is_super THEN
    RAISE EXCEPTION 'Acesso negado: privilégios insuficientes.';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'nome', u.nome,
        'avatar', u.avatar,
        'cargo', u.cargo,
        'status', COALESCE(u.status, 'ativo'),
        'email', u.email,
        'telefone', u.telefone,
        'empresa_id', u.empresa_id
      ) ORDER BY (u.cargo = 'admin') DESC, u.nome ASC
    ),
    '[]'::jsonb
  ) INTO v_usuarios
  FROM public.usuarios u
  WHERE u.empresa_id = p_empresa_id
    AND u.deletado_em IS NULL;

  RETURN v_usuarios;
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_listar_usuarios_empresa(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- PASSO 6: SINCRONIZAÇÃO AUTOMÁTICA DO ID DE AUTH.USERS COM PUBLIC.USUARIOS
-- Garante que o ID de ancorazero85@gmail.com em public.usuarios seja idêntico ao de auth.users
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_auth_id uuid;
  v_old_id uuid;
BEGIN
  SELECT id INTO v_auth_id
  FROM auth.users
  WHERE lower(email) = 'ancorazero85@gmail.com'
  LIMIT 1;

  SELECT id INTO v_old_id
  FROM public.usuarios
  WHERE lower(trim(email)) = 'ancorazero85@gmail.com'
  LIMIT 1;

  IF v_auth_id IS NOT NULL AND v_old_id IS NOT NULL AND v_auth_id <> v_old_id THEN
    UPDATE public.usuarios
    SET id = v_auth_id, cargo = 'super_admin', status = 'ativo', deletado_em = NULL
    WHERE id = v_old_id;
  ELSIF v_old_id IS NOT NULL THEN
    UPDATE public.usuarios
    SET cargo = 'super_admin', status = 'ativo', deletado_em = NULL
    WHERE id = v_old_id;
  END IF;
END $$;
