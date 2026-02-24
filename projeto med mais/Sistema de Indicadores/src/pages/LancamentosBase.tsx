import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HistoryTable } from '@/components/HistoryTable'
import { AppShell } from '@/components/AppShell'
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
import { formatBaseName, formatEquipeName } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { getIndicadorDisplayName } from '@/lib/indicadores-display'

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

  const getBaseName = (id: string) => formatBaseName(bases?.find((b) => b.id === id)?.nome ?? '') || 'N/A'
  const getEquipeName = (id: string) => formatEquipeName(equipes?.find((e) => e.id === id)?.nome || 'N/A')

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
      <AppShell title="Lançamentos" subtitle={authUser?.profile?.nome}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">Perfil sem base configurada.</p>
          <Button onClick={() => navigate('/dashboard-gerente')} className="mt-4">
            Voltar ao Dashboard
          </Button>
        </div>
      </AppShell>
    )
  }

  const baseEquipe = baseId ? getBaseName(baseId) : undefined

  return (
    <AppShell
      title="Lançamentos - Minha Base"
      subtitle={authUser?.profile?.nome}
      baseEquipe={baseEquipe}
      extraActions={
        <Button
          onClick={() => navigate('/dashboard-gerente')}
          variant="outline"
          size="sm"
          className="bg-white/10 text-white hover:bg-white/20 border-white/40"
        >
          Voltar ao Dashboard
        </Button>
      }
    >
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

      {/* Modal: Visualização (Read-only) */}
      {showViewModal && selectedIndicador && selectedLancamento && FormComponent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto dark:bg-black/60">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto relative shadow-glow-primary dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="relative border-b dark:border-slate-700">
              <div className="pr-10">
                <CardTitle className="text-lg font-bold">
                  Visualizar - {getIndicadorDisplayName(selectedIndicador)}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Dados do lançamento em modo somente leitura.
                </p>
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
