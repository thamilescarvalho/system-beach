-- ==============================================================================
-- T-SYSTEM BEACH — ARMAZENAMENTO DE CPF/CNPJ, TELEFONE E FLUXO ASSINATURA PREMIUM
-- Execute este script no SQL Editor do Supabase Dashboard
-- ==============================================================================

-- 1. Adiciona colunas de Documento (CPF/CNPJ), Telefone e Ciclo de Plano na tabela de Empresas
ALTER TABLE IF EXISTS public.empresas
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS plano_nome text DEFAULT 'Assinatura Premium',
  ADD COLUMN IF NOT EXISTS ciclo_cobranca text DEFAULT 'mensal',
  ADD COLUMN IF NOT EXISTS valor_mensalidade numeric(10,2) DEFAULT 149.90,
  ADD COLUMN IF NOT EXISTS termos_aceitos_em timestamptz;

-- 2. Adiciona coluna de Telefone na tabela de Usuários
ALTER TABLE IF EXISTS public.usuarios
  ADD COLUMN IF NOT EXISTS telefone text;

-- 3. Atualiza a RPC de Onboarding: inicia com status 'pendente' para direcionar à contratação da Assinatura Premium
-- (O período de 7 dias de teste grátis só é ativado pelo Super Admin no painel /master)
CREATE OR REPLACE FUNCTION public.criar_workspace_onboarding(
  p_nome_empresa text,
  p_nome_usuario text,
  p_email text,
  p_documento text DEFAULT NULL,
  p_telefone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_empresa_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado para criar Estabelecimento.';
  END IF;

  SELECT empresa_id INTO v_empresa_id
  FROM public.usuarios
  WHERE id = v_user_id
  LIMIT 1;

  IF v_empresa_id IS NOT NULL THEN
    RETURN v_empresa_id;
  END IF;

  -- 1. Cria o Estabelecimento com status 'pendente' (aguardando contratação da Assinatura Premium ou liberação pelo Super Admin)
  INSERT INTO public.empresas (
    nome_fantasia,
    documento,
    telefone,
    plano_nome,
    ciclo_cobranca,
    status_assinatura,
    data_vencimento,
    valor_mensalidade,
    termos_aceitos_em
  ) VALUES (
    trim(p_nome_empresa),
    p_documento,
    p_telefone,
    'Assinatura Premium',
    'mensal',
    'pendente',
    NULL,
    149.90,
    now()
  )
  RETURNING id INTO v_empresa_id;

  -- 2. Cria o perfil de Administrador vinculado ao Estabelecimento
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  INSERT INTO public.usuarios (
    id,
    nome,
    email,
    telefone,
    cargo,
    status,
    avatar,
    empresa_id
  ) VALUES (
    v_user_id,
    trim(p_nome_usuario),
    lower(trim(p_email)),
    p_telefone,
    'admin',
    'ativo',
    '👑',
    v_empresa_id
  );

  -- 3. Cria os 6 guarda-sóis iniciais do Estabelecimento
  INSERT INTO public.mesas (numero, status, itens, empresa_id)
  SELECT n, 'livre', '[]'::jsonb, v_empresa_id
  FROM generate_series(1, 6) AS n;

  RETURN v_empresa_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_workspace_onboarding(text, text, text, text, text) TO authenticated;

-- 4. Gatilho Automático: cria o Estabelecimento (com status 'pendente') assim que o usuário confirma o e-mail
CREATE OR REPLACE FUNCTION public.provisionar_estabelecimento_apos_confirmacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome_empresa text;
  v_nome_usuario text;
  v_documento text;
  v_telefone text;
  v_empresa_id uuid;
  v_ja_existe boolean;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    v_nome_empresa := NEW.raw_user_meta_data->>'nome_empresa';
    v_nome_usuario := NEW.raw_user_meta_data->>'nome_usuario';
    v_documento := NEW.raw_user_meta_data->>'documento';
    v_telefone := NEW.raw_user_meta_data->>'telefone';

    IF v_nome_empresa IS NOT NULL AND v_nome_usuario IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id = NEW.id)
        INTO v_ja_existe;

      IF NOT v_ja_existe THEN
        PERFORM set_config('request.jwt.claim.role', 'service_role', true);

        INSERT INTO public.empresas (
          nome_fantasia,
          documento,
          telefone,
          plano_nome,
          ciclo_cobranca,
          status_assinatura,
          data_vencimento,
          valor_mensalidade,
          termos_aceitos_em
        ) VALUES (
          trim(v_nome_empresa),
          v_documento,
          v_telefone,
          'Assinatura Premium',
          'mensal',
          'pendente',
          NULL,
          149.90,
          now()
        )
        RETURNING id INTO v_empresa_id;

        INSERT INTO public.usuarios (
          id,
          nome,
          email,
          telefone,
          cargo,
          status,
          avatar,
          empresa_id
        ) VALUES (
          NEW.id,
          trim(v_nome_usuario),
          lower(trim(COALESCE(NEW.email, ''))),
          v_telefone,
          'admin',
          'ativo',
          '👑',
          v_empresa_id
        );

        INSERT INTO public.mesas (numero, status, itens, empresa_id)
        SELECT n, 'livre', '[]'::jsonb, v_empresa_id
        FROM generate_series(1, 6) AS n;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_provisionar_estabelecimento_confirmado ON auth.users;
