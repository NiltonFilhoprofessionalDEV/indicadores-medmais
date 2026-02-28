import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLancamentos } from '@/hooks/useLancamentos'
import { formatDateForDisplay, getDefaultDateRange } from '@/lib/date-utils'
import { getIndicatorBadgeVariant, getResumoLancamento } from '@/lib/history-utils'
import { getIndicadorDisplayName, sortIndicadoresPtrBaProximos } from '@/lib/indicadores-display'
import { formatEquipeName } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FileX2,
  Search,
  RotateCcw,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Lock,
  CalendarDays,
} from 'lucide-react'

type Equipe = Database['public']['Tables']['equipes']['Row']
type LancamentoWithUser = import('@/hooks/useLancamentos').LancamentoWithUser
type Indicador = Database['public']['Tables']['indicadores_config']['Row']

interface HistoryTableProps {
  baseId: string | undefined
  equipeId: string | undefined
  onView: (lancamento: LancamentoWithUser, indicador: Indicador) => void
  onEdit: (lancamento: LancamentoWithUser, indicador: Indicador) => void
  onDelete: (lancamento: LancamentoWithUser) => void
  canEdit: (lancamento: LancamentoWithUser) => boolean
  getBaseName: (baseId: string) => string
  getEquipeName: (equipeId: string) => string
}

const PAGE_SIZE = 20

