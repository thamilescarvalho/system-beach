-- ==============================================================================
-- T-SYSTEM BEACH — GESTÃO COMPLETA E ATÔMICA DE USUÁRIOS NO SUPABASE AUTH & DB
-- Data: 2026-11-12
-- Objetivo:
--   1. admin_criar_usuario_estabelecimento:
--      Cria atomicamente no auth.users (com senha criptografada), auth.identities
--      e public.usuarios sem depender de Edge Function externa.
--   2. admin_atualizar_usuario_estabelecimento:
--      Atualiza atomicamente nome, cargo, avatar, status E E-MAIL no public.usuarios,
--      no auth.users (email_confirmed_at mantido) e no auth.identities.
--      Garante que o link de Reset de Senha chegue no NOVO e-mail cadastrado!
--   3. admin_excluir_usuario_estabelecimento:
--      Aplica soft-delete e bane o acesso no auth.users sem deixar sessões ativas.
--   4. Sincronização Retroativa Automática:
--      Corrige imediatamente qualquer usuário que já teve o e-mail alterado em
--      public.usuarios para que reflita no Authentication > Users (auth.users).
-- Script 100% idempotente: seguro para rodar direto no Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: EXTENSÃO DE CRIPTOGRAFIA E ACESSO AOS SCHEMAS
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- PASSO 2: RPC ATÔMICA — CRIAR USUÁRIO (AUTH + BANCO)
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
  v_role_anterior text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada. Faça login novamente.';
  END IF;

  SELECT cargo, empresa_id INTO v_caller_cargo, v_caller_empresa_id
  FROM public.usuarios
  WHERE id = v_caller_id
    AND COALESCE(status, 'ativo') = 'ativo'
    AND deletado_em IS NULL
  LIMIT 1;

  v_is_super := (
    v_caller_email IN ('ancorazero85@gmail.com', 'thamiles.085@gmail.com')
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

  IF v_is_super THEN
    v_target_empresa_id := COALESCE(p_empresa_id, v_caller_empresa_id);
  ELSE
    v_target_empresa_id := v_caller_empresa_id;
  END IF;

  IF v_target_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Identificador do estabelecimento (empresa_id) é obrigatório.';
  END IF;

  IF length(trim(COALESCE(p_nome, ''))) < 3 THEN
    RAISE EXCEPTION 'O nome deve ter no mínimo 3 caracteres.';
  END IF;

  IF v_email NOT LIKE '%@%.%' OR length(v_email) < 5 THEN
    RAISE EXCEPTION 'Informe um e-mail corporativo válido.';
  END IF;

  IF length(trim(COALESCE(p_senha, ''))) < 6 THEN
    RAISE EXCEPTION 'A senha deve conter no mínimo 6 caracteres.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado no sistema.';
  END IF;

  v_cargo_final := CASE WHEN p_cargo = 'admin' THEN 'admin' ELSE 'garcom' END;
  v_avatar_final := COALESCE(NULLIF(trim(p_avatar), ''), CASE WHEN v_cargo_final = 'admin' THEN '👑' ELSE '👤' END);

  v_user_id := gen_random_uuid();

  -- 1. Cria em auth.users com senha criptografada via bcrypt
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    v_email, extensions.crypt(p_senha, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('empresa_id', v_target_empresa_id, 'cargo', v_cargo_final, 'nome', trim(p_nome)),
    now(), now(), '', '', '', ''
  );

  -- 2. Cria em auth.identities para permitir login imediato por senha
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- 3. Cria na tabela pública de usuarios com elevação de contexto
  v_role_anterior := current_setting('request.jwt.claim.role', true);
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  INSERT INTO public.usuarios (id, nome, email, cargo, status, avatar, empresa_id)
  VALUES (v_user_id, trim(p_nome), v_email, v_cargo_final, 'ativo', v_avatar_final, v_target_empresa_id);

  PERFORM set_config('request.jwt.claim.role', COALESCE(v_role_anterior, 'authenticated'), true);

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
-- PASSO 3: RPC ATÔMICA — ATUALIZAR USUÁRIO (AUTH.USERS + PUBLIC.USUARIOS)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_atualizar_usuario_estabelecimento(
  p_usuario_id uuid,
  p_nome text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_cargo text DEFAULT NULL,
  p_avatar text DEFAULT NULL,
  p_status text DEFAULT NULL
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
  v_alvo public.usuarios%ROWTYPE;
  v_is_super boolean;
  v_is_admin boolean;
  v_email_limpo text;
  v_cargo_final text;
  v_role_anterior text;
  v_auth_linhas integer := 0;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada. Faça login novamente.';
  END IF;

  SELECT * INTO v_alvo
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  SELECT cargo, empresa_id INTO v_caller_cargo, v_caller_empresa_id
  FROM public.usuarios
  WHERE id = v_caller_id
    AND COALESCE(status, 'ativo') = 'ativo'
    AND deletado_em IS NULL
  LIMIT 1;

  v_is_super := (
    v_caller_email IN ('ancorazero85@gmail.com', 'thamiles.085@gmail.com')
    OR v_caller_cargo = 'super_admin'
    OR public.is_super_admin()
  );

  v_is_admin := (
    v_is_super
    OR (v_caller_cargo = 'admin' AND v_caller_empresa_id IS NOT NULL AND v_caller_empresa_id = v_alvo.empresa_id)
  );

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para gerenciar colaboradores deste estabelecimento.';
  END IF;

  IF v_alvo.cargo = 'super_admin' AND NOT v_is_super THEN
    RAISE EXCEPTION 'Acesso negado: contas Super Admin são protegidas contra alteração externa.';
  END IF;

  -- 1. Sincronização obrigatória do E-MAIL em auth.users e auth.identities
  IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
    v_email_limpo := lower(trim(p_email));

    IF v_email_limpo NOT LIKE '%@%.%' OR length(v_email_limpo) < 5 THEN
      RAISE EXCEPTION 'Informe um endereço de e-mail corporativo válido.';
    END IF;

    -- Valida se o novo e-mail não pertence a outro usuário cadastrado
    IF EXISTS (
      SELECT 1 FROM auth.users 
      WHERE lower(email) = v_email_limpo AND id <> p_usuario_id
    ) THEN
      RAISE EXCEPTION 'Este endereço de e-mail já está em uso por outro usuário.';
    END IF;

    -- Atualiza diretamente em auth.users
    UPDATE auth.users
    SET
      email = v_email_limpo,
      email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_confirm_status = 0,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{email}',
        to_jsonb(v_email_limpo)
      ),
      updated_at = now()
    WHERE id = p_usuario_id
       OR lower(email) = lower(trim(COALESCE(v_alvo.email, '')));

    GET DIAGNOSTICS v_auth_linhas = ROW_COUNT;

    -- Se o usuário ainda não existia no auth.users, provisiona credenciais imediatamente
    IF v_auth_linhas = 0 THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', p_usuario_id, 'authenticated', 'authenticated',
        v_email_limpo, extensions.crypt('123456', extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('empresa_id', v_alvo.empresa_id, 'cargo', COALESCE(p_cargo, v_alvo.cargo), 'nome', v_alvo.nome),
        now(), now(), '', '', '', ''
      );

      INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), p_usuario_id, p_usuario_id::text,
        jsonb_build_object('sub', p_usuario_id::text, 'email', v_email_limpo, 'email_verified', true),
        'email', now(), now(), now()
      );
    ELSE
      -- Sincroniza em auth.identities
      UPDATE auth.identities
      SET
        identity_data = jsonb_set(
          COALESCE(identity_data, '{}'::jsonb),
          '{email}',
          to_jsonb(v_email_limpo)
        ),
        provider_id = CASE
          WHEN provider_id = lower(trim(COALESCE(v_alvo.email, ''))) THEN v_email_limpo
          ELSE provider_id
        END,
        updated_at = now()
      WHERE user_id = p_usuario_id
         OR user_id IN (SELECT id FROM auth.users WHERE lower(email) = v_email_limpo);
    END IF;
  ELSE
    v_email_limpo := v_alvo.email;
  END IF;

  -- 2. Tratamento de bloqueio no auth.users
  IF p_status IS NOT NULL THEN
    IF p_status = 'bloqueado' THEN
      UPDATE auth.users
      SET banned_until = '3000-01-01 00:00:00+00',
          updated_at = now()
      WHERE id = p_usuario_id;
    ELSIF p_status = 'ativo' THEN
      UPDATE auth.users
      SET banned_until = NULL,
          updated_at = now()
      WHERE id = p_usuario_id;
    END IF;
  END IF;

  -- 3. Tratamento de cargo
  IF p_cargo IS NOT NULL THEN
    IF p_cargo = 'super_admin' AND NOT v_is_super THEN
      RAISE EXCEPTION 'Acesso negado: atribuição de Super Admin não autorizada.';
    END IF;
    v_cargo_final := p_cargo;
  ELSE
    v_cargo_final := v_alvo.cargo;
  END IF;

  -- 4. Atualização na tabela public.usuarios com elevação de contexto
  v_role_anterior := current_setting('request.jwt.claim.role', true);
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.usuarios
  SET
    nome = COALESCE(NULLIF(trim(p_nome), ''), v_alvo.nome),
    email = v_email_limpo,
    cargo = v_cargo_final,
    avatar = COALESCE(NULLIF(trim(p_avatar), ''), v_alvo.avatar),
    status = COALESCE(p_status, v_alvo.status)
  WHERE id = p_usuario_id;

  PERFORM set_config('request.jwt.claim.role', COALESCE(v_role_anterior, 'authenticated'), true);

  RETURN jsonb_build_object(
    'sucesso', true,
    'usuario_id', p_usuario_id,
    'nome', COALESCE(NULLIF(trim(p_nome), ''), v_alvo.nome),
    'email', v_email_limpo,
    'cargo', v_cargo_final,
    'status', COALESCE(p_status, v_alvo.status)
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 4: RPC ATÔMICA — EXCLUIR / BLOQUEAR USUÁRIO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_excluir_usuario_estabelecimento(
  p_usuario_id uuid
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
  v_alvo public.usuarios%ROWTYPE;
  v_is_super boolean;
  v_is_admin boolean;
  v_role_anterior text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada.';
  END IF;

  IF v_caller_id = p_usuario_id THEN
    RAISE EXCEPTION 'Você não pode excluir a sua própria conta.';
  END IF;

  SELECT * INTO v_alvo
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  IF v_alvo.cargo = 'super_admin' THEN
    RAISE EXCEPTION 'Não é permitido excluir uma conta Super Admin.';
  END IF;

  SELECT cargo, empresa_id INTO v_caller_cargo, v_caller_empresa_id
  FROM public.usuarios
  WHERE id = v_caller_id
    AND COALESCE(status, 'ativo') = 'ativo'
    AND deletado_em IS NULL
  LIMIT 1;

  v_is_super := (
    v_caller_email IN ('ancorazero85@gmail.com', 'thamiles.085@gmail.com')
    OR v_caller_cargo = 'super_admin'
    OR public.is_super_admin()
  );

  v_is_admin := (
    v_is_super
    OR (v_caller_cargo = 'admin' AND v_caller_empresa_id IS NOT NULL AND v_caller_empresa_id = v_alvo.empresa_id)
  );

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Acesso negado: privilégios insuficientes.';
  END IF;

  -- Bane permanentemente em auth.users
  UPDATE auth.users
  SET banned_until = '3000-01-01 00:00:00+00',
      updated_at = now()
  WHERE id = p_usuario_id;

  -- Soft-delete em public.usuarios
  v_role_anterior := current_setting('request.jwt.claim.role', true);
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.usuarios
  SET deletado_em = now(),
      status = 'bloqueado'
  WHERE id = p_usuario_id;

  PERFORM set_config('request.jwt.claim.role', COALESCE(v_role_anterior, 'authenticated'), true);

  RETURN jsonb_build_object(
    'sucesso', true,
    'usuario_id', p_usuario_id,
    'nome', v_alvo.nome
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 5: DEFINIÇÃO DE PROPRIEDADE E CONCESSÃO DE PERMISSÕES
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.admin_criar_usuario_estabelecimento(text, text, text, text, text, uuid) OWNER TO postgres;
ALTER FUNCTION public.admin_atualizar_usuario_estabelecimento(uuid, text, text, text, text, text) OWNER TO postgres;
ALTER FUNCTION public.admin_excluir_usuario_estabelecimento(uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.admin_criar_usuario_estabelecimento(text, text, text, text, text, uuid) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_usuario_estabelecimento(uuid, text, text, text, text, text) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.admin_excluir_usuario_estabelecimento(uuid) TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- PASSO 6: SINCRONIZAÇÃO RETROATIVA IMEDIATA
-- Corrige na hora qualquer usuário que já tenha sido alterado em public.usuarios
-- mas cujo auth.users ainda não havia sido atualizado.
-- ------------------------------------------------------------------------------
UPDATE auth.users au
SET
  email = lower(trim(pu.email)),
  email_change = '',
  email_change_token_new = '',
  email_change_confirm_status = 0,
  email_confirmed_at = COALESCE(au.email_confirmed_at, now()),
  updated_at = now()
FROM public.usuarios pu
WHERE au.id = pu.id
  AND lower(trim(COALESCE(pu.email, ''))) <> ''
  AND lower(trim(COALESCE(pu.email, ''))) <> lower(trim(COALESCE(au.email, '')));

UPDATE auth.identities ai
SET
  identity_data = jsonb_set(
    COALESCE(ai.identity_data, '{}'::jsonb),
    '{email}',
    to_jsonb(lower(trim(pu.email)))
  ),
  updated_at = now()
FROM public.usuarios pu
JOIN auth.users au ON au.id = pu.id
WHERE ai.user_id = pu.id
  AND lower(trim(COALESCE(pu.email, ''))) <> ''
  AND lower(trim(COALESCE(pu.email, ''))) <> lower(trim(COALESCE(au.email, '')));

NOTIFY pgrst, 'reload schema';
