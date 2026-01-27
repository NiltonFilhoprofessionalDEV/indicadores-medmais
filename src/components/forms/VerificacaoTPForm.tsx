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

export function VerificacaoTPForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: VerificacaoTPFormProps) {
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
  } = useForm<VerificacaoTPFormData>({
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
      const conteudo = {
        qtd_conformes: data.qtd_conformes,
        qtd_verificados: data.qtd_verificados,
        qtd_total_equipe: data.qtd_total_equipe,
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
      alert('Erro ao salvar Verificação de TP. Tente novamente.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificação de TP</CardTitle>
        <CardDescription>
          Controle de verificação de TP (Tubos de Pressão)
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qtd_conformes">Quantidade Conformes</Label>
              <Input
                id="qtd_conformes"
                type="number"
                min="0"
                {...register('qtd_conformes', { valueAsNumber: true })}
                disabled={readOnly}
                className={readOnly ? 'bg-muted' : ''}
              />
              {errors.qtd_conformes && (
                <p className="text-sm text-destructive">{errors.qtd_conformes.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qtd_verificados">Quantidade Verificados</Label>
              <Input
                id="qtd_verificados"
                type="number"
                min="0"
                {...register('qtd_verificados', { valueAsNumber: true })}
                disabled={readOnly}
                className={readOnly ? 'bg-muted' : ''}
              />
              {errors.qtd_verificados && (
                <p className="text-sm text-destructive">{errors.qtd_verificados.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qtd_total_equipe">Quantidade Total da Equipe</Label>
              <Input
                id="qtd_total_equipe"
                type="number"
                min="0"
                {...register('qtd_total_equipe', { valueAsNumber: true })}
                disabled={readOnly}
                className={readOnly ? 'bg-muted' : ''}
              />
              {errors.qtd_total_equipe && (
                <p className="text-sm text-destructive">{errors.qtd_total_equipe.message}</p>
              )}
            </div>
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Salvando...' : 'Salvar Verificação de TP'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
