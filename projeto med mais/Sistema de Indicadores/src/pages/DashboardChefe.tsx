import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HistoryTable } from '@/components/HistoryTable'
import { AppShell } from '@/components/AppShell'
import {
  ClipboardList,
  AlertTriangle,
  Car,
  Dumbbell,
  FileQuestion,
  GraduationCap,
  Gauge,
  Clock,
  Shield,
  Package,
  RefreshCw,
  CheckCircle2,
  Droplets,
} from 'lucide-react'
import { formatBaseName, formatEquipeName } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { getIndicadorDisplayName } from '@/lib/indicadores-display'
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

// Mapeamento de schema_type para ícones Lucide
const INDICADOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ocorrencia_aero: AlertTriangle,
  ocorrencia_nao_aero: AlertTriangle,
  atividades_acessorias: ClipboardList,
  taf: Dumbbell,
  prova_teorica: FileQuestion,
  treinamento: GraduationCap,
  inspecao_viaturas: Car,
  tempo_tp_epr: Gauge,
  tempo_resposta: Clock,
  controle_epi: Shield,
  estoque: Package,
  controle_trocas: RefreshCw,
  verificacao_tp: CheckCircle2,
  higienizacao_tp: Droplets,
}

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
  const podeAcessarPainelGerente = !!authUser?.profile?.acesso_gerente_sci
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

  const getBaseName = (id: string) => formatBaseName(bases?.find((b) => b.id === id)?.nome ?? '') || 'N/A'
  const getEquipeName = (id: string) => formatEquipeName(equipes?.find((e) => e.id === id)?.nome || 'N/A')

  const canEdit = (lancamento: Lancamento) => lancamento.equipe_id === equipeId

  const FormComponent = selectedIndicador
    ? FORM_COMPONENTS[selectedIndicador.schema_type]
    : null

  const baseEquipe =
    baseId && equipeId ? `${getBaseName(baseId)} | ${getEquipeName(equipeId)}` : undefined

  const dashboardTitle =
    authUser?.profile?.role === 'auxiliar'
      ? 'Dashboard - Líder de Resgate'
      : 'Dashboard - Chefe de Equipe'

  return (
    <AppShell
      title={dashboardTitle}
      subtitle={authUser?.profile?.nome}
      baseEquipe={baseEquipe}
      extraActions={
        podeAcessarPainelGerente ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/dashboard-gerente')}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            Painel Gerente de SCI
          </Button>
        ) : undefined
      }
    >
        {/* Seção: Novo Lançamento - Cards Premium */}
        <Card className="mb-8 shadow-soft dark:bg-slate-800 dark:border-slate-700">
          <CardHeader>
            <CardTitle>Novo Lançamento</CardTitle>
            <CardDescription>
              Selecione um indicador para cadastrar um novo lançamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {indicadores?.map((indicador) => {
                const IconComponent = INDICADOR_ICONS[indicador.schema_type] || ClipboardList
                return (
                  <button
                    key={indicador.id}
                    type="button"
                    onClick={() => handleNovoLancamento(indicador)}
                    className="group flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-primary hover:text-white hover:border-primary transition-all shadow-soft hover:shadow-glow-primary text-left dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-primary dark:hover:border-primary"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-white/20 group-hover:text-white transition-colors dark:bg-primary/20">
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <span className="font-semibold">{getIndicadorDisplayName(indicador)}</span>
                  </button>
                )
              })}
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

      {/* Modal: Formulário de Cadastro/Edição */}
      {showFormModal && selectedIndicador && FormComponent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto dark:bg-black/60"
        >
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto relative shadow-glow-primary dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="relative border-b dark:border-slate-700">
              <div className="pr-10">
                <CardTitle className="text-lg font-bold">
                  {selectedLancamento ? 'Editar' : 'Novo'} - {getIndicadorDisplayName(selectedIndicador)}
                </CardTitle>
                <CardDescription className="mt-1">
                  {selectedLancamento
                    ? 'Atualize os dados do lançamento e salve as alterações.'
                    : 'Preencha os campos obrigatórios e salve o novo lançamento.'}
                </CardDescription>
              </div>
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
                        id: selectedLancamento.id,
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto dark:bg-black/60"
        >
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto relative shadow-glow-primary dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="relative border-b dark:border-slate-700">
              <div className="pr-10">
                <CardTitle className="text-lg font-bold">
                  Visualizar - {getIndicadorDisplayName(selectedIndicador)}
                </CardTitle>
                <CardDescription className="mt-1">
                  Dados do lançamento em modo somente leitura.
                </CardDescription>
              </div>
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
    </AppShell>
  )
}
