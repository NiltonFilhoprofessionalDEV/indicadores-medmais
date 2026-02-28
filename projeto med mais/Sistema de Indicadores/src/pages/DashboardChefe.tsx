import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { HistoryTable } from '@/components/HistoryTable'
import { AppShell } from '@/components/AppShell'
import { FormDrawer } from '@/components/ui/form-drawer'
import {
  ClipboardList,
  AlertTriangle,
  Car,
  Dumbbell,
  FileQuestion,
  GraduationCap,
  Gauge,
  Clock,
  Crosshair,
  Shield,
  Package,
  RefreshCw,
  CheckCircle2,
  Droplets,
  TrendingUp,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  PlusCircle,
} from 'lucide-react'
import { formatBaseName, formatEquipeName } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { getIndicadorDisplayName, sortIndicadoresPtrBaProximos } from '@/lib/indicadores-display'
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

type Indicador = Database['public']['Tables']['indicadores_config']['Row']
type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']

const INDICADOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ocorrencia_aero: AlertTriangle,
  ocorrencia_nao_aero: AlertTriangle,
  atividades_acessorias: ClipboardList,
  taf: Dumbbell,
  prova_teorica: FileQuestion,
  treinamento: GraduationCap,
  ptr_ba_extras: PlusCircle,
  inspecao_viaturas: Car,
  tempo_tp_epr: Gauge,
  tempo_resposta: Clock,
  exercicio_posicionamento: Crosshair,
  controle_epi: Shield,
  estoque: Package,
  controle_trocas: RefreshCw,
  verificacao_tp: CheckCircle2,
  higienizacao_tp: Droplets,
}

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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getMonthRange(offset = 0) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + offset
  const d = new Date(year, month, 1)
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  return { start, end }
}

