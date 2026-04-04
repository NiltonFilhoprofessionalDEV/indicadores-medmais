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

type InspecaoRow = {
  viatura?: string
  qtd_inspecoes?: number
  qtd_itens_inspecionados?: number
  qtd_itens_nao_conforme?: number
}

const inspecaoSchema = z.object({
  viatura: z.string().optional().default(''),
  qtd_inspecoes: z.union([z.number(), z.nan()]).optional(),
  qtd_itens_inspecionados: z.union([z.number(), z.nan()]).optional(),
  qtd_itens_nao_conforme: z.union([z.number(), z.nan()]).optional(),
})

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function hasValue(i: InspecaoRow): boolean {
  const v = String(i.viatura ?? '').trim()
  const qi = i.qtd_inspecoes
  const qit = i.qtd_itens_inspecionados
  const qn = i.qtd_itens_nao_conforme
  return (
    v !== '' ||
    (typeof qi === 'number' && !Number.isNaN(qi)) ||
    (typeof qit === 'number' && !Number.isNaN(qit)) ||
    (typeof qn === 'number' && !Number.isNaN(qn))
  )
}

function isComplete(i: InspecaoRow): boolean {
  const v = String(i.viatura ?? '').trim()
  const qi = i.qtd_inspecoes
  const qit = i.qtd_itens_inspecionados
  const qn = i.qtd_itens_nao_conforme
  return (
    v !== '' &&
    typeof qi === 'number' &&
    !Number.isNaN(qi) &&
    qi >= 0 &&
    typeof qit === 'number' &&
    !Number.isNaN(qit) &&
    qit >= 0 &&
    typeof qn === 'number' &&
    !Number.isNaN(qn) &&
    qn >= 0 &&
    qn <= qit
  )
}

const inspecaoViaturasSchema = z
  .object({
    inspecoes: z.array(inspecaoSchema),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) => {
      for (const row of data.inspecoes) {
        if (hasValue(row) && !isComplete(row)) return false
      }
      return data.inspecoes.some((i) => isComplete(i))
    },
    {
      message:
        'Preencha cada linha usada por completo (viatura, quantidade de inspeções, itens inspecionados e itens não conformes) ou deixe-a em branco. Itens não conformes não podem exceder itens inspecionados. É necessário ao menos uma linha completa.',
      path: ['inspecoes'],
    }
  )

type InspecaoViaturasFormData = z.infer<typeof inspecaoViaturasSchema>

interface InspecaoViaturasFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

function defaultInspecaoLine(): z.infer<typeof inspecaoSchema> {
  return {
    viatura: '',
    qtd_inspecoes: undefined,
    qtd_itens_inspecionados: undefined,
    qtd_itens_nao_conforme: undefined,
  }
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

  const finalBaseId = (initialData?.base_id as string | undefined) || authUser?.profile?.base_id || ''
  const finalEquipeId = (initialData?.equipe_id as string | undefined) || authUser?.profile?.equipe_id || ''

  const initialInspecoes: InspecaoRow[] =
    initialData?.inspecoes && Array.isArray(initialData.inspecoes)
      ? (initialData.inspecoes as Array<Record<string, unknown>>).map((i) => {
          const qtdInspecoes = num(i.qtd_inspecoes)
          const qtdItens =
            num(i.qtd_itens_inspecionados) !== undefined
              ? num(i.qtd_itens_inspecionados)
              : qtdInspecoes
          const qtdNao =
            num(i.qtd_itens_nao_conforme) !== undefined
              ? num(i.qtd_itens_nao_conforme)
              : num(i.qtd_nao_conforme)
          return {
            viatura: String(i.viatura ?? '').trim(),
            qtd_inspecoes: qtdInspecoes,
            qtd_itens_inspecionados: qtdItens,
            qtd_itens_nao_conforme: qtdNao,
          }
        })
      : Array.from({ length: 4 }, () => defaultInspecaoLine())

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
        .filter((i) => isComplete(i))
        .map((i) => ({
          viatura: String(i.viatura).trim(),
          qtd_inspecoes: Number(i.qtd_inspecoes),
          qtd_itens_inspecionados: Number(i.qtd_itens_inspecionados),
          qtd_itens_nao_conforme: Number(i.qtd_itens_nao_conforme),
        }))

      const conteudo = {
        inspecoes: inspecoesFiltradas,
      }

      const dataRefFormatted =
        typeof data.data_referencia === 'string'
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
            <Button type="button" variant="outline" size="sm" onClick={() => append(defaultInspecaoLine())}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Adicionar Linha
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-3 p-3 rounded-lg bg-muted/20 border border-border md:grid-cols-2 xl:grid-cols-[minmax(8.5rem,1fr)_repeat(3,minmax(0,1fr))_auto] xl:gap-x-4 xl:items-start"
            >
              <FormField label="Viatura" required error={errors.inspecoes?.[index]?.viatura?.message}>
                <Controller
                  name={`inspecoes.${index}.viatura`}
                  control={control}
                  render={({ field: f }) => (
                    <Select {...f} disabled={readOnly} className={readOnly ? 'bg-muted' : ''}>
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
                label="Quantidade de inspeções"
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
                label="Quantidade de itens inspecionados"
                required
                error={errors.inspecoes?.[index]?.qtd_itens_inspecionados?.message}
              >
                <Input
                  type="number"
                  min="0"
                  {...register(`inspecoes.${index}.qtd_itens_inspecionados`, { valueAsNumber: true })}
                  disabled={readOnly}
                  className={readOnly ? 'bg-muted' : ''}
                />
              </FormField>

              <FormField
                label="Itens inspecionados não conforme"
                required
                error={errors.inspecoes?.[index]?.qtd_itens_nao_conforme?.message}
              >
                <Input
                  type="number"
                  min="0"
                  {...register(`inspecoes.${index}.qtd_itens_nao_conforme`, { valueAsNumber: true })}
                  disabled={readOnly}
                  className={readOnly ? 'bg-muted' : ''}
                />
              </FormField>

              <div className="flex items-end justify-end xl:justify-center pb-0.5">
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
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
