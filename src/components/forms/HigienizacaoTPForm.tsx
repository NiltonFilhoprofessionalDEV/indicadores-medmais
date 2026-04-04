import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Input } from '@/components/ui/input'
import { BaseFormFields } from './BaseFormFields'
import { FormShell, FormField } from './FormShell'

const higienizacaoTPSchema = z.object({
  qtd_higienizados_mes: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  qtd_total_sci: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type HigienizacaoTPFormData = z.infer<typeof higienizacaoTPSchema>

interface HigienizacaoTPFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function HigienizacaoTPForm({ indicadorId, onSuccess, initialData, readOnly = false }: HigienizacaoTPFormProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia ? normalizeDateToLocal(initialData.data_referencia as string) : getCurrentDateLocal()
  )

  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<HigienizacaoTPFormData>({
    resolver: zodResolver(higienizacaoTPSchema),
    defaultValues: {
      qtd_higienizados_mes: initialData?.qtd_higienizados_mes ? Number(initialData.qtd_higienizados_mes) : undefined,
      qtd_total_sci: initialData?.qtd_total_sci ? Number(initialData.qtd_total_sci) : undefined,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const onSubmit = async (data: HigienizacaoTPFormData) => {
    try {
      const dataRefFormatted = typeof data.data_referencia === 'string' ? data.data_referencia : formatDateForStorage(new Date(data.data_referencia))
      await saveLancamento({
        id: initialData?.id as string | undefined,
        dataReferencia: dataRefFormatted,
        indicadorId,
        conteudo: { qtd_higienizados_mes: data.qtd_higienizados_mes ?? 0, qtd_total_sci: data.qtd_total_sci ?? 0 },
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
      title="Higienização de TP"
      description="Controle de higienização de Tubos de Pressão"
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Higienização"
    >
      <BaseFormFields
        dataReferencia={dataReferencia}
        onDataChange={(date) => { setDataReferencia(date); setValue('data_referencia', date) }}
        baseId={finalBaseId}
        equipeId={watch('equipe_id') ?? finalEquipeId}
        onBaseIdChange={(baseId) => setValue('base_id', baseId)}
        onEquipeIdChange={(equipeId) => setValue('equipe_id', equipeId)}
        readOnly={readOnly}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Qtd. Higienizados no Mês" error={errors.qtd_higienizados_mes?.message}>
          <Input type="number" min="0" {...register('qtd_higienizados_mes', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
        <FormField label="Qtd. Total SCI" error={errors.qtd_total_sci?.message}>
          <Input type="number" min="0" {...register('qtd_total_sci', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
      </div>
    </FormShell>
  )
}
