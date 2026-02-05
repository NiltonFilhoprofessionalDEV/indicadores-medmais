import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useLancamento } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeHHMM, validateHHMM, calculateTimeDifference } from '@/lib/masks'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
] as const

const ocorrenciaNaoAeronauticaSchema = z.object({
  tipo_ocorrencia: z.enum(TIPOS_OCORRENCIA, {
    required_error: 'Selecione o tipo de ocorrência',
  }),
  local: z.string().min(1, 'Local é obrigatório'),
  hora_acionamento: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
  hora_chegada: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
  hora_termino: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
  duracao_total: z.string().optional(),
  observacoes: z.string().optional(),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

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
      local: (initialData?.local as string) || '',
      hora_acionamento: (initialData?.hora_acionamento as string) || '',
      hora_chegada: (initialData?.hora_chegada as string) || '',
      hora_termino: (initialData?.hora_termino as string) || '',
      observacoes: (initialData?.observacoes as string) || '',
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const horaAcionamento = watch('hora_acionamento')
  const horaTermino = watch('hora_termino')

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
      const conteudo = {
        tipo_ocorrencia: data.tipo_ocorrencia,
        local: data.local,
        hora_acionamento: data.hora_acionamento,
        hora_chegada: data.hora_chegada,
        hora_termino: data.hora_termino,
        duracao_total: data.duracao_total,
        observacoes: data.observacoes || '',
      }

      // CORREÇÃO TIMEZONE: Converter data para formato de armazenamento antes de enviar
      const dataRefFormatted = typeof data.data_referencia === 'string' 
        ? data.data_referencia 
        : formatDateForStorage(new Date(data.data_referencia))

      await saveLancamento({
        dataReferencia: dataRefFormatted,
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
        <CardTitle>Ocorrência Não Aeronáutica</CardTitle>
        <CardDescription>
          Preenchido sempre que tiver uma ocorrência.
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
            <Label htmlFor="tipo_ocorrencia">Tipo de Ocorrência *</Label>
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
            {errors.tipo_ocorrencia && (
              <p className="text-sm text-destructive">{errors.tipo_ocorrencia.message}</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="hora_chegada">Hora de Chegada (HH:mm) *</Label>
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
              {errors.hora_chegada && (
                <p className="text-sm text-destructive">{errors.hora_chegada.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora_termino">Hora de Término (HH:mm) *</Label>
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
              {errors.hora_termino && (
                <p className="text-sm text-destructive">{errors.hora_termino.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duracao_total">Duração Total (HH:mm)</Label>
            <Input
              id="duracao_total"
              value={watch('duracao_total') || ''}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              {...register('observacoes')}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
              rows={3}
            />
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white">
              {isLoading ? 'Salvando...' : 'Salvar Ocorrência'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
