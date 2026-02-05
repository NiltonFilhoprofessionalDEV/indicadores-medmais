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
    const { id, nome, role, base_id, equipe_id, email, password } = await req.json()

    // Validação básica
    if (!id || !nome || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: id, nome, role' }),
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
    } = {
      nome,
      role,
      base_id: role === 'chefe' || role === 'gerente_sci' ? base_id : null,
      equipe_id: role === 'chefe' ? equipe_id : null,
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
