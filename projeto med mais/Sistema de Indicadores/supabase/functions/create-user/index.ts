import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, nome, role, base_id, equipe_id, acesso_gerente_sci } = await req.json()

    // Validação básica
    if (!email || !password || !nome || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, password, nome, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar e sanitizar base_id e equipe_id (evitar "" que vira NULL em colunas UUID)
    const baseIdVal = (base_id && String(base_id).trim()) || ''
    const equipeIdVal = (equipe_id && String(equipe_id).trim()) || ''
    if ((role === 'chefe' || role === 'auxiliar') && (!baseIdVal || !equipeIdVal)) {
      return new Response(
        JSON.stringify({ error: 'Chefe de Equipe e Líder de Resgate precisam de base_id e equipe_id preenchidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar se gerente_sci precisa de base (equipe = null)
    if (role === 'gerente_sci' && !baseIdVal) {
      return new Response(
        JSON.stringify({ error: 'Gerente de SCI precisa de base_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente com Service Role Key (acesso admin)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do Supabase não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // acesso_gerente_sci só pode ser true se o chamador for Gerente Geral (role = 'geral')
    const acessoGerenteSciVal = role === 'chefe' && acesso_gerente_sci === true
    if (acessoGerenteSciVal) {
      const jwt = authHeader.replace('Bearer ', '').trim()
      let callerId: string | null = null
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]))
        callerId = payload.sub ?? null
      } catch {
        // ignore
      }
      if (callerId) {
        const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', callerId).single()
        if (callerProfile?.role !== 'geral') {
          return new Response(
            JSON.stringify({ error: 'Apenas Gerente Geral pode conceder acesso ao painel Gerente de SCI' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // Criar usuário no auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inserir perfil na tabela profiles (usar valores sanitizados para evitar "" que vira NULL em UUID)
    const insertBaseId = role === 'chefe' || role === 'gerente_sci' || role === 'auxiliar' ? baseIdVal || null : null
    const insertEquipeId = role === 'chefe' || role === 'auxiliar' ? equipeIdVal || null : null

    // Validar chefe e auxiliar (Líder de Resgate): base e equipe obrigatórios
    if ((role === 'chefe' || role === 'auxiliar') && (!insertBaseId || !insertEquipeId)) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: 'Base e Equipe são obrigatórios para Chefe de Equipe e Líder de Resgate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar gerente_sci: base obrigatório, equipe deve ser null
    if (role === 'gerente_sci') {
      if (!insertBaseId) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ error: 'Gerente de SCI precisa de uma Base selecionada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    // Para gerente_sci: equipe_id deve ser explicitamente null (constraint exige base_id NOT NULL, equipe_id NULL)
    const insertProfile: Record<string, unknown> = {
      id: authData.user.id,
      nome,
      role,
      base_id: insertBaseId,
      equipe_id: role === 'gerente_sci' ? null : insertEquipeId,
    }
    // auxiliar (Líder de Resgate) não tem acesso_gerente_sci; só chefe pode ter
    if (role === 'chefe') {
      insertProfile.acesso_gerente_sci = acessoGerenteSciVal === true
    }
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(insertProfile)

    if (profileError) {
      // Se der erro ao criar perfil, deleta o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Erro desconhecido'
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
