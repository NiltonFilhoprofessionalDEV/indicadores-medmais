import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { calculatePercentage } from '@/lib/calculations'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BaseFormFields } from './BaseFormFields'
import { useColaboradores } from '@/hooks/useColaboradores'

// Converte NaN (campo numérico vazio) em undefined para validação
const optionalNumber = z
  .union([
    z.nan().transform(() => undefined),
    z.number(),
    z.undefined(),
  ])
  .optional()

const colaboradorSchema = z.object({
  nome: z.string(),
  epi_entregue: optionalNumber,
  epi_previsto: optionalNumber,
  unif_entregue: optionalNumber,
  unif_previsto: optionalNumber,
  total_epi_pct: z.number().optional(),
  total_unif_pct: z.number().optional(),
}).refine(
  (data) => {
    // Se nome está vazio, não validar os outros campos
    if (!data.nome || data.nome.trim() === '') {
      return true
    }
    // Se nome está preenchido, validar todos os campos obrigatórios (não undefined, não NaN)
    const epiEnt = data.epi_entregue
    const epiPrev = data.epi_previsto
    const unifEnt = data.unif_entregue
    const unifPrev = data.unif_previsto
    return (
      epiEnt !== undefined &&
      epiPrev !== undefined &&
      unifEnt !== undefined &&
      unifPrev !== undefined &&
      !Number.isNaN(epiEnt) &&
      !Number.isNaN(epiPrev) &&
      !Number.isNaN(unifEnt) &&
      !Number.isNaN(unifPrev) &&
      epiEnt >= 0 &&
      epiPrev >= 1 &&
      unifEnt >= 0 &&
      unifPrev >= 1
    )
  },
  {
    message: 'Preencha todos os campos obrigatórios (EPI e Unif. entregues/previstos) para cada colaborador',
    path: ['nome'],
  }
)

const controleEPISchema = z.object({
  colaboradores: z.array(colaboradorSchema).min(1, 'Adicione pelo menos um colaborador'),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
}).refine(
  (data) => {
    // Filtrar colaboradores com nome preenchido
    const colaboradoresComNome = data.colaboradores.filter((c) => c.nome.trim() !== '')
    return colaboradoresComNome.length > 0
  },
  {
    message: 'Adicione pelo menos um colaborador com nome preenchido',
    path: ['colaboradores'],
  }
)

type ControleEPIFormData = z.infer<typeof controleEPISchema>

