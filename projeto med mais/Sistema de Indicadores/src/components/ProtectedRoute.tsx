import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('geral' | 'chefe' | 'gerente_sci')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { authUser, loading, refreshAuth } = useAuth()
  const location = useLocation()
  const [showTimeout, setShowTimeout] = useState(false)
  const [retrying, setRetrying] = useState(false)

  // Timeout de segurança - se carregar por mais de 5 segundos, redireciona para login
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowTimeout(true)
      }, 5000) // 5 segundos

      return () => clearTimeout(timer)
    } else {
      setShowTimeout(false)
    }
  }, [loading])

  if (loading) {
    if (showTimeout) {
      console.warn('Timeout no carregamento da autenticação, redirecionando para login')
      return <Navigate to="/login" replace />
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#fc4d00] mb-4"></div>
          <div className="text-lg text-foreground">Carregando...</div>
        </div>
        <a href="/logout" className="text-sm text-muted-foreground hover:text-[#fc4d00] hover:underline">
          Sair / Voltar ao login
        </a>
      </div>
    )
  }

  if (!authUser) {
    console.log('[LOGIN_DEBUG] ProtectedRoute: sem authUser, redirecionando para /login', { pathname: location.pathname })
    return <Navigate to="/login" replace />
  }

  // Perfil não carregado: rota exige verificação de role
  if (allowedRoles && !authUser.profile) {
    console.log('[LOGIN_DEBUG] ProtectedRoute: perfil null, exibindo tela de retry', { pathname: location.pathname, userId: authUser.user?.id })
    const handleRetry = async () => {
      setRetrying(true)
      await refreshAuth()
      setRetrying(false)
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Perfil não carregado</h2>
          <p className="text-muted-foreground">
            Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.
          </p>
          <Button
            onClick={handleRetry}
            disabled={retrying}
            className="bg-[#fc4d00] hover:bg-[#e04400] text-white"
          >
            {retrying ? 'Tentando...' : 'Tentar novamente'}
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/logout'} className="mt-2">
            Sair e voltar ao login
          </Button>
        </div>
      </div>
    )
  }

  // Verificar se o usuário tem permissão (inclui chefe com acesso_gerente_sci para rotas de gerente_sci)
  if (allowedRoles && authUser.profile) {
    const role = String(authUser.profile.role || '').trim().toLowerCase()
    const acessoGerenteSci = !!authUser.profile.acesso_gerente_sci
    const canAccessAsGerenteSci = role === 'gerente_sci' || (role === 'chefe' && acessoGerenteSci)
    const hasPermission =
      !!role &&
      (allowedRoles.includes(role as 'geral' | 'chefe' | 'gerente_sci') ||
        (role === 'chefe' && acessoGerenteSci && allowedRoles.includes('gerente_sci')))
    console.log('[LOGIN_DEBUG] ProtectedRoute:', {
      pathname: location.pathname,
      role,
      acessoGerenteSci,
      allowedRoles,
      hasPermission,
    })
    if (!hasPermission) {
      console.warn('[LOGIN_DEBUG] Sem permissão - redirecionando:', { role, allowedRoles, pathname: location.pathname })
      if (role === 'geral' || canAccessAsGerenteSci) {
        return <Navigate to="/dashboard-gerente" replace />
      } else {
        return <Navigate to="/dashboard-chefe" replace />
      }
    }
  }

  return <>{children}</>
}
