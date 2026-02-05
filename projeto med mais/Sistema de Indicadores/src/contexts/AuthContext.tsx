import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface AuthUser {
  user: User
  profile: Profile | null
}

interface AuthContextType {
  authUser: AuthUser | null
  loading: boolean
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  const hasConfig = typeof window !== 'undefined' && 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY

  async function loadProfile(userId: string, retryCount = 0) {
    const maxRetries = 1
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('Erro ao buscar perfil:', error, { code: error.code, retryCount })
        if (retryCount < maxRetries) {
          await new Promise(r => setTimeout(r, 500))
          return loadProfile(userId, retryCount + 1)
        }
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setAuthUser({ user, profile: null })
          return
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAuthUser({ user, profile: profile || null })
      } else {
        setAuthUser(null)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      if (retryCount < maxRetries) {
        await new Promise(r => setTimeout(r, 500))
        return loadProfile(userId, retryCount + 1)
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setAuthUser({ user, profile: null })
      } else {
        setAuthUser(null)
      }
    }
  }

  async function refreshAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        setAuthUser(null)
      }
    } catch (error) {
      console.error('Error refreshing auth:', error)
      setAuthUser(null)
    }
  }

  useEffect(() => {
    if (isInitialized) return

    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null

    async function initializeAuth() {
      if (!hasConfig) {
        setLoading(false)
        setIsInitialized(true)
        return
      }

      try {
        // Verificar sessão inicial (sem timeout agressivo)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Erro ao buscar sessão:', sessionError)
          if (mounted) {
            setLoading(false)
            setIsInitialized(true)
          }
          return
        }

        if (mounted) {
          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setAuthUser(null)
          }
          setLoading(false)
          setIsInitialized(true)
        }

        // Escutar mudanças de autenticação
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return

          console.log('Auth state changed:', event)
          
          // Ignorar apenas eventos de refresh token para evitar loops
          if (event === 'TOKEN_REFRESHED') {
            return
          }
          
          // Para SIGNED_IN, sempre atualizar o perfil
          if (event === 'SIGNED_IN') {
            if (session?.user) {
              await loadProfile(session.user.id)
            }
            setLoading(false)
            return
          }
          
          if (event === 'SIGNED_OUT') {
            console.log('🔄 Evento SIGNED_OUT detectado, limpando estado')
            // Limpar estado imediatamente
            setAuthUser(null)
            setLoading(false)
            
            // Limpar localStorage do Supabase
            try {
              localStorage.removeItem('supabase.auth.token')
              // Limpar todas as chaves relacionadas ao Supabase
              const keysToRemove: string[] = []
              for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) {
                  keysToRemove.push(key)
                }
              }
              keysToRemove.forEach(key => localStorage.removeItem(key))
            } catch (e) {
              console.warn('Erro ao limpar localStorage:', e)
            }
            
            return
          }
          
          // Para outros eventos, atualizar conforme a sessão
          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setAuthUser(null)
          }
          setLoading(false)
        })

        subscription = authSubscription
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error)
        if (mounted) {
          setLoading(false)
          setIsInitialized(true)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [hasConfig, isInitialized])

  return (
    <AuthContext.Provider value={{ authUser, loading, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
