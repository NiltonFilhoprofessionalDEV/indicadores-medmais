import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, LogOut, ClipboardList } from 'lucide-react'

export function DashboardGerenteSCI() {
  const { authUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    try {
      queryClient.clear()
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#fc4d00] shadow-sm border-b border-border">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center min-h-[80px] gap-2">
            <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
              <img
                src="/logo-medmais.png"
                alt="MedMais"
                className="h-8 sm:h-10 w-auto brightness-0 invert shrink-0"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                  Dashboard - Gerente de SCI
                </h1>
                <p className="text-xs sm:text-sm text-white/90 truncate">
                  {authUser?.profile?.nome ?? 'Carregando...'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                    <Settings className="h-6 w-6" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/settings')}
                    className="w-full justify-start gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start gap-2 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-[#fc4d00]" />
                <CardTitle>Lançamentos</CardTitle>
              </div>
              <CardDescription>
                Visualize os lançamentos da sua base para conferência
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/lancamentos-base')}
                className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white"
              >
                Ver Lançamentos
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Gestão de Efetivo</CardTitle>
              <CardDescription>
                Cadastre e gerencie colaboradores das bases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/colaboradores')}
                className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white"
              >
                Acessar Gestão de Efetivo
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Gestão de Usuários</CardTitle>
              <CardDescription>
                Cadastre e gerencie usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/gestao-usuarios')}
                className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white"
              >
                Acessar Gestão de Usuários
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
