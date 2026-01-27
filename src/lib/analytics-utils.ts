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
 * Filtra lançamentos por nome de colaborador dentro de arrays JSONB
 */
export function filterByColaborador(lancamentos: Lancamento[], colaboradorNome: string): Lancamento[] {
  if (!colaboradorNome) return lancamentos

  const filtered: Lancamento[] = []
  
  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as Record<string, unknown>
    let hasMatch = false
    
    // Arrays comuns: avaliados, participantes, afericoes, colaboradores
    const arrayKeys = ['avaliados', 'participantes', 'afericoes', 'colaboradores']
    
    arrayKeys.forEach((key) => {
      if (Array.isArray(conteudo[key])) {
        const array = conteudo[key] as Array<Record<string, unknown>>
        const hasColaborador = array.some((item) => {
          const nome = item.nome || item.motorista
          return nome && String(nome).toLowerCase().includes(colaboradorNome.toLowerCase())
        })
        if (hasColaborador) {
          hasMatch = true
        }
      }
    })
    
    // Se encontrou match, incluir o lançamento
    if (hasMatch) {
      filtered.push(lancamento)
    }
  })
  
  return filtered
}

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

/**
 * 7. ATIVIDADES ACESSÓRIAS
 */
export function processAtividadesAcessorias(lancamentos: Lancamento[]) {
  const atividades: Array<{
    tipo_atividade: string
    qtd_equipamentos?: number
    qtd_bombeiros?: number
    tempo_gasto?: string
    data_referencia: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { atividades?: Array<Record<string, unknown>> }
    if (conteudo.atividades && Array.isArray(conteudo.atividades)) {
      conteudo.atividades.forEach((atividade) => {
        atividades.push({
          tipo_atividade: (atividade.tipo_atividade as string) || '',
          qtd_equipamentos: atividade.qtd_equipamentos ? Number(atividade.qtd_equipamentos) : undefined,
          qtd_bombeiros: atividade.qtd_bombeiros ? Number(atividade.qtd_bombeiros) : undefined,
          tempo_gasto: (atividade.tempo_gasto as string) || undefined,
          data_referencia: lancamento.data_referencia,
        })
      })
    }
  })

  const totalAtividades = atividades.length
  const tiposCount = new Map<string, number>()
  atividades.forEach((a) => {
    const tipo = a.tipo_atividade || 'Não informado'
    tiposCount.set(tipo, (tiposCount.get(tipo) || 0) + 1)
  })

  // Evolução mensal
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

  return {
    kpis: {
      totalAtividades,
    },
    graficoEvolucaoMensal: monthlyData,
    graficoPorTipo: Array.from(tiposCount.entries())
      .map(([tipo, qtd]) => ({ tipo, qtd }))
      .sort((a, b) => b.qtd - a.qtd),
    listaCompleta: atividades,
  }
}

/**
 * 8. PROVA TEÓRICA
 */
