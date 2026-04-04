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

    let body: { userId?: string } = {}

    try {
      const text = await req.text()
      if (text && text.trim().length > 0) {
        body = JSON.parse(text)
      } else {
        return new Response(
          JSON.stringify({ error: 'Corpo da requisição vazio. Envie um JSON válido com userId.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (parseError: unknown) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError)
      if (
        parseError instanceof SyntaxError ||
        msg.includes('JSON') ||
        msg.includes('Unexpected end')
      ) {
        return new Response(
          JSON.stringify({
            error: 'Corpo da requisição inválido. Envie um JSON válido com userId.',
            details: msg,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw parseError
    }

    const { userId } = body

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId é obrigatório no corpo da requisição' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (caller.scope === 'base') {
      const { data: target, error: tErr } = await supabaseAdmin
        .from('profiles')
        .select('role, base_id')
        .eq('id', userId)
        .maybeSingle()
      if (tErr || !target) {
        return new Response(JSON.stringify({ error: 'Usuário alvo não encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const tr = target as { role: string; base_id: string | null }
      if (tr.role === 'geral') {
        return new Response(JSON.stringify({ error: 'Não é permitido excluir Administrador global.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (tr.base_id !== caller.baseId) {
        return new Response(JSON.stringify({ error: 'Só é permitido excluir usuários da sua base.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Erro ao deletar usuário do auth:', authError)
      return new Response(
        JSON.stringify({
          error: `Erro ao deletar usuário: ${authError.message}`,
          code: authError.status || 'UNKNOWN',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ success: true, message: 'Usuário removido com sucesso' }), {
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
