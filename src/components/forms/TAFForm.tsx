import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useLancamento } from '@/hooks/useLancamento'
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
      alert('Erro ao salvar TAF. Tente novamente.')
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
            equipeId={finalEquipeId}
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

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-md">
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
                    <Label className="text-xs">Idade *</Label>
                    <Input
                      type="number"
                      min="1"
                      {...register(`avaliados.${index}.idade`, { valueAsNumber: true })}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.avaliados?.[index]?.idade && (
                      <p className="text-xs text-destructive">{errors.avaliados[index]?.idade?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tempo (mm:ss) *</Label>
                    <Input
                      placeholder="02:30"
                      {...register(`avaliados.${index}.tempo`)}
                      onChange={(e) => {
                        const formatted = formatTimeMMSS(e.target.value, 4)
                        setValue(`avaliados.${index}.tempo`, formatted)
                      }}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.avaliados?.[index]?.tempo && (
                      <p className="text-xs text-destructive">{errors.avaliados[index]?.tempo?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Input
                      value={avaliados[index]?.status || ''}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Nota</Label>
                    <Input
                      value={avaliados[index]?.nota || ''}
                      readOnly
                      className="bg-muted"
                    />
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        className="mt-2 w-full"
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
              {isLoading ? 'Salvando...' : 'Salvar TAF'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
