import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { useLancamentos } from '@/hooks/useLancamentos'

type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']
type IndicadorConfig = Database['public']['Tables']['indicadores_config']['Row']
import {
  processOcorrenciaAeronautica,
  processOcorrenciaNaoAeronautica,
  processTAF,
  processTempoTPEPR,
  processTempoResposta,
  processHorasTreinamento,
} from '@/lib/analytics-utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart } from '@/components/charts/LineChart'
import { BarChart } from '@/components/charts/BarChart'
import { PieChart } from '@/components/charts/PieChart'

const INDICADORES = [
  { id: 'ocorrencia_aero', nome: 'Ocorrência Aeronáutica' },
  { id: 'ocorrencia_nao_aero', nome: 'Ocorrência Não Aeronáutica' },
  { id: 'taf', nome: 'Teste de Aptidão Física (TAF)' },
  { id: 'tempo_tp_epr', nome: 'Tempo TP/EPR' },
  { id: 'tempo_resposta', nome: 'Tempo Resposta' },
  { id: 'treinamento', nome: 'Horas de Treinamento' },
] as const

export function DashboardAnalytics() {
  const [baseId, setBaseId] = useState<string>('')
  const [equipeId, setEquipeId] = useState<string>('')
  const [dataInicio, setDataInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')
  const [indicadorAtivo, setIndicadorAtivo] = useState<string>(INDICADORES[0].id)

  // Buscar bases e equipes
  const { data: bases } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*').order('nome')
      if (error) throw error
      return (data || []) as Base[]
    },
  })

  const { data: equipes } = useQuery<Equipe[]>({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipes').select('*').order('nome')
      if (error) throw error
      return (data || []) as Equipe[]
    },
  })

  // Buscar indicadores config
  const { data: indicadoresConfig } = useQuery<IndicadorConfig[]>({
    queryKey: ['indicadores_config'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indicadores_config').select('*').order('nome')
      if (error) throw error
      return (data || []) as IndicadorConfig[]
    },
  })

  // Buscar indicador ativo
  const indicadorAtivoConfig = indicadoresConfig?.find((i) => i.schema_type === indicadorAtivo)

  // Buscar lançamentos com filtros
  const { data: lancamentos = [], isLoading } = useLancamentos({
    baseId: baseId || undefined,
    equipeId: equipeId || undefined,
    indicadorId: indicadorAtivoConfig?.id,
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    enabled: !!indicadorAtivoConfig,
  })

  // Processar dados conforme indicador
  let processedData: any = null
  if (indicadorAtivoConfig && lancamentos.length > 0) {
    switch (indicadorAtivo) {
      case 'ocorrencia_aero':
        processedData = processOcorrenciaAeronautica(lancamentos)
        break
      case 'ocorrencia_nao_aero':
        processedData = processOcorrenciaNaoAeronautica(lancamentos)
        break
      case 'taf':
        processedData = processTAF(lancamentos)
        break
      case 'tempo_tp_epr':
        processedData = processTempoTPEPR(lancamentos)
        break
      case 'tempo_resposta':
        processedData = processTempoResposta(lancamentos)
        break
      case 'treinamento':
        processedData = processHorasTreinamento(lancamentos)
        break
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dashboard da Diretoria - Analytics</CardTitle>
            <CardDescription>
              Análise de indicadores operacionais com filtros globais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros Globais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="base">Base</Label>
                <Select
                  id="base"
                  value={baseId}
                  onChange={(e) => setBaseId(e.target.value)}
                >
                  <option value="">Todas as bases</option>
                  {bases?.map((base) => (
                    <option key={base.id} value={base.id}>
                      {base.nome}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipe">Equipe</Label>
                <Select
                  id="equipe"
                  value={equipeId}
                  onChange={(e) => setEquipeId(e.target.value)}
                >
                  <option value="">Todas as equipes</option>
                  {equipes?.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>
                      {equipe.nome}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_inicio">Data Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_fim">Data Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>

            {/* Abas por Indicador */}
            <div className="flex flex-wrap gap-2 mb-6 border-b">
              {INDICADORES.map((indicador) => (
                <button
                  key={indicador.id}
                  onClick={() => setIndicadorAtivo(indicador.id)}
                  className={`px-4 py-2 rounded-t-lg transition-colors ${
                    indicadorAtivo === indicador.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {indicador.nome}
                </button>
              ))}
            </div>

            {/* Conteúdo do Indicador Ativo */}
            {isLoading ? (
              <div className="text-center py-8">Carregando dados...</div>
            ) : !processedData ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum dado encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Renderizar conteúdo específico de cada indicador */}
                {indicadorAtivo === 'ocorrencia_aero' && processedData && (
                  <div className="space-y-6">
                    {/* KPIs */}
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

                    {/* Gráfico */}
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

                {indicadorAtivo === 'ocorrencia_nao_aero' && processedData && (
                  <div className="space-y-6">
                    {/* KPIs */}
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

                    {/* Gráficos */}
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

                {indicadorAtivo === 'taf' && processedData && (
                  <div className="space-y-6">
                    {/* KPIs */}
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

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>% Aprovado/Reprovado</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <PieChart data={processedData.graficoAprovadoReprovado} />
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

                {indicadorAtivo === 'tempo_tp_epr' && processedData && (
                  <div className="space-y-6">
                    {/* KPIs */}
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

                    {/* Gráficos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <Card>
                        <CardHeader>
                          <CardTitle>Desempenho por Equipe</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <BarChart
                            data={processedData.graficoDesempenhoPorEquipe}
                            dataKey="media"
                            xKey="equipe"
                            name="Tempo Médio"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {indicadorAtivo === 'tempo_resposta' && processedData && (
                  <div className="space-y-6">
                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {processedData.kpis.menorTempo && (
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
                      )}
                      {processedData.kpis.maiorTempo && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Maior Tempo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{processedData.kpis.maiorTempo.tempo}</div>
                            <div className="text-sm text-gray-600 mt-2">
                              {processedData.kpis.maiorTempo.motorista} - {processedData.kpis.maiorTempo.viatura}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Gráfico */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Evolução Tempo Médio Mensal</CardTitle>
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

                {indicadorAtivo === 'treinamento' && processedData && (
                  <div className="space-y-6">
                    {/* Gráficos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Média Horas Mensal</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <LineChart
                            data={processedData.graficoMediaHorasMensal}
                            dataKey="media"
                            xKey="mes"
                            name="Horas Médias"
                          />
                        </CardContent>
                      </Card>
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
                    </div>
                    <Card>
                      <CardHeader>
                        <CardTitle>Total Absoluto Mensal</CardTitle>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
