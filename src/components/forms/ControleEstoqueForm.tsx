import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useLancamento } from '@/hooks/useLancamento'
import { useAuth } from '@/hooks/useAuth'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { InputWithSuffix } from '@/components/ui/input-with-suffix'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'

const controleEstoqueSchema = z.object({
  po_quimico_atual: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  po_quimico_exigido: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  lge_atual: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  lge_exigido: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  nitrogenio_atual: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  nitrogenio_exigido: z.number().min(0, 'Quantidade deve ser maior ou igual a 0').optional(),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type ControleEstoqueFormData = z.infer<typeof controleEstoqueSchema>

interface ControleEstoqueFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function ControleEstoqueForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: ControleEstoqueFormProps) {
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
  } = useForm<ControleEstoqueFormData>({
    resolver: zodResolver(controleEstoqueSchema),
    defaultValues: {
      po_quimico_atual: initialData?.po_quimico_atual ? Number(initialData.po_quimico_atual) : undefined,
      po_quimico_exigido: initialData?.po_quimico_exigido ? Number(initialData.po_quimico_exigido) : undefined,
      lge_atual: initialData?.lge_atual ? Number(initialData.lge_atual) : undefined,
      lge_exigido: initialData?.lge_exigido ? Number(initialData.lge_exigido) : undefined,
      nitrogenio_atual: initialData?.nitrogenio_atual ? Number(initialData.nitrogenio_atual) : undefined,
      nitrogenio_exigido: initialData?.nitrogenio_exigido ? Number(initialData.nitrogenio_exigido) : undefined,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const onSubmit = async (data: ControleEstoqueFormData) => {
    try {
      const conteudo = {
        po_quimico_atual: data.po_quimico_atual ?? 0,
        po_quimico_exigido: data.po_quimico_exigido ?? 0,
        lge_atual: data.lge_atual ?? 0,
        lge_exigido: data.lge_exigido ?? 0,
        nitrogenio_atual: data.nitrogenio_atual ?? 0,
        nitrogenio_exigido: data.nitrogenio_exigido ?? 0,
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
      alert('Erro ao salvar Controle de Estoque. Tente novamente.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controle de Estoque</CardTitle>
        <CardDescription>
          Controle de estoque de materiais com unidades específicas
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

          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pó Químico</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="po_quimico_atual">Atual (KG)</Label>
                  <InputWithSuffix
                    id="po_quimico_atual"
                    suffix="KG"
                    min="0"
                    {...register('po_quimico_atual', { valueAsNumber: true })}
                    disabled={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
                  {errors.po_quimico_atual && (
                    <p className="text-sm text-destructive">{errors.po_quimico_atual.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="po_quimico_exigido">Exigido (KG)</Label>
                  <InputWithSuffix
                    id="po_quimico_exigido"
                    suffix="KG"
                    min="0"
                    {...register('po_quimico_exigido', { valueAsNumber: true })}
                    disabled={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
                  {errors.po_quimico_exigido && (
                    <p className="text-sm text-destructive">{errors.po_quimico_exigido.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">LGE (Líquido Gerador de Espuma)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lge_atual">Atual (L)</Label>
                  <InputWithSuffix
                    id="lge_atual"
                    suffix="L"
                    min="0"
                    {...register('lge_atual', { valueAsNumber: true })}
                    disabled={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
                  {errors.lge_atual && (
                    <p className="text-sm text-destructive">{errors.lge_atual.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lge_exigido">Exigido (L)</Label>
                  <InputWithSuffix
                    id="lge_exigido"
                    suffix="L"
                    min="0"
                    {...register('lge_exigido', { valueAsNumber: true })}
                    disabled={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
                  {errors.lge_exigido && (
                    <p className="text-sm text-destructive">{errors.lge_exigido.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Nitrogênio</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nitrogenio_atual">Atual (Und)</Label>
                  <InputWithSuffix
                    id="nitrogenio_atual"
                    suffix="Und"
                    min="0"
                    {...register('nitrogenio_atual', { valueAsNumber: true })}
                    disabled={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
                  {errors.nitrogenio_atual && (
                    <p className="text-sm text-destructive">{errors.nitrogenio_atual.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nitrogenio_exigido">Exigido (Und)</Label>
                  <InputWithSuffix
                    id="nitrogenio_exigido"
                    suffix="Und"
                    min="0"
                    {...register('nitrogenio_exigido', { valueAsNumber: true })}
                    disabled={readOnly}
                    className={readOnly ? 'bg-muted' : ''}
                  />
                  {errors.nitrogenio_exigido && (
                    <p className="text-sm text-destructive">{errors.nitrogenio_exigido.message}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Salvando...' : 'Salvar Controle de Estoque'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
