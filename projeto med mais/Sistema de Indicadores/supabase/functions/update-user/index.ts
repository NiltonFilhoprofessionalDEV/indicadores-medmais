import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { id, nome, role, base_id, equipe_id, email, password, acesso_gerente_sci } = await req.json()

    // Validação básica
    if (!id || !nome || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: id, nome, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // acesso_gerente_sci só pode ser alterado por Gerente Geral (role = 'geral')
    const acessoGerenteSciDefinido = typeof acesso_gerente_sci === 'boolean'
    if (acessoGerenteSciDefinido && role !== 'chefe') {
      return new Response(
        JSON.stringify({ error: 'acesso_gerente_sci só se aplica a Chefes de Equipe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar se chefe precisa de base e equipe
    if (role === 'chefe' && (!base_id || !equipe_id)) {
      return new Response(
        JSON.stringify({ error: 'Chefe de Equipe precisa de base_id e equipe_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar se gerente_sci precisa de base (equipe = null)
    if (role === 'gerente_sci' && !base_id) {
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

    // Se está alterando acesso_gerente_sci, verificar se o chamador é Gerente Geral (só então aplicamos o novo valor)
    let podeAlterarAcessoGerenteSci = false
    if (acessoGerenteSciDefinido) {
      const jwt = authHeader.replace('Bearer ', '').trim()
      let callerId: string | null = null
      try {
        const payloadB64 = jwt.split('.')[1]
        if (payloadB64) {
          const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
          const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
          const payload = JSON.parse(atob(padded))
          callerId = payload.sub ?? null
        }
      } catch {
        // ignore
      }
      if (callerId) {
        const { data: callerProfile } = await supabaseAdmin.from('profiles').select('role').eq('id', callerId).single()
        if (callerProfile?.role === 'geral') {
          podeAlterarAcessoGerenteSci = true
        } else {
          return new Response(
            JSON.stringify({ error: 'Apenas Gerente Geral pode alterar o acesso ao painel Gerente de SCI' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
      // Se não conseguimos identificar o chamador como geral, não alteramos acesso_gerente_sci (mas o resto do update segue)
    }

    // Verificar se o usuário existe
    const { data: existingProfile, error: profileCheckError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (profileCheckError || !existingProfile) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Atualizar perfil na tabela profiles
    const updateData: {
      nome: string
      role: string
      base_id: string | null
      equipe_id: string | null
      acesso_gerente_sci?: boolean
    } = {
      nome,
      role,
      base_id: role === 'chefe' || role === 'gerente_sci' ? base_id : null,
      equipe_id: role === 'chefe' ? equipe_id : null,
    }
    if (role === 'chefe' && acessoGerenteSciDefinido && podeAlterarAcessoGerenteSci) {
      updateData.acesso_gerente_sci = acesso_gerente_sci
    }
    if (role === 'chefe' && !acessoGerenteSciDefinido) {
      updateData.acesso_gerente_sci = false
    }
    if (role !== 'chefe') {
      updateData.acesso_gerente_sci = false
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', id)

    if (profileError) {
      return new Response(
        JSON.stringify({ error: `Erro ao atualizar perfil: ${profileError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Atualizar email ou senha se fornecidos
    const authUpdateData: { email?: string; password?: string } = {}

    if (email && email.trim() !== '') {
      // Buscar email atual do usuário
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id)
      
      // Só atualiza se o email for diferente
      if (authUser?.user?.email !== email) {
        authUpdateData.email = email
      }
    }

    if (password && password.trim() !== '') {
      authUpdateData.password = password
    }

    // Atualizar credenciais de autenticação se necessário
    if (Object.keys(authUpdateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdateData)

      if (authError) {
        // Se der erro ao atualizar auth, não reverte o perfil (já foi atualizado)
        console.warn('Erro ao atualizar credenciais de autenticação:', authError.message)
        return new Response(
          JSON.stringify({ 
            success: true, 
            userId: id,
            warning: `Perfil atualizado, mas houve erro ao atualizar credenciais: ${authError.message}`
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true, userId: id }),
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
