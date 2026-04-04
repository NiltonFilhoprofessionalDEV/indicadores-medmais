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

const controleTrocasSchema = z.object({
  qtd_trocas: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type ControleTrocasFormData = z.infer<typeof controleTrocasSchema>

interface ControleTrocasFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function ControleTrocasForm({ indicadorId, onSuccess, initialData, readOnly = false }: ControleTrocasFormProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia ? normalizeDateToLocal(initialData.data_referencia as string) : getCurrentDateLocal()
  )

  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ControleTrocasFormData>({
    resolver: zodResolver(controleTrocasSchema),
    defaultValues: {
      qtd_trocas: initialData?.qtd_trocas ? Number(initialData.qtd_trocas) : 0,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const onSubmit = async (data: ControleTrocasFormData) => {
    try {
      const dataRefFormatted = typeof data.data_referencia === 'string' ? data.data_referencia : formatDateForStorage(new Date(data.data_referencia))
      await saveLancamento({
        id: initialData?.id as string | undefined,
        dataReferencia: dataRefFormatted,
        indicadorId,
        conteudo: { qtd_trocas: data.qtd_trocas ?? 0 },
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
      title="Controle de Trocas"
      description="Controle da quantidade de trocas realizadas"
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Controle de Trocas"
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

      <FormField label="Quantidade de Trocas" error={errors.qtd_trocas?.message}>
        <Input type="number" min="0" {...register('qtd_trocas', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
      </FormField>
    </FormShell>
  )
}
