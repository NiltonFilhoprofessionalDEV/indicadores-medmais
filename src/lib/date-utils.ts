/**
 * Utilitários de Data para Analytics
 * Implementa travas de segurança para evitar sobrecarga de memória
 */

/**
 * Calcula a data padrão (mês atual: 1º dia até hoje)
 * @returns Objeto com dataInicio e dataFim no formato YYYY-MM-DD
 */
export function getDefaultDateRange(): { dataInicio: string; dataFim: string } {
  const hoje = new Date()
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  
  return {
    dataInicio: formatDateForStorage(primeiroDiaMes),
    dataFim: formatDateForStorage(hoje),
  }
}

/**
 * Formata Date para string YYYY-MM-DD (sem conversão de timezone)
 */
export function formatDateForStorage(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Valida se o intervalo de datas não excede 12 meses
 * @param dataInicio Data início no formato YYYY-MM-DD
 * @param dataFim Data fim no formato YYYY-MM-DD
 * @returns Objeto com isValid (boolean) e errorMessage (string se inválido)
 */
export function validateDateRange(dataInicio: string, dataFim: string): {
  isValid: boolean
  errorMessage?: string
} {
  if (!dataInicio || !dataFim) {
    return {
      isValid: false,
      errorMessage: 'Por favor, selecione ambas as datas (início e fim).',
    }
  }

  const inicio = new Date(dataInicio)
  const fim = new Date(dataFim)

  if (inicio > fim) {
    return {
      isValid: false,
      errorMessage: 'A data de início deve ser anterior à data de fim.',
    }
  }

  // Calcular diferença em meses
  const diffMonths = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth())
  
  if (diffMonths > 12) {
    return {
      isValid: false,
      errorMessage: 'O intervalo máximo permitido é de 12 meses. Por favor, selecione um período menor.',
    }
  }

  return { isValid: true }
}

/**
 * Ajusta as datas para garantir que não excedam 12 meses
 * Se exceder, ajusta a data de início para 12 meses antes da data fim
 * @param dataInicio Data início no formato YYYY-MM-DD
 * @param dataFim Data fim no formato YYYY-MM-DD
 * @returns Objeto com dataInicio e dataFim ajustadas
 */
export function enforceMaxDateRange(dataInicio: string, dataFim: string): {
  dataInicio: string
  dataFim: string
} {
  if (!dataInicio || !dataFim) {
    const defaultRange = getDefaultDateRange()
    return defaultRange
  }

  const inicio = new Date(dataInicio)
  const fim = new Date(dataFim)

  if (inicio > fim) {
    // Se início > fim, usar mês atual como padrão
    return getDefaultDateRange()
  }

  // Calcular diferença em meses
  const diffMonths = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth())
  
  if (diffMonths > 12) {
    // Ajustar data início para 12 meses antes da data fim
    const novoInicio = new Date(fim)
    novoInicio.setMonth(novoInicio.getMonth() - 12)
    novoInicio.setDate(1) // Primeiro dia do mês
    
    return {
      dataInicio: formatDateForStorage(novoInicio),
      dataFim: formatDateForStorage(fim),
    }
  }

  return { dataInicio, dataFim }
}

/**
 * Formata string YYYY-MM-DD para DD/MM/YYYY (sem conversão de timezone)
 * @param dateString Data no formato YYYY-MM-DD
 * @returns Data formatada como DD/MM/YYYY
 */
export function formatDateForDisplay(dateString: string): string {
  if (!dateString) return ''
  const parts = dateString.split('-')
  if (parts.length !== 3) return dateString
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

/**
 * Retorna a data atual no formato YYYY-MM-DD usando métodos locais (sem conversão de timezone)
 * @returns Data atual formatada como YYYY-MM-DD
 */
export function getCurrentDateLocal(): string {
  const hoje = new Date()
  return formatDateForStorage(hoje)
}

/**
 * Normaliza uma string de data para o formato YYYY-MM-DD local
 * Aceita formatos como YYYY-MM-DD, DD/MM/YYYY, ou Date ISO string
 * @param dateString String de data em qualquer formato válido
 * @returns Data normalizada no formato YYYY-MM-DD
 */
export function normalizeDateToLocal(dateString: string): string {
  if (!dateString) return getCurrentDateLocal()
  
  // Se já está no formato YYYY-MM-DD, retorna direto
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString
  }
  
  // Se está no formato DD/MM/YYYY, converte
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const parts = dateString.split('/')
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  
  // Tenta parsear como Date e converter
  try {
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      return formatDateForStorage(date)
    }
  } catch {
    // Se falhar, retorna data atual
  }
  
  // Fallback: retorna data atual
  return getCurrentDateLocal()
}
