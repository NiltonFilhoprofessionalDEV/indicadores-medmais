import { format, parse } from 'date-fns'
import { timeToMinutes, minutesToTime, calculateTimeDifference } from './masks'
import type { Database } from './database.types'

type Lancamento = Database['public']['Tables']['lancamentos']['Row']

/**
 * Utilitários para processar dados JSONB dos lançamentos para Analytics
 */

// ============================================
// FUNÇÕES GENÉRICAS DE PROCESSAMENTO
// ============================================

/**
 * Agrupa lançamentos por mês
 */
export function groupByMonth(lancamentos: Lancamento[]): Map<string, Lancamento[]> {
  const grouped = new Map<string, Lancamento[]>()
  
  lancamentos.forEach((lancamento) => {
    try {
      const date = parse(lancamento.data_referencia, 'yyyy-MM-dd', new Date())
      const monthKey = format(date, 'yyyy-MM')
      
      if (!grouped.has(monthKey)) {
        grouped.set(monthKey, [])
      }
      grouped.get(monthKey)!.push(lancamento)
    } catch {
      // Ignora datas inválidas
    }
  })
  
  return grouped
}

/**
 * Agrupa lançamentos por equipe
 */
export function groupByEquipe(lancamentos: Lancamento[], equipesMap: Map<string, string>): Map<string, Lancamento[]> {
  const grouped = new Map<string, Lancamento[]>()
  
  lancamentos.forEach((lancamento) => {
    const equipeNome = equipesMap.get(lancamento.equipe_id) || lancamento.equipe_id
    
    if (!grouped.has(equipeNome)) {
      grouped.set(equipeNome, [])
    }
    grouped.get(equipeNome)!.push(lancamento)
  })
  
  return grouped
}

/**
 * Agrupa lançamentos por base
 */
export function groupByBase(lancamentos: Lancamento[], basesMap: Map<string, string>): Map<string, Lancamento[]> {
  const grouped = new Map<string, Lancamento[]>()
  
  lancamentos.forEach((lancamento) => {
    const baseNome = basesMap.get(lancamento.base_id) || lancamento.base_id
    
    if (!grouped.has(baseNome)) {
      grouped.set(baseNome, [])
    }
    grouped.get(baseNome)!.push(lancamento)
  })
  
  return grouped
}

// ============================================
// PROCESSAMENTO ESPECÍFICO POR INDICADOR
// ============================================

/**
 * 1. OCORRÊNCIA AERONÁUTICA
 */
