import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BulkUserForm } from '@/components/BulkUserForm'
import { Eye, EyeOff } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']

const createUserSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  role: z.enum(['geral', 'chefe', 'gerente_sci'], {
    required_error: 'Selecione um perfil',
  }),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
}).refine((data) => {
  if (data.role === 'chefe') return !!data.base_id && !!data.equipe_id
  if (data.role === 'gerente_sci') return !!data.base_id
  return true
}, {
  message: 'Base e Equipe são obrigatórios para Chefe de Equipe; Base é obrigatória para Gerente de SCI',
  path: ['base_id'],
})

const updateUserSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.union([
    z.string().email('Email inválido'),
    z.literal(''),
    z.literal('N/A'),
  ]).optional(),
  password: z.string().optional().or(z.literal('')),
  role: z.enum(['geral', 'chefe', 'gerente_sci'], {
    required_error: 'Selecione um perfil',
  }),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
}).refine((data) => {
  if (data.role === 'chefe') return !!data.base_id && !!data.equipe_id
  if (data.role === 'gerente_sci') return !!data.base_id
  return true
}, {
  message: 'Base e Equipe são obrigatórios para Chefe de Equipe; Base é obrigatória para Gerente de SCI',
  path: ['base_id'],
})

type CreateUserFormData = z.infer<typeof createUserSchema>
type UpdateUserFormData = z.infer<typeof updateUserSchema>

interface UsuarioComEmail {
  id: string
  nome: string
  email: string
  role: 'geral' | 'chefe' | 'gerente_sci'
  base_id: string | null
  equipe_id: string | null
  created_at: string
  updated_at: string
}

