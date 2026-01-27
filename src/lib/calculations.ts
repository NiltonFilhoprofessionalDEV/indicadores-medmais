/**
 * Utilitários para cálculos automáticos nos formulários
 */

/**
 * Calcula o status do TAF baseado na idade e tempo
 */
export function calculateTAFStatus(idade: number, tempo: string): { status: string; nota?: number } {
  if (!tempo || !tempo.includes(':')) {
    return { status: '-' }
  }

  const [minutes, seconds] = tempo.split(':').map(Number)
  const totalSeconds = minutes * 60 + seconds

  if (idade < 40) {
    // Regra < 40 anos
    if (totalSeconds <= 120) return { status: 'Aprovado', nota: 10 } // <= 2:00
    if (totalSeconds <= 140) return { status: 'Aprovado', nota: 9 }  // <= 2:20
    if (totalSeconds <= 160) return { status: 'Aprovado', nota: 8 }  // <= 2:40
    if (totalSeconds <= 180) return { status: 'Aprovado', nota: 7 }  // <= 3:00
    return { status: 'Reprovado' } // > 3:00
  } else {
    // Regra >= 40 anos
    if (totalSeconds <= 180) return { status: 'Aprovado', nota: 10 } // <= 3:00
    if (totalSeconds <= 200) return { status: 'Aprovado', nota: 9 }  // <= 3:20
    if (totalSeconds <= 220) return { status: 'Aprovado', nota: 8 }  // <= 3:40
    if (totalSeconds <= 240) return { status: 'Aprovado', nota: 7 }  // <= 4:00
    return { status: 'Reprovado' } // > 4:00
  }
}

/**
 * Calcula o status da Prova Teórica baseado na nota
 */
export function calculateProvaTeoricaStatus(nota: number): string {
  if (nota >= 8.0) {
    return 'Aprovado'
  }
  return 'Reprovado'
}

/**
 * Calcula o status do Tempo TP/EPR baseado no tempo
 */
export function calculateTPEPRStatus(tempo: string): string {
  if (!tempo || !tempo.includes(':')) {
    return '-'
  }

  const [minutes, seconds] = tempo.split(':').map(Number)
  const totalSeconds = minutes * 60 + seconds

  if (totalSeconds <= 59) {
    return 'Aprovado'
  }
  return 'Reprovado'
}

/**
 * Calcula percentual (usado em Controle de EPI)
 */
export function calculatePercentage(entregue: number, previsto: number): number {
  if (previsto === 0) return 0
  return Math.round((entregue / previsto) * 100)
}

/**
 * Converte tempo mm:ss para segundos totais
 */
export function timeToSeconds(time: string): number {
  if (!time || !time.includes(':')) return 0
  const [minutes, seconds] = time.split(':').map(Number)
  return minutes * 60 + seconds
}

/**
 * Converte segundos totais para mm:ss
 */
export function secondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
