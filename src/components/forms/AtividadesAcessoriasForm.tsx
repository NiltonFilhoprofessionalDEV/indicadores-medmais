import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeHHMM, validateHHMM } from '@/lib/masks'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { BaseFormFields } from './BaseFormFields'
import { FormShell, FormField } from './FormShell'

const PREFIX_ATIVIDADE_ESPECIFICADA = '[Atividade Especificada]: '

const TIPOS_ATIVIDADE = [
  'Inspeção de extintores e mangueiras',
  'Inspeção de pista',
  'Inspeção de fauna',
  'Derramamento de combustível',
  'Acompanhamento de serviços',
  'Inspeção em área de cessionários',
  'Ronda TPS',
  'Outras',
] as const

const atividadesAcessoriasSchema = z
  .object({
    tipo_atividade: z.enum(TIPOS_ATIVIDADE, { required_error: 'Selecione o tipo de atividade' }),
    especificacao_outras: z.string().optional(),
    qtd_equipamentos: z.number().min(0, 'Informe a quantidade'),
    qtd_bombeiros: z.number().min(1, 'Mínimo 1 bombeiro'),
    tempo_gasto: z.string().min(1, 'Tempo é obrigatório').refine(validateHHMM, 'Formato inválido (HH:mm)'),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) => data.tipo_atividade !== 'Outras' || (typeof data.especificacao_outras === 'string' && data.especificacao_outras.trim().length > 0),
    { message: 'Especifique o tipo de atividade', path: ['especificacao_outras'] }
  )

type AtividadesAcessoriasFormData = z.infer<typeof atividadesAcessoriasSchema>

interface AtividadesAcessoriasFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function AtividadesAcessoriasForm({ indicadorId, onSuccess, initialData, readOnly = false }: AtividadesAcessoriasFormProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia ? normalizeDateToLocal(initialData.data_referencia as string) : getCurrentDateLocal()
  )

  const { authUser } = useAuth()
  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const parseEspecificacaoFromObservacoes = (observacoes: unknown): string => {
    const obs = typeof observacoes === 'string' ? observacoes : ''
    if (!obs.startsWith(PREFIX_ATIVIDADE_ESPECIFICADA)) return obs.trim()
    const after = obs.slice(PREFIX_ATIVIDADE_ESPECIFICADA.length)
    const pipe = after.indexOf(' | ')
    return pipe >= 0 ? after.slice(0, pipe).trim() : after.trim()
  }

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<AtividadesAcessoriasFormData>({
    resolver: zodResolver(atividadesAcessoriasSchema),
    defaultValues: {
      tipo_atividade: (TIPOS_ATIVIDADE as readonly string[]).includes(String(initialData?.tipo_atividade ?? ''))
        ? (initialData?.tipo_atividade as typeof TIPOS_ATIVIDADE[number])
        : undefined,
      especificacao_outras: initialData?.tipo_atividade === 'Outras' ? parseEspecificacaoFromObservacoes(initialData?.observacoes) : '',
      qtd_equipamentos: initialData?.qtd_equipamentos != null ? Number(initialData.qtd_equipamentos) : 0,
      qtd_bombeiros: initialData?.qtd_bombeiros != null ? Number(initialData.qtd_bombeiros) : 1,
      tempo_gasto: (initialData?.tempo_gasto as string) || '',
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const tipoAtividade = watch('tipo_atividade')
  const isOutras = tipoAtividade === 'Outras'

  useEffect(() => {
    if (!isOutras) setValue('especificacao_outras', '')
  }, [isOutras, setValue])

  const onSubmit = async (data: AtividadesAcessoriasFormData) => {
    try {
      const conteudo: Record<string, unknown> = {
        tipo_atividade: data.tipo_atividade,
        qtd_equipamentos: data.qtd_equipamentos,
        qtd_bombeiros: data.qtd_bombeiros,
        tempo_gasto: data.tempo_gasto,
      }

      if (data.tipo_atividade === 'Outras' && data.especificacao_outras?.trim()) {
        const especificacao = data.especificacao_outras.trim()
        const rawObs = (initialData?.observacoes as string)?.trim() || ''
        const observacoesOriginais = rawObs.startsWith(PREFIX_ATIVIDADE_ESPECIFICADA)
          ? (() => { const after = rawObs.slice(PREFIX_ATIVIDADE_ESPECIFICADA.length); const i = after.indexOf(' | '); return i >= 0 ? after.slice(i + 3).trim() : '' })()
          : rawObs
        conteudo.observacoes = observacoesOriginais
          ? `${PREFIX_ATIVIDADE_ESPECIFICADA}${especificacao} | ${observacoesOriginais}`
          : `${PREFIX_ATIVIDADE_ESPECIFICADA}${especificacao}`
      }

      const dataRefFormatted = typeof data.data_referencia === 'string' ? data.data_referencia : formatDateForStorage(new Date(data.data_referencia))
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
      title="Atividades Acessórias"
      description="Preenchido sempre que realizada atividade no plantão"
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Atividade"
    >
      <BaseFormFields
        dataReferencia={dataReferencia}
        onDataChange={(date) => { setDataReferencia(date); setValue('data_referencia', date) }}
        baseId={watch('base_id') ?? initialData?.base_id as string | undefined}
        equipeId={watch('equipe_id') ?? initialData?.equipe_id as string | undefined}
        onBaseIdChange={(baseId) => setValue('base_id', baseId)}
        onEquipeIdChange={(equipeId) => setValue('equipe_id', equipeId)}
        readOnly={readOnly}
      />

      <FormField label="Tipo de Atividade" required error={errors.tipo_atividade?.message}>
        <Controller
          name="tipo_atividade"
          control={control}
          render={({ field }) => (
            <Select {...field} disabled={readOnly} className={readOnly ? 'bg-muted' : ''}>
              <option value="">Selecione o tipo</option>
              {TIPOS_ATIVIDADE.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            </Select>
          )}
        />
      </FormField>

      {isOutras && (
        <FormField label="Especifique o tipo de atividade" required error={errors.especificacao_outras?.message}>
          <Input {...register('especificacao_outras')} placeholder="Descreva a atividade" disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Qtd. Equipamentos" required error={errors.qtd_equipamentos?.message}>
          <Input type="number" min="0" {...register('qtd_equipamentos', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
        <FormField label="Qtd. Bombeiros" required error={errors.qtd_bombeiros?.message}>
          <Input type="number" min="1" {...register('qtd_bombeiros', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
        <FormField label="Tempo Gasto (HH:mm)" required error={errors.tempo_gasto?.message}>
          <Input placeholder="01:30" {...register('tempo_gasto')} onChange={(e) => setValue('tempo_gasto', formatTimeHHMM(e.target.value))} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
        </FormField>
      </div>
    </FormShell>
  )
}
