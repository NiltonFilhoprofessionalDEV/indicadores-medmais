import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import { useLancamentos } from '@/hooks/useLancamentos'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getDefaultDateRange, validateDateRange, enforceMaxDateRange } from '@/lib/date-utils'
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
import { GroupedBarChart } from '@/components/charts/GroupedBarChart'
import { AnalyticsFilterBar } from '@/components/AnalyticsFilterBar'
import { TrendingUp, TrendingDown, AlertTriangle, Clock, Users, Info, ArrowUpDown } from 'lucide-react'
import { parseTimeMMSS } from '@/lib/analytics-utils'

type IndicadorConfig = Database['public']['Tables']['indicadores_config']['Row']

// Componente de Tabela de Resultados Prova Teórica com ordenação e paginação
function ProvaTeoricaResultsTable({ avaliados, equipes }: { avaliados: Array<{ nome: string; nota: number; status: string; data_referencia: string; equipe_id: string }>; equipes: Array<{ id: string; nome: string }> }) {
  const [sortBy, setSortBy] = useState<'nota' | 'none'>('nota')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  // Resetar página quando os dados mudarem
  useEffect(() => {
    setPage(1)
  }, [avaliados.length])

  const handleSort = () => {
    if (sortBy === 'nota') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy('nota')
      setSortOrder('desc')
    }
  }

  const sortedAvaliados = [...avaliados].sort((a, b) => {
    if (sortBy === 'nota') {
      return sortOrder === 'asc' ? a.nota - b.nota : b.nota - a.nota
    }
    return 0
  })

  const paginatedAvaliados = sortedAvaliados.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(sortedAvaliados.length / pageSize)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-semibold">Data</th>
              <th className="text-left p-2 font-semibold">Nome</th>
              <th className="text-left p-2 font-semibold">Equipe</th>
              <th className="text-left p-2 font-semibold">
                <button
                  onClick={handleSort}
                  className="flex items-center gap-1 hover:text-[#fc4d00] transition-colors"
                >
                  Nota
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="text-left p-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAvaliados.map((item, index) => {
              const equipeNome = equipes.find((e) => e.id === item.equipe_id)?.nome || item.equipe_id
              return (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2">{new Date(item.data_referencia).toLocaleDateString('pt-BR')}</td>
                  <td className="p-2">{item.nome || 'Não informado'}</td>
                  <td className="p-2">{equipeNome}</td>
                  <td className="p-2 font-semibold">{item.nota.toFixed(2)}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status?.toLowerCase() === 'aprovado' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status || '-'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {sortedAvaliados.length > pageSize && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Página {page} de {totalPages} ({sortedAvaliados.length} resultados)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

// Componente de Tabela de Resultados TAF com ordenação e paginação
function TafResultsTable({ avaliados }: { avaliados: Array<{ nome: string; idade: number; tempo: string; status: string; nota?: number; data_referencia: string }> }) {
  const [sortBy, setSortBy] = useState<'tempo' | 'none'>('tempo')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState<number>(1)
  const pageSize = 10

  // Resetar página quando os dados mudarem
  useEffect(() => {
    setPage(1)
  }, [avaliados.length])

  const handleSort = () => {
    if (sortBy === 'tempo') {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy('tempo')
      setSortOrder('asc')
    }
  }

  const sortedAvaliados = [...avaliados].sort((a, b) => {
    if (sortBy === 'tempo') {
      const tempoA = a.tempo ? parseTimeMMSS(a.tempo) : Infinity
      const tempoB = b.tempo ? parseTimeMMSS(b.tempo) : Infinity
      return sortOrder === 'asc' ? tempoA - tempoB : tempoB - tempoA
    }
    return 0
  })

  const paginatedAvaliados = sortedAvaliados.slice((page - 1) * pageSize, page * pageSize)
  const totalPages = Math.ceil(sortedAvaliados.length / pageSize)

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-2 font-semibold">Data</th>
              <th className="text-left p-2 font-semibold">Nome</th>
              <th className="text-left p-2 font-semibold">Idade</th>
              <th className="text-left p-2 font-semibold">
                <button
                  onClick={handleSort}
                  className="flex items-center gap-1 hover:text-[#fc4d00] transition-colors"
                >
                  Tempo
                  <ArrowUpDown className="h-4 w-4" />
                </button>
              </th>
              <th className="text-left p-2 font-semibold">Nota/Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAvaliados.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-2">{new Date(item.data_referencia).toLocaleDateString('pt-BR')}</td>
                <td className="p-2">{item.nome || 'Não informado'}</td>
                <td className="p-2">{item.idade || '-'}</td>
                <td className="p-2">{item.tempo || '-'}</td>
                <td className="p-2">
                  {item.nota !== undefined && item.nota !== null ? (
                    <span className="font-semibold">Nota {item.nota}</span>
                  ) : (
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.status?.toLowerCase() === 'aprovado' 
                        ? 'bg-green-100 text-green-800' 
                        : item.status?.toLowerCase() === 'reprovado'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status || '-'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sortedAvaliados.length > pageSize && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Página {page} de {totalPages} ({sortedAvaliados.length} resultados)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

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
  
  // Inicializar com mês atual como padrão (travas de segurança)
  const defaultDateRange = getDefaultDateRange()
  const [dataInicio, setDataInicio] = useState<string>(defaultDateRange.dataInicio)
  const [dataFim, setDataFim] = useState<string>(defaultDateRange.dataFim)
  const [dateRangeError, setDateRangeError] = useState<string>('')
  const [colaboradorNome, setColaboradorNome] = useState<string>('')
  const [tipoOcorrencia, setTipoOcorrencia] = useState<string>('')
  const [tipoOcorrenciaAero, setTipoOcorrenciaAero] = useState<string>('')
  const [pontosAtencaoPage, setPontosAtencaoPage] = useState<number>(1)
  const pontosAtencaoPageSize = 5
  
  const [ocorrenciaAeroPage, setOcorrenciaAeroPage] = useState<number>(1)
  const ocorrenciaAeroPageSize = 10
  
  const [atividadesAcessoriasPage, setAtividadesAcessoriasPage] = useState<number>(1)
  const atividadesAcessoriasPageSize = 10
  
  const isChefe = authUser?.profile?.role === 'chefe'
  const isGerente = authUser?.profile?.role === 'geral'

  // Resetar página de pontos de atenção quando os dados mudarem
  useEffect(() => {
    if (view === 'visao_geral') {
      setPontosAtencaoPage(1)
    }
  }, [baseId, equipeId, dataInicio, dataFim, view])

  // Resetar página de ocorrência aeronáutica quando os dados mudarem
  useEffect(() => {
    if (view === 'ocorrencia_aero') {
      setOcorrenciaAeroPage(1)
    }
  }, [baseId, equipeId, dataInicio, dataFim, view, tipoOcorrenciaAero])

  // Resetar página de atividades acessórias quando os dados mudarem
  useEffect(() => {
    if (view === 'atividades_acessorias') {
      setAtividadesAcessoriasPage(1)
    }
  }, [baseId, equipeId, dataInicio, dataFim, view])

  // Validar intervalo de datas e aplicar travas de segurança
  useEffect(() => {
    // Se não houver datas selecionadas, usar mês atual como padrão
    if (!dataInicio || !dataFim) {
      const defaultRange = getDefaultDateRange()
      setDataInicio(defaultRange.dataInicio)
      setDataFim(defaultRange.dataFim)
      return
    }

    // Validar intervalo máximo de 12 meses
    const validation = validateDateRange(dataInicio, dataFim)
    if (!validation.isValid) {
      setDateRangeError(validation.errorMessage || '')
      // Ajustar automaticamente para não exceder 12 meses
      const adjustedRange = enforceMaxDateRange(dataInicio, dataFim)
      setDataInicio(adjustedRange.dataInicio)
      setDataFim(adjustedRange.dataFim)
    } else {
      setDateRangeError('')
    }
  }, [dataInicio, dataFim])

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

  // Buscar equipes para exibir nomes nos gráficos por equipe (em vez de IDs)
  const { data: equipes } = useQuery<Array<{ id: string; nome: string }>>({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipes').select('id, nome').order('nome')
      if (error) throw error
      return (data || []) as Array<{ id: string; nome: string }>
    },
  })

  const getEquipeName = (id: string) => equipes?.find((e) => e.id === id)?.nome || id

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
  const viewsComTodosLancamentos: ViewType[] = ['visao_geral', 'atividades_acessorias', 'taf']
  const { data: lancamentosResult, isLoading: isLoadingLancamentos } = useLancamentos({
    baseId: userBaseId || undefined,
    equipeId: equipeId || undefined,
    indicadorId: viewsComTodosLancamentos.includes(view) ? undefined : getIndicadorId(),
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
    enabled: !viewsComTodosLancamentos.includes(view),
    pageSize: 20,
  })

  // Query que busca TODOS os lançamentos (sem paginação) para visão geral, atividades acessórias e TAF
  // TAF precisa de todos os dados para calcular corretamente a taxa de aprovação e os gráficos
  const { data: todosLancamentosResult, isLoading: isLoadingTodos } = useQuery({
    queryKey: ['lancamentos-todos', userBaseId, equipeId, dataInicio, dataFim, view, getIndicadorId()],
    enabled: viewsComTodosLancamentos.includes(view),
    queryFn: async () => {
      // Otimização: buscar apenas colunas necessárias para Analytics
      // Para Analytics, precisamos: id, data_referencia, base_id, equipe_id, indicador_id, conteudo
      let q = supabase
        .from('lancamentos')
        .select('id, data_referencia, base_id, equipe_id, indicador_id, conteudo, user_id')
        .order('data_referencia', { ascending: false })

      if (isChefe && authUser?.profile?.base_id) {
        q = q.eq('base_id', authUser.profile.base_id)
      } else if (baseId) {
        q = q.eq('base_id', baseId)
      }
      if (equipeId) q = q.eq('equipe_id', equipeId)
      if (dataInicio) q = q.gte('data_referencia', dataInicio)
      if (dataFim) q = q.lte('data_referencia', dataFim)

      if (view === 'atividades_acessorias' || view === 'taf') {
        const indicadorId = getIndicadorId()
        if (indicadorId) q = q.eq('indicador_id', indicadorId)
      }

      const { data, error } = await q
      if (error) throw error
      return (data || []) as Database['public']['Tables']['lancamentos']['Row'][]
    },
  })

  const lancamentos = viewsComTodosLancamentos.includes(view)
    ? (todosLancamentosResult || [])
    : (lancamentosResult?.data || [])
  const isLoading = viewsComTodosLancamentos.includes(view) ? isLoadingTodos : isLoadingLancamentos

  // Aplicar filtro por colaborador se necessário
  let filteredLancamentos =
    colaboradorNome && (view === 'taf' || view === 'prova_teorica' || view === 'treinamento' || view === 'tempo_tp_epr')
      ? filterByColaborador(lancamentos, colaboradorNome)
      : lancamentos

  // Aplicar filtro por tipo de ocorrência (Ocorrência Não Aeronáutica)
  if (view === 'ocorrencia_nao_aero' && tipoOcorrencia) {
    filteredLancamentos = filteredLancamentos.filter((l) => {
      const c = l.conteudo as { tipo_ocorrencia?: string }
      return (c.tipo_ocorrencia || '') === tipoOcorrencia
    })
  }

  // Aplicar filtro por tipo de ocorrência (Ocorrência Aeronáutica: Posicionamento / Intervenção)
  if (view === 'ocorrencia_aero' && tipoOcorrenciaAero) {
    filteredLancamentos = filteredLancamentos.filter((l) => {
      const c = l.conteudo as { acao?: string }
      return (c.acao || '') === tipoOcorrenciaAero
    })
  }

  // Processar dados conforme view
  let processedData: any = null
  if (filteredLancamentos.length > 0 || view === 'visao_geral') {
    switch (view) {
      case 'visao_geral':
        if (bases && indicadoresConfig) {
          // Sempre processar visão geral, mesmo sem lançamentos, para exibir zeros
          processedData = generateExecutiveSummary(lancamentos || [], bases, indicadoresConfig)
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
        processedData = processTAF(filteredLancamentos, colaboradorNome || undefined)
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
            }),
            bases
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
  const showTipoOcorrenciaFilter = view === 'ocorrencia_nao_aero'
  const showTipoOcorrenciaAeroFilter = view === 'ocorrencia_aero'

  return (
    <div className="min-h-screen bg-background flex flex-col transition-all duration-300 ease-in-out page-transition">
      {/* Header */}
      <header className="bg-[#fc4d00] shadow-sm border-b border-border shadow-orange-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center min-h-[80px]">
            <div className="flex items-center gap-4 flex-shrink-0">
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
            <div className="flex gap-2 flex-shrink-0 ml-4">
              {isChefe && (
              <Button 
                onClick={() => navigate('/dashboard-chefe')} 
                variant="outline" 
                className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-white transition-all duration-200 shadow-lg"
                style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.15)' }}
              >
                Voltar ao Dashboard
              </Button>
              )}
              {isGerente && (
                <Button 
                  onClick={() => navigate('/dashboard-gerente')} 
                  variant="outline" 
                  className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-white transition-all duration-200 shadow-lg"
                  style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.15)' }}
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
        <aside className="w-64 bg-[#fc4d00] border-r border-[#fc4d00] p-4 overflow-y-auto shadow-orange-sm">
          <h2 className="text-lg font-semibold mb-4 text-white">Analytics</h2>
        <nav className="space-y-1">
          <button
            onClick={() => setView('visao_geral')}
            className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
              view === 'visao_geral' 
                ? 'bg-white text-[#fc4d00] font-semibold' 
                : 'text-white hover:bg-white/20'
            }`}
          >
            Visão Geral
          </button>

          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs font-semibold text-white uppercase px-3 mb-2">Ocorrências</p>
            <button
              onClick={() => setView('ocorrencia_aero')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'ocorrencia_aero' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Ocorr. Aeronáutica
            </button>
            <button
              onClick={() => setView('ocorrencia_nao_aero')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'ocorrencia_nao_aero' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Ocorr. Não Aeronáutica
            </button>
            <button
              onClick={() => setView('atividades_acessorias')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'atividades_acessorias' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Atividades Acessórias
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs font-semibold text-white uppercase px-3 mb-2">Pessoal & Treino</p>
            <button
              onClick={() => setView('taf')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'taf' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Teste de Aptidão (TAF)
            </button>
            <button
              onClick={() => setView('prova_teorica')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'prova_teorica' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Prova Teórica
            </button>
            <button
              onClick={() => setView('treinamento')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'treinamento' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Horas de Treinamento
            </button>
            <button
              onClick={() => setView('tempo_tp_epr')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'tempo_tp_epr' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Exercício TP/EPR
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs font-semibold text-white uppercase px-3 mb-2">Frota</p>
            <button
              onClick={() => setView('tempo_resposta')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'tempo_resposta' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Tempo Resposta
            </button>
            <button
              onClick={() => setView('inspecao_viaturas')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'inspecao_viaturas' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Inspeção Viaturas
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs font-semibold text-white uppercase px-3 mb-2">Logística</p>
            <button
              onClick={() => setView('logistica')}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                view === 'logistica' 
                  ? 'bg-white text-[#fc4d00] font-semibold' 
                  : 'text-white hover:bg-white/20'
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
                tipoOcorrenciaAero={tipoOcorrenciaAero}
                onTipoOcorrenciaAeroChange={setTipoOcorrenciaAero}
                showColaboradorFilter={showColaboradorFilter}
                showTipoOcorrenciaFilter={showTipoOcorrenciaFilter}
                showTipoOcorrenciaAeroFilter={showTipoOcorrenciaAeroFilter}
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
                      {/* KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Ocorrências</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalOcorrencias ?? 0}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Médio Resposta (1º CCI)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMedioResposta1CCI ?? '00:00'}</div>
                            <div className="text-sm text-gray-500 mt-1">Média do tempo de chegada</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Pior Tempo Resposta (1º CCI)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.piorTempoResposta1CCI ?? '00:00'}</div>
                            <div className="text-sm text-gray-500 mt-1">Valor máximo no período</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">% de Intervenções</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.percentualIntervencoes?.toFixed(1) ?? '0.0'}%</div>
                            <div className="text-sm text-gray-500 mt-1">Porcentagem de intervenções</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráficos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gráfico 1: Perfil da Operação (Donut Chart) */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Perfil da Operação</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Distribuição: Posicionamento vs Intervenção</p>
                          </CardHeader>
                          <CardContent>
                            {processedData.graficoPerfilOperacao && processedData.graficoPerfilOperacao.length > 0 ? (
                              <DonutChart
                                data={processedData.graficoPerfilOperacao}
                                colors={['#3b82f6', '#fc4d00']}
                                showCenterLabel={false}
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Gráfico 2: Agilidade da Equipe (Line Chart) */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Agilidade da Equipe</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Tempo Médio de Resposta por Mês</p>
                          </CardHeader>
                          <CardContent>
                            {processedData.graficoAgilidadeEquipe && processedData.graficoAgilidadeEquipe.length > 0 ? (
                              <LineChart
                                data={processedData.graficoAgilidadeEquipe}
                                dataKey="tempoMedioSegundos"
                                xKey="mes"
                                name="Tempo Médio"
                                color="#fc4d00"
                                yAxisFormatter={(value: any) => {
                                  const mins = Math.floor(value / 60)
                                  const secs = Math.floor(value % 60)
                                  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                                }}
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico 3: Mapa de Calor de Locais (Bar Chart Horizontal) */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Mapa de Calor de Locais</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">Top 5 locais com mais ocorrências</p>
                        </CardHeader>
                        <CardContent className="p-4">
                          {processedData.graficoTop5Locais && processedData.graficoTop5Locais.length > 0 ? (
                            <BarChart
                              data={processedData.graficoTop5Locais}
                              dataKey="qtd"
                              xKey="local"
                              name="Ocorrências"
                              color="#fc4d00"
                              layout="horizontal"
                              yAxisWidth={200}
                            />
                          ) : (
                            <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Tabela Detalhada */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Ocorrências Detalhadas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {processedData.listaDetalhada && processedData.listaDetalhada.length > 0 ? (
                            <>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left p-2 font-semibold">Data</th>
                                      <th className="text-left p-2 font-semibold">Base</th>
                                      <th className="text-left p-2 font-semibold">Ação</th>
                                      <th className="text-left p-2 font-semibold">Local</th>
                                      <th className="text-left p-2 font-semibold">Chegada 1º CCI</th>
                                      <th className="text-left p-2 font-semibold">Chegada Últ. CCI</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {processedData.listaDetalhada
                                      .slice((ocorrenciaAeroPage - 1) * ocorrenciaAeroPageSize, ocorrenciaAeroPage * ocorrenciaAeroPageSize)
                                      .map((item: any, index: number) => {
                                        const baseNome = bases?.find((b) => b.id === item.base_id)?.nome || item.base_id
                                        return (
                                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="p-2">{new Date(item.data_referencia).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-2">{baseNome}</td>
                                            <td className="p-2">{item.conteudo?.acao || 'Não informado'}</td>
                                            <td className="p-2">{item.conteudo?.local || 'Não informado'}</td>
                                            <td className="p-2">{item.conteudo?.tempo_chegada_1_cci || 'Não informado'}</td>
                                            <td className="p-2">{item.conteudo?.tempo_chegada_ult_cci || 'Não informado'}</td>
                                          </tr>
                                        )
                                      })}
                                  </tbody>
                                </table>
                              </div>
                              {processedData.listaDetalhada.length > ocorrenciaAeroPageSize && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                  <div className="text-sm text-gray-600">
                                    Página {ocorrenciaAeroPage} de {Math.ceil(processedData.listaDetalhada.length / ocorrenciaAeroPageSize)} ({processedData.listaDetalhada.length} ocorrências)
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setOcorrenciaAeroPage((prev) => Math.max(1, prev - 1))}
                                      disabled={ocorrenciaAeroPage === 1}
                                      className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
                                    >
                                      Anterior
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setOcorrenciaAeroPage((prev) => Math.min(Math.ceil(processedData.listaDetalhada.length / ocorrenciaAeroPageSize), prev + 1))}
                                      disabled={ocorrenciaAeroPage >= Math.ceil(processedData.listaDetalhada.length / ocorrenciaAeroPageSize)}
                                      className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
                                    >
                                      Próximo
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'ocorrencia_nao_aero' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Ocorrências</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalOcorrencias ?? 0}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Duração Média</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.duracaoMedia ?? '00:00'}</div>
                            <div className="text-sm text-gray-500 mt-1">Soma das durações / Qtd Ocorrências</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Médio de Resposta</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMedioResposta ?? '00:00'}</div>
                            <div className="text-sm text-gray-500 mt-1">Hora Chegada - Hora Acionamento</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráficos Principais */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Evolução Mensal</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {processedData.graficoEvolucaoMensal && processedData.graficoEvolucaoMensal.length > 0 ? (
                              <LineChart
                                data={processedData.graficoEvolucaoMensal}
                                dataKey="quantidade"
                                xKey="mes"
                                name="Ocorrências"
                                color="#fc4d00"
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Top 5 Tipos</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4">
                            {processedData.graficoTop5Tipos && processedData.graficoTop5Tipos.length > 0 ? (
                              <BarChart
                                data={processedData.graficoTop5Tipos}
                                dataKey="qtd"
                                xKey="tipo"
                                name="Quantidade"
                                color="#fc4d00"
                                layout="horizontal"
                                yAxisWidth={200}
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico de Eficiência e Locais Frequentes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle>Eficiência por Tipo</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Tempo Médio de Resposta por Tipo de Ocorrência</p>
                          </CardHeader>
                          <CardContent className="p-4">
                            {processedData.graficoEficienciaPorTipo && processedData.graficoEficienciaPorTipo.length > 0 ? (
                              <BarChart
                                data={processedData.graficoEficienciaPorTipo.map((item: any) => ({
                                  ...item,
                                  tempoMedioSegundos: Math.round(item.tempoMedioMinutos * 60), // Converter minutos para segundos
                                }))}
                                dataKey="tempoMedioSegundos"
                                xKey="tipo"
                                name="Tempo Médio"
                                color="#fc4d00"
                                layout="horizontal"
                                yAxisWidth={200}
                                yAxisFormatter={(value: any) => {
                                  const mins = Math.floor(value / 60)
                                  const secs = Math.floor(value % 60)
                                  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                                }}
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle>Locais Frequentes</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Top 5 locais com mais ocorrências</p>
                          </CardHeader>
                          <CardContent>
                            {processedData.top5Locais && processedData.top5Locais.length > 0 ? (
                              <div className="space-y-3">
                                {processedData.top5Locais.map((item: any, index: number) => (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                                  >
                                    <span className="font-medium text-gray-900">{item.local}</span>
                                    <span className="text-lg font-bold text-[#fc4d00]">{item.qtd}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {view === 'atividades_acessorias' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total de Atividades</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalAtividades ?? 0}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total de Horas Empenhadas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalHorasEmpenhadas ?? '00:00'}</div>
                            <div className="text-sm text-gray-500 mt-1">Soma de todo o tempo gasto</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Equipamentos Inspecionados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalEquipamentos ?? 0}</div>
                            <div className="text-sm text-gray-500 mt-1">Soma de equipamentos</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Média de Bombeiros</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.mediaBombeiros ?? 0}</div>
                            <div className="text-sm text-gray-500 mt-1">Tamanho médio da equipe</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráficos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gráfico 1: Onde gastamos nosso tempo? (Donut Chart) */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Onde gastamos nosso tempo?</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Tempo gasto por tipo de atividade (Esforço)</p>
                          </CardHeader>
                          <CardContent>
                            {processedData.graficoTempoPorTipo && processedData.graficoTempoPorTipo.length > 0 ? (
                              <DonutChart
                                data={processedData.graficoTempoPorTipo}
                                colors={['#3b82f6', '#fc4d00', '#22c55e', '#f59e0b', '#8b5cf6']}
                                showCenterLabel={false}
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Gráfico 2: Ranking de Frequência (Bar Chart Horizontal) */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Ranking de Frequência</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Atividades mais frequentes</p>
                          </CardHeader>
                          <CardContent className="p-4">
                            {processedData.graficoRankingFrequencia && processedData.graficoRankingFrequencia.length > 0 ? (
                              <BarChart
                                data={processedData.graficoRankingFrequencia}
                                dataKey="qtd"
                                xKey="tipo"
                                name="Quantidade"
                                color="#fc4d00"
                                layout="horizontal"
                                yAxisWidth={200}
                              />
                            ) : (
                              <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico 3: Evolução de Produtividade (Composed Chart) */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Evolução de Produtividade</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">Quantidade de atividades e horas gastas por mês</p>
                        </CardHeader>
                        <CardContent>
                          {processedData.graficoEvolucaoProdutividade && processedData.graficoEvolucaoProdutividade.length > 0 ? (
                            <ComposedChart
                              data={processedData.graficoEvolucaoProdutividade}
                              barDataKey="quantidade"
                              lineDataKey="horasMinutos"
                              xKey="mes"
                              barName="Quantidade de Atividades"
                              lineName="Horas Gastas"
                              barColor="#fc4d00"
                              lineColor="#3b82f6"
                              lineYAxisFormatter={(value: any) => {
                                const hours = Math.floor(value / 60)
                                const minutes = value % 60
                                return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
                              }}
                            />
                          ) : (
                            <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Tabela de Registros */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Registros Detalhados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {processedData.listaCompleta && processedData.listaCompleta.length > 0 ? (
                            <>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="text-left p-2 font-semibold">Data</th>
                                      <th className="text-left p-2 font-semibold">Tipo</th>
                                      <th className="text-left p-2 font-semibold">Qtd Bombeiros</th>
                                      <th className="text-left p-2 font-semibold">Tempo Gasto</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {processedData.listaCompleta
                                      .slice((atividadesAcessoriasPage - 1) * atividadesAcessoriasPageSize, atividadesAcessoriasPage * atividadesAcessoriasPageSize)
                                      .map((item: any, index: number) => (
                                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                          <td className="p-2">{new Date(item.data_referencia).toLocaleDateString('pt-BR')}</td>
                                          <td className="p-2">{item.tipo_atividade || 'Não informado'}</td>
                                          <td className="p-2">{item.qtd_bombeiros ?? '-'}</td>
                                          <td className="p-2">{item.tempo_gasto || '-'}</td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                              {processedData.listaCompleta.length > atividadesAcessoriasPageSize && (
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                  <div className="text-sm text-gray-600">
                                    Página {atividadesAcessoriasPage} de {Math.ceil(processedData.listaCompleta.length / atividadesAcessoriasPageSize)} ({processedData.listaCompleta.length} registros)
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAtividadesAcessoriasPage((prev) => Math.max(1, prev - 1))}
                                      disabled={atividadesAcessoriasPage === 1}
                                      className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
                                    >
                                      Anterior
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setAtividadesAcessoriasPage((prev) => Math.min(Math.ceil(processedData.listaCompleta.length / atividadesAcessoriasPageSize), prev + 1))}
                                      disabled={atividadesAcessoriasPage >= Math.ceil(processedData.listaCompleta.length / atividadesAcessoriasPageSize)}
                                      className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
                                    >
                                      Próximo
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'taf' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Avaliados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalAvaliados ?? 0}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Taxa de Aprovação</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-3xl font-bold ${Number(processedData.kpis?.taxaAprovacao ?? 0) > 90 ? 'text-green-600' : 'text-gray-700'}`}>
                              {processedData.kpis?.taxaAprovacao ?? '0.0'}%
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {processedData.kpis?.aprovados ?? 0} Aprovados / {processedData.kpis?.reprovados ?? 0} Reprovados
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Melhor Tempo (Recorde)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.melhorTempo ?? '-'}</div>
                            <div className="text-sm text-gray-500 mt-1">Menor tempo registrado</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Médio Geral</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMedioGeral ?? '-'}</div>
                            <div className="text-sm text-gray-500 mt-1">Média de todos os tempos</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráficos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gráfico 1: Status de Aprovação (Donut Chart) */}
                        {processedData.graficoAprovadoReprovado && processedData.graficoAprovadoReprovado.length > 0 ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Status de Aprovação</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <DonutChart
                                data={processedData.graficoAprovadoReprovado}
                                colors={['#22c55e', '#ef4444']}
                                showCenterLabel={true}
                                centerLabel={`${processedData.kpis?.taxaAprovacao ?? '0.0'}%`}
                              />
                            </CardContent>
                          </Card>
                        ) : null}

                        {/* Gráfico 2: Evolução do Condicionamento (Line Chart) - CORRIGIDO */}
                        {processedData.graficoEvolucaoCondicionamento && processedData.graficoEvolucaoCondicionamento.length > 0 ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Evolução do Condicionamento</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">Tempo Médio por Mês (Linha descendo = mais rápido/forte)</p>
                            </CardHeader>
                            <CardContent>
                              <LineChart
                                data={processedData.graficoEvolucaoCondicionamento}
                                dataKey="tempoMedioSegundos"
                                xKey="mes"
                                name="Tempo Médio"
                                color="#fc4d00"
                                yAxisFormatter={(value: any) => {
                                  const mins = Math.floor(value / 60)
                                  const secs = Math.floor(value % 60)
                                  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                                }}
                              />
                            </CardContent>
                          </Card>
                        ) : null}
                      </div>

                      {/* Gráfico 3: Performance por Faixa Etária (Bar Chart Horizontal) - Ocupa toda a linha */}
                      {processedData.graficoPerformancePorFaixaEtaria && processedData.graficoPerformancePorFaixaEtaria.length > 0 ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>Performance por Faixa Etária</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Tempo Médio por grupo de idade</p>
                          </CardHeader>
                          <CardContent className="p-4">
                            <BarChart
                              data={processedData.graficoPerformancePorFaixaEtaria}
                              dataKey="tempoMedioSegundos"
                              xKey="faixa"
                              name="Tempo Médio"
                              color="#fc4d00"
                              layout="horizontal"
                              yAxisWidth={150}
                              yAxisFormatter={(value: any) => {
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      ) : null}

                      {/* Gráfico 4: Distribuição de Notas (Bar Chart) */}
                      {processedData.graficoDistribuicaoNotas && processedData.graficoDistribuicaoNotas.length > 0 ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>Distribuição de Notas</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Quantidade de bombeiros por nota</p>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoDistribuicaoNotas}
                              dataKey="quantidade"
                              xKey="nota"
                              name="Quantidade"
                              color="#3b82f6"
                            />
                          </CardContent>
                        </Card>
                      ) : null}

                      {/* Tabela de Resultados com Ordenação */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Resultados Detalhados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {processedData.listaCompleta && processedData.listaCompleta.length > 0 ? (
                            <TafResultsTable avaliados={processedData.listaCompleta} />
                          ) : (
                            <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'prova_teorica' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total Avaliados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalAvaliados ?? 0}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Nota Média Geral</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.notaMediaFormatada ?? '0.00'}</div>
                            <div className="text-sm text-gray-500 mt-1">Média de todas as notas</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Taxa de Aprovação</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-3xl font-bold ${Number(processedData.kpis?.taxaAprovacaoFormatada ?? 0) > 80 ? 'text-green-600' : 'text-gray-700'}`}>
                              {processedData.kpis?.taxaAprovacaoFormatada ?? '0.0'}%
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {processedData.kpis?.aprovados ?? 0} Aprovados / {processedData.kpis?.reprovados ?? 0} Reprovados
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Nota Máxima</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.notaMaximaFormatada ?? '0.00'}</div>
                            <div className="text-sm text-gray-500 mt-1">Maior nota do período</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráficos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gráfico 1: Status (Donut Chart - Corrigido) */}
                        {processedData.graficoStatus && processedData.graficoStatus.length > 0 ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Status de Aprovação</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <DonutChart
                                data={processedData.graficoStatus}
                                colors={['#22c55e', '#ef4444']}
                                showCenterLabel={true}
                                centerLabel={`${processedData.kpis?.taxaAprovacaoFormatada ?? '0.0'}%`}
                              />
                            </CardContent>
                          </Card>
                        ) : null}

                        {/* Gráfico 2: Distribuição de Notas (Histograma - Bar Chart) */}
                        {processedData.graficoDistribuicaoNotas && processedData.graficoDistribuicaoNotas.length > 0 ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Distribuição de Notas</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">Nível de conhecimento da tropa</p>
                            </CardHeader>
                            <CardContent>
                              <BarChart
                                data={processedData.graficoDistribuicaoNotas}
                                dataKey="quantidade"
                                xKey="faixa"
                                name="Quantidade"
                                color="#3b82f6"
                              />
                            </CardContent>
                          </Card>
                        ) : null}
                      </div>

                      {/* Gráficos 3 e 4 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gráfico 3: Ranking de Conhecimento por Equipe (Bar Chart) */}
                        {processedData.graficoRankingPorEquipe && processedData.graficoRankingPorEquipe.length > 0 ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Ranking de Conhecimento por Equipe</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">Nota Média por equipe</p>
                            </CardHeader>
                            <CardContent>
                              <BarChart
                                data={processedData.graficoRankingPorEquipe.map((item: any) => {
                                  const equipeNome = equipes?.find((e) => e.id === item.equipe)?.nome || item.equipe
                                  return {
                                    ...item,
                                    equipe: equipeNome,
                                  }
                                })}
                                dataKey="notaMedia"
                                xKey="equipe"
                                name="Nota Média"
                                color="#fc4d00"
                              />
                            </CardContent>
                          </Card>
                        ) : null}

                        {/* Gráfico 4: Evolução do Conhecimento (Line Chart - CORRIGIDO) */}
                        {processedData.graficoEvolucaoConhecimento && processedData.graficoEvolucaoConhecimento.length > 0 ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Evolução do Conhecimento</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">Nota Média Mensal</p>
                            </CardHeader>
                            <CardContent>
                              <LineChart
                                data={processedData.graficoEvolucaoConhecimento}
                                dataKey="notaMedia"
                                xKey="mes"
                                name="Nota Média"
                                color="#fc4d00"
                              />
                            </CardContent>
                          </Card>
                        ) : null}
                      </div>

                      {/* Tabela Detalhada com Ordenação */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Resultados Detalhados</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {processedData.listaCompleta && processedData.listaCompleta.length > 0 ? (
                            <ProvaTeoricaResultsTable avaliados={processedData.listaCompleta} equipes={equipes || []} />
                          ) : (
                            <div className="text-center py-8 text-gray-500">Nenhum dado disponível</div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {view === 'tempo_resposta' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Menor Tempo (Recorde)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {processedData.kpis?.menorTempo ? (
                              <>
                                <div className="text-3xl font-bold">{processedData.kpis.menorTempo.tempo}</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {processedData.kpis.menorTempo.viatura}
                                </p>
                              </>
                            ) : (
                              <div className="text-3xl font-bold">-</div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Médio Geral</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMedioGeral || '-'}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Maior Tempo (Alerta)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {processedData.kpis?.maiorTempo ? (
                              <>
                                <div className="text-3xl font-bold text-red-600">{processedData.kpis.maiorTempo.tempo}</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {processedData.kpis.maiorTempo.viatura}
                                </p>
                              </>
                            ) : (
                              <div className="text-3xl font-bold">-</div>
                            )}
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total de Exercícios</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalExercicios || 0}</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico 1: Performance por Viatura (Bar Chart) */}
                      {processedData.graficoPerformancePorViatura && processedData.graficoPerformancePorViatura.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Performance por Viatura</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoPerformancePorViatura.map((item: any) => ({
                                viatura: item.viatura,
                                media: item.mediaSegundos,
                              }))}
                              dataKey="media"
                              xKey="viatura"
                              name="Tempo Médio"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Gráfico 2: Curva de Agilidade (Line Chart) com Reference Line */}
                      {processedData.graficoCurvaAgilidade && processedData.graficoCurvaAgilidade.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Curva de Agilidade</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoCurvaAgilidade.map((item: any) => ({
                                mes: item.mes,
                                media: item.mediaSegundos,
                              }))}
                              dataKey="media"
                              xKey="mes"
                              name="Tempo Médio"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                              referenceLine={{
                                value: 180, // 3:00 em segundos
                                label: 'Meta (3:00)',
                                stroke: '#ef4444',
                                strokeDasharray: '5 5',
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Gráfico 3: Consistência (Donut Chart) */}
                      {processedData.graficoConsistencia && processedData.graficoConsistencia.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Consistência</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <DonutChart
                              data={processedData.graficoConsistencia.map((item: any) => ({
                                name: item.name,
                                value: item.value,
                              }))}
                              colors={['#22c55e', '#f59e0b', '#ef4444']}
                              showCenterLabel={true}
                              centerLabel={`${processedData.kpis?.totalExercicios || 0} exercícios`}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Mensagem quando não há dados */}
                      {(!processedData.graficoPerformancePorViatura || processedData.graficoPerformancePorViatura.length === 0) && 
                       (!processedData.graficoCurvaAgilidade || processedData.graficoCurvaAgilidade.length === 0) && 
                       (!processedData.graficoConsistencia || processedData.graficoConsistencia.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado de Tempo Resposta encontrado para os filtros selecionados.
                        </div>
                      )}
                    </div>
                  )}

                  {view === 'treinamento' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs de Conformidade */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Efetivo Total Analisado</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.efetivoTotalAnalisado ?? 0}</div>
                            <div className="text-sm text-gray-500 mt-1">Bombeiros únicos no período</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Efetivo Apto (&gt;=16h)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-green-600">{processedData.kpis?.efetivoApto ?? 0}</div>
                            <div className="text-sm text-gray-500 mt-1">{processedData.kpis?.efetivoAptoPercentual ?? 0.0}% do efetivo</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Efetivo Irregular (&lt;16h)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold text-red-600">{processedData.kpis?.efetivoIrregular ?? 0}</div>
                            <div className="text-sm text-gray-500 mt-1">{processedData.kpis?.efetivoIrregularPercentual ?? 0.0}% do efetivo (Crítico)</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Média de Horas Geral</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.mediaHorasGeralFormatada ?? '0.00'}h</div>
                            <div className="text-sm text-gray-500 mt-1">Média global da corporação</div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráficos */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Gráfico 1: Situação da Tropa (Donut Chart) */}
                        {processedData.graficoSituacaoTropa && processedData.graficoSituacaoTropa.length > 0 ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Situação da Tropa</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">Conformidade com Meta ANAC (16h/mês)</p>
                            </CardHeader>
                            <CardContent>
                              <DonutChart
                                data={processedData.graficoSituacaoTropa}
                                colors={['#22c55e', '#ef4444']}
                                showCenterLabel={true}
                                centerLabel={`${processedData.kpis?.efetivoAptoPercentual ?? 0.0}%`}
                              />
                            </CardContent>
                          </Card>
                        ) : null}

                        {/* Gráfico 2: Distribuição de Carga Horária (Histograma - Bar Chart) */}
                        {processedData.graficoDistribuicaoCargaHoraria && processedData.graficoDistribuicaoCargaHoraria.length > 0 ? (
                          <Card>
                            <CardHeader>
                              <CardTitle>Distribuição de Carga Horária</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">Equivalência Geral - Faixas de horas</p>
                            </CardHeader>
                            <CardContent>
                              <BarChart
                                data={processedData.graficoDistribuicaoCargaHoraria}
                                dataKey="quantidade"
                                xKey="faixa"
                                name="Quantidade de Bombeiros"
                                color="#3b82f6"
                              />
                            </CardContent>
                          </Card>
                        ) : null}
                      </div>

                      {/* Gráfico 3: Desempenho por Equipe (Bar Chart com Reference Line) */}
                      {processedData.graficoDesempenhoPorEquipe && processedData.graficoDesempenhoPorEquipe.length > 0 ? (
                        <Card>
                          <CardHeader>
                            <CardTitle>Desempenho por Equipe</CardTitle>
                            <p className="text-sm text-gray-500 mt-1">Média de Horas por Equipe (Linha vermelha = Meta 16h)</p>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoDesempenhoPorEquipe.map((item: any) => {
                                const equipeNome = equipes?.find((e) => e.id === item.equipe)?.nome || item.equipe
                                return {
                                  ...item,
                                  equipe: equipeNome,
                                }
                              })}
                              dataKey="mediaHoras"
                              xKey="equipe"
                              name="Média de Horas"
                              color="#fc4d00"
                              referenceLine={{
                                value: 16,
                                label: 'Meta ANAC (16h)',
                                stroke: '#ef4444',
                                strokeDasharray: '5 5',
                              }}
                            />
                          </CardContent>
                        </Card>
                      ) : null}
                    </div>
                  )}

                  {view === 'tempo_tp_epr' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total de Avaliações</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalAvaliacoes || 0}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Taxa de Prontidão (%)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-3xl font-bold ${(processedData.kpis?.taxaProntidao || 0) >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                              {processedData.kpis?.taxaProntidao ? `${processedData.kpis.taxaProntidao.toFixed(1)}%` : '0%'}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Meta: ≤59 segundos
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Tempo Médio Geral</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.tempoMedioGeral || '-'}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Recorde (Menor Tempo)</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {processedData.kpis?.recorde ? (
                              <>
                                <div className="text-3xl font-bold">{processedData.kpis.recorde.tempo}</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {processedData.kpis.recorde.nome} ({getEquipeName(processedData.kpis.recorde.equipe_id)})
                                </p>
                              </>
                            ) : (
                              <div className="text-3xl font-bold">-</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico 1: Aderência à Meta (Donut Chart) */}
                      {processedData.graficoAderenciaMeta && processedData.graficoAderenciaMeta.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Aderência à Meta</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <DonutChart
                              data={processedData.graficoAderenciaMeta.map((item: any) => ({
                                name: item.name,
                                value: item.value,
                              }))}
                              colors={['#22c55e', '#ef4444']}
                              showCenterLabel={true}
                              centerLabel={`${processedData.kpis?.taxaProntidao?.toFixed(1) || '0'}%`}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Gráfico 2: Performance por Equipe com Reference Line */}
                      {processedData.graficoPerformancePorEquipe && processedData.graficoPerformancePorEquipe.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Performance por Equipe</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoPerformancePorEquipe.map((item: any) => ({
                                equipe: getEquipeName(item.equipe),
                                media: item.mediaSegundos,
                              }))}
                              dataKey="media"
                              xKey="equipe"
                              name="Tempo Médio"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                              referenceLine={{
                                value: 60,
                                label: 'Meta (59s)',
                                stroke: '#ef4444',
                                strokeDasharray: '5 5',
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Gráfico 3: Distribuição de Tempos (Histograma) */}
                      {processedData.graficoDistribuicaoTempos && processedData.graficoDistribuicaoTempos.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Distribuição de Tempos</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoDistribuicaoTempos}
                              dataKey="qtd"
                              xKey="faixa"
                              name="Quantidade de Bombeiros"
                              color="#fc4d00"
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Gráfico 4: Evolução Mensal (Line Chart) */}
                      {processedData.graficoEvolucaoMediaMensal && processedData.graficoEvolucaoMediaMensal.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Evolução Mensal</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoEvolucaoMediaMensal.map((item: any) => ({
                                mes: item.mes,
                                media: item.mediaSegundos,
                              }))}
                              dataKey="media"
                              xKey="mes"
                              name="Tempo Médio"
                              color="#fc4d00"
                              yAxisFormatter={(value: any) => {
                                const mins = Math.floor(value / 60)
                                const secs = Math.floor(value % 60)
                                return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                              }}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Mensagem quando não há dados */}
                      {(!processedData.graficoAderenciaMeta || processedData.graficoAderenciaMeta.length === 0) && 
                       (!processedData.graficoPerformancePorEquipe || processedData.graficoPerformancePorEquipe.length === 0) && 
                       (!processedData.graficoDistribuicaoTempos || processedData.graficoDistribuicaoTempos.length === 0) && 
                       (!processedData.graficoEvolucaoMediaMensal || processedData.graficoEvolucaoMediaMensal.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado de TP/EPR encontrado para os filtros selecionados.
                        </div>
                      )}
                    </div>
                  )}

                  {view === 'inspecao_viaturas' && processedData && (
                    <div className="space-y-6">
                      {/* KPIs */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total de Itens Inspecionados</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalInspecoes || 0}</div>
                            <p className="text-sm text-muted-foreground mt-1">Volume de trabalho</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Total de Não Conformidades</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{processedData.kpis?.totalNaoConforme || 0}</div>
                            <p className="text-sm text-muted-foreground mt-1">Defeitos encontrados</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Taxa de Conformidade Global</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-3xl font-bold ${(processedData.kpis?.taxaConformidadeGlobal || 0) >= 90 ? 'text-green-600' : 'text-red-600'}`}>
                              {processedData.kpis?.taxaConformidadeGlobal ? `${processedData.kpis.taxaConformidadeGlobal.toFixed(1)}%` : '100%'}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {(processedData.kpis?.taxaConformidadeGlobal || 0) >= 90 ? 'Conforme' : 'Crítico'}
                            </p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Viatura Mais Crítica</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {processedData.kpis?.viaturaMaisCritica ? (
                              <>
                                <div className="text-2xl font-bold text-red-600">{processedData.kpis.viaturaMaisCritica.viatura}</div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {processedData.kpis.viaturaMaisCritica.naoConforme} defeitos
                                </p>
                              </>
                            ) : (
                              <div className="text-3xl font-bold">-</div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico 1: Saúde da Frota (Donut Chart) */}
                      {processedData.graficoSaudeFrota && processedData.graficoSaudeFrota.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Saúde da Frota</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <DonutChart
                              data={processedData.graficoSaudeFrota.map((item: any) => ({
                                name: item.name,
                                value: item.value,
                              }))}
                              colors={['#22c55e', '#ef4444']}
                              showCenterLabel={true}
                              centerLabel={`${processedData.kpis?.taxaConformidadeGlobal?.toFixed(1) || '100'}%`}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Gráfico 2: Ranking de Problemas (Bar Chart) */}
                      {processedData.graficoRankingProblemas && processedData.graficoRankingProblemas.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Ranking de Problemas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <BarChart
                              data={processedData.graficoRankingProblemas}
                              dataKey="naoConforme"
                              xKey="viatura"
                              name="Não Conformidades"
                              color="#fc4d00"
                              showLabel={true}
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Gráfico 3: Tendência de Desgaste (Line Chart) */}
                      {processedData.graficoTendenciaDesgaste && processedData.graficoTendenciaDesgaste.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle>Tendência de Desgaste</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <LineChart
                              data={processedData.graficoTendenciaDesgaste.map((item: any) => ({
                                mes: item.mes,
                                naoConforme: item.naoConforme,
                              }))}
                              dataKey="naoConforme"
                              xKey="mes"
                              name="Não Conformidades"
                              color="#fc4d00"
                            />
                          </CardContent>
                        </Card>
                      )}

                      {/* Mensagem quando não há dados */}
                      {(!processedData.graficoSaudeFrota || processedData.graficoSaudeFrota.length === 0) && 
                       (!processedData.graficoRankingProblemas || processedData.graficoRankingProblemas.length === 0) && 
                       (!processedData.graficoTendenciaDesgaste || processedData.graficoTendenciaDesgaste.length === 0) && (
                        <div className="text-center py-8 text-gray-500">
                          Nenhum dado de Inspeção de Viaturas encontrado para os filtros selecionados.
                        </div>
                      )}
                    </div>
                  )}

                  {view === 'logistica' && processedData && (
                    <div className="space-y-6">
                      {/* Área de Destaque: Stock Command Center */}
                      <div className="space-y-6">
                        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border-2 border-orange-200">
                          <h2 className="text-2xl font-bold text-orange-900 mb-4">Stock Command Center</h2>
                          
                          {/* KPIs de Estoque */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Cobertura de Pó Químico</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className={`text-3xl font-bold ${(processedData.estoque.kpis?.coberturaPo || 0) >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                                  {processedData.estoque.kpis?.coberturaPo?.toFixed(1) || '100'}%
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {processedData.estoque.kpis?.coberturaPo >= 95 ? 'Conforme' : 'Crítico'}
                                </p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Cobertura de LGE</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className={`text-3xl font-bold ${(processedData.estoque.kpis?.coberturaLge || 0) >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                                  {processedData.estoque.kpis?.coberturaLge?.toFixed(1) || '100'}%
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {processedData.estoque.kpis?.coberturaLge >= 95 ? 'Conforme' : 'Crítico'}
                                </p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Cobertura de Nitrogênio</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className={`text-3xl font-bold ${(processedData.estoque.kpis?.coberturaNitrogenio || 0) >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                                  {processedData.estoque.kpis?.coberturaNitrogenio?.toFixed(1) || '100'}%
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {processedData.estoque.kpis?.coberturaNitrogenio >= 95 ? 'Conforme' : 'Crítico'}
                                </p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Bases com Déficit</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className={`text-3xl font-bold ${(processedData.estoque.kpis?.basesComDeficit || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {processedData.estoque.kpis?.basesComDeficit || 0}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Bases críticas</p>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Gráfico Principal: Grouped Bar Chart */}
                          {processedData.estoque.graficoGroupedBar && processedData.estoque.graficoGroupedBar.length > 0 && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Estoque Atual vs Meta Exigida</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <GroupedBarChart data={processedData.estoque.graficoGroupedBar} />
                              </CardContent>
                            </Card>
                          )}

                          {/* Widget de Alerta: Falta de Material */}
                          {processedData.estoque.alertasFaltaMaterial && processedData.estoque.alertasFaltaMaterial.length > 0 && (
                            <Card className="border-red-200 bg-red-50">
                              <CardHeader>
                                <CardTitle className="text-red-800">⚠️ Alertas: Falta de Material</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  {processedData.estoque.alertasFaltaMaterial.map((alerta: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center p-2 bg-white rounded border border-red-200">
                                      <span className="font-semibold text-gray-800">{alerta.base}:</span>
                                      <span className="text-red-600 font-bold">
                                        Faltam {alerta.falta} {alerta.material === 'Pó Químico' ? 'kg' : 'un'} de {alerta.material}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>

                      {/* Área Secundária: EPI e Trocas (Rodapé) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {processedData.epi && processedData.epi.graficoEntregaEPI && processedData.epi.graficoEntregaEPI.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Entrega de EPI/Uniformes</CardTitle>
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
                        )}
                        {processedData.trocas && processedData.trocas.graficoEvolucaoMensal && processedData.trocas.graficoEvolucaoMensal.length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-sm">Controle de Trocas</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <BarChart
                                data={processedData.trocas.graficoEvolucaoMensal}
                                dataKey="quantidade"
                                xKey="mes"
                                name="Quantidade"
                                color="#fc4d00"
                              />
                            </CardContent>
                          </Card>
                        )}
                      </div>
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
                            <div className="text-3xl font-bold">{processedData.kpis?.volumeOperacional?.valor ?? 0}</div>
                            <div className="flex items-center gap-2 mt-2">
                              {(processedData.kpis?.volumeOperacional?.crescimento ?? 0) >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              )}
                              <span className={`text-sm ${(processedData.kpis?.volumeOperacional?.crescimento ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {(processedData.kpis?.volumeOperacional?.crescimento ?? 0) >= 0 ? '+' : ''}
                                {(processedData.kpis?.volumeOperacional?.crescimento ?? 0).toFixed(1)}%
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
                              <Clock className={`h-5 w-5 ${(processedData.kpis?.agilidade?.cor ?? 'yellow') === 'green' ? 'text-green-600' : 'text-yellow-600'}`} />
                              <div className="text-3xl font-bold">{processedData.kpis?.agilidade?.tempoMedio ?? '00:00'}</div>
                            </div>
                            <div className="mt-2">
                              <span className={`text-sm px-2 py-1 rounded ${(processedData.kpis?.agilidade?.cor ?? 'yellow') === 'green' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {(processedData.kpis?.agilidade?.tempoMedioMinutos ?? 0) < 3 ? 'Meta atingida' : 'Atenção necessária'}
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
                              <div className="text-3xl font-bold">{processedData.kpis?.forcaTrabalho?.totalHoras ?? '00:00'}</div>
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
                              {(processedData.kpis?.alertasCriticos?.total ?? 0) > 0 ? (
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                              ) : (
                                <div className="h-5 w-5 rounded-full bg-green-500" />
                              )}
                              <div className={`text-3xl font-bold ${(processedData.kpis?.alertasCriticos?.total ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {processedData.kpis?.alertasCriticos?.total ?? 0}
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              {(processedData.kpis?.alertasCriticos?.total ?? 0) > 0 
                                ? `${processedData.kpis.alertasCriticos.total} base${processedData.kpis.alertasCriticos.total > 1 ? 's' : ''} com alertas`
                                : 'Nenhum alerta crítico'}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gráfico Composed */}
                      {processedData?.graficoComposed && Array.isArray(processedData.graficoComposed) && processedData.graficoComposed.length > 0 ? (
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
                                ocorrencias: item.ocorrencias || 0,
                                tempoMedio: item.tempoMedioSegundos || 0,
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
                      ) : (
                        <Card>
                          <CardHeader>
                            <div className="flex items-center gap-2">
                              <CardTitle>Volume de Ocorrências vs Tempo Médio de Resposta</CardTitle>
                              <InfoTooltip text="Gráfico combinado que cruza demanda (barras laranjas = ocorrências por mês) com eficiência (linha verde = tempo médio de resposta). Permite identificar correlações entre volume de trabalho e agilidade operacional." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center py-8 text-gray-500">Nenhum dado disponível para o período selecionado</div>
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
                            {processedData?.rankingBases && Array.isArray(processedData.rankingBases) && processedData.rankingBases.length > 0 ? (
                              <BarChart
                                data={processedData.rankingBases}
                                dataKey="qtd"
                                xKey="base"
                                name="Ocorrências"
                                color="#fc4d00"
                                layout="horizontal"
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
                              <InfoTooltip text="Lista automática de alertas críticos gerados pelo sistema: reprovações no TAF, estoques críticos (abaixo do exigido) e viaturas não conformes." />
                            </div>
                          </CardHeader>
                          <CardContent>
                            {processedData?.pontosAtencao && Array.isArray(processedData.pontosAtencao) && processedData.pontosAtencao.length > 0 ? (
                              <>
                                <div className="space-y-3">
                                  {processedData.pontosAtencao
                                    .slice((pontosAtencaoPage - 1) * pontosAtencaoPageSize, pontosAtencaoPage * pontosAtencaoPageSize)
                                    .map((alerta: any, index: number) => (
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
                                {processedData.pontosAtencao.length > pontosAtencaoPageSize && (
                                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                    <div className="text-sm text-gray-600">
                                      Página {pontosAtencaoPage} de {Math.ceil(processedData.pontosAtencao.length / pontosAtencaoPageSize)} ({processedData.pontosAtencao.length} alertas)
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPontosAtencaoPage((prev) => Math.max(1, prev - 1))}
                                        disabled={pontosAtencaoPage === 1}
                                        className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
                                      >
                                        Anterior
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPontosAtencaoPage((prev) => Math.min(Math.ceil(processedData.pontosAtencao.length / pontosAtencaoPageSize), prev + 1))}
                                        disabled={pontosAtencaoPage >= Math.ceil(processedData.pontosAtencao.length / pontosAtencaoPageSize)}
                                        className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-[#fc4d00]"
                                      >
                                        Próximo
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </>
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
