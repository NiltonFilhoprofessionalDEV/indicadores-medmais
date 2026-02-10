import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLancamentos } from '@/hooks/useLancamentos'
import { formatDateForDisplay } from '@/lib/date-utils'
import { getIndicatorBadgeVariant, getResumoLancamento } from '@/lib/history-utils'
import { getIndicadorDisplayName } from '@/lib/indicadores-display'
import type { Database } from '@/lib/database.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileX2 } from 'lucide-react'

type Equipe = Database['public']['Tables']['equipes']['Row']

type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Indicador = Database['public']['Tables']['indicadores_config']['Row']

interface HistoryTableProps {
  baseId: string | undefined
  equipeId: string | undefined // Usado apenas para canEdit, não para filtrar
  onView: (lancamento: Lancamento, indicador: Indicador) => void
  onEdit: (lancamento: Lancamento, indicador: Indicador) => void
  onDelete: (lancamento: Lancamento) => void
  canEdit: (lancamento: Lancamento) => boolean
  getBaseName: (baseId: string) => string
  getEquipeName: (equipeId: string) => string
}

const PAGE_SIZE = 20

export function HistoryTable({
  baseId,
  equipeId: _equipeId, // Não usado diretamente, apenas passado para canEdit via props
  onView,
  onEdit,
  onDelete,
  canEdit,
  getBaseName,
  getEquipeName,
}: HistoryTableProps) {
  const [page, setPage] = useState(1)
  const [indicadorFilter, setIndicadorFilter] = useState<string>('')
  const [equipeFilter, setEquipeFilter] = useState<string>('')
  const [mesAnoFilter, setMesAnoFilter] = useState<string>('')

  // Buscar indicadores para o filtro
  const { data: indicadores } = useQuery<Indicador[]>({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicadores_config')
        .select('*')
        .order('nome')
      if (error) throw error
      return data || []
    },
  })

  // Buscar equipes para o filtro (todas; lançamentos já são filtrados por baseId)
  const { data: equipes } = useQuery<Equipe[]>({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipes')
        .select('*')
        .order('nome')
      if (error) throw error
      return data || []
    },
    enabled: !!baseId,
  })

  // Calcular dataInicio e dataFim do filtro de mês/ano
  const { dataInicio, dataFim } = useMemo(() => {
    if (!mesAnoFilter || mesAnoFilter === '') {
      return { dataInicio: undefined, dataFim: undefined }
    }
    const [ano, mes] = mesAnoFilter.split('-')
    if (!ano || !mes) {
      return { dataInicio: undefined, dataFim: undefined }
    }
    const primeiroDia = `${ano}-${mes.padStart(2, '0')}-01`
    const ultimoDia = new Date(Number(ano), Number(mes), 0)
      .toISOString()
      .split('T')[0]
    return {
      dataInicio: primeiroDia,
      dataFim: ultimoDia,
    }
  }, [mesAnoFilter])

  // Buscar lançamentos com paginação e filtros
  const { data, isLoading, error } = useLancamentos({
    baseId: baseId || undefined,
    equipeId: equipeFilter || undefined,
    indicadorId: indicadorFilter || undefined,
    dataInicio,
    dataFim,
    page,
    pageSize: PAGE_SIZE,
    enabled: !!baseId,
  })

  // Ordenar lançamentos: 1) por data (mais recente primeiro), 2) último lançado no topo (created_at mais recente primeiro)
  const lancamentosOrdenados = useMemo(() => {
    const list = data?.data ?? []
    return [...list].sort((a, b) => {
      const cmpData = b.data_referencia.localeCompare(a.data_referencia)
      if (cmpData !== 0) return cmpData
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
  }, [data?.data])

  // Criar mapa de indicadores por ID
  const indicadoresMap = useMemo(() => {
    const map = new Map<string, Indicador>()
    indicadores?.forEach((ind) => {
      map.set(ind.id, ind)
    })
    return map
  }, [indicadores])

  // Gerar lista de meses/anos para o filtro (últimos 12 meses)
  const mesesAnos = useMemo(() => {
    const options: string[] = []
    const hoje = new Date()
    for (let i = 0; i < 12; i++) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const ano = data.getFullYear()
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      options.push(`${ano}-${mes}`)
    }
    return options
  }, [])

  const handleClearFilters = () => {
    setIndicadorFilter('')
    setEquipeFilter('')
    setMesAnoFilter('')
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    // Scroll para o topo da tabela
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Lançamentos</CardTitle>
          <CardDescription>
            Visualize todos os lançamentos da sua base. Você pode editar/excluir
            apenas os lançamentos da sua equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <p className="mb-2">Erro ao carregar lançamentos.</p>
            <p className="text-sm text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'Tente novamente.'}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setIndicadorFilter('')
                setEquipeFilter('')
                setMesAnoFilter('')
                setPage(1)
              }}
            >
              Limpar Filtros e Tentar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-soft dark:bg-slate-800 dark:border-slate-700">
      <CardHeader>
        <CardTitle>Histórico de Lançamentos</CardTitle>
        <CardDescription>
          Visualize todos os lançamentos da sua base. Você pode editar/excluir
          apenas os lançamentos da sua equipe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Barra de Filtros */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Filtro por Indicador */}
            <div className="space-y-1">
              <Label htmlFor="indicador" className="text-xs">
                Filtrar por Indicador
              </Label>
              <Select
                id="indicador"
                value={indicadorFilter}
                onChange={(e) => {
                  setIndicadorFilter(e.target.value)
                  setPage(1)
                }}
                className="h-10"
              >
                <option value="">Todos os indicadores</option>
                {indicadores?.map((indicador) => (
                  <option key={indicador.id} value={indicador.id}>
                    {getIndicadorDisplayName(indicador)}
                  </option>
                ))}
              </Select>
            </div>

            {/* Filtro por Equipe */}
            <div className="space-y-1">
              <Label htmlFor="equipe" className="text-xs">
                Filtrar por Equipe
              </Label>
              <Select
                id="equipe"
                value={equipeFilter}
                onChange={(e) => {
                  setEquipeFilter(e.target.value)
                  setPage(1)
                }}
                className="h-10"
              >
                <option value="">Todas as equipes</option>
                {equipes?.map((equipe) => (
                  <option key={equipe.id} value={equipe.id}>
                    {equipe.nome}
                  </option>
                ))}
              </Select>
            </div>

            {/* Filtro por Mês/Ano */}
            <div className="space-y-1">
              <Label htmlFor="mesAno" className="text-xs">
                Mês/Ano
              </Label>
              <Select
                id="mesAno"
                value={mesAnoFilter}
                onChange={(e) => {
                  setMesAnoFilter(e.target.value)
                  setPage(1)
                }}
                className="h-10"
              >
                <option value="">Todos os períodos</option>
                {mesesAnos.map((mesAno) => {
                  const [ano, mes] = mesAno.split('-')
                  const meses = [
                    'Janeiro',
                    'Fevereiro',
                    'Março',
                    'Abril',
                    'Maio',
                    'Junho',
                    'Julho',
                    'Agosto',
                    'Setembro',
                    'Outubro',
                    'Novembro',
                    'Dezembro',
                  ]
                  return (
                    <option key={mesAno} value={mesAno}>
                      {meses[Number(mes) - 1]} / {ano}
                    </option>
                  )
                })}
              </Select>
            </div>

            {/* Botão Limpar Filtros */}
            <div className="space-y-1">
              <Label className="text-xs opacity-0">Limpar</Label>
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="w-full h-10"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Carregando...</p>
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted dark:bg-slate-700 mb-4">
              <FileX2 className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-1">
              Nenhum lançamento encontrado
            </p>
            <p className="text-sm text-muted-foreground max-w-sm">
              Tente ajustar os filtros ou cadastre um novo lançamento na seção acima.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-primary bg-muted/50 dark:bg-slate-700/50">
                    <th className="text-left p-3 font-semibold text-sm">Data</th>
                    <th className="text-left p-3 font-semibold text-sm">
                      Indicador
                    </th>
                    <th className="text-left p-3 font-semibold text-sm">Resumo</th>
                    <th className="text-left p-3 font-semibold text-sm">Base</th>
                    <th className="text-left p-3 font-semibold text-sm">Equipe</th>
                    <th className="text-left p-3 font-semibold text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lancamentosOrdenados.map((lancamento) => {
                    const indicador = indicadoresMap.get(lancamento.indicador_id)
                    if (!indicador) return null

                    return (
                      <tr
                        key={lancamento.id}
                        className="border-b border-border hover:bg-muted/50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="p-3">
                          {formatDateForDisplay(lancamento.data_referencia)}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={getIndicatorBadgeVariant(
                              indicador.schema_type
                            )}
                          >
                            {getIndicadorDisplayName(indicador)}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {getResumoLancamento(lancamento, indicador)}
                        </td>
                        <td className="p-3">{getBaseName(lancamento.base_id)}</td>
                        <td className="p-3">{getEquipeName(lancamento.equipe_id)}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onView(lancamento, indicador)}
                            >
                              Ver
                            </Button>
                            {canEdit(lancamento) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onEdit(lancamento, indicador)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onDelete(lancamento)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  Excluir
                                </Button>
                              </>
                            )}
                            {!canEdit(lancamento) && (
                              <span className="text-xs text-gray-400 px-2 py-1">
                                Somente leitura
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação - Sempre mostrar quando houver dados */}
            {data && data.total > 0 && (
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground order-2 sm:order-1">
                  Página {data.page} de {data.totalPages} ({data.total}{' '}
                  {data.total === 1 ? 'lançamento' : 'lançamentos'})
                </div>
                {data.totalPages > 1 && (
                  <div className="flex gap-2 order-1 sm:order-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= data.totalPages}
                      className="disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
