import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormShell, FormField } from './FormShell'
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
  viatura: z.string().optional().default(''),
  qtd_inspecoes: z.union([z.number(), z.nan()]).optional(),
  qtd_nao_conforme: z.union([z.number(), z.nan()]).optional(),
})

const inspecaoViaturasSchema = z
  .object({
    inspecoes: z.array(inspecaoSchema),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasValue = (i: { viatura?: string; qtd_inspecoes?: number; qtd_nao_conforme?: number }) => {
        const v = String(i.viatura ?? '').trim()
        const qi = i.qtd_inspecoes
        const qn = i.qtd_nao_conforme
        return v !== '' || (typeof qi === 'number' && !Number.isNaN(qi)) || (typeof qn === 'number' && !Number.isNaN(qn))
      }
      const isComplete = (i: { viatura?: string; qtd_inspecoes?: number; qtd_nao_conforme?: number }) => {
        const v = String(i.viatura ?? '').trim()
        const qi = i.qtd_inspecoes
        const qn = i.qtd_nao_conforme
        return v !== '' && typeof qi === 'number' && !Number.isNaN(qi) && qi >= 0 && typeof qn === 'number' && !Number.isNaN(qn) && qn >= 0
      }
      for (const row of data.inspecoes) {
        if (hasValue(row) && !isComplete(row)) return false
      }
      const atLeastOneComplete = data.inspecoes.some((i) => isComplete(i))
      return atLeastOneComplete
    },
    { message: 'Preencha a linha por completo (viatura, qtd. inspeções e qtd. não conforme) ou deixe-a em branco. É necessário ao menos uma linha completa.', path: ['inspecoes'] }
  )

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
    watch,
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
      const inspecoesFiltradas = data.inspecoes
        .filter((i) => {
          const v = String(i.viatura ?? '').trim()
          const qi = i.qtd_inspecoes
          const qn = i.qtd_nao_conforme
          return v !== '' && typeof qi === 'number' && !Number.isNaN(qi) && qi >= 0 && typeof qn === 'number' && !Number.isNaN(qn) && qn >= 0
        })
        .map((i) => ({
          viatura: String(i.viatura).trim(),
          qtd_inspecoes: Number(i.qtd_inspecoes),
          qtd_nao_conforme: Number(i.qtd_nao_conforme),
        }))

      const conteudo = {
        inspecoes: inspecoesFiltradas,
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
      title="Inspeção de Viaturas"
      description="Lista de inspeções realizadas nas viaturas"
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Inspeção"
    >
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

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Inspeções</h3>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ viatura: '', qtd_inspecoes: undefined, qtd_nao_conforme: undefined })}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Linha
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/20 border border-border">
              <FormField
                label="Viatura"
                required
                error={errors.inspecoes?.[index]?.viatura?.message}
              >
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
              </FormField>

              <FormField
                label="Qtd. Inspeções"
                required
                error={errors.inspecoes?.[index]?.qtd_inspecoes?.message}
              >
                <Input
                  type="number"
                  min="0"
                  {...register(`inspecoes.${index}.qtd_inspecoes`, { valueAsNumber: true })}
                  disabled={readOnly}
                  className={readOnly ? 'bg-muted' : ''}
                />
              </FormField>

              <FormField
                label="Qtd. Não Conforme"
                required
                error={errors.inspecoes?.[index]?.qtd_nao_conforme?.message}
              >
                <Input
                  type="number"
                  min="0"
                  {...register(`inspecoes.${index}.qtd_nao_conforme`, { valueAsNumber: true })}
                  disabled={readOnly}
                  className={readOnly ? 'bg-muted' : ''}
                />
              </FormField>

              <div className="flex items-end justify-center">
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 mt-6"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {errors.inspecoes && (
          <p className="text-xs text-destructive font-medium">{errors.inspecoes.message}</p>
        )}
      </div>
    </FormShell>
  )
}
