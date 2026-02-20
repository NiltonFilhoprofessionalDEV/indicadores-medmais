import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeHHMM, validateHHMM } from '@/lib/masks'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'

const TIPOS_ATIVIDADE = [
  'Inspeção de extintores e mangueiras',
  'Inspeção de pista',
  'Inspeção de fauna',
  'Derramamento de combustível',
  'Acompanhamento de serviços',
  'Inspeção em área de cessionários',
  'Ronda TPS',
] as const

const atividadesAcessoriasSchema = z.object({
  tipo_atividade: z.enum(TIPOS_ATIVIDADE, {
    required_error: 'Selecione o tipo de atividade',
  }),
  qtd_equipamentos: z.number().min(0, 'Informe a quantidade'),
  qtd_bombeiros: z.number().min(1, 'Mínimo 1 bombeiro'),
  tempo_gasto: z.string().min(1, 'Tempo é obrigatório').refine(validateHHMM, 'Formato inválido (HH:mm)'),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type AtividadesAcessoriasFormData = z.infer<typeof atividadesAcessoriasSchema>

interface AtividadesAcessoriasFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function AtividadesAcessoriasForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: AtividadesAcessoriasFormProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia 
      ? normalizeDateToLocal(initialData.data_referencia as string)
      : getCurrentDateLocal()
  )

  const { authUser } = useAuth()
  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AtividadesAcessoriasFormData>({
    resolver: zodResolver(atividadesAcessoriasSchema),
    defaultValues: {
      tipo_atividade: (TIPOS_ATIVIDADE as readonly string[]).includes(String(initialData?.tipo_atividade ?? ''))
        ? (initialData?.tipo_atividade as typeof TIPOS_ATIVIDADE[number])
        : undefined,
      qtd_equipamentos: initialData?.qtd_equipamentos != null ? Number(initialData.qtd_equipamentos) : 0,
      qtd_bombeiros: initialData?.qtd_bombeiros != null ? Number(initialData.qtd_bombeiros) : 1,
      tempo_gasto: (initialData?.tempo_gasto as string) || '',
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const onSubmit = async (data: AtividadesAcessoriasFormData) => {
    try {
      const conteudo: Record<string, unknown> = {
        tipo_atividade: data.tipo_atividade,
        qtd_equipamentos: data.qtd_equipamentos,
        qtd_bombeiros: data.qtd_bombeiros,
        tempo_gasto: data.tempo_gasto,
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
        <CardTitle>Atividades Acessórias</CardTitle>
        <CardDescription>
          Preenchido sempre que realizado atividade no plantão.
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
            baseId={watch('base_id') ?? initialData?.base_id as string | undefined}
            equipeId={watch('equipe_id') ?? initialData?.equipe_id as string | undefined}
            onBaseIdChange={(baseId) => setValue('base_id', baseId)}
            onEquipeIdChange={(equipeId) => setValue('equipe_id', equipeId)}
            readOnly={readOnly}
          />

          <div className="space-y-2">
            <Label htmlFor="tipo_atividade">Tipo de Atividade *</Label>
            <Controller
              name="tipo_atividade"
              control={control}
              render={({ field }) => (
                <Select
                  id="tipo_atividade"
                  {...field}
                  disabled={readOnly}
                  className={`py-2.5 ${readOnly ? 'bg-muted' : ''}`}
                >
                  <option value="">Selecione o tipo de atividade</option>
                  {TIPOS_ATIVIDADE.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </Select>
              )}
            />
            {errors.tipo_atividade && (
              <p className="text-sm text-destructive">{errors.tipo_atividade.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qtd_equipamentos">Quantidade de Equipamentos *</Label>
              <Input
                id="qtd_equipamentos"
                type="number"
                min="0"
                {...register('qtd_equipamentos', { valueAsNumber: true })}
                disabled={readOnly}
                className={`py-2.5 ${readOnly ? 'bg-muted' : ''}`}
              />
              {errors.qtd_equipamentos && (
                <p className="text-sm text-destructive">{errors.qtd_equipamentos.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qtd_bombeiros">Quantidade de Bombeiros *</Label>
              <Input
                id="qtd_bombeiros"
                type="number"
                min="1"
                {...register('qtd_bombeiros', { valueAsNumber: true })}
                disabled={readOnly}
                className={`py-2.5 ${readOnly ? 'bg-muted' : ''}`}
              />
              {errors.qtd_bombeiros && (
                <p className="text-sm text-destructive">{errors.qtd_bombeiros.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tempo_gasto">Tempo Gasto (HH:mm) *</Label>
              <Input
                id="tempo_gasto"
                placeholder="01:30"
                {...register('tempo_gasto')}
                onChange={(e) => {
                  const formatted = formatTimeHHMM(e.target.value)
                  setValue('tempo_gasto', formatted)
                }}
                disabled={readOnly}
                className={`py-2.5 ${readOnly ? 'bg-muted' : ''}`}
              />
              {errors.tempo_gasto && (
                <p className="text-sm text-destructive">{errors.tempo_gasto.message}</p>
              )}
            </div>
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Salvando...' : 'Salvar Atividade'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
