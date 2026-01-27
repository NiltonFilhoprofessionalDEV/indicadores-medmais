import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { useLancamentos } from '@/hooks/useLancamentos'
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
} from '@/lib/analytics-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { DonutChart } from '@/components/charts/DonutChart'
import { AnalyticsFilterBar } from '@/components/AnalyticsFilterBar'

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

export function DashboardAnalytics() {
  const [view, setView] = useState<ViewType>('visao_geral')
  const [baseId, setBaseId] = useState<string>('')
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')
  const [colaboradorNome, setColaboradorNome] = useState<string>('')
  const [tipoOcorrencia, setTipoOcorrencia] = useState<string>('')

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

  // Determinar qual indicador buscar baseado na view
  const getIndicadorId = (): string | undefined => {
    if (view === 'visao_geral' || view === 'logistica') return undefined
    const indicador = indicadoresConfig?.find((i) => i.schema_type === view)
    return indicador?.id
  }

  // Buscar lançamentos
  const { data: lancamentosResult, isLoading } = useLancamentos({
    baseId: baseId || undefined,
    indicadorId: getIndicadorId(),
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    enabled: true,
  })

  const lancamentos = lancamentosResult?.data || []

  // Aplicar filtro por colaborador se necessário
  const filteredLancamentos =
    colaboradorNome && (view === 'taf' || view === 'prova_teorica' || view === 'treinamento' || view === 'tempo_tp_epr')
      ? filterByColaborador(lancamentos, colaboradorNome)
      : lancamentos

  // Processar dados conforme view
  let processedData: any = null
  if (filteredLancamentos.length > 0) {
    switch (view) {
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Analytics</h2>
        <nav className="space-y-1">
          <button
            onClick={() => setView('visao_geral')}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              view === 'visao_geral' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
            }`}
          >
            Visão Geral
          </button>

          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Ocorrências</p>
            <button
              onClick={() => setView('ocorrencia_aero')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'ocorrencia_aero' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Ocorr. Aeronáutica
            </button>
            <button
              onClick={() => setView('ocorrencia_nao_aero')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'ocorrencia_nao_aero' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Ocorr. Não Aeronáutica
            </button>
            <button
              onClick={() => setView('atividades_acessorias')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'atividades_acessorias' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Atividades Acessórias
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Pessoal & Treino</p>
            <button
              onClick={() => setView('taf')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'taf' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Teste de Aptidão (TAF)
            </button>
            <button
              onClick={() => setView('prova_teorica')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'prova_teorica' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Prova Teórica
            </button>
            <button
              onClick={() => setView('treinamento')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'treinamento' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Horas de Treinamento
            </button>
            <button
              onClick={() => setView('tempo_tp_epr')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'tempo_tp_epr' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Exercício TP/EPR
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Frota</p>
            <button
              onClick={() => setView('tempo_resposta')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'tempo_resposta' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Tempo Resposta
            </button>
            <button
              onClick={() => setView('inspecao_viaturas')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'inspecao_viaturas' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
              }`}
            >
              Inspeção Viaturas
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase px-3 mb-2">Logística</p>
            <button
              onClick={() => setView('logistica')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'logistica' ? 'bg-primary text-primary-foreground' : 'hover:bg-gray-100'
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
              <CardTitle>Dashboard da Diretoria - Analytics</CardTitle>
              <CardDescription>Análise detalhada de indicadores operacionais</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Barra de Filtros */}
              <AnalyticsFilterBar
                baseId={baseId}
                onBaseChange={setBaseId}
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
              />

              {/* Conteúdo Dinâmico */}
              {isLoading ? (
                <div className="text-center py-8">Carregando dados...</div>
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
                            <div className="text-3xl font-bold">{processedData.kpis.menorTempo}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Médio</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.tempoMedio}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Máximo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis.tempoMaximo}</div>
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
                            <CardTitle>Evolução Média Mensal</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoEvolucaoMediaMensal}
                              dataKey="media"
                              xKey="mes"
                              name="Tempo Médio"
                            />
                          </CardContent>
                        </Card>
                      </div>
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
                      <Card>
                        <CardHeader>
                          <CardTitle>Curva de Agilidade (Tempo Médio Mensal)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LineChart
                            data={processedData.graficoEvolucaoMediaMensal}
                            dataKey="media"
                            xKey="mes"
                            name="Tempo Médio"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'treinamento' && processedData && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Total Horas por Equipe</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <BarChart
                            data={processedData.graficoTotalHorasPorEquipe}
                            dataKey="totalHoras"
                            xKey="equipe"
                            name="Total Horas"
                          />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>Evolução Mensal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LineChart
                            data={processedData.graficoTotalAbsolutoMensal}
                            dataKey="totalHoras"
                            xKey="mes"
                            name="Total Horas"
                          />
                        </CardContent>
                      </Card>
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
                          />
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'visao_geral' && (
                    <div className="text-center py-8 text-gray-500">
                      Selecione uma visão específica no menu lateral para visualizar os dados.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