export function processProvaTeorica(lancamentos: Lancamento[], colaboradorNome?: string) {
  const avaliados: Array<{
    nome: string
    nota: number
    status: string
    data_referencia: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { avaliados?: Array<Record<string, unknown>> }
    if (conteudo.avaliados && Array.isArray(conteudo.avaliados)) {
      conteudo.avaliados.forEach((avaliado) => {
        const nome = (avaliado.nome as string) || ''
        if (!colaboradorNome || nome.toLowerCase().includes(colaboradorNome.toLowerCase())) {
          avaliados.push({
            nome,
            nota: Number(avaliado.nota) || 0,
            status: (avaliado.status as string) || '',
            data_referencia: lancamento.data_referencia,
          })
        }
      })
    }
  })

  const total = avaliados.length
  const aprovados = avaliados.filter((a) => a.status === 'Aprovado').length
  const reprovados = avaliados.filter((a) => a.status === 'Reprovado').length
  const notaMedia = total > 0 ? avaliados.reduce((sum, a) => sum + a.nota, 0) / total : 0

  // Evolução mensal
  const mediaPorMes = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    const month = format(parse(a.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
    const current = mediaPorMes.get(month) || { total: 0, count: 0 }
    mediaPorMes.set(month, {
      total: current.total + a.nota,
      count: current.count + 1,
    })
  })

  return {
    kpis: {
      totalAvaliados: total,
      notaMedia: notaMedia.toFixed(2),
      taxaAprovacao: total > 0 ? ((aprovados / total) * 100).toFixed(1) : '0.0',
    },
    graficoAprovadoReprovado: [
      { name: 'Aprovado', value: aprovados, porcentagem: total > 0 ? (aprovados / total) * 100 : 0 },
      { name: 'Reprovado', value: reprovados, porcentagem: total > 0 ? (reprovados / total) * 100 : 0 },
    ],
    graficoEvolucaoMediaMensal: Array.from(mediaPorMes.entries())
      .map(([mes, data]) => {
        try {
          return {
            mes: format(parse(mes + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
            media: (data.total / data.count).toFixed(2),
          }
        } catch {
          return null
        }
      })
      .filter((item): item is { mes: string; media: string } => item !== null)
      .sort((a, b) => a.mes.localeCompare(b.mes)),
    listaCompleta: avaliados,
  }
}

/**
 * 9. INSPEÇÃO DE VIATURAS
 */
export function processInspecaoViaturas(lancamentos: Lancamento[]) {
  const inspecoes: Array<{
    viatura: string
    qtd_inspecoes: number
    qtd_nao_conforme: number
    data_referencia: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { inspecoes?: Array<Record<string, unknown>> }
    if (conteudo.inspecoes && Array.isArray(conteudo.inspecoes)) {
      conteudo.inspecoes.forEach((inspecao) => {
        inspecoes.push({
          viatura: (inspecao.viatura as string) || '',
          qtd_inspecoes: Number(inspecao.qtd_inspecoes) || 0,
          qtd_nao_conforme: Number(inspecao.qtd_nao_conforme) || 0,
          data_referencia: lancamento.data_referencia,
        })
      })
    }
  })

  const totalInspecoes = inspecoes.reduce((sum, i) => sum + i.qtd_inspecoes, 0)
  const totalNaoConforme = inspecoes.reduce((sum, i) => sum + i.qtd_nao_conforme, 0)

  // Por modelo de viatura
  const porViatura = new Map<string, { inspecoes: number; naoConforme: number }>()
  inspecoes.forEach((i) => {
    const current = porViatura.get(i.viatura) || { inspecoes: 0, naoConforme: 0 }
    porViatura.set(i.viatura, {
      inspecoes: current.inspecoes + i.qtd_inspecoes,
      naoConforme: current.naoConforme + i.qtd_nao_conforme,
    })
  })

  return {
    kpis: {
      totalInspecoes,
      totalNaoConforme,
      taxaConformidade: totalInspecoes > 0 ? (((totalInspecoes - totalNaoConforme) / totalInspecoes) * 100).toFixed(1) : '100.0',
    },
    graficoPorViatura: Array.from(porViatura.entries())
      .map(([viatura, data]) => ({
        viatura,
        inspecoes: data.inspecoes,
        naoConforme: data.naoConforme,
      }))
      .sort((a, b) => b.naoConforme - a.naoConforme),
    listaCompleta: inspecoes,
  }
}

/**
 * 10. CONTROLE DE ESTOQUE
 */
