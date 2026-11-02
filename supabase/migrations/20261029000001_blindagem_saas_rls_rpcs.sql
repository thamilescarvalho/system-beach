-- ==============================================================================
-- T-SYSTEM BEACH — MIGRATION DE BLINDAGEM SAAS MULTI-TENANT (ZERO-TRUST)
-- Data: 2026-10-29
-- Objetivo:
--   1. Garantir colunas necessárias para LGPD e Assinaturas (Mercado Pago).
--   2. Criar funções auxiliares seguras (meu_empresa_id, meu_cargo, assinatura_ativa).
--   3. Bloquear Escalada de Privilégio (impedir usuário comum de virar super_admin
--      ou de alterar sua própria data_vencimento / status_assinatura).
--   4. Criar RPC segura de Onboarding (/cadastro) com 7 dias de Teste Grátis (Trial)
--      validados pelo relógio oficial do servidor PostgreSQL.
--   5. Criar RPCs atômicas contra Race Conditions (Cozinha e Estoque).
--   6. Ativar e padronizar políticas RLS (Row Level Security) em todas as tabelas.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASSO 1: EVOLUÇÃO DE SCHEMA (IDEMPOTENTE - SEGURO PARA RODAR EM PRODUÇÃO)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.empresas
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS valor_mensalidade numeric(10,2) DEFAULT 149.90,
  ADD COLUMN IF NOT EXISTS termos_aceitos_em timestamptz,
  ADD COLUMN IF NOT EXISTS mp_preapproval_id text,
  ADD COLUMN IF NOT EXISTS mp_ultimo_pagamento_id text;

ALTER TABLE IF EXISTS public.usuarios
  ADD COLUMN IF NOT EXISTS telefone text;

-- ------------------------------------------------------------------------------
-- PASSO 2: FUNÇÕES AUXILIARES DE SEGURANÇA (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- Retorna o empresa_id do usuário autenticado no JWT atual (apenas se ativo)
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

-- Retorna o cargo do usuário autenticado no JWT atual (apenas se ativo)
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

-- Verifica se o usuário autenticado é Super Admin do SaaS
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.meu_cargo() = 'super_admin', false);
$$;

-- Verifica se o usuário autenticado é Admin da sua empresa ou Super Admin
CREATE OR REPLACE FUNCTION public.is_admin_workspace()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.meu_cargo() IN ('admin', 'super_admin'), false);
$$;

