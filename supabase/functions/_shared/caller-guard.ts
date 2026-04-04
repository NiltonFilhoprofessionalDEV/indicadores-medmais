/**
 * Autorização para funções de gestão de usuários:
 * - Valida JWT via Auth API (não confiar só em payload decodificado manualmente).
 * - Lê role (e flags) em public.profiles no banco.
 * - global: role = 'geral'
 * - base: gerente_sci ou chefe com acesso_gerente_sci — operações restritas à própria base_id
 */

export type CorsHeaders = Record<string, string>

export function getCorsHeaders(): CorsHeaders {
  const allow = Deno.env.get('CORS_ALLOWED_ORIGIN')?.trim() || '*'
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

export type UserMgmtContext =
  | { scope: 'global'; userId: string }
  | { scope: 'base'; userId: string; baseId: string }

type ProfileRow = {
  role: string
  base_id: string | null
  acesso_gerente_sci: boolean | null
}

// deno-lint-ignore no-explicit-any
export async function resolveUserManagementCaller(
  supabaseAdmin: any,
  authHeader: string | null,
  corsHeaders: CorsHeaders
): Promise<{ response: Response } | { ctx: UserMgmtContext }> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      response: new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    }
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return {
      response: new Response(JSON.stringify({ error: 'Token ausente' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    }
  }

  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData?.user?.id) {
    return {
      response: new Response(JSON.stringify({ error: 'Token inválido ou expirado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    }
  }

  const uid = userData.user.id
  const { data: profile, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('role, base_id, acesso_gerente_sci')
    .eq('id', uid)
    .maybeSingle()

  if (profErr || !profile) {
    return {
      response: new Response(JSON.stringify({ error: 'Perfil não encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    }
  }

  const p = profile as ProfileRow

  if (p.role === 'geral') {
    return { ctx: { scope: 'global', userId: uid } }
  }

  if (p.role === 'gerente_sci' && p.base_id) {
    return { ctx: { scope: 'base', userId: uid, baseId: p.base_id } }
  }

  if (p.role === 'chefe' && p.acesso_gerente_sci === true && p.base_id) {
    return { ctx: { scope: 'base', userId: uid, baseId: p.base_id } }
  }

  return {
    response: new Response(
      JSON.stringify({
        error:
          'Acesso negado. Apenas Administrador global, Gerente de SCI ou Chefe com acesso ao painel Gerente de SCI podem usar esta função.',
      }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    ),
  }
}
