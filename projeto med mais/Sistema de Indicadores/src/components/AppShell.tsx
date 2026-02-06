import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, LogOut, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AppShellProps {
  title: string
  subtitle?: string
  baseEquipe?: string
  children: React.ReactNode
  extraActions?: React.ReactNode
}

function getIniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
}

export function AppShell({ title, subtitle, baseEquipe, children, extraActions }: AppShellProps) {
  const { authUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleLogout = async () => {
    try {
      queryClient.clear()
      localStorage.removeItem('supabase.auth.token')
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 page-transition dark:bg-slate-900">
      <header className="bg-[#EA580C] shadow-sm border-b border-white/10">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center min-h-[72px] gap-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 min-w-0">
              <div className="flex items-center gap-3">
                <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  med+
                </span>
                <div className="hidden sm:block h-8 w-px bg-white/40" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">{title}</h1>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-white/90 truncate">{subtitle}</p>
                )}
                {baseEquipe && (
                  <p className="text-xs text-white/75 mt-0.5 truncate">{baseEquipe}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
              {extraActions}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 rounded-full text-white hover:bg-white/20 transition-all"
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-white hover:bg-white/20 transition-all"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2 dark:bg-slate-800 dark:border-slate-700">
                  <Button
                    variant="ghost"
                    onClick={() => navigate('/settings')}
                    className="w-full justify-start gap-2 text-foreground hover:bg-primary/10 hover:text-primary"
                  >
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                </PopoverContent>
              </Popover>
              <Avatar className="h-9 w-9 border-2 border-white/50">
                <AvatarFallback className="bg-white/20 text-white text-sm font-medium">
                  {authUser?.profile?.nome ? getIniciais(authUser.profile.nome) : '?'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
        {children}
      </main>
    </div>
  )
}
