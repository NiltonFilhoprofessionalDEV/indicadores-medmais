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
    // Tentar fazer parse do JSON, tratando erros de corpo vazio ou inválido
    let body: { userId?: string } = {}
    
    try {
      const text = await req.text()
      if (text && text.trim().length > 0) {
        body = JSON.parse(text)
      } else {
        // Corpo vazio
        return new Response(
          JSON.stringify({ 
            error: 'Corpo da requisição vazio. Envie um JSON válido com userId.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (parseError: any) {
      // Se o erro for de JSON inválido
      if (parseError instanceof SyntaxError || 
          parseError.message?.includes('JSON') || 
          parseError.message?.includes('Unexpected end')) {
        return new Response(
          JSON.stringify({ 
            error: 'Corpo da requisição inválido. Envie um JSON válido com userId.',
            details: parseError.message
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw parseError
    }

    const { userId } = body

    // Validação básica
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório no corpo da requisição' }),
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

    // Deletar usuário do auth
    // O perfil será deletado automaticamente pelo CASCADE (ON DELETE CASCADE)
    // Os lançamentos também serão deletados automaticamente quando o perfil for deletado
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Erro ao deletar usuário do auth:', authError)
      return new Response(
        JSON.stringify({ 
          error: `Erro ao deletar usuário: ${authError.message}`,
          code: authError.status || 'UNKNOWN'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário removido com sucesso' }),
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
