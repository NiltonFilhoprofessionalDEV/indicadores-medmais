/** Resolve rótulo do autor: nome gravado no registro, join profiles, mapa ou fallback. */
export function getLancamentoAutorDisplayName(l: {
  user_id: string | null
  autor_nome?: string | null
  profiles?: { nome: string } | null
}, profilesNomeMap?: Map<string, string>): string {
  const stored = l.autor_nome?.trim()
  if (stored) return stored
  const joinNome = l.profiles?.nome?.trim()
  if (joinNome) return joinNome
  if (l.user_id && profilesNomeMap?.get(l.user_id)) return profilesNomeMap.get(l.user_id) as string
  if (l.user_id) return `${l.user_id.slice(0, 8)}…`
  return '—'
}
