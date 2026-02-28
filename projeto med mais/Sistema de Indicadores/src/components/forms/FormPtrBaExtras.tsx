import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeHHMM, validateHHMM } from '@/lib/masks'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { FormShell } from './FormShell'
import { BaseFormFields } from './BaseFormFields'
import { useColaboradores } from '@/hooks/useColaboradores'
import { Trash2, Plus, Users } from 'lucide-react'

const participanteSchema = z.object({
  nome: z.string().optional().default(''),
  horas: z.string().optional().default(''),
})

const ptrBaExtrasSchema = z
  .object({
    participantes: z.array(participanteSchema),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) => {
      const completos = data.participantes.filter(
        (p) => String(p.nome ?? '').trim() && validateHHMM(p.horas ?? '')
      )
      return completos.length > 0
    },
    {
      message: 'Preencha pelo menos uma linha com colaborador e horas válidas (HH:mm).',
      path: ['participantes'],
    }
  )

type FormPtrBaExtrasData = z.infer<typeof ptrBaExtrasSchema>

const INICIAL_LINHAS = 10

function migrateInitialData(initialData?: Record<string, unknown>): {
  participantes: { nome: string; horas: string }[]
} {
  const part = initialData?.participantes as Array<{ nome?: string; horas?: string }> | undefined
  if (Array.isArray(part) && part.length > 0) {
    return {
      participantes: part.map((p) => ({
        nome: String(p.nome ?? ''),
        horas: String(p.horas ?? ''),
      })),
    }
  }
  return {
    participantes: Array.from({ length: INICIAL_LINHAS }, () => ({ nome: '', horas: '' })),
  }
}

interface FormPtrBaExtrasProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function FormPtrBaExtras({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: FormPtrBaExtrasProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()

  const migrated = useMemo(() => migrateInitialData(initialData), [initialData])
  const initialParticipantes =
    migrated.participantes.length > 0 ? migrated.participantes : Array.from({ length: INICIAL_LINHAS }, () => ({ nome: '', horas: '' }))

  const finalBaseId = (initialData?.base_id as string | undefined) || authUser?.profile?.base_id || ''
  const finalEquipeId = (initialData?.equipe_id as string | undefined) || authUser?.profile?.equipe_id || ''

  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia
      ? normalizeDateToLocal(initialData.data_referencia as string)
      : getCurrentDateLocal()
  )

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormPtrBaExtrasData>({
    resolver: zodResolver(ptrBaExtrasSchema),
    defaultValues: {
      participantes: initialParticipantes,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'participantes' })
  const { data: colaboradores } = useColaboradores(finalBaseId || null)

  const onSubmit = async (data: FormPtrBaExtrasData) => {
    try {
      const participantes = data.participantes
        .filter((p) => String(p.nome ?? '').trim() && validateHHMM(p.horas ?? ''))
        .map((p) => ({
          nome: String(p.nome).trim(),
          horas: p.horas ?? '00:00',
        }))

      if (participantes.length === 0) {
        return
      }

      const dataRefFormatted =
        typeof data.data_referencia === 'string'
          ? data.data_referencia
          : formatDateForStorage(new Date(data.data_referencia))

      await saveLancamento({
        id: initialData?.id as string | undefined,
        dataReferencia: dataRefFormatted,
        indicadorId,
        conteudo: { participantes },
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
      title="PTR-BA Extras"
      description="Registro de carga horária complementar. Preencha colaborador e horas por linha."
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar PTR-BA Extras"
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
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Colaboradores e horas</h3>
          </div>
          {!readOnly && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ nome: '', horas: '' })}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar linha
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-8">#</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">
                  Colaborador
                </th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-28">
                  Horas
                </th>
                {!readOnly && <th className="p-3 w-10" />}
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr
                  key={field.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-3 text-sm text-muted-foreground font-mono">{index + 1}</td>
                  <td className="p-2">
                    <Select
                      {...register(`participantes.${index}.nome`)}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    >
                      <option value="">Selecione</option>
                      {colaboradores
                        ?.filter((c) => c.ativo)
                        .map((c) => (
                          <option key={c.id} value={c.nome}>
                            {c.nome}
                          </option>
                        ))}
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="HH:mm"
                      {...register(`participantes.${index}.horas`)}
                      onChange={(e) =>
                        setValue(`participantes.${index}.horas`, formatTimeHHMM(e.target.value))
                      }
                      disabled={readOnly}
                      className={`text-center font-mono ${readOnly ? 'bg-muted' : ''}`}
                    />
                  </td>
                  {!readOnly && (
                    <td className="p-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
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

        {errors.participantes?.message && (
          <p className="text-xs text-destructive font-medium">{errors.participantes.message}</p>
        )}
      </div>
    </FormShell>
  )
}