-- Valida se a assinatura de uma empresa está ativa pelo RELÓGIO DO SERVIDOR
CREATE OR REPLACE FUNCTION public.assinatura_empresa_ativa(p_empresa_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_vencimento timestamptz;
BEGIN
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  IF p_empresa_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT status_assinatura, data_vencimento
    INTO v_status, v_vencimento
  FROM public.empresas
  WHERE id = p_empresa_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_status NOT IN ('ativa', 'degustacao') THEN
    RETURN false;
  END IF;

  -- Se houver data de vencimento, exige que o fim do dia do vencimento seja >= agora
  IF v_vencimento IS NOT NULL THEN
    RETURN (date_trunc('day', v_vencimento) + interval '23 hours 59 minutes 59 seconds') >= now();
  END IF;

  RETURN false;
END;
$$;

-- ------------------------------------------------------------------------------
-- PASSO 3: TRIGGERS ANTI-ESCALADA DE PRIVILÉGIO E ANTI-FRAUDE DE LICENÇA
-- ------------------------------------------------------------------------------
-- Impede que qualquer usuário comum se promova a 'super_admin' ou mude de empresa
CREATE OR REPLACE FUNCTION public.proteger_integridade_usuarios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  -- Permite operações internas do service_role (Edge Functions) ou do Super Admin
  IF v_role = 'service_role' OR public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  -- Ninguém exceto service_role / super_admin pode criar ou virar super_admin
  IF NEW.cargo = 'super_admin' THEN
    RAISE EXCEPTION 'Violação de Segurança: atribuição de cargo super_admin não autorizada.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Se for um admin criando membro da equipe, força ser da mesma empresa dele
    IF public.meu_cargo() = 'admin' THEN
      IF NEW.empresa_id IS DISTINCT FROM public.meu_empresa_id() THEN
        RAISE EXCEPTION 'Violação Multi-Tenant: você só pode adicionar usuários na sua própria empresa.';
      END IF;
    ELSE
      RAISE EXCEPTION 'Acesso negado: use o fluxo oficial de Onboarding para criar sua conta.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Impede trocar um usuário de empresa
    IF NEW.empresa_id IS DISTINCT FROM OLD.empresa_id THEN
      RAISE EXCEPTION 'Violação Multi-Tenant: não é permitido alterar o empresa_id de um usuário.';
    END IF;

    -- Garçom comum não pode alterar seu próprio cargo nem seu status
    IF public.meu_cargo() <> 'admin' THEN
      IF NEW.cargo IS DISTINCT FROM OLD.cargo OR NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Violação de Segurança: você não tem permissão para alterar cargos ou status.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_proteger_usuarios ON public.usuarios;
CREATE TRIGGER tr_proteger_usuarios
  BEFORE INSERT OR UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.proteger_integridade_usuarios();

-- Impede que o dono da barraca altere seu próprio status_assinatura ou data_vencimento
CREATE OR REPLACE FUNCTION public.proteger_licenca_empresas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_setting('request.jwt.claim.role', true);
BEGIN
  IF v_role = 'service_role' OR public.is_super_admin() THEN
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
-- PASSO 4: RPC SEGURA DE ONBOARDING (/cadastro) COM 7 DIAS DE TESTE GRÁTIS
-- ------------------------------------------------------------------------------
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
  v_existe_perfil boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado para criar Estabelecimento.';
  END IF;

  IF length(trim(COALESCE(p_nome_empresa, ''))) < 3 THEN
    RAISE EXCEPTION 'O nome do estabelecimento deve ter no mínimo 3 caracteres.';
  END IF;

  IF length(trim(COALESCE(p_nome_usuario, ''))) < 3 THEN
    RAISE EXCEPTION 'O nome do responsável deve ter no mínimo 3 caracteres.';
  END IF;

  -- Verifica se este usuário já possui perfil criado (evita duplicação de empresas)
  SELECT EXISTS(SELECT 1 FROM public.usuarios WHERE id = v_user_id)
    INTO v_existe_perfil;

  IF v_existe_perfil THEN
    RAISE EXCEPTION 'Este usuário já possui um Estabelecimento vinculado.';
  END IF;

  -- 1. Cria a empresa obrigatoriamente em modo 'degustacao' por 7 dias (relógio do servidor)
  INSERT INTO public.empresas (
    nome_fantasia,
    documento,
    telefone,
    status_assinatura,
    data_vencimento,
    valor_mensalidade,
    termos_aceitos_em
  ) VALUES (
    trim(p_nome_empresa),
    p_documento,
    p_telefone,
    'degustacao',
    now() + interval '7 days',
    149.90,
    now()
  )
  RETURNING id INTO v_empresa_id;

  -- 2. Cria o perfil de Administrador local vinculado à empresa
  -- Nota: Desabilitamos a validação de INSERT comum via variável de contexto local segura
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

  -- 3. Cria as 6 mesas iniciais padrão para o novo cliente já começar operando
  INSERT INTO public.mesas (numero, status, itens, empresa_id)
  SELECT n, 'livre', '[]'::jsonb, v_empresa_id
  FROM generate_series(1, 6) AS n;

  RETURN v_empresa_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_workspace_onboarding(text, text, text) TO authenticated;

-- ------------------------------------------------------------------------------
-- PASSO 5: RPCS ATÔMICAS CONTRA CONDIÇÃO DE CORRIDA (COZINHA E ESTOQUE)
-- ------------------------------------------------------------------------------
-- Atualiza apenas o statusCozinha de um item específico com lock de linha (FOR UPDATE)
CREATE OR REPLACE FUNCTION public.atualizar_status_item_cozinha(
  p_numero_mesa integer,
  p_item_id text,
  p_novo_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid := public.meu_empresa_id();
  v_itens jsonb;
  v_novos_itens jsonb;
BEGIN
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  IF p_novo_status NOT IN ('pendente', 'pronto', 'entregue') THEN
    RAISE EXCEPTION 'Status de cozinha inválido.';
  END IF;

  -- Bloqueia a linha da mesa durante a transação para não conflitar com o garçom
  SELECT itens INTO v_itens
  FROM public.mesas
  WHERE empresa_id = v_empresa_id
    AND numero = p_numero_mesa
    AND deletado_em IS NULL
  FOR UPDATE;

  IF v_itens IS NULL OR jsonb_typeof(v_itens) <> 'array' THEN
    RETURN;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN elem->>'id' = p_item_id THEN jsonb_set(elem, '{statusCozinha}', to_jsonb(p_novo_status))
        ELSE elem
      END
    ),
    '[]'::jsonb
  )
  INTO v_novos_itens
  FROM jsonb_array_elements(v_itens) AS elem;

  UPDATE public.mesas
  SET itens = v_novos_itens
  WHERE empresa_id = v_empresa_id
    AND numero = p_numero_mesa
    AND deletado_em IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_status_item_cozinha(integer, text, text) TO authenticated;

