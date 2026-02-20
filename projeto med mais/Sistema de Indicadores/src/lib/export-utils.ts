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
          row.horas = toExportValue(item.horas) as string
          const temas = conteudo.temas_ptr ?? conteudo.temas
          row.temas_ptr = Array.isArray(temas) ? (temas as string[]).join(', ') : (temas ? String(temas) : '')
          break
        }
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
      // Tratado no unwinding (afericoes)
      break

    case 'estoque':
      row.po_quimico_atual = conteudo.po_quimico_atual ?? ''
      row.po_quimico_exigido = conteudo.po_quimico_exigido ?? ''
      row.lge_atual = conteudo.lge_atual ?? ''
      row.lge_exigido = conteudo.lge_exigido ?? ''
      row.nitrogenio_atual = conteudo.nitrogenio_atual ?? ''
      row.nitrogenio_exigido = conteudo.nitrogenio_exigido ?? ''
      break

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

  const headerRow = headers.map((key) => escapeCSVValue(String(key))).join(',')
  const dataRows = rows.map((row) =>
    headers
      .map((key) => {
        const value = row[key]
        const str = value !== null && value !== undefined ? String(value) : ''
        return escapeCSVValue(str)
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
