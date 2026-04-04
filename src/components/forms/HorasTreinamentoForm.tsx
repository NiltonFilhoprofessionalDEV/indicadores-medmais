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

const TEMAS_PTR = [
  'Condução de veículos de emergência na área operacional do aeródromo',
  'Conhecimentos Básicos para inspeção de carro contra incêndio',
  'Educação Fisica',
  'Emergência com artigos perigosos',
  'Equipamentos de apoio às operações de resgate',
  'Equipamentos de Proteção',
  'Exercício de maneabilidade',
  'Exercício de maneabilidade com CCI',
  'Exercício de TP/EPR',
  'Familiarização com as aeronaves que operam com regularidade no aeródromo',
  'Familiarização com o aeródromo',
  'Familiarização com os CCI em operação no aeródromo',
  'Nós e amarrações',
  'Operações com baixa visibilidade',
  'PCINC',
  'PLEM',
  'Posicionamento para intervenção',
  'Prática de treinamentos de socorro e urgência',
  'Procedimentos de aplicação de agentes extintores',
  'Procedimentos de assistência na evacuação de aeronaves',
  'Procedimentos de segurança na execução de atividades operacionais',
  'Reabastecimento do CCI com água',
  'Sistemas de combate a incêndios',
  'Sistemas de comunicação e alarme',
  'Tempo resposta',
] as const

const detalhamentoTemaSchema = z.object({
  tema: z.string(),
  horas: z.string().refine((v) => !v || validateHHMM(v), 'Formato HH:mm').optional().default(''),
})

const participanteSchema = z.object({
  nome: z.string().optional().default(''),
  detalhamento_temas: z.array(detalhamentoTemaSchema).default([]),
})

const horasTreinamentoSchema = z
  .object({
    temas_referencia: z.array(z.object({ tema: z.string(), horas: z.string() })),
    participantes: z.array(participanteSchema),
    data_referencia: z.string().min(1, 'Data é obrigatória'),
    base_id: z.string().optional(),
    equipe_id: z.string().optional(),
  })
  .refine(
    (data) => data.temas_referencia.length > 0 && data.temas_referencia.some((t) => String(t.tema ?? '').trim() && validateHHMM(t.horas ?? '')),
    { message: 'Preencha pelo menos um tema na PTR-BA do dia com nome e horas válidas (HH:mm).', path: ['temas_referencia'] }
  )
  .refine(
    (data) =>
      data.temas_referencia.every(
        (t) => !String(t.tema ?? '').trim() || validateHHMM(t.horas ?? '')
      ),
    { message: 'Na grade do dia: todo tema selecionado deve ter horas preenchidas (HH:mm).', path: ['temas_referencia'] }
  )
  .refine(
    (data) => {
      const completos = data.participantes.filter((p) => {
        const nome = String(p.nome ?? '').trim()
        const temas = p.detalhamento_temas ?? []
        const temHoras = temas.some((dt) => validateHHMM(dt.horas ?? ''))
        return !!nome && temas.length > 0 && temHoras
      })
      return completos.length > 0
    },
    { message: 'Preencha pelo menos um participante com nome e ao menos um tema com horas.', path: ['participantes'] }
  )
  .refine(
    (data) =>
      data.participantes.every((p) =>
        (p.detalhamento_temas ?? []).every(
          (dt) => !String(dt.tema ?? '').trim() || validateHHMM(dt.horas ?? '')
        )
      ),
    { message: 'No detalhamento por tema: todo tema selecionado deve ter horas preenchidas (HH:mm).', path: ['participantes'] }
  )

type HorasTreinamentoFormData = z.infer<typeof horasTreinamentoSchema>

function sumHorasDetalhamento(detalhamento_temas: { tema: string; horas?: string }[]): string {
  let totalMin = 0
  for (const dt of detalhamento_temas) {
    totalMin += hhmmToMinutes(dt.horas ?? '')
  }
  return minutesToHHmm(totalMin)
}

