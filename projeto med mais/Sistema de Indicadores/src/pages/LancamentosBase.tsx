import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HistoryTable } from '@/components/HistoryTable'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
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
import type { Database } from '@/lib/database.types'

type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Indicador = Database['public']['Tables']['indicadores_config']['Row']
type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']

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

/**
 * Página de Lançamentos para Gerente de SCI - Visualização (conferência) dos lançamentos da sua base.
 * Apenas leitura - sem edição ou exclusão.
 */
export function LancamentosBase() {
  const { authUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const baseId = authUser?.profile?.base_id ?? undefined
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null)
  const [selectedIndicador, setSelectedIndicador] = useState<Indicador | null>(null)

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
    try {
      queryClient.clear()
      localStorage.removeItem('supabase.auth.token')
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 200))
      window.location.href = '/login'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      window.location.href = '/login'
    }
  }

  const getBaseName = (id: string) => bases?.find((b) => b.id === id)?.nome || 'N/A'
  const getEquipeName = (id: string) => equipes?.find((e) => e.id === id)?.nome || 'N/A'

  const { data: indicadores } = useQuery<Indicador[]>({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indicadores_config').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

  const handleView = (lancamento: Lancamento) => {
    const indicador = indicadores?.find((ind) => ind.id === lancamento.indicador_id)
    if (indicador) {
      setSelectedLancamento(lancamento)
      setSelectedIndicador(indicador)
      setShowViewModal(true)
    }
  }

  const FormComponent = selectedIndicador ? FORM_COMPONENTS[selectedIndicador.schema_type] : null

  if (!baseId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Perfil sem base configurada.</p>
          <Button onClick={() => navigate('/dashboard-gerente-sci')} className="mt-4">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-all duration-300 ease-in-out page-transition">
      <header className="bg-[#fc4d00] shadow-sm border-b border-border shadow-orange-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center min-h-[80px] gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 min-w-0">
              <img
                src="/logo-medmais.png"
                alt="MedMais Logo"
                className="h-8 sm:h-10 w-auto brightness-0 invert shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">Lançamentos - Minha Base</h1>
                <p className="text-xs sm:text-sm text-white/90 truncate">
                  {authUser?.profile?.nome} • {getBaseName(baseId)}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-auto sm:ml-4">
              <Button
                onClick={() => navigate('/dashboard-gerente-sci')}
                variant="outline"
                size="sm"
                className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-white transition-all duration-200 shadow-orange-sm"
              >
                Voltar ao Dashboard
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 transition-all duration-200">
                    <Settings className="h-6 w-6" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/settings')}
                      className="w-full justify-start gap-2 text-gray-700 hover:text-[#fc4d00] hover:bg-orange-50"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleLogout}
                      className="w-full justify-start gap-2 text-gray-700 hover:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
        <p className="text-sm text-muted-foreground mb-6">
          Visualização dos lançamentos da sua base para conferência. Apenas consulta (sem edição ou exclusão).
        </p>
        <HistoryTable
          baseId={baseId}
          equipeId={undefined}
          onView={handleView}
          onEdit={() => {}}
          onDelete={async () => {}}
          canEdit={() => false}
          getBaseName={getBaseName}
          getEquipeName={getEquipeName}
        />
      </main>

      {/* Modal: Visualização (Read-only) */}
      {showViewModal && selectedIndicador && selectedLancamento && FormComponent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
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