export function processControleEstoque(lancamentos: Lancamento[]) {
  const itens: Array<{
    tipo_material: string
    qtd_atual: number
    qtd_exigida: number
    data_referencia: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { itens?: Array<Record<string, unknown>> }
    if (conteudo.itens && Array.isArray(conteudo.itens)) {
      conteudo.itens.forEach((item) => {
        itens.push({
          tipo_material: (item.tipo_material as string) || '',
          qtd_atual: Number(item.qtd_atual) || 0,
          qtd_exigida: Number(item.qtd_exigida) || 0,
          data_referencia: lancamento.data_referencia,
        })
      })
    }
  })

  // Agrupar por tipo de material (última entrada de cada tipo)
  const porMaterial = new Map<string, { atual: number; exigida: number }>()
  itens.forEach((item) => {
    porMaterial.set(item.tipo_material, {
      atual: item.qtd_atual,
      exigida: item.qtd_exigida,
    })
  })

  return {
    kpis: {
      totalMateriais: porMaterial.size,
    },
    graficoSaudeEstoque: Array.from(porMaterial.entries())
      .map(([material, data]) => ({
        material,
        atual: data.atual,
        exigida: data.exigida,
        status: data.atual < data.exigida ? 'Crítico' : 'OK',
      }))
      .sort((a, b) => a.material.localeCompare(b.material)),
    listaCompleta: itens,
  }
}

/**
 * 11. CONTROLE DE EPI
 */