function migrateInitialData(initialData?: Record<string, unknown>): {
  temas_referencia: { tema: string; horas: string }[]
  participantes: { nome: string; detalhamento_temas: { tema: string; horas: string }[] }[]
} {
  const temasRef = initialData?.temas_referencia as { tema: string; horas: string }[] | undefined
  const part = initialData?.participantes as Array<{ nome?: string; horas?: string; detalhamento_temas?: { tema: string; horas: string }[] }> | undefined

  if (Array.isArray(temasRef) && temasRef.length > 0 && Array.isArray(part)) {
    return {
      temas_referencia: temasRef.map((t) => ({ tema: String(t.tema ?? ''), horas: String(t.horas ?? '') })),
      participantes: part.map((p) => ({
        nome: String(p.nome ?? ''),
        detalhamento_temas: Array.isArray(p.detalhamento_temas)
          ? p.detalhamento_temas.map((dt) => ({ tema: String(dt.tema ?? ''), horas: String(dt.horas ?? '') }))
          : [],
      })),
    }
  }

  if (Array.isArray(part) && part.length > 0) {
    return {
      temas_referencia: [{ tema: 'Treinamento', horas: '00:00' }],
      participantes: part.map((p) => ({
        nome: String(p.nome ?? ''),
        detalhamento_temas: [{ tema: 'Treinamento', horas: String(p.horas ?? '') }],
      })),
    }
  }

  return { temas_referencia: [], participantes: [] }
}

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
  const initialTemas = migrated.temas_referencia.length > 0 ? migrated.temas_referencia : [{ tema: '', horas: '' }]
  const initialParticipantes = migrated.participantes.length > 0 ? migrated.participantes : []

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HorasTreinamentoFormData>({
    resolver: zodResolver(horasTreinamentoSchema),
    defaultValues: {
      temas_referencia: initialTemas,
      participantes: initialParticipantes,
      data_referencia: dataReferencia,
      base_id: finalBaseId,
      equipe_id: finalEquipeId,
    },
  })

  const { fields: temasFields, append: appendTema, remove: removeTema } = useFieldArray({ control, name: 'temas_referencia' })
  const { fields: participantesFields, append: appendParticipante, remove: removeParticipante } = useFieldArray({ control, name: 'participantes' })

  const { data: colaboradores } = useColaboradores(finalBaseId || null)

  const temasReferencia = watch('temas_referencia')
  const totalGradeMin = temasReferencia.reduce((sum, t) => sum + hhmmToMinutes(t.horas ?? ''), 0)

  // Chave serializada da grade para o efeito disparar em tempo real (add/remove/alterar tema ou horas).
  const temasReferenciaKey = JSON.stringify(
    temasReferencia.map((t) => ({ tema: String(t.tema ?? '').trim(), horas: t.horas ?? '' }))
  )

  // Sincroniza automaticamente o detalhamento_temas de todos os colaboradores com a grade do dia
  // em tempo real ao adicionar/remover tema ou ao selecionar tema e preencher horas.
  const isFirstRunGradeSync = useRef(true)
  useEffect(() => {
    if (readOnly) return
    const grade = temasReferencia
      .filter((t) => String(t.tema ?? '').trim())
      .map((t) => ({
        tema: String(t.tema).trim(),
        horas: validateHHMM(t.horas ?? '') ? (t.horas ?? '00:00') : '00:00',
      }))
    if (grade.length === 0) return
    if (isFirstRunGradeSync.current) {
      isFirstRunGradeSync.current = false
      return
    }
    participantesFields.forEach((_, pIndex) => {
      setValue(`participantes.${pIndex}.detalhamento_temas`, [...grade])
    })
  }, [temasReferenciaKey, temasReferencia, setValue, readOnly, participantesFields.length])

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
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      })
    }
  }, [expandedParticipantes])

  const addParticipante = () => {
    const temas = temasReferencia
      .filter((t) => String(t.tema ?? '').trim())
      .map((t) => ({ tema: String(t.tema).trim(), horas: String(t.horas ?? '') }))
    appendParticipante({
      nome: '',
      detalhamento_temas: temas.length > 0 ? temas : [{ tema: '', horas: '' }],
    })
  }

  const onSubmit = async (data: HorasTreinamentoFormData) => {
    try {
      const temasRef = data.temas_referencia
        .filter((t) => String(t.tema ?? '').trim() && validateHHMM(t.horas ?? ''))
        .map((t) => ({ tema: String(t.tema).trim(), horas: t.horas }))

      const participantes = data.participantes
        .filter((p) => String(p.nome ?? '').trim())
        .map((p) => {
          const detalhamento_temas = (p.detalhamento_temas ?? []).filter((dt) => validateHHMM(dt.horas ?? ''))
          const total_dia = sumHorasDetalhamento(detalhamento_temas)
          return {
            nome: String(p.nome).trim(),
            total_dia,
            detalhamento_temas: detalhamento_temas.map((dt) => ({ tema: String(dt.tema), horas: dt.horas ?? '00:00' })),
          }
        })
        .filter((p) => p.detalhamento_temas.length > 0)

      if (temasRef.length === 0 || participantes.length === 0) {
        alert('Preencha a PTR-BA do dia e pelo menos um participante com temas e horas.')
        return
      }

      const conteudo = { temas_referencia: temasRef, participantes }

      const dataRefFormatted =
        typeof data.data_referencia === 'string'
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
      title="PTR-BA — Horas de Treinamento"
      description="Defina os temas e registre as horas de cada colaborador"
      onSubmit={handleSubmit(onSubmit, (errors) => {
        const msg =
          errors.temas_referencia?.message ||
          errors.participantes?.message ||
          'Verifique os campos e preencha todos os temas selecionados com horas (HH:mm).'
        alert(`Não foi possível salvar.\n\n${msg}`)
      })}
      isLoading={isLoading}
      readOnly={readOnly}
      submitLabel="Salvar Treinamento"
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

      {/* ═══════════ GRADE DO DIA ═══════════ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold">PTR-BA do dia</h3>
            <Badge variant="secondary" className="text-xs">
              {temasFields.length} {temasFields.length === 1 ? 'tema' : 'temas'}
            </Badge>
          </div>
          {!readOnly && (
            <Button type="button" variant="outline" size="sm" onClick={() => appendTema({ tema: '', horas: '' })}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Tema
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-8">#</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground">Tema do PTR</th>
                <th className="text-left p-3 text-xs font-semibold text-muted-foreground w-28">Horas</th>
                {!readOnly && <th className="p-3 w-10" />}
              </tr>
            </thead>
            <tbody>
              {temasFields.map((field, index) => (
                <tr key={field.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm text-muted-foreground font-mono">{index + 1}</td>
                  <td className="p-2">
                    <Select
                      {...register(`temas_referencia.${index}.tema`)}
                      disabled={readOnly}
                      className={`${readOnly ? 'bg-muted' : ''}`}
                    >
                      <option value="">Selecione o PTR</option>
                      {TEMAS_PTR.map((nome) => (
                        <option key={nome} value={nome}>{nome}</option>
                      ))}
                    </Select>
                  </td>
                  <td className="p-2">
                    <Input
                      placeholder="HH:mm"
                      {...register(`temas_referencia.${index}.horas`)}
                      onChange={(e) => setValue(`temas_referencia.${index}.horas`, formatTimeHHMM(e.target.value))}
                      disabled={readOnly}
                      className={`text-center font-mono ${readOnly ? 'bg-muted' : ''}`}
                    />
                  </td>
                  {!readOnly && (
                    <td className="p-2 text-center">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeTema(index)} className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10" title="Remover">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {temasFields.length > 0 && (
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

        {errors.temas_referencia?.message && (
          <p className="text-xs text-destructive font-medium">{errors.temas_referencia.message}</p>
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
            const detalhamento = watch(`participantes.${pIndex}.detalhamento_temas`) ?? []
            const totalDia = sumHorasDetalhamento(detalhamento)
            const isExpanded = expandedParticipantes.has(pIndex)

            return (
              <div key={field.id} ref={(el) => { if (el) participanteRefs.current.set(pIndex, el); else participanteRefs.current.delete(pIndex) }} className="rounded-lg border border-border overflow-hidden shadow-sm">
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
                          className={`${readOnly ? 'bg-muted' : 'bg-background'}`}
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
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  {!readOnly && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeParticipante(pIndex)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0" title="Remover colaborador">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-4 border-t">

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Detalhamento por tema</label>

                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/40 border-b">
                              <th className="text-left p-2 text-xs font-semibold text-muted-foreground">Tema</th>
                              <th className="text-left p-2 text-xs font-semibold text-muted-foreground w-28">Horas</th>
                              {!readOnly && <th className="p-2 w-8" />}
                            </tr>
                          </thead>
                          <tbody>
                            {detalhamento.map((_, tIndex) => (
                              <tr key={tIndex} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                                <td className="p-1.5">
                                  <Select
                                    {...register(`participantes.${pIndex}.detalhamento_temas.${tIndex}.tema`)}
                                    disabled={readOnly}
                                    className={`text-sm ${readOnly ? 'bg-muted' : ''}`}
                                  >
                                    <option value="">Selecione o PTR</option>
                                    {TEMAS_PTR.map((nome) => (
                                      <option key={nome} value={nome}>{nome}</option>
                                    ))}
                                  </Select>
                                </td>
                                <td className="p-1.5">
                                  <Input
                                    placeholder="HH:mm"
                                    {...register(`participantes.${pIndex}.detalhamento_temas.${tIndex}.horas`)}
                                    onChange={(e) => {
                                      setValue(
                                        `participantes.${pIndex}.detalhamento_temas.${tIndex}.horas`,
                                        formatTimeHHMM(e.target.value)
                                      )
                                    }}
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
                                        const arr = watch(`participantes.${pIndex}.detalhamento_temas`)
                                        setValue(`participantes.${pIndex}.detalhamento_temas`, arr.filter((_, i) => i !== tIndex))
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
                          Os temas são preenchidos automaticamente pela grade do dia.
                        </p>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>

        {errors.participantes?.message && (
          <p className="text-xs text-destructive font-medium">{errors.participantes.message}</p>
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
              <p className="text-xs text-muted-foreground">PTR-BA do dia</p>
              <p className="text-lg font-bold font-mono text-primary">{minutesToHHmm(totalGradeMin)}</p>
            </div>
          </div>
        </div>
      )}
    </FormShell>
  )
}
