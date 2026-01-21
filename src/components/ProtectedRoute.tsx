import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('geral' | 'chefe')[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { authUser, loading } = useAuth()
  const [showTimeout, setShowTimeout] = useState(false)

  // Timeout de segurança - se carregar por mais de 15 segundos, redireciona para login
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShowTimeout(true)
      }, 15000) // 15 segundos

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <div className="text-lg">Carregando...</div>
        </div>
      </div>
    )
  }

  if (!authUser) {
    return <Navigate to="/login" replace />
  }

  // Verificar se o usuário tem permissão
  if (allowedRoles && authUser.profile) {
    if (!allowedRoles.includes(authUser.profile.role)) {
      console.warn('Usuário sem permissão para acessar esta rota')
      // Redireciona para o dashboard apropriado baseado no role
      if (authUser.profile.role === 'geral') {
        return <Navigate to="/dashboard-gerente" replace />
      } else {
        return <Navigate to="/dashboard-chefe" replace />
      }
    }
  }

  return <>{children}</>
}
