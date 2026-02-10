import * as React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type FeedbackRow = Database['public']['Tables']['feedbacks']['Row']
type FeedbackStatus = FeedbackRow['status']
type FeedbackWithAuthor = FeedbackRow & { author_nome: string | null }

function getTipoLabel(tipo: string) {
  switch (tipo) {
    case 'bug':
      return 'Bug'
    case 'sugestao':
      return 'Sugestão'
    case 'outros':
      return 'Outros'
    default:
      return tipo
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pendente':
      return 'Pendente'
    case 'em_andamento':
      return 'Em Andamento'
    case 'resolvido':
      return 'Resolvido'
    case 'fechado':
      return 'Fechado'
    default:
      return status
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800'
    case 'em_andamento':
      return 'bg-blue-100 text-blue-800'
    case 'resolvido':
      return 'bg-green-100 text-green-800'
    case 'fechado':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const TRATATIVA_TIPO_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Selecione a tratativa' },
  { value: 'correcao_aplicada', label: 'Correção aplicada' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'respondido_usuario', label: 'Respondido ao usuário' },
  { value: 'fechado_sem_alteracao', label: 'Fechado sem alteração' },
  { value: 'outros', label: 'Outros' },
]

function getTratativaTipoLabel(value: string | null) {
  if (!value) return '—'
  const opt = TRATATIVA_TIPO_OPTIONS.find((o) => o.value === value)
  return opt?.label ?? value
}

export function Suporte() {
  const { authUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filtroStatus, setFiltroStatus] = React.useState<string>('todos')
  const [feedbackDetalhe, setFeedbackDetalhe] = React.useState<FeedbackWithAuthor | null>(null)
  const [respostaTexto, setRespostaTexto] = React.useState('')
  const [paginaAtual, setPaginaAtual] = React.useState(1)
  const [itensPorPagina, setItensPorPagina] = React.useState(10)

  React.useEffect(() => {
    setRespostaTexto(feedbackDetalhe?.resposta_suporte ?? '')
  }, [feedbackDetalhe])

  const { data: feedbacks, isLoading, isError, error } = useQuery({
    queryKey: ['suporte-feedbacks'],
    queryFn: async (): Promise<FeedbackWithAuthor[]> => {
      const { data: feedbacksData, error: errFeedbacks } = await supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false })
      if (errFeedbacks) throw errFeedbacks
      const list: FeedbackRow[] = feedbacksData ?? []
      const userIds = [...new Set(list.map((f) => f.user_id))]
      let profileMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: profilesData, error: errProfiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds)
        if (errProfiles) throw errProfiles
        const profiles = (profilesData ?? []) as { id: string; nome: string }[]
        profileMap = new Map(profiles.map((p) => [p.id, p.nome]))
      }
      return list.map((f) => ({
        ...f,
        author_nome: profileMap.get(f.user_id) ?? null,
      }))
    },
    enabled: !!authUser?.user?.id,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FeedbackStatus }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client infers update as never without full schema
      const { error } = await (supabase as any)
        .from('feedbacks')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suporte-feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['suporte-feedbacks-pendentes'] })
    },
    onError: (err: Error) => {
      alert(`Erro ao atualizar status: ${err.message}`)
    },
  })

  const updateTratativaTipoMutation = useMutation({
    mutationFn: async ({
      id,
      tratativa_tipo,
    }: {
      id: string
      tratativa_tipo: string | null
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client infers update as never without full schema
      const { error } = await (supabase as any)
        .from('feedbacks')
        .update({ tratativa_tipo: tratativa_tipo || null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suporte-feedbacks'] })
    },
    onError: (err: Error) => {
      alert(`Erro ao atualizar tratativa: ${err.message}`)
    },
  })

  const updateRespostaSuporteMutation = useMutation({
    mutationFn: async ({ id, resposta_suporte }: { id: string; resposta_suporte: string | null }) => {
      const { data, error } = await (supabase as any)
        .from('feedbacks')
        .update({ resposta_suporte: resposta_suporte ?? null })
        .eq('id', id)
        .select('id, resposta_suporte')
        .single()
      if (error) {
        console.error('Erro ao salvar resposta do suporte:', error)
        throw new Error(error.message + (error.details ? ` (${error.details})` : ''))
      }
      return data as { id: string; resposta_suporte: string | null }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suporte-feedbacks'] })
      queryClient.invalidateQueries({ queryKey: ['suporte-feedbacks-pendentes'] })
      if (feedbackDetalhe && data) {
        setFeedbackDetalhe((prev) => (prev ? { ...prev, resposta_suporte: data.resposta_suporte } : null))
      }
      alert('Resposta salva com sucesso!')
    },
    onError: (err: Error) => {
      console.error('updateRespostaSuporteMutation error:', err)
      alert(`Erro ao salvar resposta: ${err.message}\n\nSe a coluna "resposta_suporte" não existir, execute a migration 025 no Supabase.`)
    },
  })

  const filteredFeedbacks =
    feedbacks && filtroStatus !== 'todos'
      ? feedbacks.filter((f) => f.status === filtroStatus)
      : feedbacks || []

  const totalItens = filteredFeedbacks.length
  const totalPaginas = Math.max(1, Math.ceil(totalItens / itensPorPagina))
  const paginaInicio = (paginaAtual - 1) * itensPorPagina
  const paginaFim = Math.min(paginaInicio + itensPorPagina, totalItens)
  const feedbacksPagina = filteredFeedbacks.slice(paginaInicio, paginaFim)

  React.useEffect(() => {
    setPaginaAtual(1)
  }, [filtroStatus])

  if (!authUser?.profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-all duration-300 ease-in-out page-transition">
      <header className="bg-[#fc4d00] shadow-sm border-b border-border shadow-orange-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center min-h-[80px]">
            <div className="flex items-center gap-4 flex-shrink-0">
              <img
                src="/logo-medmais.png"
                alt="MedMais Logo"
                className="h-10 w-auto brightness-0 invert"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Suporte / Feedback</h1>
                <p className="text-sm text-white/90">
                  Veja os feedbacks enviados pelos usuários e dê as tratativas
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <Button
                onClick={() => navigate('/dashboard-gerente')}
                className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-white transition-all duration-200 shadow-orange-sm"
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Feedbacks dos Usuários</CardTitle>
            <CardDescription>
              Lista de sugestões, bugs e outros enviados pelo suporte. Atualize o status para dar
              tratativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Label htmlFor="filtro-status" className="text-sm font-medium whitespace-nowrap">
                Filtrar por status:
              </Label>
              <Select
                id="filtro-status"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="max-w-[180px]"
              >
                <option value="todos">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="em_andamento">Em Andamento</option>
                <option value="resolvido">Resolvido</option>
                <option value="fechado">Fechado</option>
              </Select>
            </div>

            {isError ? (
              <p className="text-destructive py-8">
                Erro ao carregar feedbacks. Verifique se você tem permissão para acessar a tabela de
                feedbacks. Detalhe: {error instanceof Error ? error.message : String(error)}
              </p>
            ) : isLoading ? (
              <p className="text-muted-foreground py-8">Carregando feedbacks...</p>
            ) : filteredFeedbacks.length === 0 ? (
              <p className="text-muted-foreground py-8">
                Nenhum feedback encontrado com o filtro selecionado.
              </p>
            ) : (
              <>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-semibold">Data</th>
                        <th className="text-left p-3 font-semibold">Usuário</th>
                        <th className="text-left p-3 font-semibold">Tipo</th>
                        <th className="text-left p-3 font-semibold">Mensagem</th>
                        <th className="text-left p-3 font-semibold w-20">Ação</th>
                        <th className="text-left p-3 font-semibold min-w-[200px]">Status</th>
                        <th className="text-left p-3 font-semibold min-w-[280px]">Tipo de tratativa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacksPagina.map((feedback) => (
                        <tr key={feedback.id} className="border-t">
                          <td className="p-3 whitespace-nowrap text-muted-foreground">
                            {new Date(feedback.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3 font-medium">
                            {feedback.author_nome ?? feedback.user_id.slice(0, 8) + '…'}
                          </td>
                          <td className="p-3">{getTipoLabel(feedback.tipo)}</td>
                          <td className="p-3 max-w-xs">
                            <span className="line-clamp-2 block" title={feedback.mensagem}>
                              {feedback.mensagem}
                            </span>
                          </td>
                          <td className="p-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setFeedbackDetalhe(feedback)}
                              title="Ver mensagem completa"
                            >
                              <Eye className="h-4 w-4" />
                              Ver
                            </Button>
                          </td>
                          <td className="p-3 min-w-[200px]">
                            <Select
                              value={feedback.status}
                              onChange={(e) =>
                                updateStatusMutation.mutate({
                                  id: feedback.id,
                                  status: e.target.value as FeedbackStatus,
                                })
                              }
                              disabled={updateStatusMutation.isPending}
                              className="min-w-[170px] w-full max-w-[200px] h-9 pl-3 pr-8"
                            >
                              <option value="pendente">Pendente</option>
                              <option value="em_andamento">Em Andamento</option>
                              <option value="resolvido">Resolvido</option>
                              <option value="fechado">Fechado</option>
                            </Select>
                          </td>
                          <td className="p-3 min-w-[280px]">
                            <Select
                              value={feedback.tratativa_tipo ?? ''}
                              onChange={(e) => {
                                const v = e.target.value
                                updateTratativaTipoMutation.mutate({
                                  id: feedback.id,
                                  tratativa_tipo: v === '' ? null : v,
                                })
                              }}
                              disabled={updateTratativaTipoMutation.isPending}
                              className="min-w-[260px] w-full max-w-[280px] h-9 pl-3 pr-8"
                            >
                              {TRATATIVA_TIPO_OPTIONS.map((opt) => (
                                <option key={opt.value || 'vazio'} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Paginação */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Mostrando {totalItens === 0 ? 0 : paginaInicio + 1} a {paginaFim} de {totalItens}{' '}
                    feedback{totalItens !== 1 ? 's' : ''}
                  </span>
                  <Label htmlFor="itens-pagina" className="text-sm font-medium whitespace-nowrap">
                    Itens por página:
                  </Label>
                  <Select
                    id="itens-pagina"
                    value={String(itensPorPagina)}
                    onChange={(e) => {
                      setItensPorPagina(Number(e.target.value))
                      setPaginaAtual(1)
                    }}
                    className="w-[70px] h-8"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                    disabled={paginaAtual <= 1}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Página {paginaAtual} de {totalPaginas}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                    disabled={paginaAtual >= totalPaginas}
                    className="gap-1"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Modal: detalhe do feedback enviado pelo usuário */}
        {feedbackDetalhe && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setFeedbackDetalhe(null)}
          >
            <Card
              className="w-full max-w-lg max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader className="flex-shrink-0 border-b">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">Detalhe do feedback</CardTitle>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFeedbackDetalhe(null)}
                  >
                    Fechar
                  </Button>
                </div>
                <CardDescription>
                  Enviado em{' '}
                  {new Date(feedbackDetalhe.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  por {feedbackDetalhe.author_nome ?? feedbackDetalhe.user_id.slice(0, 8) + '…'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pt-4 space-y-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Tipo</Label>
                  <p className="font-medium">{getTipoLabel(feedbackDetalhe.tipo)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <p>
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        feedbackDetalhe.status
                      )}`}
                    >
                      {getStatusLabel(feedbackDetalhe.status)}
                    </span>
                  </p>
                </div>
                {feedbackDetalhe.tratativa_tipo && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Tipo de tratativa</Label>
                    <p className="font-medium">{getTratativaTipoLabel(feedbackDetalhe.tratativa_tipo)}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Mensagem enviada pelo usuário</Label>
                  <div className="mt-1 p-3 rounded-md bg-muted/50 border text-sm whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                    {feedbackDetalhe.mensagem}
                  </div>
                </div>
                <div>
                  <Label htmlFor="resposta-suporte" className="text-muted-foreground text-xs">
                    Resposta do suporte
                  </Label>
                  <Textarea
                    id="resposta-suporte"
                    placeholder="Digite sua resposta ao usuário..."
                    value={respostaTexto}
                    onChange={(e) => setRespostaTexto(e.target.value)}
                    className="mt-1 min-h-[100px] resize-y"
                    disabled={updateRespostaSuporteMutation.isPending}
                  />
                  <Button
                    type="button"
                    className="mt-2 w-full bg-[#fc4d00] hover:bg-[#e04400] text-white"
                    disabled={updateRespostaSuporteMutation.isPending}
                    onClick={() =>
                      updateRespostaSuporteMutation.mutate({
                        id: feedbackDetalhe.id,
                        resposta_suporte: respostaTexto.trim() || null,
                      })
                    }
                  >
                    {updateRespostaSuporteMutation.isPending ? 'Salvando...' : 'Salvar resposta'}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setFeedbackDetalhe(null)}
                >
                  Fechar
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
