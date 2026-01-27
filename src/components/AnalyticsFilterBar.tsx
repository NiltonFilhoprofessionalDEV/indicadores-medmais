import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { Database } from '@/lib/database.types'

type Colaborador = Database['public']['Tables']['colaboradores']['Row']
type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']

interface AnalyticsFilterBarProps {
  baseId: string
  onBaseChange: (baseId: string) => void
  equipeId?: string
  onEquipeChange?: (equipeId: string) => void
  dataInicio: string
  onDataInicioChange: (data: string) => void
  dataFim: string
  onDataFimChange: (data: string) => void
  colaboradorId?: string
  onColaboradorChange?: (colaboradorId: string) => void
  tipoOcorrencia?: string
  onTipoOcorrenciaChange?: (tipo: string) => void
  showColaboradorFilter?: boolean
  showTipoOcorrenciaFilter?: boolean
  disableBaseFilter?: boolean
}

export function AnalyticsFilterBar({
  baseId,
  onBaseChange,
  equipeId = '',
  onEquipeChange,
  dataInicio,
  onDataInicioChange,
  dataFim,
  onDataFimChange,
  colaboradorId = '',
  onColaboradorChange,
  tipoOcorrencia = '',
  onTipoOcorrenciaChange,
  showColaboradorFilter = false,
  showTipoOcorrenciaFilter = false,
  disableBaseFilter = false,
}: AnalyticsFilterBarProps) {
  // Buscar bases
  const { data: bases } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*').order('nome')
      if (error) throw error
      return (data || []) as Base[]
    },
  })

  // Buscar equipes
  const { data: equipes } = useQuery<Equipe[]>({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipes').select('*').order('nome')
      if (error) throw error
      return (data || []) as Equipe[]
    },
  })

  // Buscar colaboradores da base selecionada
  const { data: colaboradores } = useQuery<Colaborador[]>({
    queryKey: ['colaboradores', baseId],
    enabled: !!baseId && showColaboradorFilter,
    queryFn: async () => {
      if (!baseId) return []
      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('base_id', baseId)
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return (data || []) as Colaborador[]
    },
  })

  // Calcular número de colunas dinâmicas baseado nos filtros visíveis
  const visibleFilters = 4 + (onEquipeChange ? 1 : 0) + (showColaboradorFilter ? 1 : 0) + (showTipoOcorrenciaFilter ? 1 : 0)
  const gridCols = visibleFilters <= 4 ? 'lg:grid-cols-4' : visibleFilters <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6'

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-4 p-4 bg-muted/50 rounded-lg`}>
      <div className="space-y-2">
        <Label htmlFor="filter-base">Base</Label>
        <Select 
          id="filter-base" 
          value={baseId} 
          onChange={(e) => onBaseChange(e.target.value)}
          disabled={disableBaseFilter}
        >
          <option value="">Todas as bases</option>
          {bases?.map((base) => (
            <option key={base.id} value={base.id}>
              {base.nome}
            </option>
          ))}
        </Select>
      </div>

      {onEquipeChange && (
        <div className="space-y-2">
          <Label htmlFor="filter-equipe">Equipe</Label>
          <Select id="filter-equipe" value={equipeId} onChange={(e) => onEquipeChange(e.target.value)}>
            <option value="">Todas as equipes</option>
            {equipes?.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>
                {equipe.nome}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="filter-data-inicio">Data Início</Label>
        <Input
          id="filter-data-inicio"
          type="date"
          value={dataInicio}
          onChange={(e) => onDataInicioChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-data-fim">Data Fim</Label>
        <Input
          id="filter-data-fim"
          type="date"
          value={dataFim}
          onChange={(e) => onDataFimChange(e.target.value)}
        />
      </div>

      {showColaboradorFilter && onColaboradorChange && (
        <div className="space-y-2">
          <Label htmlFor="filter-colaborador">Colaborador</Label>
          <Select
            id="filter-colaborador"
            value={colaboradorId}
            onChange={(e) => onColaboradorChange(e.target.value)}
            disabled={!baseId}
          >
            <option value="">Todos os colaboradores</option>
            {colaboradores?.map((colaborador) => (
              <option key={colaborador.id} value={colaborador.nome}>
                {colaborador.nome}
              </option>
            ))}
          </Select>
        </div>
      )}

      {showTipoOcorrenciaFilter && onTipoOcorrenciaChange && (
        <div className="space-y-2">
          <Label htmlFor="filter-tipo">Tipo de Ocorrência</Label>
          <Select
            id="filter-tipo"
            value={tipoOcorrencia}
            onChange={(e) => onTipoOcorrenciaChange(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="Incêndio">Incêndio</option>
            <option value="Resgate">Resgate</option>
            <option value="Emergência Médica">Emergência Médica</option>
            <option value="Outros">Outros</option>
          </Select>
        </div>
      )}
    </div>
  )
}
