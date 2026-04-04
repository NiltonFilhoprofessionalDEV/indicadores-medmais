/**
 * Reduz risco de XSS armazenado em JSONB: remove tags HTML e padrões comuns de handlers inline.
 * Camada complementar ao escape padrão do React na renderização.
 */
function stripDangerousMarkup(input: string): string {
  let s = input
  s = s.replace(/<\/(?:script|iframe|object|embed|style)[^>]*>/gi, '')
  s = s.replace(/<(?:script|iframe|object|embed|style)[^>]*>[\s\S]*?<\/(?:script|iframe|object|embed|style)>/gi, '')
  s = s.replace(/<[^>]+>/g, '')
  s = s.replace(/javascript:/gi, '')
  s = s.replace(/on\w+\s*=/gi, '')
  return s
}

/**
 * Percorre recursivamente objetos/arrays e sanitiza strings (ex.: observações, textos livres).
 */
export function sanitizeLancamentoConteudo(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return stripDangerousMarkup(value)
  if (Array.isArray(value)) return value.map((item) => sanitizeLancamentoConteudo(item))
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(o)) {
      out[key] = sanitizeLancamentoConteudo(o[key])
    }
    return out
  }
  return value
}
