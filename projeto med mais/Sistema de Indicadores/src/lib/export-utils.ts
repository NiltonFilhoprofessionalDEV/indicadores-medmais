/**
 * Utilitários para exportação de dados para CSV
 * Implementa unwinding (expansão) de listas e mapeamento completo dos 14 indicadores
 * para formato tabular compatível com Excel (UTF-8 BOM).
 */

import type { Database } from './database.types'

type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Indicador = Database['public']['Tables']['indicadores_config']['Row']

interface FlattenedRow {
  [key: string]: string | number | null | undefined
}

/**
 * Formata texto para exportação: primeira letra maiúscula e demais minúsculas.
 * Não altera strings sem letras (ex.: horários, números, datas).
 */
function capitalizeForExport(s: string): string {
  const t = s.trim()
  if (!t) return s
  if (!/[a-zA-ZÀ-ÿ]/.test(t)) return s
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()
}

/** Apenas nomes de viaturas (CCI, CRS, etc.) permanecem como no sistema; demais colunas são formatadas. */
const COLUNAS_ORIGEM_SISTEMA = new Set(['viatura'])

/** Aplica padrão de texto (1ª maiúscula, restante minúscula) para célula CSV; mantém números/datas/horas. Não altera colunas de origem do sistema. */
function formatCellForCSV(val: string, columnKey?: string): string {
  if (!val) return val
  const t = String(val).trim()
  if (columnKey && COLUNAS_ORIGEM_SISTEMA.has(columnKey)) return t
  return t && /[a-zA-ZÀ-ÿ]/.test(t) ? capitalizeForExport(t) : t
}

/** Converte valor para exportação: string simples (tempos como "02:02") ou número */
function toExportValue(value: unknown): string | number {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'number') return value
  return String(value).trim()
}

/**
 * Achata (flatten) um lançamento em uma ou mais linhas CSV.
 * Indicadores com listas (Grupo B): cada item vira uma linha; cabeçalho repetido em todas.
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

  const hasArray =
    Array.isArray(conteudo?.avaliados) ||
    Array.isArray(conteudo?.participantes) ||
    Array.isArray(conteudo?.afericoes) ||
    Array.isArray(conteudo?.colaboradores) ||
    Array.isArray(conteudo?.inspecoes)

  if (hasArray) {
    let arrayKey = 'avaliados'
    if (conteudo?.avaliados) arrayKey = 'avaliados'
    else if (conteudo?.participantes) arrayKey = 'participantes'
    else if (conteudo?.afericoes) arrayKey = 'afericoes'
    else if (conteudo?.colaboradores) arrayKey = 'colaboradores'
    else if (conteudo?.inspecoes) arrayKey = 'inspecoes'

    const items = conteudo[arrayKey] as Array<Record<string, any>>

    if (!items || items.length === 0) {
      return [flattenConteudo(baseRow, conteudo, schemaType)]
    }

    return items.map((item) => {
      const row = { ...baseRow } as FlattenedRow

      switch (schemaType) {
        case 'taf':
          row.nome = item.nome ?? ''
          row.idade = item.idade != null ? item.idade : ''
          row.tempo = toExportValue(item.tempo) as string
          row.status = item.status ?? ''
          row.nota = item.nota != null ? item.nota : ''
          break
        case 'prova_teorica':
          row.nome = item.nome ?? ''
          row.nota = item.nota != null ? item.nota : ''
          row.status = item.status ?? ''
          break
        case 'treinamento': {
          row.nome = item.nome ?? ''
          const totalDia = item.total_dia ?? item.horas
          row.horas = toExportValue(totalDia) as string
          const detalhe = item.detalhamento_temas
          row.temas_ptr = Array.isArray(detalhe) ? (detalhe as { tema?: string }[]).map((d) => d.tema).filter(Boolean).join(', ') : ''
          break
        }
        case 'ptr_ba_extras':
          row.nome = item.nome ?? ''
          row.horas = toExportValue(item.horas) as string
          break
        case 'inspecao_viaturas':
          row.viatura = item.viatura ?? ''
          row.qtd_inspecoes = item.qtd_inspecoes != null ? item.qtd_inspecoes : ''
          row.qtd_nao_conforme = item.qtd_nao_conforme != null ? item.qtd_nao_conforme : ''
          break
        case 'tempo_tp_epr':
          row.nome = item.nome ?? ''
          row.tempo = toExportValue(item.tempo) as string
          row.status = item.status ?? ''
          row.tempo_medio = toExportValue(conteudo.tempo_medio) as string
          break
        case 'tempo_resposta':
        case 'exercicio_posicionamento':
          row.viatura = item.viatura ?? ''
          row.motorista = item.motorista ?? ''
          row.local = item.local ?? ''
          row.tempo = toExportValue(item.tempo) as string
          break
        case 'controle_epi':
          row.nome = item.nome ?? ''
          row.epi_entregue = item.epi_entregue != null ? item.epi_entregue : ''
          row.epi_previsto = item.epi_previsto != null ? item.epi_previsto : ''
          row.unif_entregue = item.unif_entregue != null ? item.unif_entregue : ''
          row.unif_previsto = item.unif_previsto != null ? item.unif_previsto : ''
          row.total_epi_pct = item.total_epi_pct != null ? item.total_epi_pct : ''
          row.total_unif_pct = item.total_unif_pct != null ? item.total_unif_pct : ''
          break
        default:
          Object.keys(item).forEach((key) => {
            const value = item[key]
            if (value !== null && value !== undefined) {
              row[key] = toExportValue(value) as string | number
            }
          })
      }

      return row
    })
  }

  return [flattenConteudo(baseRow, conteudo, schemaType)]
}

/**
 * Mapeamento completo dos campos específicos por indicador (sem listas)
 */
