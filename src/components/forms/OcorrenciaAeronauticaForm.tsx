import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useLancamento } from '@/hooks/useLancamento'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { formatTimeHHMM, formatTimeMMSS, validateHHMM, validateMMSS } from '@/lib/masks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'

const ocorrenciaAeronauticaSchema = z.object({
  tipo_ocorrencia: z.literal('Emergência aeronáutica'),
  acao: z.enum(['Posicionamento', 'Intervenção'], {
    required_error: 'Selecione uma ação',
  }),
  local: z.string().min(1, 'Local é obrigatório'),
  hora_acionamento: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
  tempo_chegada_1_cci: z.string().refine((val) => validateMMSS(val, 59), 'Formato inválido (mm:ss, máx 59:59)'),
  tempo_chegada_ult_cci: z.string().refine((val) => validateMMSS(val, 59), 'Formato inválido (mm:ss, máx 59:59)'),
  termino_ocorrencia: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type OcorrenciaAeronauticaFormData = z.infer<typeof ocorrenciaAeronauticaSchema>

interface OcorrenciaAeronauticaFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function OcorrenciaAeronauticaForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: OcorrenciaAeronauticaFormProps) {
  const { saveLancamento, isLoading } = useLancamento()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia ? new Date(initialData.data_referencia as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )

  // Buscar indicador para obter schema_type
  const { data: indicador } = useQuery({
    queryKey: ['indicador', indicadorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('indicadores_config')
        .select('*')
        .eq('id', indicadorId)
        .single()
      if (error) throw error
      return data
    },
  })

  const { authUser } = useAuth()
  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<OcorrenciaAeronauticaFormData>({
    resolver: zodResolver(ocorrenciaAeronauticaSchema),
    defaultValues: {
      tipo_ocorrencia: 'Emergência aeronáutica',
      acao: initialData?.acao as 'Posicionamento' | 'Intervenção' | undefined,
      local: (initialData?.local as string) || '',
      hora_acionamento: (initialData?.hora_acionamento as string) || '',
      tempo_chegada_1_cci: (initialData?.tempo_chegada_1_cci as string) || '',
      tempo_chegada_ult_cci: (initialData?.tempo_chegada_ult_cci as string) || '',
      termino_ocorrencia: (initialData?.termino_ocorrencia as string) || '',
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const onSubmit = async (data: OcorrenciaAeronauticaFormData) => {
    try {
      const conteudo = {
        tipo_ocorrencia: data.tipo_ocorrencia,
        acao: data.acao,
        local: data.local,
        hora_acionamento: data.hora_acionamento,
        tempo_chegada_1_cci: data.tempo_chegada_1_cci,
        tempo_chegada_ult_cci: data.tempo_chegada_ult_cci,
        termino_ocorrencia: data.termino_ocorrencia,
      }

      await saveLancamento({
        dataReferencia: data.data_referencia,
        indicadorId,
        conteudo,
        baseId: data.base_id,
        equipeId: data.equipe_id,
      })

      onSuccess?.()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar ocorrência. Tente novamente.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocorrência Aeronáutica</CardTitle>
        <CardDescription>
          Preenchido sempre que tiver uma ocorrência
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <BaseFormFields
            dataReferencia={dataReferencia}
            onDataChange={(date) => {
              setDataReferencia(date)
              setValue('data_referencia', date)
            }}
            baseId={initialData?.base_id as string | undefined}
            equipeId={initialData?.equipe_id as string | undefined}
            onBaseIdChange={(baseId) => setValue('base_id', baseId)}
            onEquipeIdChange={(equipeId) => setValue('equipe_id', equipeId)}
            readOnly={readOnly}
          />

          <div className="space-y-2">
            <Label htmlFor="tipo_ocorrencia">Tipo de Ocorrência</Label>
            <Input
              id="tipo_ocorrencia"
              value="Emergência aeronáutica"
              readOnly
              className="bg-muted"
              {...register('tipo_ocorrencia')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acao">Ação *</Label>
            <Controller
              name="acao"
              control={control}
              render={({ field }) => (
                <Select
                  id="acao"
                  {...field}
                  disabled={readOnly}
                  className={readOnly ? 'bg-muted' : ''}
                >
                  <option value="">Selecione uma ação</option>
                  <option value="Posicionamento">Posicionamento</option>
                  <option value="Intervenção">Intervenção</option>
                </Select>
              )}
            />
            {errors.acao && (
              <p className="text-sm text-destructive">{errors.acao.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="local">Local *</Label>
            <Input
              id="local"
              {...register('local')}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
            />
            {errors.local && (
              <p className="text-sm text-destructive">{errors.local.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hora_acionamento">Hora de Acionamento (HH:mm) *</Label>
            <Input
              id="hora_acionamento"
              placeholder="14:00"
              {...register('hora_acionamento')}
              onChange={(e) => {
                const formatted = formatTimeHHMM(e.target.value)
                setValue('hora_acionamento', formatted)
              }}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
            />
            {errors.hora_acionamento && (
              <p className="text-sm text-destructive">{errors.hora_acionamento.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tempo_chegada_1_cci">Tempo de Chegada 1ª CCI (mm:ss, máx 59:59) *</Label>
            <Input
              id="tempo_chegada_1_cci"
              placeholder="02:30"
              {...register('tempo_chegada_1_cci')}
              onChange={(e) => {
                const formatted = formatTimeMMSS(e.target.value, 59)
                setValue('tempo_chegada_1_cci', formatted)
              }}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
            />
            {errors.tempo_chegada_1_cci && (
              <p className="text-sm text-destructive">{errors.tempo_chegada_1_cci.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tempo_chegada_ult_cci">Tempo de Chegada Última CCI (mm:ss, máx 59:59) *</Label>
            <Input
              id="tempo_chegada_ult_cci"
              placeholder="05:45"
              {...register('tempo_chegada_ult_cci')}
              onChange={(e) => {
                const formatted = formatTimeMMSS(e.target.value, 59)
                setValue('tempo_chegada_ult_cci', formatted)
              }}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
            />
            {errors.tempo_chegada_ult_cci && (
              <p className="text-sm text-destructive">{errors.tempo_chegada_ult_cci.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="termino_ocorrencia">Término da Ocorrência (HH:mm) *</Label>
            <Input
              id="termino_ocorrencia"
              placeholder="15:30"
              {...register('termino_ocorrencia')}
              onChange={(e) => {
                const formatted = formatTimeHHMM(e.target.value)
                setValue('termino_ocorrencia', formatted)
              }}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
            />
            {errors.termino_ocorrencia && (
              <p className="text-sm text-destructive">{errors.termino_ocorrencia.message}</p>
            )}
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Salvando...' : 'Salvar Ocorrência'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
