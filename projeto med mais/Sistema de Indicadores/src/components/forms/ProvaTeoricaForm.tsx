import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { calculateProvaTeoricaStatus } from '@/lib/calculations'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'
import { useColaboradores } from '@/hooks/useColaboradores'

const avaliadoSchemaLax = z.object({
  nome: z.string().optional().default(''),
  nota: z.union([z.number(), z.undefined(), z.nan()]).optional(),
  status: z.string().optional(),
})

function isProvaTeoricaRowEmpty(r: { nome?: string; nota?: number }) {
  const nome = String(r.nome ?? '').trim()
  const nota = r.nota
  return !nome && (nota == null || Number.isNaN(nota))
}

function isProvaTeoricaRowComplete(r: { nome?: string; nota?: number }) {
  const nome = String(r.nome ?? '').trim()
  const nota = r.nota != null && !Number.isNaN(r.nota) ? r.nota : null
  return !!nome && nota != null && nota >= 0 && nota <= 10
}

const provaTeoricaSchema = z
  .object({
    avaliados: z.array(avaliadoSchemaLax),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) => data.avaliados.some((r) => isProvaTeoricaRowComplete(r)),
    { message: 'Preencha pelo menos um avaliado completamente para salvar.', path: ['avaliados'] }
  )
  .refine(
    (data) => data.avaliados.every((r) => isProvaTeoricaRowEmpty(r) || isProvaTeoricaRowComplete(r)),
    {
      message: 'Preencha todos os campos da linha (nome e nota) ou deixe a linha em branco.',
      path: ['avaliados'],
    }
  )

type ProvaTeoricaFormData = z.infer<typeof provaTeoricaSchema>

interface ProvaTeoricaFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function ProvaTeoricaForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: ProvaTeoricaFormProps) {
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

  const initialAvaliados = initialData?.avaliados && Array.isArray(initialData.avaliados)
    ? (initialData.avaliados as Array<Record<string, unknown>>).map((a) => ({
        nome: (a.nome as string) || '',
        nota: a.nota ? Number(a.nota) : undefined,
        status: (a.status as string) || '',
      }))
    : Array(10).fill(null).map(() => ({ nome: '', nota: undefined, status: '' }))

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProvaTeoricaFormData>({
    resolver: zodResolver(provaTeoricaSchema),
    defaultValues: {
      avaliados: initialAvaliados,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'avaliados',
  })

  const avaliados = watch('avaliados')

  // Buscar colaboradores da base para o Select
  const { data: colaboradores } = useColaboradores(finalBaseId || null)

  // Calcular status automaticamente quando nota mudar
  useEffect(() => {
    avaliados.forEach((avaliado, index) => {
      if (avaliado.nota !== undefined && avaliado.nota !== null) {
        const status = calculateProvaTeoricaStatus(avaliado.nota)
        setValue(`avaliados.${index}.status`, status)
      }
    })
  }, [avaliados, setValue])

  const onSubmit = async (data: ProvaTeoricaFormData) => {
    try {
      const avaliadosFiltrados = data.avaliados.filter((a) => isProvaTeoricaRowComplete(a))
      if (avaliadosFiltrados.length === 0) {
        alert('Preencha pelo menos um colaborador completamente para salvar.')
        return
      }

      const conteudo = {
        avaliados: avaliadosFiltrados,
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
        <CardTitle>Prova Teórica (PTR-BA)</CardTitle>
        <CardDescription>
          Lista de avaliados com cálculo automático de status baseado na nota
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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Avaliados</Label>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ nome: '', nota: 0, status: '' })}
                >
                  Adicionar Linha
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded-md">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome *</Label>
                    <Controller
                      name={`avaliados.${index}.nome`}
                      control={control}
                      render={({ field }) => (
                        <Select
                          {...field}
                          disabled={readOnly || !finalBaseId}
                          className={readOnly ? 'bg-muted' : ''}
                        >
                          <option value="">Selecione um colaborador</option>
                          {colaboradores
                            ?.filter((c) => c.ativo)
                            .map((colaborador) => (
                              <option key={colaborador.id} value={colaborador.nome}>
                                {colaborador.nome}
                              </option>
                            ))}
                        </Select>
                      )}
                    />
                    {errors.avaliados?.[index]?.nome && (
                      <p className="text-xs text-destructive">{errors.avaliados[index]?.nome?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Nota (0.0 a 10.0) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      {...register(`avaliados.${index}.nota`, { valueAsNumber: true })}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.avaliados?.[index]?.nota && (
                      <p className="text-xs text-destructive">{errors.avaliados[index]?.nota?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Input
                      value={
                        (() => {
                          const nota = avaliados[index]?.nota
                          if (typeof nota === 'number' && !Number.isNaN(nota)) {
                            return calculateProvaTeoricaStatus(nota)
                          }
                          return avaliados[index]?.status || ''
                        })()
                      }
                      readOnly
                      className="bg-muted"
                    />
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

            {errors.avaliados && (
              <p className="text-sm text-destructive">{errors.avaliados.message}</p>
            )}
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white">
              {isLoading ? 'Salvando...' : 'Salvar Prova Teórica'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
