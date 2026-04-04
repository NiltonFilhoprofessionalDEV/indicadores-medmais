import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeHHMM, formatTimeMMSS, validateHHMM, validateMMSS } from '@/lib/masks'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormShell, FormSection, FormField } from './FormShell'
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
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia
      ? normalizeDateToLocal(initialData.data_referencia as string)
      : getCurrentDateLocal()
  )

  // Buscar indicador para obter schema_type (mantido para possível uso futuro)
  useQuery({
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
    watch,
    formState: { errors },
    setValue,
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

      // CORREÇÃO TIMEZONE: Converter data para formato de armazenamento antes de enviar
      // Se data_referencia já é string YYYY-MM-DD, usar direto. Se for Date, converter.
      const dataRefFormatted = typeof data.data_referencia === 'string'
        ? data.data_referencia
        : formatDateForStorage(new Date(data.data_referencia))

      await saveLancamento({
        id: initialData?.id as string | undefined,
        dataReferencia: dataRefFormatted,
        indicadorId,
        conteudo,
        baseId: data.base_id,
        equipeId: data.equipe_id,
      })

      onSuccess?.()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      handleSaveError(error, { onSuccess, navigate })
    }
  }

  return (
    <FormShell
      title="Ocorrência Aeronáutica"
      description="Registro de emergência aeronáutica"
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Ocorrência"
    >
      <BaseFormFields
        dataReferencia={dataReferencia}
        onDataChange={(date) => {
          setDataReferencia(date)
          setValue('data_referencia', date)
        }}
        baseId={watch('base_id') ?? initialData?.base_id as string | undefined}
        equipeId={watch('equipe_id') ?? initialData?.equipe_id as string | undefined}
        onBaseIdChange={(baseId) => setValue('base_id', baseId)}
        onEquipeIdChange={(equipeId) => setValue('equipe_id', equipeId)}
        readOnly={readOnly}
      />

      <FormSection title="Dados da Ocorrência">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Tipo de Ocorrência">
            <Input
              id="tipo_ocorrencia"
              value="Emergência aeronáutica"
              readOnly
              className="bg-muted"
              {...register('tipo_ocorrencia')}
            />
          </FormField>

          <FormField label="Ação" required error={errors.acao?.message}>
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
          </FormField>
        </div>

        <FormField label="Local" required error={errors.local?.message}>
          <Input
            id="local"
            {...register('local')}
            disabled={readOnly}
            className={readOnly ? 'bg-muted' : ''}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Hora de Acionamento (HH:mm)" required error={errors.hora_acionamento?.message}>
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
          </FormField>

          <FormField label="Tempo de Chegada 1ª CCI (mm:ss, máx 59:59)" required error={errors.tempo_chegada_1_cci?.message}>
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
          </FormField>

          <FormField label="Tempo de Chegada Última CCI (mm:ss, máx 59:59)" required error={errors.tempo_chegada_ult_cci?.message}>
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
          </FormField>

          <FormField label="Hora do término da ocorrência (HH:mm)" required error={errors.termino_ocorrencia?.message}>
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
          </FormField>
        </div>
      </FormSection>
    </FormShell>
  )
}
