import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useLancamento } from '@/hooks/useLancamento'
import { useAuth } from '@/hooks/useAuth'
import { formatTimeHHMM, validateHHMM } from '@/lib/masks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'

const participanteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  horas: z.string().refine(validateHHMM, 'Formato inválido (HH:mm)'),
})

const horasTreinamentoSchema = z.object({
  participantes: z.array(participanteSchema).min(1, 'Adicione pelo menos um participante'),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type HorasTreinamentoFormData = z.infer<typeof horasTreinamentoSchema>

interface HorasTreinamentoFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function HorasTreinamentoForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: HorasTreinamentoFormProps) {
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia ? new Date(initialData.data_referencia as string).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )

  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const initialParticipantes = initialData?.participantes && Array.isArray(initialData.participantes)
    ? (initialData.participantes as Array<Record<string, unknown>>).map((p) => ({
        nome: (p.nome as string) || '',
        horas: (p.horas as string) || '',
      }))
    : Array(10).fill(null).map(() => ({ nome: '', horas: '' }))

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<HorasTreinamentoFormData>({
    resolver: zodResolver(horasTreinamentoSchema),
    defaultValues: {
      participantes: initialParticipantes,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'participantes',
  })

  const onSubmit = async (data: HorasTreinamentoFormData) => {
    try {
      const participantesFiltrados = data.participantes.filter((p) => p.nome.trim() !== '')

      const conteudo = {
        participantes: participantesFiltrados,
      }

      await saveLancamento({
        dataReferencia: data.data_referencia,
        indicadorId,
        conteudo,
        baseId: data.base_id,
        equipeId: data.equipe_id,
      })

      onSuccess?.()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar Horas de Treinamento. Tente novamente.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horas de Treinamento Mensal</CardTitle>
        <CardDescription>
          Lista de participantes com horas de treinamento
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
              <Label>Participantes</Label>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ nome: '', horas: '' })}
                >
                  Adicionar Linha
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 border rounded-md">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome *</Label>
                    <Input
                      {...register(`participantes.${index}.nome`)}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.participantes?.[index]?.nome && (
                      <p className="text-xs text-destructive">{errors.participantes[index]?.nome?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Horas (HH:mm) *</Label>
                    <Input
                      placeholder="02:30"
                      {...register(`participantes.${index}.horas`)}
                      onChange={(e) => {
                        const formatted = formatTimeHHMM(e.target.value)
                        setValue(`participantes.${index}.horas`, formatted)
                      }}
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                    {errors.participantes?.[index]?.horas && (
                      <p className="text-xs text-destructive">{errors.participantes[index]?.horas?.message}</p>
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

            {errors.participantes && (
              <p className="text-sm text-destructive">{errors.participantes.message}</p>
            )}
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Salvando...' : 'Salvar Horas de Treinamento'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