function flattenConteudo(
  baseRow: FlattenedRow,
  conteudo: Record<string, any>,
  schemaType: string
): FlattenedRow {
  const row = { ...baseRow }

  if (!conteudo) return row

  switch (schemaType) {
    case 'ocorrencia_aero':
      row.local = conteudo.local ?? ''
      row.acao = conteudo.acao ?? ''
      row.hora_acionamento = toExportValue(conteudo.hora_acionamento) as string
      row.tempo_chegada_1_cci = toExportValue(conteudo.tempo_chegada_1_cci) as string
      row.tempo_chegada_ult_cci = toExportValue(conteudo.tempo_chegada_ult_cci) as string
      row.termino_ocorrencia = toExportValue(conteudo.termino_ocorrencia) as string
      break

    case 'ocorrencia_nao_aero':
      row.tipo_ocorrencia = conteudo.tipo_ocorrencia ?? ''
      row.observacoes = conteudo.observacoes ?? ''
      row.local = conteudo.local ?? ''
      row.hora_acionamento = toExportValue(conteudo.hora_acionamento) as string
      row.hora_chegada = toExportValue(conteudo.hora_chegada) as string
      row.hora_termino = toExportValue(conteudo.hora_termino) as string
      row.duracao_total = toExportValue(conteudo.duracao_total) as string
      break

    case 'atividades_acessorias':
      row.tipo_atividade = conteudo.tipo_atividade ?? ''
      row.qtd_bombeiros = conteudo.qtd_bombeiros ?? ''
      row.tempo_gasto = toExportValue(conteudo.tempo_gasto) as string
      row.qtd_equipamentos = conteudo.qtd_equipamentos ?? ''
      break

    case 'taf':
    case 'prova_teorica':
    case 'treinamento':
    case 'inspecao_viaturas':
    case 'controle_epi':
      // Tratados no unwinding
      break

    case 'tempo_tp_epr':
      row.tempo_medio = toExportValue(conteudo.tempo_medio) as string
      break

    case 'tempo_resposta':
    case 'exercicio_posicionamento':
      // Tratado no unwinding (afericoes)
      break

    case 'estoque': {
      // Modelo novo: campos "atual" renomeados para quantidade_estoque_reserva_tecnica; compatível com dados antigos (_atual).
      const poEstoque = conteudo.po_quimico_quantidade_estoque_reserva_tecnica ?? conteudo.po_quimico_atual ?? 0
      const lgeEstoque = conteudo.lge_quantidade_estoque_reserva_tecnica ?? conteudo.lge_atual ?? 0
      const nitEstoque = conteudo.nitrogenio_quantidade_estoque_reserva_tecnica ?? conteudo.nitrogenio_atual ?? 0
      row.po_quimico_quantidade_linha = conteudo.po_quimico_quantidade_linha ?? 0
      row.po_quimico_cat_aerodromo = conteudo.po_quimico_cat_aerodromo ?? 0
      row.po_quimico_exigido = conteudo.po_quimico_exigido ?? 0
      row.po_quimico_quantidade_estoque_reserva_tecnica = poEstoque
      row.lge_quantidade_linha = conteudo.lge_quantidade_linha ?? 0
      row.lge_exigido = conteudo.lge_exigido ?? 0
      row.lge_quantidade_estoque_reserva_tecnica = lgeEstoque
      row.nitrogenio_quantidade_linha = conteudo.nitrogenio_quantidade_linha ?? 0
      row.nitrogenio_exigido = conteudo.nitrogenio_exigido ?? 0
      row.nitrogenio_quantidade_estoque_reserva_tecnica = nitEstoque
      break
    }

    case 'controle_trocas':
      row.qtd_trocas = conteudo.qtd_trocas ?? ''
      break

    case 'verificacao_tp':
      row.qtd_conformes = conteudo.qtd_conformes ?? ''
      row.qtd_verificados = conteudo.qtd_verificados ?? ''
      row.qtd_total_equipe = conteudo.qtd_total_equipe ?? ''
      break

    case 'higienizacao_tp':
      row.qtd_higienizados_mes = conteudo.qtd_higienizados_mes ?? ''
      row.qtd_total_sci = conteudo.qtd_total_sci ?? ''
      break

    default:
      Object.keys(conteudo).forEach((key) => {
        const value = conteudo[key]
        if (value !== null && value !== undefined && !Array.isArray(value)) {
          row[key] = toExportValue(value) as string | number
        }
      })
  }

  return row
}

