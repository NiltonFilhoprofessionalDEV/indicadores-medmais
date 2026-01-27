import { parse } from 'date-fns'

/**
 * CORREÇÃO CRÍTICA DE TIMEZONE
 * Formata Date para armazenamento no banco (YYYY-MM-DD)
 * IMPORTANTE: Usa data LOCAL do usuário, ignorando timezones
 * NÃO usa .toISOString() pois isso converte para UTC e causa bug de D-1
 */
export function formatDateForStorage(date: Date): string {
  // Usa métodos locais para garantir o dia exato selecionado
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * CORREÇÃO CRÍTICA DE TIMEZONE
 * Formata string do banco (YYYY-MM-DD) para exibição (DD/MM/YYYY)
 * IMPORTANTE: Usa .split('-') para evitar instanciar Date e aplicar timezone
 * Não usa new Date(string) pois o navegador pode aplicar timezone novamente
 */
export function formatDateForDisplay(dateString: string): string {
  // Se já está no formato correto do banco (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }
  
  // Se vier com timezone (ISO), extrai apenas a parte da data
  if (dateString.includes('T')) {
    const datePart = dateString.split('T')[0]
    const [year, month, day] = datePart.split('-')
    return `${day}/${month}/${year}`
  }
  
  // Se já está em formato brasileiro, retorna como está
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString
  }
  
  // Fallback: retorna como está
  return dateString
}

/**
 * Converte data de formato brasileiro (dd/MM/yyyy) para ISO (yyyy-MM-DD)
 */
export function brDateToISO(dateStr: string): string {
  try {
    const date = parse(dateStr, 'dd/MM/yyyy', new Date())
    return formatDateForStorage(date)
  } catch {
    throw new Error('Data inválida')
  }
}

/**
 * Converte data de ISO (yyyy-MM-DD) para formato brasileiro (dd/MM/yyyy)
 * DEPRECATED: Use formatDateForDisplay() em vez disso
 */
export function isoToBrDate(dateStr: string): string {
  return formatDateForDisplay(dateStr)
}

/**
 * Formata data para input type="date" (yyyy-MM-dd)
 */
export function formatDateForInput(date: Date): string {
  return formatDateForStorage(date)
}

/**
 * Obtém data atual no formato YYYY-MM-DD (data local, não UTC)
 * CORREÇÃO: Garante que a data seja enviada como string local, não ISO UTC
 * Isso evita o problema de datas com um dia a menos (D-1)
 */
export function getCurrentDateLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Converte Date para string YYYY-MM-DD (data local, não UTC)
 * CORREÇÃO: Usa getFullYear(), getMonth(), getDate() para garantir data local
 */
export function dateToLocalString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Converte string de data (qualquer formato) para YYYY-MM-DD local
 * Se receber uma string ISO (com timezone), extrai apenas a parte da data
 */
export function normalizeDateToLocal(dateStr: string): string {
  // Se já está no formato YYYY-MM-DD, retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }
  
  // Se for ISO com timezone (YYYY-MM-DDTHH:mm:ss.sssZ), extrai apenas a data
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0]
  }
  
  // Tenta parsear e converter
  try {
    const date = new Date(dateStr)
    return dateToLocalString(date)
  } catch {
    // Se falhar, retorna como está (deixa o banco validar)
    return dateStr
  }
}