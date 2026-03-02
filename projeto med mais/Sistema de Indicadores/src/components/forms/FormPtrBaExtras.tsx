import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLancamento, handleSaveError } from '@/hooks/useLancamento'
import { useAuth } from '@/contexts/AuthContext'
import { formatTimeHHMM, validateHHMM } from '@/lib/masks'
import { getCurrentDateLocal, normalizeDateToLocal, formatDateForStorage } from '@/lib/date-utils'
import { hhmmToMinutes, minutesToHHmm } from '@/lib/export-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FormShell } from './FormShell'
import { BaseFormFields } from './BaseFormFields'
import { useColaboradores } from '@/hooks/useColaboradores'
import { Trash2, Plus, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const detalhamentoPtrSchema = z.object({
  nome_ptr: z.string(),
  horas: z.string().optional().default(''),
})

const participanteSchema = z.object({
  nome: z.string().optional().default(''),
  detalhamento_ptrs: z.array(detalhamentoPtrSchema).default([]),
})

const ptrExtraRefSchema = z.object({
  nome_ptr: z.string(),
  horas: z.string().optional().default(''),
})

const ptrBaExtrasSchema = z
  .object({
    ptrs_referencia: z.array(ptrExtraRefSchema),
    participantes: z.array(participanteSchema),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) =>
      data.ptrs_referencia.length > 0 &&
      data.ptrs_referencia.some((p) => String(p.nome_ptr ?? '').trim()),
    {
      message: 'Preencha pelo menos um PTR Extra na grade com nome.',
      path: ['ptrs_referencia'],
    }
  )
  .refine(
    (data) => {
      const completos = data.participantes.filter((p) => {
        const nome = String(p.nome ?? '').trim()
        const ptrs = p.detalhamento_ptrs ?? []
        const temHoras = ptrs.some((dt) => validateHHMM(dt.horas ?? ''))
        return !!nome && ptrs.length > 0 && temHoras
      })
      return completos.length > 0
    },
    {
      message: 'Preencha pelo menos um colaborador com nome e ao menos um PTR com horas.',
      path: ['participantes'],
    }
  )

type FormPtrBaExtrasData = z.infer<typeof ptrBaExtrasSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sumHorasDetalhamento(detalhamento_ptrs: { nome_ptr: string; horas?: string }[]): string {
  let totalMin = 0
  for (const dt of detalhamento_ptrs) {
    totalMin += hhmmToMinutes(dt.horas ?? '')
  }
  return minutesToHHmm(totalMin)
}

function migrateInitialData(initialData?: Record<string, unknown>): {
  ptrs_referencia: { nome_ptr: string; horas: string }[]
  participantes: { nome: string; detalhamento_ptrs: { nome_ptr: string; horas: string }[] }[]
} {
  // Formato novo: { ptrs_referencia, participantes }
  const ptrsRef = initialData?.ptrs_referencia as { nome_ptr: string; horas: string }[] | undefined
  const part = initialData?.participantes as Array<{
    nome?: string
    detalhamento_ptrs?: { nome_ptr: string; horas: string }[]
  }> | undefined

  if (Array.isArray(ptrsRef) && ptrsRef.length > 0 && Array.isArray(part)) {
    return {
      ptrs_referencia: ptrsRef.map((p) => ({ nome_ptr: String(p.nome_ptr ?? ''), horas: String(p.horas ?? '') })),
      participantes: part.map((p) => ({
        nome: String(p.nome ?? ''),
        detalhamento_ptrs: Array.isArray(p.detalhamento_ptrs)
          ? p.detalhamento_ptrs.map((dt) => ({ nome_ptr: String(dt.nome_ptr ?? ''), horas: String(dt.horas ?? '') }))
          : [],
      })),
    }
  }

  // Formato legado v2: { ptrs: [{ nome_ptr, participantes }] }
  const ptrsLegado = initialData?.ptrs as Array<{ nome_ptr?: string; participantes?: Array<{ nome?: string; horas?: string }> }> | undefined
  if (Array.isArray(ptrsLegado) && ptrsLegado.length > 0) {
    const nomesPtrs = ptrsLegado.map((p) => String(p.nome_ptr ?? ''))
    const nomesColabMap: Map<string, { nome_ptr: string; horas: string }[]> = new Map()
    ptrsLegado.forEach((ptr) => {
      const nomePtr = String(ptr.nome_ptr ?? '')
      ;(ptr.participantes ?? []).forEach((p) => {
        const nome = String(p.nome ?? '')
        if (!nome) return
        if (!nomesColabMap.has(nome)) nomesColabMap.set(nome, [])
        nomesColabMap.get(nome)!.push({ nome_ptr: nomePtr, horas: String(p.horas ?? '') })
      })
    })
    return {
      ptrs_referencia: nomesPtrs.map((n) => ({ nome_ptr: n, horas: '00:00' })),
      participantes: Array.from(nomesColabMap.entries()).map(([nome, dets]) => ({
        nome,
        detalhamento_ptrs: dets,
      })),
    }
  }

  // Formato legado v1: { nome_ptr, participantes: [{ nome, horas }] }
  const partLegadoV1 = initialData?.participantes as Array<{ nome?: string; horas?: string }> | undefined
  if (Array.isArray(partLegadoV1) && partLegadoV1.length > 0) {
    const nomePtr = String(initialData?.nome_ptr ?? 'PTR Extra')
    return {
      ptrs_referencia: [{ nome_ptr: nomePtr, horas: '00:00' }],
      participantes: partLegadoV1.map((p) => ({
        nome: String(p.nome ?? ''),
        detalhamento_ptrs: [{ nome_ptr: nomePtr, horas: String(p.horas ?? '') }],
      })),
    }
  }

  return { ptrs_referencia: [], participantes: [] }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface FormPtrBaExtrasProps {
  indicadorId: string
  onSuccess?: () => void
  initialData?: Record<string, unknown>
  readOnly?: boolean
}

// ─── Componente principal ────────────────────────────────────────────────────

export function FormPtrBaExtras({
  indicadorId,
  onSuccess,
  initialData,
  readOnly = false,
}: FormPtrBaExtrasProps) {
  const navigate = useNavigate()
  const { saveLancamento, isLoading } = useLancamento()
  const { authUser } = useAuth()

  const [dataReferencia, setDataReferencia] = useState<string>(
    initialData?.data_referencia
      ? normalizeDateToLocal(initialData.data_referencia as string)
      : getCurrentDateLocal()
  )
  const [expandedParticipantes, setExpandedParticipantes] = useState<Set<number>>(new Set())
  const participanteRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const finalBaseId = (initialData?.base_id as string | undefined) || authUser?.profile?.base_id || ''
  const finalEquipeId = (initialData?.equipe_id as string | undefined) || authUser?.profile?.equipe_id || ''

  const migrated = useMemo(() => migrateInitialData(initialData), [initialData])
  const initialPtrs = migrated.ptrs_referencia.length > 0 ? migrated.ptrs_referencia : [{ nome_ptr: '', horas: '' }]
  const initialParticipantes = migrated.participantes.length > 0 ? migrated.participantes : []

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
      ptrs_referencia: initialPtrs,
      participantes: initialParticipantes,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const { fields: ptrsFields, append: appendPtr, remove: removePtr } = useFieldArray({ control, name: 'ptrs_referencia' })
  const { fields: participantesFields, append: appendParticipante, remove: removeParticipante } = useFieldArray({ control, name: 'participantes' })

  const { data: colaboradores } = useColaboradores(finalBaseId || null)

  const ptrsReferencia = watch('ptrs_referencia')
  const totalGradeMin = ptrsReferencia.reduce((sum, p) => sum + hhmmToMinutes(p.horas ?? ''), 0)

  // Chave serializada da grade para disparar sincronização em tempo real
  const ptrsReferenciaKey = JSON.stringify(
    ptrsReferencia.map((p) => ({ nome_ptr: String(p.nome_ptr ?? '').trim(), horas: p.horas ?? '' }))
  )

  // Sincroniza automaticamente o detalhamento_ptrs de todos os colaboradores com a grade
  const isFirstRunGradeSync = useRef(true)
  useEffect(() => {
    if (readOnly) return
    const grade = ptrsReferencia
      .filter((p) => String(p.nome_ptr ?? '').trim())
      .map((p) => ({
        nome_ptr: String(p.nome_ptr).trim(),
        horas: validateHHMM(p.horas ?? '') ? (p.horas ?? '00:00') : '00:00',
      }))
    if (grade.length === 0) return
    if (isFirstRunGradeSync.current) {
      isFirstRunGradeSync.current = false
      return
    }
    participantesFields.forEach((_, pIndex) => {
      setValue(`participantes.${pIndex}.detalhamento_ptrs`, [...grade])
    })
  }, [ptrsReferenciaKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpanded = useCallback((index: number) => {
    const wasExpanded = expandedParticipantes.has(index)
    setExpandedParticipantes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
    if (wasExpanded) {
      requestAnimationFrame(() => {
        const el = participanteRefs.current.get(index)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    }
  }, [expandedParticipantes])

  const addParticipante = () => {
    const ptrs = ptrsReferencia
      .filter((p) => String(p.nome_ptr ?? '').trim())
      .map((p) => ({ nome_ptr: String(p.nome_ptr).trim(), horas: String(p.horas ?? '') }))
    appendParticipante({
      nome: '',
      detalhamento_ptrs: ptrs.length > 0 ? ptrs : [{ nome_ptr: '', horas: '' }],
    })
  }

  const onSubmit = async (data: FormPtrBaExtrasData) => {
    try {
      const ptrsRef = data.ptrs_referencia
        .filter((p) => String(p.nome_ptr ?? '').trim())
        .map((p) => ({ nome_ptr: String(p.nome_ptr).trim(), horas: p.horas ?? '00:00' }))

      const participantes = data.participantes
        .filter((p) => String(p.nome ?? '').trim())
        .map((p) => {
          const detalhamento_ptrs = (p.detalhamento_ptrs ?? []).filter((dt) => validateHHMM(dt.horas ?? ''))
          const total = sumHorasDetalhamento(detalhamento_ptrs)
          return {
            nome: String(p.nome).trim(),
            total,
            detalhamento_ptrs: detalhamento_ptrs.map((dt) => ({
              nome_ptr: String(dt.nome_ptr),
              horas: dt.horas ?? '00:00',
            })),
          }
        })
        .filter((p) => p.detalhamento_ptrs.length > 0)

      if (ptrsRef.length === 0 || participantes.length === 0) {
        alert('Preencha a grade de PTRs Extras e pelo menos um colaborador com PTRs e horas.')
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
        conteudo: { ptrs_referencia: ptrsRef, participantes },
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
      description="Defina os PTRs extras e registre as horas de cada colaborador"
      onSubmit={handleSubmit(onSubmit, (errs) => {
        const msg =
          (errs.ptrs_referencia as { message?: string } | undefined)?.message ||
          (errs.participantes as { message?: string } | undefined)?.message ||
          'Verifique os campos obrigatórios.'
        alert(`Não foi possível salvar.\n\n${msg}`)
      })}
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

      {/* ═══════════ GRADE DE PTRs EXTRAS ═══════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">PTRs Extras</h3>
            <Badge variant="secondary" className="text-xs">
              {ptrsFields.length} {ptrsFields.length === 1 ? 'PTR' : 'PTRs'}
            </Badge>
          </div>
          {!readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => appendPtr({ nome_ptr: '', horas: '' })}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar PTR
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-8">#</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Nome do PTR Extra</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-28">Horas</th>
                {!readOnly && <th className="p-3 w-10" />}
              </tr>
            </thead>
            <tbody>
              {ptrsFields.map((field, index) => (
                <tr key={field.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm text-muted-foreground font-mono">{index + 1}</td>
                  <td className="p-2">
                    <Input
                      {...register(`ptrs_referencia.${index}.nome_ptr`)}
                      placeholder="Ex.: PTR-BA 001/2025 — Exercício de TP/EPR"
                      disabled={readOnly}
                      className={readOnly ? 'bg-muted' : ''}
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="HH:mm"
                      {...register(`ptrs_referencia.${index}.horas`)}
                      onChange={(e) => setValue(`ptrs_referencia.${index}.horas`, formatTimeHHMM(e.target.value))}
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
                        onClick={() => removePtr(index)}
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Remover PTR"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {ptrsFields.length > 0 && totalGradeMin > 0 && (
              <tfoot>
                <tr className="bg-primary/5 border-t">
                  <td colSpan={2} className="p-3 text-sm font-semibold text-right">Total da Grade:</td>
                  <td className="p-3 text-center font-mono font-bold text-primary">{minutesToHHmm(totalGradeMin)}</td>
                  {!readOnly && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {(errors.ptrs_referencia as { message?: string } | undefined)?.message && (
          <p className="text-xs text-destructive font-medium">
            {(errors.ptrs_referencia as { message?: string }).message}
          </p>
        )}
      </div>

      {/* ═══════════ COLABORADORES ═══════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">Colaboradores</h3>
            <Badge variant="secondary" className="text-xs">
              {participantesFields.length} {participantesFields.length === 1 ? 'colaborador' : 'colaboradores'}
            </Badge>
          </div>
          {!readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={addParticipante}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Colaborador
            </Button>
          )}
        </div>

        {participantesFields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum colaborador adicionado.</p>
            {!readOnly && <p className="text-xs mt-1">Clique em "Adicionar Colaborador" para começar.</p>}
          </div>
        )}

        <div className="space-y-3">
          {participantesFields.map((field, pIndex) => {
            const detalhamento = watch(`participantes.${pIndex}.detalhamento_ptrs`) ?? []
            const totalDia = sumHorasDetalhamento(detalhamento)
            const isExpanded = expandedParticipantes.has(pIndex)

            return (
              <div
                key={field.id}
                ref={(el) => { if (el) participanteRefs.current.set(pIndex, el); else participanteRefs.current.delete(pIndex) }}
                className="rounded-lg border border-border overflow-hidden shadow-sm"
              >
                {/* Cabeçalho do colaborador */}
                <div className="flex items-center gap-3 p-3 bg-muted/40">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {pIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                    <Controller
                      name={`participantes.${pIndex}.nome`}
                      control={control}
                      render={({ field: f }) => (
                        <Select
                          {...f}
                          disabled={readOnly || !finalBaseId}
                          className={readOnly ? 'bg-muted' : 'bg-background'}
                        >
                          <option value="">Selecione um colaborador</option>
                          {colaboradores
                            ?.filter((c) => c.ativo)
                            .map((c) => (
                              <option key={c.id} value={c.nome}>{c.nome}</option>
                            ))}
                        </Select>
                      )}
                    />
                  </div>
                  <div
                    className="flex items-center gap-3 shrink-0 cursor-pointer hover:opacity-70 transition-opacity"
                    onClick={() => toggleExpanded(pIndex)}
                  >
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-sm font-bold font-mono text-primary">{totalDia}</p>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    }
                  </div>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeParticipante(pIndex)}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                      title="Remover colaborador"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Detalhamento por PTR (expansível) */}
                {isExpanded && (
                  <div className="p-4 space-y-3 border-t">
                    <label className="text-xs font-medium text-muted-foreground">Detalhamento por PTR Extra</label>

                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/40 border-b">
                            <th className="text-left p-2 text-xs font-semibold text-muted-foreground">PTR Extra</th>
                            <th className="text-left p-2 text-xs font-semibold text-muted-foreground w-28">Horas</th>
                            {!readOnly && <th className="p-2 w-8" />}
                          </tr>
                        </thead>
                        <tbody>
                          {detalhamento.map((_, tIndex) => (
                            <tr key={tIndex} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                              <td className="p-1.5">
                                <Input
                                  {...register(`participantes.${pIndex}.detalhamento_ptrs.${tIndex}.nome_ptr`)}
                                  disabled={readOnly}
                                  placeholder="Nome do PTR"
                                  className={`text-sm ${readOnly ? 'bg-muted' : ''}`}
                                />
                              </td>
                              <td className="p-1.5">
                                <Input
                                  placeholder="HH:mm"
                                  {...register(`participantes.${pIndex}.detalhamento_ptrs.${tIndex}.horas`)}
                                  onChange={(e) =>
                                    setValue(
                                      `participantes.${pIndex}.detalhamento_ptrs.${tIndex}.horas`,
                                      formatTimeHHMM(e.target.value)
                                    )
                                  }
                                  disabled={readOnly}
                                  className={`text-center font-mono text-sm ${readOnly ? 'bg-muted' : ''}`}
                                />
                              </td>
                              {!readOnly && (
                                <td className="p-1.5 text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Remover"
                                    onClick={() => {
                                      const arr = watch(`participantes.${pIndex}.detalhamento_ptrs`)
                                      setValue(
                                        `participantes.${pIndex}.detalhamento_ptrs`,
                                        arr.filter((_, i) => i !== tIndex)
                                      )
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        {detalhamento.length > 0 && (
                          <tfoot>
                            <tr className="bg-primary/5 border-t">
                              <td className="p-2 text-xs font-semibold text-right">Total:</td>
                              <td className="p-2 text-center font-mono font-bold text-primary text-sm">{totalDia}</td>
                              {!readOnly && <td />}
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {detalhamento.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Os PTRs são preenchidos automaticamente pela grade acima.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {(errors.participantes as { message?: string } | undefined)?.message && (
          <p className="text-xs text-destructive font-medium">
            {(errors.participantes as { message?: string }).message}
          </p>
        )}
      </div>

      {/* ═══════════ RESUMO GERAL ═══════════ */}
      {participantesFields.length > 0 && (
        <div className="rounded-lg border border-border bg-primary/5 p-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Colaboradores</p>
              <p className="text-lg font-bold">{participantesFields.length}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground">PTRs Extras</p>
              <p className="text-lg font-bold font-mono text-primary">{ptrsFields.length}</p>
            </div>
            {totalGradeMin > 0 && (
              <>
                <div className="h-8 w-px bg-border" />
                <div>
                  <p className="text-xs text-muted-foreground">Total da grade</p>
                  <p className="text-lg font-bold font-mono text-primary">{minutesToHHmm(totalGradeMin)}</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </FormShell>
  )
}
