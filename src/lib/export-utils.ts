/**
 * Utilitários para exportação de dados para CSV
 * Implementa flattening de dados JSONB para formato tabular compatível com Excel
 */

import type { Database } from './database.types'

type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Indicador = Database['public']['Tables']['indicadores_config']['Row']

interface FlattenedRow {
  [key: string]: string | number | null | undefined
}

/**
 * Achata (flatten) um lançamento em uma ou mais linhas CSV
 * Se o indicador contém arrays (ex: TAF com avaliados), cria uma linha por item
 */
export function flattenLancamento(
  lancamento: Lancamento,
  indicador: Indicador,
  userName: string,
  baseName: string,
  equipeName: string
): FlattenedRow[] {
  const conteudo = lancamento.conteudo as Record<string, any>
  const schemaType = indicador.schema_type

  // Campos comuns para todas as linhas
  const baseRow: FlattenedRow = {
    id: lancamento.id,
    data_hora_registro: lancamento.created_at ? new Date(lancamento.created_at).toLocaleString('pt-BR') : '',
    data_referencia: lancamento.data_referencia,
    usuario: userName,
    base: baseName,
    equipe: equipeName,
    indicador: indicador.nome,
    indicador_tipo: schemaType,
  }

  // Verificar se o conteúdo tem arrays que precisam ser "unwinded"
  const hasArray = 
    Array.isArray(conteudo?.avaliados) || 
    Array.isArray(conteudo?.colaboradores) ||
    Array.isArray(conteudo?.inspecoes)

  if (hasArray) {
    // Indicadores com arrays: criar uma linha por item
    let arrayKey = 'avaliados'
    if (conteudo?.avaliados) arrayKey = 'avaliados'
    else if (conteudo?.colaboradores) arrayKey = 'colaboradores'
    else if (conteudo?.inspecoes) arrayKey = 'inspecoes'
    
    const items = conteudo[arrayKey] as Array<Record<string, any>>

    if (!items || items.length === 0) {
      // Se não há itens, retornar linha base com campos do conteúdo
      return [flattenConteudo(baseRow, conteudo, schemaType)]
    }

    return items.map((item) => {
      const row = { ...baseRow }
      
      // Adicionar campos do item do array
      Object.keys(item).forEach((key) => {
        const value = item[key]
        if (value !== null && value !== undefined) {
          row[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
        }
      })

      // Adicionar campos do conteúdo principal (fora do array)
      Object.keys(conteudo).forEach((key) => {
        if (key !== arrayKey && conteudo[key] !== null && conteudo[key] !== undefined) {
          const value = conteudo[key]
          row[`conteudo_${key}`] = typeof value === 'object' ? JSON.stringify(value) : String(value)
        }
      })

      return row
    })
  } else {
    // Indicadores simples: uma linha por lançamento
    return [flattenConteudo(baseRow, conteudo, schemaType)]
  }
}

/**
 * Achata campos do conteúdo para uma linha CSV
 */
function flattenConteudo(
  baseRow: FlattenedRow,
  conteudo: Record<string, any>,
  schemaType: string
): FlattenedRow {
  const row = { ...baseRow }

  if (!conteudo) {
    return row
  }

  // Mapear campos específicos por tipo de indicador
  switch (schemaType) {
    case 'ocorrencia_aero':
      row.local = conteudo.local || ''
      row.acao = conteudo.acao || ''
      row.tempo_chegada_1_cci = conteudo.tempo_chegada_1_cci || ''
      row.tempo_chegada_ult_cci = conteudo.tempo_chegada_ult_cci || ''
      break

    case 'ocorrencia_nao_aero':
      row.tipo_ocorrencia = conteudo.tipo_ocorrencia || ''
      row.local = conteudo.local || ''
      row.duracao = conteudo.duracao || ''
      row.hora_acionamento = conteudo.hora_acionamento || ''
      row.hora_chegada = conteudo.hora_chegada || ''
      break

    case 'atividades_acessorias':
      row.tipo_atividade = conteudo.tipo_atividade || ''
      row.qtd_bombeiros = conteudo.qtd_bombeiros || ''
      row.tempo_gasto = conteudo.tempo_gasto || ''
      row.qtd_equipamentos = conteudo.qtd_equipamentos || ''
      break

    case 'taf':
      // TAF já é tratado no flattenLancamento (tem array avaliados)
      break

    case 'prova_teorica':
      // Prova Teórica já é tratado no flattenLancamento (tem array avaliados)
      break

    case 'treinamento':
      // Treinamento já é tratado no flattenLancamento (tem array colaboradores)
      break

    case 'tempo_tp_epr':
      row.tempo_medio = conteudo.tempo_medio || ''
      break

    case 'tempo_resposta':
      row.tempo_medio = conteudo.tempo_medio || ''
      row.viatura = conteudo.viatura || ''
      break

    case 'inspecao_viaturas':
      // Inspeção já é tratado no flattenLancamento (tem array inspecoes)
      // Campos adicionais podem ser adicionados aqui se necessário
      break

    case 'estoque':
      row.po_quimico_atual = conteudo.po_quimico_atual || ''
      row.po_quimico_exigido = conteudo.po_quimico_exigido || ''
      row.lge_atual = conteudo.lge_atual || ''
      row.lge_exigido = conteudo.lge_exigido || ''
      row.nitrogenio_atual = conteudo.nitrogenio_atual || ''
      row.nitrogenio_exigido = conteudo.nitrogenio_exigido || ''
      break

    case 'controle_epi':
      // EPI já é tratado no flattenLancamento (tem array colaboradores)
      break

    case 'controle_trocas':
      row.qtd_trocas = conteudo.qtd_trocas || ''
      break

    case 'verificacao_tp':
      row.qtd_conformes = conteudo.qtd_conformes || ''
      row.qtd_verificados = conteudo.qtd_verificados || ''
      row.qtd_total_equipe = conteudo.qtd_total_equipe || ''
      break

    case 'higienizacao_tp':
      row.qtd_higienizados_mes = conteudo.qtd_higienizados_mes || ''
      row.qtd_total_sci = conteudo.qtd_total_sci || ''
      break

    default:
      // Para tipos desconhecidos, adicionar todos os campos do conteúdo
      Object.keys(conteudo).forEach((key) => {
        const value = conteudo[key]
        if (value !== null && value !== undefined && !Array.isArray(value)) {
          row[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
        }
      })
  }

  // Adicionar observações se existir
  if (conteudo.observacoes) {
    row.observacoes = String(conteudo.observacoes)
  }

  return row
}

/**
 * Converte array de objetos para CSV
 */
export function convertToCSV(rows: FlattenedRow[]): string {
  if (rows.length === 0) {
    return ''
  }

  // Obter todas as chaves únicas de todas as linhas
  const allKeys = new Set<string>()
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => allKeys.add(key))
  })

  const headers = Array.from(allKeys).sort()

  // Criar linha de cabeçalho
  const headerRow = headers.map((key) => escapeCSVValue(String(key))).join(',')

  // Criar linhas de dados
  const dataRows = rows.map((row) => {
    return headers
      .map((key) => {
        const value = row[key]
        return escapeCSVValue(value !== null && value !== undefined ? String(value) : '')
      })
      .join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

/**
 * Escapa valores CSV (trata vírgulas, aspas e quebras de linha)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Faz download do CSV
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }) // BOM para Excel
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

/**
 * Gera nome de arquivo com data atual
 */
export function generateFilename(prefix: string = 'relatorio'): string {
  const hoje = new Date()
  const dia = String(hoje.getDate()).padStart(2, '0')
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const ano = hoje.getFullYear()
  return `${prefix}_${dia}${mes}${ano}.csv`
}

// --- Exportação consolidada de treinamento (PTR-BA) ---

const META_ANAC_MINUTOS = 16 * 60 // 16h em minutos

/**
 * Converte "HH:mm" para minutos totais
 */
export function hhMmToMinutes(hhmm: string): number {
  if (!hhmm || typeof hhmm !== 'string') return 0
  const parts = hhmm.trim().split(':')
  const h = parseInt(parts[0], 10) || 0
  const m = parseInt(parts[1], 10) || 0
  return h * 60 + m
}

/**
 * Converte minutos totais para "HH:mm"
 */
export function minutesToHHmm(totalMinutes: number): string {
  if (totalMinutes < 0 || !Number.isFinite(totalMinutes)) return '00:00'
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export interface ConsolidadoTreinamentoRow {
  Colaborador: string
  Base: string
  'Total de Horas Acumuladas': string
  'Meta ANAC (16h)': string
  'Qtd. de Plantões Treinados': number
}

export interface ExportConsolidadoTreinamentoParams {
  lancamentos: Lancamento[]
  indicadoresMap: Map<string, Indicador>
  basesMap: Map<string, string>
  /** Lista de colaboradores (nome, base_id) para resolver Base por nome */
  colaboradores: Array<{ nome: string; base_id: string }>
}

/**
 * Processa todos os lançamentos de "Horas de Treinamento Mensal" no período,
 * agrupa por colaborador, soma as horas e gera linhas para CSV (visão de auditoria).
 * Nenhum colaborador é deixado de fora da soma.
 */
export function exportConsolidadoTreinamento(
  params: ExportConsolidadoTreinamentoParams
): ConsolidadoTreinamentoRow[] {
  const { lancamentos, indicadoresMap, basesMap, colaboradores } = params

  // Mapa: nome do colaborador -> { totalMinutos, diasComRegistro }
  const mapa = new Map<string, { totalMinutos: number; dias: Set<string> }>()
  // Mapa auxiliar: nome -> base_id (primeira ocorrência no lançamento, para quem não estiver no cadastro)
  const basePorNomeFallback = new Map<string, string>()

  for (const lancamento of lancamentos) {
    const indicador = indicadoresMap.get(lancamento.indicador_id)
    if (!indicador || indicador.schema_type !== 'treinamento') continue

    const conteudo = lancamento.conteudo as Record<string, unknown> | null
    const participantes =
      (Array.isArray(conteudo?.participantes) ? conteudo.participantes : null) ??
      (Array.isArray(conteudo?.colaboradores) ? conteudo.colaboradores : null) ??
      []

    const dataRef = lancamento.data_referencia ?? ''

    for (const p of participantes as Array<{ nome?: string; horas?: string } | null | undefined>) {
      if (p == null || typeof p !== 'object') continue
      const nome = (p.nome ?? '').trim()
      if (!nome) continue

      // Fallback 0 minutos se horas ausente, nula ou mal formatada (evita travar e garante contagem)
      const minutos = hhMmToMinutes(p.horas ?? '00:00')

      if (!mapa.has(nome)) {
        mapa.set(nome, { totalMinutos: 0, dias: new Set() })
      }
      const entry = mapa.get(nome)!
      entry.totalMinutos += minutos
      entry.dias.add(dataRef)
      if (!basePorNomeFallback.has(nome)) {
        basePorNomeFallback.set(nome, lancamento.base_id ?? '')
      }
    }
  }

  // Nome -> base_id (cadastro tem prioridade)
  const nomeToBaseId = new Map<string, string>()
  for (const c of colaboradores) {
    const n = (c.nome ?? '').trim()
    if (n) nomeToBaseId.set(n, c.base_id)
  }

  const rows: ConsolidadoTreinamentoRow[] = []
  for (const [nome, { totalMinutos, dias }] of mapa.entries()) {
    const baseId = nomeToBaseId.get(nome) ?? basePorNomeFallback.get(nome) ?? ''
    const baseNome = (basesMap.get(baseId) ?? baseId) || 'N/A'
    const totalHHmm = minutesToHHmm(totalMinutos)
    const metaANAC = totalMinutos >= META_ANAC_MINUTOS ? 'Atingida' : 'Pendente'
    rows.push({
      Colaborador: nome,
      Base: baseNome,
      'Total de Horas Acumuladas': totalHHmm,
      'Meta ANAC (16h)': metaANAC,
      'Qtd. de Plantões Treinados': dias.size,
    })
  }

  // Ordenar por nome do colaborador
  rows.sort((a, b) => a.Colaborador.localeCompare(b.Colaborador, 'pt-BR'))
  return rows
}

/**
 * Converte linhas do consolidado de treinamento para CSV e faz download
 */
export function convertConsolidadoToCSV(rows: ConsolidadoTreinamentoRow[]): string {
  if (rows.length === 0) {
    return 'Colaborador,Base,Total de Horas Acumuladas,Meta ANAC (16h),Qtd. de Plantões Treinados\n'
  }
  const headers = ['Colaborador', 'Base', 'Total de Horas Acumuladas', 'Meta ANAC (16h)', 'Qtd. de Plantões Treinados']
  const headerRow = headers.map((h) => escapeCSVValue(h)).join(',')
  const dataRows = rows.map((row) =>
    [
      row.Colaborador,
      row.Base,
      row['Total de Horas Acumuladas'],
      row['Meta ANAC (16h)'],
      String(row['Qtd. de Plantões Treinados']),
    ]
      .map((v) => escapeCSVValue(String(v)))
      .join(',')
  )
  return [headerRow, ...dataRows].join('\n')
}
