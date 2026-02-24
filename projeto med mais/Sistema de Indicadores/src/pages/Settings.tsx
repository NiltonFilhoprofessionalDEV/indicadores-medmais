import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Eye, EyeOff, Check } from 'lucide-react'
import { formatBaseName, formatEquipeName } from '@/lib/utils'
import { renderTextWithBold, type UpdateInfo } from '@/components/UpdateModal'
import type { Database } from '@/lib/database.types'

type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']
type Feedback = Database['public']['Tables']['feedbacks']['Row']

// Schema para troca de senha
const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(1, 'Nova senha é obrigatória'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

// Schema para feedback
const feedbackSchema = z.object({
  tipo: z.enum(['bug', 'sugestao', 'outros'], {
    required_error: 'Selecione um tipo',
  }),
  mensagem: z.string().min(10, 'Mensagem deve ter no mínimo 10 caracteres'),
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>
type FeedbackFormData = z.infer<typeof feedbackSchema>

// Função para obter iniciais do nome
function getInitials(nome: string): string {
  const parts = nome.trim().split(' ')
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Settings() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { authUser } = useAuth()
  const queryClient = useQueryClient()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam === 'feedback' || tabParam === 'seguranca' || tabParam === 'atualizacoes' ? tabParam : 'perfil')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (tabParam === 'feedback' || tabParam === 'seguranca' || tabParam === 'atualizacoes') {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  // Buscar bases e equipes para exibir nomes
  const { data: bases } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

  const { data: equipes } = useQuery<Equipe[]>({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipes').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

  // Buscar feedbacks do usuário
  const { data: feedbacks } = useQuery<Feedback[]>({
    queryKey: ['feedbacks', authUser?.user?.id],
    queryFn: async () => {
      if (!authUser?.user.id) return []
      const { data, error } = await supabase
        .from('feedbacks')
        .select('*')
        .eq('user_id', authUser.user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!authUser?.user?.id,
  })

  // Carregar últimas atualizações do sistema (mesmo conteúdo do pop-up)
  const { data: updateInfo, isLoading: loadingUpdates, isError: errorUpdates } = useQuery<UpdateInfo | null>({
    queryKey: ['updates-json'],
    queryFn: async () => {
      try {
        const data = await import('@/data/updates.json')
        const info = data.default as UpdateInfo
        return info?.version ? info : null
      } catch {
        return null
      }
    },
  })

  // Formulário de troca de senha
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: errorsPassword },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  // Formulário de feedback
  const {
    register: registerFeedback,
    handleSubmit: handleSubmitFeedback,
    reset: resetFeedback,
    formState: { errors: errorsFeedback },
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      tipo: 'bug',
    },
  })

  // Mutation para trocar senha
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      })
      if (error) throw error
    },
    onSuccess: () => {
      alert('Senha alterada com sucesso!')
      resetPassword()
    },
    onError: (error: Error) => {
      alert(`Erro ao alterar senha: ${error.message}`)
    },
  })

  // Mutation para criar feedback
  const createFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      const userId = authUser?.user?.id
      if (!userId) throw new Error('Usuário não autenticado')

      const payload: Database['public']['Tables']['feedbacks']['Insert'] = {
        user_id: userId,
        tipo: data.tipo,
        mensagem: data.mensagem,
        status: 'pendente',
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- insert tipado como never no client; schema permite tipo + status
      const { error } = await supabase.from('feedbacks').insert(payload as any)
      if (error) throw error
    },
    onSuccess: () => {
      alert('Feedback enviado com sucesso! Obrigado pela sua contribuição.')
      resetFeedback()
      queryClient.invalidateQueries({ queryKey: ['feedbacks'] })
    },
    onError: (error: Error) => {
      alert(`Erro ao enviar feedback: ${error.message}`)
    },
  })

  const getBaseName = (baseId: string | null) => {
    if (!baseId) return '-'
    return formatBaseName(bases?.find((b) => b.id === baseId)?.nome ?? '') || '-'
  }

  const getEquipeName = (equipeId: string | null) => {
    if (!equipeId) return '-'
    return formatEquipeName(equipes?.find((e) => e.id === equipeId)?.nome || '-')
  }

  const getTipoLabel = (tipo: string) => {
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

  const getStatusLabel = (status: string) => {
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

  const getStatusColor = (status: string) => {
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
                <h1 className="text-2xl font-bold text-white">Configurações</h1>
                <p className="text-sm text-white/90">Gerencie seu perfil e preferências</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <Button 
                onClick={() => {
                  if (authUser.profile?.role === 'geral' || authUser.profile?.role === 'gerente_sci') {
                    navigate('/dashboard-gerente')
                  } else {
                    navigate('/dashboard-chefe')
                  }
                }} 
                className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-white transition-all duration-200 shadow-orange-sm"
              >
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Configurações da Conta</CardTitle>
            <CardDescription>
              Gerencie suas informações pessoais, segurança e envie feedback
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="perfil">Meu Perfil</TabsTrigger>
                <TabsTrigger value="seguranca">Segurança</TabsTrigger>
                <TabsTrigger value="atualizacoes">Atualizações</TabsTrigger>
                <TabsTrigger value="feedback">Suporte / Feedback</TabsTrigger>
              </TabsList>

              {/* Aba: Meu Perfil */}
              <TabsContent value="perfil" className="space-y-6 mt-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl font-bold bg-[#fc4d00] text-white">
                      {getInitials(authUser.profile.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <h3 className="text-xl font-semibold">{authUser.profile.nome}</h3>
                    <p className="text-sm text-muted-foreground">
                      {authUser.profile.role === 'geral' ? 'Administrador' : authUser.profile.role === 'gerente_sci' ? 'Gerente de SCI' : authUser.profile.role === 'auxiliar' ? 'Líder de Resgate' : 'Chefe de Equipe'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome Completo</Label>
                    <Input
                      value={authUser.profile.nome}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      value={authUser.user.email || 'N/A'}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Perfil</Label>
                    <Input
                      value={authUser.profile.role === 'geral' ? 'Administrador' : authUser.profile.role === 'gerente_sci' ? 'Gerente de SCI' : authUser.profile.role === 'auxiliar' ? 'Líder de Resgate' : 'Chefe de Equipe'}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Base</Label>
                    <Input
                      value={getBaseName(authUser.profile.base_id)}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  {authUser.profile.equipe_id && (
                    <div className="space-y-2">
                      <Label>Equipe</Label>
                      <Input
                        value={getEquipeName(authUser.profile.equipe_id)}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Aba: Segurança */}
              <TabsContent value="seguranca" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Alterar Senha</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Digite sua nova senha abaixo. Certifique-se de usar uma senha forte.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitPassword((data) => changePasswordMutation.mutate(data))} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova Senha *</Label>
                      <div className="relative">
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Digite sua nova senha"
                          className="pr-10"
                          {...registerPassword('newPassword')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword((v) => !v)}
                          aria-label={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          tabIndex={-1}
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errorsPassword.newPassword && (
                        <p className="text-sm text-destructive">{errorsPassword.newPassword.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmar Nova Senha *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirme sua nova senha"
                          className="pr-10"
                          {...registerPassword('confirmPassword')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword((v) => !v)}
                          aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      {errorsPassword.confirmPassword && (
                        <p className="text-sm text-destructive">{errorsPassword.confirmPassword.message}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      disabled={changePasswordMutation.isPending}
                      className="bg-[#fc4d00] hover:bg-[#e04400]hover:bg-[#c93d00] text-white shadow-orange-sm"
                    >
                      {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
                    </Button>
                  </form>
                </div>
              </TabsContent>

              {/* Aba: Atualizações do sistema */}
              <TabsContent value="atualizacoes" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">O que há de novo</h3>
                    <p className="text-sm text-muted-foreground">
                      Consulte as últimas alterações e melhorias do sistema.
                    </p>
                  </div>
                  {loadingUpdates ? (
                    <p className="text-sm text-muted-foreground py-6">Carregando...</p>
                  ) : errorUpdates || !updateInfo ? (
                    <p className="text-sm text-muted-foreground py-6">
                      Não foi possível carregar as atualizações no momento.
                    </p>
                  ) : (
                    <Card className="border-primary/20">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 text-[#fc4d00]">
                          <span className="text-2xl" aria-hidden>✨</span>
                        </div>
                        <CardTitle className="text-lg">
                          {renderTextWithBold(updateInfo.titulo, 'upd-titulo')}
                        </CardTitle>
                        <CardDescription>
                          Versão {updateInfo.version} · {updateInfo.data}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <ul className="space-y-3">
                          {updateInfo.novidades.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <span
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-600 dark:bg-green-500/30 dark:text-green-400 mt-0.5"
                                aria-hidden
                              >
                                <Check className="h-3 w-3" strokeWidth={2.5} />
                              </span>
                              <span className="break-words min-w-0 whitespace-pre-line">
                                {renderTextWithBold(item, `upd-nov-${i}`)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Aba: Feedback */}
              <TabsContent value="feedback" className="space-y-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Enviar Feedback</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Encontrou um bug? Tem uma sugestão? Envie-nos sua mensagem e ajudaremos você.
                    </p>
                  </div>

                  <form onSubmit={handleSubmitFeedback((data) => createFeedbackMutation.mutate(data))} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo *</Label>
                      <Select
                        id="tipo"
                        {...registerFeedback('tipo')}
                      >
                        <option value="bug">Bug</option>
                        <option value="sugestao">Sugestão</option>
                        <option value="outros">Outros</option>
                      </Select>
                      {errorsFeedback.tipo && (
                        <p className="text-sm text-destructive">{errorsFeedback.tipo.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mensagem">Mensagem *</Label>
                      <Textarea
                        id="mensagem"
                        placeholder="Descreva o problema, sugestão ou comentário..."
                        rows={6}
                        {...registerFeedback('mensagem')}
                      />
                      {errorsFeedback.mensagem && (
                        <p className="text-sm text-destructive">{errorsFeedback.mensagem.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Mínimo de 10 caracteres
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={createFeedbackMutation.isPending}
                      className="bg-[#fc4d00] hover:bg-[#e04400]hover:bg-[#c93d00] text-white shadow-orange-sm"
                    >
                      {createFeedbackMutation.isPending ? 'Enviando...' : 'Enviar Feedback'}
                    </Button>
                  </form>

                  {/* Lista de feedbacks anteriores */}
                  {feedbacks && feedbacks.length > 0 && (
                    <div className="mt-8 space-y-4">
                      <h3 className="text-lg font-semibold">Meus Feedbacks Anteriores</h3>
                      <div className="space-y-2">
                        {feedbacks.map((feedback) => (
                          <Card key={feedback.id} className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getTipoLabel(feedback.tipo)}</span>
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(feedback.status)}`}
                                >
                                  {getStatusLabel(feedback.status)}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(feedback.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{feedback.mensagem}</p>
                            {feedback.resposta_suporte && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Resposta do suporte:</p>
                                <p className="text-sm whitespace-pre-wrap">{feedback.resposta_suporte}</p>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
