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

const verificacaoTPSchema = z.object({
  qtd_conformes: z.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
  qtd_verificados: z.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
  qtd_total_equipe: z.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type VerificacaoTPFormData = z.infer<typeof verificacaoTPSchema>

interface VerificacaoTPFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function VerificacaoTPForm({ indicadorId, onSuccess, initialData, readOnly = false }: VerificacaoTPFormProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia ? normalizeDateToLocal(initialData.data_referencia as string) : getCurrentDateLocal()
  )

  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<VerificacaoTPFormData>({
    resolver: zodResolver(verificacaoTPSchema),
    defaultValues: {
      qtd_conformes: initialData?.qtd_conformes ? Number(initialData.qtd_conformes) : 0,
      qtd_verificados: initialData?.qtd_verificados ? Number(initialData.qtd_verificados) : 0,
      qtd_total_equipe: initialData?.qtd_total_equipe ? Number(initialData.qtd_total_equipe) : 0,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const onSubmit = async (data: VerificacaoTPFormData) => {
    try {
      const dataRefFormatted = typeof data.data_referencia === 'string' ? data.data_referencia : formatDateForStorage(new Date(data.data_referencia))
      await saveLancamento({
        id: initialData?.id as string | undefined,
        dataReferencia: dataRefFormatted,
        indicadorId,
        conteudo: { qtd_conformes: data.qtd_conformes, qtd_verificados: data.qtd_verificados, qtd_total_equipe: data.qtd_total_equipe },
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
      title="Verificação de TP"
      description="Controle de verificação de Tubos de Pressão"
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Verificação"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Qtd. Conformes" required error={errors.qtd_conformes?.message}>
          <Input type="number" min="0" {...register('qtd_conformes', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
        <FormField label="Qtd. Verificados" required error={errors.qtd_verificados?.message}>
          <Input type="number" min="0" {...register('qtd_verificados', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
        <FormField label="Qtd. Total da Equipe" required error={errors.qtd_total_equipe?.message}>
          <Input type="number" min="0" {...register('qtd_total_equipe', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
      </div>
    </FormShell>
  )
}
