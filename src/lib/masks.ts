/**
 * Utilitários para máscaras de tempo
 */

/**
 * Formata um valor numérico para HH:mm
 * Exemplo: 1400 -> "14:00"
 */
export function formatTimeHHMM(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')
  
  if (!numbers) return ''
  
  // Limita a 4 dígitos
  const limited = numbers.slice(0, 4)
  
  // Adiciona os dois pontos
  if (limited.length <= 2) {
    return limited
  }
  
  return `${limited.slice(0, 2)}:${limited.slice(2, 4)}`
}

/**
 * Formata um valor numérico para mm:ss
 * Exemplo: 125 -> "01:25", 5959 -> "59:59"
 * Melhorado para permitir digitação incremental dos segundos sem apagar
 */
export function formatTimeMMSS(value: string, maxMinutes: number = 59): string {
  // Se o valor está vazio, retorna vazio
  if (!value) return ''
  
  // Remove tudo que não é número para análise
  const numbers = value.replace(/\D/g, '')
  
  if (!numbers) return ''
  
  // Se já tem formato mm:ss com dois pontos, preserva a estrutura durante digitação
  if (value.includes(':')) {
    const parts = value.split(':')
    if (parts.length === 2) {
      const minutesPart = parts[0].replace(/\D/g, '')
      const secondsPart = parts[1].replace(/\D/g, '')
      
      // Se não tem minutos ainda, retorna vazio ou apenas os números
      if (!minutesPart) {
        return numbers.length <= 2 ? numbers : numbers.slice(0, 2)
      }
      
      // Valida e formata minutos (limita a 2 dígitos e maxMinutes)
      let minutes = parseInt(minutesPart.slice(0, 2) || '0', 10)
      if (minutes > maxMinutes) minutes = maxMinutes
      
      // Se não tem segundos ainda, retorna apenas os minutos formatados
      if (!secondsPart) {
        return `${minutes.toString().padStart(2, '0')}:`
      }
      
      // Se está digitando os segundos (1 dígito), mantém como está SEM adicionar zero
      // Isso permite que o usuário continue digitando o segundo dígito
      if (secondsPart.length === 1) {
        const secondsDigit = parseInt(secondsPart, 10)
        // Se o dígito é maior que 5, limita a 5 (pois segundos vão de 0-59)
        if (secondsDigit > 5) {
          return `${minutes.toString().padStart(2, '0')}:5`
        }
        return `${minutes.toString().padStart(2, '0')}:${secondsDigit}`
      }
      
      // Se já tem 2 dígitos nos segundos, valida e formata completo
      let seconds = parseInt(secondsPart.slice(0, 2), 10)
      if (seconds > 59) {
        // Se os segundos são > 59, ajusta para 59
        seconds = 59
      }
      
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }
  
  // Se não tem dois pontos ainda, formata progressivamente
  const limited = numbers.slice(0, 4)
  
  // Se tem 1 ou 2 dígitos, retorna sem formatação ainda
  if (limited.length <= 2) {
    return limited
  }
  
  // Se tem 3 dígitos, formata como mm:s (permite continuar digitando o último dígito)
  if (limited.length === 3) {
    const minutes = Math.min(parseInt(limited.slice(0, 2), 10), maxMinutes)
    const seconds = parseInt(limited.slice(2, 3), 10)
    return `${minutes.toString().padStart(2, '0')}:${seconds}`
  }
  
  // Se tem 4 dígitos, formata completo
  const minutes = Math.min(parseInt(limited.slice(0, 2), 10), maxMinutes)
  const seconds = Math.min(parseInt(limited.slice(2, 4), 10), 59)
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Valida formato HH:mm
 */
export function validateHHMM(value: string): boolean {
  const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
  return regex.test(value)
}

/**
 * Valida formato mm:ss (máximo 59:59)
 */
export function validateMMSS(value: string, maxMinutes: number = 59): boolean {
  const regex = /^([0-5][0-9]):[0-5][0-9]$/
  if (!regex.test(value)) return false
  
  const [minutes] = value.split(':').map(Number)
  return minutes <= maxMinutes
}

/**
 * Converte HH:mm para minutos totais
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Converte minutos totais para HH:mm
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * Calcula diferença entre dois horários HH:mm
 * Retorna em formato HH:mm
 */
export function calculateTimeDifference(start: string, end: string): string {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)
  
  if (endMinutes < startMinutes) {
    // Assume que terminou no dia seguinte
    const diff = (24 * 60 - startMinutes) + endMinutes
    return minutesToTime(diff)
  }
  
  const diff = endMinutes - startMinutes
  return minutesToTime(diff)
}
