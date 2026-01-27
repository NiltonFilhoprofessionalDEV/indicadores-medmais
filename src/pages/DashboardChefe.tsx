import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HistoryTable } from '@/components/HistoryTable'
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

  // Removido: useLancamentos agora é usado dentro do HistoryTable

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

  const canEdit = (lancamento: Lancamento) => lancamento.equipe_id === equipeId

  const FormComponent = selectedIndicador
    ? FORM_COMPONENTS[selectedIndicador.schema_type]
    : null

  return (
    <div className="min-h-screen bg-gray-50 transition-all duration-300 ease-in-out page-transition">
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
                <h1 className="text-2xl font-bold text-white">Dashboard - Chefe de Equipe</h1>
                <p className="text-sm text-white/90">
                  {authUser?.profile?.nome} - {authUser?.profile?.role}
                </p>
                {baseId && equipeId && (
                  <p className="text-xs text-white/80 mt-1">
                    Base: {getBaseName(baseId)} | Equipe: {getEquipeName(equipeId)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/dashboard-analytics')} variant="outline" className="bg-white text-[#fc4d00] hover:bg-white/90 border-white transition-all duration-200">
                Painel de Indicadores
              </Button>
              <Button onClick={handleLogout} variant="outline" className="bg-white text-[#fc4d00] hover:bg-white/90 border-white transition-all duration-200">
                Sair
              </Button>
            </div>
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
                  className="h-auto py-4 flex flex-col items-start hover:bg-[#fc4d00] hover:text-white hover:border-[#fc4d00] transition-colors"
                >
                  <span className="font-semibold">{indicador.nome}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seção: Histórico - Novo Componente com Paginação e Filtros */}
        <HistoryTable
          baseId={baseId || undefined}
          equipeId={equipeId || undefined}
          onView={handleVerLancamento}
          onEdit={handleEditarLancamento}
          onDelete={handleExcluirLancamento}
          canEdit={canEdit}
          getBaseName={getBaseName}
          getEquipeName={getEquipeName}
        />
      </main>

      {/* Modal: Formulário de Cadastro/Edição */}
      {showFormModal && selectedIndicador && FormComponent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <Card className="w-full max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto relative">
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
            <CardContent className="max-h-[calc(90vh-120px)] overflow-y-auto p-0">
              <div className="p-6 [&_*]:max-w-none">
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
          <Card className="w-full max-w-[95vw] sm:max-w-6xl max-h-[90vh] overflow-y-auto relative">
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
            <CardContent className="max-h-[calc(90vh-120px)] overflow-y-auto p-0">
              <div className="p-6 [&_*]:max-w-none">
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
