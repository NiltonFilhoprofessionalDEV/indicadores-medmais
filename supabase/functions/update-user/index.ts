import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, resolveUserManagementCaller } from '../_shared/caller-guard.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders()

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Configuração do Supabase não encontrada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const gate = await resolveUserManagementCaller(supabaseAdmin, authHeader, corsHeaders)
    if ('response' in gate) return gate.response
    const caller = gate.ctx

    const { id, nome, role, base_id, equipe_id, email, password, acesso_gerente_sci } = await req.json()

    if (!id || !nome || !role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: id, nome, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const acessoGerenteSciDefinido = typeof acesso_gerente_sci === 'boolean'
    if (acessoGerenteSciDefinido && role !== 'chefe') {
      return new Response(JSON.stringify({ error: 'acesso_gerente_sci só se aplica a Chefes de Equipe' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (role === 'chefe' && (!base_id || !equipe_id)) {
      return new Response(JSON.stringify({ error: 'Chefe de Equipe precisa de base_id e equipe_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (role === 'auxiliar' && (!base_id || !equipe_id)) {
      return new Response(JSON.stringify({ error: 'Líder de Resgate (auxiliar) precisa de base_id e equipe_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (role === 'gerente_sci' && !base_id) {
      return new Response(JSON.stringify({ error: 'Gerente de SCI precisa de base_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (profileCheckError || !existingProfile) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const existing = existingProfile as { role: string; base_id: string | null; equipe_id: string | null }

    if (caller.scope === 'base') {
      if (role === 'geral') {
        return new Response(JSON.stringify({ error: 'Não é permitido definir perfil Administrador global.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (existing.role === 'geral') {
        return new Response(JSON.stringify({ error: 'Não é permitido alterar Administrador global.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (existing.base_id !== caller.baseId) {
        return new Response(JSON.stringify({ error: 'Só é permitido alterar usuários da sua base.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const b = base_id as string | null | undefined
      if (
        (role === 'chefe' || role === 'auxiliar' || role === 'gerente_sci') &&
        b &&
        String(b) !== caller.baseId
      ) {
        return new Response(JSON.stringify({ error: 'base_id deve ser a da sua base.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const updateData: {
      nome: string
      role: string
      base_id: string | null
      equipe_id: string | null
      acesso_gerente_sci?: boolean
    } = {
      nome,
      role,
      base_id: role === 'chefe' || role === 'gerente_sci' || role === 'auxiliar' ? base_id : null,
      equipe_id: role === 'chefe' || role === 'auxiliar' ? equipe_id : null,
    }

    if (role !== 'chefe') {
      updateData.acesso_gerente_sci = false
    } else if (caller.scope === 'global') {
      if (acessoGerenteSciDefinido) {
        updateData.acesso_gerente_sci = acesso_gerente_sci
      } else {
        updateData.acesso_gerente_sci = false
      }
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').update(updateData).eq('id', id)

    if (profileError) {
      return new Response(JSON.stringify({ error: `Erro ao atualizar perfil: ${profileError.message}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authUpdateData: { email?: string; password?: string } = {}

    if (email && email.trim() !== '') {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      if (authUser?.user?.email !== email) {
        authUpdateData.email = email
      }
    }

    if (password && password.trim() !== '') {
      authUpdateData.password = password
    }

    if (Object.keys(authUpdateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdateData)

      if (authError) {
        console.warn('Erro ao atualizar credenciais de autenticação:', authError.message)
        return new Response(
          JSON.stringify({
            success: true,
            userId: id,
            warning: `Perfil atualizado, mas houve erro ao atualizar credenciais: ${authError.message}`,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(JSON.stringify({ success: true, userId: id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Erro na Edge Function:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
    })
  }
})
