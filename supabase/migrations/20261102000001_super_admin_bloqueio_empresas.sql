-- ==============================================================================
-- T-SYSTEM BEACH — SUPER ADMIN: BLOQUEIO / DESBLOQUEIO DE ESTABELECIMENTOS
--                  E CRIAÇÃO ATÔMICA DE USUÁRIOS (SEM DEPENDÊNCIA DE EDGE FUNCTION)
-- Data: 2026-11-02
-- Objetivo:
--   1. Garantir que as colunas e funções auxiliares existam de forma 100% autocontida.
--   2. Criar public.meu_cargo() e public.is_super_admin() com validação Zero-Trust
--      (email do JWT 'ancorazero85@gmail.com' + cargo na tabela public.usuarios).
--   3. Criar a RPC segura "super_admin_alternar_bloqueio_empresa" (SECURITY DEFINER)
--      para suspender ou liberar estabelecimentos com efeito imediato.
--   4. Atualizar a trigger de proteção da tabela empresas para permitir alterações
--      legítimas do Super Admin sem falso-positivo de segurança.
--   5. Criar a RPC "admin_criar_usuario_estabelecimento" (SECURITY DEFINER) para
--      cadastrar usuários no Supabase Auth e na tabela usuarios atomicamente,
--      resolvendo definitivamente os erros "Edge Function returned a non-2xx status code"
--      e "Token inválido".
-- Script 100% idempotente: seguro para rodar no Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: EXTENSÕES E GARANTIA DE COLUNAS EM USUARIOS E EMPRESAS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE IF EXISTS public.usuarios
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS deletado_em timestamptz;

ALTER TABLE IF EXISTS public.empresas
  ADD COLUMN IF NOT EXISTS status_assinatura text DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS data_vencimento timestamptz,
  ADD COLUMN IF NOT EXISTS valor_mensalidade numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ciclo_cobranca text DEFAULT 'mensal';

-- ------------------------------------------------------------------------------
-- PASSO 2: FUNÇÃO AUXILIAR meu_cargo()
-- ------------------------------------------------------------------------------
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
  LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 3: FUNÇÃO is_super_admin() (AUTOCONTIDA E ZERO-TRUST)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (lower(COALESCE(auth.jwt() ->> 'email', '')) = 'ancorazero85@gmail.com')
    OR (public.meu_cargo() = 'super_admin')
    OR EXISTS (
      SELECT 1
      FROM public.usuarios
      WHERE id = auth.uid()
        AND cargo = 'super_admin'
        AND COALESCE(status, 'ativo') = 'ativo'
    ),
    false
  );
$$;

