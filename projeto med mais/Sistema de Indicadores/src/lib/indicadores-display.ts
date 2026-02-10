/**
 * Override de nomes de indicadores para exibição na UI.
 * Garante que o nome exibido seja o atual mesmo antes de atualizar o banco.
 */
export const INDICADOR_DISPLAY_NAME_OVERRIDE: Record<string, string> = {
  treinamento: 'PTR-BA - Horas treinamento diário',
}

export function getIndicadorDisplayName(indicador: {
  schema_type: string
  nome: string
}): string {
  return INDICADOR_DISPLAY_NAME_OVERRIDE[indicador.schema_type] ?? indicador.nome
}