export function DashboardChefe() {
  const { authUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const podeAcessarPainelGerente = !!authUser?.profile?.acesso_gerente_sci
  const [selectedIndicador, setSelectedIndicador] = useState<Indicador | null>(null)
  const [selectedLancamento, setSelectedLancamento] = useState<Lancamento | null>(null)
  const [drawerMode, setDrawerMode] = useState<'form' | 'view' | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const baseId = authUser?.profile?.base_id
  const equipeId = authUser?.profile?.equipe_id
  const nome = authUser?.profile?.nome || ''
  const primeiroNome = nome.split(' ')[0] || 'Usuário'

  const { data: indicadores } = useQuery<Indicador[]>({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indicadores_config').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

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

  const mesAtual = useMemo(() => getMonthRange(0), [])
  const mesAnterior = useMemo(() => getMonthRange(-1), [])

  const { data: countMesAtual } = useQuery({
    queryKey: ['stats-mes-atual', baseId, mesAtual.start, mesAtual.end],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lancamentos')
        .select('id', { count: 'exact' })
        .eq('base_id', baseId!)
        .gte('data_referencia', mesAtual.start)
        .lte('data_referencia', mesAtual.end)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!baseId,
  })

  const { data: countMesAnterior } = useQuery({
    queryKey: ['stats-mes-anterior', baseId, mesAnterior.start, mesAnterior.end],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('lancamentos')
        .select('id', { count: 'exact' })
        .eq('base_id', baseId!)
        .gte('data_referencia', mesAnterior.start)
        .lte('data_referencia', mesAnterior.end)
      if (error) throw error
      return count ?? 0
    },
    enabled: !!baseId,
  })

  const handleNovoLancamento = (indicador: Indicador) => {
    setSelectedIndicador(indicador)
    setSelectedLancamento(null)
    setDrawerMode('form')
  }

  const handleVerLancamento = (lancamento: Lancamento) => {
    setSelectedLancamento(lancamento)
    const indicador = indicadores?.find((ind) => ind.id === lancamento.indicador_id)
    if (indicador) {
      setSelectedIndicador(indicador)
      setDrawerMode('view')
    }
  }

  const handleEditarLancamento = (lancamento: Lancamento) => {
    if (lancamento.equipe_id !== equipeId) {
      alert('Você só pode editar lançamentos da sua equipe!')
      return
    }
    setSelectedLancamento(lancamento)
    const indicador = indicadores?.find((ind) => ind.id === lancamento.indicador_id)
    if (indicador) {
      setSelectedIndicador(indicador)
      setDrawerMode('form')
    }
  }

  const handleExcluirLancamento = async (lancamento: Lancamento) => {
    if (lancamento.equipe_id !== equipeId) {
      alert('Você só pode excluir lançamentos da sua equipe!')
      return
    }
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) return
    const { error } = await supabase.from('lancamentos').delete().eq('id', lancamento.id)
    if (error) {
      alert(`Erro ao excluir: ${error.message}`)
    } else {
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
      queryClient.invalidateQueries({ queryKey: ['stats-mes-atual'] })
      queryClient.invalidateQueries({ queryKey: ['stats-mes-anterior'] })
      alert('Lançamento excluído com sucesso!')
    }
  }

  const handleFormSuccess = () => {
    setDrawerMode(null)
    setSelectedIndicador(null)
    setSelectedLancamento(null)
    queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
    queryClient.invalidateQueries({ queryKey: ['stats-mes-atual'] })
    queryClient.invalidateQueries({ queryKey: ['stats-mes-anterior'] })
  }

  const closeDrawer = () => {
    setDrawerMode(null)
    setSelectedIndicador(null)
    setSelectedLancamento(null)
  }

  const getBaseName = (id: string) => formatBaseName(bases?.find((b) => b.id === id)?.nome ?? '') || 'N/A'
  const getEquipeName = (id: string) => formatEquipeName(equipes?.find((e) => e.id === id)?.nome || 'N/A')
  const canEdit = (lancamento: Lancamento) => lancamento.equipe_id === equipeId

  const FormComponent = selectedIndicador ? FORM_COMPONENTS[selectedIndicador.schema_type] : null

  const dashboardTitle =
    authUser?.profile?.role === 'auxiliar'
      ? 'Líder de Resgate'
      : 'Chefe de Equipe'

  const drawerTitle = selectedIndicador ? getIndicadorDisplayName(selectedIndicador) : ''
  const drawerSubtitle = drawerMode === 'view' ? 'Visualização' : selectedLancamento ? 'Editar lançamento' : 'Novo lançamento'

  const mesAtualNome = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  const mesAnteriorDate = new Date()
  mesAnteriorDate.setMonth(mesAnteriorDate.getMonth() - 1)
  const mesAnteriorNome = mesAnteriorDate.toLocaleDateString('pt-BR', { month: 'long' })

  return (
    <AppShell
      title={dashboardTitle}
      subtitle={authUser?.profile?.nome}
      baseEquipe={baseId && equipeId ? `${getBaseName(baseId)} | ${getEquipeName(equipeId)}` : undefined}
      extraActions={
        podeAcessarPainelGerente ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard-gerente')}
            className="text-white/90 hover:bg-white/15 border border-white/20 text-sm"
          >
            Painel Gerente SCI
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-8">
        {/* ═══════════ SAUDAÇÃO ═══════════ */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {primeiroNome}!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione um indicador abaixo para iniciar um novo lançamento.
          </p>
        </div>

        {/* ═══════════ CARDS DE MÉTRICAS ═══════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground capitalize">Lançamentos em {mesAtualNome}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{countMesAtual ?? '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground capitalize">Lançamentos em {mesAnteriorNome}</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">{countMesAnterior ?? '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ GRID DE INDICADORES ═══════════ */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Novo Lançamento
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sortIndicadoresPtrBaProximos(indicadores ?? []).map((indicador) => {
              const IconComponent = INDICADOR_ICONS[indicador.schema_type] || ClipboardList
              return (
                <button
                  key={indicador.id}
                  type="button"
                  onClick={() => handleNovoLancamento(indicador)}
                  className="group flex flex-col items-center text-center bg-card border border-border rounded-xl p-4 shadow-soft
                    hover:shadow-soft-md hover:border-primary/25 transition-all duration-200"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary
                    group-hover:bg-primary group-hover:text-white transition-all duration-200 mb-3">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
                    {getIndicadorDisplayName(indicador)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ═══════════ HISTÓRICO (COLAPSÁVEL) ═══════════ */}
        <div>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Histórico de Lançamentos
            </h3>
            <div className="flex-1 h-px bg-border" />
            <span className="flex items-center gap-1 text-sm text-primary font-medium group-hover:underline">
              {showHistory ? 'Ocultar' : 'Exibir'}
              {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>

          {showHistory && (
            <div className="mt-4 page-transition">
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
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ DRAWER: FORMULÁRIO / EDIÇÃO ═══════════ */}
      <FormDrawer
        open={drawerMode === 'form' && !!selectedIndicador && !!FormComponent}
        onClose={closeDrawer}
        title={drawerTitle}
        subtitle={drawerSubtitle}
      >
        {FormComponent && (
          <FormComponent
            indicadorId={selectedIndicador?.id}
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
        )}
      </FormDrawer>

      {/* ═══════════ DRAWER: VISUALIZAÇÃO ═══════════ */}
      <FormDrawer
        open={drawerMode === 'view' && !!selectedIndicador && !!selectedLancamento && !!FormComponent}
        onClose={closeDrawer}
        title={drawerTitle}
        subtitle="Visualização"
      >
        {FormComponent && selectedLancamento && (
          <FormComponent
            indicadorId={selectedIndicador?.id}
            onSuccess={closeDrawer}
            initialData={{
              data_referencia: selectedLancamento.data_referencia,
              base_id: selectedLancamento.base_id,
              equipe_id: selectedLancamento.equipe_id,
              ...(selectedLancamento.conteudo as Record<string, unknown>),
            }}
            readOnly={true}
          />
        )}
      </FormDrawer>
    </AppShell>
  )
}
