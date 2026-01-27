import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { useLancamentos } from '@/hooks/useLancamentos'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  processOcorrenciaAeronautica,
  processOcorrenciaNaoAeronautica,
  processAtividadesAcessorias,
  processTAF,
  processProvaTeorica,
  processTempoTPEPR,
  processTempoResposta,
  processHorasTreinamento,
  processInspecaoViaturas,
  processControleEstoque,
  processControleEPI,
  processControleTrocas,
  filterByColaborador,
  generateExecutiveSummary,
} from '@/lib/analytics-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { ComposedChart } from '@/components/charts/ComposedChart'
import { AnalyticsFilterBar } from '@/components/AnalyticsFilterBar'
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Users, Info } from 'lucide-react'

type IndicadorConfig = Database['public']['Tables']['indicadores_config']['Row']

type ViewType =
  | 'visao_geral'
  | 'ocorrencia_aero'
  | 'ocorrencia_nao_aero'
  | 'atividades_acessorias'
  | 'taf'
  | 'prova_teorica'
  | 'treinamento'
  | 'tempo_tp_epr'
  | 'tempo_resposta'
  | 'inspecao_viaturas'
  | 'logistica'

// Componente de Tooltip com ícone de informação
function InfoTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block">
      <Info className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600 transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-6 w-[500px] shadow-lg whitespace-normal leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardAnalytics() {
  const { authUser } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<ViewType>('visao_geral')
  const [baseId, setBaseId] = useState<string>('')
  const [equipeId, setEquipeId] = useState<string>('')
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')
  const [colaboradorNome, setColaboradorNome] = useState<string>('')
  const [tipoOcorrencia, setTipoOcorrencia] = useState<string>('')
  
  const isChefe = authUser?.profile?.role === 'chefe'
  const isGerente = authUser?.profile?.role === 'geral'

  // Pré-selecionar a base do usuário logado quando o componente carregar (apenas uma vez)
  // Para Chefes, sempre manter a base deles bloqueada
  useEffect(() => {
    if (authUser?.profile?.base_id) {
      if (isChefe) {
        // Chefes sempre têm a base deles bloqueada
        setBaseId(authUser.profile.base_id)
      } else if (baseId === '') {
        // Gerentes podem escolher, mas começam com a base deles pré-selecionada
        setBaseId(authUser.profile.base_id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.profile?.base_id, isChefe])
  
  // Garantir que Chefes não possam mudar a base (proteção adicional)
  useEffect(() => {
    if (isChefe && authUser?.profile?.base_id && baseId !== authUser.profile.base_id) {
      setBaseId(authUser.profile.base_id)
    }
  }, [isChefe, authUser?.profile?.base_id, baseId])

  // Buscar bases (usado no AnalyticsFilterBar)

  // Buscar indicadores config
  const { data: indicadoresConfig } = useQuery<IndicadorConfig[]>({
    queryKey: ['indicadores_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indicadores_config').select('*').order('nome')
      if (error) throw error
      return (data || []) as IndicadorConfig[]
    },
  })

  // Buscar bases para a visão geral
  const { data: bases } = useQuery<Array<{ id: string; nome: string }>>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('id, nome').order('nome')
      if (error) throw error
      return (data || []) as Array<{ id: string; nome: string }>
    },
  })

  // Determinar qual indicador buscar baseado na view
  const getIndicadorId = (): string | undefined => {
    if (view === 'visao_geral' || view === 'logistica') return undefined
    const indicador = indicadoresConfig?.find((i) => i.schema_type === view)
    return indicador?.id
  }

  // Obter nome do indicador para exibir no cabeçalho
  const getIndicadorNome = (): string => {
    const nomesIndicadores: Record<ViewType, string> = {
      visao_geral: '',
      ocorrencia_aero: 'Ocorrência Aeronáutica',
      ocorrencia_nao_aero: 'Ocorrência Não Aeronáutica',
      atividades_acessorias: 'Atividades Acessórias',
      taf: 'Teste de Aptidão Física (TAF)',
      prova_teorica: 'Prova Teórica',
      treinamento: 'Horas de Treinamento',
      tempo_tp_epr: 'Exercício TP/EPR',
      tempo_resposta: 'Tempo de Resposta',
      inspecao_viaturas: 'Inspeção de Viaturas',
      logistica: 'Logística',
    }
    return nomesIndicadores[view] || ''
  }

  // SEGURANÇA: Para Chefes, sempre usar a base_id do perfil (mesmo que RLS já proteja no banco)
  // Isso garante que mesmo se alguém tentar manipular o código no navegador, o filtro correto será aplicado
  const userBaseId = isChefe ? authUser?.profile?.base_id : baseId

  // Buscar lançamentos (sem filtro de indicador para visão geral)
  // Para visão geral e atividades_acessorias, buscar TODOS os dados sem paginação
  const { data: lancamentosResult, isLoading: isLoadingLancamentos } = useLancamentos({
    baseId: userBaseId || undefined,
    equipeId: equipeId || undefined,
    indicadorId: (view === 'visao_geral' || view === 'atividades_acessorias') ? undefined : getIndicadorId(),
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    enabled: view !== 'visao_geral' && view !== 'atividades_acessorias',
    pageSize: 20,
  })

  // Query separada para visão geral e atividades_acessorias que busca TODOS os dados sem paginação
  const { data: todosLancamentosResult, isLoading: isLoadingTodos } = useQuery({
    queryKey: ['lancamentos-todos', userBaseId, equipeId, dataInicio, dataFim, view],
    enabled: view === 'visao_geral' || view === 'atividades_acessorias',
    queryFn: async () => {
      let query = supabase
        .from('lancamentos')
        .select('*')
        .order('data_referencia', { ascending: false })

      // SEGURANÇA: Chefes sempre filtram pela própria base (mesmo que RLS já proteja)
      if (isChefe && authUser?.profile?.base_id) {
        query = query.eq('base_id', authUser.profile.base_id)
      } else if (baseId) {
        query = query.eq('base_id', baseId)
      }
      
      if (equipeId) query = query.eq('equipe_id', equipeId)
      if (dataInicio) query = query.gte('data_referencia', dataInicio)
      if (dataFim) query = query.lte('data_referencia', dataFim)
      
      // Para atividades_acessorias, filtrar pelo indicador correto
      if (view === 'atividades_acessorias') {
        const indicadorId = getIndicadorId()
        if (indicadorId) {
          query = query.eq('indicador_id', indicadorId)
        }
      }

      const { data, error } = await query
      if (error) throw error
      return (data || []) as Database['public']['Tables']['lancamentos']['Row'][]
    },
  })

  // Usar todos os lançamentos para visão geral e atividades_acessorias, ou os paginados para outras views
  const lancamentos = (view === 'visao_geral' || view === 'atividades_acessorias')
    ? (todosLancamentosResult || [])
    : (lancamentosResult?.data || [])
  
  const isLoading = (view === 'visao_geral' || view === 'atividades_acessorias') ? isLoadingTodos : isLoadingLancamentos

  // Aplicar filtro por colaborador se necessário
  const filteredLancamentos =
    colaboradorNome && (view === 'taf' || view === 'prova_teorica' || view === 'treinamento' || view === 'tempo_tp_epr')
      ? filterByColaborador(lancamentos, colaboradorNome)
      : lancamentos

  // Processar dados conforme view
  let processedData: any = null
  if (filteredLancamentos.length > 0 || view === 'visao_geral') {
    switch (view) {
      case 'visao_geral':
        if (bases && indicadoresConfig) {
          processedData = generateExecutiveSummary(lancamentos, bases, indicadoresConfig)
        }
        break
      case 'ocorrencia_aero':
        processedData = processOcorrenciaAeronautica(filteredLancamentos)
        break
      case 'ocorrencia_nao_aero':
        processedData = processOcorrenciaNaoAeronautica(filteredLancamentos)
        break
      case 'atividades_acessorias':
        processedData = processAtividadesAcessorias(filteredLancamentos)
        break
      case 'taf':
        processedData = processTAF(filteredLancamentos)
        break
      case 'prova_teorica':
        processedData = processProvaTeorica(filteredLancamentos, colaboradorNome || undefined)
        break
      case 'treinamento':
        processedData = processHorasTreinamento(filteredLancamentos)
        break
      case 'tempo_tp_epr':
        processedData = processTempoTPEPR(filteredLancamentos)
        break
      case 'tempo_resposta':
        processedData = processTempoResposta(filteredLancamentos)
        break
      case 'inspecao_viaturas':
        processedData = processInspecaoViaturas(filteredLancamentos)
        break
      case 'logistica':
        // Agrupar dados de logística
        processedData = {
          estoque: processControleEstoque(
            filteredLancamentos.filter((l) => {
              const indicador = indicadoresConfig?.find((i) => i.id === l.indicador_id)
              return indicador?.schema_type === 'estoque'
            })
          ),
          epi: processControleEPI(
            filteredLancamentos.filter((l) => {
              const indicador = indicadoresConfig?.find((i) => i.id === l.indicador_id)
              return indicador?.schema_type === 'controle_epi'
            })
          ),
          trocas: processControleTrocas(
            filteredLancamentos.filter((l) => {
              const indicador = indicadoresConfig?.find((i) => i.id === l.indicador_id)
              return indicador?.schema_type === 'controle_trocas'
            })
          ),
        }
        break
    }
  }

  const showColaboradorFilter =
    view === 'taf' || view === 'prova_teorica' || view === 'treinamento' || view === 'tempo_tp_epr'
  const showTipoOcorrenciaFilter = view === 'ocorrencia_aero' || view === 'ocorrencia_nao_aero'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col transition-all duration-300 ease-in-out page-transition">
      {/* Header */}
      <header className="bg-[#fc4d00] shadow-sm border-b">
        <div className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-0 py-4">
          <div className="flex justify-between items-center min-h-[80px]">
            <div className="flex items-center gap-4 pl-4 sm:pl-6 lg:pl-8">
              <img 
                src="/logo-medmais.png" 
                alt="MedMais Logo" 
                className="h-10 w-auto brightness-0 invert"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                <p className="text-sm text-white/90">Analytics e Indicadores</p>
              </div>
            </div>
            <div className="flex gap-2">
              {isChefe && (
                <Button 
                  onClick={() => navigate('/dashboard-chefe')} 
                  variant="outline" 
                  className="bg-white text-[#fc4d00] hover:bg-white/90 border-white transition-all duration-200"
                >
                  Voltar ao Dashboard
                </Button>
              )}
              {isGerente && (
                <Button 
                  onClick={() => navigate('/dashboard-gerente')} 
                  variant="outline" 
                  className="bg-white text-[#fc4d00] hover:bg-white/90 border-white transition-all duration-200"
                >
                  Voltar
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#fc4d00] border-r border-[#fc4d00] p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4 text-white">Analytics</h2>
        <nav className="space-y-1">
          <button
            onClick={() => setView('visao_geral')}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              view === 'visao_geral' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
            }`}
          >
            Visão Geral
          </button>

          <div className="mt-4">
            <p className="text-xs font-semibold text-white/80 uppercase px-3 mb-2">Ocorrências</p>
            <button
              onClick={() => setView('ocorrencia_aero')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'ocorrencia_aero' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Ocorr. Aeronáutica
            </button>
            <button
              onClick={() => setView('ocorrencia_nao_aero')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'ocorrencia_nao_aero' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Ocorr. Não Aeronáutica
            </button>
            <button
              onClick={() => setView('atividades_acessorias')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'atividades_acessorias' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Atividades Acessórias
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-white/80 uppercase px-3 mb-2">Pessoal & Treino</p>
            <button
              onClick={() => setView('taf')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'taf' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Teste de Aptidão (TAF)
            </button>
            <button
              onClick={() => setView('prova_teorica')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'prova_teorica' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Prova Teórica
            </button>
            <button
              onClick={() => setView('treinamento')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'treinamento' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Horas de Treinamento
            </button>
            <button
              onClick={() => setView('tempo_tp_epr')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'tempo_tp_epr' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Exercício TP/EPR
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-white/80 uppercase px-3 mb-2">Frota</p>
            <button
              onClick={() => setView('tempo_resposta')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'tempo_resposta' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Tempo Resposta
            </button>
            <button
              onClick={() => setView('inspecao_viaturas')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'inspecao_viaturas' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Inspeção Viaturas
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-white/80 uppercase px-3 mb-2">Logística</p>
            <button
              onClick={() => setView('logistica')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'logistica' ? 'bg-white text-[#fc4d00] font-semibold' : 'text-white hover:bg-white/20'
              }`}
            >
              Estoque, EPI & Trocas
            </button>
          </div>
        </nav>
      </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                Dashboard{getIndicadorNome() ? ` - ${getIndicadorNome()}` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Barra de Filtros */}
              <AnalyticsFilterBar
                baseId={baseId}
                onBaseChange={setBaseId}
                equipeId={equipeId}
                onEquipeChange={setEquipeId}
                dataInicio={dataInicio}
                onDataInicioChange={setDataInicio}
                dataFim={dataFim}
                onDataFimChange={setDataFim}
                colaboradorId={colaboradorNome}
                onColaboradorChange={setColaboradorNome}
                tipoOcorrencia={tipoOcorrencia}
                onTipoOcorrenciaChange={setTipoOcorrencia}
                showColaboradorFilter={showColaboradorFilter}
                showTipoOcorrenciaFilter={showTipoOcorrenciaFilter}
                disableBaseFilter={isChefe}
              />

              {/* Conteúdo Dinâmico */}
              {isLoading ? (
                <div className="text-center py-8">Carregando dados...</div>
              ) : view === 'visao_geral' && !processedData ? (
                <div className="text-center py-8 text-gray-500">
                  {!bases || !indicadoresConfig 
                    ? 'Carregando configurações...' 
                    : 'Nenhum dado encontrado para os filtros selecionados.'}
                </div>
              ) : !processedData ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum dado encontrado para os filtros selecionados.
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {/* Renderizar conteúdo específico de cada view */}
                  {view === 'ocorrencia_aero' && processedData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Ocorrências</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.totalOcorrencias}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Maior Tempo 1ª Viatura</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.maiorTempo1Viatura}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Maior Tempo Última Viatura</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.maiorTempoUltViatura}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Horas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.totalHorasSomadas}</div>
                          </CardContent>
                        </Card>
                      </div>
                      <Card>
                        <CardHeader>
                          <CardTitle>Evolução Mensal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LineChart
                            data={processedData.graficoEvolucaoMensal}
                            dataKey="quantidade"
                            xKey="mes"
                            name="Ocorrências"
                            color="#fc4d00"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'ocorrencia_nao_aero' && processedData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Ocorrências</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.totalOcorrencias}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Horas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.totalHorasSomadas}</div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Evolução Mensal</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoEvolucaoMensal}
                              dataKey="quantidade"
                              xKey="mes"
                              name="Ocorrências"
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Top 5 Tipos</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoTop5Tipos}
                              dataKey="qtd"
                              xKey="tipo"
                              name="Quantidade"
                              color="#fc4d00"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {view === 'atividades_acessorias' && processedData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total de Atividades</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalAtividades || 0}</div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Evolução Mensal</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoEvolucaoMensal || []}
                              dataKey="quantidade"
                              xKey="mes"
                              name="Atividades"
                              color="#fc4d00"
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Atividades por Tipo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoPorTipo || []}
                              dataKey="qtd"
                              xKey="tipo"
                              name="Quantidade"
                              color="#fc4d00"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {view === 'taf' && processedData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Menor Tempo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.menorTempo || '-'}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Médio</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMedio || '-'}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Máximo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMaximo || '-'}</div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {processedData.graficoAprovadoReprovado && processedData.graficoAprovadoReprovado.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Taxa de Aprovação</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <DonutChart
                                data={processedData.graficoAprovadoReprovado}
                                colors={['#22c55e', '#ef4444']}
                              />
                            </CardContent>
                          </Card>
                        )}
                        {processedData.graficoEvolucaoMediaMensal && processedData.graficoEvolucaoMediaMensal.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Evolução Média Mensal</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <LineChart
                                data={processedData.graficoEvolucaoMediaMensal.map((item: any) => {
                                  // Converter string "mm:ss" para segundos (número)
                                  const [mins, secs] = (item.media || '0:0').split(':').map(Number)
                                  return {
                                    ...item,
                                    media: mins * 60 + secs, // Converter para segundos
                                    mediaFormatada: item.media, // Manter formato original para tooltip
                                  }
                                })}
                                dataKey="media"
                                xKey="mes"
                                name="Tempo Médio"
                                color="#fc4d00"
                                yAxisFormatter={(value: any) => {
                                  // Formatar segundos de volta para mm:ss no eixo Y
                                  const mins = Math.floor(value / 60)
                                  const secs = Math.floor(value % 60)
                                  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                                }}
                              />
                            </CardContent>
                          </Card>
                        )}
                      </div>
                      {(!processedData.graficoAprovadoReprovado || processedData.graficoAprovadoReprovado.length === 0) && 
                       (!processedData.graficoEvolucaoMediaMensal || processedData.graficoEvolucaoMediaMensal.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado de TAF encontrado para os filtros selecionados.
                        </div>
                      )}
                    </div>
                  )}

                  {view === 'prova_teorica' && processedData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Avaliados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.totalAvaliados}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Nota Média</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.notaMedia}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Taxa Aprovação</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.taxaAprovacao}%</div>
                          </CardContent>
                        </Card>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Taxa de Aprovação</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <DonutChart
                              data={processedData.graficoAprovadoReprovado}
                              colors={['#22c55e', '#ef4444']}
                            />
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Evolução Nota Média Mensal</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoEvolucaoMediaMensal}
                              dataKey="media"
                              xKey="mes"
                              name="Nota Média"
                              color="#fc4d00"
                            />
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {view === 'tempo_resposta' && processedData && (
                    <div className="space-y-6">
                      {processedData.kpis.menorTempo && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Menor Tempo</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold">{processedData.kpis.menorTempo.tempo}</div>
                              <div className="text-sm text-gray-600 mt-2">
                                {processedData.kpis.menorTempo.motorista} - {processedData.kpis.menorTempo.viatura}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                      {processedData.graficoEvolucaoMediaMensal && processedData.graficoEvolucaoMediaMensal.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Curva de Agilidade (Tempo Médio Mensal)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoEvolucaoMediaMensal.map((item: any) => {
                                // Converter string "mm:ss" para segundos (número)
                                const [mins, secs] = (item.media || '0:0').split(':').map(Number)
                                return {
                                  ...item,
                                  media: mins * 60 + secs, // Converter para segundos
                                }
                              })}
                              dataKey="media"
                              xKey="mes"
                              name="Tempo Médio"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                // Formatar segundos de volta para mm:ss no eixo Y
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {view === 'treinamento' && processedData && (
                    <div className="space-y-6">
                      {processedData.graficoTotalHorasPorEquipe && processedData.graficoTotalHorasPorEquipe.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Total Horas por Equipe</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoTotalHorasPorEquipe.map((item: any) => {
                                // Converter string "hh:mm" para minutos (número)
                                const [hours, mins] = (item.totalHoras || '0:0').split(':').map(Number)
                                return {
                                  ...item,
                                  totalHoras: hours * 60 + mins, // Converter para minutos
                                }
                              })}
                              dataKey="totalHoras"
                              xKey="equipe"
                              name="Total Horas"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                // Formatar minutos de volta para hh:mm no eixo Y
                                const hours = Math.floor(value / 60)
                                const mins = Math.floor(value % 60)
                                return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}
                      {processedData.graficoTotalAbsolutoMensal && processedData.graficoTotalAbsolutoMensal.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Evolução Mensal</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoTotalAbsolutoMensal.map((item: any) => {
                                // Converter string "hh:mm" para minutos (número)
                                const [hours, mins] = (item.totalHoras || '0:0').split(':').map(Number)
                                return {
                                  ...item,
                                  totalHoras: hours * 60 + mins, // Converter para minutos
                                }
                              })}
                              dataKey="totalHoras"
                              xKey="mes"
                              name="Total Horas"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                // Formatar minutos de volta para hh:mm no eixo Y
                                const hours = Math.floor(value / 60)
                                const mins = Math.floor(value % 60)
                                return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}
                      {(!processedData.graficoTotalHorasPorEquipe || processedData.graficoTotalHorasPorEquipe.length === 0) && 
                       (!processedData.graficoTotalAbsolutoMensal || processedData.graficoTotalAbsolutoMensal.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado de treinamento encontrado para os filtros selecionados.
                        </div>
                      )}
                    </div>
                  )}

                  {view === 'tempo_tp_epr' && processedData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Menor Tempo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.menorTempo || '-'}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Médio</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMedio || '-'}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Máximo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMaximo || '-'}</div>
                          </CardContent>
                        </Card>
                      </div>
                      {processedData.graficoEvolucaoMediaMensal && processedData.graficoEvolucaoMediaMensal.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Evolução Média Mensal</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoEvolucaoMediaMensal.map((item: any) => {
                                // Converter string "mm:ss" para segundos (número)
                                const [mins, secs] = (item.media || '0:0').split(':').map(Number)
                                return {
                                  ...item,
                                  media: mins * 60 + secs, // Converter para segundos
                                }
                              })}
                              dataKey="media"
                              xKey="mes"
                              name="Tempo Médio"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                // Formatar segundos de volta para mm:ss no eixo Y
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}
                      {processedData.graficoDesempenhoPorEquipe && processedData.graficoDesempenhoPorEquipe.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Desempenho por Equipe</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoDesempenhoPorEquipe.map((item: any) => {
                                // Converter string "mm:ss" para segundos (número)
                                const [mins, secs] = (item.media || '0:0').split(':').map(Number)
                                return {
                                  ...item,
                                  media: mins * 60 + secs, // Converter para segundos
                                }
                              })}
                              dataKey="media"
                              xKey="equipe"
                              name="Tempo Médio"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                // Formatar segundos de volta para mm:ss no eixo Y
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}
                      {(!processedData.graficoEvolucaoMediaMensal || processedData.graficoEvolucaoMediaMensal.length === 0) && 
                       (!processedData.graficoDesempenhoPorEquipe || processedData.graficoDesempenhoPorEquipe.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado de TP/EPR encontrado para os filtros selecionados.
                        </div>
                      )}
                    </div>
                  )}

                  {view === 'inspecao_viaturas' && processedData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Inspeções</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.totalInspecoes}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Não Conforme</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.totalNaoConforme}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Taxa Conformidade</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.taxaConformidade}%</div>
                          </CardContent>
                        </Card>
                      </div>
                      <Card>
                        <CardHeader>
                          <CardTitle>Manutenção por Viatura</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <BarChart
                            data={processedData.graficoPorViatura}
                            dataKey="naoConforme"
                            xKey="viatura"
                            name="Não Conforme"
                            color="#fc4d00"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'logistica' && processedData && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Saúde do Estoque</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <BarChart
                            data={processedData.estoque.graficoSaudeEstoque}
                            dataKey="atual"
                            xKey="material"
                            name="Quantidade Atual"
                            color="#fc4d00"
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Entrega de EPI/Uniformes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LineChart
                            data={processedData.epi.graficoEntregaEPI}
                            dataKey="media"
                            xKey="mes"
                            name="Média %"
                            color="#fc4d00"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'visao_geral' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs de Impacto */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Volume Operacional */}
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-medium text-gray-600">Volume Operacional</CardTitle>
                              <InfoTooltip text="Soma total de ocorrências (Aeronáuticas + Não Aeronáuticas) no período filtrado. Compara com o período anterior (30 dias) mostrando a porcentagem de crescimento." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.volumeOperacional.valor}</div>
                            <div className="flex items-center gap-2 mt-2">
                              {processedData.kpis.volumeOperacional.crescimento >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className={`text-sm ${processedData.kpis.volumeOperacional.crescimento >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {processedData.kpis.volumeOperacional.crescimento >= 0 ? '+' : ''}
                                {processedData.kpis.volumeOperacional.crescimento.toFixed(1)}%
                              </span>
                              <span className="text-xs text-gray-500">vs período anterior</span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Agilidade */}
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-medium text-gray-600">Agilidade</CardTitle>
                              <InfoTooltip text="Média global dos tempos de resposta de todas as equipes. Verde indica meta atingida (< 3 minutos), amarelo indica atenção necessária (≥ 3 minutos)." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <Clock className={`h-5 w-5 ${processedData.kpis.agilidade.cor === 'green' ? 'text-green-600' : 'text-yellow-600'}`} />
                              <div className="text-3xl font-bold">{processedData.kpis.agilidade.tempoMedio}</div>
                            </div>
                            <div className="mt-2">
                              <span className={`text-sm px-2 py-1 rounded ${processedData.kpis.agilidade.cor === 'green' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {processedData.kpis.agilidade.tempoMedioMinutos < 3 ? 'Meta atingida' : 'Atenção necessária'}
                              </span>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Força de Trabalho */}
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-medium text-gray-600">Força de Trabalho</CardTitle>
                              <InfoTooltip text="Soma total de horas de treinamento realizadas por todos os colaboradores no período filtrado. Indica o investimento em capacitação da equipe." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              <Users className="h-5 w-5 text-blue-600" />
                              <div className="text-3xl font-bold">{processedData.kpis.forcaTrabalho.totalHoras}</div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">Total de horas de treinamento</div>
                          </CardContent>
                        </Card>

                        {/* Alertas Críticos */}
                        <Card>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-sm font-medium text-gray-600">Alertas Críticos</CardTitle>
                              <InfoTooltip text="Contagem de bases que possuem ao menos 1 item de estoque abaixo do exigido (Pó Químico, LGE ou Nitrogênio) OU 1 viatura não conforme. Identifica pontos que requerem atenção imediata." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2">
                              {processedData.kpis.alertasCriticos.total > 0 ? (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-green-500" />
                              )}
                              <div className={`text-3xl font-bold ${processedData.kpis.alertasCriticos.total > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {processedData.kpis.alertasCriticos.total}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              {processedData.kpis.alertasCriticos.total > 0 
                                ? `${processedData.kpis.alertasCriticos.total} base${processedData.kpis.alertasCriticos.total > 1 ? 's' : ''} com alertas`
                                : 'Nenhum alerta crítico'}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico Composed */}
                      {processedData.graficoComposed && processedData.graficoComposed.length > 0 && (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <CardTitle>Volume de Ocorrências vs Tempo Médio de Resposta</CardTitle>
                              <InfoTooltip text="Gráfico combinado que cruza demanda (barras laranjas = ocorrências por mês) com eficiência (linha verde = tempo médio de resposta). Permite identificar correlações entre volume de trabalho e agilidade operacional." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ComposedChart
                              data={processedData.graficoComposed.map((item: any) => ({
                                ...item,
                                ocorrencias: item.ocorrencias,
                                tempoMedio: item.tempoMedioSegundos,
                              }))}
                              barDataKey="ocorrencias"
                              lineDataKey="tempoMedio"
                              xKey="mes"
                              barName="Ocorrências"
                              lineName="Tempo Médio"
                              barColor="#fc4d00"
                              lineColor="#22c55e"
                              lineYAxisFormatter={(value: any) => {
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Painéis de Gestão por Exceção */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Ranking de Bases */}
                        <Card>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <CardTitle>Ranking de Atividade (Top 5 Bases)</CardTitle>
                              <InfoTooltip text="Mostra as 5 bases com maior volume de ocorrências acumuladas no período filtrado. Útil para identificar bases mais ativas e distribuição de demanda operacional." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            {processedData.rankingBases && processedData.rankingBases.length > 0 ? (
                              <BarChart
                                data={processedData.rankingBases}
                                dataKey="qtd"
                                xKey="base"
                                name="Ocorrências"
                                color="#fc4d00"
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Pontos de Atenção */}
                        <Card>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <CardTitle>Pontos de Atenção</CardTitle>
                              <InfoTooltip text="Lista automática de alertas críticos gerados pelo sistema: reprovações no TAF, estoques críticos (abaixo do exigido) e viaturas não conformes. Máximo de 10 alertas exibidos." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            {processedData.pontosAtencao && processedData.pontosAtencao.length > 0 ? (
                              <div className="space-y-3">
                                {processedData.pontosAtencao.map((alerta: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                                  >
                                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <div className="font-semibold text-red-900">{alerta.base}</div>
                                      <div className="text-sm text-red-700">{alerta.mensagem}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                                  <div className="h-6 w-6 rounded-full bg-green-500" />
                                </div>
                                Nenhum ponto de atenção identificado
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        </main>
      </div>
    </div>
  )
}