-- ------------------------------------------------------------------------------
-- PASSO 4: RPC ATÔMICA — ALTERNAR BLOQUEIO / DESBLOQUEIO DE EMPRESA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.super_admin_alternar_bloqueio_empresa(
  p_empresa_id uuid,
  p_novo_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_jwt_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_empresa public.empresas%ROWTYPE;
  v_status_alvo text;
  v_is_super boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada.';
  END IF;

  -- Validação Zero-Trust de privilégio Super Admin
  v_is_super := (
    v_jwt_email = 'ancorazero85@gmail.com'
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = v_user_id AND cargo = 'super_admin'
    )
  );

  IF NOT v_is_super THEN
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode alterar o bloqueio de estabelecimentos.';
  END IF;

  SELECT * INTO v_empresa
  FROM public.empresas
  WHERE id = p_empresa_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado.';
  END IF;

  -- Determina o novo status alvo
  IF p_novo_status IS NOT NULL AND p_novo_status IN ('ativa', 'bloqueada', 'inadimplente', 'degustacao', 'pendente') THEN
    v_status_alvo := p_novo_status;
  ELSE
    IF v_empresa.status_assinatura IN ('bloqueada', 'inadimplente') THEN
      v_status_alvo := 'ativa';
    ELSE
      v_status_alvo := 'bloqueada';
    END IF;
  END IF;

  -- Aplica a alteração com efeito imediato
  UPDATE public.empresas
  SET status_assinatura = v_status_alvo
  WHERE id = p_empresa_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'empresa_id', p_empresa_id,
    'novo_status', v_status_alvo,
    'status_anterior', v_empresa.status_assinatura
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 5: RPC PARA ATUALIZAR STATUS E LICENÇA COMPLETA VIA SUPER ADMIN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.super_admin_atualizar_licenca_empresa(
  p_empresa_id uuid,
  p_status_assinatura text,
  p_ciclo_cobranca text DEFAULT 'mensal',
  p_data_vencimento timestamptz DEFAULT NULL,
  p_valor_mensalidade numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_jwt_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_is_super boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada.';
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
    RAISE EXCEPTION 'Acesso negado: apenas o Super Admin pode atualizar a licença.';
  END IF;

  UPDATE public.empresas
  SET
    status_assinatura = p_status_assinatura,
    ciclo_cobranca = COALESCE(p_ciclo_cobranca, ciclo_cobranca),
    data_vencimento = p_data_vencimento,
    valor_mensalidade = COALESCE(p_valor_mensalidade, valor_mensalidade)
  WHERE id = p_empresa_id;

  RETURN jsonb_build_object('sucesso', true, 'empresa_id', p_empresa_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 6: TRIGGER DE PROTEÇÃO CONTRA ESCALADA DE PRIVILÉGIOS EM EMPRESAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_licenca_empresas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
  v_jwt_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
BEGIN
  -- Permite se for service_role, email oficial do Super Admin ou is_super_admin()
  IF v_role = 'service_role' OR v_jwt_email = 'ancorazero85@gmail.com' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status_assinatura IS DISTINCT FROM OLD.status_assinatura
       OR NEW.data_vencimento IS DISTINCT FROM OLD.data_vencimento
       OR NEW.valor_mensalidade IS DISTINCT FROM OLD.valor_mensalidade THEN
      RAISE EXCEPTION 'Violação de Segurança: apenas o sistema de faturamento ou o Super Admin podem alterar dados de licença.';
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
-- PASSO 7: RPC NATIVA PARA CRIAR USUÁRIOS COM CREDENCIAIS COMPLETAS (AUTH + USUARIOS)
--          (Resolve de forma definitiva sem depender de Edge Function externa)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_criar_usuario_estabelecimento(
  p_email text,
  p_senha text,
  p_nome text,
  p_cargo text DEFAULT 'garcom',
  p_avatar text DEFAULT '👤',
  p_empresa_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_email text := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_caller_cargo text;
  v_caller_empresa_id uuid;
  v_email text := lower(trim(p_email));
  v_target_empresa_id uuid;
  v_cargo_final text;
  v_avatar_final text;
  v_user_id uuid;
  v_is_super boolean;
  v_is_admin boolean;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada. Faça login novamente.';
  END IF;

  -- 1. Identifica o perfil do usuário que está chamando a função
  SELECT cargo, empresa_id INTO v_caller_cargo, v_caller_empresa_id
  FROM public.usuarios
  WHERE id = v_caller_id
    AND COALESCE(status, 'ativo') = 'ativo';

  v_is_super := (
    v_caller_email = 'ancorazero85@gmail.com'
    OR v_caller_cargo = 'super_admin'
    OR public.is_super_admin()
  );

  v_is_admin := (
    v_is_super
    OR (v_caller_cargo = 'admin' AND v_caller_empresa_id IS NOT NULL)
  );

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: apenas Administradores ou Super Admin podem cadastrar colaboradores.';
  END IF;

  -- 2. Define a empresa alvo
  IF v_is_super THEN
    v_target_empresa_id := COALESCE(p_empresa_id, v_caller_empresa_id);
  ELSE
    v_target_empresa_id := v_caller_empresa_id;
  END IF;

  IF v_target_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Identificador do estabelecimento (empresa_id) é obrigatório.';
  END IF;

  -- 3. Validações dos dados
  IF length(trim(p_nome)) < 3 THEN
    RAISE EXCEPTION 'O nome deve ter no mínimo 3 caracteres.';
  END IF;

  IF v_email NOT LIKE '%@%.%' OR length(v_email) < 5 THEN
    RAISE EXCEPTION 'Informe um e-mail válido.';
  END IF;

  IF length(trim(p_senha)) < 6 THEN
    RAISE EXCEPTION 'A senha deve conter no mínimo 6 caracteres.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado no sistema.';
  END IF;

  v_cargo_final := CASE WHEN p_cargo = 'admin' THEN 'admin' ELSE 'garcom' END;
  v_avatar_final := COALESCE(NULLIF(trim(p_avatar), ''), CASE WHEN v_cargo_final = 'admin' THEN '👑' ELSE '👤' END);

  -- 4. Criação atômica no auth.users
  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_senha, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'empresa_id', v_target_empresa_id,
      'cargo', v_cargo_final,
      'nome', trim(p_nome)
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 5. Criação no auth.identities para permitir login imediato por senha
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  -- 6. Criação do perfil na tabela pública
  INSERT INTO public.usuarios (
    id,
    nome,
    email,
    cargo,
    status,
    avatar,
    empresa_id
  ) VALUES (
    v_user_id,
    trim(p_nome),
    v_email,
    v_cargo_final,
    'ativo',
    v_avatar_final,
    v_target_empresa_id
  );

  RETURN jsonb_build_object(
    'sucesso', true,
    'user_id', v_user_id,
    'email', v_email,
    'nome', trim(p_nome),
    'cargo', v_cargo_final,
    'empresa_id', v_target_empresa_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 8: CONCESSÃO DE PERMISSÕES
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.meu_cargo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_alternar_bloqueio_empresa(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.super_admin_atualizar_licenca_empresa(uuid, text, text, timestamptz, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_criar_usuario_estabelecimento(text, text, text, text, text, uuid) TO authenticated;
