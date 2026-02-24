import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'

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

export function HigienizacaoTPForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: HigienizacaoTPFormProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia 
      ? normalizeDateToLocal(initialData.data_referencia as string)
      : getCurrentDateLocal()
  )

  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HigienizacaoTPFormData>({
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
      const conteudo = {
        qtd_higienizados_mes: data.qtd_higienizados_mes ?? 0,
        qtd_total_sci: data.qtd_total_sci ?? 0,
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
    <Card>
      <CardHeader>
        <CardTitle>Higienização de TP</CardTitle>
        <CardDescription>
          Controle de higienização de TP (Tubos de Pressão)
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
            baseId={finalBaseId}
            equipeId={watch('equipe_id') ?? finalEquipeId}
            onBaseIdChange={(baseId) => setValue('base_id', baseId)}
            onEquipeIdChange={(equipeId) => setValue('equipe_id', equipeId)}
            readOnly={readOnly}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qtd_higienizados_mes">Quantidade Higienizados no Mês</Label>
              <Input
                id="qtd_higienizados_mes"
                type="number"
                min="0"
                {...register('qtd_higienizados_mes', { valueAsNumber: true })}
                disabled={readOnly}
                className={readOnly ? 'bg-muted' : ''}
              />
              {errors.qtd_higienizados_mes && (
                <p className="text-sm text-destructive">{errors.qtd_higienizados_mes.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qtd_total_sci">Quantidade Total SCI</Label>
              <Input
                id="qtd_total_sci"
                type="number"
                min="0"
                {...register('qtd_total_sci', { valueAsNumber: true })}
                disabled={readOnly}
                className={readOnly ? 'bg-muted' : ''}
              />
              {errors.qtd_total_sci && (
                <p className="text-sm text-destructive">{errors.qtd_total_sci.message}</p>
              )}
            </div>
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white">
              {isLoading ? 'Salvando...' : 'Salvar Higienização de TP'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
