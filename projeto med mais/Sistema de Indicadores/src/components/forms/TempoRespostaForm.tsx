import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeMMSS, validateMMSS } from '@/lib/masks'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'
import { useColaboradores } from '@/hooks/useColaboradores'

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

const afericaoSchema = z.object({
  viatura: z.enum(VIATURAS, {
    required_error: 'Selecione uma viatura',
  }),
  motorista: z.string().min(1, 'Nome do motorista é obrigatório'),
  local: z.string().min(1, 'Local é obrigatório'),
  tempo: z.string().refine((val) => validateMMSS(val, 4), 'Formato inválido (mm:ss, máx 04:59)'),
})

const tempoRespostaSchema = z.object({
  afericoes: z.array(afericaoSchema).min(1, 'Adicione pelo menos uma aferição'),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type TempoRespostaFormData = z.infer<typeof tempoRespostaSchema>

interface TempoRespostaFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function TempoRespostaForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: TempoRespostaFormProps) {
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

  const initialAfericoes = initialData?.afericoes && Array.isArray(initialData.afericoes)
    ? (initialData.afericoes as Array<Record<string, unknown>>).map((a) => ({
        viatura: (a.viatura as typeof VIATURAS[number]) || undefined,
        motorista: (a.motorista as string) || '',
        local: (a.local as string) || '',
        tempo: (a.tempo as string) || '',
      }))
    : Array(4).fill(null).map(() => ({ viatura: undefined, motorista: '', local: '', tempo: '' }))

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TempoRespostaFormData>({
    resolver: zodResolver(tempoRespostaSchema),
    defaultValues: {
      afericoes: initialAfericoes,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'afericoes',
  })

  // Buscar colaboradores da base para o Select de motorista
  const { data: colaboradores } = useColaboradores(finalBaseId || null)

  const onSubmit = async (data: TempoRespostaFormData) => {
    try {
      const afericoesFiltradas = data.afericoes.filter((a) => a.viatura)

      const conteudo = {
        afericoes: afericoesFiltradas,
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
        <CardTitle>Tempo Resposta</CardTitle>
        <CardDescription>
          Lista de aferições de tempo de resposta das viaturas
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
              <Label>Aferições</Label>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ viatura: '' as any, motorista: '', local: '', tempo: '' })}
                >
                  Adicionar Linha
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border rounded-md items-start">
                  <div className="space-y-1">
                    <Label className="text-xs">Viatura *</Label>
                    <Controller
                      name={`afericoes.${index}.viatura`}
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
                    {errors.afericoes?.[index]?.viatura && (
                      <p className="text-xs text-destructive">{errors.afericoes[index]?.viatura?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Motorista (BA-MC) *</Label>
                    <Controller
                      name={`afericoes.${index}.motorista`}
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
                    {errors.afericoes?.[index]?.motorista && (
                      <p className="text-xs text-destructive">{errors.afericoes[index]?.motorista?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Local *</Label>
                    <Input
                      {...register(`afericoes.${index}.local`)}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.afericoes?.[index]?.local && (
                      <p className="text-xs text-destructive">{errors.afericoes[index]?.local?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tempo (mm:ss, máx 04:59) *</Label>
                    <Input
                      placeholder="01:30"
                      {...register(`afericoes.${index}.tempo`)}
                      onChange={(e) => {
                        const formatted = formatTimeMMSS(e.target.value, 4)
                        setValue(`afericoes.${index}.tempo`, formatted)
                      }}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.afericoes?.[index]?.tempo && (
                      <p className="text-xs text-destructive">{errors.afericoes[index]?.tempo?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1 flex items-end">
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        className="w-full"
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errors.afericoes && (
              <p className="text-sm text-destructive">{errors.afericoes.message}</p>
            )}
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white">
              {isLoading ? 'Salvando...' : 'Salvar Tempo Resposta'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