export function HistoryTable({
  baseId,
  equipeId: _equipeId,
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
  const [dataInicioFilter, setDataInicioFilter] = useState<string>(() => getDefaultDateRange().dataInicio)
  const [dataFimFilter, setDataFimFilter] = useState<string>(() => getDefaultDateRange().dataFim)

  const { data: indicadores } = useQuery<Indicador[]>({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indicadores_config').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

  const { data: equipes } = useQuery<Equipe[]>({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipes').select('*').order('nome')
      if (error) throw error
      return data || []
    },
    enabled: !!baseId,
  })

  const { data, isLoading, error } = useLancamentos({
    baseId: baseId || undefined,
    equipeId: equipeFilter || undefined,
    indicadorId: indicadorFilter || undefined,
    dataInicio: dataInicioFilter || undefined,
    dataFim: dataFimFilter || undefined,
    page,
    pageSize: PAGE_SIZE,
    enabled: !!baseId,
  })

  const lancamentosOrdenados = useMemo(() => {
    const list = data?.data ?? []
    return [...list].sort((a, b) => {
      const cmpData = b.data_referencia.localeCompare(a.data_referencia)
      if (cmpData !== 0) return cmpData
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
  }, [data?.data])

  const userIds = useMemo(() => {
    const ids = new Set<string>()
    lancamentosOrdenados.forEach((l) => { if (l.user_id) ids.add(l.user_id) })
    return [...ids]
  }, [lancamentosOrdenados])

  const { data: profilesList } = useQuery({
    queryKey: ['profiles-nomes', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return []
      const { data, error } = await supabase.from('profiles').select('id, nome').in('id', userIds)
      if (error) throw error
      return (data ?? []) as { id: string; nome: string }[]
    },
    enabled: userIds.length > 0,
  })

  const profilesNomeMap = useMemo(() => {
    const map = new Map<string, string>()
    profilesList?.forEach((p) => map.set(p.id, p.nome))
    return map
  }, [profilesList])

  const indicadoresMap = useMemo(() => {
    const map = new Map<string, Indicador>()
    indicadores?.forEach((ind) => map.set(ind.id, ind))
    return map
  }, [indicadores])

  const handleDataInicioChange = (novaDataInicio: string) => {
    setDataInicioFilter(novaDataInicio)
    if (novaDataInicio && dataFimFilter && novaDataInicio > dataFimFilter) setDataFimFilter(novaDataInicio)
    setPage(1)
  }

  const handleDataFimChange = (novaDataFim: string) => {
    if (novaDataFim && dataInicioFilter && dataInicioFilter > novaDataFim) {
      alert('A data final não pode ser anterior à data inicial.')
      return
    }
    setDataFimFilter(novaDataFim)
    setPage(1)
  }

  const handleClearFilters = () => {
    const padrao = getDefaultDateRange()
    setIndicadorFilter('')
    setEquipeFilter('')
    setDataInicioFilter(padrao.dataInicio)
    setDataFimFilter(padrao.dataFim)
    setPage(1)
  }

  if (error) {
    return (
      <Card className="border-0 shadow-soft">
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <FileX2 className="h-6 w-6 text-destructive" />
            </div>
            <p className="font-medium text-destructive">Erro ao carregar lançamentos</p>
            <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Tente novamente.'}</p>
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Limpar e tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* ═══════════ FILTROS ═══════════ */}
      <Card className="border-0 shadow-soft">
        <CardContent className="py-4 px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label htmlFor="indicador" className="text-sm text-muted-foreground">Indicador</Label>
              <Select
                id="indicador"
                value={indicadorFilter}
                onChange={(e) => { setIndicadorFilter(e.target.value); setPage(1) }}
              >
                <option value="">Todos</option>
                {sortIndicadoresPtrBaProximos(indicadores ?? []).map((ind) => (
                  <option key={ind.id} value={ind.id}>{getIndicadorDisplayName(ind)}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="equipe" className="text-sm text-muted-foreground">Equipe</Label>
              <Select
                id="equipe"
                value={equipeFilter}
                onChange={(e) => { setEquipeFilter(e.target.value); setPage(1) }}
              >
                <option value="">Todas</option>
                {equipes?.map((eq) => (
                  <option key={eq.id} value={eq.id}>{formatEquipeName(eq.nome)}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="data-inicio" className="text-sm text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> De
              </Label>
              <DatePicker id="data-inicio" value={dataInicioFilter} onChange={handleDataInicioChange} placeholder="Início" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="data-fim" className="text-sm text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> Até
              </Label>
              <DatePicker id="data-fim" value={dataFimFilter} onChange={handleDataFimChange} placeholder="Fim" />
            </div>

            <div className="space-y-1">
              <Label className="text-sm opacity-0 hidden sm:block">_</Label>
              <Button variant="outline" onClick={handleClearFilters} className="w-full gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Limpar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════ TABELA ═══════════ */}
      <Card className="border-0 shadow-soft overflow-hidden">
        <CardHeader className="py-4 px-4 sm:px-6 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Histórico de Lançamentos</CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Lançamentos da sua base. Edite/exclua apenas os da sua equipe.
              </CardDescription>
            </div>
            {data && data.total > 0 && (
              <Badge variant="secondary" className="text-sm font-medium tabular-nums">
                {data.total} {data.total === 1 ? 'registro' : 'registros'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando lançamentos...</p>
            </div>
          ) : !data || data.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <FileX2 className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">Nenhum lançamento encontrado</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Ajuste os filtros ou cadastre um novo lançamento pelo menu lateral.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Autor</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Indicador</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Resumo</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Base</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Equipe</th>
                      <th className="text-right py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lancamentosOrdenados.map((lancamento) => {
                      const indicador = indicadoresMap.get(lancamento.indicador_id)
                      if (!indicador) return null
                      const userName =
                        (lancamento as LancamentoWithUser).profiles?.nome ??
                        (lancamento.user_id ? profilesNomeMap.get(lancamento.user_id) ?? lancamento.user_id.slice(0, 8) + '…' : '—')

                      const editable = canEdit(lancamento)

                      return (
                        <tr
                          key={lancamento.id}
                          className="group hover:bg-muted/30 transition-colors duration-100"
                        >
                          <td className="py-3 px-4 font-medium tabular-nums whitespace-nowrap">
                            {formatDateForDisplay(lancamento.data_referencia)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground truncate max-w-[160px]">{userName}</td>
                          <td className="py-3 px-4">
                            <Badge variant={getIndicatorBadgeVariant(indicador.schema_type)} className="text-xs font-medium">
                              {getIndicadorDisplayName(indicador)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground truncate max-w-[220px] hidden lg:table-cell">
                            {getResumoLancamento(lancamento, indicador)}
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">{getBaseName(lancamento.base_id)}</td>
                          <td className="py-3 px-4 hidden md:table-cell">{formatEquipeName(getEquipeName(lancamento.equipe_id))}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onView(lancamento, indicador)}
                                className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary"
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {editable ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onEdit(lancamento, indicador)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary"
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => onDelete(lancamento)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive"
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground/60 px-1">
                                  <Lock className="h-3.5 w-3.5" /> Leitura
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

              {/* Paginação */}
              {data.total > 0 && (
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-border bg-muted/20">
                  <p className="text-sm text-muted-foreground tabular-nums">
                    Página {data.page} de {data.totalPages} — {data.total} {data.total === 1 ? 'registro' : 'registros'}
                  </p>
                  {data.totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="h-8 w-8 rounded-md"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm font-medium px-2 tabular-nums">{page}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= data.totalPages}
                        className="h-8 w-8 rounded-md"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