export function processControleEPI(lancamentos: Lancamento[]) {
  const colaboradores: Array<{
    nome: string
    epi_entregue: number
    epi_previsto: number
    unif_entregue: number
    unif_previsto: number
    total_epi_pct: number
    total_unif_pct: number
    data_referencia: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { colaboradores?: Array<Record<string, unknown>> }
    if (conteudo.colaboradores && Array.isArray(conteudo.colaboradores)) {
      conteudo.colaboradores.forEach((colab) => {
        colaboradores.push({
          nome: (colab.nome as string) || '',
          epi_entregue: Number(colab.epi_entregue) || 0,
          epi_previsto: Number(colab.epi_previsto) || 0,
          unif_entregue: Number(colab.unif_entregue) || 0,
          unif_previsto: Number(colab.unif_previsto) || 0,
          total_epi_pct: Number(colab.total_epi_pct) || 0,
          total_unif_pct: Number(colab.total_unif_pct) || 0,
          data_referencia: lancamento.data_referencia,
        })
      })
    }
  })

  const totalEPI = colaboradores.reduce((sum, c) => sum + c.total_epi_pct, 0)
  const totalUnif = colaboradores.reduce((sum, c) => sum + c.total_unif_pct, 0)
  const mediaEPI = colaboradores.length > 0 ? totalEPI / colaboradores.length : 0
  const mediaUnif = colaboradores.length > 0 ? totalUnif / colaboradores.length : 0

  return {
    kpis: {
      mediaEPI: mediaEPI.toFixed(1),
      mediaUnif: mediaUnif.toFixed(1),
    },
    graficoEntregaEPI: Array.from(groupByMonth(lancamentos).entries())
      .map(([month]) => {
        const mesColabs = colaboradores.filter((c) => {
          const monthKey = format(parse(c.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
          return monthKey === month
        })
        const mediaMes = mesColabs.length > 0
          ? mesColabs.reduce((sum, c) => sum + c.total_epi_pct, 0) / mesColabs.length
          : 0
        try {
          return {
            mes: format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
            media: mediaMes.toFixed(1),
          }
        } catch {
          return null
        }
      })
      .filter((item): item is { mes: string; media: string } => item !== null)
      .sort((a, b) => a.mes.localeCompare(b.mes)),
    listaCompleta: colaboradores,
  }
}

/**
 * 12. CONTROLE DE TROCAS
 */
export function processControleTrocas(lancamentos: Lancamento[]) {
  const trocas: Array<{
    qtd_trocas: number
    data_referencia: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { qtd_trocas?: number }
    if (conteudo.qtd_trocas !== undefined) {
      trocas.push({
        qtd_trocas: Number(conteudo.qtd_trocas) || 0,
        data_referencia: lancamento.data_referencia,
      })
    }
  })

  const totalTrocas = trocas.reduce((sum, t) => sum + t.qtd_trocas, 0)

  // Evolução mensal
  const monthlyData = Array.from(groupByMonth(lancamentos).entries())
    .map(([month]) => {
      const mesTrocas = trocas.filter((t) => {
        const monthKey = format(parse(t.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
        return monthKey === month
      })
      const totalMes = mesTrocas.reduce((sum, t) => sum + t.qtd_trocas, 0)
      try {
        return {
          mes: format(parse(month + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
          quantidade: totalMes,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; quantidade: number } => item !== null)
    .sort((a, b) => a.mes.localeCompare(b.mes))

  return {
    kpis: {
      totalTrocas,
    },
    graficoEvolucaoMensal: monthlyData,
    listaCompleta: trocas,
  }
}

// ============================================
// VISÃO GERAL EXECUTIVA (C-LEVEL)
// ============================================

/**
 * Gera resumo executivo agregando dados de todos os indicadores
 */
export function generateExecutiveSummary(
  lancamentos: Lancamento[], 
  bases: Array<{ id: string; nome: string }>,
  indicadoresConfig: Array<{ id: string; schema_type: string }>
) {
  // Separar lançamentos por tipo de indicador
  const ocorrenciasAero = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'ocorrencia_aeronautica'
  })
  const ocorrenciasNaoAero = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'ocorrencia_nao_aeronautica'
  })
  const tempoResposta = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'tempo_resposta'
  })
  const treinamento = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'horas_treinamento'
  })
  const estoque = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'estoque'
  })
  const inspecaoViaturas = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'inspecao_viaturas'
  })
  const taf = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'taf'
  })

  // 1. Volume Operacional (Ocorrências Aero + Não Aero)
  const totalOcorrencias = ocorrenciasAero.length + ocorrenciasNaoAero.length

  // Calcular período anterior para comparação (30 dias antes)
  const dataFim = lancamentos.length > 0 ? lancamentos[0].data_referencia : ''
  const dataInicioAnterior = dataFim ? format(new Date(parse(dataFim, 'yyyy-MM-dd', new Date()).getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') : ''
  const ocorrenciasPeriodoAnterior = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    const isOcorrencia = indicador?.schema_type === 'ocorrencia_aeronautica' || indicador?.schema_type === 'ocorrencia_nao_aeronautica'
    return isOcorrencia && l.data_referencia < dataFim && l.data_referencia >= dataInicioAnterior
  }).length
  const crescimentoVolume = ocorrenciasPeriodoAnterior > 0 
    ? ((totalOcorrencias - ocorrenciasPeriodoAnterior) / ocorrenciasPeriodoAnterior) * 100 
    : 0

  // 2. Agilidade (Tempo Médio de Resposta)
  const temposResposta: number[] = []
  tempoResposta.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { afericoes?: Array<Record<string, unknown>> }
    if (conteudo.afericoes && Array.isArray(conteudo.afericoes)) {
      conteudo.afericoes.forEach((afericao) => {
        const tempo = (afericao.tempo as string) || ''
        if (tempo) {
          temposResposta.push(parseTimeMMSS(tempo))
        }
      })
    }
  })
  const tempoMedioResposta = temposResposta.length > 0 
    ? temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length 
    : 0
  const tempoMedioMinutos = tempoMedioResposta / 60
  const corAgilidade = tempoMedioMinutos < 3 ? 'green' : 'yellow'

  // 3. Força de Trabalho (Total Horas de Treinamento)
  let totalHorasTreinamento = 0
  treinamento.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { participantes?: Array<Record<string, unknown>> }
    if (conteudo.participantes && Array.isArray(conteudo.participantes)) {
      conteudo.participantes.forEach((participante) => {
        const horas = (participante.horas as string) || ''
        if (horas) {
          totalHorasTreinamento += timeToMinutes(horas)
        }
      })
    }
  })

  // 4. Alertas Críticos (Bases com estoque crítico OU viatura não conforme)
  const basesComAlerta = new Set<string>()
  
  // Verificar estoque crítico
  estoque.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as {
      po_quimico_atual?: number
      po_quimico_exigido?: number
      lge_atual?: number
      lge_exigido?: number
      nitrogenio_atual?: number
      nitrogenio_exigido?: number
    }
    if (
      (conteudo.po_quimico_atual !== undefined && conteudo.po_quimico_exigido !== undefined && conteudo.po_quimico_atual < conteudo.po_quimico_exigido) ||
      (conteudo.lge_atual !== undefined && conteudo.lge_exigido !== undefined && conteudo.lge_atual < conteudo.lge_exigido) ||
      (conteudo.nitrogenio_atual !== undefined && conteudo.nitrogenio_exigido !== undefined && conteudo.nitrogenio_atual < conteudo.nitrogenio_exigido)
    ) {
      basesComAlerta.add(lancamento.base_id)
    }
  })

  // Verificar viaturas não conformes
  inspecaoViaturas.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { viaturas?: Array<Record<string, unknown>> }
    if (conteudo.viaturas && Array.isArray(conteudo.viaturas)) {
      const temNaoConforme = conteudo.viaturas.some((v) => {
        const qtdNaoConforme = Number(v.qtd_nao_conforme) || 0
        return qtdNaoConforme > 0
      })
      if (temNaoConforme) {
        basesComAlerta.add(lancamento.base_id)
      }
    }
  })

  const totalAlertas = basesComAlerta.size

  // 5. Gráfico Composed (Volume de Ocorrências vs Tempo Médio de Resposta por Mês)
  const monthlyData = new Map<string, { ocorrencias: number; tempoResposta: number; count: number }>()
  
  // Agregar ocorrências por mês
  ocorrenciasAero.concat(ocorrenciasNaoAero).forEach((l) => {
    const month = format(parse(l.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
    const current = monthlyData.get(month) || { ocorrencias: 0, tempoResposta: 0, count: 0 }
    monthlyData.set(month, { ...current, ocorrencias: current.ocorrencias + 1 })
  })

  // Agregar tempos de resposta por mês
  tempoResposta.forEach((lancamento) => {
    const month = format(parse(lancamento.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
    const conteudo = lancamento.conteudo as { afericoes?: Array<Record<string, unknown>> }
    if (conteudo.afericoes && Array.isArray(conteudo.afericoes)) {
      conteudo.afericoes.forEach((afericao) => {
        const tempo = (afericao.tempo as string) || ''
        if (tempo) {
          const current = monthlyData.get(month) || { ocorrencias: 0, tempoResposta: 0, count: 0 }
          const tempoSegundos = parseTimeMMSS(tempo)
          monthlyData.set(month, {
            ...current,
            tempoResposta: current.tempoResposta + tempoSegundos,
            count: current.count + 1,
          })
        }
      })
    }
  })

  const graficoComposed = Array.from(monthlyData.entries())
    .map(([mes, data]) => {
      try {
        return {
          mes: format(parse(mes + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
          ocorrencias: data.ocorrencias,
          tempoMedio: data.count > 0 ? secondsToMMSS(data.tempoResposta / data.count) : '00:00',
          tempoMedioSegundos: data.count > 0 ? data.tempoResposta / data.count : 0,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; ocorrencias: number; tempoMedio: string; tempoMedioSegundos: number } => item !== null)
    .sort((a, b) => a.mes.localeCompare(b.mes))

  // 6. Ranking de Bases (Top 5 com mais ocorrências)
  const ocorrenciasPorBase = new Map<string, number>()
  ocorrenciasAero.concat(ocorrenciasNaoAero).forEach((l) => {
    const baseNome = bases.find((b) => b.id === l.base_id)?.nome || l.base_id
    ocorrenciasPorBase.set(baseNome, (ocorrenciasPorBase.get(baseNome) || 0) + 1)
  })
  const rankingBases = Array.from(ocorrenciasPorBase.entries())
    .map(([base, qtd]) => ({ base, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5)

  // 7. Pontos de Atenção (Alertas automáticos)
  const pontosAtencao: Array<{ tipo: string; mensagem: string; base: string }> = []

  // TAF: Reprovados por base
  const reprovadosPorBase = new Map<string, number>()
  taf.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { avaliados?: Array<Record<string, unknown>> }
    if (conteudo.avaliados && Array.isArray(conteudo.avaliados)) {
      const reprovados = conteudo.avaliados.filter((a) => (a.status as string) === 'Reprovado').length
      if (reprovados > 0) {
        const baseNome = bases.find((b) => b.id === lancamento.base_id)?.nome || lancamento.base_id
        reprovadosPorBase.set(baseNome, (reprovadosPorBase.get(baseNome) || 0) + reprovados)
      }
    }
  })
  reprovadosPorBase.forEach((qtd, base) => {
    pontosAtencao.push({ tipo: 'taf', mensagem: `${qtd} Reprovado${qtd > 1 ? 's' : ''} no TAF`, base })
  })

  // Estoque: Itens críticos por base
  estoque.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as {
      po_quimico_atual?: number
      po_quimico_exigido?: number
      lge_atual?: number
      lge_exigido?: number
      nitrogenio_atual?: number
      nitrogenio_exigido?: number
    }
    const baseNome = bases.find((b) => b.id === lancamento.base_id)?.nome || lancamento.base_id
    
    if (conteudo.po_quimico_atual !== undefined && conteudo.po_quimico_exigido !== undefined && conteudo.po_quimico_atual < conteudo.po_quimico_exigido) {
      pontosAtencao.push({ tipo: 'estoque', mensagem: 'Estoque de Pó Químico Crítico', base: baseNome })
    }
    if (conteudo.lge_atual !== undefined && conteudo.lge_exigido !== undefined && conteudo.lge_atual < conteudo.lge_exigido) {
      pontosAtencao.push({ tipo: 'estoque', mensagem: 'Estoque de LGE Crítico', base: baseNome })
    }
    if (conteudo.nitrogenio_atual !== undefined && conteudo.nitrogenio_exigido !== undefined && conteudo.nitrogenio_atual < conteudo.nitrogenio_exigido) {
      pontosAtencao.push({ tipo: 'estoque', mensagem: 'Estoque de Nitrogênio Crítico', base: baseNome })
    }
  })

  // Viaturas: Não conformes por base
  inspecaoViaturas.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { viaturas?: Array<Record<string, unknown>> }
    if (conteudo.viaturas && Array.isArray(conteudo.viaturas)) {
      conteudo.viaturas.forEach((viatura) => {
        const qtdNaoConforme = Number(viatura.qtd_nao_conforme) || 0
        if (qtdNaoConforme > 0) {
          const baseNome = bases.find((b) => b.id === lancamento.base_id)?.nome || lancamento.base_id
          const modelo = (viatura.modelo as string) || 'Desconhecido'
          pontosAtencao.push({ tipo: 'viatura', mensagem: `Viatura ${modelo} Não Conforme`, base: baseNome })
        }
      })
    }
  })

  return {
    kpis: {
      volumeOperacional: {
        valor: totalOcorrencias,
        crescimento: crescimentoVolume,
        periodoAnterior: ocorrenciasPeriodoAnterior,
      },
      agilidade: {
        tempoMedio: secondsToMMSS(tempoMedioResposta),
        tempoMedioMinutos: tempoMedioMinutos,
        cor: corAgilidade,
      },
      forcaTrabalho: {
        totalHoras: minutesToTime(totalHorasTreinamento),
        totalMinutos: totalHorasTreinamento,
      },
      alertasCriticos: {
        total: totalAlertas,
        basesComAlerta: Array.from(basesComAlerta),
      },
    },
    graficoComposed,
    rankingBases,
    pontosAtencao: pontosAtencao.slice(0, 10), // Limitar a 10 alertas
  }
}

