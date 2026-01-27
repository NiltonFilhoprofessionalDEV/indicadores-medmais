import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface AuthUser {
  user: User
  profile: Profile | null
}

export function useAuth() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Otimização: Se não houver URL/Key configurados, não tenta autenticar
  const hasConfig = typeof window !== 'undefined' && 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY

  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null
    let timeoutId: NodeJS.Timeout | null = null

    async function initializeAuth() {
      try {
        // Timeout de segurança para evitar loading infinito (reduzido para 5 segundos)
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Timeout ao inicializar autenticação')
            setLoading(false)
            setIsInitialized(true)
          }
        }, 5000) // 5 segundos (reduzido de 10)

        // Verificar sessão inicial com timeout mais curto
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
        
        let sessionResult
        try {
          sessionResult = await Promise.race([sessionPromise, timeoutPromise]) as any
        } catch (error: any) {
          if (error.message === 'Timeout') {
            console.warn('Timeout ao buscar sessão, continuando sem autenticação')
            if (mounted) {
              setLoading(false)
              setIsInitialized(true)
            }
            return
          }
          throw error
        }
        
        const { data: { session }, error: sessionError } = sessionResult
        
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }

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
            setLoading(false)
            setIsInitialized(true)
          }
        }

        // Escutar mudanças de autenticação (apenas após inicialização)
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return

          console.log('Auth state changed:', event)
          
          if (session?.user) {
            await loadProfile(session.user.id)
          } else {
            setAuthUser(null)
            setLoading(false)
          }
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

    // Só inicializa uma vez
    if (!isInitialized) {
      // Se não houver configuração, não tenta inicializar
      if (!hasConfig) {
        setLoading(false)
        setIsInitialized(true)
      } else {
        initializeAuth()
      }
    }

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (subscription) {
        subscription.unsubscribe()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasConfig]) // Adiciona hasConfig como dependência

  async function loadProfile(userId: string) {
    try {
      setLoading(true)
      
      // Buscar perfil com timeout explícito
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
      
      let profileResult
      try {
        profileResult = await Promise.race([profilePromise, timeoutPromise]) as any
      } catch (error: any) {
        if (error.message === 'Timeout') {
          console.warn('Timeout ao buscar perfil, continuando sem perfil')
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setAuthUser({ user, profile: null })
            setLoading(false)
            setIsInitialized(true)
            return
          }
        }
        throw error
      }
      
      const { data: profile, error } = profileResult

      if (error) {
        console.error('Erro ao buscar perfil:', error)
        // Se o perfil não existe, ainda permite login mas sem perfil
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          console.warn('Perfil não encontrado para o usuário')
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setAuthUser({ user, profile: null })
            setLoading(false)
            setIsInitialized(true)
            return
          }
        }
        // Se for erro de timeout ou conexão, tenta continuar sem perfil
        if (error.message?.includes('aborted') || error.message?.includes('timeout')) {
          console.warn('Timeout ao buscar perfil, continuando sem perfil')
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            setAuthUser({ user, profile: null })
            setLoading(false)
            setIsInitialized(true)
            return
          }
        }
        throw error
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Erro ao buscar usuário:', userError)
        throw userError
      }

      if (user) {
        setAuthUser({ user, profile: profile || null })
      } else {
        setAuthUser(null)
      }
    } catch (error: any) {
      console.error('Error loading profile:', error)
      // Em caso de erro, ainda tenta obter o usuário básico
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setAuthUser({ user, profile: null })
        } else {
          setAuthUser(null)
        }
      } catch {
        setAuthUser(null)
      }
    } finally {
      setLoading(false)
      setIsInitialized(true)
    }
  }

  return { authUser, loading }
}
