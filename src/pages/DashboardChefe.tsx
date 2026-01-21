import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLancamentos } from '@/hooks/useLancamentos'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Database } from '@/lib/database.types'
import {
  OcorrenciaAeronauticaForm,
  OcorrenciaNaoAeronauticaForm,
  AtividadesAcessoriasForm,
  TAFForm,
  ProvaTeoricaForm,
  HorasTreinamentoForm,
  InspecaoViaturasForm,
  TempoTPEPRForm,
  TempoRespostaForm,
  ControleEPIForm,
  ControleEstoqueForm,
  ControleTrocasForm,
  VerificacaoTPForm,
  HigienizacaoTPForm,
} from '@/components/forms'

type Indicador = Database['public']['Tables']['indicadores_config']['Row']
type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']

// Mapeamento de schema_type para componentes de formulário
const FORM_COMPONENTS: Record<string, React.ComponentType<any>> = {
  ocorrencia_aero: OcorrenciaAeronauticaForm,
  ocorrencia_nao_aero: OcorrenciaNaoAeronauticaForm,
  atividades_acessorias: AtividadesAcessoriasForm,
  taf: TAFForm,
  prova_teorica: ProvaTeoricaForm,
  treinamento: HorasTreinamentoForm,
  inspecao_viaturas: InspecaoViaturasForm,
  tempo_tp_epr: TempoTPEPRForm,
  tempo_resposta: TempoRespostaForm,
  controle_epi: ControleEPIForm,
  estoque: ControleEstoqueForm,
  controle_trocas: ControleTrocasForm,
  verificacao_tp: VerificacaoTPForm,
  higienizacao_tp: HigienizacaoTPForm,
}

