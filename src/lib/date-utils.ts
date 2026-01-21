import { format, parse } from 'date-fns'

/**
 * Converte data de formato brasileiro (dd/MM/yyyy) para ISO (yyyy-MM-DD)
 */
export function brDateToISO(dateStr: string): string {
  try {
    const date = parse(dateStr, 'dd/MM/yyyy', new Date())
    return format(date, 'yyyy-MM-dd')
  } catch {
    throw new Error('Data inválida')
  }
}

/**
 * Converte data de ISO (yyyy-MM-DD) para formato brasileiro (dd/MM/yyyy)
 */
export function isoToBrDate(dateStr: string): string {
  try {
    const date = parse(dateStr, 'yyyy-MM-dd', new Date())
    return format(date, 'dd/MM/yyyy')
  } catch {
    return dateStr
  }
}

/**
 * Formata data para input type="date" (yyyy-MM-dd)
 */
export function formatDateForInput(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
