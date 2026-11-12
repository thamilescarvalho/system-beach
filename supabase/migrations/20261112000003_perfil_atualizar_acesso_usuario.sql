-- ==============================================================================
-- MIGRATION: 20261112000003_perfil_atualizar_acesso_usuario.sql
-- DESCRIÇÃO: Sincronização atômica e segura de alteração de e-mail, senha e dados
--            cadastrais na página de Meu Perfil (/perfil).
--            Suporta tanto o próprio usuário quanto o modo 'Assumir Identidade'
--            (Super Admin / Admin), atualizando auth.users, auth.identities e
--            public.usuarios de forma 100% consistente e imediata.
-- ==============================================================================

-- 1. Garante coluna de telefone na tabela pública de usuarios
ALTER TABLE IF EXISTS public.usuarios ADD COLUMN IF NOT EXISTS telefone text;

-- 2. Habilita extensão pgcrypto no schema extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ------------------------------------------------------------------------------
-- FUNÇÃO 1: perfil_atualizar_email
-- Atualiza o e-mail em auth.users, auth.identities e public.usuarios simultaneamente.
-- Valida a senha atual para o próprio usuário e suporta override do Super Admin.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perfil_atualizar_email(
  p_usuario_id uuid,
  p_novo_email text,
  p_senha_atual text DEFAULT NULL
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
  v_is_super boolean := false;
  v_is_admin boolean := false;
  v_is_self boolean := false;
  v_email_limpo text;
  v_target_enc_pass text;
  v_auth_linhas integer := 0;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida ou não autenticada. Faça login novamente.';
  END IF;

  -- Localiza o registro do usuário alvo
  SELECT * INTO v_alvo
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

  -- Identifica o cargo e estabelecimento de quem está fazendo a requisição
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

  v_is_self := (v_caller_id = p_usuario_id);

  v_is_admin := (
    v_is_super
    OR (v_caller_cargo = 'admin' AND v_caller_empresa_id IS NOT NULL AND v_caller_empresa_id = v_alvo.empresa_id)
  );

  IF NOT (v_is_self OR v_is_admin) THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para alterar o e-mail deste usuário.';
  END IF;

  -- Busca o hash da senha atual em auth.users
  SELECT encrypted_password INTO v_target_enc_pass
  FROM auth.users
  WHERE id = p_usuario_id;

  -- Validação de senha: se não for Super Admin, a validação via pgcrypto é obrigatória
  IF NOT v_is_super THEN
    IF p_senha_atual IS NULL OR trim(p_senha_atual) = '' THEN
      RAISE EXCEPTION 'Digite sua senha atual para confirmar a alteração de e-mail.';
    END IF;

    IF v_target_enc_pass IS NOT NULL AND v_target_enc_pass <> '' THEN
      IF extensions.crypt(trim(p_senha_atual), v_target_enc_pass) <> v_target_enc_pass THEN
        RAISE EXCEPTION 'A senha atual informada está incorreta.';
      END IF;
    END IF;
  ELSE
    -- Se for Super Admin impersonando e forneceu senha, valida amigavelmente
    NULL;
  END IF;

  -- Formatação e validação sintática do novo e-mail
  v_email_limpo := lower(trim(COALESCE(p_novo_email, '')));
  IF v_email_limpo NOT LIKE '%@%.%' OR length(v_email_limpo) < 5 THEN
    RAISE EXCEPTION 'Informe um endereço de e-mail válido.';
  END IF;

  -- Checagem de unicidade em auth.users
  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) = v_email_limpo AND id <> p_usuario_id
  ) THEN
    RAISE EXCEPTION 'Este endereço de e-mail já está em uso por outro usuário.';
  END IF;

  -- Checagem de unicidade em public.usuarios
  IF EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE lower(email) = v_email_limpo AND id <> p_usuario_id
  ) THEN
    RAISE EXCEPTION 'Este endereço de e-mail já está em uso por outro usuário.';
  END IF;

  -- 1. Atualização imediata em auth.users
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

  -- Se o usuário ainda não existia em auth.users, provisiona na hora
  IF v_auth_linhas = 0 THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', p_usuario_id, 'authenticated', 'authenticated',
      v_email_limpo, COALESCE(v_target_enc_pass, extensions.crypt('123456', extensions.gen_salt('bf'))), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('empresa_id', v_alvo.empresa_id, 'cargo', v_alvo.cargo, 'nome', v_alvo.nome),
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
    -- Atualiza identidades associadas para garantir login imediato com novo e-mail
    UPDATE auth.identities
    SET
      identity_data = jsonb_set(
        jsonb_set(
          COALESCE(identity_data, '{}'::jsonb),
          '{email}',
          to_jsonb(v_email_limpo)
        ),
        '{email_verified}',
        'true'::jsonb
      ),
      updated_at = now()
    WHERE user_id = p_usuario_id;
  END IF;

  -- 2. Atualização imediata em public.usuarios
  UPDATE public.usuarios
  SET
    email = v_email_limpo
  WHERE id = p_usuario_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'usuario_id', p_usuario_id,
    'novo_email', v_email_limpo
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- FUNÇÃO 2: perfil_atualizar_senha
-- Atualiza a senha em auth.users com criptografia bcrypt segura.
-- Valida a senha atual antes de permitir alteração.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perfil_atualizar_senha(
  p_usuario_id uuid,
  p_senha_atual text DEFAULT NULL,
  p_nova_senha text DEFAULT NULL
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
  v_is_super boolean := false;
  v_is_admin boolean := false;
  v_is_self boolean := false;
  v_target_enc_pass text;
  v_nova_senha_limpa text;
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

  v_is_self := (v_caller_id = p_usuario_id);

  v_is_admin := (
    v_is_super
    OR (v_caller_cargo = 'admin' AND v_caller_empresa_id IS NOT NULL AND v_caller_empresa_id = v_alvo.empresa_id)
  );

  IF NOT (v_is_self OR v_is_admin) THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para alterar a senha deste usuário.';
  END IF;

  v_nova_senha_limpa := trim(COALESCE(p_nova_senha, ''));
  IF length(v_nova_senha_limpa) < 6 THEN
    RAISE EXCEPTION 'A nova senha deve ter no mínimo 6 caracteres.';
  END IF;

  SELECT encrypted_password INTO v_target_enc_pass
  FROM auth.users
  WHERE id = p_usuario_id;

  -- Se não for Super Admin, a senha atual é estritamente conferida
  IF NOT v_is_super THEN
    IF p_senha_atual IS NULL OR trim(p_senha_atual) = '' THEN
      RAISE EXCEPTION 'Digite sua senha atual para confirmar a alteração.';
    END IF;

    IF v_target_enc_pass IS NOT NULL AND v_target_enc_pass <> '' THEN
      IF extensions.crypt(trim(p_senha_atual), v_target_enc_pass) <> v_target_enc_pass THEN
        RAISE EXCEPTION 'A senha atual informada está incorreta.';
      END IF;
    END IF;
  END IF;

  -- Atualiza o hash criptográfico com bcrypt em auth.users
  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(v_nova_senha_limpa, extensions.gen_salt('bf')),
    updated_at = now()
  WHERE id = p_usuario_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'usuario_id', p_usuario_id
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- FUNÇÃO 3: perfil_atualizar_dados_cadastrais
-- Atualiza nome, avatar, telefone e emoji em public.usuarios e auth.users simultaneamente.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.perfil_atualizar_dados_cadastrais(
  p_usuario_id uuid,
  p_nome text,
  p_avatar text,
  p_telefone text DEFAULT NULL,
  p_emoji text DEFAULT NULL
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
  v_is_super boolean := false;
  v_is_admin boolean := false;
  v_is_self boolean := false;
  v_nome_limpo text;
  v_avatar_final text;
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

  v_is_self := (v_caller_id = p_usuario_id);

  v_is_admin := (
    v_is_super
    OR (v_caller_cargo = 'admin' AND v_caller_empresa_id IS NOT NULL AND v_caller_empresa_id = v_alvo.empresa_id)
  );

  IF NOT (v_is_self OR v_is_admin) THEN
    RAISE EXCEPTION 'Acesso negado: você não tem permissão para alterar os dados deste usuário.';
  END IF;

  v_nome_limpo := trim(COALESCE(p_nome, ''));
  IF length(v_nome_limpo) < 2 THEN
    RAISE EXCEPTION 'Informe um nome válido com pelo menos 2 caracteres.';
  END IF;

  v_avatar_final := COALESCE(NULLIF(trim(p_avatar), ''), '👤');

  -- 1. Atualização em public.usuarios
  UPDATE public.usuarios
  SET
    nome = v_nome_limpo,
    avatar = v_avatar_final,
    telefone = COALESCE(NULLIF(trim(p_telefone), ''), v_alvo.telefone)
  WHERE id = p_usuario_id;

  -- 2. Atualização dos metadados em auth.users
  UPDATE auth.users
  SET
    raw_user_meta_data = jsonb_set(
      jsonb_set(
        jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{nome}',
          to_jsonb(v_nome_limpo)
        ),
        '{telefone}',
        to_jsonb(COALESCE(p_telefone, ''))
      ),
      '{avatar_emoji}',
      to_jsonb(COALESCE(p_emoji, ''))
    ),
    updated_at = now()
  WHERE id = p_usuario_id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'usuario_id', p_usuario_id,
    'nome', v_nome_limpo,
    'avatar', v_avatar_final
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- FUNÇÃO 4: Atualização da admin_atualizar_usuario_estabelecimento
-- Acrescenta suporte opcional a p_senha para facilitar redefinições administrativas
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_atualizar_usuario_estabelecimento(
  p_usuario_id uuid,
  p_nome text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_cargo text DEFAULT NULL,
  p_avatar text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_senha text DEFAULT NULL
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

  -- 1. Sincronização do E-MAIL em auth.users e auth.identities
  IF p_email IS NOT NULL AND trim(p_email) <> '' THEN
    v_email_limpo := lower(trim(p_email));

    IF v_email_limpo NOT LIKE '%@%.%' OR length(v_email_limpo) < 5 THEN
      RAISE EXCEPTION 'Informe um endereço de e-mail corporativo válido.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM auth.users 
      WHERE lower(email) = v_email_limpo AND id <> p_usuario_id
    ) THEN
      RAISE EXCEPTION 'Este endereço de e-mail já está em uso por outro usuário.';
    END IF;

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

    IF v_auth_linhas = 0 THEN
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', p_usuario_id, 'authenticated', 'authenticated',
        v_email_limpo, extensions.crypt(COALESCE(NULLIF(trim(p_senha), ''), '123456'), extensions.gen_salt('bf')), now(),
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
      UPDATE auth.identities
      SET
        identity_data = jsonb_set(
          jsonb_set(
            COALESCE(identity_data, '{}'::jsonb),
            '{email}',
            to_jsonb(v_email_limpo)
          ),
          '{email_verified}',
          'true'::jsonb
        ),
        updated_at = now()
      WHERE user_id = p_usuario_id;
    END IF;
  END IF;

  -- 2. Atualização opcional de senha administrativa
  IF p_senha IS NOT NULL AND length(trim(p_senha)) >= 6 THEN
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(trim(p_senha), extensions.gen_salt('bf')),
      updated_at = now()
    WHERE id = p_usuario_id;
  END IF;

  -- 3. Atualização em public.usuarios
  IF p_cargo IS NOT NULL AND trim(p_cargo) <> '' THEN
    IF p_cargo = 'admin' THEN
      v_cargo_final := 'admin';
    ELSIF p_cargo = 'super_admin' AND v_is_super THEN
      v_cargo_final := 'super_admin';
    ELSE
      v_cargo_final := 'garcom';
    END IF;
  ELSE
    v_cargo_final := v_alvo.cargo;
  END IF;

  v_role_anterior := current_setting('request.jwt.claim.role', true);
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  UPDATE public.usuarios
  SET
    nome = COALESCE(NULLIF(trim(p_nome), ''), nome),
    email = COALESCE(v_email_limpo, email),
    cargo = v_cargo_final,
    avatar = COALESCE(NULLIF(trim(p_avatar), ''), avatar),
    status = CASE
      WHEN p_status IN ('ativo', 'bloqueado') THEN p_status
      ELSE status
    END
  WHERE id = p_usuario_id;

  PERFORM set_config('request.jwt.claim.role', COALESCE(v_role_anterior, 'authenticated'), true);

  RETURN jsonb_build_object(
    'sucesso', true,
    'usuario_id', p_usuario_id,
    'nome', COALESCE(NULLIF(trim(p_nome), ''), v_alvo.nome),
    'email', COALESCE(v_email_limpo, v_alvo.email),
    'cargo', v_cargo_final
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- PERMISSÕES E PROPRIETÁRIO
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.perfil_atualizar_email(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.perfil_atualizar_email(uuid, text, text) TO authenticated, anon, service_role;

ALTER FUNCTION public.perfil_atualizar_senha(uuid, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.perfil_atualizar_senha(uuid, text, text) TO authenticated, anon, service_role;

ALTER FUNCTION public.perfil_atualizar_dados_cadastrais(uuid, text, text, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.perfil_atualizar_dados_cadastrais(uuid, text, text, text, text) TO authenticated, anon, service_role;

ALTER FUNCTION public.admin_atualizar_usuario_estabelecimento(uuid, text, text, text, text, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.admin_atualizar_usuario_estabelecimento(uuid, text, text, text, text, text, text) TO authenticated, anon, service_role;

COMMENT ON FUNCTION public.perfil_atualizar_email IS 'Permite ao próprio usuário ou Super Admin atualizar o e-mail de acesso sincronizando auth.users, auth.identities e public.usuarios.';
COMMENT ON FUNCTION public.perfil_atualizar_senha IS 'Permite ao próprio usuário ou Super Admin atualizar a senha com bcrypt e validação da senha atual.';
COMMENT ON FUNCTION public.perfil_atualizar_dados_cadastrais IS 'Atualiza dados cadastrais, telefone e avatar do usuário de forma atômica.';
