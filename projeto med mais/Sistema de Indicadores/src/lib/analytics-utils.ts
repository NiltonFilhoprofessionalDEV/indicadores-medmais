import { format, parse } from 'date-fns'
import { timeToMinutes, minutesToTime, calculateTimeDifference } from './masks'
import { calculateTAFStatus } from './calculations'
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

  // Performance de Resposta (1º CCI) - valor referência do campo tempo_chegada_1_cci
  const tempos1CCI: number[] = []
  items.forEach((item) => {
    if (item.conteudo.tempo_chegada_1_cci) {
      const tempo = parseTimeMMSS(item.conteudo.tempo_chegada_1_cci)
      if (tempo > 0) {
        tempos1CCI.push(tempo)
      }
    }
  })
  const tempoMedioResposta1CCI = tempos1CCI.length > 0
    ? tempos1CCI.reduce((a, b) => a + b, 0) / tempos1CCI.length
    : 0

  // Pior Tempo Resposta (1º CCI) - valor máximo
  const piorTempoResposta1CCI = tempos1CCI.length > 0
    ? Math.max(...tempos1CCI)
    : 0

  // % de Intervenções - porcentagem onde acao === 'Intervenção'
  const totalIntervencoes = items.filter((item) => 
    item.conteudo.acao === 'Intervenção'
  ).length
  const percentualIntervencoes = totalOcorrencias > 0
    ? (totalIntervencoes / totalOcorrencias) * 100
    : 0

  // Gráfico 1: Perfil da Operação (Donut Chart) - Posicionamento vs Intervenção
  const perfilOperacao = [
    {
      name: 'Posicionamento',
      value: items.filter((item) => item.conteudo.acao === 'Posicionamento').length,
      porcentagem: totalOcorrencias > 0
        ? (items.filter((item) => item.conteudo.acao === 'Posicionamento').length / totalOcorrencias) * 100
        : 0,
    },
    {
      name: 'Intervenção',
      value: totalIntervencoes,
      porcentagem: percentualIntervencoes,
    },
  ]

  // Gráfico 2: Agilidade da Equipe (Line Chart) - Performance de Resposta por Mês
  const tempoRespostaPorMes = new Map<string, { total: number; count: number }>()
  items.forEach((item) => {
    if (item.conteudo.tempo_chegada_1_cci) {
      const tempo = parseTimeMMSS(item.conteudo.tempo_chegada_1_cci)
      if (tempo > 0) {
        try {
          const date = parse(item.data_referencia, 'yyyy-MM-dd', new Date())
          const monthKey = format(date, 'yyyy-MM')
          const current = tempoRespostaPorMes.get(monthKey) || { total: 0, count: 0 }
          tempoRespostaPorMes.set(monthKey, {
            total: current.total + tempo,
            count: current.count + 1,
          })
        } catch {
          // Ignora datas inválidas
        }
      }
    }
  })
  const agilidadeEquipe = Array.from(tempoRespostaPorMes.entries())
    .map(([month, data]) => {
      try {
        const date = parse(month + '-01', 'yyyy-MM-dd', new Date())
        return {
          mes: format(date, 'MMM/yyyy'),
          mesKey: month,
          tempoMedioSegundos: data.count > 0 ? data.total / data.count : 0,
          tempoMedioFormatado: data.count > 0 ? secondsToMMSS(Math.round(data.total / data.count)) : '00:00',
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; tempoMedioSegundos: number; tempoMedioFormatado: string } => item !== null)
    .sort((a, b) => a.mesKey.localeCompare(b.mesKey))

  // Gráfico 3: Mapa de Calor de Locais (Bar Chart Horizontal) - Top 5
  const porLocalidade = new Map<string, number>()
  items.forEach((item) => {
    const local = item.conteudo.local || 'Não informado'
    porLocalidade.set(local, (porLocalidade.get(local) || 0) + 1)
  })
  const top5Locais = Array.from(porLocalidade.entries())
    .map(([local, qtd]) => ({ local, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5)

  return {
    kpis: {
      totalOcorrencias,
      tempoMedioResposta1CCI: secondsToMMSS(Math.round(tempoMedioResposta1CCI)),
      tempoMedioResposta1CCISegundos: tempoMedioResposta1CCI,
      piorTempoResposta1CCI: secondsToMMSS(Math.round(piorTempoResposta1CCI)),
      piorTempoResposta1CCISegundos: piorTempoResposta1CCI,
      percentualIntervencoes: Math.round(percentualIntervencoes * 100) / 100,
    },
    graficoPerfilOperacao: perfilOperacao,
    graficoAgilidadeEquipe: agilidadeEquipe,
    graficoTop5Locais: top5Locais,
    listaDetalhada: items,
  }
}

/**
 * Calcula valor referência de resposta entre duas horas (hora_chegada - hora_acionamento) em minutos
 * Exportada para uso em outros módulos se necessário
 */
export function calculateResponseTimeAvg(horaAcionamento: string, horaChegada: string): number {
  if (!horaAcionamento || !horaChegada) return 0
  try {
    const diff = calculateTimeDifference(horaAcionamento, horaChegada)
    return timeToMinutes(diff)
  } catch {
    return 0
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
  
  // Calcular durações para valor referência
  const duracoes: number[] = []
  items.forEach((item) => {
    if (item.conteudo.duracao_total) {
      duracoes.push(timeToMinutes(item.conteudo.duracao_total))
    } else if (item.conteudo.hora_acionamento && item.conteudo.hora_termino) {
      const diff = calculateTimeDifference(
        item.conteudo.hora_acionamento,
        item.conteudo.hora_termino
      )
      duracoes.push(timeToMinutes(diff))
    }
  })
  const duracaoMedia = duracoes.length > 0 
    ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length 
    : 0

  // Calcular eficiência de chegada (hora_chegada - hora_acionamento)
  const temposResposta: number[] = []
  items.forEach((item) => {
    if (item.conteudo.hora_acionamento && item.conteudo.hora_chegada) {
      const tempo = calculateResponseTimeAvg(item.conteudo.hora_acionamento, item.conteudo.hora_chegada)
      if (tempo > 0) {
        temposResposta.push(tempo)
      }
    }
  })
  const tempoMedioResposta = temposResposta.length > 0
    ? temposResposta.reduce((a, b) => a + b, 0) / temposResposta.length
    : 0

  // Gráfico: Evolução mensal (garantir ordenação cronológica)
  const monthlyDataRaw = Array.from(groupByMonth(lancamentos).entries())
    .map(([month, lancs]) => {
      try {
        const date = parse(month + '-01', 'yyyy-MM-dd', new Date())
        return {
          mes: format(date, 'MMM/yyyy'),
          mesKey: month, // Para ordenação correta
          quantidade: lancs.length,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; quantidade: number } => item !== null)
  
  // Ordenar por chave cronológica (yyyy-MM) antes de remover mesKey
  const monthlyData = monthlyDataRaw
    .sort((a, b) => a.mesKey.localeCompare(b.mesKey))
    .map(({ mesKey, ...rest }) => rest) // Remover mesKey após ordenação

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

  // Eficiência por Tipo (Eficiência de Chegada por Tipo)
  const tempoRespostaPorTipo = new Map<string, { total: number; count: number }>()
  items.forEach((item) => {
    if (item.conteudo.hora_acionamento && item.conteudo.hora_chegada) {
      const tipo = item.conteudo.tipo_ocorrencia || 'Não informado'
      const tempo = calculateResponseTimeAvg(item.conteudo.hora_acionamento, item.conteudo.hora_chegada)
      if (tempo > 0) {
        const current = tempoRespostaPorTipo.get(tipo) || { total: 0, count: 0 }
        tempoRespostaPorTipo.set(tipo, {
          total: current.total + tempo,
          count: current.count + 1,
        })
      }
    }
  })
  const eficienciaPorTipo = Array.from(tempoRespostaPorTipo.entries())
    .map(([tipo, data]) => ({
      tipo,
      tempoMedioMinutos: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => b.tempoMedioMinutos - a.tempoMedioMinutos) // Ordenar do maior para o menor

  // Locais Frequentes (Top 5)
  const locaisCount = new Map<string, number>()
  items.forEach((item) => {
    const local = (item.conteudo.local || 'Não informado').trim()
    const localLower = local.toLowerCase()
    // Agrupar case-insensitive
    const existingKey = Array.from(locaisCount.keys()).find(k => k.toLowerCase() === localLower)
    if (existingKey) {
      locaisCount.set(existingKey, (locaisCount.get(existingKey) || 0) + 1)
    } else {
      locaisCount.set(local, (locaisCount.get(local) || 0) + 1)
    }
  })
  const top5Locais = Array.from(locaisCount.entries())
    .map(([local, qtd]) => ({ local, qtd }))
    .sort((a, b) => b.qtd - a.qtd)
    .slice(0, 5)

  // Tempo Total por mês (mantido para compatibilidade, mas ordenado cronologicamente)
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
          mesKey: mes,
          tempoTotal: minutos,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; tempoTotal: number } => item !== null)
    .sort((a, b) => a.mesKey.localeCompare(b.mesKey))
    .map(({ mesKey, ...rest }) => rest)

  // Por localidade (mantido para compatibilidade)
  const porLocalidade = new Map<string, number>()
  items.forEach((item) => {
    const local = item.conteudo.local || 'Não informado'
    porLocalidade.set(local, (porLocalidade.get(local) || 0) + 1)
  })

  return {
    kpis: {
      totalOcorrencias,
      duracaoMedia: minutesToTime(Math.round(duracaoMedia)),
      tempoMedioResposta: secondsToMMSS(Math.round(tempoMedioResposta * 60)), // Converter minutos para segundos e depois para MM:ss
      tempoMedioRespostaMinutos: tempoMedioResposta, // Manter em minutos para cálculos
    },
    graficoEvolucaoMensal: monthlyData,
    graficoTop5Tipos: top5Tipos,
    graficoEficienciaPorTipo: eficienciaPorTipo,
    graficoTempoTotalPorMes: tempoTotalPorMes,
    top5Locais: top5Locais,
    porLocalidade: Array.from(porLocalidade.entries()).map(([local, qtd]) => ({ local, qtd })),
    listaDetalhada: items,
  }
}

/**
 * 3. TESTE DE APTIDÃO FÍSICA (TAF)
 * Quando colaboradorNome é informado, processa apenas os avaliados que batem com o nome (dados individuais).
 */
export function processTAF(lancamentos: Lancamento[], colaboradorNome?: string) {
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
        const nome = (avaliado.nome as string) || ''
        if (colaboradorNome && !nome.toLowerCase().includes(colaboradorNome.toLowerCase())) return
        const idade = Number(avaliado.idade) || 0
        const tempo = (avaliado.tempo as string) || ''
        let status = String(avaliado.status || '').trim()
        if ((!status || status === '-') && idade && tempo && tempo.includes(':')) {
          const res = calculateTAFStatus(idade, tempo)
          status = res.status
        }
        avaliados.push({
          nome,
          idade,
          tempo,
          status,
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
  void (tempos.length > 0 ? Math.max(...tempos) : 0) // tempoMaximo disponível para uso futuro

  // Distribuição por minutos
  const distribuicaoMinutos = new Map<number, number>()
  tempos.forEach((tempo) => {
    const minutos = Math.floor(tempo / 60)
    distribuicaoMinutos.set(minutos, (distribuicaoMinutos.get(minutos) || 0) + 1)
  })

  // Valor referência por equipe
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

  // % Aprovado/Reprovado (normalizar: trim + case-insensitive)
  const norm = (s: string) => (s || '').trim().toLowerCase()
  const aprovados = avaliados.filter((a) => norm(a.status) === 'aprovado').length
  const reprovados = avaliados.filter((a) => norm(a.status) === 'reprovado').length
  const total = avaliados.length

  // Evolução valor referência mensal
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

  // Valor referência por idade
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

  // Calcular taxa de aprovação
  const taxaAprovacao = total > 0 ? ((aprovados / total) * 100).toFixed(1) : '0.0'

  // Gráfico 2: Evolução do Condicionamento (Line Chart) - CORRIGIDO: Ordenação cronológica
  const evolucaoCondicionamentoRaw = Array.from(mediaPorMes.entries())
    .map(([mes, data]) => {
      try {
        const date = parse(mes + '-01', 'yyyy-MM-dd', new Date())
        return {
          mes: format(date, 'MMM/yyyy'),
          mesKey: mes, // Para ordenação cronológica correta
          tempoMedioSegundos: data.count > 0 ? data.total / data.count : 0,
          tempoMedioFormatado: data.count > 0 ? secondsToMMSS(Math.round(data.total / data.count)) : '00:00',
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; tempoMedioSegundos: number; tempoMedioFormatado: string } => item !== null)
  const evolucaoCondicionamento = evolucaoCondicionamentoRaw.sort((a, b) => a.mesKey.localeCompare(b.mesKey))

  // Gráfico 3: Performance por Faixa Etária (Bar Chart)
  const performancePorFaixaEtaria = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    if (a.tempo && a.idade) {
      let faixa = ''
      if (a.idade <= 30) {
        faixa = 'Até 30 anos'
      } else if (a.idade <= 40) {
        faixa = '31-40 anos'
      } else {
        faixa = 'Acima de 40 anos'
      }
      const tempo = parseTimeMMSS(a.tempo)
      const current = performancePorFaixaEtaria.get(faixa) || { total: 0, count: 0 }
      performancePorFaixaEtaria.set(faixa, {
        total: current.total + tempo,
        count: current.count + 1,
      })
    }
  })
  const graficoPerformancePorFaixaEtaria = Array.from(performancePorFaixaEtaria.entries())
    .map(([faixa, data]) => ({
      faixa,
      tempoMedioSegundos: data.count > 0 ? data.total / data.count : 0,
      tempoMedioFormatado: data.count > 0 ? secondsToMMSS(Math.round(data.total / data.count)) : '00:00',
    }))
    .sort((a, b) => {
      // Ordenar: Até 30, 31-40, Acima de 40
      const ordem: Record<string, number> = { 'Até 30 anos': 1, '31-40 anos': 2, 'Acima de 40 anos': 3 }
      return (ordem[a.faixa] || 99) - (ordem[b.faixa] || 99)
    })

  // Gráfico 4: Distribuição de Notas (Bar Chart)
  const distribuicaoNotas = new Map<number, number>()
  avaliados.forEach((a) => {
    if (a.nota !== undefined && a.nota !== null) {
      distribuicaoNotas.set(a.nota, (distribuicaoNotas.get(a.nota) || 0) + 1)
    }
  })
  const graficoDistribuicaoNotas = Array.from(distribuicaoNotas.entries())
    .map(([nota, qtd]) => ({ nota, quantidade: qtd }))
    .sort((a, b) => b.nota - a.nota) // Ordenar do maior para o menor (Nota 10 primeiro)

  return {
    kpis: {
      totalAvaliados: total,
      taxaAprovacao,
      melhorTempo: secondsToMMSS(menorTempo), // Recorde
      melhorTempoSegundos: menorTempo,
      tempoMedioGeral: secondsToMMSS(Math.round(tempoMedio)), // Índice de Performance Física
      tempoMedioGeralSegundos: tempoMedio,
      aprovados,
      reprovados,
    },
    graficoAprovadoReprovado: [
      { name: 'Aprovado', value: aprovados, porcentagem: total > 0 ? (aprovados / total) * 100 : 0 },
      { name: 'Reprovado', value: reprovados, porcentagem: total > 0 ? (reprovados / total) * 100 : 0 },
    ],
    graficoEvolucaoCondicionamento: evolucaoCondicionamento,
    graficoPerformancePorFaixaEtaria,
    graficoDistribuicaoNotas,
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
    tempoSegundos: number
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { avaliados?: Array<Record<string, unknown>> }
    if (conteudo.avaliados && Array.isArray(conteudo.avaliados)) {
      conteudo.avaliados.forEach((avaliado) => {
        const tempoStr = (avaliado.tempo as string) || ''
        const tempoSegundos = parseTimeMMSS(tempoStr)
        // Calcular status baseado em tempo <= 59s (Aprovado) vs > 59s (Reprovado)
        const statusCalculado = tempoSegundos > 0 && tempoSegundos <= 59 ? 'Aprovado' : 'Reprovado'
        
        avaliados.push({
          nome: (avaliado.nome as string) || '',
          tempo: tempoStr,
          status: statusCalculado,
          data_referencia: lancamento.data_referencia,
          equipe_id: lancamento.equipe_id,
          tempoSegundos,
        })
      })
    }
  })

  const tempos = avaliados.filter((a) => a.tempoSegundos > 0).map((a) => a.tempoSegundos)
  const totalAvaliacoes = avaliados.filter((a) => a.tempoSegundos > 0).length

  // KPIs
  const menorTempo = tempos.length > 0 ? Math.min(...tempos) : 0
  const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0
  
  // Encontrar recorde com nome e equipe
  const recordeIndex = tempos.indexOf(menorTempo)
  const recordeAvaliado = recordeIndex >= 0 ? avaliados.filter((a) => a.tempoSegundos > 0)[recordeIndex] : null
  
  // Taxa de Prontidão (% de bombeiros que fizeram abaixo de 59s)
  const dentroDaMeta = avaliados.filter((a) => a.tempoSegundos > 0 && a.tempoSegundos <= 59).length
  const taxaProntidao = totalAvaliacoes > 0 ? (dentroDaMeta / totalAvaliacoes) * 100 : 0

  // Gráfico 1: Aderência à Meta (Donut Chart)
  const graficoAderenciaMeta = [
    { name: 'Dentro da Meta (≤59s)', value: dentroDaMeta, porcentagem: taxaProntidao },
    { name: 'Acima da Meta (>59s)', value: totalAvaliacoes - dentroDaMeta, porcentagem: 100 - taxaProntidao },
  ]

  // Gráfico 2: Performance por Equipe (com Reference Line em 60s)
  const porEquipe = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    if (a.tempoSegundos > 0) {
      const current = porEquipe.get(a.equipe_id) || { total: 0, count: 0 }
      porEquipe.set(a.equipe_id, {
        total: current.total + a.tempoSegundos,
        count: current.count + 1,
      })
    }
  })
  const graficoPerformancePorEquipe = Array.from(porEquipe.entries()).map(([equipe, data]) => ({
    equipe,
    mediaSegundos: data.count > 0 ? data.total / data.count : 0,
    mediaFormatada: data.count > 0 ? secondsToMMSS(Math.round(data.total / data.count)) : '00:00',
  }))

  // Gráfico 3: Distribuição de Tempos (Histograma)
  const distribuicaoTempos = new Map<string, number>()
  avaliados.forEach((a) => {
    if (a.tempoSegundos > 0) {
      let faixa = ''
      if (a.tempoSegundos >= 30 && a.tempoSegundos <= 40) {
        faixa = '30-40s'
      } else if (a.tempoSegundos >= 41 && a.tempoSegundos <= 50) {
        faixa = '41-50s'
      } else if (a.tempoSegundos >= 51 && a.tempoSegundos <= 59) {
        faixa = '51-59s'
      } else if (a.tempoSegundos >= 60 && a.tempoSegundos <= 70) {
        faixa = '1m-1m10s'
      } else if (a.tempoSegundos > 70) {
        faixa = '1m10s+'
      } else {
        faixa = '<30s'
      }
      distribuicaoTempos.set(faixa, (distribuicaoTempos.get(faixa) || 0) + 1)
    }
  })
  const graficoDistribuicaoTempos = Array.from(distribuicaoTempos.entries())
    .map(([faixa, qtd]) => ({ faixa, qtd }))
    .sort((a, b) => {
      // Ordenar: <30s, 30-40s, 41-50s, 51-59s, 1m-1m10s, 1m10s+
      const ordem: Record<string, number> = {
        '<30s': 1,
        '30-40s': 2,
        '41-50s': 3,
        '51-59s': 4,
        '1m-1m10s': 5,
        '1m10s+': 6,
      }
      return (ordem[a.faixa] || 99) - (ordem[b.faixa] || 99)
    })

  // Gráfico 4: Evolução Mensal (Line Chart) - Ordenação Cronológica Corrigida
  const mediaPorMes = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    if (a.tempoSegundos > 0) {
      try {
        const date = parse(a.data_referencia, 'yyyy-MM-dd', new Date())
        const monthKey = format(date, 'yyyy-MM')
        const current = mediaPorMes.get(monthKey) || { total: 0, count: 0 }
        mediaPorMes.set(monthKey, {
          total: current.total + a.tempoSegundos,
          count: current.count + 1,
        })
      } catch {
        // Ignorar datas inválidas
      }
    }
  })
  const graficoEvolucaoMediaMensal = Array.from(mediaPorMes.entries())
    .map(([mesKey, data]) => {
      try {
        return {
          mes: format(parse(mesKey + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
          mesKey,
          mediaSegundos: data.count > 0 ? data.total / data.count : 0,
          mediaFormatada: data.count > 0 ? secondsToMMSS(Math.round(data.total / data.count)) : '00:00',
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; mediaSegundos: number; mediaFormatada: string } => item !== null)
    .sort((a, b) => a.mesKey.localeCompare(b.mesKey)) // Ordenação cronológica correta

  return {
    kpis: {
      totalAvaliacoes,
      taxaProntidao: Math.round(taxaProntidao * 100) / 100,
      tempoMedioGeral: secondsToMMSS(Math.round(tempoMedio)),
      tempoMedioGeralSegundos: tempoMedio,
      recorde: recordeAvaliado
        ? {
            tempo: secondsToMMSS(menorTempo),
            nome: recordeAvaliado.nome,
            equipe_id: recordeAvaliado.equipe_id,
          }
        : null,
    },
    graficoAderenciaMeta,
    graficoPerformancePorEquipe,
    graficoDistribuicaoTempos,
    graficoEvolucaoMediaMensal,
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
    tempoSegundos: number
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { afericoes?: Array<Record<string, unknown>> }
    if (conteudo.afericoes && Array.isArray(conteudo.afericoes)) {
      conteudo.afericoes.forEach((afericao) => {
        const tempoStr = (afericao.tempo as string) || ''
        const tempoSegundos = parseTimeMMSS(tempoStr)
        afericoes.push({
          viatura: (afericao.viatura as string) || '',
          motorista: (afericao.motorista as string) || '',
          local: (afericao.local as string) || '',
          tempo: tempoStr,
          data_referencia: lancamento.data_referencia,
          tempoSegundos,
        })
      })
    }
  })

  const tempos = afericoes.filter((a) => a.tempoSegundos > 0).map((a) => a.tempoSegundos)
  const totalExercicios = afericoes.filter((a) => a.tempoSegundos > 0).length

  // KPIs
  const menorTempo = tempos.length > 0 ? Math.min(...tempos) : 0
  const maiorTempo = tempos.length > 0 ? Math.max(...tempos) : 0
  const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0

  // Encontrar recorde (menor tempo) com viatura
  const recordeIndex = tempos.indexOf(menorTempo)
  const recordeAfericao = recordeIndex >= 0 ? afericoes.filter((a) => a.tempoSegundos > 0)[recordeIndex] : null

  // Encontrar maior tempo (alerta) com viatura
  const alertaIndex = tempos.indexOf(maiorTempo)
  const alertaAfericao = alertaIndex >= 0 ? afericoes.filter((a) => a.tempoSegundos > 0)[alertaIndex] : null

  // Gráfico 1: Performance por Viatura (Bar Chart)
  const porViatura = new Map<string, { total: number; count: number }>()
  afericoes.forEach((a) => {
    if (a.tempoSegundos > 0) {
      const current = porViatura.get(a.viatura) || { total: 0, count: 0 }
      porViatura.set(a.viatura, {
        total: current.total + a.tempoSegundos,
        count: current.count + 1,
      })
    }
  })
  const graficoPerformancePorViatura = Array.from(porViatura.entries())
    .map(([viatura, data]) => ({
      viatura,
      mediaSegundos: data.count > 0 ? data.total / data.count : 0,
      mediaFormatada: data.count > 0 ? secondsToMMSS(Math.round(data.total / data.count)) : '00:00',
    }))
    .sort((a, b) => a.viatura.localeCompare(b.viatura)) // Ordenar por nome da viatura

  // Gráfico 2: Curva de Agilidade (Line Chart) - Ordenação Cronológica Corrigida
  const mediaPorMes = new Map<string, { total: number; count: number }>()
  afericoes.forEach((a) => {
    if (a.tempoSegundos > 0) {
      try {
        const date = parse(a.data_referencia, 'yyyy-MM-dd', new Date())
        const monthKey = format(date, 'yyyy-MM')
        const current = mediaPorMes.get(monthKey) || { total: 0, count: 0 }
        mediaPorMes.set(monthKey, {
          total: current.total + a.tempoSegundos,
          count: current.count + 1,
        })
      } catch {
        // Ignorar datas inválidas
      }
    }
  })
  const graficoCurvaAgilidade = Array.from(mediaPorMes.entries())
    .map(([mesKey, data]) => {
      try {
        return {
          mes: format(parse(mesKey + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
          mesKey,
          mediaSegundos: data.count > 0 ? data.total / data.count : 0,
          mediaFormatada: data.count > 0 ? secondsToMMSS(Math.round(data.total / data.count)) : '00:00',
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; mediaSegundos: number; mediaFormatada: string } => item !== null)
    .sort((a, b) => a.mesKey.localeCompare(b.mesKey)) // Ordenação cronológica correta

  // Gráfico 3: Consistência (Donut Chart) - Classificação por faixas
  const excelente = afericoes.filter((a) => a.tempoSegundos > 0 && a.tempoSegundos < 120).length // < 2min
  const bom = afericoes.filter((a) => a.tempoSegundos >= 120 && a.tempoSegundos <= 180).length // 2min - 3min
  const critico = afericoes.filter((a) => a.tempoSegundos > 180).length // > 3min

  const graficoConsistencia = [
    { name: 'Excelente (< 2min)', value: excelente, porcentagem: totalExercicios > 0 ? (excelente / totalExercicios) * 100 : 0 },
    { name: 'Bom (2min - 3min)', value: bom, porcentagem: totalExercicios > 0 ? (bom / totalExercicios) * 100 : 0 },
    { name: 'Crítico (> 3min)', value: critico, porcentagem: totalExercicios > 0 ? (critico / totalExercicios) * 100 : 0 },
  ]

  return {
    kpis: {
      menorTempo: recordeAfericao
        ? {
            tempo: secondsToMMSS(menorTempo),
            viatura: recordeAfericao.viatura,
          }
        : null,
      maiorTempo: alertaAfericao
        ? {
            tempo: secondsToMMSS(maiorTempo),
            viatura: alertaAfericao.viatura,
          }
        : null,
      tempoMedioGeral: secondsToMMSS(Math.round(tempoMedio)),
      tempoMedioGeralSegundos: tempoMedio,
      totalExercicios,
    },
    graficoPerformancePorViatura,
    graficoCurvaAgilidade,
    graficoConsistencia,
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

  // Agrupar por colaborador e somar horas (meta: 16 horas mensais)
  const horasPorColaborador = new Map<string, { totalHorasMinutos: number; equipe_id: string }>()
  participantes.forEach((p) => {
    if (p.horas && p.nome) {
      const horasMinutos = timeToMinutes(p.horas)
      const current = horasPorColaborador.get(p.nome) || { totalHorasMinutos: 0, equipe_id: p.equipe_id }
      horasPorColaborador.set(p.nome, {
        totalHorasMinutos: current.totalHorasMinutos + horasMinutos,
        equipe_id: p.equipe_id,
      })
    }
  })

  // Classificar cada colaborador: Conforme (>=16h) ou Não Conforme (<16h)
  const metaHorasMinutos = 16 * 60 // 16 horas em minutos
  const colaboradoresConformes: Array<{ nome: string; horas: number; equipe_id: string }> = []
  const colaboradoresNaoConformes: Array<{ nome: string; horas: number; equipe_id: string }> = []

  horasPorColaborador.forEach((data, nome) => {
    const horasTotais = data.totalHorasMinutos / 60 // Converter para horas
    if (data.totalHorasMinutos >= metaHorasMinutos) {
      colaboradoresConformes.push({ nome, horas: horasTotais, equipe_id: data.equipe_id })
    } else {
      colaboradoresNaoConformes.push({ nome, horas: horasTotais, equipe_id: data.equipe_id })
    }
  })

  const efetivoTotal = horasPorColaborador.size
  const efetivoApto = colaboradoresConformes.length
  const efetivoIrregular = colaboradoresNaoConformes.length

  // Carga Horária de Qualificação
  const somaTotalHoras = Array.from(horasPorColaborador.values()).reduce((sum, data) => sum + (data.totalHorasMinutos / 60), 0)
  const mediaHorasGeral = efetivoTotal > 0 ? somaTotalHoras / efetivoTotal : 0

  // KPIs de Conformidade
  const percentualApto = efetivoTotal > 0 ? (efetivoApto / efetivoTotal) * 100 : 0
  const percentualIrregular = efetivoTotal > 0 ? (efetivoIrregular / efetivoTotal) * 100 : 0

  // Gráfico 1: Situação da Tropa (Donut Chart)
  const graficoSituacaoTropa = [
    { name: 'Conforme (>=16h)', value: efetivoApto, porcentagem: percentualApto },
    { name: 'Não Conforme (<16h)', value: efetivoIrregular, porcentagem: percentualIrregular },
  ]

  // Gráfico 2: Distribuição de Carga Horária (Histograma - Bar Chart)
  const distribuicaoCargaHoraria = new Map<string, number>()
  horasPorColaborador.forEach((data) => {
    const horasTotais = data.totalHorasMinutos / 60
    let faixa = ''
    if (horasTotais === 0 || horasTotais < 8) {
      faixa = '0-8h'
    } else if (horasTotais < 16) {
      faixa = '8-15h'
    } else if (horasTotais <= 24) {
      faixa = '16-24h'
    } else {
      faixa = '25h+'
    }
    distribuicaoCargaHoraria.set(faixa, (distribuicaoCargaHoraria.get(faixa) || 0) + 1)
  })
  const graficoDistribuicaoCargaHoraria = Array.from(distribuicaoCargaHoraria.entries())
    .map(([faixa, qtd]) => ({ faixa, quantidade: qtd }))
    .sort((a, b) => {
      // Ordenar: 0-8h, 8-15h, 16-24h, 25h+
      const ordem: Record<string, number> = { '0-8h': 1, '8-15h': 2, '16-24h': 3, '25h+': 4 }
      return (ordem[a.faixa] || 99) - (ordem[b.faixa] || 99)
    })

  // Gráfico 3: Desempenho por Equipe (Bar Chart com Reference Line em 16h)
  const mediaPorEquipe = new Map<string, { totalHoras: number; count: number }>()
  horasPorColaborador.forEach((data, _nome) => {
    const horasTotais = data.totalHorasMinutos / 60
    const current = mediaPorEquipe.get(data.equipe_id) || { totalHoras: 0, count: 0 }
    mediaPorEquipe.set(data.equipe_id, {
      totalHoras: current.totalHoras + horasTotais,
      count: current.count + 1,
    })
  })
  const graficoDesempenhoPorEquipe = Array.from(mediaPorEquipe.entries())
    .map(([equipeId, data]) => ({
      equipe: equipeId,
      mediaHoras: data.count > 0 ? data.totalHoras / data.count : 0,
    }))
    .sort((a, b) => b.mediaHoras - a.mediaHoras) // Ordenar do maior para o menor

  return {
    kpis: {
      efetivoTotalAnalisado: efetivoTotal,
      efetivoApto: efetivoApto,
      efetivoAptoPercentual: Number(percentualApto.toFixed(1)),
      efetivoIrregular: efetivoIrregular,
      efetivoIrregularPercentual: Number(percentualIrregular.toFixed(1)),
      mediaHorasGeral: Number(mediaHorasGeral.toFixed(2)),
      mediaHorasGeralFormatada: mediaHorasGeral.toFixed(2),
    },
    graficoSituacaoTropa,
    graficoDistribuicaoCargaHoraria,
    graficoDesempenhoPorEquipe,
    listaCompleta: Array.from(horasPorColaborador.entries()).map(([nome, data]) => ({
      nome,
      horas: data.totalHorasMinutos / 60,
      horasFormatadas: minutesToTime(data.totalHorasMinutos),
      status: data.totalHorasMinutos >= metaHorasMinutos ? 'Conforme' : 'Não Conforme',
      equipe_id: data.equipe_id,
    })),
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Converte tempo mm:ss para segundos
 */
export function parseTimeMMSS(time: string): number {
  if (!time || !time.includes(':')) return 0
  const [minutes, seconds] = time.split(':').map(Number)
  return minutes * 60 + seconds
}

/**
 * Converte string "mm:ss" em segundos
 * Alias para parseTimeMMSS para compatibilidade com requisitos
 */
export function parseMmSsToSeconds(timeString: string): number {
  return parseTimeMMSS(timeString)
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
 * Suporta dois formatos de conteudo:
 * - Array: conteudo.atividades = [ { tipo_atividade, ... } ]
 * - Objeto único: conteudo = { tipo_atividade, qtd_equipamentos, ... } (formulário atual)
 */
export function processAtividadesAcessorias(lancamentos: Lancamento[]) {
  const atividades: Array<{
    tipo_atividade: string
    qtd_equipamentos?: number
    qtd_bombeiros?: number
    tempo_gasto?: string
    data_referencia: string
  }> = []

  const pushAtividade = (
    tipo: string,
    qtdEq: number | undefined,
    qtdBom: number | undefined,
    tempo: string | undefined,
    dataRef: string
  ) => {
    atividades.push({
      tipo_atividade: tipo || 'Não informado',
      qtd_equipamentos: qtdEq,
      qtd_bombeiros: qtdBom,
      tempo_gasto: tempo,
      data_referencia: dataRef,
    })
  }

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as {
      atividades?: Array<Record<string, unknown>>
      tipo_atividade?: string
      qtd_equipamentos?: number
      qtd_bombeiros?: number
      tempo_gasto?: string
    }
    if (conteudo.atividades && Array.isArray(conteudo.atividades)) {
      conteudo.atividades.forEach((atividade) => {
        pushAtividade(
          (atividade.tipo_atividade as string) || '',
          atividade.qtd_equipamentos ? Number(atividade.qtd_equipamentos) : undefined,
          atividade.qtd_bombeiros ? Number(atividade.qtd_bombeiros) : undefined,
          (atividade.tempo_gasto as string) || undefined,
          lancamento.data_referencia
        )
      })
    } else if (conteudo.tipo_atividade) {
      pushAtividade(
        String(conteudo.tipo_atividade),
        conteudo.qtd_equipamentos !== undefined ? Number(conteudo.qtd_equipamentos) : undefined,
        conteudo.qtd_bombeiros !== undefined ? Number(conteudo.qtd_bombeiros) : undefined,
        conteudo.tempo_gasto ? String(conteudo.tempo_gasto) : undefined,
        lancamento.data_referencia
      )
    }
  })

  // KPIs
  const totalAtividades = atividades.length

  // Total de Horas Empenhadas: Soma de todo o tempo_gasto (HH:mm)
  let totalHorasMinutos = 0
  atividades.forEach((a) => {
    if (a.tempo_gasto) {
      totalHorasMinutos += timeToMinutes(a.tempo_gasto)
    }
  })
  const totalHorasEmpenhadas = minutesToTime(totalHorasMinutos)

  // Equipamentos Inspecionados: Soma do campo qtd_equipamentos
  const totalEquipamentos = atividades.reduce((sum, a) => {
    return sum + (a.qtd_equipamentos || 0)
  }, 0)

  // Efetivo Empenhado por Atividade: Valor referência do campo qtd_bombeiros (arredondado)
  const bombeirosValues = atividades
    .map((a) => a.qtd_bombeiros)
    .filter((val): val is number => val !== undefined && val !== null)
  const mediaBombeiros = bombeirosValues.length > 0
    ? Math.round(bombeirosValues.reduce((a, b) => a + b, 0) / bombeirosValues.length)
    : 0

  // Gráfico 1: Onde gastamos nosso tempo? (Donut Chart) - Tempo por tipo_atividade
  const tempoPorTipo = new Map<string, number>()
  atividades.forEach((a) => {
    if (a.tempo_gasto && a.tipo_atividade) {
      const tempoMinutos = timeToMinutes(a.tempo_gasto)
      const tipo = a.tipo_atividade || 'Não informado'
      tempoPorTipo.set(tipo, (tempoPorTipo.get(tipo) || 0) + tempoMinutos)
    }
  })
  const graficoTempoPorTipo = Array.from(tempoPorTipo.entries())
    .map(([tipo, minutos]) => {
      void atividades.reduce((sum, a) => {
        if (a.tipo_atividade === tipo && a.tempo_gasto) {
          return sum + timeToMinutes(a.tempo_gasto)
        }
        return sum
      }, 0)
      const totalGeral = Array.from(tempoPorTipo.values()).reduce((a, b) => a + b, 0)
      return {
        name: tipo,
        value: minutos,
        porcentagem: totalGeral > 0 ? (minutos / totalGeral) * 100 : 0,
      }
    })
    .sort((a, b) => b.value - a.value)

  // Gráfico 2: Ranking de Frequência (Bar Chart Horizontal) - Atividades por tipo
  const tiposCount = new Map<string, number>()
  atividades.forEach((a) => {
    const tipo = a.tipo_atividade || 'Não informado'
    tiposCount.set(tipo, (tiposCount.get(tipo) || 0) + 1)
  })
  const graficoRankingFrequencia = Array.from(tiposCount.entries())
    .map(([tipo, qtd]) => ({ tipo, qtd }))
    .sort((a, b) => b.qtd - a.qtd)

  // Gráfico 3: Evolução de Produtividade (Composed Chart) - Quantidade e Horas por mês
  const produtividadePorMes = new Map<string, { quantidade: number; horasMinutos: number }>()
  atividades.forEach((a) => {
    try {
      const date = parse(a.data_referencia, 'yyyy-MM-dd', new Date())
      const monthKey = format(date, 'yyyy-MM')
      const current = produtividadePorMes.get(monthKey) || { quantidade: 0, horasMinutos: 0 }
      produtividadePorMes.set(monthKey, {
        quantidade: current.quantidade + 1,
        horasMinutos: current.horasMinutos + (a.tempo_gasto ? timeToMinutes(a.tempo_gasto) : 0),
      })
    } catch {
      // Ignora datas inválidas
    }
  })
  const graficoEvolucaoProdutividade = Array.from(produtividadePorMes.entries())
    .map(([month, data]) => {
      try {
        const date = parse(month + '-01', 'yyyy-MM-dd', new Date())
        return {
          mes: format(date, 'MMM/yyyy'),
          mesKey: month,
          quantidade: data.quantidade,
          horasMinutos: data.horasMinutos,
          horasFormatadas: minutesToTime(data.horasMinutos),
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; quantidade: number; horasMinutos: number; horasFormatadas: string } => item !== null)
    .sort((a, b) => a.mesKey.localeCompare(b.mesKey))

  return {
    kpis: {
      totalAtividades,
      totalHorasEmpenhadas,
      totalEquipamentos,
      mediaBombeiros,
    },
    graficoTempoPorTipo,
    graficoRankingFrequencia,
    graficoEvolucaoProdutividade,
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
    equipe_id: string
  }> = []

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as { avaliados?: Array<Record<string, unknown>> }
    if (conteudo.avaliados && Array.isArray(conteudo.avaliados)) {
      conteudo.avaliados.forEach((avaliado) => {
        const nome = (avaliado.nome as string) || ''
        if (!colaboradorNome || nome.toLowerCase().includes(colaboradorNome.toLowerCase())) {
          const nota = Number(avaliado.nota) || 0
          // CORREÇÃO CRÍTICA: Calcular status baseado na nota (>= 8.0 = Aprovado)
          const status = nota >= 8.0 ? 'Aprovado' : 'Reprovado'
          
          avaliados.push({
            nome,
            nota,
            status,
            data_referencia: lancamento.data_referencia,
            equipe_id: lancamento.equipe_id,
          })
        }
      })
    }
  })

  const total = avaliados.length
  
  // CORREÇÃO: Calcular aprovação baseado em nota >= 8.0
  const aprovados = avaliados.filter((a) => a.nota >= 8.0).length
  const reprovados = total - aprovados
  
  const notaMedia = total > 0 ? avaliados.reduce((sum, a) => sum + a.nota, 0) / total : 0
  const notaMaxima = avaliados.length > 0 ? Math.max(...avaliados.map((a) => a.nota)) : 0

  // Gráfico 1: Status (Donut Chart) - Corrigido
  const graficoStatus = [
    { name: 'Aprovado', value: aprovados, porcentagem: total > 0 ? (aprovados / total) * 100 : 0 },
    { name: 'Reprovado', value: reprovados, porcentagem: total > 0 ? (reprovados / total) * 100 : 0 },
  ]

  // Gráfico 2: Distribuição de Notas (Histograma - Bar Chart)
  const distribuicaoNotas = new Map<string, number>()
  avaliados.forEach((a) => {
    let faixa = ''
    if (a.nota >= 9.0) {
      faixa = 'Excelência (9.0 - 10.0)'
    } else if (a.nota >= 8.0) {
      faixa = 'Na Média (8.0 - 8.9)'
    } else {
      faixa = 'Abaixo da Média (< 8.0)'
    }
    distribuicaoNotas.set(faixa, (distribuicaoNotas.get(faixa) || 0) + 1)
  })
  const graficoDistribuicaoNotas = Array.from(distribuicaoNotas.entries())
    .map(([faixa, qtd]) => ({ faixa, quantidade: qtd }))
    .sort((a, b) => {
      // Ordenar: Excelência primeiro, depois Na Média, depois Abaixo da Média
      const ordem: Record<string, number> = {
        'Excelência (9.0 - 10.0)': 1,
        'Na Média (8.0 - 8.9)': 2,
        'Abaixo da Média (< 8.0)': 3,
      }
      return (ordem[a.faixa] || 99) - (ordem[b.faixa] || 99)
    })

  // Gráfico 3: Ranking de Conhecimento por Equipe (Bar Chart)
  const mediaPorEquipe = new Map<string, { total: number; count: number }>()
  avaliados.forEach((a) => {
    const current = mediaPorEquipe.get(a.equipe_id) || { total: 0, count: 0 }
    mediaPorEquipe.set(a.equipe_id, {
      total: current.total + a.nota,
      count: current.count + 1,
    })
  })
  const graficoRankingPorEquipe = Array.from(mediaPorEquipe.entries())
    .map(([equipeId, data]) => ({
      equipe: equipeId,
      notaMedia: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => b.notaMedia - a.notaMedia) // Ordenar do maior para o menor

  // Gráfico 4: Evolução do Conhecimento (Line Chart) - CORRIGIDO: Ordenação cronológica
  const evolucaoConhecimentoRaw = Array.from(
    avaliados.reduce((acc, a) => {
      try {
        const month = format(parse(a.data_referencia, 'yyyy-MM-dd', new Date()), 'yyyy-MM')
        const current = acc.get(month) || { total: 0, count: 0 }
        acc.set(month, {
          total: current.total + a.nota,
          count: current.count + 1,
        })
      } catch {
        // Ignora datas inválidas
      }
      return acc
    }, new Map<string, { total: number; count: number }>()).entries()
  )
    .map(([mes, data]) => {
      try {
        const date = parse(mes + '-01', 'yyyy-MM-dd', new Date())
        return {
          mes: format(date, 'MMM/yyyy'),
          mesKey: mes, // Para ordenação cronológica correta
          notaMedia: data.count > 0 ? data.total / data.count : 0,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; notaMedia: number } => item !== null)
  const graficoEvolucaoConhecimento = evolucaoConhecimentoRaw.sort((a, b) => a.mesKey.localeCompare(b.mesKey))

  return {
    kpis: {
      totalAvaliados: total,
      notaMediaGeral: Number(notaMedia.toFixed(2)),
      notaMediaFormatada: notaMedia.toFixed(2),
      taxaAprovacao: total > 0 ? Number(((aprovados / total) * 100).toFixed(1)) : 0,
      taxaAprovacaoFormatada: total > 0 ? ((aprovados / total) * 100).toFixed(1) : '0.0',
      notaMaxima: Number(notaMaxima.toFixed(2)),
      notaMaximaFormatada: notaMaxima.toFixed(2),
      aprovados,
      reprovados,
    },
    graficoStatus,
    graficoDistribuicaoNotas,
    graficoRankingPorEquipe,
    graficoEvolucaoConhecimento,
    listaCompleta: avaliados,
  }
}

/**
 * 9. INSPEÇÃO DE VIATURAS
 */
export function processInspecaoViaturas(lancamentos: Lancamento[]) {
  // Flatten arrays: extrair todas as inspeções de todos os lançamentos
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

  // KPIs: Totais agregados
  const totalInspecoes = inspecoes.reduce((sum, i) => sum + i.qtd_inspecoes, 0)
  const totalNaoConforme = inspecoes.reduce((sum, i) => sum + i.qtd_nao_conforme, 0)
  const totalConforme = totalInspecoes - totalNaoConforme
  
  // Taxa de Conformidade Global
  const taxaConformidadeGlobal = totalInspecoes > 0 
    ? ((totalConforme / totalInspecoes) * 100) 
    : 100

  // Viatura Mais Crítica (maior soma de não conformidades)
  const porViatura = new Map<string, { inspecoes: number; naoConforme: number }>()
  inspecoes.forEach((i) => {
    const current = porViatura.get(i.viatura) || { inspecoes: 0, naoConforme: 0 }
    porViatura.set(i.viatura, {
      inspecoes: current.inspecoes + i.qtd_inspecoes,
      naoConforme: current.naoConforme + i.qtd_nao_conforme,
    })
  })
  
  const viaturaMaisCritica = Array.from(porViatura.entries())
    .map(([viatura, data]) => ({ viatura, naoConforme: data.naoConforme }))
    .sort((a, b) => b.naoConforme - a.naoConforme)[0] || null

  // Gráfico 1: Saúde da Frota (Donut Chart)
  const graficoSaudeFrota = [
    { name: 'Conformes', value: totalConforme, porcentagem: taxaConformidadeGlobal },
    { name: 'Não Conformes', value: totalNaoConforme, porcentagem: 100 - taxaConformidadeGlobal },
  ]

  // Gráfico 2: Ranking de Problemas (Bar Chart) - Ordenado por não conformidades (maior para menor)
  const graficoRankingProblemas = Array.from(porViatura.entries())
    .map(([viatura, data]) => ({
      viatura,
      inspecoes: data.inspecoes,
      naoConforme: data.naoConforme,
    }))
    .sort((a, b) => b.naoConforme - a.naoConforme) // Ordenação: mais defeitos primeiro

  // Gráfico 3: Tendência de Desgaste (Line Chart) - Não conformidades por mês
  const naoConformePorMes = new Map<string, number>()
  inspecoes.forEach((i) => {
    try {
      const date = parse(i.data_referencia, 'yyyy-MM-dd', new Date())
      const monthKey = format(date, 'yyyy-MM')
      const current = naoConformePorMes.get(monthKey) || 0
      naoConformePorMes.set(monthKey, current + i.qtd_nao_conforme)
    } catch {
      // Ignorar datas inválidas
    }
  })
  
  const graficoTendenciaDesgaste = Array.from(naoConformePorMes.entries())
    .map(([mesKey, qtd]) => {
      try {
        return {
          mes: format(parse(mesKey + '-01', 'yyyy-MM-dd', new Date()), 'MMM/yyyy'),
          mesKey,
          naoConforme: qtd,
        }
      } catch {
        return null
      }
    })
    .filter((item): item is { mes: string; mesKey: string; naoConforme: number } => item !== null)
    .sort((a, b) => a.mesKey.localeCompare(b.mesKey)) // Ordenação cronológica correta

  return {
    kpis: {
      totalInspecoes,
      totalNaoConforme,
      taxaConformidadeGlobal: Math.round(taxaConformidadeGlobal * 100) / 100,
      viaturaMaisCritica: viaturaMaisCritica
        ? {
            viatura: viaturaMaisCritica.viatura,
            naoConforme: viaturaMaisCritica.naoConforme,
          }
        : null,
    },
    graficoSaudeFrota,
    graficoRankingProblemas,
    graficoTendenciaDesgaste,
    listaCompleta: inspecoes,
  }
}

/**
 * 10. CONTROLE DE ESTOQUE
 */
export function processControleEstoque(lancamentos: Lancamento[], bases?: Array<{ id: string; nome: string }>) {
  // Suportar dois formatos:
  // 1. Array de itens: conteudo.itens[]
  // 2. Campos diretos: conteudo.po_quimico_atual, lge_atual, nitrogenio_atual
  
  // Agrupar por base (última entrada de cada base)
  const porBase = new Map<string, {
    po_quimico_atual: number
    po_quimico_exigido: number
    lge_atual: number
    lge_exigido: number
    nitrogenio_atual: number
    nitrogenio_exigido: number
  }>()

  lancamentos.forEach((lancamento) => {
    const conteudo = lancamento.conteudo as {
      itens?: Array<Record<string, unknown>>
      po_quimico_atual?: number
      po_quimico_exigido?: number
      lge_atual?: number
      lge_exigido?: number
      nitrogenio_atual?: number
      nitrogenio_exigido?: number
    }

    // Formato 1: Array de itens
    if (conteudo.itens && Array.isArray(conteudo.itens)) {
      const baseId = lancamento.base_id
      const baseData = porBase.get(baseId) || {
        po_quimico_atual: 0,
        po_quimico_exigido: 0,
        lge_atual: 0,
        lge_exigido: 0,
        nitrogenio_atual: 0,
        nitrogenio_exigido: 0,
      }

      conteudo.itens.forEach((item) => {
        const tipo = (item.tipo_material as string) || ''
        const atual = Number(item.qtd_atual) || 0
        const exigido = Number(item.qtd_exigida) || 0

        if (tipo.toLowerCase().includes('pó') || tipo.toLowerCase().includes('po')) {
          baseData.po_quimico_atual = atual
          baseData.po_quimico_exigido = exigido
        } else if (tipo.toLowerCase().includes('lge')) {
          baseData.lge_atual = atual
          baseData.lge_exigido = exigido
        } else if (tipo.toLowerCase().includes('nitrogênio') || tipo.toLowerCase().includes('nitrogenio')) {
          baseData.nitrogenio_atual = atual
          baseData.nitrogenio_exigido = exigido
        }
      })

      porBase.set(baseId, baseData)
    } else {
      // Formato 2: Campos diretos
      const baseId = lancamento.base_id
      porBase.set(baseId, {
        po_quimico_atual: Number(conteudo.po_quimico_atual) || 0,
        po_quimico_exigido: Number(conteudo.po_quimico_exigido) || 0,
        lge_atual: Number(conteudo.lge_atual) || 0,
        lge_exigido: Number(conteudo.lge_exigido) || 0,
        nitrogenio_atual: Number(conteudo.nitrogenio_atual) || 0,
        nitrogenio_exigido: Number(conteudo.nitrogenio_exigido) || 0,
      })
    }
  })

  // Calcular totais globais
  let totalPoAtual = 0
  let totalPoExigido = 0
  let totalLgeAtual = 0
  let totalLgeExigido = 0
  let totalNitrogenioAtual = 0
  let totalNitrogenioExigido = 0

  porBase.forEach((data) => {
    totalPoAtual += data.po_quimico_atual
    totalPoExigido += data.po_quimico_exigido
    totalLgeAtual += data.lge_atual
    totalLgeExigido += data.lge_exigido
    totalNitrogenioAtual += data.nitrogenio_atual
    totalNitrogenioExigido += data.nitrogenio_exigido
  })

  // KPIs: Taxa de Cobertura
  const coberturaPo = totalPoExigido > 0 ? (totalPoAtual / totalPoExigido) * 100 : 100
  const coberturaLge = totalLgeExigido > 0 ? (totalLgeAtual / totalLgeExigido) * 100 : 100
  const coberturaNitrogenio = totalNitrogenioExigido > 0 ? (totalNitrogenioAtual / totalNitrogenioExigido) * 100 : 100

  // Identificar bases com déficit
  const basesComDeficit = new Set<string>()
  const alertasFaltaMaterial: Array<{ base: string; material: string; falta: number }> = []

  porBase.forEach((data, baseId) => {
    const baseNome = bases?.find((b) => b.id === baseId)?.nome || baseId

    if (data.po_quimico_atual < data.po_quimico_exigido) {
      basesComDeficit.add(baseId)
      alertasFaltaMaterial.push({
        base: baseNome,
        material: 'Pó Químico',
        falta: data.po_quimico_exigido - data.po_quimico_atual,
      })
    }
    if (data.lge_atual < data.lge_exigido) {
      basesComDeficit.add(baseId)
      alertasFaltaMaterial.push({
        base: baseNome,
        material: 'LGE',
        falta: data.lge_exigido - data.lge_atual,
      })
    }
    if (data.nitrogenio_atual < data.nitrogenio_exigido) {
      basesComDeficit.add(baseId)
      alertasFaltaMaterial.push({
        base: baseNome,
        material: 'Nitrogênio',
        falta: data.nitrogenio_exigido - data.nitrogenio_atual,
      })
    }
  })

  // Gráfico Grouped Bar Chart (Atual vs Exigido)
  const graficoGroupedBar = [
    {
      material: 'Pó Químico',
      exigido: totalPoExigido,
      atual: totalPoAtual,
      corAtual: totalPoAtual < totalPoExigido ? '#ef4444' : '#3b82f6',
    },
    {
      material: 'LGE',
      exigido: totalLgeExigido,
      atual: totalLgeAtual,
      corAtual: totalLgeAtual < totalLgeExigido ? '#ef4444' : '#3b82f6',
    },
    {
      material: 'Nitrogênio',
      exigido: totalNitrogenioExigido,
      atual: totalNitrogenioAtual,
      corAtual: totalNitrogenioAtual < totalNitrogenioExigido ? '#ef4444' : '#3b82f6',
    },
  ]

  return {
    kpis: {
      coberturaPo: Math.round(coberturaPo * 100) / 100,
      coberturaLge: Math.round(coberturaLge * 100) / 100,
      coberturaNitrogenio: Math.round(coberturaNitrogenio * 100) / 100,
      basesComDeficit: basesComDeficit.size,
    },
    graficoGroupedBar,
    alertasFaltaMaterial,
    porBase: Array.from(porBase.entries()).map(([baseId, data]) => ({
      baseId,
      baseNome: bases?.find((b) => b.id === baseId)?.nome || baseId,
      ...data,
      critica: data.po_quimico_atual < data.po_quimico_exigido ||
               data.lge_atual < data.lge_exigido ||
               data.nitrogenio_atual < data.nitrogenio_exigido,
    })),
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
    return indicador?.schema_type === 'ocorrencia_aero'
  })
  const ocorrenciasNaoAero = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'ocorrencia_nao_aero'
  })
  const tempoResposta = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'tempo_resposta'
  })
  const treinamento = lancamentos.filter((l) => {
    const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
    return indicador?.schema_type === 'treinamento'
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

  // Calcular período anterior para comparação (30 dias antes do período atual)
  // Se não houver filtro de data, usar a data mais recente como referência
  const datasOcorrencias = ocorrenciasAero.concat(ocorrenciasNaoAero).map(l => l.data_referencia).sort().reverse()
  const dataMaisAntiga = datasOcorrencias.length > 0 ? datasOcorrencias[datasOcorrencias.length - 1] : ''
  
  // Calcular período anterior (30 dias antes da data mais antiga do período atual)
  let ocorrenciasPeriodoAnterior = 0
  if (dataMaisAntiga) {
    try {
      const dataRef = parse(dataMaisAntiga, 'yyyy-MM-dd', new Date())
      const dataInicioAnterior = format(new Date(dataRef.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      const dataFimAnterior = format(new Date(dataRef.getTime() - 1 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      
      ocorrenciasPeriodoAnterior = lancamentos.filter((l) => {
        const indicador = indicadoresConfig.find((i) => i.id === l.indicador_id)
        const isOcorrencia = indicador?.schema_type === 'ocorrencia_aero' || indicador?.schema_type === 'ocorrencia_nao_aero'
        return isOcorrencia && l.data_referencia >= dataInicioAnterior && l.data_referencia <= dataFimAnterior
      }).length
    } catch {
      // Se houver erro no parse, usar 0
      ocorrenciasPeriodoAnterior = 0
    }
  }
  
  const crescimentoVolume = ocorrenciasPeriodoAnterior > 0 
    ? ((totalOcorrencias - ocorrenciasPeriodoAnterior) / ocorrenciasPeriodoAnterior) * 100 
    : totalOcorrencias > 0 ? 100 : 0

  // 2. Agilidade (Índice de Agilidade Operacional)
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
    const conteudo = lancamento.conteudo as { inspecoes?: Array<Record<string, unknown>> }
    if (conteudo.inspecoes && Array.isArray(conteudo.inspecoes)) {
      const temNaoConforme = conteudo.inspecoes.some((v) => {
        const qtdNaoConforme = Number(v.qtd_nao_conforme) || 0
        return qtdNaoConforme > 0
      })
      if (temNaoConforme) {
        basesComAlerta.add(lancamento.base_id)
      }
    }
  })

  const totalAlertas = basesComAlerta.size

  // 5. Gráfico Composed (Volume Operacional vs Agilidade de Resposta por Mês)
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
    const conteudo = lancamento.conteudo as { inspecoes?: Array<Record<string, unknown>> }
    if (conteudo.inspecoes && Array.isArray(conteudo.inspecoes)) {
      conteudo.inspecoes.forEach((inspecao) => {
        const qtdNaoConforme = Number(inspecao.qtd_nao_conforme) || 0
        if (qtdNaoConforme > 0) {
          const baseNome = bases.find((b) => b.id === lancamento.base_id)?.nome || lancamento.base_id
          const viatura = (inspecao.viatura as string) || 'Desconhecida'
          pontosAtencao.push({ tipo: 'viatura', mensagem: `Viatura ${viatura} Não Conforme`, base: baseNome })
        }
      })
    }
  })

  return {
    kpis: {
      volumeOperacional: {
        valor: totalOcorrencias || 0,
        crescimento: isNaN(crescimentoVolume) ? 0 : crescimentoVolume,
        periodoAnterior: ocorrenciasPeriodoAnterior || 0,
      },
      agilidade: {
        tempoMedio: tempoMedioResposta > 0 ? secondsToMMSS(tempoMedioResposta) : '00:00',
        tempoMedioMinutos: isNaN(tempoMedioMinutos) ? 0 : tempoMedioMinutos,
        cor: corAgilidade || 'yellow',
      },
      forcaTrabalho: {
        totalHoras: totalHorasTreinamento > 0 ? minutesToTime(totalHorasTreinamento) : '00:00',
        totalMinutos: totalHorasTreinamento || 0,
      },
      alertasCriticos: {
        total: totalAlertas || 0,
        basesComAlerta: Array.from(basesComAlerta),
      },
    },
    graficoComposed: graficoComposed || [],
    rankingBases: rankingBases || [],
    pontosAtencao: pontosAtencao.slice(0, 10), // Limitar a 10 alertas
  }
}

