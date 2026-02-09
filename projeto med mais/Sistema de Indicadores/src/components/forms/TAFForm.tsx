import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeMMSS, validateMMSS } from '@/lib/masks'
import { calculateTAFStatus } from '@/lib/calculations'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'
import { Trash2, CheckCircle2 } from 'lucide-react'
import { useColaboradores } from '@/hooks/useColaboradores'

const avaliadoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  idade: z.number().min(1, 'Idade deve ser maior que 0'),
  tempo: z.string().refine((val) => validateMMSS(val, 4), 'Formato inválido (mm:ss, máx 04:59)'),
  status: z.string().optional(),
  nota: z.number().optional(),
})

const tafSchema = z.object({
  avaliados: z.array(avaliadoSchema).min(1, 'Adicione pelo menos um avaliado'),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type TAFFormData = z.infer<typeof tafSchema>

interface TAFFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function TAFForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: TAFFormProps) {
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

  // Inicializar com 10 linhas vazias ou dados existentes
  const initialAvaliados = initialData?.avaliados && Array.isArray(initialData.avaliados)
    ? (initialData.avaliados as Array<Record<string, unknown>>).map((a) => ({
        nome: (a.nome as string) || '',
        idade: a.idade ? Number(a.idade) : undefined,
        tempo: (a.tempo as string) || '',
        status: (a.status as string) || '',
        nota: a.nota ? Number(a.nota) : undefined,
      }))
    : Array(10).fill(null).map(() => ({ nome: '', idade: undefined, tempo: '', status: '', nota: undefined }))

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TAFFormData>({
    resolver: zodResolver(tafSchema),
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

  // Calcular status automaticamente quando idade ou tempo mudarem
  useEffect(() => {
    avaliados.forEach((avaliado, index) => {
      if (avaliado.idade && avaliado.tempo && validateMMSS(avaliado.tempo, 4)) {
        const { status, nota } = calculateTAFStatus(avaliado.idade, avaliado.tempo)
        setValue(`avaliados.${index}.status`, status)
        if (nota !== undefined) {
          setValue(`avaliados.${index}.nota`, nota)
        }
      }
    })
  }, [avaliados, setValue])

  const onSubmit = async (data: TAFFormData) => {
    try {
      // Filtrar apenas avaliados com nome preenchido
      const avaliadosFiltrados = data.avaliados.filter((a) => a.nome.trim() !== '')

      const conteudo = {
        avaliados: avaliadosFiltrados,
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
      handleSaveError(error, { onSuccess, navigate })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de Aptidão Física (TAF)</CardTitle>
        <CardDescription>
          Lista de avaliados com cálculo automático de status baseado em idade e tempo
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
                  onClick={() => append({ nome: '', idade: 0, tempo: '', status: '', nota: 0 })}
                >
                  Adicionar Linha
                </Button>
              )}
            </div>

            {/* Tabela de Avaliados - Design Premium */}
            <div className="rounded-lg border overflow-hidden dark:border-slate-600">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700">
                    <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nome
                    </th>
                    <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Idade
                    </th>
                    <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tempo (mm:ss)
                    </th>
                    <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nota
                    </th>
                    {!readOnly && (
                      <th className="w-12 p-3"></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field, index) => (
                    <tr
                      key={field.id}
                      className="border-t border-border hover:bg-muted/30 dark:border-slate-600 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="p-3">
                        <Controller
                          name={`avaliados.${index}.nome`}
                          control={control}
                          render={({ field: f }) => (
                            <Select
                              {...f}
                              disabled={readOnly || !finalBaseId}
                              className={`w-full h-9 text-sm ${readOnly ? 'bg-muted' : ''}`}
                            >
                              <option value="">Selecione</option>
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
                          <p className="text-xs text-destructive mt-0.5">{errors.avaliados[index]?.nome?.message}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="1"
                          {...register(`avaliados.${index}.idade`, { valueAsNumber: true })}
                          disabled={readOnly}
                          className={`h-9 text-sm w-full max-w-[80px] ${readOnly ? 'bg-muted' : ''}`}
                        />
                        {errors.avaliados?.[index]?.idade && (
                          <p className="text-xs text-destructive mt-0.5">{errors.avaliados[index]?.idade?.message}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <Input
                          placeholder="02:30"
                          {...register(`avaliados.${index}.tempo`)}
                          onChange={(e) => {
                            const formatted = formatTimeMMSS(e.target.value, 4)
                            setValue(`avaliados.${index}.tempo`, formatted)
                          }}
                          disabled={readOnly}
                          className={`h-9 text-sm w-full max-w-[100px] ${readOnly ? 'bg-muted' : ''}`}
                        />
                        {errors.avaliados?.[index]?.tempo && (
                          <p className="text-xs text-destructive mt-0.5">{errors.avaliados[index]?.tempo?.message}</p>
                        )}
                      </td>
                      <td className="p-3">
                        <Input
                          value={avaliados[index]?.status || ''}
                          readOnly
                          className="h-9 text-sm bg-muted w-full max-w-[120px]"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={avaliados[index]?.nota || ''}
                          readOnly
                          className="h-9 text-sm bg-muted w-full max-w-[80px]"
                        />
                      </td>
                      {!readOnly && (
                        <td className="p-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Rodapé de resumo */}
              <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-gray-50 dark:bg-slate-700/50 border-t border-border dark:border-slate-600 text-sm">
                <span className="text-muted-foreground">
                  Total de avaliados: {avaliados.filter((a) => a?.nome?.trim()).length}
                </span>
                {avaliados.filter((a) => a?.nome?.trim()).length > 0 &&
                 !errors.avaliados?.message && (
                  <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Campos obrigatórios preenchidos
                  </span>
                )}
              </div>
            </div>

            {errors.avaliados && typeof errors.avaliados.message === 'string' && (
              <p className="text-sm text-destructive">{errors.avaliados.message}</p>
            )}
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Salvando...' : 'Salvar TAF'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
