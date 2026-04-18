import React, { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useLancamentos } from '@/hooks/useLancamentos'
import { formatDateForDisplay } from '@/lib/date-utils'
import {
  flattenLancamento,
  convertToCSV,
  downloadCSV,
  generateFilename,
  buildTreinamentoConsolidadoRows,
  buildTreinamentoConsolidadoCSV,
  buildTreinamentoGranularRows,
  buildTreinamentoGranularCSV,
} from '@/lib/export-utils'
import { getIndicadorDisplayName, sortIndicadoresPtrBaProximos } from '@/lib/indicadores-display'
import { formatBaseName, formatEquipeName } from '@/lib/utils'
import { getLancamentoAutorDisplayName } from '@/lib/lancamento-autor-display'
import type { Database } from '@/lib/database.types'
import { useAuth } from '@/contexts/AuthContext'
import { AppShell } from '@/components/AppShell'
import { FormDrawer } from '@/components/ui/form-drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Eye } from 'lucide-react'
import { getDefaultDateRange, validateDateRange, enforceMaxDateRange } from '@/lib/date-utils'
import {
  OcorrenciaAeronauticaForm,
  OcorrenciaNaoAeronauticaForm,
  AtividadesAcessoriasForm,
  TAFForm,
  ProvaTeoricaForm,
  HorasTreinamentoForm,
  FormPtrBaExtras,
  InspecaoViaturasForm,
  TempoTPEPRForm,
  TempoRespostaForm,
  ExercicioPosicionamentoForm,
  ControleEPIForm,
  ControleEstoqueForm,
  ControleTrocasForm,
  VerificacaoTPForm,
  HigienizacaoTPForm,
} from '@/components/forms'

type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Indicador = Database['public']['Tables']['indicadores_config']['Row']
type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

const PAGE_SIZE = 20
const MAX_EXPORT_ROWS = 3000 // Limite para exportação

