import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeHHMM, validateHHMM, calculateTimeDifference } from '@/lib/masks'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormShell, FormField } from './FormShell'
import { BaseFormFields } from './BaseFormFields'

const TIPOS_OCORRENCIA = [
  'Incêndios ou Vazamentos de Combustíveis no PAA',
  'Condições de Baixa Visibilidade',
  'Atendimento a Aeronave Presidencial',
  'Incêndio em Instalações Aeroportuárias',
  'Ocorrências com Artigos Perigosos',
  'Remoção de Animais e Dispersão de Avifauna',
  'Incêndios Florestais',
  'Emergências Médicas em Geral',
  'Iluminação de Emergência em Pista',
  'Outras',
] as const

const ocorrenciaNaoAeronauticaSchema = z
  .object({
    tipo_ocorrencia: z.enum(TIPOS_OCORRENCIA, {
      required_error: 'Selecione o tipo de ocorrência',
    }),
    especificacao_outras: z.string().optional(),
    local: z.string().min(1, 'Local é obrigatório'),
    hora_acionamento: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
    hora_chegada: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
    hora_termino: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
    duracao_total: z.string().optional(),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) =>
      data.tipo_ocorrencia !== 'Outras' ||
      (typeof data.especificacao_outras === 'string' && data.especificacao_outras.trim().length > 0),
    { message: 'Especifique o tipo de ocorrência', path: ['especificacao_outras'] }
  )

type OcorrenciaNaoAeronauticaFormData = z.infer<typeof ocorrenciaNaoAeronauticaSchema>

interface OcorrenciaNaoAeronauticaFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function OcorrenciaNaoAeronauticaForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: OcorrenciaNaoAeronauticaFormProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia 
      ? normalizeDateToLocal(initialData.data_referencia as string)
      : getCurrentDateLocal()
  )

  const { authUser } = useAuth()
  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OcorrenciaNaoAeronauticaFormData>({
    resolver: zodResolver(ocorrenciaNaoAeronauticaSchema),
    defaultValues: {
      tipo_ocorrencia: (initialData?.tipo_ocorrencia as typeof TIPOS_OCORRENCIA[number]) || undefined,
      especificacao_outras:
        initialData?.tipo_ocorrencia === 'Outras'
          ? String(initialData?.observacoes ?? '').trim()
          : '',
      local: (initialData?.local as string) || '',
      hora_acionamento: (initialData?.hora_acionamento as string) || '',
      hora_chegada: (initialData?.hora_chegada as string) || '',
      hora_termino: (initialData?.hora_termino as string) || '',
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const horaAcionamento = watch('hora_acionamento')
  const horaTermino = watch('hora_termino')
  const tipoOcorrencia = watch('tipo_ocorrencia')
  const isOutras = tipoOcorrencia === 'Outras'

  // Limpar especificação quando o usuário trocar de "Outras" para outro tipo
  useEffect(() => {
    if (!isOutras) {
      setValue('especificacao_outras', '')
    }
  }, [isOutras, setValue])

  // Calcular duração total automaticamente
  useEffect(() => {
    if (horaAcionamento && horaTermino && validateHHMM(horaAcionamento) && validateHHMM(horaTermino)) {
      const duracao = calculateTimeDifference(horaAcionamento, horaTermino)
      setValue('duracao_total', duracao)
    } else {
      setValue('duracao_total', '')
    }
  }, [horaAcionamento, horaTermino, setValue])

  const onSubmit = async (data: OcorrenciaNaoAeronauticaFormData) => {
    try {
      const conteudo: Record<string, unknown> = {
        tipo_ocorrencia: data.tipo_ocorrencia,
        local: data.local,
        hora_acionamento: data.hora_acionamento,
        hora_chegada: data.hora_chegada,
        hora_termino: data.hora_termino,
        duracao_total: data.duracao_total,
      }
      // Quando "Outras" está selecionado, mesclar especificação no campo observacoes
      if (data.tipo_ocorrencia === 'Outras' && data.especificacao_outras?.trim()) {
        const especificacao = data.especificacao_outras.trim()
        const observacoesExistentes = (initialData?.observacoes as string)?.trim() || ''
        conteudo.observacoes = observacoesExistentes
          ? `${especificacao} | ${observacoesExistentes}`
          : especificacao
      }

      // CORREÇÃO TIMEZONE: Converter data para formato de armazenamento antes de enviar
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
      title="Ocorrência Não Aeronáutica"
      description="Preenchido sempre que tiver uma ocorrência."
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

      <FormField label="Tipo de Ocorrência" required error={errors.tipo_ocorrencia?.message}>
        <Controller
          name="tipo_ocorrencia"
          control={control}
          render={({ field }) => (
            <Select
              id="tipo_ocorrencia"
              {...field}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
            >
              <option value="">Selecione o tipo de ocorrência</option>
              {TIPOS_OCORRENCIA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </Select>
          )}
        />
      </FormField>

      {isOutras && (
        <FormField
          label="Especifique o tipo de ocorrência"
          required
          error={errors.especificacao_outras?.message}
        >
          <Input
            id="especificacao_outras"
            {...register('especificacao_outras')}
            placeholder="Ex.: Resgate em área de difícil acesso"
            disabled={readOnly}
            className={readOnly ? 'bg-muted' : ''}
          />
        </FormField>
      )}

      <FormField label="Local" required error={errors.local?.message}>
        <Input
          id="local"
          {...register('local')}
          disabled={readOnly}
          className={readOnly ? 'bg-muted' : ''}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Hora de Acionamento (HH:mm)"
          required
          error={errors.hora_acionamento?.message}
        >
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

        <FormField
          label="Hora de Chegada (HH:mm)"
          required
          error={errors.hora_chegada?.message}
        >
          <Input
            id="hora_chegada"
            placeholder="14:15"
            {...register('hora_chegada')}
            onChange={(e) => {
              const formatted = formatTimeHHMM(e.target.value)
              setValue('hora_chegada', formatted)
            }}
            disabled={readOnly}
            className={readOnly ? 'bg-muted' : ''}
          />
        </FormField>

        <FormField
          label="Hora de Término (HH:mm)"
          required
          error={errors.hora_termino?.message}
        >
          <Input
            id="hora_termino"
            placeholder="15:30"
            {...register('hora_termino')}
            onChange={(e) => {
              const formatted = formatTimeHHMM(e.target.value)
              setValue('hora_termino', formatted)
            }}
            disabled={readOnly}
            className={readOnly ? 'bg-muted' : ''}
          />
        </FormField>
      </div>

      <FormField label="Duração Total (HH:mm)">
        <Input
          id="duracao_total"
          value={watch('duracao_total') || ''}
          readOnly
          className="bg-muted"
        />
      </FormField>
    </FormShell>
  )
}
