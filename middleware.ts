/**
 * Proxy HTTP para o host real do Supabase na mesma origem do app (ex.: /api/supabase/auth/v1/...).
 * Ajuda quando redes corporativas ou DNS bloqueiam chamadas diretas a *.supabase.co.
 *
 * Variáveis na Vercel (Production):
 * - VITE_SUPABASE_URL = https://<seu-dominio>/api/supabase  (URL que o browser usa)
 * - SUPABASE_URL = https://<ref>.supabase.co  (destino deste proxy; não use VITE_ para não ir ao bundle)
 *
 * Opcional: SUPABASE_PROXY_ALLOWED_ORIGIN_HOSTS = host1.com,host2.vercel.app
 *   (hosts adicionais permitidos no header Origin; por padrão só o mesmo Host da requisição)
 */
import { next } from '@vercel/functions/middleware'

const PROXY_PREFIX = '/api/supabase'

const ALLOWED_PATH_PREFIXES = [
  '/auth/v1/',
  '/rest/v1/',
  '/storage/v1/',
  '/realtime/v1/',
  '/functions/v1/',
  '/graphql/v1/',
] as const

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PREFIXES.some((p) => path === p || path.startsWith(p))
}

function normalizeUpstreamBase(raw: string | undefined): string | null {
  if (!raw?.trim()) return null
  return raw.trim().replace(/\/+$/, '')
}

function parseAllowedExtraOrigins(): string[] {
  const raw = process.env.SUPABASE_PROXY_ALLOWED_ORIGIN_HOSTS ?? ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function originAllowed(request: Request, requestUrl: URL, originHeader: string | null): boolean {
  if (!originHeader) return true
  let originHost: string
  try {
    originHost = new URL(originHeader).hostname.toLowerCase()
  } catch {
    return false
  }
  const reqHost = requestUrl.hostname.toLowerCase()
  if (originHost === reqHost) return true
  return parseAllowedExtraOrigins().includes(originHost)
}

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
])

export const config = {
  matcher: ['/api/supabase', '/api/supabase/:path*'],
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith(PROXY_PREFIX)) {
    return next()
  }

  const upstreamBase = normalizeUpstreamBase(process.env.SUPABASE_URL)
  if (!upstreamBase) {
    return new Response(
      JSON.stringify({
        message: 'Proxy Supabase indisponível: defina SUPABASE_URL na Vercel com a URL direta do projeto.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    )
  }

  const origin = request.headers.get('origin')
  if (!originAllowed(request, url, origin)) {
    return new Response(JSON.stringify({ message: 'Origin não autorizada para o proxy Supabase.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  let suffix = url.pathname.slice(PROXY_PREFIX.length)
  if (!suffix.startsWith('/')) suffix = `/${suffix}`
  if (suffix === '') suffix = '/'

  if (!isAllowedPath(suffix)) {
    return new Response(JSON.stringify({ message: 'Rota não permitida pelo proxy.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const targetHref = `${upstreamBase}${suffix}${url.search}`

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin ?? '*',
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':
          request.headers.get('access-control-request-headers') ??
          'authorization, apikey, content-type, x-client-info, prefer, accept-profile, content-profile, accept',
        'Access-Control-Max-Age': '86400',
      },
    })
  }

  const upstreamHost = new URL(upstreamBase).host
  const outHeaders = new Headers()
  request.headers.forEach((value, key) => {
    const lk = key.toLowerCase()
    if (!HOP_BY_HOP.has(lk)) outHeaders.set(key, value)
  })
  outHeaders.set('Host', upstreamHost)

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const body = hasBody ? await request.arrayBuffer() : undefined

  const upstreamRes = await fetch(targetHref, {
    method: request.method,
    headers: outHeaders,
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'manual',
  })

  const status = upstreamRes.status
  if (upstreamRes.body == null && status >= 400) {
    return new Response(
      JSON.stringify({
        message: `Resposta vazia do Supabase (HTTP ${status}). Verifique SUPABASE_URL e o status do projeto.`,
        code: status,
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }

  const resHeaders = new Headers()
  upstreamRes.headers.forEach((value, key) => {
    const lk = key.toLowerCase()
    if (lk === 'transfer-encoding') return
    resHeaders.set(key, value)
  })

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers: resHeaders,
  })
}
