import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/AppShell'
import { FormDrawer } from '@/components/ui/form-drawer'
import { BulkUserForm } from '@/components/BulkUserForm'
import { Eye, EyeOff, Pencil, Trash2, Users, Search, UserPlus } from 'lucide-react'
import { formatBaseName, formatEquipeName, parseResponseJson } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Base = Database['public']['Tables']['bases']['Row']
type Equipe = Database['public']['Tables']['equipes']['Row']

const createUserSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  role: z.enum(['geral', 'chefe', 'gerente_sci', 'auxiliar'], {
    required_error: 'Selecione um perfil',
  }),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
  acesso_gerente_sci: z.boolean().optional(),
}).refine((data) => {
  if (data.role === 'chefe' || data.role === 'auxiliar') return !!data.base_id && !!data.equipe_id
  if (data.role === 'gerente_sci') return !!data.base_id
  return true
}, {
  message: 'Base e Equipe são obrigatórios para Chefe de Equipe e Líder de Resgate; Base é obrigatória para Gerente de SCI',
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
  role: z.enum(['geral', 'chefe', 'gerente_sci', 'auxiliar'], {
    required_error: 'Selecione um perfil',
  }),
  base_id: z.string().optional(),
  equipe_id: z.string().optional(),
  acesso_gerente_sci: z.boolean().optional(),
}).refine((data) => {
  if (data.role === 'chefe' || data.role === 'auxiliar') return !!data.base_id && !!data.equipe_id
  if (data.role === 'gerente_sci') return !!data.base_id
  return true
}, {
  message: 'Base e Equipe são obrigatórios para Chefe de Equipe e Líder de Resgate; Base é obrigatória para Gerente de SCI',
  path: ['base_id'],
})

type CreateUserFormData = z.infer<typeof createUserSchema>
type UpdateUserFormData = z.infer<typeof updateUserSchema>

interface UsuarioComEmail {
  id: string
  nome: string
  email: string
  role: 'geral' | 'chefe' | 'gerente_sci' | 'auxiliar'
  base_id: string | null
  equipe_id: string | null
  acesso_gerente_sci: boolean | null
  created_at: string
  updated_at: string
}

const ROLE_LABELS: Record<string, string> = {
  geral: 'Administrador',
  gerente_sci: 'Gerente de SCI',
  chefe: 'Chefe de Equipe',
  auxiliar: 'Líder de Resgate',
}

const ROLE_COLORS: Record<string, string> = {
  geral: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  gerente_sci: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  chefe: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  auxiliar: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
}

