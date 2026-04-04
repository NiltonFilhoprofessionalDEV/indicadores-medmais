import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { InputWithSuffix } from '@/components/ui/input-with-suffix'
import { Select } from '@/components/ui/select'
import { BaseFormFields } from './BaseFormFields'
import { FormShell, FormSection, FormField } from './FormShell'

const CAT_AERODROMO_KG: Record<number, number> = { 1: 45, 2: 90, 3: 135, 4: 135, 5: 180, 6: 225, 7: 225, 8: 450, 9: 450, 10: 450 }

const controleEstoqueSchema = z.object({
  po_quimico_quantidade_linha: z.number().min(0).optional(),
  po_quimico_cat_aerodromo: z.number().min(1).max(10).optional(),
  po_quimico_exigido: z.number().min(0).optional(),
  po_quimico_quantidade_estoque_reserva_tecnica: z.number().min(0).optional(),
  lge_quantidade_linha: z.number().min(0).optional(),
  lge_quantidade_estoque_reserva_tecnica: z.number().min(0).optional(),
  lge_exigido: z.number().min(0).optional(),
  nitrogenio_quantidade_linha: z.number().min(0).optional(),
  nitrogenio_quantidade_estoque_reserva_tecnica: z.number().min(0).optional(),
  nitrogenio_exigido: z.number().min(0).optional(),
  data_referencia: z.string().min(1, 'Data é obrigatória'),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
})

type ControleEstoqueFormData = z.infer<typeof controleEstoqueSchema>

interface ControleEstoqueFormProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

