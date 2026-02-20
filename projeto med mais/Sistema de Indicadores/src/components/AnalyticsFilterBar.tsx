import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { formatBaseName, formatEquipeName } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { validateDateRange, enforceMaxDateRange } from '@/lib/date-utils'
import { useState, useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

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
  tipoOcorrenciaAero?: string
  onTipoOcorrenciaAeroChange?: (tipo: string) => void
  showColaboradorFilter?: boolean
  showTipoOcorrenciaFilter?: boolean
  showTipoOcorrenciaAeroFilter?: boolean
  disableBaseFilter?: boolean
  onClearFilters?: () => void
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
  tipoOcorrenciaAero = '',
  onTipoOcorrenciaAeroChange,
  showColaboradorFilter = false,
  showTipoOcorrenciaFilter = false,
  showTipoOcorrenciaAeroFilter = false,
  disableBaseFilter = false,
  onClearFilters,
}: AnalyticsFilterBarProps) {
  const [localDataInicio, setLocalDataInicio] = useState<string>(dataInicio)
  const [localDataFim, setLocalDataFim] = useState<string>(dataFim)
  const [dateError, setDateError] = useState<string>('')

  // Sincronizar com props externas
  useEffect(() => {
    setLocalDataInicio(dataInicio)
    setLocalDataFim(dataFim)
  }, [dataInicio, dataFim])

  // Validar e aplicar travas de segurança ao mudar datas
  const handleDataInicioChange = (value: string) => {
    setLocalDataInicio(value)
    const validation = validateDateRange(value, localDataFim)
    if (!validation.isValid) {
      setDateError(validation.errorMessage || '')
      // Ajustar automaticamente
      const adjusted = enforceMaxDateRange(value, localDataFim)
      setLocalDataInicio(adjusted.dataInicio)
      setLocalDataFim(adjusted.dataFim)
      onDataInicioChange(adjusted.dataInicio)
      onDataFimChange(adjusted.dataFim)
    } else {
      setDateError('')
      onDataInicioChange(value)
    }
  }

  const handleDataFimChange = (value: string) => {
    setLocalDataFim(value)
    const validation = validateDateRange(localDataInicio, value)
    if (!validation.isValid) {
      setDateError(validation.errorMessage || '')
      // Ajustar automaticamente
      const adjusted = enforceMaxDateRange(localDataInicio, value)
      setLocalDataInicio(adjusted.dataInicio)
      setLocalDataFim(adjusted.dataFim)
      onDataInicioChange(adjusted.dataInicio)
      onDataFimChange(adjusted.dataFim)
    } else {
      setDateError('')
      onDataFimChange(value)
    }
  }

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
  const visibleFilters = 4 + (onEquipeChange ? 1 : 0) + (showColaboradorFilter ? 1 : 0) + (showTipoOcorrenciaFilter ? 1 : 0) + (showTipoOcorrenciaAeroFilter ? 1 : 0)
  const gridCols = visibleFilters <= 4 ? 'lg:grid-cols-4' : visibleFilters <= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-6'

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
    <div className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-4`}>
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
              {formatBaseName(base.nome)}
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
                {formatEquipeName(equipe.nome)}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="filter-data-inicio">Data Início</Label>
        <DatePicker
          id="filter-data-inicio"
          value={localDataInicio}
          onChange={handleDataInicioChange}
          placeholder="Selecione a data início"
        />
        {dateError && <p className="text-xs text-red-600 mt-1">{dateError}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="filter-data-fim">Data Fim</Label>
        <DatePicker
          id="filter-data-fim"
          value={localDataFim}
          onChange={handleDataFimChange}
          placeholder="Selecione a data fim"
        />
        <p className="text-xs text-muted-foreground">Máximo: 12 meses</p>
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
            <option value="Incêndios ou Vazamentos de Combustíveis no PAA">Incêndios ou Vazamentos de Combustíveis no PAA</option>
            <option value="Condições de Baixa Visibilidade">Condições de Baixa Visibilidade</option>
            <option value="Atendimento a Aeronave Presidencial">Atendimento a Aeronave Presidencial</option>
            <option value="Incêndio em Instalações Aeroportuárias">Incêndio em Instalações Aeroportuárias</option>
            <option value="Ocorrências com Artigos Perigosos">Ocorrências com Artigos Perigosos</option>
            <option value="Remoção de Animais e Dispersão de Avifauna">Remoção de Animais e Dispersão de Avifauna</option>
            <option value="Incêndios Florestais">Incêndios Florestais</option>
            <option value="Emergências Médicas em Geral">Emergências Médicas em Geral</option>
            <option value="Iluminação de Emergência em Pista">Iluminação de Emergência em Pista</option>
            <option value="Outras">Outras</option>
          </Select>
        </div>
      )}

      {showTipoOcorrenciaAeroFilter && onTipoOcorrenciaAeroChange && (
        <div className="space-y-2">
          <Label htmlFor="filter-tipo-aero">Tipo de Ocorrência</Label>
          <Select
            id="filter-tipo-aero"
            value={tipoOcorrenciaAero}
            onChange={(e) => onTipoOcorrenciaAeroChange(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            <option value="Posicionamento">Posicionamento</option>
            <option value="Intervenção">Intervenção</option>
          </Select>
        </div>
      )}

    </div>
      {onClearFilters && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  )
}
