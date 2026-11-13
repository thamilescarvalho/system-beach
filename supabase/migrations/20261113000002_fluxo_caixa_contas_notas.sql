-- ==============================================================================
-- MIGRATION: Fluxo de Caixa Fintech, Contas Financeiras e Notas de Compra
-- Data: 2026-11-13
-- Objetivos:
--   1. Criar `contas_financeiras` (carteiras/bancos/gaveta) com roteamento PDV
--   2. Criar `notas_compra_estoque` e `itens_nota_compra` vinculando Estoque -> Caixa
--   3. Criar `movimentacoes_caixa` (entradas, saídas, transferências)
--   4. Evoluir `pagamentos_garcons` e `historico_estoque` com vínculo de conta/nota
--   5. Blindar todas as novas tabelas com RLS Multi-Tenant e RPCs atômicas
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABELA DE CONTAS FINANCEIRAS (GAVETA, BANCO/PIX, MAQUININHA, COFRE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'banco' CHECK (tipo IN ('dinheiro', 'banco', 'maquininha', 'cofre')),
  saldo_inicial numeric(12,2) NOT NULL DEFAULT 0,
  cor text NOT NULL DEFAULT 'emerald',
  icone text NOT NULL DEFAULT 'wallet',
  recebe_dinheiro_pdv boolean NOT NULL DEFAULT false,
  recebe_digital_pdv boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  padrao boolean NOT NULL DEFAULT false,
  deletado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contas_financeiras_empresa
  ON public.contas_financeiras (empresa_id)
  WHERE deletado_em IS NULL;

-- ------------------------------------------------------------------------------
-- 2. TABELAS DE NOTAS DE COMPRA MANUAL DO ESTOQUE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notas_compra_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  fornecedor text NOT NULL,
  numero_nota text,
  data_compra date NOT NULL DEFAULT CURRENT_DATE,
  valor_itens numeric(12,2) NOT NULL DEFAULT 0,
  valor_extras numeric(12,2) NOT NULL DEFAULT 0,
  valor_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  forma_pagamento text NOT NULL DEFAULT 'PIX',
  conta_id uuid REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
  lancar_no_caixa boolean NOT NULL DEFAULT true,
  movimentacao_caixa_id uuid,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'estornada')),
  observacoes text,
  usuario_nome text NOT NULL,
  cancelado_por text,
  data_cancelamento timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notas_compra_empresa_data
  ON public.notas_compra_estoque (empresa_id, data_compra DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.itens_nota_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id uuid NOT NULL REFERENCES public.notas_compra_estoque(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id integer NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  produto_nome text NOT NULL,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  valor_unitario numeric(12,2) NOT NULL CHECK (valor_unitario >= 0),
  valor_total_item numeric(12,2) NOT NULL CHECK (valor_total_item >= 0)
);

CREATE INDEX IF NOT EXISTS idx_itens_nota_compra_nota
  ON public.itens_nota_compra (nota_id);

CREATE INDEX IF NOT EXISTS idx_itens_nota_compra_empresa
  ON public.itens_nota_compra (empresa_id);

-- ------------------------------------------------------------------------------
-- 3. TABELA DE MOVIMENTAÇÕES DE CAIXA (ENTRADAS, SAÍDAS, TRANSFERÊNCIAS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.movimentacoes_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  conta_id uuid NOT NULL REFERENCES public.contas_financeiras(id) ON DELETE RESTRICT,
  conta_destino_id uuid REFERENCES public.contas_financeiras(id) ON DELETE RESTRICT,
  nota_compra_id uuid REFERENCES public.notas_compra_estoque(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia')),
  categoria text NOT NULL,
  metodo_pagamento text NOT NULL DEFAULT 'PIX',
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  data_movimentacao timestamptz NOT NULL DEFAULT now(),
  descricao text,
  usuario_nome text NOT NULL,
  deletado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_movimentacao_transferencia CHECK (
    tipo <> 'transferencia' OR (conta_destino_id IS NOT NULL AND conta_destino_id <> conta_id)
  )
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa_empresa_data
  ON public.movimentacoes_caixa (empresa_id, data_movimentacao DESC)
  WHERE deletado_em IS NULL;

-- ------------------------------------------------------------------------------
-- 4. EVOLUÇÃO DE TABELAS EXISTENTES (SEM QUEBRAR REGISTROS ANTIGOS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.pagamentos_garcons
  ADD COLUMN IF NOT EXISTS conta_id uuid REFERENCES public.contas_financeiras(id) ON DELETE SET NULL;

ALTER TABLE public.pagamentos_garcons
  ADD COLUMN IF NOT EXISTS metodo_pagamento text NOT NULL DEFAULT 'Dinheiro';

ALTER TABLE public.historico_estoque
  ADD COLUMN IF NOT EXISTS nota_compra_id uuid REFERENCES public.notas_compra_estoque(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_historico_estoque_nota
  ON public.historico_estoque (nota_compra_id)
  WHERE nota_compra_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (MULTI-TENANT ISOLATION + ADMIN GUARD)
-- ------------------------------------------------------------------------------
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_compra_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_nota_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_caixa ENABLE ROW LEVEL SECURITY;

-- Contas Financeiras
DROP POLICY IF EXISTS "rls_contas_financeiras_select" ON public.contas_financeiras;
CREATE POLICY "rls_contas_financeiras_select" ON public.contas_financeiras
  FOR SELECT TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "rls_contas_financeiras_write" ON public.contas_financeiras;
CREATE POLICY "rls_contas_financeiras_write" ON public.contas_financeiras
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.auth_assinatura_ativa())
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.auth_assinatura_ativa())
    OR public.is_super_admin()
  );

-- Notas de Compra
DROP POLICY IF EXISTS "rls_notas_compra_select" ON public.notas_compra_estoque;
CREATE POLICY "rls_notas_compra_select" ON public.notas_compra_estoque
  FOR SELECT TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "rls_notas_compra_write" ON public.notas_compra_estoque;
CREATE POLICY "rls_notas_compra_write" ON public.notas_compra_estoque
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.auth_assinatura_ativa())
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.auth_assinatura_ativa())
    OR public.is_super_admin()
  );