export function GestaoUsuarios() {
  const navigate = useNavigate()
  const { authUser } = useAuth()
  const isGerenteSCI = authUser?.profile?.role === 'gerente_sci'
  const gerenteSCIBaseId = authUser?.profile?.base_id ?? ''
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioComEmail | null>(null)
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [filtroBaseId, setFiltroBaseId] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const queryClient = useQueryClient()
  
  const DEFAULT_PASSWORD = 'Mudar@123'
  
  // Função para gerar senha baseada no email (parte antes do @ + @)
  const generatePasswordFromEmail = (email: string) => {
    if (email && email.includes('@')) {
      const emailPrefix = email.split('@')[0]
      return `${emailPrefix}@`
    }
    return DEFAULT_PASSWORD
  }

  // Buscar usuários
  type Profile = Database['public']['Tables']['profiles']['Row']
  const baseFilter = isGerenteSCI ? gerenteSCIBaseId : filtroBaseId
  const { data: usuarios, isLoading, error: usuariosError } = useQuery<UsuarioComEmail[]>({
    queryKey: ['usuarios', baseFilter],
    queryFn: async () => {
      try {
        let profiles: Profile[] = []

        // Aplicar filtro por base se selecionado (ou obrigatório para gerente_sci)
        // IMPORTANTE: Gerentes Gerais (role='geral') sempre aparecem, independente do filtro
        if (baseFilter && baseFilter !== '') {
          // Buscar usuários da base selecionada
          const { data: usuariosBase, error: errorBase } = await supabase
            .from('profiles')
            .select('*')
            .eq('base_id', baseFilter)
            .order('created_at', { ascending: false })

          if (errorBase) {
            console.error('Erro ao buscar usuários da base:', errorBase)
            throw errorBase
          }

          // Buscar Gerentes Gerais (sempre aparecem)
          const { data: gerentesGerais, error: errorGeral } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'geral')
            .order('created_at', { ascending: false })

          if (errorGeral) {
            console.error('Erro ao buscar gerentes gerais:', errorGeral)
            throw errorGeral
          }

          // Combinar resultados e remover duplicatas
          const allProfiles: Profile[] = [...(usuariosBase as Profile[] || []), ...(gerentesGerais as Profile[] || [])]
          const uniqueProfiles = allProfiles.filter((profile, index, self) =>
            index === self.findIndex((p) => p.id === profile.id)
          )
          profiles = uniqueProfiles
        } else {
          // Sem filtro: buscar todos os usuários
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

          if (error) {
            console.error('Erro ao buscar usuários:', error)
            throw error
          }

          profiles = (data as Profile[]) || []
        }

        // Buscar emails dos usuários através de uma query que junta com auth.users
        // Como não podemos acessar auth.users diretamente, vamos usar uma abordagem diferente
        // Vamos retornar os profiles e buscar os emails separadamente se necessário
        const profilesWithEmails: UsuarioComEmail[] = profiles.map((profile): UsuarioComEmail => ({
          id: profile.id,
          nome: profile.nome,
          role: profile.role,
          base_id: profile.base_id,
          equipe_id: profile.equipe_id,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          email: 'N/A', // Será preenchido se tivermos acesso
        }))

        return profilesWithEmails
      } catch (error) {
        console.error('Erro na query de usuários:', error)
        throw error
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Buscar bases e equipes
  // Gerente de SCI: travar filtro e base na base dele
  useEffect(() => {
    if (isGerenteSCI && gerenteSCIBaseId) {
      setFiltroBaseId(gerenteSCIBaseId)
    }
  }, [isGerenteSCI, gerenteSCIBaseId])

  const { data: bases, error: basesError } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('bases').select('*').order('nome')
        if (error) {
          console.error('Erro ao buscar bases:', error)
          throw error
        }
        return data || []
      } catch (error) {
        console.error('Erro na query de bases:', error)
        throw error
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: equipes, error: equipesError } = useQuery<Equipe[]>({
    queryKey: ['equipes'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from('equipes').select('*').order('nome')
        if (error) {
          console.error('Erro ao buscar equipes:', error)
          throw error
        }
        return data || []
      } catch (error) {
        console.error('Erro na query de equipes:', error)
        throw error
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })

  // Form para criar usuário
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormData | UpdateUserFormData>({
    resolver: zodResolver(isEditMode ? updateUserSchema : createUserSchema),
    defaultValues: {
      role: 'chefe',
    },
  })

  const role = watch('role')

  // Efeito para seleção automática: ADMINISTRATIVO quando role='geral', base travada quando gerente_sci
  useEffect(() => {
    if (role === 'geral' && !isGerenteSCI) {
      const baseAdministrativo = bases?.find((b) => b.nome === 'ADMINISTRATIVO')
      if (baseAdministrativo) {
        setValue('base_id', baseAdministrativo.id)
        setValue('equipe_id', '')
      }
    } else if (role === 'gerente_sci') {
      setValue('equipe_id', '')
      if (!isGerenteSCI) setValue('base_id', '')
      else if (gerenteSCIBaseId) setValue('base_id', gerenteSCIBaseId)
    } else if (role === 'chefe') {
      if (isGerenteSCI && gerenteSCIBaseId) {
        setValue('base_id', gerenteSCIBaseId)
      } else {
        setValue('base_id', '')
      }
      setValue('equipe_id', '')
    }
  }, [role, bases, setValue, isGerenteSCI, gerenteSCIBaseId])

  // Função alternativa para criar usuário diretamente (quando Edge Function não está disponível)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function createUserDirectly(_data: CreateUserFormData) {
    // Este método não funciona porque signUp não permite criar usuários como admin
    // A Edge Function é necessária para criar usuários com Service Role Key
    throw new Error(
      'Edge Function não está disponível. Por favor, faça o deploy da Edge Function "create-user" no Supabase. ' +
      'Consulte o arquivo DEPLOY_EDGE_FUNCTION.md para instruções.'
    )
  }

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      try {
        // Tentar usar a Edge Function primeiro
        try {
          const response = await supabase.functions.invoke('create-user', {
            body: {
              email: data.email,
              password: data.password,
              nome: data.nome,
              role: data.role,
              base_id: data.base_id || null,
              equipe_id: data.equipe_id || null,
            },
          })

          console.log('Resposta completa da Edge Function:', response)

          // Se houver erro na chamada da função (erro de rede, etc)
          if (response.error) {
            console.error('Erro ao chamar Edge Function:', response.error)
            
            // Se o erro indica que a função não existe ou não está acessível
            const errorMessage = response.error.message || ''
            if (
              errorMessage.includes('Failed to send') ||
              errorMessage.includes('Function not found') ||
              errorMessage.includes('404') ||
              errorMessage.includes('not found')
            ) {
              // Fallback: criar usuário diretamente via API (requer permissões)
              console.warn('Edge Function não disponível, tentando método alternativo...')
              return await createUserDirectly(data)
            }
            
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
                      email: data.email,
                      password: data.password,
                      nome: data.nome,
                      role: data.role,
                      base_id: data.base_id || null,
                      equipe_id: data.equipe_id || null,
                    }),
                  }
                )

                const responseData = await directResponse.json()
                
                if (!directResponse.ok) {
                  const errorMsg = responseData?.error || responseData?.message || errorMessage
                  throw new Error(errorMsg)
                }

                // Se chegou aqui, foi sucesso
                return responseData
              } catch (fetchError: any) {
                // Se falhar na chamada direta, usar a mensagem original ou a do fetchError
                const finalError = fetchError?.message || response.data?.error || errorMessage
                throw new Error(finalError)
              }
            }
            
            // Tentar extrair mensagem de erro do response.data se disponível
            let finalErrorMessage = errorMessage || 'Erro ao chamar a função'
            
            // Se o erro contém dados adicionais
            if (response.data && typeof response.data === 'object') {
              if ('error' in response.data) {
                finalErrorMessage = String(response.data.error) || finalErrorMessage
              } else if ('message' in response.data) {
                finalErrorMessage = String(response.data.message) || finalErrorMessage
              }
            }
            
            throw new Error(finalErrorMessage)
          }

          // Verificar se há erro no resultado (status não 2xx)
          if (response.data) {
            // Se a resposta contém um campo 'error', é um erro
            if (typeof response.data === 'object' && 'error' in response.data) {
              const errorMessage = typeof response.data.error === 'string' 
                ? response.data.error 
                : 'Erro desconhecido'
              console.error('Erro retornado pela Edge Function:', response.data)
              throw new Error(errorMessage)
            }

            // Verificar se foi sucesso
            if (typeof response.data === 'object' && 'success' in response.data && response.data.success) {
              return response.data
            }
          }

          // Se chegou aqui, a resposta foi inesperada
          console.error('Resposta inesperada:', response)
          throw new Error('Resposta inesperada da Edge Function')
        } catch (edgeFunctionError: any) {
          // Se o erro indica que a função não está disponível, tenta método alternativo
          const errorMsg = edgeFunctionError?.message || ''
          if (
            errorMsg.includes('Failed to send') ||
            errorMsg.includes('Function not found') ||
            errorMsg.includes('404') ||
            errorMsg.includes('not found') ||
            errorMsg.includes('Network') ||
            errorMsg.includes('fetch')
          ) {
            console.warn('Edge Function não disponível, tentando método alternativo...')
            return await createUserDirectly(data)
          }
          throw edgeFunctionError
        }
      } catch (error: any) {
        // Capturar erros de parsing JSON ou outros erros
        console.error('Erro completo na mutation:', error)
        if (error instanceof Error) {
          throw error
        }
        throw new Error(error?.message || 'Erro desconhecido ao criar usuário')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setShowModal(false)
      reset()
      alert('Usuário criado com sucesso!')
    },
    onError: (error: Error) => {
      console.error('Erro ao criar usuário:', error)
      const errorMessage = error.message || 'Erro desconhecido ao criar usuário'
      
      // Mensagem mais amigável se for erro de Edge Function
      if (errorMessage.includes('Edge Function não está disponível') || 
          errorMessage.includes('Failed to send') ||
          errorMessage.includes('Function not found')) {
        alert(
          '⚠️ Edge Function não está disponível!\n\n' +
          'Para cadastrar usuários, você precisa fazer o deploy da Edge Function "create-user".\n\n' +
          'Opções:\n' +
          '1. Use o Supabase CLI: supabase functions deploy create-user\n' +
          '2. Ou use o Dashboard do Supabase: Edge Functions > Create a new function\n\n' +
          'Consulte: supabase/functions/create-user/README.md'
        )
      } else {
        alert(`Erro: ${errorMessage}`)
      }
    },
  })

  // Mutation para atualizar usuário
  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserFormData) => {
      try {
        const response = await supabase.functions.invoke('update-user', {
          body: {
            id: data.id,
            nome: data.nome,
            role: data.role,
            base_id: data.base_id || null,
            equipe_id: data.equipe_id || null,
            email: data.email && data.email.trim() !== '' && data.email !== 'N/A' ? data.email : undefined,
            password: data.password && data.password.trim() !== '' ? data.password : undefined,
          },
        })

        console.log('Resposta completa da Edge Function update-user:', response)

        // Se houver erro na chamada da função (erro de rede, etc)
        if (response.error) {
          console.error('Erro ao chamar Edge Function:', response.error)
          
          // Se o erro indica que a função não existe ou não está acessível
          const errorMessage = response.error.message || ''
          if (
            errorMessage.includes('Failed to send') ||
            errorMessage.includes('Function not found') ||
            errorMessage.includes('404') ||
            errorMessage.includes('not found')
          ) {
            throw new Error(
              'Edge Function não está disponível. Por favor, faça o deploy da Edge Function "update-user" no Supabase.'
            )
          }
          
          // Se o erro é "non-2xx status code", tentar extrair a mensagem do response.data
          if (errorMessage.includes('non-2xx') || errorMessage.includes('status code')) {
            // Tentar fazer uma chamada direta para obter a mensagem de erro
            try {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
              const { data: sessionData } = await supabase.auth.getSession()
              
              const directResponse = await fetch(
                `${supabaseUrl}/functions/v1/update-user`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    ...(sessionData.session ? { 'apikey': supabaseAnonKey } : {}),
                  },
                  body: JSON.stringify({
                    id: data.id,
                    nome: data.nome,
                    role: data.role,
                    base_id: data.base_id || null,
                    equipe_id: data.equipe_id || null,
                    email: data.email && data.email.trim() !== '' && data.email !== 'N/A' ? data.email : undefined,
                    password: data.password && data.password.trim() !== '' ? data.password : undefined,
                  }),
                }
              )

              const responseData = await directResponse.json()
              
              if (!directResponse.ok) {
                const errorMsg = responseData?.error || responseData?.message || errorMessage
                throw new Error(errorMsg)
              }

              // Se chegou aqui, foi sucesso
              return responseData
            } catch (fetchError: any) {
              // Se falhar na chamada direta, usar a mensagem original ou a do fetchError
              const finalError = fetchError?.message || response.data?.error || errorMessage
              throw new Error(finalError)
            }
          }
          
          // Tentar extrair mensagem de erro do response.data se disponível
          let finalErrorMessage = errorMessage || 'Erro ao chamar a função'
          
          // Se o erro contém dados adicionais
          if (response.data && typeof response.data === 'object') {
            if ('error' in response.data) {
              finalErrorMessage = String(response.data.error) || finalErrorMessage
            } else if ('message' in response.data) {
              finalErrorMessage = String(response.data.message) || finalErrorMessage
            }
          }
          
          throw new Error(finalErrorMessage)
        }

        // Verificar se há erro no resultado (status não 2xx)
        if (response.data) {
          // Se a resposta contém um campo 'error', é um erro
          if (typeof response.data === 'object' && 'error' in response.data) {
            const errorMessage = typeof response.data.error === 'string' 
              ? response.data.error 
              : 'Erro desconhecido'
            console.error('Erro retornado pela Edge Function:', response.data)
            throw new Error(errorMessage)
          }

          // Verificar se foi sucesso
          if (typeof response.data === 'object' && 'success' in response.data && response.data.success) {
            return response.data
          }
        }

        // Se chegou aqui, a resposta foi inesperada
        console.error('Resposta inesperada:', response)
        throw new Error('Resposta inesperada da Edge Function')
      } catch (error: any) {
        console.error('Erro ao atualizar usuário:', error)
        if (error instanceof Error) {
          throw error
        }
        throw new Error(error?.message || 'Erro desconhecido ao atualizar usuário')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setShowModal(false)
      setIsEditMode(false)
      reset()
      alert('Usuário atualizado com sucesso!')
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar usuário:', error)
      const errorMessage = error.message || 'Erro desconhecido ao atualizar usuário'
      
      // Mensagem mais amigável se for erro de Edge Function
      if (errorMessage.includes('Edge Function não está disponível') || 
          errorMessage.includes('Failed to send') ||
          errorMessage.includes('Function not found')) {
        alert(
          '⚠️ Edge Function não está disponível!\n\n' +
          'Para editar usuários, você precisa fazer o deploy da Edge Function "update-user".\n\n' +
          'Opções:\n' +
          '1. Use o Supabase CLI: supabase functions deploy update-user\n' +
          '2. Ou use o Dashboard do Supabase: Edge Functions > Create a new function\n\n' +
          'Consulte: DEPLOY_EDGE_FUNCTION_UPDATE_USER.md'
        )
      } else {
        alert(`Erro: ${errorMessage}`)
      }
    },
  })

  const handleEditClick = (usuario: UsuarioComEmail) => {
    setIsEditMode(true)
    setValue('id', usuario.id)
    setValue('nome', usuario.nome)
    setValue('email', usuario.email === 'N/A' ? '' : usuario.email)
    setValue('role', usuario.role)
    if (usuario.role === 'geral') {
      const baseAdministrativo = bases?.find((b) => b.nome === 'ADMINISTRATIVO')
      setValue('base_id', baseAdministrativo?.id || usuario.base_id || '')
      setValue('equipe_id', '')
    } else if (usuario.role === 'gerente_sci') {
      setValue('base_id', usuario.base_id || '')
      setValue('equipe_id', '')
    } else {
      setValue('base_id', usuario.base_id || '')
      setValue('equipe_id', usuario.equipe_id || '')
    }
    setValue('password', '')
    setShowModal(true)
  }

  const handleNewUserClick = () => {
    setIsEditMode(false)
    reset({
      role: isGerenteSCI ? 'chefe' : 'chefe',
      base_id: isGerenteSCI ? gerenteSCIBaseId : undefined,
    })
    setShowModal(true)
  }

  const onSubmit = (data: CreateUserFormData | UpdateUserFormData) => {
    if (isEditMode) {
      updateUserMutation.mutate(data as UpdateUserFormData)
    } else {
      createUserMutation.mutate(data as CreateUserFormData)
    }
  }

  // Mutation para deletar usuário
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      try {
        const response = await supabase.functions.invoke('delete-user', {
          body: {
            userId,
          },
        })

        console.log('Resposta completa da Edge Function delete-user:', response)

        // Se houver erro na chamada da função (erro de rede, etc)
        if (response.error) {
          console.error('Erro ao chamar Edge Function:', response.error)
          
          // Se o erro indica que a função não existe ou não está acessível
          const errorMessage = response.error.message || ''
          if (
            errorMessage.includes('Failed to send') ||
            errorMessage.includes('Function not found') ||
            errorMessage.includes('404') ||
            errorMessage.includes('not found')
          ) {
            throw new Error(
              'Edge Function não está disponível. Por favor, faça o deploy da Edge Function "delete-user" no Supabase.'
            )
          }
          
          // Se o erro é "non-2xx status code", tentar extrair a mensagem do response.data
          if (errorMessage.includes('non-2xx') || errorMessage.includes('status code')) {
            // Tentar fazer uma chamada direta para obter a mensagem de erro
            try {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
              const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
              const { data: sessionData } = await supabase.auth.getSession()
              
              const directResponse = await fetch(
                `${supabaseUrl}/functions/v1/delete-user`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseAnonKey}`,
                    ...(sessionData.session ? { 'apikey': supabaseAnonKey } : {}),
                  },
                  body: JSON.stringify({
                    userId,
                  }),
                }
              )

              const responseData = await directResponse.json()
              
              if (!directResponse.ok) {
                const errorMsg = responseData?.error || responseData?.message || errorMessage
                throw new Error(errorMsg)
              }

              // Se chegou aqui, foi sucesso
              return responseData
            } catch (fetchError: any) {
              // Se falhar na chamada direta, usar a mensagem original ou a do fetchError
              const finalError = fetchError?.message || response.data?.error || errorMessage
              throw new Error(finalError)
            }
          }
          
          // Tentar extrair mensagem de erro do response.data se disponível
          let finalErrorMessage = errorMessage || 'Erro ao chamar a função'
          
          // Se o erro contém dados adicionais
          if (response.data && typeof response.data === 'object') {
            if ('error' in response.data) {
              finalErrorMessage = String(response.data.error) || finalErrorMessage
            } else if ('message' in response.data) {
              finalErrorMessage = String(response.data.message) || finalErrorMessage
            }
          }
          
          throw new Error(finalErrorMessage)
        }

        // Verificar se há erro no resultado (status não 2xx)
        if (response.data) {
          // Se a resposta contém um campo 'error', é um erro
          if (typeof response.data === 'object' && 'error' in response.data) {
            const errorMessage = typeof response.data.error === 'string' 
              ? response.data.error 
              : 'Erro desconhecido'
            console.error('Erro retornado pela Edge Function:', response.data)
            throw new Error(errorMessage)
          }

          // Verificar se foi sucesso
          if (typeof response.data === 'object' && 'success' in response.data && response.data.success) {
            return response.data
          }
        }

        // Se chegou aqui, a resposta foi inesperada
        console.error('Resposta inesperada:', response)
        throw new Error('Resposta inesperada da Edge Function')
      } catch (error: any) {
        console.error('Erro ao deletar usuário:', error)
        if (error instanceof Error) {
          throw error
        }
        throw new Error(error?.message || 'Erro desconhecido ao deletar usuário')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setShowDeleteModal(false)
      setUsuarioToDelete(null)
      setConfirmacaoTexto('')
      alert('Usuário removido com sucesso!')
    },
    onError: (error: Error) => {
      console.error('Erro ao deletar usuário:', error)
      const errorMessage = error.message || 'Erro desconhecido ao deletar usuário'
      
      if (errorMessage.includes('Edge Function não está disponível')) {
        alert(
          '⚠️ Edge Function não está disponível!\n\n' +
          'Para remover usuários, você precisa fazer o deploy da Edge Function "delete-user".\n\n' +
          'Use o Supabase CLI: supabase functions deploy delete-user'
        )
      } else {
        alert(`Erro: ${errorMessage}`)
      }
    },
  })

  const handleDeleteClick = (usuario: UsuarioComEmail) => {
    setUsuarioToDelete(usuario)
    setShowDeleteModal(true)
    setConfirmacaoTexto('')
  }

  const handleConfirmDelete = () => {
    if (!usuarioToDelete) return

    // Verificar se o texto de confirmação está correto
    if (confirmacaoTexto.trim() !== usuarioToDelete.nome.trim()) {
      alert('O texto de confirmação não corresponde ao nome do usuário. Por favor, digite o nome exatamente como aparece.')
      return
    }

    deleteUserMutation.mutate(usuarioToDelete.id)
  }

  return (
    <div className="min-h-screen bg-background transition-all duration-300 ease-in-out page-transition">
      <header className="bg-[#fc4d00] shadow-sm border-b border-border transition-colors duration-300 shadow-orange-sm">
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
                <h1 className="text-2xl font-bold text-white">Gestão de Usuários</h1>
                <p className="text-sm text-white/90">Cadastre e gerencie usuários do sistema</p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <Button onClick={handleNewUserClick} className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] transition-all duration-200 shadow-orange-sm">
                Adicionar Novo Usuário
              </Button>
              <Button onClick={() => setShowBulkModal(true)} className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] transition-all duration-200 shadow-orange-sm">
                Cadastro em Lote
              </Button>
              <Button onClick={() => navigate('/dashboard-gerente')} className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-white transition-all duration-200 shadow-orange-sm">
                Voltar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="pt-6">
            {/* Filtro por Base - travado e desabilitado para Gerente de SCI */}
            <div className="mb-6 flex items-center gap-4">
              <Label htmlFor="filtro-base" className="text-sm font-medium whitespace-nowrap">
                Filtrar por Base:
              </Label>
              <Select
                id="filtro-base"
                value={filtroBaseId}
                onChange={(e) => !isGerenteSCI && setFiltroBaseId(e.target.value)}
                className="max-w-xs"
                disabled={isGerenteSCI}
              >
                <option value="">Todas as Bases</option>
                {bases?.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.nome}
                  </option>
                ))}
              </Select>
              {isGerenteSCI && (
                <span className="text-xs text-muted-foreground">
                  (Sua base - visualização restrita)
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Carregando usuários...</p>
              </div>
            ) : usuariosError || basesError || equipesError ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-2 font-semibold">
                  Erro ao carregar dados
                </p>
                <p className="text-sm text-gray-600 mb-4">
                  {usuariosError?.message || basesError?.message || equipesError?.message || 'Erro desconhecido'}
                </p>
                <Button onClick={() => window.location.reload()}>
                  Recarregar Página
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Nome</th>
                      <th className="text-left p-3 font-semibold">Email</th>
                      <th className="text-left p-3 font-semibold">Base</th>
                      <th className="text-left p-3 font-semibold">Equipe</th>
                      <th className="text-left p-3 font-semibold">Perfil</th>
                      <th className="text-left p-3 font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios && usuarios.length > 0 ? (
                      usuarios.map((usuario) => (
                        <tr key={usuario.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{usuario.nome}</td>
                          <td className="p-3">{usuario.email}</td>
                          <td className="p-3">
                            {usuario.base_id
                              ? bases?.find((b) => b.id === usuario.base_id)?.nome || 'N/A'
                              : '-'}
                          </td>
                          <td className="p-3">
                            {usuario.equipe_id
                              ? equipes?.find((e) => e.id === usuario.equipe_id)?.nome || 'N/A'
                              : '-'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                usuario.role === 'geral'
                                  ? 'bg-blue-100 text-blue-800'
                                  : usuario.role === 'gerente_sci'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {usuario.role === 'geral' ? 'Administrador' : usuario.role === 'gerente_sci' ? 'Gerente de SCI' : 'Chefe de Equipe'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              {(!isGerenteSCI || (usuario.role !== 'geral' && usuario.role !== 'gerente_sci')) && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditClick(usuario)}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    title="Editar usuário"
                                  >
                                    ✏️ Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteClick(usuario)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Remover usuário"
                                  >
                                    🗑️ Remover
                                  </Button>
                                </>
                              )}
                              {isGerenteSCI && (usuario.role === 'geral' || usuario.role === 'gerente_sci') && (
                                <span className="text-xs text-muted-foreground">Sem permissão</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          Nenhum usuário cadastrado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Cadastro/Edição */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>{isEditMode ? 'Editar Usuário' : 'Adicionar Novo Usuário'}</CardTitle>
                <CardDescription>
                  {isEditMode
                    ? 'Altere os dados do usuário. Deixe a senha em branco para manter a atual.'
                    : 'Preencha os dados para criar um novo usuário no sistema'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {isEditMode && (
                    <input type="hidden" {...register('id')} />
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input id="nome" {...register('nome')} />
                    {errors.nome && (
                      <p className="text-sm text-destructive">{errors.nome.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email {isEditMode ? '(opcional)' : '*'}</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder={isEditMode ? "Deixe em branco para manter o atual" : "usuario@exemplo.com"} 
                      {...register('email', {
                        onChange: (e) => {
                          register('email').onChange(e)
                          // Auto-gerar senha baseada no email quando não estiver em modo de edição
                          if (!isEditMode) {
                            const emailValue = e.target.value
                            const currentPassword = watch('password')
                            // Só gerar se não houver senha ou se for a senha padrão
                            if (!currentPassword || currentPassword === DEFAULT_PASSWORD || currentPassword === '') {
                              if (emailValue && emailValue.includes('@')) {
                                const generatedPassword = generatePasswordFromEmail(emailValue)
                                setValue('password', generatedPassword)
                                setShowPassword(true) // Mostrar senha quando gerada automaticamente
                              }
                            }
                          }
                        }
                      })} 
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha {isEditMode ? '(opcional)' : '*'}</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          id="password" 
                          type={showPassword ? 'text' : 'password'} 
                          placeholder={isEditMode ? "Deixe em branco para manter a atual" : "Mínimo 6 caracteres"} 
                          {...register('password')} 
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {!isEditMode && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const emailValue = watch('email')
                              if (emailValue && emailValue.includes('@')) {
                                const generatedPassword = generatePasswordFromEmail(emailValue)
                                setValue('password', generatedPassword)
                                setShowPassword(true)
                              } else {
                                setValue('password', DEFAULT_PASSWORD)
                                setShowPassword(true)
                              }
                            }}
                            title="Gerar senha baseada no email ou usar padrão"
                          >
                            🔑 Gerar
                          </Button>
                        </>
                      )}
                    </div>
                    {watch('password') && !isEditMode && (
                      <p className="text-xs text-blue-600 font-medium">
                        {watch('password') === DEFAULT_PASSWORD ? (
                          <>Senha padrão: <span className="font-mono">{DEFAULT_PASSWORD}</span></>
                        ) : watch('email') && watch('password')?.endsWith('@123') ? (
                          <>Senha gerada do email: <span className="font-mono">{watch('password')}</span></>
                        ) : (
                          <>Senha: <span className="font-mono">{watch('password')}</span></>
                        )}
                      </p>
                    )}
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password.message}</p>
                    )}
                    {isEditMode && (
                      <p className="text-xs text-gray-500">
                        Deixe em branco para manter a senha atual
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Perfil *</Label>
                    <select
                      id="role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...register('role')}
                      disabled={isGerenteSCI}
                    >
                      {!isGerenteSCI && <option value="geral">Administrador (Gerente Geral)</option>}
                      {!isGerenteSCI && <option value="gerente_sci">Gerente de SCI</option>}
                      <option value="chefe">Chefe de Equipe</option>
                    </select>
                    {isGerenteSCI && (
                      <p className="text-xs text-muted-foreground">
                        Gerente de SCI pode cadastrar apenas Chefes de Equipe da sua base
                      </p>
                    )}
                    {errors.role && (
                      <p className="text-sm text-destructive">{errors.role.message}</p>
                    )}
                  </div>

                  {/* Campos Base e Equipe */}
                  {role === 'geral' && (
                    <div className="space-y-2">
                      <Label htmlFor="base_id">Base</Label>
                      <select
                        id="base_id"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-gray-100"
                        {...register('base_id')}
                        disabled
                      >
                        {bases?.map((base) => (
                          <option key={base.id} value={base.id}>
                            {base.nome}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500">
                        Base automaticamente definida como ADMINISTRATIVO para Gerentes Gerais
                      </p>
                      {errors.base_id && (
                        <p className="text-sm text-destructive">{errors.base_id.message}</p>
                      )}
                    </div>
                  )}

                  {role === 'gerente_sci' && (
                    <div className="space-y-2">
                      <Label htmlFor="base_id">Base *</Label>
                      <select
                        id="base_id"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        {...register('base_id')}
                      >
                        <option value="">Selecione a base</option>
                        {bases?.filter((b) => b.nome !== 'ADMINISTRATIVO').map((base) => (
                          <option key={base.id} value={base.id}>
                            {base.nome}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500">
                        Gerente de SCI gerencia apenas uma base
                      </p>
                      {errors.base_id && (
                        <p className="text-sm text-destructive">{errors.base_id.message}</p>
                      )}
                    </div>
                  )}

                  {role === 'chefe' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="base_id">Base *</Label>
                        <select
                          id="base_id"
                          className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isGerenteSCI ? 'bg-gray-100' : ''}`}
                          {...register('base_id')}
                          disabled={isGerenteSCI}
                        >
                          <option value="">Selecione a base</option>
                          {bases?.map((base) => (
                            <option key={base.id} value={base.id}>
                              {base.nome}
                            </option>
                          ))}
                        </select>
                        {isGerenteSCI && (
                          <p className="text-xs text-muted-foreground">
                            Base fixada na sua base (não é possível cadastrar em outra base)
                          </p>
                        )}
                        {errors.base_id && (
                          <p className="text-sm text-destructive">{errors.base_id.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="equipe_id">Equipe *</Label>
                        <select
                          id="equipe_id"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...register('equipe_id')}
                        >
                          <option value="">Selecione a equipe</option>
                          {equipes?.map((equipe) => (
                            <option key={equipe.id} value={equipe.id}>
                              {equipe.nome}
                            </option>
                          ))}
                        </select>
                        {errors.equipe_id && (
                          <p className="text-sm text-destructive">{errors.equipe_id.message}</p>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowModal(false)
                        setIsEditMode(false)
                        reset()
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isEditMode ? updateUserMutation.isPending : createUserMutation.isPending}
                      className="flex-1 bg-[#fc4d00] hover:bg-[#e04400]hover:bg-[#c93d00] text-white shadow-orange-sm"
                    >
                      {isEditMode 
                        ? (updateUserMutation.isPending ? 'Salvando...' : 'Salvar Alterações')
                        : (createUserMutation.isPending ? 'Salvando...' : 'Salvar')
                      }
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Modal de Cadastro em Lote */}
        {showBulkModal && bases && equipes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <BulkUserForm
              bases={bases}
              equipes={equipes}
              lockedBaseId={isGerenteSCI ? gerenteSCIBaseId : undefined}
              onSuccess={() => {
                setShowBulkModal(false)
                queryClient.invalidateQueries({ queryKey: ['usuarios'] })
              }}
              onCancel={() => setShowBulkModal(false)}
            />
          </div>
        )}

        {/* Modal de Confirmação de Remoção */}
        {showDeleteModal && usuarioToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-red-600">Confirmar Remoção de Usuário</CardTitle>
                <CardDescription>
                  Esta ação não pode ser desfeita. Para confirmar, digite o nome do usuário abaixo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm font-semibold text-red-800 mb-1">Usuário a ser removido:</p>
                    <p className="text-sm text-red-700">{usuarioToDelete.nome}</p>
                    <p className="text-xs text-red-600 mt-1">{usuarioToDelete.email}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmacao">
                      Digite o nome do usuário para confirmar: <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="confirmacao"
                      value={confirmacaoTexto}
                      onChange={(e) => setConfirmacaoTexto(e.target.value)}
                      placeholder={usuarioToDelete.nome}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Digite exatamente: <strong>{usuarioToDelete.nome}</strong>
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDeleteModal(false)
                        setUsuarioToDelete(null)
                        setConfirmacaoTexto('')
                      }}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={
                        deleteUserMutation.isPending ||
                        confirmacaoTexto.trim() !== usuarioToDelete.nome.trim()
                      }
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {deleteUserMutation.isPending ? 'Removendo...' : 'Confirmar Remoção'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
