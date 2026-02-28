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
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LOGIN_BUILD = '2025-02-05-gerente-sci-fix'
export function Login() {
  console.warn('[LOGIN] Build:', LOGIN_BUILD)
  const navigate = useNavigate()
  const { authUser, loading: authLoading, refreshAuth } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (loading) return
    const r = authUser?.profile?.role
    const acessoGerenteSci = !!authUser?.profile?.acesso_gerente_sci
    console.log('[LOGIN_DEBUG] useEffect já-autenticado:', {
      host: window.location.host, authLoading, hasUser: !!authUser?.user, role: r, acessoGerenteSci,
    })
    if (!authLoading && authUser?.user && r) {
      const roleNorm = String(r).trim().toLowerCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '')
      const temAcessoPainelGerente =
        roleNorm === 'geral' || roleNorm === 'gerente_sci' || (roleNorm === 'chefe' && acessoGerenteSci)
      const dest = roleNorm === 'auxiliar' ? '/dashboard-chefe' : (temAcessoPainelGerente ? '/dashboard-gerente' : '/dashboard-chefe')
      console.log('[LOGIN_DEBUG] Redirecionando (já logado):', { roleNorm, temAcessoPainelGerente, destino: dest })
      navigate(dest, { replace: true })
    }
  }, [authUser, authLoading, navigate, loading])

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData, e?: React.BaseSyntheticEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setError(null)
    setLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

      if (!supabaseUrl || !supabaseKey) {
        setError('Erro de configuração: Variáveis de ambiente do Supabase não configuradas.')
        setLoading(false)
        return
      }

      if (!supabaseUrl.startsWith('http')) {
        setError('Erro de configuração: URL do Supabase inválida.')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email, password: data.password,
      })

      if (authError) {
        let errorMessage = authError.message
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.'
        } else if (authError.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
        } else if (authError.message.includes('network') || authError.message.includes('fetch') || authError.message.includes('Failed to fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e as configurações do Supabase.'
        } else if (authError.message.includes('timeout') || authError.message.includes('aborted')) {
          errorMessage = 'Tempo de conexão esgotado. Tente novamente.'
        }
        setError(errorMessage)
        setLoading(false)
        return
      }

      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 300))
        let profileFromAuth = await refreshAuth()
        if (!profileFromAuth) {
          await new Promise(resolve => setTimeout(resolve, 400))
          profileFromAuth = await refreshAuth()
        }

        let role: string | null = profileFromAuth?.role ?? null
        let acessoGerenteSci = !!(profileFromAuth?.acesso_gerente_sci ?? false)

        if (role == null) {
          const { data: p } = await supabase.from('profiles').select('role, acesso_gerente_sci').eq('id', authData.user.id).single()
          const row = p as { role?: string; acesso_gerente_sci?: boolean } | null
          if (row?.role) { role = row.role; acessoGerenteSci = !!row.acesso_gerente_sci }
        }
        if (role == null) {
          const rpc = await supabase.rpc('get_my_profile')
          const rpcData = rpc.data as { role?: string; acesso_gerente_sci?: boolean } | null
          if (rpcData?.role) { role = rpcData.role; acessoGerenteSci = !!rpcData.acesso_gerente_sci }
        }

        if (role === null || role === undefined) {
          setError('Não foi possível carregar seu perfil. Tente novamente.')
          setLoading(false)
          return
        }

        const roleNormalized = String(role ?? '').trim().toLowerCase().replace(/[\s\u200B-\u200D\uFEFF]/g, '')
        const temAcessoPainelGerente =
          roleNormalized === 'geral' || roleNormalized === 'gerente_sci' || (roleNormalized === 'chefe' && acessoGerenteSci)
        const destino = roleNormalized === 'auxiliar' ? '/dashboard-chefe' : (temAcessoPainelGerente ? '/dashboard-gerente' : '/dashboard-chefe')
        navigate(destino, { replace: true })
      } else {
        setError('Erro: Login realizado mas usuário não encontrado.')
        setLoading(false)
      }
    } catch (err: any) {
      setError(err?.message || 'Erro inesperado ao fazer login.')
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo + Marca */}
        <div className="text-center mb-8">
          <img
            src="/logo-medmais.png"
            alt="MedMais Logo"
            className="h-16 w-auto mx-auto mb-4"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <h1 className="text-2xl font-bold text-foreground">Indicadores MedMais</h1>
          <p className="text-sm text-muted-foreground mt-1">Faça login para acessar o sistema</p>
        </div>

        {/* Card de Login */}
        <div className="bg-card rounded-2xl border border-border shadow-glow-primary p-6 sm:p-8">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e) }}
            className="space-y-5"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                disabled={loading}
                className="h-10"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={loading}
                  className="pr-10 h-10"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/8 border border-destructive/15 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-semibold text-sm"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
                </span>
              ) : (
                'Entrar'
              )}
            </Button>

            {authUser?.user && !authUser?.profile && (
              <a href="/logout" className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors mt-2">
                Fazer logout para tentar outra conta
              </a>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