/**
 * Converte array de linhas achatadas em string CSV
 */
export function convertToCSV(rows: FlattenedRow[]): string {
  if (rows.length === 0) return ''

  const allKeys = new Set<string>()
  rows.forEach((row) => Object.keys(row).forEach((key) => allKeys.add(key)))
  const headers = Array.from(allKeys).sort()

  const headerRow = headers.map((key) => escapeCSVValue(capitalizeForExport(String(key)))).join(',')
  const dataRows = rows.map((row) =>
    headers
      .map((key) => {
        const value = row[key]
        const str = value !== null && value !== undefined ? String(value).trim() : ''
        const formatted = formatCellForCSV(str, key)
        return escapeCSVValue(formatted)
      })
      .join(',')
  )

  return [headerRow, ...dataRows].join('\n')
}

/** Padrão hora (HH:mm ou MM:SS) — envolver em aspas no CSV para Excel preservar dois pontos */
const TIME_PATTERN = /^\d{1,2}:\d{2}(:\d{2})?$/

function escapeCSVValue(value: string): string {
  const trimmed = value.trim()
  const needsQuotes =
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    TIME_PATTERN.test(trimmed)
  if (needsQuotes) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Download do CSV com UTF-8 BOM para Excel reconhecer acentos e caracteres especiais
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
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

export function generateFilename(prefix: string = 'relatorio'): string {
  const hoje = new Date()
  const dia = String(hoje.getDate()).padStart(2, '0')
  const mes = String(hoje.getMonth() + 1).padStart(2, '0')
  const ano = hoje.getFullYear()
  return `${prefix}_${dia}${mes}${ano}.csv`
}

// --- Exportação consolidada mensal PTR-BA (Horas de Treinamento) ---

const CONSOLIDATED_HEADERS = [
  'Data de Referência',
  'Base',
  'Nome do Colaborador',
  'Carga Horária Total (Mês)',
  'Status Compliance (16h)',
  'Qtd. de Plantões',
] as const

export interface TreinamentoConsolidadoRow {
  dataReferencia: string
  base: string
  nomeColaborador: string
  cargaHorariaTotal: string
  statusCompliance: string
  qtdPlantoes: number
}

/** Converte string "HH:mm" em minutos totais */
export function hhmmToMinutes(hhmm: string): number {
  const trimmed = String(hhmm ?? '').trim()
  if (!trimmed) return 0
  const parts = trimmed.split(':')
  const h = parseInt(parts[0], 10)
  const m = parts.length > 1 ? parseInt(parts[1], 10) : 0
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

/** Converte minutos totais em string "HH:mm" */
export function minutesToHHmm(totalMinutes: number): string {
  if (totalMinutes < 0 || !Number.isFinite(totalMinutes)) return '00:00'
  const h = Math.floor(totalMinutes / 60)
  const m = Math.round(totalMinutes % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Retorna o último dia do mês no formato DD/MM/YYYY (month 1-12) */
export function getLastDayOfMonthFormatted(year: number, month: number): string {
  const lastDay = new Date(year, month, 0)
  const d = String(lastDay.getDate()).padStart(2, '0')
  const m = String(lastDay.getMonth() + 1).padStart(2, '0')
  const y = lastDay.getFullYear()
  return `${d}/${m}/${y}`
}

const COMPLIANCE_MINUTES = 16 * 60 // 16h em minutos

/**
 * Agrupa lançamentos de treinamento (PTR-BA) por Mês/Ano + Nome do Colaborador + Base,
 * soma as horas e gera linhas consolidadas com data de referência = último dia do mês.
 */
export function buildTreinamentoConsolidadoRows(
  lancamentos: Lancamento[],
  basesMap: Map<string, string>
): TreinamentoConsolidadoRow[] {
  type Key = string
  const sumMinutes = new Map<Key, number>()
  const countPlantoes = new Map<Key, number>()
  const keyToMeta = new Map<Key, { base: string; nomeColaborador: string; year: number; month: number }>()

  for (const lancamento of lancamentos) {
    const conteudo = lancamento.conteudo as Record<string, unknown> | null
    const participantes = Array.isArray(conteudo?.participantes) ? conteudo.participantes as Array<{ nome?: string; horas?: string }> : []
    const baseName = basesMap.get(lancamento.base_id) ?? lancamento.base_id

    const ref = lancamento.data_referencia
    if (!ref) continue
    const [yStr, mStr] = ref.split('-')
    const year = parseInt(yStr, 10)
    const month = parseInt(mStr, 10)
    if (Number.isNaN(year) || Number.isNaN(month)) continue

    for (const p of participantes) {
      const nome = String((p as any).nome ?? '').trim()
      if (!nome) continue
      const horasNew = (p as any).total_dia
      const horasOld = (p as any).horas
      const minutos = hhmmToMinutes(typeof horasNew === 'string' ? horasNew : typeof horasOld === 'string' ? horasOld : '')
      if (minutos === 0) continue

      const key: Key = `${year}-${String(month).padStart(2, '0')}|${baseName}|${nome}`

      sumMinutes.set(key, (sumMinutes.get(key) ?? 0) + minutos)
      countPlantoes.set(key, (countPlantoes.get(key) ?? 0) + 1)
      if (!keyToMeta.has(key)) {
        keyToMeta.set(key, { base: baseName, nomeColaborador: nome, year, month })
      }
    }
  }

  const rows: TreinamentoConsolidadoRow[] = []
  for (const key of sumMinutes.keys()) {
    const totalMin = sumMinutes.get(key) ?? 0
    const qtd = countPlantoes.get(key) ?? 0
    const meta = keyToMeta.get(key)
    if (!meta) continue

    const dataReferencia = getLastDayOfMonthFormatted(meta.year, meta.month)
    const cargaHorariaTotal = minutesToHHmm(totalMin)
    const statusCompliance = totalMin >= COMPLIANCE_MINUTES ? 'CONFORME' : 'PENDENTE'

    rows.push({
      dataReferencia,
      base: meta.base,
      nomeColaborador: meta.nomeColaborador,
      cargaHorariaTotal,
      statusCompliance,
      qtdPlantoes: qtd,
    })
  }

  rows.sort((a, b) => {
    const da = a.dataReferencia.split('/')
    const db = b.dataReferencia.split('/')
    const dateA = `${da[2]}-${da[1]}-${da[0]}`
    const dateB = `${db[2]}-${db[1]}-${db[0]}`
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    if (a.base !== b.base) return a.base.localeCompare(b.base)
    return a.nomeColaborador.localeCompare(b.nomeColaborador)
  })

  return rows
}

/**
 * Gera o conteúdo CSV do relatório consolidado mensal PTR-BA (sem BOM; o download adiciona BOM).
 */
export function buildTreinamentoConsolidadoCSV(rows: TreinamentoConsolidadoRow[]): string {
  if (rows.length === 0) return ''

  const headerRow = CONSOLIDATED_HEADERS.map((h) => escapeCSVValue(capitalizeForExport(h))).join(',')
  const dataRows = rows.map((row) => {
    return [
      escapeCSVValue(formatCellForCSV(row.dataReferencia)),
      escapeCSVValue(formatCellForCSV(row.base, 'base')),
      escapeCSVValue(formatCellForCSV(row.nomeColaborador)),
      escapeCSVValue(formatCellForCSV(row.cargaHorariaTotal)),
      escapeCSVValue(formatCellForCSV(row.statusCompliance)),
      String(row.qtdPlantoes),
    ].join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}

// --- Exportação granular PTR-BA (uma linha por dia por colaborador; Tema 1, Tema 2, ... = nome do PTR; Total de horas) ---

export interface TreinamentoGranularRow {
  data: string
  base: string
  equipe: string
  colaborador: string
  /** Nomes dos PTRs aplicados no dia, na ordem (Tema 1, Tema 2, ...) */
  temasNomes: string[]
  totalDia: string
}

/** Formata data_referencia YYYY-MM-DD para DD/MM/YYYY */
function formatDataRef(ref: string): string {
  if (!ref) return ''
  const [y, m, d] = ref.split('-')
  return [d, m, y].filter(Boolean).join('/')
}

/**
 * Gera linhas para exportação detalhada por dia e colaborador.
 * Uma linha por (data, base, equipe, colaborador); temas na ordem do dia (Tema 1 = primeiro PTR, Tema 2 = segundo, ...); total no final.
 */
export function buildTreinamentoGranularRows(
  lancamentos: Lancamento[],
  basesMap: Map<string, string>,
  equipesMap: Map<string, string>
): TreinamentoGranularRow[] {
  const rows: TreinamentoGranularRow[] = []

  for (const lancamento of lancamentos) {
    const conteudo = lancamento.conteudo as Record<string, unknown> | null
    const participantes = Array.isArray(conteudo?.participantes)
      ? (conteudo.participantes as Array<{ nome?: string; total_dia?: string; horas?: string; detalhamento_temas?: { tema?: string; horas?: string }[] }>)
      : []
    const baseName = basesMap.get(lancamento.base_id) ?? lancamento.base_id
    const equipeName = equipesMap.get(lancamento.equipe_id) ?? lancamento.equipe_id ?? ''
    const dataStr = formatDataRef(lancamento.data_referencia ?? '')

    for (const p of participantes) {
      const nome = String(p.nome ?? '').trim()
      if (!nome) continue

      const totalDia = String(p.total_dia ?? p.horas ?? '00:00')
      const detalhe = Array.isArray(p.detalhamento_temas) ? p.detalhamento_temas : []
      const temasNomes: string[] = []

      if (detalhe.length > 0) {
        for (const dt of detalhe) {
          const tema = String(dt.tema ?? '').trim() || '—'
          const horas = String(dt.horas ?? '').trim()
          if (horas) temasNomes.push(tema)
        }
      }

      if (temasNomes.length > 0 || (totalDia && totalDia !== '00:00')) {
        if (temasNomes.length === 0 && totalDia && totalDia !== '00:00') {
          temasNomes.push('—')
        }
        rows.push({
          data: dataStr,
          base: baseName,
          equipe: equipeName,
          colaborador: nome,
          temasNomes,
          totalDia,
        })
      }
    }
  }

  rows.sort((a, b) => {
    const dateCmp = a.data.split('/').reverse().join('').localeCompare(b.data.split('/').reverse().join(''))
    if (dateCmp !== 0) return dateCmp
    if (a.base !== b.base) return a.base.localeCompare(b.base)
    return a.colaborador.localeCompare(b.colaborador)
  })

  return rows
}

/**
 * Gera o conteúdo CSV: Data, Base, Equipe, Colaborador, Tema 1, Tema 2, Tema 3, ... (nome do PTR aplicado no dia), Total de horas.
 */
export function buildTreinamentoGranularCSV(rows: TreinamentoGranularRow[]): string {
  if (rows.length === 0) return ''

  const maxTemas = Math.max(1, ...rows.map((r) => r.temasNomes.length))
  const temaHeaders = Array.from({ length: maxTemas }, (_, i) => `Tema ${i + 1}`)
  const headers = ['Data', 'Base', 'Equipe', 'Colaborador', ...temaHeaders, 'Total de horas']
  const headerRow = headers.map((h) => escapeCSVValue(formatCellForCSV(h))).join(',')

  const dataRows = rows.map((row) => {
    const temaValores = Array.from({ length: maxTemas }, (_, i) => row.temasNomes[i] ?? '')
    return [
      escapeCSVValue(formatCellForCSV(row.data)),
      escapeCSVValue(formatCellForCSV(row.base, 'base')),
      escapeCSVValue(formatCellForCSV(row.equipe, 'equipe')),
      escapeCSVValue(formatCellForCSV(row.colaborador)),
      ...temaValores.map((v) => escapeCSVValue(formatCellForCSV(v))),
      escapeCSVValue(row.totalDia),
    ].join(',')
  })

  return [headerRow, ...dataRows].join('\n')
}
