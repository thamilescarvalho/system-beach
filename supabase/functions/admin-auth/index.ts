// supabase/functions/admin-auth/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

function getCorsHeaders(req: Request) {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || req.headers.get('Origin') || '*'
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

interface AdminAuthPayload {
  action?: 'createUser' | 'updateUser' | 'deleteUser' | 'deleteWorkspace';
  userId?: string;
  empresaId?: string;
  nome?: string;
  cargo?: 'admin' | 'garcom';
  avatar?: string;
  newEmail?: string;
  status?: 'ativo' | 'bloqueado';
  password?: string;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização ausente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Sessão inválida ou expirada.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const isSuperAdminEmail = user.email?.toLowerCase() === 'ancorazero85@gmail.com'

    const { data: perfil } = await supabaseAdmin
      .from('usuarios')
      .select('cargo, empresa_id, status')
      .eq('id', user.id)
      .maybeSingle()

    const isSuperAdmin = isSuperAdminEmail || perfil?.cargo === 'super_admin'
    const isAdmin = isSuperAdmin || perfil?.cargo === 'admin'

    if (!isAdmin || (perfil && perfil.status === 'bloqueado')) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado: privilégios insuficientes.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const body = (await req.json()) as AdminAuthPayload
    const { action, userId, empresaId, nome, cargo, avatar, newEmail, status, password } = body

    // AÇÃO 1: CRIAR USUÁRIO ATOMICAMENTE (AUTH + PERFIL PUBLIC.USUARIOS COM ROLLBACK)
    if (action === 'createUser') {
      const emailLimpo = newEmail?.trim().toLowerCase()
      if (!emailLimpo || !password || password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'E-mail válido e senha de no mínimo 6 caracteres são obrigatórios.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Define o empresa_id alvo respeitando isolamento Multi-Tenant
      const targetEmpresaId = isSuperAdmin ? (empresaId || perfil?.empresa_id) : (perfil?.empresa_id || empresaId)
      const targetCargo = cargo === 'admin' ? 'admin' : 'garcom'

      if (!targetEmpresaId) {
        return new Response(
          JSON.stringify({ error: 'Identificador do estabelecimento (empresaId) é obrigatório para vincular o usuário.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailLimpo,
        password,
        email_confirm: true,
        user_metadata: {
          empresa_id: targetEmpresaId,
          cargo: targetCargo,
        }
      })

      if (createErr || !newUser.user) {
        throw createErr || new Error('Não foi possível criar a credencial de autenticação.')
      }

      // Se o nome foi enviado, já cria o registro na tabela public.usuarios atomicamente
      if (nome && targetEmpresaId) {
        const { error: insertPerfilErr } = await supabaseAdmin
          .from('usuarios')
          .upsert([{
            id: newUser.user.id,
            nome: nome.trim(),
            email: emailLimpo,
            cargo: targetCargo,
            status: 'ativo',
            avatar: avatar || (targetCargo === 'admin' ? '👑' : '👤'),
            empresa_id: targetEmpresaId
          }])

        if (insertPerfilErr) {
          // Rollback: remove do auth.users para não deixar o e-mail preso/órfão
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
          throw insertPerfilErr
        }
      }

      return new Response(
        JSON.stringify({ success: true, user: newUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // AÇÃO 2: EXCLUIR WORKSPACE COMPLETO (EXCLUSIVO SUPER ADMIN - LIMPA AUTH.USERS E EMPRESA)
    if (action === 'deleteWorkspace') {
      if (perfil.cargo !== 'super_admin' || !empresaId) {
        return new Response(
          JSON.stringify({ error: 'Apenas o Super Admin pode excluir um Workspace completo.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      const { data: usuariosEmpresa } = await supabaseAdmin
        .from('usuarios')
        .select('id, cargo')
        .eq('empresa_id', empresaId)

      if (usuariosEmpresa) {
        for (const u of usuariosEmpresa) {
          if (u.cargo !== 'super_admin') {
            await supabaseAdmin.auth.admin.deleteUser(u.id).catch(() => null)
          }
        }
      }

      await supabaseAdmin.from('usuarios').delete().eq('empresa_id', empresaId)
      const { error: delEmpErr } = await supabaseAdmin.from('empresas').delete().eq('id', empresaId)
      if (delEmpErr) throw delEmpErr

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // VALIDAÇÃO MULTI-TENANT (PREVENÇÃO DE IDOR CROSS-TENANT PARA UPDATE / DELETE USER)
    if (userId) {
      const { data: alvo, error: alvoErr } = await supabaseAdmin
        .from('usuarios')
        .select('empresa_id, cargo')
        .eq('id', userId)
        .single()

      if (perfil.cargo !== 'super_admin') {
        if (alvoErr || !alvo || alvo.empresa_id !== perfil.empresa_id || alvo.cargo === 'super_admin') {
          return new Response(
            JSON.stringify({ error: 'Violação de segurança Multi-Tenant: usuário fora do seu workspace.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          )
        }
      }

      // AÇÃO 3: EXCLUIR / REVOGAR USUÁRIO
      if (action === 'deleteUser') {
        if (alvo?.cargo === 'super_admin') {
          return new Response(
            JSON.stringify({ error: 'Não é permitido excluir uma conta Super Admin.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
          )
        }

        if (perfil.cargo === 'super_admin') {
          await supabaseAdmin.from('usuarios').delete().eq('id', userId)
          await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => null)
        } else {
          await supabaseAdmin
            .from('usuarios')
            .update({ deletado_em: new Date().toISOString(), status: 'bloqueado' })
            .eq('id', userId)
            .eq('empresa_id', perfil.empresa_id)

          await supabaseAdmin.auth.admin.updateUserById(userId, {
            ban_duration: '876000h'
          }).catch(() => null)
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // AÇÃO 4: ATUALIZAR E-MAIL OU STATUS DE BLOQUEIO NO AUTH
      if (newEmail) {
        const { error: emailErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: newEmail.trim().toLowerCase(),
          email_confirm: true
        })
        if (emailErr) throw emailErr
      }

      if (status) {
        const isBanned = status === 'bloqueado'
        const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: isBanned ? '876000h' : 'none'
        })
        if (banErr) throw banErr
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: unknown) {
    let errorMessage = error instanceof Error ? error.message : 'Erro interno no servidor.'
    if (errorMessage.includes('already registered') || errorMessage.includes('User already registered')) {
      errorMessage = 'Este e-mail já está cadastrado no sistema.'
    } else if (errorMessage.includes('Password should be at least')) {
      errorMessage = 'A senha deve conter no mínimo 6 caracteres.'
    } else if (errorMessage.includes('rate limit')) {
      errorMessage = 'Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente novamente.'
    }
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