export function processOcorrenciaAeronautica(lancamentos: Lancamento[]) {
  const items = lancamentos.map((l) => ({
    ...l,
    conteudo: l.conteudo as {
      tipo_ocorrencia: string
      acao: string
      local: string
      hora_acionamento: string
      tempo_chegada_1_cci: string
      tempo_chegada_ult_cci: string
      termino_ocorrencia: string
    },
  }))

  // KPIs
  const totalOcorrencias = items.length
  const maiorTempo1Viatura = items.reduce((max, item) => {
    const tempo = parseTimeMMSS(item.conteudo.tempo_chegada_1_cci)
    return tempo > max ? tempo : max
  }, 0)
  const maiorTempoUltViatura = items.reduce((max, item) => {
    const tempo = parseTimeMMSS(item.conteudo.tempo_chegada_ult_cci)
    return tempo > max ? tempo : max
  }, 0)
  
  // Total horas somadas
  let totalHoras = 0
  items.forEach((item) => {
    if (item.conteudo.hora_acionamento && item.conteudo.termino_ocorrencia) {
      const diff = calculateTimeDifference(
        item.conteudo.hora_acionamento,
        item.conteudo.termino_ocorrencia
      )
      totalHoras += timeToMinutes(diff)
    }
  })

  // Gráfico: Evolução mensal
  const monthlyData = Array.from(groupByMonth(lancamentos).entries())
    .map(([month, lancs]) => {
      try {
        return {
          mes: format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
          quantidade: lancs.length,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; quantidade: number } => item !== null)
    .sort((a, b) => a.mes.localeCompare(b.mes))

  // Lista por localidade
  const porLocalidade = new Map<string, number>()
  items.forEach((item) => {
    const local = item.conteudo.local || 'Não informado'
    porLocalidade.set(local, (porLocalidade.get(local) || 0) + 1)
  })

  return {
    kpis: {
      totalOcorrencias,
      maiorTempo1Viatura: secondsToMMSS(maiorTempo1Viatura),
      maiorTempoUltViatura: secondsToMMSS(maiorTempoUltViatura),
      totalHorasSomadas: minutesToTime(totalHoras),
    },
    graficoEvolucaoMensal: monthlyData,
    porLocalidade: Array.from(porLocalidade.entries()).map(([local, qtd]) => ({ local, qtd })),
    listaDetalhada: items,
  }
}

/**
 * 2. OCORRÊNCIA NÃO AERONÁUTICA
 */
export function processOcorrenciaNaoAeronautica(lancamentos: Lancamento[]) {
  const items = lancamentos.map((l) => ({
    ...l,
    conteudo: l.conteudo as {
      tipo_ocorrencia: string
      local: string
      hora_acionamento: string
      hora_chegada: string
      hora_termino: string
      duracao_total?: string
      observacoes?: string
    },
  }))

  // KPIs
  const totalOcorrencias = items.length
  let totalHoras = 0
  items.forEach((item) => {
    if (item.conteudo.duracao_total) {
      totalHoras += timeToMinutes(item.conteudo.duracao_total)
    } else if (item.conteudo.hora_acionamento && item.conteudo.hora_termino) {
      const diff = calculateTimeDifference(
        item.conteudo.hora_acionamento,
        item.conteudo.hora_termino
      )
      totalHoras += timeToMinutes(diff)
    }
  })

  // Gráfico: Evolução mensal
  const monthlyData = Array.from(groupByMonth(lancamentos).entries())
    .map(([month, lancs]) => {
      try {
        return {
          mes: format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
          quantidade: lancs.length,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; quantidade: number } => item !== null)
    .sort((a, b) => a.mes.localeCompare(b.mes))

  // Top 5 Tipos
  const tiposCount = new Map<string, number>()
  items.forEach((item) => {
    const tipo = item.conteudo.tipo_ocorrencia || 'Não informado'
    tiposCount.set(tipo, (tiposCount.get(tipo) || 0) + 1)
  })
  const top5Tipos = Array.from(tiposCount.entries())
    .map(([tipo, qtd]) => ({ tipo, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5)

  // Tempo Total por mês
  const tempoPorMes = new Map<string, number>()
  items.forEach((item) => {
    const month = format(parse(item.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
    const tempo = item.conteudo.duracao_total
      ? timeToMinutes(item.conteudo.duracao_total)
      : item.conteudo.hora_acionamento && item.conteudo.hora_termino
      ? timeToMinutes(calculateTimeDifference(item.conteudo.hora_acionamento, item.conteudo.hora_termino))
      : 0
    tempoPorMes.set(month, (tempoPorMes.get(month) || 0) + tempo)
  })
  const tempoTotalPorMes = Array.from(tempoPorMes.entries())
    .map(([mes, minutos]) => {
      try {
        return {
          mes: format(parse(mes + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
          tempoTotal: minutos,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; tempoTotal: number } => item !== null)
    .sort((a, b) => a.mes.localeCompare(b.mes))

  // Por localidade
  const porLocalidade = new Map<string, number>()
  items.forEach((item) => {
    const local = item.conteudo.local || 'Não informado'
    porLocalidade.set(local, (porLocalidade.get(local) || 0) + 1)
  })

  return {
    kpis: {
      totalOcorrencias,
      totalHorasSomadas: minutesToTime(totalHoras),
    },
    graficoEvolucaoMensal: monthlyData,
    graficoTop5Tipos: top5Tipos,
    graficoTempoTotalPorMes: tempoTotalPorMes,
    porLocalidade: Array.from(porLocalidade.entries()).map(([local, qtd]) => ({ local, qtd })),
    listaDetalhada: items,
  }
}

/**
 * 3. TESTE DE APTIDÃO FÍSICA (TAF)
 */
export function processTAF(lancamentos: Lancamento[]) {
  const avaliados: Array<{
    nome: string
    idade: number
    tempo: string
    status: string
    nota?: number
    data_referencia: string
    equipe_id: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { avaliados?: Array<Record<string, unknown>> }
    if (conteudo.avaliados && Array.isArray(conteudo.avaliados)) {
      conteudo.avaliados.forEach((avaliado) => {
        avaliados.push({
          nome: (avaliado.nome as string) || '',
          idade: Number(avaliado.idade) || 0,
          tempo: (avaliado.tempo as string) || '',
          status: (avaliado.status as string) || '',
          nota: avaliado.nota ? Number(avaliado.nota) : undefined,
          data_referencia: lancamento.data_referencia,
          equipe_id: lancamento.equipe_id,
        })
      })
    }
  })

  const tempos = avaliados
    .filter((a) => a.tempo)
    .map((a) => parseTimeMMSS(a.tempo))

  // KPIs
  const menorTempo = tempos.length > 0 ? Math.min(...tempos) : 0
  const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0
  const tempoMaximo = tempos.length > 0 ? Math.max(...tempos) : 0

  // Distribuição por minutos
  const distribuicaoMinutos = new Map<number, number>()
  tempos.forEach((tempo) => {
    const minutos = Math.floor(tempo / 60)
    distribuicaoMinutos.set(minutos, (distribuicaoMinutos.get(minutos) || 0) + 1)
  })

  // Média por equipe
  const porEquipe = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    if (a.tempo) {
      const tempo = parseTimeMMSS(a.tempo)
      const current = porEquipe.get(a.equipe_id) || { total: 0, count: 0 }
      porEquipe.set(a.equipe_id, {
        total: current.total + tempo,
        count: current.count + 1,
      })
    }
  })

  // % Aprovado/Reprovado
  const aprovados = avaliados.filter((a) => a.status === 'Aprovado').length
  const reprovados = avaliados.filter((a) => a.status === 'Reprovado').length
  const total = avaliados.length

  // Evolução média mensal
  const mediaPorMes = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    if (a.tempo) {
      const month = format(parse(a.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
      const tempo = parseTimeMMSS(a.tempo)
      const current = mediaPorMes.get(month) || { total: 0, count: 0 }
      mediaPorMes.set(month, {
        total: current.total + tempo,
        count: current.count + 1,
      })
    }
  })

  // Média por idade
  const mediaPorIdade = new Map<number, { total: number; count: number }>()
  avaliados.forEach((a) => {
    if (a.tempo) {
      const idade = Math.floor(a.idade / 10) * 10 // Agrupa por década
      const tempo = parseTimeMMSS(a.tempo)
      const current = mediaPorIdade.get(idade) || { total: 0, count: 0 }
      mediaPorIdade.set(idade, {
        total: current.total + tempo,
        count: current.count + 1,
      })
    }
  })

  return {
    kpis: {
      menorTempo: secondsToMMSS(menorTempo),
      tempoMedio: secondsToMMSS(tempoMedio),
      tempoMaximo: secondsToMMSS(tempoMaximo),
    },
    graficoDistribuicaoMinutos: Array.from(distribuicaoMinutos.entries())
      .map(([minutos, qtd]) => ({ minutos, quantidade: qtd }))
      .sort((a, b) => a.minutos - b.minutos),
    graficoMediaPorEquipe: Array.from(porEquipe.entries()).map(([equipe, data]) => ({
      equipe,
      media: secondsToMMSS(data.total / data.count),
    })),
    graficoAprovadoReprovado: [
      { name: 'Aprovado', value: aprovados, porcentagem: total > 0 ? (aprovados / total) * 100 : 0 },
      { name: 'Reprovado', value: reprovados, porcentagem: total > 0 ? (reprovados / total) * 100 : 0 },
    ],
    graficoEvolucaoMediaMensal: Array.from(mediaPorMes.entries())
      .map(([mes, data]) => {
        try {
          return {
            mes: format(parse(mes + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
            media: secondsToMMSS(data.total / data.count),
          }
        } catch {
          return null
        }
      })
      .filter((item): item is { mes: string; media: string } => item !== null)
      .sort((a, b) => a.mes.localeCompare(b.mes)),
    graficoMediaPorIdade: Array.from(mediaPorIdade.entries())
      .map(([idade, data]) => ({
        idade: `${idade}-${idade + 9} anos`,
        media: secondsToMMSS(data.total / data.count),
      }))
      .sort((a, b) => a.idade.localeCompare(b.idade)),
    listaCompleta: avaliados,
  }
}

/**
 * 4. TEMPO TP/EPR
 */
export function processTempoTPEPR(lancamentos: Lancamento[]) {
  const avaliados: Array<{
    nome: string
    tempo: string
    status: string
    data_referencia: string
    equipe_id: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { avaliados?: Array<Record<string, unknown>> }
    if (conteudo.avaliados && Array.isArray(conteudo.avaliados)) {
      conteudo.avaliados.forEach((avaliado) => {
        avaliados.push({
          nome: (avaliado.nome as string) || '',
          tempo: (avaliado.tempo as string) || '',
          status: (avaliado.status as string) || '',
          data_referencia: lancamento.data_referencia,
          equipe_id: lancamento.equipe_id,
        })
      })
    }
  })

  const tempos = avaliados.filter((a) => a.tempo).map((a) => parseTimeMMSS(a.tempo))

  // KPIs
  const menorTempo = tempos.length > 0 ? Math.min(...tempos) : 0
  const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0
  const tempoMaximo = tempos.length > 0 ? Math.max(...tempos) : 0

  // Média mensal
  const mediaPorMes = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    if (a.tempo) {
      const month = format(parse(a.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
      const tempo = parseTimeMMSS(a.tempo)
      const current = mediaPorMes.get(month) || { total: 0, count: 0 }
      mediaPorMes.set(month, {
        total: current.total + tempo,
        count: current.count + 1,
      })
    }
  })

  // Desempenho por equipe
  const porEquipe = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    if (a.tempo) {
      const tempo = parseTimeMMSS(a.tempo)
      const current = porEquipe.get(a.equipe_id) || { total: 0, count: 0 }
      porEquipe.set(a.equipe_id, {
        total: current.total + tempo,
        count: current.count + 1,
      })
    }
  })

  return {
    kpis: {
      menorTempo: secondsToMMSS(menorTempo),
      tempoMedio: secondsToMMSS(tempoMedio),
      tempoMaximo: secondsToMMSS(tempoMaximo),
    },
    graficoEvolucaoMediaMensal: Array.from(mediaPorMes.entries())
      .map(([mes, data]) => {
        try {
          return {
            mes: format(parse(mes + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
            media: secondsToMMSS(data.total / data.count),
          }
        } catch {
          return null
        }
      })
      .filter((item): item is { mes: string; media: string } => item !== null)
      .sort((a, b) => a.mes.localeCompare(b.mes)),
    graficoDesempenhoPorEquipe: Array.from(porEquipe.entries()).map(([equipe, data]) => ({
      equipe,
      media: secondsToMMSS(data.total / data.count),
    })),
    listaCompleta: avaliados,
  }
}

/**
 * 5. TEMPO RESPOSTA
 */
export function processTempoResposta(lancamentos: Lancamento[]) {
  const afericoes: Array<{
    viatura: string
    motorista: string
    local: string
    tempo: string
    data_referencia: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { afericoes?: Array<Record<string, unknown>> }
    if (conteudo.afericoes && Array.isArray(conteudo.afericoes)) {
      conteudo.afericoes.forEach((afericao) => {
        afericoes.push({
          viatura: (afericao.viatura as string) || '',
          motorista: (afericao.motorista as string) || '',
          local: (afericao.local as string) || '',
          tempo: (afericao.tempo as string) || '',
          data_referencia: lancamento.data_referencia,
        })
      })
    }
  })

  const tempos = afericoes.filter((a) => a.tempo).map((a) => parseTimeMMSS(a.tempo))

  // KPIs
  const menorTempoIdx = tempos.length > 0 ? tempos.indexOf(Math.min(...tempos)) : -1
  const maiorTempoIdx = tempos.length > 0 ? tempos.indexOf(Math.max(...tempos)) : -1

  // Média mensal
  const mediaPorMes = new Map<string, { total: number; count: number }>()
  afericoes.forEach((a) => {
    if (a.tempo) {
      const month = format(parse(a.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
      const tempo = parseTimeMMSS(a.tempo)
      const current = mediaPorMes.get(month) || { total: 0, count: 0 }
      mediaPorMes.set(month, {
        total: current.total + tempo,
        count: current.count + 1,
      })
    }
  })

  return {
    kpis: {
      menorTempo: menorTempoIdx >= 0 ? {
        tempo: secondsToMMSS(tempos[menorTempoIdx]),
        motorista: afericoes[menorTempoIdx].motorista,
        viatura: afericoes[menorTempoIdx].viatura,
      } : null,
      maiorTempo: maiorTempoIdx >= 0 ? {
        tempo: secondsToMMSS(tempos[maiorTempoIdx]),
        motorista: afericoes[maiorTempoIdx].motorista,
        viatura: afericoes[maiorTempoIdx].viatura,
      } : null,
    },
    graficoEvolucaoMediaMensal: Array.from(mediaPorMes.entries())
      .map(([mes, data]) => {
        try {
          return {
            mes: format(parse(mes + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
            media: secondsToMMSS(data.total / data.count),
          }
        } catch {
          return null
        }
      })
      .filter((item): item is { mes: string; media: string } => item !== null)
      .sort((a, b) => a.mes.localeCompare(b.mes)),
    listaCompleta: afericoes,
  }
}

/**
 * 6. HORAS DE TREINAMENTO
 */
export function processHorasTreinamento(lancamentos: Lancamento[]) {
  const participantes: Array<{
    nome: string
    horas: string
    data_referencia: string
    equipe_id: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { participantes?: Array<Record<string, unknown>> }
    if (conteudo.participantes && Array.isArray(conteudo.participantes)) {
      conteudo.participantes.forEach((participante) => {
        participantes.push({
          nome: (participante.nome as string) || '',
          horas: (participante.horas as string) || '',
          data_referencia: lancamento.data_referencia,
          equipe_id: lancamento.equipe_id,
        })
      })
    }
  })

  // Média mensal
  const mediaPorMes = new Map<string, { total: number; count: number }>()
  participantes.forEach((p) => {
    if (p.horas) {
      const month = format(parse(p.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
      const horas = timeToMinutes(p.horas)
      const current = mediaPorMes.get(month) || { total: 0, count: 0 }
      mediaPorMes.set(month, {
        total: current.total + horas,
        count: current.count + 1,
      })
    }
  })

  // Total por equipe
  const totalPorEquipe = new Map<string, number>()
  participantes.forEach((p) => {
    if (p.horas) {
      const horas = timeToMinutes(p.horas)
      totalPorEquipe.set(p.equipe_id, (totalPorEquipe.get(p.equipe_id) || 0) + horas)
    }
  })

  // Total absoluto mensal
  const totalAbsolutoPorMes = new Map<string, number>()
  participantes.forEach((p) => {
    if (p.horas) {
      const month = format(parse(p.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
      const horas = timeToMinutes(p.horas)
      totalAbsolutoPorMes.set(month, (totalAbsolutoPorMes.get(month) || 0) + horas)
    }
  })

  return {
    graficoMediaHorasMensal: Array.from(mediaPorMes.entries())
      .map(([mes, data]) => {
        try {
          return {
            mes: format(parse(mes + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
            media: minutesToTime(Math.round(data.total / data.count)),
          }
        } catch {
          return null
        }
      })
      .filter((item): item is { mes: string; media: string } => item !== null)
      .sort((a, b) => a.mes.localeCompare(b.mes)),
    graficoTotalHorasPorEquipe: Array.from(totalPorEquipe.entries()).map(([equipe, minutos]) => ({
      equipe,
      totalHoras: minutesToTime(minutos),
    })),
    graficoTotalAbsolutoMensal: Array.from(totalAbsolutoPorMes.entries())
      .map(([mes, minutos]) => {
        try {
          return {
            mes: format(parse(mes + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
            totalHoras: minutesToTime(minutos),
          }
        } catch {
          return null
        }
      })
      .filter((item): item is { mes: string; totalHoras: string } => item !== null)
      .sort((a, b) => a.mes.localeCompare(b.mes)),
    listaCompleta: participantes,
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Converte tempo mm:ss para segundos
 */
function parseTimeMMSS(time: string): number {
  if (!time || !time.includes(':')) return 0
  const [minutes, seconds] = time.split(':').map(Number)
  return minutes * 60 + seconds
}

/**
 * Converte segundos para mm:ss
 */
function secondsToMMSS(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