export function DashboardChefe() {
  const { authUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedIndicador, setSelectedIndicador] = useState<Indicador | null>(null)
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)

  const baseId = authUser?.profile?.base_id
  const equipeId = authUser?.profile?.equipe_id

  // Buscar indicadores
  const { data: indicadores } = useQuery<Indicador[]>({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indicadores_config').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

  // Buscar lançamentos da base (chefe vê toda a base)
  const { data: lancamentos, isLoading } = useLancamentos({
    baseId: baseId || undefined,
    enabled: !!baseId,
  })

  // Buscar bases e equipes para exibir nomes
  const { data: bases } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*')
      if (error) throw error
      return data || []
    },
  })

  const { data: equipes } = useQuery<Equipe[]>({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipes').select('*')
      if (error) throw error
      return data || []
    },
  })

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleNovoLancamento = (indicador: Indicador) => {
    setSelectedIndicador(indicador)
    setSelectedLancamento(null)
    setShowFormModal(true)
  }

  const handleVerLancamento = (lancamento: Lancamento) => {
    setSelectedLancamento(lancamento)
    // Buscar o indicador correspondente
    const indicador = indicadores?.find((ind) => ind.id === lancamento.indicador_id)
    if (indicador) {
      setSelectedIndicador(indicador)
      setShowViewModal(true)
    }
  }

  const handleEditarLancamento = (lancamento: Lancamento) => {
    // Só pode editar se for da sua equipe
    if (lancamento.equipe_id !== equipeId) {
      alert('Você só pode editar lançamentos da sua equipe!')
      return
    }
    setSelectedLancamento(lancamento)
    const indicador = indicadores?.find((ind) => ind.id === lancamento.indicador_id)
    if (indicador) {
      setSelectedIndicador(indicador)
      setShowFormModal(true)
    }
  }

  const handleExcluirLancamento = async (lancamento: Lancamento) => {
    // Só pode excluir se for da sua equipe
    if (lancamento.equipe_id !== equipeId) {
      alert('Você só pode excluir lançamentos da sua equipe!')
      return
    }

    if (!confirm('Tem certeza que deseja excluir este lançamento?')) {
      return
    }

    const { error } = await supabase.from('lancamentos').delete().eq('id', lancamento.id)

    if (error) {
      alert(`Erro ao excluir: ${error.message}`)
    } else {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      alert('Lançamento excluído com sucesso!')
    }
  }

  const handleFormSuccess = () => {
    setShowFormModal(false)
    setSelectedIndicador(null)
    setSelectedLancamento(null)
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
  }

  const getBaseName = (id: string) => bases?.find((b) => b.id === id)?.nome || 'N/A'
  const getEquipeName = (id: string) => equipes?.find((e) => e.id === id)?.nome || 'N/A'
  const getIndicadorName = (id: string) => indicadores?.find((i) => i.id === id)?.nome || 'N/A'

  const canEdit = (lancamento: Lancamento) => lancamento.equipe_id === equipeId

  const FormComponent = selectedIndicador
    ? FORM_COMPONENTS[selectedIndicador.schema_type]
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Dashboard - Chefe de Equipe</h1>
              <p className="text-sm text-gray-600">
                {authUser?.profile?.nome} - {authUser?.profile?.role}
              </p>
              {baseId && equipeId && (
                <p className="text-xs text-gray-500 mt-1">
                  Base: {getBaseName(baseId)} | Equipe: {getEquipeName(equipeId)}
                </p>
              )}
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Seção: Novo Lançamento */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Novo Lançamento</CardTitle>
            <CardDescription>
              Selecione um indicador para cadastrar um novo lançamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicadores?.map((indicador) => (
                <Button
                  key={indicador.id}
                  onClick={() => handleNovoLancamento(indicador)}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start"
                >
                  <span className="font-semibold">{indicador.nome}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seção: Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Lançamentos</CardTitle>
            <CardDescription>
              Visualize todos os lançamentos da sua base agrupados por indicador. Você pode editar/excluir apenas os
              lançamentos da sua equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Carregando...</p>
              </div>
            ) : !lancamentos || lancamentos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum lançamento encontrado.
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  // Agrupar lançamentos por indicador
                  const lancamentosPorIndicador = lancamentos.reduce((acc, lancamento) => {
                    const indicadorId = lancamento.indicador_id
                    if (!acc[indicadorId]) {
                      acc[indicadorId] = []
                    }
                    acc[indicadorId].push(lancamento)
                    return acc
                  }, {} as Record<string, Lancamento[]>)

                  // Ordenar por nome do indicador
                  const indicadoresOrdenados = indicadores?.filter((ind) => 
                    lancamentosPorIndicador[ind.id]
                  ).sort((a, b) => a.nome.localeCompare(b.nome)) || []

                  return indicadoresOrdenados.map((indicador) => {
                    const lancamentosDoIndicador = lancamentosPorIndicador[indicador.id] || []
                    // Ordenar lançamentos por data (mais recente primeiro)
                    const lancamentosOrdenados = [...lancamentosDoIndicador].sort((a, b) => {
                      const dateA = new Date(a.data_referencia).getTime()
                      const dateB = new Date(b.data_referencia).getTime()
                      return dateB - dateA
                    })

                    return (
                      <div key={indicador.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-3 border-b">
                          <h3 className="font-semibold text-lg">{indicador.nome}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {lancamentosOrdenados.length} lançamento{lancamentosOrdenados.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left p-3 font-semibold text-sm">Data</th>
                                <th className="text-left p-3 font-semibold text-sm">Base</th>
                                <th className="text-left p-3 font-semibold text-sm">Equipe</th>
                                <th className="text-left p-3 font-semibold text-sm">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lancamentosOrdenados.map((lancamento) => (
                                <tr key={lancamento.id} className="border-b hover:bg-gray-50">
                                  <td className="p-3">
                                    {format(new Date(lancamento.data_referencia), 'dd/MM/yyyy', {
                                      locale: ptBR,
                                    })}
                                  </td>
                                  <td className="p-3">{getBaseName(lancamento.base_id)}</td>
                                  <td className="p-3">{getEquipeName(lancamento.equipe_id)}</td>
                                  <td className="p-3">
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleVerLancamento(lancamento)}
                                      >
                                        Ver
                                      </Button>
                                      {canEdit(lancamento) && (
                                        <>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditarLancamento(lancamento)}
                                          >
                                            Editar
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleExcluirLancamento(lancamento)}
                                            className="text-red-600 hover:text-red-700"
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
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal: Formulário de Cadastro/Edição */}
      {showFormModal && selectedIndicador && FormComponent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <CardHeader className="relative">
              <CardTitle>
                {selectedLancamento ? 'Editar' : 'Novo'} - {selectedIndicador.nome}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowFormModal(false)
                  setSelectedIndicador(null)
                  setSelectedLancamento(null)
                }}
                className="absolute top-4 right-4 z-10"
                title="Fechar"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent>
              <FormComponent
                indicadorId={selectedIndicador.id}
                onSuccess={handleFormSuccess}
                initialData={
                  selectedLancamento
                    ? {
                        data_referencia: selectedLancamento.data_referencia,
                        base_id: selectedLancamento.base_id,
                        equipe_id: selectedLancamento.equipe_id,
                        ...(selectedLancamento.conteudo as Record<string, unknown>),
                      }
                    : undefined
                }
                readOnly={false}
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowFormModal(false)
                    setSelectedIndicador(null)
                    setSelectedLancamento(null)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Visualização (Read-only) */}
      {showViewModal && selectedIndicador && selectedLancamento && FormComponent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
            <CardHeader className="relative">
              <CardTitle>Visualizar - {selectedIndicador.nome}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowViewModal(false)
                  setSelectedIndicador(null)
                  setSelectedLancamento(null)
                }}
                className="absolute top-4 right-4 z-10"
                title="Fechar"
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent>
              <FormComponent
                indicadorId={selectedIndicador.id}
                onSuccess={() => {
                  setShowViewModal(false)
                  setSelectedIndicador(null)
                  setSelectedLancamento(null)
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
                    setSelectedIndicador(null)
                    setSelectedLancamento(null)
                  }}
                  variant="outline"
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
