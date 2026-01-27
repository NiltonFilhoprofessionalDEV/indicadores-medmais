import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useLancamento } from '@/hooks/useLancamento'
import { useAuth } from '@/hooks/useAuth'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'

const VIATURAS = [
  'CCI 01',
  'CCI 02',
  'CCI 03',
  'CCI 04',
  'CCI 05',
  'CCI 06',
  'CRS 01',
  'CRS 02',
  'CRS 03',
  'CCI RT 01',
  'CCI RT 02',
  'CCI RT 03',
  'CA 01',
  'CA 02',
] as const

const inspecaoSchema = z.object({
  viatura: z.enum(VIATURAS, {
    required_error: 'Selecione uma viatura',
  }),
  qtd_inspecoes: z.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
  qtd_nao_conforme: z.number().min(0, 'Quantidade deve ser maior ou igual a 0'),
})

const inspecaoViaturasSchema = z.object({
  inspecoes: z.array(inspecaoSchema).min(1, 'Adicione pelo menos uma inspeção'),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type InspecaoViaturasFormData = z.infer<typeof inspecaoViaturasSchema>

interface InspecaoViaturasFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function InspecaoViaturasForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: InspecaoViaturasFormProps) {
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia 
      ? normalizeDateToLocal(initialData.data_referencia as string)
      : getCurrentDateLocal()
  )

  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const initialInspecoes = initialData?.inspecoes && Array.isArray(initialData.inspecoes)
    ? (initialData.inspecoes as Array<Record<string, unknown>>).map((i) => ({
        viatura: (i.viatura as typeof VIATURAS[number]) || undefined,
        qtd_inspecoes: i.qtd_inspecoes ? Number(i.qtd_inspecoes) : undefined,
        qtd_nao_conforme: i.qtd_nao_conforme ? Number(i.qtd_nao_conforme) : undefined,
      }))
    : Array(4).fill(null).map(() => ({ viatura: undefined, qtd_inspecoes: undefined, qtd_nao_conforme: undefined }))

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<InspecaoViaturasFormData>({
    resolver: zodResolver(inspecaoViaturasSchema),
    defaultValues: {
      inspecoes: initialInspecoes,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'inspecoes',
  })

  const onSubmit = async (data: InspecaoViaturasFormData) => {
    try {
      const inspecoesFiltradas = data.inspecoes.filter((i) => i.viatura)

      const conteudo = {
        inspecoes: inspecoesFiltradas,
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
      alert('Erro ao salvar Inspeção de Viaturas. Tente novamente.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inspeção de Viaturas</CardTitle>
        <CardDescription>
          Lista de inspeções realizadas nas viaturas
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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Inspeções</Label>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ viatura: '' as any, qtd_inspecoes: 0, qtd_nao_conforme: 0 })}
                >
                  Adicionar Linha
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-md">
                  <div className="space-y-1">
                    <Label className="text-xs">Viatura *</Label>
                    <Controller
                      name={`inspecoes.${index}.viatura`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          disabled={readOnly}
                          className={readOnly ? 'bg-muted' : ''}
                        >
                          <option value="">Selecione</option>
                          {VIATURAS.map((viatura) => (
                            <option key={viatura} value={viatura}>
                              {viatura}
                            </option>
                          ))}
                        </Select>
                      )}
                    />
                    {errors.inspecoes?.[index]?.viatura && (
                      <p className="text-xs text-destructive">{errors.inspecoes[index]?.viatura?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Qtd. Inspeções *</Label>
                    <Input
                      type="number"
                      min="0"
                      {...register(`inspecoes.${index}.qtd_inspecoes`, { valueAsNumber: true })}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.inspecoes?.[index]?.qtd_inspecoes && (
                      <p className="text-xs text-destructive">{errors.inspecoes[index]?.qtd_inspecoes?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Qtd. Não Conforme *</Label>
                    <Input
                      type="number"
                      min="0"
                      {...register(`inspecoes.${index}.qtd_nao_conforme`, { valueAsNumber: true })}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.inspecoes?.[index]?.qtd_nao_conforme && (
                      <p className="text-xs text-destructive">{errors.inspecoes[index]?.qtd_nao_conforme?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        className="mt-6 w-full"
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errors.inspecoes && (
              <p className="text-sm text-destructive">{errors.inspecoes.message}</p>
            )}
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white">
              {isLoading ? 'Salvando...' : 'Salvar Inspeção de Viaturas'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
