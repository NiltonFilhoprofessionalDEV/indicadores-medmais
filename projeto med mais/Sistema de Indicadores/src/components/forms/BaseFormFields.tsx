import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatBaseName, formatEquipeName } from '@/lib/utils'
import type { Database } from '@/lib/database.types'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { CalendarDays, Building2, Users } from 'lucide-react'

type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']

interface BaseFormFieldsProps {
  dataReferencia: string
  onDataChange: (date: string) => void
  baseId?: string
  equipeId?: string
  onBaseChange?: (baseId: string) => void
  onEquipeChange?: (equipeId: string) => void
  readOnly?: boolean
  onBaseIdChange?: (baseId: string) => void
  onEquipeIdChange?: (equipeId: string) => void
}

export function BaseFormFields({
  dataReferencia,
  onDataChange,
  baseId,
  equipeId,
  onBaseChange,
  onEquipeChange,
  onBaseIdChange,
  onEquipeIdChange,
  readOnly = false,
}: BaseFormFieldsProps) {
  const { authUser } = useAuth()

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

  const finalBaseId = baseId || authUser?.profile?.base_id || ''
  const finalEquipeId = equipeId || authUser?.profile?.equipe_id || ''

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/40 border border-border">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" /> Base
        </label>
        {readOnly ? (
          <Input
            value={formatBaseName(bases?.find((b) => b.id === finalBaseId)?.nome ?? '')}
            readOnly
            className="bg-background"
          />
        ) : (
          <Select
            value={finalBaseId}
            onChange={(e) => { onBaseChange?.(e.target.value); onBaseIdChange?.(e.target.value) }}
            disabled={!!authUser?.profile?.base_id}
          >
            <option value="">Selecione</option>
            {bases?.map((base) => (
              <option key={base.id} value={base.id}>{formatBaseName(base.nome)}</option>
            ))}
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Equipe
        </label>
        {readOnly ? (
          <Input
            value={equipes?.find((e) => e.id === finalEquipeId)?.nome || ''}
            readOnly
            className="bg-background"
          />
        ) : (
          <Select
            value={finalEquipeId}
            onChange={(e) => { onEquipeChange?.(e.target.value); onEquipeIdChange?.(e.target.value) }}
          >
            <option value="">Selecione</option>
            {equipes?.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>{formatEquipeName(equipe.nome)}</option>
            ))}
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> Data de Referência
        </label>
        <DatePicker
          value={dataReferencia}
          onChange={onDataChange}
          disabled={readOnly}
          placeholder="Selecione"
        />
      </div>
    </div>
  )
}