export function GestaoUsuarios() {
  const { authUser } = useAuth()
  const isGerenteSCI = authUser?.profile?.role === 'gerente_sci'
  const isGerenteGeral = authUser?.profile?.role === 'geral'
  const gerenteSCIBaseId = authUser?.profile?.base_id ?? ''
  const isBaseLocked = !isGerenteGeral
  const [showDrawer, setShowDrawer] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [usuarioToDelete, setUsuarioToDelete] = useState<UsuarioComEmail | null>(null)
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('')
  const [isEditMode, setIsEditMode] = useState(false)
  const [filtroBaseId, setFiltroBaseId] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const queryClient = useQueryClient()

  const DEFAULT_PASSWORD = 'Mudar@123'

  const generatePasswordFromEmail = (email: string) => {
    if (email && email.includes('@')) {
      const emailPrefix = email.split('@')[0]
      return `${emailPrefix}@`
    }
    return DEFAULT_PASSWORD
  }

  type Profile = Database['public']['Tables']['profiles']['Row']
  const baseFilter = isBaseLocked ? gerenteSCIBaseId : filtroBaseId
  const { data: usuarios, isLoading, error: usuariosError } = useQuery<UsuarioComEmail[]>({
    queryKey: ['usuarios', baseFilter],
    queryFn: async () => {
      try {
        let profiles: Profile[] = []
        if (baseFilter && baseFilter !== '') {
          const { data: usuariosBase, error: errorBase } = await supabase
            .from('profiles')
            .select('*')
            .eq('base_id', baseFilter)
            .order('created_at', { ascending: false })
          if (errorBase) throw errorBase
          if (isBaseLocked) {
            profiles = (usuariosBase as Profile[]) || []
          } else {
            const { data: gerentesGerais, error: errorGeral } = await supabase
              .from('profiles')
              .select('*')
              .eq('role', 'geral')
              .order('created_at', { ascending: false })
            if (errorGeral) throw errorGeral
            const allProfiles: Profile[] = [...(usuariosBase as Profile[] || []), ...(gerentesGerais as Profile[] || [])]
            profiles = allProfiles.filter((profile, index, self) =>
              index === self.findIndex((p) => p.id === profile.id)
            )
          }
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
          if (error) throw error
          profiles = (data as Profile[]) || []
        }
        return profiles.map((profile): UsuarioComEmail => ({
          id: profile.id,
          nome: profile.nome,
          role: profile.role,
          base_id: profile.base_id,
          equipe_id: profile.equipe_id,
          acesso_gerente_sci: profile.acesso_gerente_sci ?? false,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          email: 'N/A',
        }))
      } catch (error) {
        console.error('Erro na query de usuários:', error)
        throw error
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (isBaseLocked && gerenteSCIBaseId) {
      setFiltroBaseId(gerenteSCIBaseId)
    }
  }, [isBaseLocked, gerenteSCIBaseId])

  const { data: bases, error: basesError } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*').order('nome')
      if (error) throw error
      return data || []
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })

  const { data: equipes, error: equipesError } = useQuery<Equipe[]>({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('equipes').select('*').order('nome')
      if (error) throw error
      return data || []
    },
    retry: 1,
    refetchOnWindowFocus: false,
  })

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
      acesso_gerente_sci: false,
    },
  })

  const role = watch('role')

  useEffect(() => {
    if (role === 'geral' && !isGerenteSCI) {
      const baseAdministrativo = bases?.find((b) => b.nome.toUpperCase() === 'ADMINISTRATIVO')
      if (baseAdministrativo) {
        setValue('base_id', baseAdministrativo.id)
        setValue('equipe_id', '')
      }
    } else if (role === 'gerente_sci') {
      setValue('equipe_id', '')
      if (!isGerenteSCI) setValue('base_id', '')
      else if (gerenteSCIBaseId) setValue('base_id', gerenteSCIBaseId)
    } else if (role === 'chefe' || role === 'auxiliar') {
      if (isGerenteSCI && gerenteSCIBaseId) {
        setValue('base_id', gerenteSCIBaseId)
      } else {
        setValue('base_id', '')
      }
      setValue('equipe_id', '')
    }
  }, [role, bases, setValue, isGerenteSCI, gerenteSCIBaseId])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function createUserDirectly(_data: CreateUserFormData) {
    throw new Error(
      'Edge Function não está disponível. Por favor, faça o deploy da Edge Function "create-user" no Supabase. ' +
      'Consulte o arquivo DEPLOY_EDGE_FUNCTION.md para instruções.'
    )
  }

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      try {
        try {
          const response = await supabase.functions.invoke('create-user', {
            body: {
              email: data.email,
              password: data.password,
              nome: data.nome,
              role: data.role,
              base_id: data.base_id || null,
              equipe_id: data.equipe_id || null,
              acesso_gerente_sci: data.role === 'chefe' && typeof data.acesso_gerente_sci === 'boolean' ? data.acesso_gerente_sci : undefined,
            },
          })
          if (response.error) {
            const errorMessage = response.error.message || ''
            if (
              errorMessage.includes('Failed to send') ||
              errorMessage.includes('Function not found') ||
              errorMessage.includes('404') ||
              errorMessage.includes('not found')
            ) {
              return await createUserDirectly(data)
            }
            if (errorMessage.includes('non-2xx') || errorMessage.includes('status code')) {
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
                      acesso_gerente_sci: data.role === 'chefe' && typeof data.acesso_gerente_sci === 'boolean' ? data.acesso_gerente_sci : undefined,
                    }),
                  }
                )
                const responseData = await parseResponseJson<Record<string, unknown>>(directResponse)
                if (!directResponse.ok) {
                  const fromBody =
                    responseData &&
                    (responseData.error !== undefined
                      ? String(responseData.error)
                      : responseData.message !== undefined
                        ? String(responseData.message)
                        : null)
                  throw new Error(
                    fromBody || `Erro HTTP ${directResponse.status}${responseData == null ? ' (corpo vazio)' : ''}`
                  )
                }
                if (responseData == null) {
                  throw new Error('Resposta vazia da Edge Function create-user.')
                }
                return responseData
              } catch (fetchError: any) {
                throw new Error(fetchError?.message || response.data?.error || errorMessage)
              }
            }
            let finalErrorMessage = errorMessage || 'Erro ao chamar a função'
            if (response.data && typeof response.data === 'object') {
              if ('error' in response.data) finalErrorMessage = String(response.data.error) || finalErrorMessage
              else if ('message' in response.data) finalErrorMessage = String(response.data.message) || finalErrorMessage
            }
            throw new Error(finalErrorMessage)
          }
          if (response.data) {
            if (typeof response.data === 'object' && 'error' in response.data) {
              throw new Error(typeof response.data.error === 'string' ? response.data.error : 'Erro desconhecido')
            }
            if (typeof response.data === 'object' && 'success' in response.data && response.data.success) {
              return response.data
            }
          }
          throw new Error('Resposta inesperada da Edge Function')
        } catch (edgeFunctionError: any) {
          const errorMsg = edgeFunctionError?.message || ''
          if (
            errorMsg.includes('Failed to send') ||
            errorMsg.includes('Function not found') ||
            errorMsg.includes('404') ||
            errorMsg.includes('not found') ||
            errorMsg.includes('Network') ||
            errorMsg.includes('fetch')
          ) {
            return await createUserDirectly(data)
          }
          throw edgeFunctionError
        }
      } catch (error: any) {
        if (error instanceof Error) throw error
        throw new Error(error?.message || 'Erro desconhecido ao criar usuário')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setShowDrawer(false)
      reset()
      alert('Usuário criado com sucesso!')
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Erro desconhecido ao criar usuário'
      if (errorMessage.includes('Edge Function não está disponível') ||
          errorMessage.includes('Failed to send') ||
          errorMessage.includes('Function not found')) {
        alert(
          'Edge Function não está disponível!\n\n' +
          'Para cadastrar usuários, você precisa fazer o deploy da Edge Function "create-user".\n\n' +
          'Consulte: supabase/functions/create-user/README.md'
        )
      } else {
        alert(`Erro: ${errorMessage}`)
      }
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: async (data: UpdateUserFormData) => {
      const acessoGerenteSci = data.role === 'chefe' ? !!(data as UpdateUserFormData).acesso_gerente_sci : false
      const { data: updated, error } = await supabase.rpc('update_user_profile', {
        target_id: data.id,
        p_nome: data.nome.trim(),
        p_role: data.role,
        p_base_id: data.base_id || null,
        p_equipe_id: data.equipe_id || null,
        p_acesso_gerente_sci: acessoGerenteSci,
      } as any)
      if (error) {
        if (error.code === 'PGRST301' || error.message?.includes('row-level security') || error.message?.includes('policy')) {
          throw new Error('Você não tem permissão para editar usuários.')
        }
        throw new Error(error.message || 'Erro ao atualizar usuário')
      }
      if (!updated || typeof updated !== 'object') {
        throw new Error('Resposta inválida ao atualizar usuário.')
      }
      return updated as { acesso_gerente_sci?: boolean | null }
    },
    onSuccess: async (updated: { acesso_gerente_sci?: boolean | null }, variables: UpdateUserFormData) => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setShowDrawer(false)
      setIsEditMode(false)
      reset()
      const desejavaAcesso = variables.role === 'chefe' && !!((variables as UpdateUserFormData).acesso_gerente_sci)
      const salvouAcesso = !!(updated?.acesso_gerente_sci ?? false)
      if (variables.role === 'chefe' && desejavaAcesso !== salvouAcesso) {
        alert(
          'Usuário atualizado com sucesso!\n\n' +
          'A alteração do "acesso ao painel Gerente de SCI" só pode ser feita por um usuário com perfil Administrador.'
        )
      } else {
        alert('Usuário atualizado com sucesso!')
      }
    },
    onError: (error: Error) => {
      const msg = error.message || 'Erro ao atualizar usuário'
      alert(`Erro: ${msg}`)
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      try {
        const response = await supabase.functions.invoke('delete-user', {
          body: { userId },
        })
        if (response.error) {
          const errorMessage = response.error.message || ''
          if (
            errorMessage.includes('Failed to send') ||
            errorMessage.includes('Function not found') ||
            errorMessage.includes('404')
          ) {
            throw new Error('Edge Function "delete-user" não está disponível.')
          }
          if (errorMessage.includes('non-2xx') || errorMessage.includes('status code')) {
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
                  body: JSON.stringify({ userId }),
                }
              )
              const responseData = await parseResponseJson<Record<string, unknown>>(directResponse)
              if (!directResponse.ok) {
                const fromBody =
                  responseData &&
                  (responseData.error !== undefined
                    ? String(responseData.error)
                    : responseData.message !== undefined
                      ? String(responseData.message)
                      : null)
                throw new Error(
                  fromBody || `Erro HTTP ${directResponse.status}${responseData == null ? ' (corpo vazio)' : ''}`
                )
              }
              if (responseData == null) {
                throw new Error('Resposta vazia da Edge Function delete-user.')
              }
              return responseData
            } catch (fetchError: any) {
              throw new Error(fetchError?.message || response.data?.error || errorMessage)
            }
          }
          let finalErrorMessage = errorMessage || 'Erro ao chamar a função'
          if (response.data && typeof response.data === 'object') {
            if ('error' in response.data) finalErrorMessage = String(response.data.error) || finalErrorMessage
            else if ('message' in response.data) finalErrorMessage = String(response.data.message) || finalErrorMessage
          }
          throw new Error(finalErrorMessage)
        }
        if (response.data) {
          if (typeof response.data === 'object' && 'error' in response.data) {
            throw new Error(typeof response.data.error === 'string' ? response.data.error : 'Erro desconhecido')
          }
          if (typeof response.data === 'object' && 'success' in response.data && response.data.success) {
            return response.data
          }
        }
        throw new Error('Resposta inesperada da Edge Function')
      } catch (error: any) {
        if (error instanceof Error) throw error
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
      const errorMessage = error.message || 'Erro desconhecido ao deletar usuário'
      alert(`Erro: ${errorMessage}`)
    },
  })

  const handleEditClick = (usuario: UsuarioComEmail) => {
    setIsEditMode(true)
    setValue('id', usuario.id)
    setValue('nome', usuario.nome)
    setValue('email', usuario.email === 'N/A' ? '' : usuario.email)
    setValue('role', usuario.role)
    setValue('acesso_gerente_sci', usuario.acesso_gerente_sci ?? false)
    if (usuario.role === 'geral') {
      const baseAdministrativo = bases?.find((b) => b.nome.toUpperCase() === 'ADMINISTRATIVO')
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
    setShowDrawer(true)
  }

  const handleNewUserClick = () => {
    setIsEditMode(false)
    reset({
      role: isGerenteSCI ? 'chefe' : 'chefe',
      base_id: isGerenteSCI ? gerenteSCIBaseId : undefined,
      acesso_gerente_sci: false,
    })
    setShowDrawer(true)
  }

  const onSubmit = (data: CreateUserFormData | UpdateUserFormData) => {
    if (isEditMode) {
      updateUserMutation.mutate(data as UpdateUserFormData)
    } else {
      createUserMutation.mutate(data as CreateUserFormData)
    }
  }

  const handleDeleteClick = (usuario: UsuarioComEmail) => {
    setUsuarioToDelete(usuario)
    setShowDeleteModal(true)
    setConfirmacaoTexto('')
  }

  const handleConfirmDelete = () => {
    if (!usuarioToDelete) return
    if (confirmacaoTexto.trim() !== usuarioToDelete.nome.trim()) {
      alert('O texto de confirmação não corresponde ao nome do usuário.')
      return
    }
    deleteUserMutation.mutate(usuarioToDelete.id)
  }

  return (
    <AppShell
      title="Gestão de Usuários"
      subtitle={authUser?.profile?.nome}
    >
      <div className="space-y-6">
        {/* Header de ações */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Usuários do Sistema</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Cadastre e gerencie os usuários do sistema</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleNewUserClick} className="gap-2">
              <UserPlus className="h-4 w-4" /> Novo Usuário
            </Button>
            <Button variant="outline" onClick={() => setShowBulkModal(true)} className="gap-2">
              <Users className="h-4 w-4" /> Cadastro em Lote
            </Button>
          </div>
        </div>

        {/* Filtro */}
        <Card className="border-0 shadow-soft">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Label htmlFor="filtro-base" className="text-sm font-medium whitespace-nowrap">Base:</Label>
              <Select
                id="filtro-base"
                value={filtroBaseId}
                onChange={(e) => !isBaseLocked && setFiltroBaseId(e.target.value)}
                className="max-w-xs"
                disabled={isBaseLocked}
              >
                {isBaseLocked ? null : <option value="">Todas as Bases</option>}
                {bases?.map((base) => (
                  <option key={base.id} value={base.id}>{formatBaseName(base.nome)}</option>
                ))}
              </Select>
              {isBaseLocked && (
                <span className="text-xs text-muted-foreground">(Sua base)</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border-0 shadow-soft overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : usuariosError || basesError || equipesError ? (
              <div className="text-center py-12 space-y-3">
                <p className="font-medium text-destructive">Erro ao carregar dados</p>
                <p className="text-sm text-muted-foreground">
                  {(usuariosError as Error)?.message || (basesError as Error)?.message || (equipesError as Error)?.message || 'Erro desconhecido'}
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>Recarregar</Button>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Nome</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Base</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Equipe</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Perfil</th>
                      <th className="text-right py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {usuarios && usuarios.length > 0 ? (
                      usuarios.map((usuario) => (
                        <tr key={usuario.id} className="group hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">{usuario.nome}</td>
                          <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{usuario.email}</td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            {usuario.base_id
                              ? formatBaseName(bases?.find((b) => b.id === usuario.base_id)?.nome ?? '') || '—'
                              : '—'}
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            {usuario.equipe_id
                              ? formatEquipeName(equipes?.find((e) => e.id === usuario.equipe_id)?.nome || '') || '—'
                              : '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[usuario.role] || ''}`}>
                              {ROLE_LABELS[usuario.role] || usuario.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              {(!isGerenteSCI || (usuario.role !== 'geral' && usuario.role !== 'gerente_sci')) ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleEditClick(usuario)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary"
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDeleteClick(usuario)}
                                    className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive"
                                    title="Remover"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">Sem permissão</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drawer: Cadastro/Edição */}
      <FormDrawer
        open={showDrawer}
        onClose={() => { setShowDrawer(false); setIsEditMode(false); reset() }}
        title={isEditMode ? 'Editar Usuário' : 'Novo Usuário'}
        subtitle={isEditMode ? 'Altere os dados do usuário' : 'Preencha os dados para criar um novo usuário'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {isEditMode && <input type="hidden" {...register('id')} />}

          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && <p className="text-xs text-destructive font-medium">{errors.nome.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email {isEditMode ? '(opcional)' : '*'}</Label>
            <Input
              id="email"
              type="email"
              placeholder={isEditMode ? "Deixe em branco para manter o atual" : "usuario@exemplo.com"}
              {...register('email', {
                onChange: (e) => {
                  register('email').onChange(e)
                  if (!isEditMode) {
                    const emailValue = e.target.value
                    const currentPassword = watch('password')
                    if (!currentPassword || currentPassword === DEFAULT_PASSWORD || currentPassword === '') {
                      if (emailValue && emailValue.includes('@')) {
                        setValue('password', generatePasswordFromEmail(emailValue))
                        setShowPassword(true)
                      }
                    }
                  }
                }
              })}
            />
            {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha {isEditMode ? '(opcional)' : '*'}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isEditMode ? "Em branco mantém atual" : "Mínimo 6 caracteres"}
                  {...register('password')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const emailValue = watch('email')
                    if (emailValue && emailValue.includes('@')) {
                      setValue('password', generatePasswordFromEmail(emailValue))
                    } else {
                      setValue('password', DEFAULT_PASSWORD)
                    }
                    setShowPassword(true)
                  }}
                  className="shrink-0"
                >
                  Gerar
                </Button>
              )}
            </div>
            {watch('password') && !isEditMode && (
              <p className="text-xs text-primary font-medium">
                Senha: <span className="font-mono">{watch('password')}</span>
              </p>
            )}
            {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
            {isEditMode && <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role">Perfil *</Label>
            <Select id="role" {...register('role')}>
              {!isGerenteSCI && <option value="geral">Administrador</option>}
              {!isGerenteSCI && <option value="gerente_sci">Gerente de SCI</option>}
              <option value="chefe">Chefe de Equipe</option>
              <option value="auxiliar">Líder de Resgate</option>
            </Select>
            {isGerenteSCI && (
              <p className="text-xs text-muted-foreground">Pode cadastrar Chefes de Equipe e Líderes de Resgate</p>
            )}
            {errors.role && <p className="text-xs text-destructive font-medium">{errors.role.message}</p>}
          </div>

          {role === 'geral' && (
            <div className="space-y-1.5">
              <Label htmlFor="base_id">Base</Label>
              <Select id="base_id" {...register('base_id')} disabled>
                {bases?.map((base) => (
                  <option key={base.id} value={base.id}>{formatBaseName(base.nome)}</option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">Automaticamente definida como ADMINISTRATIVO</p>
            </div>
          )}

          {role === 'gerente_sci' && (
            <div className="space-y-1.5">
              <Label htmlFor="base_id">Base *</Label>
              <Select id="base_id" {...register('base_id')}>
                <option value="">Selecione a base</option>
                {bases?.filter((b) => b.nome.toUpperCase() !== 'ADMINISTRATIVO').map((base) => (
                  <option key={base.id} value={base.id}>{formatBaseName(base.nome)}</option>
                ))}
              </Select>
              {errors.base_id && <p className="text-xs text-destructive font-medium">{errors.base_id.message}</p>}
            </div>
          )}

          {(role === 'chefe' || role === 'auxiliar') && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="base_id">Base *</Label>
                <Select id="base_id" {...register('base_id')} disabled={isGerenteSCI}>
                  <option value="">Selecione a base</option>
                  {bases?.map((base) => (
                    <option key={base.id} value={base.id}>{formatBaseName(base.nome)}</option>
                  ))}
                </Select>
                {isGerenteSCI && <p className="text-xs text-muted-foreground">Base fixada na sua base</p>}
                {errors.base_id && <p className="text-xs text-destructive font-medium">{errors.base_id.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="equipe_id">Equipe *</Label>
                <Select id="equipe_id" {...register('equipe_id')}>
                  <option value="">Selecione a equipe</option>
                  {equipes?.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>{formatEquipeName(equipe.nome)}</option>
                  ))}
                </Select>
                {errors.equipe_id && <p className="text-xs text-destructive font-medium">{errors.equipe_id.message}</p>}
              </div>

              {role === 'chefe' && (isGerenteGeral ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                  <input
                    type="checkbox"
                    id="acesso_gerente_sci"
                    className="rounded border-input h-4 w-4"
                    {...register('acesso_gerente_sci', { setValueAs: (v) => !!v })}
                  />
                  <Label htmlFor="acesso_gerente_sci" className="cursor-pointer text-sm">
                    Pode acessar painel Gerente de SCI
                  </Label>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/40 border border-border">
                  Apenas administradores podem alterar o acesso ao painel Gerente de SCI.
                </p>
              ))}
            </>
          )}

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setShowDrawer(false); setIsEditMode(false); reset() }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isEditMode ? updateUserMutation.isPending : createUserMutation.isPending}
              className="flex-1"
            >
              {isEditMode
                ? (updateUserMutation.isPending ? 'Salvando...' : 'Salvar Alterações')
                : (createUserMutation.isPending ? 'Salvando...' : 'Salvar')
              }
            </Button>
          </div>
        </form>
      </FormDrawer>

      {/* Modal Bulk */}
      {showBulkModal && bases && equipes && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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

      {/* Modal Confirmação de Remoção */}
      {showDeleteModal && usuarioToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-destructive">Confirmar Remoção</CardTitle>
              <CardDescription>
                Esta ação não pode ser desfeita. Digite o nome do usuário para confirmar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/5 border border-destructive/15 rounded-lg">
                <p className="text-sm font-semibold text-foreground">{usuarioToDelete.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{usuarioToDelete.email}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmacao">Digite o nome para confirmar: *</Label>
                <Input
                  id="confirmacao"
                  value={confirmacaoTexto}
                  onChange={(e) => setConfirmacaoTexto(e.target.value)}
                  placeholder={usuarioToDelete.nome}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowDeleteModal(false); setUsuarioToDelete(null); setConfirmacaoTexto('') }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                  disabled={deleteUserMutation.isPending || confirmacaoTexto.trim() !== usuarioToDelete.nome.trim()}
                  className="flex-1"
                >
                  {deleteUserMutation.isPending ? 'Removendo...' : 'Confirmar Remoção'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  )
}