-- Ajusta o saldo de estoque atomicamente direto no PostgreSQL
CREATE OR REPLACE FUNCTION public.ajustar_estoque_atomico(
  p_produto_id bigint,
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid := public.meu_empresa_id();
BEGIN
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.';
  END IF;

  UPDATE public.produtos
  SET estoque = GREATEST(0, COALESCE(estoque, 0) + p_delta)
  WHERE id = p_produto_id
    AND empresa_id = v_empresa_id
    AND estoque IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ajustar_estoque_atomico(bigint, integer) TO authenticated;

-- ------------------------------------------------------------------------------
-- PASSO 6: ROW LEVEL SECURITY (RLS) ESTRITO MULTI-TENANT EM TODAS AS TABELAS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.historico_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pagamentos_garcons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.metas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auditoria_logs ENABLE ROW LEVEL SECURITY;

-- 6.1 POLÍTICAS: EMPRESAS
DROP POLICY IF EXISTS "rls_empresas_select" ON public.empresas;
CREATE POLICY "rls_empresas_select" ON public.empresas
  FOR SELECT TO authenticated
  USING (id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_empresas_insert" ON public.empresas;
CREATE POLICY "rls_empresas_insert" ON public.empresas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "rls_empresas_update" ON public.empresas;
CREATE POLICY "rls_empresas_update" ON public.empresas
  FOR UPDATE TO authenticated
  USING ((id = public.meu_empresa_id() AND public.is_admin_workspace()) OR public.is_super_admin())
  WITH CHECK ((id = public.meu_empresa_id() AND public.is_admin_workspace()) OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_empresas_delete" ON public.empresas;
CREATE POLICY "rls_empresas_delete" ON public.empresas
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 6.2 POLÍTICAS: USUARIOS
DROP POLICY IF EXISTS "rls_usuarios_select" ON public.usuarios;
CREATE POLICY "rls_usuarios_select" ON public.usuarios
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_usuarios_insert" ON public.usuarios;
CREATE POLICY "rls_usuarios_insert" ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK ((empresa_id = public.meu_empresa_id() AND public.is_admin_workspace()) OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_usuarios_update" ON public.usuarios;
CREATE POLICY "rls_usuarios_update" ON public.usuarios
  FOR UPDATE TO authenticated
  USING ((empresa_id = public.meu_empresa_id() AND public.is_admin_workspace()) OR public.is_super_admin())
  WITH CHECK ((empresa_id = public.meu_empresa_id() AND public.is_admin_workspace()) OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_usuarios_delete" ON public.usuarios;
CREATE POLICY "rls_usuarios_delete" ON public.usuarios
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 6.3 POLÍTICAS OPERACIONAIS (EXIGEM ASSINATURA ATIVA PARA ESCRITA!)
-- Mesas
DROP POLICY IF EXISTS "rls_mesas_select" ON public.mesas;
CREATE POLICY "rls_mesas_select" ON public.mesas
  FOR SELECT TO authenticated
  USING (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_mesas_write" ON public.mesas;
CREATE POLICY "rls_mesas_write" ON public.mesas
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  );

-- Produtos
DROP POLICY IF EXISTS "rls_produtos_select" ON public.produtos;
CREATE POLICY "rls_produtos_select" ON public.produtos
  FOR SELECT TO authenticated
  USING (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_produtos_write" ON public.produtos;
CREATE POLICY "rls_produtos_write" ON public.produtos
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  );

-- Categorias
DROP POLICY IF EXISTS "rls_categorias_select" ON public.categorias;
CREATE POLICY "rls_categorias_select" ON public.categorias
  FOR SELECT TO authenticated
  USING (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_categorias_write" ON public.categorias;
CREATE POLICY "rls_categorias_write" ON public.categorias
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  );

-- Vendas
DROP POLICY IF EXISTS "rls_vendas_select" ON public.vendas;
CREATE POLICY "rls_vendas_select" ON public.vendas
  FOR SELECT TO authenticated
  USING (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_vendas_write" ON public.vendas;
CREATE POLICY "rls_vendas_write" ON public.vendas
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  );

-- Histórico de Estoque
DROP POLICY IF EXISTS "rls_hist_estoque_select" ON public.historico_estoque;
CREATE POLICY "rls_hist_estoque_select" ON public.historico_estoque
  FOR SELECT TO authenticated
  USING (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_hist_estoque_insert" ON public.historico_estoque;
CREATE POLICY "rls_hist_estoque_insert" ON public.historico_estoque
  FOR INSERT TO authenticated
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  );

-- Pagamentos Garçons (Vales/Comissões)
DROP POLICY IF EXISTS "rls_pagamentos_garcons_select" ON public.pagamentos_garcons;
CREATE POLICY "rls_pagamentos_garcons_select" ON public.pagamentos_garcons
  FOR SELECT TO authenticated
  USING (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_pagamentos_garcons_write" ON public.pagamentos_garcons;
CREATE POLICY "rls_pagamentos_garcons_write" ON public.pagamentos_garcons
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  );

-- Metas Financeiras
DROP POLICY IF EXISTS "rls_metas_select" ON public.metas_financeiras;
CREATE POLICY "rls_metas_select" ON public.metas_financeiras
  FOR SELECT TO authenticated
  USING (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_metas_write" ON public.metas_financeiras;
CREATE POLICY "rls_metas_write" ON public.metas_financeiras
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.assinatura_empresa_ativa(empresa_id))
    OR public.is_super_admin()
  );

-- Logs de Auditoria (Imutáveis: permite leitura da própria empresa e inserção, mas nunca deleção/edição)
DROP POLICY IF EXISTS "rls_auditoria_select" ON public.auditoria_logs;
CREATE POLICY "rls_auditoria_select" ON public.auditoria_logs
  FOR SELECT TO authenticated
  USING (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "rls_auditoria_insert" ON public.auditoria_logs;
CREATE POLICY "rls_auditoria_insert" ON public.auditoria_logs
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.meu_empresa_id() OR public.is_super_admin());

