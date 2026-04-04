import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeMMSS, validateMMSS } from '@/lib/masks'
import { calculateTPEPRStatus } from '@/lib/calculations'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormShell } from './FormShell'
import { BaseFormFields } from './BaseFormFields'
import { useColaboradores } from '@/hooks/useColaboradores'
import { Plus, Trash2 } from 'lucide-react'

const avaliadoSchemaLax = z.object({
  nome: z.string().optional().default(''),
  tempo: z.string().optional().default(''),
  status: z.string().optional(),
})

function isTempoTPEPRRowEmpty(r: { nome?: string; tempo?: string }) {
  const nome = String(r.nome ?? '').trim()
  const tempo = String(r.tempo ?? '').trim()
  return !nome && !tempo
}

function isTempoTPEPRRowComplete(r: { nome?: string; tempo?: string }) {
  const nome = String(r.nome ?? '').trim()
  const tempo = String(r.tempo ?? '').trim()
  return !!nome && !!tempo && validateMMSS(tempo, 4)
}

const tempoTPEPRSchema = z
  .object({
    avaliados: z.array(avaliadoSchemaLax),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) => data.avaliados.some((r) => isTempoTPEPRRowComplete(r)),
    { message: 'Preencha pelo menos um avaliado completamente para salvar.', path: ['avaliados'] }
  )
  .refine(
    (data) => data.avaliados.every((r) => isTempoTPEPRRowEmpty(r) || isTempoTPEPRRowComplete(r)),
    {
      message: 'Preencha todos os campos da linha (nome e tempo) ou deixe a linha em branco.',
      path: ['avaliados'],
    }
  )

type TempoTPEPRFormData = z.infer<typeof tempoTPEPRSchema>

interface TempoTPEPRFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function TempoTPEPRForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: TempoTPEPRFormProps) {
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
        tempo: (a.tempo as string) || '',
        status: (a.status as string) || '',
      }))
    : Array(10).fill(null).map(() => ({ nome: '', tempo: '', status: '' }))

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TempoTPEPRFormData>({
    resolver: zodResolver(tempoTPEPRSchema),
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

  const { data: colaboradores } = useColaboradores(finalBaseId || null)

  useEffect(() => {
    avaliados.forEach((avaliado, index) => {
      if (avaliado.tempo && validateMMSS(avaliado.tempo, 4)) {
        const status = calculateTPEPRStatus(avaliado.tempo)
        setValue(`avaliados.${index}.status`, status)
      }
    })
  }, [avaliados, setValue])

  const onSubmit = async (data: TempoTPEPRFormData) => {
    try {
      const avaliadosFiltrados = data.avaliados.filter((a) => isTempoTPEPRRowComplete(a))
      if (avaliadosFiltrados.length === 0) {
        alert('Preencha pelo menos um colaborador completamente para salvar.')
        return
      }

      const conteudo = {
        avaliados: avaliadosFiltrados,
      }

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
      title="Tempo TP/EPR"
      description="Lista de avaliados com cálculo automático de status"
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Tempo TP/EPR"
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
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Avaliados</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tempo em mm:ss (máx. 04:59). O status é calculado automaticamente.</p>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ nome: '', tempo: '', status: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Linha
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground w-9">#</th>
                <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground min-w-0">Colaborador</th>
                <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground w-32">Tempo (mm:ss)</th>
                <th className="text-left p-2.5 text-xs font-semibold text-muted-foreground w-28">Status</th>
                {!readOnly && <th className="p-2.5 w-10" />}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr key={field.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                  <td className="p-2 text-sm text-muted-foreground font-mono align-middle">{index + 1}</td>
                  <td className="p-2 align-middle min-w-0">
                    <Controller
                      name={`avaliados.${index}.nome`}
                      control={control}
                      render={({ field: f }) => (
                        <Select
                          {...f}
                          disabled={readOnly || !finalBaseId}
                          className={`w-full ${readOnly ? 'bg-muted' : ''}`}
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
                    {errors.avaliados?.[index]?.nome?.message && (
                      <p className="text-xs text-destructive mt-0.5">{errors.avaliados[index].nome?.message}</p>
                    )}
                  </td>
                  <td className="p-2 align-middle">
                    <Input
                      placeholder="00:45"
                      {...register(`avaliados.${index}.tempo`)}
                      onChange={(e) => {
                        const formatted = formatTimeMMSS(e.target.value, 4)
                        setValue(`avaliados.${index}.tempo`, formatted)
                        if (formatted && validateMMSS(formatted, 4)) {
                          setValue(`avaliados.${index}.status`, calculateTPEPRStatus(formatted))
                        } else if (!formatted) {
                          setValue(`avaliados.${index}.status`, '')
                        }
                      }}
                      disabled={readOnly}
                      className={`text-center font-mono w-full ${readOnly ? 'bg-muted' : ''}`}
                    />
                    {errors.avaliados?.[index]?.tempo?.message && (
                      <p className="text-xs text-destructive mt-0.5">{errors.avaliados[index].tempo?.message}</p>
                    )}
                  </td>
                  <td className="p-2 align-middle">
                    <Input
                      value={avaliados[index]?.status || ''}
                      readOnly
                      className="bg-muted/60 text-muted-foreground text-sm w-full border-0 cursor-default"
                      tabIndex={-1}
                    />
                  </td>
                  {!readOnly && (
                    <td className="p-2 align-middle text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
        </div>

        {errors.avaliados?.message && (
          <p className="text-xs text-destructive font-medium">{errors.avaliados.message}</p>
        )}
      </div>
    </FormShell>
  )
}
