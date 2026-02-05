import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Trash2, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']

const DEFAULT_PASSWORD = 'Mudar@123'

// Função para gerar senha baseada no email (parte antes do @ + @)
function generatePasswordFromEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return DEFAULT_PASSWORD
  }
  const emailPrefix = email.split('@')[0]
  // Retornar parte antes do @ + @ (exemplo: cabralsussa@)
  return `${emailPrefix}@`
}

const bulkUserSchema = z.object({
  users: z.array(
    z.object({
      nome: z.string().min(1, 'Nome é obrigatório'),
      email: z.string().email('Email inválido'),
      password: z.string().min(1, 'Senha é obrigatória'),
      role: z.enum(['geral', 'chefe'], {
        required_error: 'Selecione um perfil',
      }),
      base_id: z.string().optional(),
      equipe_id: z.string().optional(),
    }).refine((data) => {
      if (data.role === 'chefe') {
        return !!data.base_id && !!data.equipe_id
      }
      return true
    }, {
      message: 'Base e Equipe são obrigatórios para Chefe de Equipe',
      path: ['base_id'],
    })
  ).min(1, 'Adicione pelo menos um usuário'),
})

type BulkUserFormData = z.infer<typeof bulkUserSchema>

interface BulkUserFormProps {
  bases: Base[]
  equipes: Equipe[]
  lockedBaseId?: string // Base travada (ex: para Gerente de SCI)
  onSuccess: () => void
  onCancel: () => void
}

interface UserCreationResult {
  success: boolean
  email: string
  nome: string
  error?: string
}