export function DataExplorer() {
  const { authUser } = useAuth()
  const [page, setPage] = useState(1)
  const [baseId, setBaseId] = useState<string>('')
  const [equipeId, setEquipeId] = useState<string>('')
  const [indicadorId, setIndicadorId] = useState<string>('')
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [isExportingConsolidado, setIsExportingConsolidado] = useState(false)
  const [isExportingGranular, setIsExportingGranular] = useState(false)
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null)
  const [selectedIndicador, setSelectedIndicador] = useState<Indicador | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)

  // Mapeamento de schema_type para componentes de formulário
  const FORM_COMPONENTS: Record<string, React.ComponentType<any>> = {
    ocorrencia_aero: OcorrenciaAeronauticaForm,
    ocorrencia_nao_aero: OcorrenciaNaoAeronauticaForm,
    atividades_acessorias: AtividadesAcessoriasForm,
    taf: TAFForm,
    prova_teorica: ProvaTeoricaForm,
    treinamento: HorasTreinamentoForm,
    ptr_ba_extras: FormPtrBaExtras,
    inspecao_viaturas: InspecaoViaturasForm,
    tempo_tp_epr: TempoTPEPRForm,
    tempo_resposta: TempoRespostaForm,
    exercicio_posicionamento: ExercicioPosicionamentoForm,
    controle_epi: ControleEPIForm,
    estoque: ControleEstoqueForm,
    controle_trocas: ControleTrocasForm,
    verificacao_tp: VerificacaoTPForm,
    higienizacao_tp: HigienizacaoTPForm,
  }

  // Inicializar com range padrão (mês atual)
  useEffect(() => {
    const defaultRange = getDefaultDateRange()
    setDataInicio(defaultRange.dataInicio)
    setDataFim(defaultRange.dataFim)
  }, [])

  // Buscar bases, equipes e indicadores
  const { data: bases } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*').order('nome')
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
  })

  const { data: indicadores } = useQuery<Indicador[]>({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indicadores_config').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

  // Buscar todos os perfis para mapear user_id -> nome
  const { data: profiles } = useQuery<Profile[]>({
    queryKey: ['profiles-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, nome')
      if (error) throw error
      return (data || []) as Profile[]
    },
  })

  // Criar mapa de user_id -> nome
  const profilesMap = useMemo(() => {
    const map = new Map<string, string>()
    profiles?.forEach((profile) => {
      map.set(profile.id, profile.nome)
    })
    return map
  }, [profiles])

  // Criar mapas de IDs para nomes
  const basesMap = useMemo(() => {
    const map = new Map<string, string>()
    bases?.forEach((base) => {
      map.set(base.id, formatBaseName(base.nome))
    })
    return map
  }, [bases])

  const equipesMap = useMemo(() => {
    const map = new Map<string, string>()
    equipes?.forEach((equipe) => {
      map.set(equipe.id, formatEquipeName(equipe.nome))
    })
    return map
  }, [equipes])

  const indicadoresMap = useMemo(() => {
    const map = new Map<string, Indicador>()
    indicadores?.forEach((indicador) => {
      map.set(indicador.id, indicador)
    })
    return map
  }, [indicadores])

  // Validar e ajustar range de datas
  useEffect(() => {
    if (dataInicio && dataFim) {
      const validation = validateDateRange(dataInicio, dataFim)
      if (!validation.isValid) {
        // Se inválido, ajustar automaticamente
        const adjusted = enforceMaxDateRange(dataInicio, dataFim)
        setDataInicio(adjusted.dataInicio)
        setDataFim(adjusted.dataFim)
      }
    }
  }, [dataInicio, dataFim])

  // Buscar lançamentos com paginação
  const { data: lancamentosData, isLoading, error } = useLancamentos({
    baseId: baseId || undefined,
    equipeId: equipeId || undefined,
    indicadorId: indicadorId || undefined,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    page,
    pageSize: PAGE_SIZE,
    enabled: true, // Sempre habilitado para gerente
  })

  // Função para exportar CSV
  const handleExportCSV = async () => {
    if (!lancamentosData) return

    setIsExporting(true)
    try {
      // Buscar TODOS os lançamentos filtrados (sem paginação) para exportação
      // Limitar a MAX_EXPORT_ROWS para evitar sobrecarga
      let exportQuery = supabase
        .from('lancamentos')
        .select('*')
        .order('data_referencia', { ascending: false })
        .limit(MAX_EXPORT_ROWS)

      // Aplicar filtros
      if (baseId) exportQuery = exportQuery.eq('base_id', baseId)
      if (equipeId) exportQuery = exportQuery.eq('equipe_id', equipeId)
      if (indicadorId) exportQuery = exportQuery.eq('indicador_id', indicadorId)
      if (dataInicio) exportQuery = exportQuery.gte('data_referencia', dataInicio)
      if (dataFim) exportQuery = exportQuery.lte('data_referencia', dataFim)

      const { data: allLancamentos, error: exportError } = await exportQuery

      if (exportError) {
        alert(`Erro ao exportar: ${exportError.message}`)
        return
      }

      if (!allLancamentos || allLancamentos.length === 0) {
        alert('Nenhum dado encontrado para exportar')
        return
      }

      // Achatar todos os lançamentos
      const flattenedRows: Array<Record<string, any>> = []
      
      for (const lancamento of allLancamentos as Lancamento[]) {
        const indicador = indicadoresMap.get(lancamento.indicador_id)
        if (!indicador) continue

        const userName = getLancamentoAutorDisplayName(lancamento, profilesMap)
        const baseName = basesMap.get(lancamento.base_id) || lancamento.base_id
        const equipeName = equipesMap.get(lancamento.equipe_id) || lancamento.equipe_id

        const rows = flattenLancamento(lancamento, indicador, userName, baseName, equipeName)
        flattenedRows.push(...rows)
      }

      // Converter para CSV
      const csvContent = convertToCSV(flattenedRows)
      
      // Fazer download
      const filename = generateFilename('relatorio_indicadores')
      downloadCSV(csvContent, filename)

      alert(`Exportação concluída! ${flattenedRows.length} linha(s) exportada(s).`)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      alert(`Erro ao exportar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsExporting(false)
    }
  }

  // Exportação consolidada mensal PTR-BA (somado por colaborador/mês)
  const handleExportFechamentoMensal = async () => {
    if (!indicadorId) return
    const indicador = indicadoresMap.get(indicadorId)
    if (!indicador || indicador.schema_type !== 'treinamento') return

    setIsExportingConsolidado(true)
    try {
      let exportQuery = supabase
        .from('lancamentos')
        .select('*')
        .eq('indicador_id', indicadorId)
        .order('data_referencia', { ascending: false })
        .limit(MAX_EXPORT_ROWS)

      if (baseId) exportQuery = exportQuery.eq('base_id', baseId)
      if (equipeId) exportQuery = exportQuery.eq('equipe_id', equipeId)
      if (dataInicio) exportQuery = exportQuery.gte('data_referencia', dataInicio)
      if (dataFim) exportQuery = exportQuery.lte('data_referencia', dataFim)

      const { data: allLancamentos, error: exportError } = await exportQuery

      if (exportError) {
        alert(`Erro ao exportar: ${exportError.message}`)
        return
      }

      if (!allLancamentos || allLancamentos.length === 0) {
        alert('Nenhum lançamento de treinamento encontrado para o período e filtros selecionados.')
        return
      }

      const rows = buildTreinamentoConsolidadoRows(allLancamentos as Lancamento[], basesMap)
      const csvContent = buildTreinamentoConsolidadoCSV(rows)
      const filename = generateFilename('fechamento_mensal_ptr_ba')
      downloadCSV(csvContent, filename)

      alert(`Fechamento mensal exportado! ${rows.length} linha(s) consolidada(s).`)
    } catch (error) {
      console.error('Erro ao exportar fechamento mensal:', error)
      alert(`Erro ao exportar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsExportingConsolidado(false)
    }
  }

  // Exportação granular PTR-BA (uma linha por tema por colaborador)
  const handleExportGranular = async () => {
    if (!indicadorId) return
    const indicador = indicadoresMap.get(indicadorId)
    if (!indicador || indicador.schema_type !== 'treinamento') return

    setIsExportingGranular(true)
    try {
      let exportQuery = supabase
        .from('lancamentos')
        .select('*')
        .eq('indicador_id', indicadorId)
        .order('data_referencia', { ascending: false })
        .limit(MAX_EXPORT_ROWS)

      if (baseId) exportQuery = exportQuery.eq('base_id', baseId)
      if (equipeId) exportQuery = exportQuery.eq('equipe_id', equipeId)
      if (dataInicio) exportQuery = exportQuery.gte('data_referencia', dataInicio)
      if (dataFim) exportQuery = exportQuery.lte('data_referencia', dataFim)

      const { data: allLancamentos, error: exportError } = await exportQuery

      if (exportError) {
        alert(`Erro ao exportar: ${exportError.message}`)
        return
      }

      if (!allLancamentos || allLancamentos.length === 0) {
        alert('Nenhum lançamento de treinamento encontrado para o período e filtros selecionados.')
        return
      }

      const rows = buildTreinamentoGranularRows(allLancamentos as Lancamento[], basesMap, equipesMap)
      const csvContent = buildTreinamentoGranularCSV(rows)
      const filename = generateFilename('treinamento_detalhado_por_tema')
      downloadCSV(csvContent, filename)

      alert(`Exportação detalhada concluída! ${rows.length} linha(s) (uma por dia por colaborador; cada tema em uma coluna).`)
    } catch (error) {
      console.error('Erro ao exportar detalhado:', error)
      alert(`Erro ao exportar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsExportingGranular(false)
    }
  }

  const isTreinamentoSelected =
    !!indicadorId && indicadoresMap.get(indicadorId)?.schema_type === 'treinamento'

  // Função para visualizar detalhes
  const handleViewDetails = (lancamento: Lancamento) => {
    const indicador = indicadoresMap.get(lancamento.indicador_id)
    if (!indicador) {
      alert('Indicador não encontrado para este lançamento')
      return
    }

    setSelectedLancamento(lancamento)
    setSelectedIndicador(indicador)
    setShowViewModal(true)
  }

  const FormComponent = selectedIndicador
    ? FORM_COMPONENTS[selectedIndicador.schema_type]
    : null

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClearFilters = () => {
    setBaseId('')
    setEquipeId('')
    setIndicadorId('')
    const defaultRange = getDefaultDateRange()
    setDataInicio(defaultRange.dataInicio)
    setDataFim(defaultRange.dataFim)
    setPage(1)
  }

  return (
    <AppShell title="Explorador de Dados" subtitle={authUser?.profile?.nome}>
        {/* Filtros Globais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros de Auditoria</CardTitle>
            <CardDescription>
              Selecione os critérios para filtrar os lançamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Base</Label>
                <Select value={baseId} onChange={(e) => setBaseId(e.target.value)}>
                  <option value="">Todas as Bases</option>
                  {bases?.map((base) => (
                    <option key={base.id} value={base.id}>
                      {formatBaseName(base.nome)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipe</Label>
                <Select value={equipeId} onChange={(e) => setEquipeId(e.target.value)}>
                  <option value="">Todas as Equipes</option>
                  {equipes?.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>
                      {formatEquipeName(equipe.nome)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Indicador</Label>
                <Select value={indicadorId} onChange={(e) => setIndicadorId(e.target.value)}>
                  <option value="">Todos os Indicadores</option>
                  {sortIndicadoresPtrBaProximos(indicadores ?? []).map((indicador) => (
                    <option key={indicador.id} value={indicador.id}>
                      {getIndicadorDisplayName(indicador)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="flex-1"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Botão de Exportação */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleExportCSV}
                disabled={isExporting || !lancamentosData || lancamentosData.total === 0}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar Resultados (.csv)'}
              </Button>
              {isTreinamentoSelected && (
                <Button
                  onClick={handleExportFechamentoMensal}
                  disabled={isExportingConsolidado || !lancamentosData || lancamentosData.total === 0}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExportingConsolidado ? 'Exportando...' : 'Exportar Fechamento Mensal (Somado)'}
                </Button>
              )}
              {isTreinamentoSelected && (
                <Button
                  onClick={handleExportGranular}
                  disabled={isExportingGranular || !lancamentosData || lancamentosData.total === 0}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExportingGranular ? 'Exportando...' : 'Exportar Detalhado (por Tema e Colaborador)'}
                </Button>
              )}
            </div>
            {lancamentosData && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {lancamentosData.total} lançamento(s) encontrado(s)
                {lancamentosData.total > MAX_EXPORT_ROWS && (
                  <span className="text-orange-600"> (máximo {MAX_EXPORT_ROWS} linhas na exportação)</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Auditoria */}
        <Card>
          <CardHeader>
            <CardTitle>Tabela de Auditoria</CardTitle>
            <CardDescription>
              Visualize todos os lançamentos com informações detalhadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-destructive mb-4">
                Erro ao carregar dados: {error instanceof Error ? error.message : 'Erro desconhecido'}
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : !lancamentosData || lancamentosData.data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lançamento encontrado com os filtros selecionados.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left p-3 font-semibold text-sm">ID</th>
                        <th className="text-left p-3 font-semibold text-sm">Data/Hora Registro</th>
                        <th className="text-left p-3 font-semibold text-sm">Data Referência</th>
                        <th className="text-left p-3 font-semibold text-sm">Usuário</th>
                        <th className="text-left p-3 font-semibold text-sm">Base</th>
                        <th className="text-left p-3 font-semibold text-sm">Equipe</th>
                        <th className="text-left p-3 font-semibold text-sm">Indicador</th>
                        <th className="text-left p-3 font-semibold text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lancamentosData.data.map((lancamento) => {
                        const indicador = indicadoresMap.get(lancamento.indicador_id)
                        const userName = getLancamentoAutorDisplayName(lancamento, profilesMap)
                        const baseName = basesMap.get(lancamento.base_id) || lancamento.base_id
                        const equipeName = equipesMap.get(lancamento.equipe_id) || lancamento.equipe_id

                        return (
                          <tr
                            key={lancamento.id}
                            className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                          >
                            <td className="p-3 text-sm font-mono text-xs">{lancamento.id.substring(0, 8)}...</td>
                            <td className="p-3 text-sm">
                              {lancamento.created_at
                                ? new Date(lancamento.created_at).toLocaleString('pt-BR')
                                : '-'}
                            </td>
                            <td className="p-3 text-sm">{formatDateForDisplay(lancamento.data_referencia)}</td>
                            <td className="p-3 text-sm">{userName}</td>
                            <td className="p-3 text-sm">{baseName}</td>
                            <td className="p-3 text-sm">{equipeName}</td>
                            <td className="p-3 text-sm">{indicador?.nome || 'Indicador Desconhecido'}</td>
                            <td className="p-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(lancamento)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver Detalhes
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {lancamentosData.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Página {lancamentosData.page} de {lancamentosData.totalPages} ({lancamentosData.total} lançamentos)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page >= lancamentosData.totalPages}
                      >
                        Próximo
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Drawer: Visualização de Detalhes */}
        {selectedIndicador && selectedLancamento && FormComponent && (
          <FormDrawer
            open={showViewModal}
            onClose={() => {
              setShowViewModal(false)
              setSelectedLancamento(null)
              setSelectedIndicador(null)
            }}
            title="Visualizar Detalhes"
            subtitle={selectedIndicador.nome}
          >
            <FormComponent
              indicadorId={selectedIndicador.id}
              onSuccess={() => {
                setShowViewModal(false)
                setSelectedLancamento(null)
                setSelectedIndicador(null)
              }}
              initialData={{
                data_referencia: selectedLancamento.data_referencia,
                base_id: selectedLancamento.base_id,
                equipe_id: selectedLancamento.equipe_id,
                ...(selectedLancamento.conteudo as Record<string, unknown>),
              }}
              readOnly={true}
            />
            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedLancamento(null)
                  setSelectedIndicador(null)
                }}
                variant="outline"
              >
                Fechar
              </Button>
            </div>
          </FormDrawer>
        )}
    </AppShell>
  )
}
