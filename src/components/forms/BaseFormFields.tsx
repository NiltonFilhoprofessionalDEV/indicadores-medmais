import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

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

  // Buscar bases
  const { data: bases } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*').order('nome')
      if (error) throw error
      return data
    },
  })

  // Buscar equipes
  const { data: equipes } = useQuery({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipes').select('*').order('nome')
      if (error) throw error
      return data
    },
  })

  // Se for chefe, usar base e equipe do perfil
  const finalBaseId = baseId || authUser?.profile?.base_id || ''
  const finalEquipeId = equipeId || authUser?.profile?.equipe_id || ''

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="space-y-2">
        <Label htmlFor="base">Base</Label>
        {readOnly ? (
          <Input
            id="base"
            value={bases?.find((b) => b.id === finalBaseId)?.nome || ''}
            readOnly
            className="bg-muted"
          />
        ) : (
          <Select
            id="base"
            value={finalBaseId}
            onChange={(e) => {
              onBaseChange?.(e.target.value)
              onBaseIdChange?.(e.target.value)
            }}
            disabled={!!authUser?.profile?.base_id}
          >
            <option value="">Selecione a base</option>
            {bases?.map((base) => (
              <option key={base.id} value={base.id}>
                {base.nome}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="equipe">Equipe</Label>
        {readOnly ? (
          <Input
            id="equipe"
            value={equipes?.find((e) => e.id === finalEquipeId)?.nome || ''}
            readOnly
            className="bg-muted"
          />
        ) : (
          <Select
            id="equipe"
            value={finalEquipeId}
            onChange={(e) => {
              onEquipeChange?.(e.target.value)
              onEquipeIdChange?.(e.target.value)
            }}
            disabled={!!authUser?.profile?.equipe_id}
          >
            <option value="">Selecione a equipe</option>
            {equipes?.map((equipe) => (
              <option key={equipe.id} value={equipe.id}>
                {equipe.nome}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="data_referencia">Data de Referência</Label>
        <Input
          id="data_referencia"
          type="date"
          value={dataReferencia}
          onChange={(e) => onDataChange(e.target.value)}
          disabled={readOnly}
          className={readOnly ? 'bg-muted' : ''}
        />
      </div>
    </div>
  )
}