-- Itens de Nota de Compra
DROP POLICY IF EXISTS "rls_itens_nota_compra_select" ON public.itens_nota_compra;
CREATE POLICY "rls_itens_nota_compra_select" ON public.itens_nota_compra
  FOR SELECT TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "rls_itens_nota_compra_write" ON public.itens_nota_compra;
CREATE POLICY "rls_itens_nota_compra_write" ON public.itens_nota_compra
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.auth_assinatura_ativa())
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.auth_assinatura_ativa())
    OR public.is_super_admin()
  );

-- Movimentações de Caixa
DROP POLICY IF EXISTS "rls_movimentacoes_caixa_select" ON public.movimentacoes_caixa;
CREATE POLICY "rls_movimentacoes_caixa_select" ON public.movimentacoes_caixa
  FOR SELECT TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "rls_movimentacoes_caixa_write" ON public.movimentacoes_caixa;
CREATE POLICY "rls_movimentacoes_caixa_write" ON public.movimentacoes_caixa
  FOR ALL TO authenticated
  USING (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.auth_assinatura_ativa())
    OR public.is_super_admin()
  )
  WITH CHECK (
    (empresa_id = public.meu_empresa_id() AND public.is_admin_workspace() AND public.auth_assinatura_ativa())
    OR public.is_super_admin()
  );