export function BulkUserForm({ bases, equipes, lockedBaseId, onSuccess, onCancel }: BulkUserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState<UserCreationResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({})
  const [usersToCreateRef, setUsersToCreateRef] = useState<Array<{ email: string; password: string; nome: string; role: 'geral' | 'chefe'; base_id?: string; equipe_id?: string }>>([])

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BulkUserFormData>({
    resolver: zodResolver(bulkUserSchema),
    defaultValues: {
      users: Array(5).fill(null).map(() => ({
        nome: '',
        email: '',
        password: DEFAULT_PASSWORD,
        role: 'chefe' as const,
        base_id: '',
        equipe_id: '',
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'users',
  })

  const users = watch('users')

  // Quando lockedBaseId é definido, preencher base_id de todos os chefes
  useEffect(() => {
    if (lockedBaseId && fields.length > 0) {
      fields.forEach((_, index) => {
        const role = watch(`users.${index}.role`)
        if (role === 'chefe') {
          setValue(`users.${index}.base_id`, lockedBaseId)
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedBaseId])

  // Buscar base ADMINISTRATIVO para Gerentes Gerais
  const baseAdministrativo = bases.find((b) => b.nome === 'ADMINISTRATIVO')

  // Função para gerar senha baseada no email ou padrão
  const generateDefaultPassword = (index: number) => {
    const currentEmail = watch(`users.${index}.email`)
    if (currentEmail && currentEmail.includes('@')) {
      const generatedPassword = generatePasswordFromEmail(currentEmail)
      setValue(`users.${index}.password`, generatedPassword)
    } else {
      setValue(`users.${index}.password`, DEFAULT_PASSWORD)
    }
  }
  
  // Auto-gerar senha quando email for preenchido
  const handleEmailChange = (index: number, email: string) => {
    setValue(`users.${index}.email`, email)
    // Se não houver senha ou senha for a padrão, gerar baseada no email
    const currentPassword = watch(`users.${index}.password`)
    if (!currentPassword || currentPassword === DEFAULT_PASSWORD || currentPassword === '') {
      if (email && email.includes('@')) {
        const generatedPassword = generatePasswordFromEmail(email)
        setValue(`users.${index}.password`, generatedPassword)
      }
    }
  }

  // Função para replicar Base para todos
  const replicateBaseToAll = (baseId: string) => {
    users.forEach((_, index) => {
      if (users[index].role === 'chefe') {
        setValue(`users.${index}.base_id`, baseId)
      }
    })
  }

  // Função para replicar Equipe para todos
  const replicateEquipeToAll = (equipeId: string) => {
    users.forEach((_, index) => {
      if (users[index].role === 'chefe') {
        setValue(`users.${index}.equipe_id`, equipeId)
      }
    })
  }

  // Efeito para atualizar base_id quando role muda para 'geral' ou quando lockedBaseId
  const handleRoleChange = (index: number, role: 'geral' | 'chefe') => {
    setValue(`users.${index}.role`, role)
    if (role === 'geral' && baseAdministrativo && !lockedBaseId) {
      setValue(`users.${index}.base_id`, baseAdministrativo.id)
      setValue(`users.${index}.equipe_id`, '')
    } else if (role === 'chefe') {
      setValue(`users.${index}.base_id`, lockedBaseId || '')
      setValue(`users.${index}.equipe_id`, '')
    }
  }

  const onSubmit = async (data: BulkUserFormData) => {
    // Filtrar apenas usuários com nome preenchido e validar campos obrigatórios
    const usersToCreate = data.users.filter((user) => {
      if (user.nome.trim() === '') return false
      if (user.email.trim() === '') return false
      if (user.password.trim() === '') return false
      if (user.role === 'chefe' && (!user.base_id || !user.equipe_id)) {
        return false
      }
      return true
    })
    
    // Armazenar referência para mostrar senhas depois
    setUsersToCreateRef(usersToCreate)

    if (usersToCreate.length === 0) {
      alert('Adicione pelo menos um usuário válido com todos os campos obrigatórios preenchidos')
      return
    }

    // Validar emails únicos
    const emails = usersToCreate.map((u) => u.email.toLowerCase())
    const uniqueEmails = new Set(emails)
    if (emails.length !== uniqueEmails.size) {
      alert('Erro: Existem emails duplicados na lista. Verifique e corrija antes de continuar.')
      return
    }

    setIsSubmitting(true)
    setProgress({ current: 0, total: usersToCreate.length })
    setResults([])
    setShowResults(false)

    const resultsArray: UserCreationResult[] = []

    // Processar sequencialmente para evitar rate limit
    for (let i = 0; i < usersToCreate.length; i++) {
      const user = usersToCreate[i]
      setProgress({ current: i + 1, total: usersToCreate.length })

      try {
        const payload = {
          email: user.email,
          password: user.password,
          nome: user.nome,
          role: user.role,
          base_id: user.role === 'chefe' ? user.base_id || null : null,
          equipe_id: user.role === 'chefe' ? user.equipe_id || null : null,
        }
        
        console.log(`[BulkUserForm] Criando usuário ${i + 1}/${usersToCreate.length}:`, {
          email: payload.email,
          nome: payload.nome,
          role: payload.role,
          hasBaseId: !!payload.base_id,
          hasEquipeId: !!payload.equipe_id,
        })
        
        const response = await supabase.functions.invoke('create-user', {
          body: payload,
        })
        
        console.log(`[BulkUserForm] Resposta para ${user.email}:`, response)

        // Se houver erro na chamada da função
        if (response.error) {
          const errorMessage = response.error.message || ''
          
          // Se o erro é "non-2xx status code", tentar extrair a mensagem do response.data
          if (errorMessage.includes('non-2xx') || errorMessage.includes('status code')) {
            // Tentar fazer uma chamada direta para obter a mensagem de erro
            try {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
              const { data: sessionData } = await supabase.auth.getSession()
              
              const directResponse = await fetch(
                `${supabaseUrl}/functions/v1/create-user`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    ...(sessionData.session ? { 'apikey': supabaseAnonKey } : {}),
                  },
                  body: JSON.stringify({
                    email: user.email,
                    password: user.password,
                    nome: user.nome,
                    role: user.role,
                    base_id: user.role === 'chefe' ? user.base_id || null : null,
                    equipe_id: user.role === 'chefe' ? user.equipe_id || null : null,
                  }),
                }
              )

              const responseData = await directResponse.json()
              
              if (!directResponse.ok) {
                const errorMsg = responseData?.error || responseData?.message || errorMessage
                resultsArray.push({
                  success: false,
                  email: user.email,
                  nome: user.nome,
                  error: errorMsg,
                })
              } else {
                // Sucesso na chamada direta
                resultsArray.push({
                  success: true,
                  email: user.email,
                  nome: user.nome,
                })
              }
            } catch (fetchError: any) {
              // Se falhar na chamada direta, usar a mensagem original ou a do fetchError
              const finalError = fetchError?.message || response.data?.error || errorMessage || 'Erro desconhecido'
              resultsArray.push({
                success: false,
                email: user.email,
                nome: user.nome,
                error: finalError,
              })
            }
          } else {
            // Outro tipo de erro
            let finalErrorMessage = errorMessage || 'Erro desconhecido'
            
            // Tentar extrair mensagem de erro do response.data se disponível
            if (response.data && typeof response.data === 'object') {
              if ('error' in response.data) {
                finalErrorMessage = String(response.data.error) || finalErrorMessage
              } else if ('message' in response.data) {
                finalErrorMessage = String(response.data.message) || finalErrorMessage
              }
            }
            
            resultsArray.push({
              success: false,
              email: user.email,
              nome: user.nome,
              error: finalErrorMessage,
            })
          }
        } else if (response.data) {
          // Verificar se há erro no resultado (status não 2xx)
          if (typeof response.data === 'object' && 'error' in response.data) {
            const errorMessage = typeof response.data.error === 'string' 
              ? response.data.error 
              : 'Erro desconhecido'
            resultsArray.push({
              success: false,
              email: user.email,
              nome: user.nome,
              error: errorMessage,
            })
          } else if (typeof response.data === 'object' && 'success' in response.data && response.data.success) {
            // Sucesso
            resultsArray.push({
              success: true,
              email: user.email,
              nome: user.nome,
            })
          } else {
            // Resposta inesperada
            resultsArray.push({
              success: false,
              email: user.email,
              nome: user.nome,
              error: 'Resposta inesperada da Edge Function',
            })
          }
        } else {
          // Sem dados na resposta
          resultsArray.push({
            success: false,
            email: user.email,
            nome: user.nome,
            error: 'Nenhuma resposta da Edge Function',
          })
        }
      } catch (error: any) {
        console.error('Erro ao criar usuário:', user.email, error)
        resultsArray.push({
          success: false,
          email: user.email,
          nome: user.nome,
          error: error?.message || 'Erro desconhecido',
        })
      }

      // Pequeno delay para evitar rate limit
      if (i < usersToCreate.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300))
      }
    }

    setResults(resultsArray)
    setShowResults(true)
    setIsSubmitting(false)

    // Contar sucessos e falhas
    const successCount = resultsArray.filter((r) => r.success).length
    const failureCount = resultsArray.filter((r) => !r.success).length

    if (failureCount === 0) {
      alert(`${successCount} usuário(s) criado(s) com sucesso!`)
      onSuccess()
    } else {
      // Mostrar resumo de erros
      const failedEmails = resultsArray
        .filter((r) => !r.success)
        .map((r) => r.email)
        .join(', ')
      
      alert(
        `${successCount} usuário(s) criado(s) com sucesso.\n` +
        `${failureCount} falha(s): ${failedEmails}\n\n` +
        `Verifique os detalhes abaixo.`
      )
    }
  }

  const addNewRow = () => {
    append({
      nome: '',
      email: '',
      password: DEFAULT_PASSWORD,
      role: 'chefe' as const,
      base_id: '',
      equipe_id: '',
    })
  }

  return (
    <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle>Cadastro de Usuários em Lote</CardTitle>
        <CardDescription>
          Cadastre múltiplos usuários de uma vez. Preencha os dados abaixo e clique em "Salvar Todos".
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Barra de Progresso */}
          {isSubmitting && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-900">
                  Salvando {progress.current} de {progress.total}...
                </span>
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Resultados */}
          {showResults && results.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-sm mb-2">Resultado do Cadastro:</h3>
              {results.map((result, idx) => {
                // Encontrar a senha usada para este usuário
                const userIndex = usersToCreateRef.findIndex((u) => u.email === result.email)
                const userPassword = userIndex >= 0 ? usersToCreateRef[userIndex].password : DEFAULT_PASSWORD
                
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 text-sm p-2 rounded ${
                      result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}
                  >
                    {result.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{result.nome}</span>
                        <span className="text-xs">({result.email})</span>
                      </div>
                      {result.success && (
                        <div className="mt-1 text-xs font-mono bg-white px-2 py-1 rounded border">
                          <span className="font-semibold">Senha:</span> {userPassword}
                        </div>
                      )}
                    </div>
                    {result.error && (
                      <span className="text-xs ml-auto">Erro: {result.error}</span>
                    )}
                  </div>
                )
              })}
              {results.some((r) => r.success) && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs font-semibold text-blue-900 mb-1">
                    ⚠️ IMPORTANTE: Anote as senhas acima. Elas não serão exibidas novamente!
                  </p>
                  <p className="text-xs text-blue-800">
                    Senha padrão do sistema: <span className="font-mono font-semibold">{DEFAULT_PASSWORD}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tabela de Usuários */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-2 font-semibold text-sm">Nome Completo *</th>
                  <th className="text-left p-2 font-semibold text-sm">Email *</th>
                  <th className="text-left p-2 font-semibold text-sm">Senha *</th>
                  <th className="text-left p-2 font-semibold text-sm">Perfil *</th>
                  <th className="text-left p-2 font-semibold text-sm">
                    <div className="flex items-center gap-2">
                      <span>Base *</span>
                      {users.some((u) => u.role === 'chefe' && u.base_id) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const firstBaseId = users.find((u) => u.role === 'chefe' && u.base_id)?.base_id
                            if (firstBaseId) {
                              replicateBaseToAll(firstBaseId)
                            }
                          }}
                          className="h-6 text-xs"
                          title="Aplicar Base da primeira linha a todos"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Aplicar a todos
                        </Button>
                      )}
                    </div>
                  </th>
                  <th className="text-left p-2 font-semibold text-sm">
                    <div className="flex items-center gap-2">
                      <span>Equipe *</span>
                      {users.some((u) => u.role === 'chefe' && u.equipe_id) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const firstEquipeId = users.find((u) => u.role === 'chefe' && u.equipe_id)?.equipe_id
                            if (firstEquipeId) {
                              replicateEquipeToAll(firstEquipeId)
                            }
                          }}
                          className="h-6 text-xs"
                          title="Aplicar Equipe da primeira linha a todos"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Aplicar a todos
                        </Button>
                      )}
                    </div>
                  </th>
                  <th className="text-left p-2 font-semibold text-sm w-16">Ações</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <Input
                        {...register(`users.${index}.nome`)}
                        placeholder="Nome completo"
                        className="h-9 text-sm"
                      />
                      {errors.users?.[index]?.nome && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.users[index]?.nome?.message}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      <Input
                        {...register(`users.${index}.email`)}
                        type="email"
                        placeholder="email@exemplo.com"
                        className="h-9 text-sm"
                        onChange={(e) => {
                          register(`users.${index}.email`).onChange(e)
                          handleEmailChange(index, e.target.value)
                        }}
                      />
                      {errors.users?.[index]?.email && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.users[index]?.email?.message}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          <Input
                            {...register(`users.${index}.password`)}
                            type={showPasswords[index] ? 'text' : 'password'}
                            placeholder="Senha"
                            className="h-9 text-sm flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => generateDefaultPassword(index)}
                            className="h-9 px-2"
                            title={users[index].email && users[index].email.includes('@')
                              ? `Gerar senha do email: ${users[index].email.split('@')[0]}@`
                              : `Gerar senha padrão: ${DEFAULT_PASSWORD}`}
                          >
                            🔑
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPasswords(prev => ({ ...prev, [index]: !prev[index] }))}
                            className="h-9 px-2"
                            title={showPasswords[index] ? 'Ocultar senha' : 'Mostrar senha'}
                          >
                            {showPasswords[index] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {users[index].password && users[index].password.endsWith('@') && (
                          <p className="text-xs text-blue-600 font-medium">
                            Senha gerada automaticamente: <span className="font-mono">{users[index].password}</span>
                          </p>
                        )}
                        {errors.users?.[index]?.password && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.users[index]?.password?.message}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <select
                        {...register(`users.${index}.role`)}
                        onChange={(e) => handleRoleChange(index, e.target.value as 'geral' | 'chefe')}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        disabled={!!lockedBaseId}
                      >
                        <option value="chefe">Chefe</option>
                        {!lockedBaseId && <option value="geral">Gerente</option>}
                      </select>
                      {errors.users?.[index]?.role && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.users[index]?.role?.message}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      {users[index].role === 'geral' ? (
                        <select
                          {...register(`users.${index}.base_id`)}
                          disabled
                          className="flex h-9 w-full rounded-md border border-input bg-gray-100 px-3 py-1 text-sm"
                        >
                          {baseAdministrativo && (
                            <option value={baseAdministrativo.id}>{baseAdministrativo.nome}</option>
                          )}
                        </select>
                      ) : (
                        <select
                          {...register(`users.${index}.base_id`)}
                          className={`flex h-9 w-full rounded-md border border-input px-3 py-1 text-sm ${lockedBaseId ? 'bg-gray-100' : 'bg-background'}`}
                          disabled={!!lockedBaseId}
                        >
                          <option value="">Selecione</option>
                          {bases
                            .filter((b) => b.nome !== 'ADMINISTRATIVO')
                            .map((base) => (
                              <option key={base.id} value={base.id}>
                                {base.nome}
                              </option>
                            ))}
                        </select>
                      )}
                      {errors.users?.[index]?.base_id && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.users[index]?.base_id?.message}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      {users[index].role === 'geral' ? (
                        <Input
                          disabled
                          value="-"
                          className="h-9 text-sm bg-gray-100"
                        />
                      ) : (
                        <select
                          {...register(`users.${index}.equipe_id`)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        >
                          <option value="">Selecione</option>
                          {equipes.map((equipe) => (
                            <option key={equipe.id} value={equipe.id}>
                              {equipe.nome}
                            </option>
                          ))}
                        </select>
                      )}
                      {errors.users?.[index]?.equipe_id && (
                        <p className="text-xs text-red-600 mt-1">
                          {errors.users[index]?.equipe_id?.message}
                        </p>
                      )}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remover linha"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={addNewRow}
              className="flex-1"
            >
              + Adicionar Linha
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#fc4d00] hover:bg-[#e04400] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                `Salvar Todos (${fields.length})`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