CREATE TRIGGER tr_provisionar_estabelecimento_confirmado
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.provisionar_estabelecimento_apos_confirmacao();

-- 5. Corrige automaticamente estabelecimentos criados pela trigger anterior (auto-atendimento sem isenção do Super Admin)
UPDATE public.empresas
SET status_assinatura = 'pendente',
    data_vencimento = NULL
WHERE status_assinatura = 'degustacao'
  AND COALESCE(valor_mensalidade, 149.90) > 0;

-- 6. Tabela de Configurações Globais do SaaS (Planos, Promoções, Textos e Checkout Mercado Pago)
CREATE TABLE IF NOT EXISTS public.configuracoes_saas (
  id text PRIMARY KEY DEFAULT 'global',
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.configuracoes_saas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica das configuracoes do SaaS" ON public.configuracoes_saas;
CREATE POLICY "Leitura publica das configuracoes do SaaS"
  ON public.configuracoes_saas
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super Admin gerencia configuracoes do SaaS" ON public.configuracoes_saas;
CREATE POLICY "Super Admin gerencia configuracoes do SaaS"
  ON public.configuracoes_saas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.cargo = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.cargo = 'super_admin'
    )
  );

-- 7. Criação Direta de Estabelecimento Exclusiva pelo Painel Super Admin (/master → + Novo Estabelecimento)
-- Não consome cota de envio de e-mail porque é executada diretamente pela proprietária autenticada como super_admin
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.super_admin_criar_estabelecimento(
  p_email text,
  p_senha text,
  p_nome_empresa text,
  p_nome_usuario text,
  p_modalidade_inicial text DEFAULT 'degustacao',
  p_valor_mensalidade numeric DEFAULT 149.90
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_user_id uuid;
  v_empresa_id uuid;
  v_vencimento timestamptz;
BEGIN
  -- Trava Zero-Trust: somente a proprietária logada como super_admin pode executar esta função
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid()
      AND cargo = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: função exclusiva do Super Admin.';
  END IF;

  IF length(trim(p_senha)) < 6 THEN
    RAISE EXCEPTION 'A senha deve ter no mínimo 6 caracteres.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado no sistema.';
  END IF;

  IF p_modalidade_inicial = 'degustacao' THEN
    v_vencimento := now() + interval '7 days';
  ELSIF p_modalidade_inicial = 'ativa' THEN
    v_vencimento := now() + interval '30 days';
  ELSE
    v_vencimento := NULL;
  END IF;

  PERFORM set_config('request.jwt.claim.role', 'service_role', true);

  -- 1. Cria o Estabelecimento na modalidade escolhida pelo Super Admin
  INSERT INTO public.empresas (
    nome_fantasia,
    plano_nome,
    ciclo_cobranca,
    status_assinatura,
    data_vencimento,
    valor_mensalidade,
    termos_aceitos_em
  ) VALUES (
    trim(p_nome_empresa),
    'Assinatura Premium',
    'mensal',
    p_modalidade_inicial,
    v_vencimento,
    CASE WHEN p_modalidade_inicial = 'degustacao' THEN 0 ELSE COALESCE(p_valor_mensalidade, 149.90) END,
    now()
  )
  RETURNING id INTO v_empresa_id;

  -- 2. Cria a credencial já validada no Supabase Auth (sem gastar envio de e-mail)
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
      'empresa_id', v_empresa_id,
      'cargo', 'admin'
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

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

  -- 3. Cria o perfil de Administrador e os 6 guarda-sóis iniciais
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
    trim(p_nome_usuario),
    v_email,
    'admin',
    'ativo',
    '👑',
    v_empresa_id
  );

  INSERT INTO public.mesas (numero, status, itens, empresa_id)
  SELECT n, 'livre', '[]'::jsonb, v_empresa_id
  FROM generate_series(1, 6) AS n;

  RETURN v_empresa_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.super_admin_criar_estabelecimento(text, text, text, text, text, numeric) TO authenticated;