-- ------------------------------------------------------------------------------
-- 6. RPC: AUTO-PROVISIONAMENTO IDEMPOTENTE DE CONTAS PADRÃO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.garantir_contas_financeiras_padrao(
  p_empresa_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_qtd integer;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.';
  END IF;

  v_empresa_id := COALESCE(p_empresa_id, public.meu_empresa_id());
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento não identificado.';
  END IF;

  IF NOT public.is_super_admin() THEN
    IF v_empresa_id IS DISTINCT FROM public.meu_empresa_id() OR NOT public.is_admin_workspace() THEN
      RAISE EXCEPTION 'Acesso negado ao financeiro deste estabelecimento.';
    END IF;
  END IF;

  -- Lock transacional por empresa para evitar duplicação em logins simultâneos
  PERFORM pg_advisory_xact_lock(hashtext('contas_padrao_' || v_empresa_id::text));

  SELECT count(*)
  INTO v_qtd
  FROM public.contas_financeiras
  WHERE empresa_id = v_empresa_id
    AND deletado_em IS NULL;

  IF v_qtd = 0 THEN
    INSERT INTO public.contas_financeiras (
      empresa_id, nome, tipo, saldo_inicial, cor, icone,
      recebe_dinheiro_pdv, recebe_digital_pdv, ativo, padrao
    )
    VALUES
      (
        v_empresa_id, 'Caixa Gaveta (Dinheiro)', 'dinheiro', 0, 'emerald', 'banknote',
        true, false, true, true
      ),
      (
        v_empresa_id, 'Conta Bancária / PIX', 'banco', 0, 'sky', 'landmark',
        false, true, true, false
      );
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.padrao DESC, c.created_at ASC), '[]'::jsonb)
  INTO v_result
  FROM public.contas_financeiras c
  WHERE c.empresa_id = v_empresa_id
    AND c.deletado_em IS NULL;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. RPC ATÔMICA: REGISTRAR NOTA DE COMPRA -> ATUALIZA ESTOQUE + DEBITA CAIXA
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_nota_compra_estoque(
  p_empresa_id uuid,
  p_fornecedor text,
  p_numero_nota text DEFAULT NULL,
  p_data_compra date DEFAULT CURRENT_DATE,
  p_itens jsonb DEFAULT '[]'::jsonb,
  p_valor_extras numeric DEFAULT 0,
  p_forma_pagamento text DEFAULT 'PIX',
  p_conta_id uuid DEFAULT NULL,
  p_lancar_no_caixa boolean DEFAULT true,
  p_observacoes text DEFAULT NULL,
  p_usuario_nome text DEFAULT 'Administrador'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_nota_id uuid;
  v_mov_id uuid := NULL;
  v_data_compra date;
  v_data_mov timestamptz;
  v_item jsonb;
  v_prod_id integer;
  v_prod_nome text;
  v_qtd integer;
  v_unit numeric(12,2);
  v_sub numeric(12,2);
  v_valor_itens numeric(12,2) := 0;
  v_valor_extras numeric(12,2) := COALESCE(p_valor_extras, 0);
  v_valor_total numeric(12,2) := 0;
  v_fornecedor text := NULLIF(TRIM(p_fornecedor), '');
  v_numero_nota text := NULLIF(TRIM(p_numero_nota), '');
  v_usuario text := COALESCE(NULLIF(TRIM(p_usuario_nome), ''), 'Administrador');
  v_conta_valida uuid;
  v_descricao text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.';
  END IF;

  v_empresa_id := COALESCE(p_empresa_id, public.meu_empresa_id());
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Estabelecimento não encontrado.';
  END IF;

  IF NOT public.is_super_admin() THEN
    IF v_empresa_id IS DISTINCT FROM public.meu_empresa_id() OR NOT public.is_admin_workspace() THEN
      RAISE EXCEPTION 'Apenas gerentes/administradores podem lançar notas de compra.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = v_empresa_id
        AND status_assinatura IN ('ativa', 'degustacao')
        AND (data_vencimento IS NULL OR data_vencimento::date >= CURRENT_DATE)
    ) THEN
      RAISE EXCEPTION 'Assinatura inativa para registrar movimentações.';
    END IF;
  END IF;

  IF v_fornecedor IS NULL THEN
    RAISE EXCEPTION 'Informe o fornecedor ou descrição da compra.';
  END IF;

  IF p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' OR jsonb_array_length(p_itens) = 0 THEN
    RAISE EXCEPTION 'Adicione pelo menos 1 produto na nota de compra.';
  END IF;

  v_data_compra := COALESCE(p_data_compra, CURRENT_DATE);
  IF v_data_compra = (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    v_data_mov := now();
  ELSE
    v_data_mov := ((v_data_compra::text || ' 12:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  IF COALESCE(p_lancar_no_caixa, true) THEN
    IF p_conta_id IS NULL THEN
      RAISE EXCEPTION 'Selecione a conta de onde o pagamento da nota será debitado.';
    END IF;
    SELECT id INTO v_conta_valida
    FROM public.contas_financeiras
    WHERE id = p_conta_id
      AND empresa_id = v_empresa_id
      AND deletado_em IS NULL
      AND ativo = true;
    IF v_conta_valida IS NULL THEN
      RAISE EXCEPTION 'Conta financeira selecionada inválida ou inativa.';
    END IF;
  END IF;

  -- Cria cabeçalho da nota inicialmente para vincular os itens e logs de estoque
  INSERT INTO public.notas_compra_estoque (
    empresa_id, fornecedor, numero_nota, data_compra,
    valor_itens, valor_extras, valor_total, forma_pagamento,
    conta_id, lancar_no_caixa, status, observacoes, usuario_nome
  )
  VALUES (
    v_empresa_id, v_fornecedor, v_numero_nota, v_data_compra,
    0, ROUND(v_valor_extras, 2), 0, COALESCE(NULLIF(TRIM(p_forma_pagamento), ''), 'PIX'),
    CASE WHEN COALESCE(p_lancar_no_caixa, true) THEN p_conta_id ELSE NULL END,
    COALESCE(p_lancar_no_caixa, true), 'ativa', NULLIF(TRIM(p_observacoes), ''), v_usuario
  )
  RETURNING id INTO v_nota_id;

  -- Processa cada item com lock no produto para evitar race conditions de estoque
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens)
  LOOP
    v_prod_id := (v_item->>'produto_id')::integer;
    v_qtd := (v_item->>'quantidade')::integer;
    v_unit := ROUND(COALESCE((v_item->>'valor_unitario')::numeric, 0), 2);

    IF v_prod_id IS NULL OR v_qtd IS NULL OR v_qtd <= 0 OR v_unit < 0 THEN
      RAISE EXCEPTION 'Item da nota inválido (verifique produto, quantidade e custo unitário).';
    END IF;

    SELECT nome INTO v_prod_nome
    FROM public.produtos
    WHERE id = v_prod_id
      AND empresa_id = v_empresa_id
      AND deletado_em IS NULL
    FOR UPDATE;

    IF v_prod_nome IS NULL THEN
      RAISE EXCEPTION 'Produto ID % não encontrado neste estabelecimento.', v_prod_id;
    END IF;

    v_sub := ROUND(v_qtd * v_unit, 2);
    v_valor_itens := v_valor_itens + v_sub;

    UPDATE public.produtos
    SET estoque = COALESCE(estoque, 0) + v_qtd,
        preco_custo = v_unit
    WHERE id = v_prod_id
      AND empresa_id = v_empresa_id;

    INSERT INTO public.itens_nota_compra (
      nota_id, empresa_id, produto_id, produto_nome, quantidade, valor_unitario, valor_total_item
    )
    VALUES (
      v_nota_id, v_empresa_id, v_prod_id, v_prod_nome, v_qtd, v_unit, v_sub
    );

    INSERT INTO public.historico_estoque (
      empresa_id, produto_id, produto_nome, tipo, quantidade, preco_custo, usuario_nome, data, nota_compra_id
    )
    VALUES (
      v_empresa_id, v_prod_id, v_prod_nome, 'entrada', v_qtd, v_unit, v_usuario, v_data_mov, v_nota_id
    );
  END LOOP;

  v_valor_total := GREATEST(0, ROUND(v_valor_itens + v_valor_extras, 2));

  IF COALESCE(p_lancar_no_caixa, true) AND v_valor_total > 0 THEN
    v_descricao := 'Compra Estoque: ' || v_fornecedor;
    IF v_numero_nota IS NOT NULL THEN
      v_descricao := v_descricao || ' (NF ' || v_numero_nota || ')';
    END IF;

    INSERT INTO public.movimentacoes_caixa (
      empresa_id, conta_id, nota_compra_id, tipo, categoria, metodo_pagamento,
      valor, data_movimentacao, descricao, usuario_nome
    )
    VALUES (
      v_empresa_id, p_conta_id, v_nota_id, 'saida', 'Compras / Estoque',
      COALESCE(NULLIF(TRIM(p_forma_pagamento), ''), 'PIX'),
      v_valor_total, v_data_mov, v_descricao, v_usuario
    )
    RETURNING id INTO v_mov_id;
  END IF;

  UPDATE public.notas_compra_estoque
  SET valor_itens = ROUND(v_valor_itens, 2),
      valor_total = v_valor_total,
      movimentacao_caixa_id = v_mov_id
  WHERE id = v_nota_id;

  RETURN jsonb_build_object(
    'nota_id', v_nota_id,
    'movimentacao_caixa_id', v_mov_id,
    'valor_itens', ROUND(v_valor_itens, 2),
    'valor_total', v_valor_total
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. RPC ATÔMICA: ESTORNAR NOTA DE COMPRA (REVERTE ESTOQUE + ESTORNA CAIXA)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.estornar_nota_compra_estoque(
  p_nota_id uuid,
  p_usuario_nome text DEFAULT 'Administrador'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota public.notas_compra_estoque%ROWTYPE;
  v_item public.itens_nota_compra%ROWTYPE;
  v_usuario text := COALESCE(NULLIF(TRIM(p_usuario_nome), ''), 'Administrador');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.';
  END IF;

  SELECT * INTO v_nota
  FROM public.notas_compra_estoque
  WHERE id = p_nota_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nota de compra não encontrada.';
  END IF;

  IF NOT public.is_super_admin() THEN
    IF v_nota.empresa_id IS DISTINCT FROM public.meu_empresa_id() OR NOT public.is_admin_workspace() THEN
      RAISE EXCEPTION 'Acesso negado ao estorno desta nota.';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.empresas
      WHERE id = v_nota.empresa_id
        AND status_assinatura IN ('ativa', 'degustacao')
        AND (data_vencimento IS NULL OR data_vencimento::date >= CURRENT_DATE)
    ) THEN
      RAISE EXCEPTION 'Assinatura inativa para estornar notas.';
    END IF;
  END IF;

  IF v_nota.status = 'estornada' THEN
    RAISE EXCEPTION 'Esta nota de compra já foi estornada anteriormente.';
  END IF;

  FOR v_item IN
    SELECT * FROM public.itens_nota_compra WHERE nota_id = p_nota_id
  LOOP
    PERFORM id
    FROM public.produtos
    WHERE id = v_item.produto_id
      AND empresa_id = v_nota.empresa_id
    FOR UPDATE;

    UPDATE public.produtos
    SET estoque = GREATEST(0, COALESCE(estoque, 0) - v_item.quantidade)
    WHERE id = v_item.produto_id
      AND empresa_id = v_nota.empresa_id;
  END LOOP;

  DELETE FROM public.historico_estoque
  WHERE nota_compra_id = p_nota_id
    AND empresa_id = v_nota.empresa_id;

  UPDATE public.movimentacoes_caixa
  SET deletado_em = now()
  WHERE nota_compra_id = p_nota_id
    AND empresa_id = v_nota.empresa_id
    AND deletado_em IS NULL;

  UPDATE public.notas_compra_estoque
  SET status = 'estornada',
      cancelado_por = v_usuario,
      data_cancelamento = now()
  WHERE id = p_nota_id;

  RETURN jsonb_build_object('status', 'estornada', 'nota_id', p_nota_id);
END;
$$;

-- Permissões das RPCs
GRANT EXECUTE ON FUNCTION public.garantir_contas_financeiras_padrao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_nota_compra_estoque(uuid, text, text, date, jsonb, numeric, text, uuid, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.estornar_nota_compra_estoque(uuid, text) TO authenticated;

-- Publicação Realtime segura (ignora caso já exista na publicação)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.contas_financeiras;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_caixa;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notas_compra_estoque;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
