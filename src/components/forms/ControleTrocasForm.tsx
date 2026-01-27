import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useLancamento } from '@/hooks/useLancamento'
import { useAuth } from '@/hooks/useAuth'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'

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

export function ControleTrocasForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: ControleTrocasFormProps) {
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
    setValue,
    formState: { errors },
  } = useForm<ControleTrocasFormData>({
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
      const conteudo = {
        qtd_trocas: data.qtd_trocas ?? 0,
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
      alert('Erro ao salvar Controle de Trocas. Tente novamente.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controle de Trocas</CardTitle>
        <CardDescription>
          Controle da quantidade de trocas realizadas
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
            equipeId={finalEquipeId}
            onBaseIdChange={(baseId) => setValue('base_id', baseId)}
            onEquipeIdChange={(equipeId) => setValue('equipe_id', equipeId)}
            readOnly={readOnly}
          />

          <div className="space-y-2">
            <Label htmlFor="qtd_trocas">Quantidade de Trocas</Label>
            <Input
              id="qtd_trocas"
              type="number"
              min="0"
              {...register('qtd_trocas', { valueAsNumber: true })}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
            />
            {errors.qtd_trocas && (
              <p className="text-sm text-destructive">{errors.qtd_trocas.message}</p>
            )}
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white">
              {isLoading ? 'Salvando...' : 'Salvar Controle de Trocas'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
