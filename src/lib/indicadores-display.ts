/**
 * Override de nomes de indicadores para exibição na UI.
 * Garante que o nome exibido seja o atual mesmo antes de atualizar o banco.
 */
export const INDICADOR_DISPLAY_NAME_OVERRIDE: Record<string, string> = {
  treinamento: 'PTR-BA - Horas treinamento diário',
  tempo_resposta: 'Exercício de Tempo Resposta',
}

export function getIndicadorDisplayName(indicador: {
  schema_type: string
  nome: string
}): string {
  return INDICADOR_DISPLAY_NAME_OVERRIDE[indicador.schema_type] ?? indicador.nome
}

/**
 * Ordena a lista de indicadores mantendo "PTR-BA - Horas treinamento diário" e "PTR-BA Extras"
 * sempre próximos um do outro (treinamento primeiro, depois ptr_ba_extras).
 * O restante da lista preserva a ordem original (ex.: ordem por nome).
 */
export function sortIndicadoresPtrBaProximos<T extends { schema_type: string }>(indicadores: T[]): T[] {
  if (!indicadores?.length) return indicadores ?? []
  const list = [...indicadores]
  const idxExtras = list.findIndex((i) => i.schema_type === 'ptr_ba_extras')
  if (idxExtras === -1) return list
  const [extras] = list.splice(idxExtras, 1)
  const idxTreino = list.findIndex((i) => i.schema_type === 'treinamento')
  if (idxTreino === -1) {
    list.push(extras)
    return list
  }
  list.splice(idxTreino + 1, 0, extras)
  return list
}
