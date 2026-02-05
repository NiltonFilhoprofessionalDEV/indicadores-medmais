import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export function Logout() {
  const navigate = useNavigate()

  useEffect(() => {
    async function doLogout() {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key))
        await supabase.auth.signOut()
      } catch {
        // Ignora erros
      }
      navigate('/login', { replace: true })
      window.location.href = '/login'
    }
    doLogout()
  }, [navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <div className="text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#fc4d00]"></div>
        <p className="text-foreground">Saindo...</p>
        <a href="/login" className="text-sm text-[#fc4d00] hover:underline">
          Clique aqui se não for redirecionado
        </a>
      </div>
    </div>
  )
}