export function ControleEstoqueForm({ indicadorId, onSuccess, initialData, readOnly = false }: ControleEstoqueFormProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()
  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia ? normalizeDateToLocal(initialData.data_referencia as string) : getCurrentDateLocal()
  )

  const finalBaseId = initialData?.base_id as string | undefined || authUser?.profile?.base_id || ''
  const finalEquipeId = initialData?.equipe_id as string | undefined || authUser?.profile?.equipe_id || ''

  const catFromExigido = (exigido: number): number | undefined => {
    const entry = Object.entries(CAT_AERODROMO_KG).find(([, kg]) => kg === exigido)
    return entry ? Number(entry[0]) : undefined
  }

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ControleEstoqueFormData>({
    resolver: zodResolver(controleEstoqueSchema),
    defaultValues: (() => {
      const exigido = initialData?.po_quimico_exigido != null ? Number(initialData.po_quimico_exigido) : undefined
      const cat = initialData?.po_quimico_cat_aerodromo != null ? Number(initialData.po_quimico_cat_aerodromo) : (exigido != null ? catFromExigido(exigido) : undefined)
      const poAtual = initialData?.po_quimico_quantidade_estoque_reserva_tecnica ?? initialData?.po_quimico_atual
      const lgeAtual = initialData?.lge_quantidade_estoque_reserva_tecnica ?? initialData?.lge_atual
      const nitAtual = initialData?.nitrogenio_quantidade_estoque_reserva_tecnica ?? initialData?.nitrogenio_atual
      return {
        po_quimico_quantidade_linha: initialData?.po_quimico_quantidade_linha != null ? Number(initialData.po_quimico_quantidade_linha) : undefined,
        po_quimico_cat_aerodromo: cat,
        po_quimico_exigido: exigido,
        po_quimico_quantidade_estoque_reserva_tecnica: poAtual != null ? Number(poAtual) : undefined,
        lge_quantidade_linha: initialData?.lge_quantidade_linha != null ? Number(initialData.lge_quantidade_linha) : undefined,
        lge_quantidade_estoque_reserva_tecnica: lgeAtual != null ? Number(lgeAtual) : undefined,
        lge_exigido: initialData?.lge_exigido != null ? Number(initialData.lge_exigido) : undefined,
        nitrogenio_quantidade_linha: initialData?.nitrogenio_quantidade_linha != null ? Number(initialData.nitrogenio_quantidade_linha) : undefined,
        nitrogenio_quantidade_estoque_reserva_tecnica: nitAtual != null ? Number(nitAtual) : undefined,
        nitrogenio_exigido: initialData?.nitrogenio_exigido != null ? Number(initialData.nitrogenio_exigido) : undefined,
        data_referencia: dataReferencia,
        base_id: finalBaseId,
        equipe_id: finalEquipeId,
      }
    })(),
  })

  const poQuimicoCatAerodromo = watch('po_quimico_cat_aerodromo')
  const poQuimicoExigido = poQuimicoCatAerodromo != null ? CAT_AERODROMO_KG[poQuimicoCatAerodromo] : undefined

  /** Garante número válido (evita NaN/null no JSON: inputs vazios com valueAsNumber retornam NaN). */
  const toNumber = (v: number | undefined): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : 0

  const onSubmit = async (data: ControleEstoqueFormData) => {
    try {
      const exigidoPo = data.po_quimico_cat_aerodromo != null ? CAT_AERODROMO_KG[data.po_quimico_cat_aerodromo] : toNumber(data.po_quimico_exigido)
      const conteudo: Record<string, number> = {
        po_quimico_quantidade_linha: toNumber(data.po_quimico_quantidade_linha),
        po_quimico_cat_aerodromo: toNumber(data.po_quimico_cat_aerodromo),
        po_quimico_exigido: exigidoPo,
        po_quimico_quantidade_estoque_reserva_tecnica: toNumber(data.po_quimico_quantidade_estoque_reserva_tecnica),
        lge_quantidade_linha: toNumber(data.lge_quantidade_linha),
        lge_quantidade_estoque_reserva_tecnica: toNumber(data.lge_quantidade_estoque_reserva_tecnica),
        lge_exigido: toNumber(data.lge_exigido),
        nitrogenio_quantidade_linha: toNumber(data.nitrogenio_quantidade_linha),
        nitrogenio_quantidade_estoque_reserva_tecnica: toNumber(data.nitrogenio_quantidade_estoque_reserva_tecnica),
        nitrogenio_exigido: toNumber(data.nitrogenio_exigido),
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
      title="Controle de Estoque"
      description="Controle de estoque de materiais com unidades específicas"
      onSubmit={handleSubmit(onSubmit)}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Estoque"
    >
      <BaseFormFields
        dataReferencia={dataReferencia}
        onDataChange={(date) => { setDataReferencia(date); setValue('data_referencia', date) }}
        baseId={finalBaseId}
        equipeId={watch('equipe_id') ?? finalEquipeId}
        onBaseIdChange={(baseId) => setValue('base_id', baseId)}
        onEquipeIdChange={(equipeId) => setValue('equipe_id', equipeId)}
        readOnly={readOnly}
      />

      <FormSection title="Pó Químico">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Quantidade em Linha (KG)" error={errors.po_quimico_quantidade_linha?.message}>
            <InputWithSuffix suffix="KG" min="0" {...register('po_quimico_quantidade_linha', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
          </FormField>
          <FormField label="Cat. do Aeródromo">
            <Select
              value={poQuimicoCatAerodromo != null ? String(poQuimicoCatAerodromo) : ''}
              onChange={(e) => {
                const cat = e.target.value ? Number(e.target.value) : undefined
                setValue('po_quimico_cat_aerodromo', cat as number)
                setValue('po_quimico_exigido', cat != null ? CAT_AERODROMO_KG[cat] : undefined)
              }}
              disabled={readOnly}
              className={readOnly ? 'bg-muted' : ''}
            >
              <option value="">Selecione a categoria</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormField>
          <FormField label="Quantidade exigida (KG)">
            <InputWithSuffix suffix="KG" readOnly value={poQuimicoExigido ?? ''} onChange={() => {}} className="bg-muted" />
          </FormField>
          <FormField label="Estoque + RT (KG)" error={errors.po_quimico_quantidade_estoque_reserva_tecnica?.message}>
            <InputWithSuffix suffix="KG" min="0" {...register('po_quimico_quantidade_estoque_reserva_tecnica', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="LGE (Líquido Gerador de Espuma)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Quantidade em Linha (L)" error={errors.lge_quantidade_linha?.message}>
            <InputWithSuffix suffix="L" min="0" {...register('lge_quantidade_linha', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
          </FormField>
          <FormField label="Estoque + RT (L)" error={errors.lge_quantidade_estoque_reserva_tecnica?.message}>
            <InputWithSuffix suffix="L" min="0" {...register('lge_quantidade_estoque_reserva_tecnica', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Nitrogênio">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Quantidade em Linha (Und)" error={errors.nitrogenio_quantidade_linha?.message}>
            <InputWithSuffix suffix="Und" min="0" {...register('nitrogenio_quantidade_linha', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
          </FormField>
          <FormField label="Estoque + RT (Und)" error={errors.nitrogenio_quantidade_estoque_reserva_tecnica?.message}>
            <InputWithSuffix suffix="Und" min="0" {...register('nitrogenio_quantidade_estoque_reserva_tecnica', { valueAsNumber: true })} disabled={readOnly} className={readOnly ? 'bg-muted' : ''} />
          </FormField>
        </div>
      </FormSection>
    </FormShell>
  )
}
