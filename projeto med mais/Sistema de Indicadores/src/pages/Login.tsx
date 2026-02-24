import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LOGIN_BUILD = '2025-02-05-gerente-sci-fix'
export function Login() {
  console.warn('[LOGIN] Build:', LOGIN_BUILD)
  const navigate = useNavigate()
  // Otimização: Não carregar useAuth na página de login (só verifica se já está logado)
  const { authUser, loading: authLoading, refreshAuth } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Redirecionar se já estiver autenticado: quem tem acesso ao painel Gerente vai para dashboard-gerente;
  // apenas chefes sem acesso_gerente_sci vão para dashboard-chefe (nem todos os chefes têm os dois painéis).
  useEffect(() => {
    if (loading) return
    const r = authUser?.profile?.role
    const acessoGerenteSci = !!authUser?.profile?.acesso_gerente_sci
    console.log('[LOGIN_DEBUG] useEffect já-autenticado:', {
      host: window.location.host,
      authLoading,
      hasUser: !!authUser?.user,
      role: r,
      acessoGerenteSci,
    })
    if (!authLoading && authUser?.user && r) {
      const roleNorm = String(r).trim().toLowerCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '')
      const temAcessoPainelGerente =
        roleNorm === 'geral' ||
        roleNorm === 'gerente_sci' ||
        (roleNorm === 'chefe' && acessoGerenteSci)
      // Líder de Resgate (auxiliar) sempre vai para dashboard-chefe; demais seguem temAcessoPainelGerente
      const dest = roleNorm === 'auxiliar' ? '/dashboard-chefe' : (temAcessoPainelGerente ? '/dashboard-gerente' : '/dashboard-chefe')
      console.log('[LOGIN_DEBUG] Redirecionando (já logado):', { roleNorm, temAcessoPainelGerente, destino: dest })
      navigate(dest, { replace: true })
    }
  }, [authUser, authLoading, navigate, loading])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData, e?: React.BaseSyntheticEvent) => {
    // Prevenir comportamento padrão do formulário
    e?.preventDefault()
    e?.stopPropagation()
    
    setError(null)
    setLoading(true)

    try {
      // Verificar se as variáveis de ambiente estão configuradas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

      console.log('🔍 Debug Login:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlPrefix: supabaseUrl?.substring(0, 20) + '...',
      })

      if (!supabaseUrl || !supabaseKey) {
        const errorMsg = 'Erro de configuração: Variáveis de ambiente do Supabase não configuradas. Verifique as configurações na Vercel.'
        setError(errorMsg)
        setLoading(false)
        console.error('❌ Variáveis de ambiente não configuradas:', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        })
        return
      }

      if (!supabaseUrl.startsWith('http')) {
        const errorMsg = 'Erro de configuração: URL do Supabase inválida. Deve começar com http:// ou https://'
        setError(errorMsg)
        setLoading(false)
        console.error('❌ URL inválida:', supabaseUrl)
        return
      }

      console.log('✅ Tentando fazer login para:', data.email)
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        // Mensagens de erro mais amigáveis
        let errorMessage = authError.message
        
        console.error('❌ Erro de autenticação:', {
          message: authError.message,
          status: authError.status,
          name: authError.name,
        })
        
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.'
        } else if (authError.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
        } else if (authError.message.includes('network') || authError.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e as configurações do Supabase.'
        } else if (authError.message.includes('timeout') || authError.message.includes('aborted')) {
          errorMessage = 'Tempo de conexão esgotado. Verifique as configurações do Supabase na Vercel.'
        } else if (authError.message.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão com o Supabase. Verifique se o Supabase está online e as variáveis de ambiente estão corretas.'
        }
        
        setError(errorMessage)
        setLoading(false)
        return
      }

      if (authData.user) {
        console.log('✅ Login bem-sucedido! Usuário:', authData.user.id)

        // Usar o perfil carregado pelo AuthContext (select *) como fonte de verdade para o redirect
        await new Promise(resolve => setTimeout(resolve, 300))
        let profileFromAuth = await refreshAuth()
        if (!profileFromAuth) {
          await new Promise(resolve => setTimeout(resolve, 400))
          profileFromAuth = await refreshAuth()
        }

        let role: string | null = profileFromAuth?.role ?? null
        let acessoGerenteSci = !!(profileFromAuth?.acesso_gerente_sci ?? false)

        // Fallback: se o contexto não retornou perfil, buscar direto
        if (role == null) {
          const { data: p } = await supabase
            .from('profiles')
            .select('role, acesso_gerente_sci')
            .eq('id', authData.user.id)
            .single()
          const row = p as { role?: string; acesso_gerente_sci?: boolean } | null
          if (row?.role) {
            role = row.role
            acessoGerenteSci = !!row.acesso_gerente_sci
          }
        }
        if (role == null) {
          const rpc = await supabase.rpc('get_my_profile')
          const rpcData = rpc.data as { role?: string; acesso_gerente_sci?: boolean } | null
          if (rpcData?.role) {
            role = rpcData.role
            acessoGerenteSci = !!rpcData.acesso_gerente_sci
          }
        }

        if (role === null || role === undefined) {
          console.warn('⚠️ Perfil não carregado após retentativas')
          setError('Não foi possível carregar seu perfil. Clique em Entrar novamente para tentar, ou faça logout para usar outra conta.')
          setLoading(false)
          return
        }

        const roleNormalized = String(role ?? '').trim().toLowerCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '')
        const temAcessoPainelGerente =
          roleNormalized === 'geral' ||
          roleNormalized === 'gerente_sci' ||
          (roleNormalized === 'chefe' && acessoGerenteSci)
        // Líder de Resgate (auxiliar) sempre vai para dashboard-chefe; demais seguem temAcessoPainelGerente
        const destino = roleNormalized === 'auxiliar' ? '/dashboard-chefe' : (temAcessoPainelGerente ? '/dashboard-gerente' : '/dashboard-chefe')
        console.log('[LOGIN_DEBUG] ANTES DO REDIRECT:', {
          roleOriginal: role,
          roleNormalized,
          acessoGerenteSci,
          temAcessoPainelGerente,
          destino,
          profileFromAuth: !!profileFromAuth,
          host: window.location.host,
        })
        navigate(destino, { replace: true })
      } else {
        console.error('❌ Login retornou sem usuário')
        setError('Erro: Login realizado mas usuário não encontrado.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('❌ Erro inesperado no login:', err)
      setError(err?.message || 'Erro inesperado ao fazer login. Verifique o console para mais detalhes.')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-lg text-foreground font-semibold">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      {/* Conteúdo */}
      <div className="w-full max-w-md px-4 sm:px-6">
        <Card className="bg-card border-border" style={{ boxShadow: '0 0 30px 10px rgba(252, 77, 0, 0.3), 0 0 60px 20px rgba(252, 77, 0, 0.15)' }}>
          <CardHeader className="space-y-4 pb-6">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo-medmais.png" 
                alt="MedMais Logo" 
                className="h-20 w-auto"
                onError={(e) => {
                  // Fallback caso o logo não esteja disponível
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <CardTitle className="text-3xl font-bold text-center text-card-foreground">
              Indicadores MedMais
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground text-base">
              Faça login para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form 
              onSubmit={(e) => {
                e.preventDefault()
                handleSubmit(onSubmit)(e)
              }} 
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  disabled={loading}
                  className="h-12 transition-all"
                />
                {errors.email && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={loading}
                    className="pr-12 h-12 transition-all"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <span className="text-destructive mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#fc4d00] hover:bg-[#e04400] text-white font-semibold text-base shadow-orange transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
              {authUser?.user && !authUser?.profile && (
                <a href="/logout" className="block text-center text-sm text-muted-foreground hover:text-[#fc4d00] hover:underline mt-2">
                  Fazer logout para tentar outra conta
                </a>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
