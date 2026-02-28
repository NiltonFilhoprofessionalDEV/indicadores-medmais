import type { Database } from '@/lib/database.types'
import type { BadgeProps } from '@/components/ui/badge'

type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Indicador = Database['public']['Tables']['indicadores_config']['Row']

/**
 * Retorna a variante do Badge baseada no tipo de indicador
 */
export function getIndicatorBadgeVariant(
  schemaType: string | null | undefined
): BadgeProps['variant'] {
  if (!schemaType) return 'outline'

  switch (schemaType) {
    case 'ocorrencia_aero':
    case 'ocorrencia_nao_aero':
      return 'destructive' // Vermelho para ocorrências
    case 'taf':
    case 'prova_teorica':
    case 'treinamento':
    case 'ptr_ba_extras':
    case 'tempo_tp_epr':
      return 'default' // Azul/Preto para avaliações
    case 'tempo_resposta':
    case 'exercicio_posicionamento':
    case 'inspecao_viaturas':
      return 'secondary' // Cinza para operacionais
    case 'estoque':
    case 'controle_trocas':
    case 'higienizacao_tp':
    case 'controle_epi':
      return 'outline' // Borda para controle/estoque
    default:
      return 'outline'
  }
}

/**
 * Extrai um resumo curto e relevante do conteúdo JSONB do lançamento
 */
export function getResumoLancamento(
  lancamento: Lancamento,
  indicador: Indicador | undefined
): string {
  const conteudo = lancamento.conteudo as Record<string, any>
  if (!conteudo) return 'Sem informações'

  const schemaType = indicador?.schema_type

  switch (schemaType) {
    case 'ocorrencia_aero':
    case 'ocorrencia_nao_aero':
      // Retornar local da ocorrência
      if (conteudo.local) {
        return `Local: ${conteudo.local}`
      }
      if (conteudo.tipo_ocorrencia) {
        return `Tipo: ${conteudo.tipo_ocorrencia}`
      }
      return 'Ocorrência registrada'

    case 'taf':
      // Contar avaliados
      if (Array.isArray(conteudo.avaliados)) {
        const count = conteudo.avaliados.length
        return `${count} ${count === 1 ? 'avaliado' : 'avaliados'}`
      }
      return 'TAF registrado'

    case 'prova_teorica':
      // Contar avaliados
      if (Array.isArray(conteudo.avaliados)) {
        const count = conteudo.avaliados.length
        return `${count} ${count === 1 ? 'avaliado' : 'avaliados'}`
      }
      return 'Prova Teórica registrada'

    case 'treinamento':
      if (Array.isArray(conteudo.participantes)) {
        const count = conteudo.participantes.length
        const totalMin = conteudo.participantes.reduce((sum: number, p: any) => {
          const h = p.total_dia || p.horas
          if (typeof h === 'string' && /^\d{1,2}:\d{2}$/.test(h)) {
            const [hh, mm] = h.split(':').map(Number)
            return sum + (hh || 0) * 60 + (mm || 0)
          }
          return sum
        }, 0)
        const horas = Math.floor(totalMin / 60)
        return `${count} ${count === 1 ? 'colaborador' : 'colaboradores'} - ${horas}h`
      }
      return 'Treinamento registrado'

    case 'ptr_ba_extras':
      if (Array.isArray(conteudo.participantes)) {
        const count = conteudo.participantes.length
        return `${count} ${count === 1 ? 'colaborador' : 'colaboradores'}`
      }
      return 'PTR-BA Extras registrado'

    case 'tempo_tp_epr':
      // Contar colaboradores
      if (Array.isArray(conteudo.colaboradores)) {
        const count = conteudo.colaboradores.length
        return `${count} ${count === 1 ? 'colaborador' : 'colaboradores'}`
      }
      return 'Tempo TP/EPR registrado'

    case 'tempo_resposta':
      // Contar aferições
      if (Array.isArray(conteudo.afericoes)) {
        const count = conteudo.afericoes.length
        return `${count} ${count === 1 ? 'aferição' : 'aferições'}`
      }
      return 'Exercício de Tempo Resposta registrado'

    case 'exercicio_posicionamento':
      if (Array.isArray(conteudo.afericoes)) {
        const count = conteudo.afericoes.length
        return `${count} ${count === 1 ? 'aferição' : 'aferições'}`
      }
      return 'Exercício de Posicionamento registrado'

    case 'inspecao_viaturas':
      // Contar viaturas inspecionadas
      if (Array.isArray(conteudo.viaturas)) {
        const count = conteudo.viaturas.length
        return `${count} ${count === 1 ? 'viatura' : 'viaturas'}`
      }
      return 'Inspeção registrada'

    case 'controle_epi':
      // Contar colaboradores
      if (Array.isArray(conteudo.colaboradores)) {
        const count = conteudo.colaboradores.length
        return `${count} ${count === 1 ? 'colaborador' : 'colaboradores'}`
      }
      return 'Controle EPI registrado'

    case 'estoque': {
      const poEstoque = conteudo.po_quimico_quantidade_estoque_reserva_tecnica ?? conteudo.po_quimico_atual
      const lgeEstoque = conteudo.lge_quantidade_estoque_reserva_tecnica ?? conteudo.lge_atual
      const nitEstoque = conteudo.nitrogenio_quantidade_estoque_reserva_tecnica ?? conteudo.nitrogenio_atual
      const itens: string[] = []
      if (poEstoque != null || conteudo.po_quimico_exigido != null) {
        itens.push(`Pó Químico: ${poEstoque ?? 0}/${conteudo.po_quimico_exigido ?? 0} kg`)
      }
      if (lgeEstoque != null || conteudo.lge_exigido != null) {
        itens.push(`LGE: ${lgeEstoque ?? 0}/${conteudo.lge_exigido ?? 0} L`)
      }
      if (nitEstoque != null || conteudo.nitrogenio_exigido != null) {
        itens.push(`Nitrogênio: ${nitEstoque ?? 0}/${conteudo.nitrogenio_exigido ?? 0}`)
      }
      if (itens.length > 0) return itens.slice(0, 3).join(', ')
      return 'Estoque registrado'
    }

    case 'controle_trocas':
      // Quantidade de trocas
      if (conteudo.qtd_trocas) {
        return `${conteudo.qtd_trocas} ${conteudo.qtd_trocas === 1 ? 'troca' : 'trocas'}`
      }
      return 'Controle de Trocas registrado'

    case 'higienizacao_tp':
      // Quantidade higienizada
      if (conteudo.qtd_higienizados_mes) {
        return `${conteudo.qtd_higienizados_mes} higienizados no mês`
      }
      return 'Higienização registrada'

    case 'atividades_acessorias':
      // Tipo de atividade
      if (conteudo.tipo_atividade) {
        return `Tipo: ${conteudo.tipo_atividade}`
      }
      return 'Atividade registrada'

    default:
      return 'Lançamento registrado'
  }
}
