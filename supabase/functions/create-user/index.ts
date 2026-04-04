import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
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

    const { email, password, nome, role, base_id, equipe_id, acesso_gerente_sci } = await req.json()

    if (!email || !password || !nome || !role) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: email, password, nome, role' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const baseIdVal = (base_id && String(base_id).trim()) || ''
    const equipeIdVal = (equipe_id && String(equipe_id).trim()) || ''
    if ((role === 'chefe' || role === 'auxiliar') && (!baseIdVal || !equipeIdVal)) {
      return new Response(
        JSON.stringify({ error: 'Chefe de Equipe e Líder de Resgate precisam de base_id e equipe_id preenchidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (role === 'gerente_sci' && !baseIdVal) {
      return new Response(JSON.stringify({ error: 'Gerente de SCI precisa de base_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (caller.scope === 'base') {
      if (role === 'geral') {
        return new Response(JSON.stringify({ error: 'Não é permitido criar perfil Administrador global com seu nível de acesso.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (baseIdVal !== caller.baseId) {
        return new Response(JSON.stringify({ error: 'Só é permitido cadastrar usuários da sua base.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const acessoGerenteSciVal =
      role === 'chefe' && acesso_gerente_sci === true && caller.scope === 'global'

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ error: 'Erro ao criar usuário' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const insertBaseId = role === 'chefe' || role === 'gerente_sci' || role === 'auxiliar' ? baseIdVal || null : null
    const insertEquipeId = role === 'chefe' || role === 'auxiliar' ? equipeIdVal || null : null

    if ((role === 'chefe' || role === 'auxiliar') && (!insertBaseId || !insertEquipeId)) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Base e Equipe são obrigatórios para Chefe de Equipe e Líder de Resgate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (role === 'gerente_sci') {
      if (!insertBaseId) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(JSON.stringify({ error: 'Gerente de SCI precisa de uma Base selecionada' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const insertProfile: Record<string, unknown> = {
      id: authData.user.id,
      nome,
      role,
      base_id: insertBaseId,
      equipe_id: role === 'gerente_sci' ? null : insertEquipeId,
    }
    if (role === 'chefe') {
      insertProfile.acesso_gerente_sci = acessoGerenteSciVal === true
    }
    const { error: profileError } = await supabaseAdmin.from('profiles').insert(insertProfile)

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
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