interface ControleEPIFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function ControleEPIForm({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: ControleEPIFormProps) {
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

  const initialColaboradores = initialData?.colaboradores && Array.isArray(initialData.colaboradores)
    ? (initialData.colaboradores as Array<Record<string, unknown>>).map((c) => ({
        nome: (c.nome as string) || '',
        epi_entregue: c.epi_entregue ? Number(c.epi_entregue) : undefined,
        epi_previsto: c.epi_previsto ? Number(c.epi_previsto) : undefined,
        unif_entregue: c.unif_entregue ? Number(c.unif_entregue) : undefined,
        unif_previsto: c.unif_previsto ? Number(c.unif_previsto) : undefined,
        total_epi_pct: c.total_epi_pct ? Number(c.total_epi_pct) : 0,
        total_unif_pct: c.total_unif_pct ? Number(c.total_unif_pct) : 0,
      }))
    : Array(10).fill(null).map(() => ({
        nome: '',
        epi_entregue: undefined,
        epi_previsto: undefined,
        unif_entregue: undefined,
        unif_previsto: undefined,
        total_epi_pct: 0,
        total_unif_pct: 0,
      }))

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ControleEPIFormData>({
    resolver: zodResolver(controleEPISchema),
    defaultValues: {
      colaboradores: initialColaboradores,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'colaboradores',
  })

  const colaboradores = watch('colaboradores')

  // Buscar colaboradores da base para o Select
  const { data: colaboradoresLista } = useColaboradores(finalBaseId || null)

  // Sincronizar percentuais no form state (para o submit) quando os valores mudam
  useEffect(() => {
    colaboradores.forEach((colaborador, index) => {
      const epiEnt = colaborador.epi_entregue
      const epiPrev = colaborador.epi_previsto
      const unifEnt = colaborador.unif_entregue
      const unifPrev = colaborador.unif_previsto
      if (epiEnt != null && epiPrev != null && !Number.isNaN(epiEnt) && !Number.isNaN(epiPrev) && epiPrev > 0) {
        setValue(`colaboradores.${index}.total_epi_pct`, calculatePercentage(Number(epiEnt), Number(epiPrev)))
      }
      if (unifEnt != null && unifPrev != null && !Number.isNaN(unifEnt) && !Number.isNaN(unifPrev) && unifPrev > 0) {
        setValue(`colaboradores.${index}.total_unif_pct`, calculatePercentage(Number(unifEnt), Number(unifPrev)))
      }
    })
  }, [colaboradores, setValue])

  const onSubmit = async (data: ControleEPIFormData) => {
    try {
      // Filtrar apenas colaboradores com nome preenchido
      const colaboradoresFiltrados = data.colaboradores
        .filter((c) => c.nome && c.nome.trim() !== '')
        .map((c) => ({
          nome: c.nome.trim(),
          epi_entregue: c.epi_entregue ?? 0,
          epi_previsto: c.epi_previsto ?? 1,
          unif_entregue: c.unif_entregue ?? 0,
          unif_previsto: c.unif_previsto ?? 1,
          total_epi_pct: c.total_epi_pct ?? 0,
          total_unif_pct: c.total_unif_pct ?? 0,
        }))

      // Validar se há pelo menos um colaborador válido
      if (colaboradoresFiltrados.length === 0) {
        alert('Adicione pelo menos um colaborador com nome preenchido')
        return
      }

      // Validar se todos os colaboradores filtrados têm todos os campos obrigatórios válidos
      const colaboradoresInvalidos = colaboradoresFiltrados.filter(
        (c) =>
          isNaN(c.epi_entregue) ||
          isNaN(c.epi_previsto) ||
          isNaN(c.unif_entregue) ||
          isNaN(c.unif_previsto) ||
          c.epi_entregue < 0 ||
          c.epi_previsto < 1 ||
          c.unif_entregue < 0 ||
          c.unif_previsto < 1
      )

      if (colaboradoresInvalidos.length > 0) {
        alert('Preencha todos os campos obrigatórios corretamente para cada colaborador')
        return
      }

      const conteudo = {
        colaboradores: colaboradoresFiltrados,
      }

      // CORREÇÃO TIMEZONE: Converter data para formato de armazenamento antes de enviar
      const dataRefFormatted = typeof data.data_referencia === 'string' 
        ? data.data_referencia 
        : formatDateForStorage(new Date(data.data_referencia))

      await saveLancamento({
        dataReferencia: dataRefFormatted,
        indicadorId,
        conteudo,
        baseId: (data.base_id || authUser?.profile?.base_id) ?? undefined,
        equipeId: (data.equipe_id || authUser?.profile?.equipe_id) ?? undefined,
      })

      // Sucesso - chamar callback
      onSuccess?.()
    } catch (error) {
      console.error('Erro ao salvar Controle de EPI:', error)
      handleSaveError(error, { onSuccess, navigate })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Controle de EPI</CardTitle>
        <CardDescription>
          Lista de colaboradores com controle de EPI e uniformes entregues
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit, (err) => {
            const msg =
              err.colaboradores?.message ||
              (Array.isArray(err.colaboradores)
                ? err.colaboradores.find((r: { nome?: { message?: string } }) => r?.nome?.message)?.nome?.message
                : null) ||
              err.data_referencia?.message
            if (msg) alert(`Verifique o formulário: ${msg}`)
          })}
          className="space-y-6"
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
              <Label>Colaboradores</Label>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      nome: '',
                      epi_entregue: 0,
                      epi_previsto: 1,
                      unif_entregue: 0,
                      unif_previsto: 1,
                      total_epi_pct: 0,
                      total_unif_pct: 0,
                    })
                  }
                >
                  Adicionar Linha
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const col = colaboradores[index]
                const epiEnt = col?.epi_entregue
                const epiPrev = col?.epi_previsto
                const unifEnt = col?.unif_entregue
                const unifPrev = col?.unif_previsto
                const pctEPI =
                  epiEnt != null && epiPrev != null && !Number.isNaN(epiEnt) && !Number.isNaN(epiPrev) && epiPrev > 0
                    ? calculatePercentage(Number(epiEnt), Number(epiPrev))
                    : 0
                const pctUnif =
                  unifEnt != null && unifPrev != null && !Number.isNaN(unifEnt) && !Number.isNaN(unifPrev) && unifPrev > 0
                    ? calculatePercentage(Number(unifEnt), Number(unifPrev))
                    : 0
                return (
                <div key={field.id} className="p-3 border rounded-md space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome *</Label>
                      <Controller
                        name={`colaboradores.${index}.nome`}
                        control={control}
                        render={({ field }) => (
                          <Select
                            {...field}
                            disabled={readOnly || !finalBaseId}
                            className={readOnly ? 'bg-muted' : ''}
                          >
                            <option value="">Selecione um colaborador</option>
                            {colaboradoresLista
                              ?.filter((c) => c.ativo)
                              .map((colaborador) => (
                                <option key={colaborador.id} value={colaborador.nome}>
                                  {colaborador.nome}
                                </option>
                              ))}
                          </Select>
                        )}
                      />
                      {errors.colaboradores?.[index]?.nome && (
                        <p className="text-xs text-destructive">{errors.colaboradores[index]?.nome?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">EPI Entregue *</Label>
                      <Input
                        type="number"
                        min="0"
                        {...register(`colaboradores.${index}.epi_entregue`, { 
                          valueAsNumber: true,
                          validate: (value) => {
                            if (!colaboradores[index]?.nome?.trim()) return true // Ignorar validação se nome estiver vazio
                            if (value === undefined || value === null || isNaN(value)) return 'Campo obrigatório'
                            return value >= 0 || 'Quantidade deve ser maior ou igual a 0'
                          }
                        })}
                        disabled={readOnly}
                        className={readOnly ? 'bg-muted' : ''}
                      />
                      {errors.colaboradores?.[index]?.epi_entregue && (
                        <p className="text-xs text-destructive">{errors.colaboradores[index]?.epi_entregue?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">EPI Previsto *</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register(`colaboradores.${index}.epi_previsto`, { 
                          valueAsNumber: true,
                          validate: (value) => {
                            if (!colaboradores[index]?.nome?.trim()) return true // Ignorar validação se nome estiver vazio
                            if (value === undefined || value === null || isNaN(value)) return 'Campo obrigatório'
                            return value >= 1 || 'Quantidade prevista deve ser maior que 0'
                          }
                        })}
                        disabled={readOnly}
                        className={readOnly ? 'bg-muted' : ''}
                      />
                      {errors.colaboradores?.[index]?.epi_previsto && (
                        <p className="text-xs text-destructive">{errors.colaboradores[index]?.epi_previsto?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">% EPI</Label>
                      <Input value={`${pctEPI}%`} readOnly className="bg-muted" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Unif. Entregue *</Label>
                      <Input
                        type="number"
                        min="0"
                        {...register(`colaboradores.${index}.unif_entregue`, { 
                          valueAsNumber: true,
                          validate: (value) => {
                            if (!colaboradores[index]?.nome?.trim()) return true // Ignorar validação se nome estiver vazio
                            if (value === undefined || value === null || isNaN(value)) return 'Campo obrigatório'
                            return value >= 0 || 'Quantidade deve ser maior ou igual a 0'
                          }
                        })}
                        disabled={readOnly}
                        className={readOnly ? 'bg-muted' : ''}
                      />
                      {errors.colaboradores?.[index]?.unif_entregue && (
                        <p className="text-xs text-destructive">{errors.colaboradores[index]?.unif_entregue?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Unif. Previsto *</Label>
                      <Input
                        type="number"
                        min="1"
                        {...register(`colaboradores.${index}.unif_previsto`, { 
                          valueAsNumber: true,
                          validate: (value) => {
                            if (!colaboradores[index]?.nome?.trim()) return true // Ignorar validação se nome estiver vazio
                            if (value === undefined || value === null || isNaN(value)) return 'Campo obrigatório'
                            return value >= 1 || 'Quantidade prevista deve ser maior que 0'
                          }
                        })}
                        disabled={readOnly}
                        className={readOnly ? 'bg-muted' : ''}
                      />
                      {errors.colaboradores?.[index]?.unif_previsto && (
                        <p className="text-xs text-destructive">{errors.colaboradores[index]?.unif_previsto?.message}</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">% Unif.</Label>
                      <Input value={`${pctUnif}%`} readOnly className="bg-muted" />
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
                </div>
              )
              })}
            </div>

            {errors.colaboradores && (
              <p className="text-sm text-destructive">{errors.colaboradores.message}</p>
            )}
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isLoading} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white">
              {isLoading ? 'Salvando...' : 'Salvar Controle de EPI'}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
