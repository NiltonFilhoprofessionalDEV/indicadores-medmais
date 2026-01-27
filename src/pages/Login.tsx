import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
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

export function Login() {
  const navigate = useNavigate()
  const { authUser, loading: authLoading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (!authLoading && authUser) {
      if (authUser.profile?.role === 'geral') {
        navigate('/dashboard-gerente', { replace: true })
      } else {
        navigate('/dashboard-chefe', { replace: true })
      }
    }
  }, [authUser, authLoading, navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError(null)
    setLoading(true)

    try {
      // Verificar se as variáveis de ambiente estão configuradas
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

      if (!supabaseUrl || !supabaseKey) {
        setError('Erro de configuração: Variáveis de ambiente do Supabase não configuradas. Verifique as configurações na Vercel.')
        setLoading(false)
        console.error('Variáveis de ambiente não configuradas:', {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        })
        return
      }

      if (!supabaseUrl.startsWith('http')) {
        setError('Erro de configuração: URL do Supabase inválida. Deve começar com http:// ou https://')
        setLoading(false)
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        // Mensagens de erro mais amigáveis
        let errorMessage = authError.message
        
        if (authError.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.'
        } else if (authError.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.'
        } else if (authError.message.includes('network') || authError.message.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e as configurações do Supabase.'
        } else if (authError.message.includes('timeout') || authError.message.includes('aborted')) {
          errorMessage = 'Tempo de conexão esgotado. Verifique as configurações do Supabase na Vercel.'
        }
        
        setError(errorMessage)
        console.error('Erro de autenticação:', authError)
        setLoading(false)
        return
      }

      if (authData.user) {
        // Verificar o perfil do usuário para redirecionar corretamente
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single()

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError)
          // Continua mesmo sem perfil, redireciona para dashboard-chefe como padrão
        }

        if (profile && typeof profile === 'object' && 'role' in profile && (profile as { role: string }).role === 'geral') {
          navigate('/dashboard-gerente')
        } else {
          navigate('/dashboard-chefe')
        }
      }
    } catch (err) {
      console.error('Erro inesperado no login:', err)
      setError('Erro inesperado ao fazer login. Verifique o console para mais detalhes.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-700 font-semibold">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      {/* Conteúdo */}
      <div className="w-full max-w-md px-6">
        <Card className="bg-white border border-gray-200" style={{ boxShadow: '0 0 30px 10px rgba(252, 77, 0, 0.3), 0 0 60px 20px rgba(252, 77, 0, 0.15)' }}>
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
            <CardTitle className="text-3xl font-bold text-center text-gray-900">
              Indicadores MedMais
            </CardTitle>
            <CardDescription className="text-center text-gray-600 text-base">
              Faça login para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  disabled={loading}
                  className="h-12 border-gray-300 focus:border-[#fc4d00] focus:ring-[#fc4d00] transition-all"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={loading}
                    className="pr-12 h-12 border-gray-300 focus:border-[#fc4d00] focus:ring-[#fc4d00] transition-all"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 hover:text-gray-700"
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
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <span>•</span>
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#fc4d00] hover:bg-[#e04400] text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
