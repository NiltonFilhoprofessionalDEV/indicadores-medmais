import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, LogOut, Sun, Moon, Bell, Menu, X, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY_SUPORTE_VISTOS = 'suporte_resposta_vistos'

function getSeenIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPORTE_VISTOS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function markAsSeen(ids: string[]) {
  const seen = getSeenIds()
  const next = [...new Set([...seen, ...ids])]
  localStorage.setItem(STORAGE_KEY_SUPORTE_VISTOS, JSON.stringify(next))
  return next
}

export interface SidebarItem {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
}

interface AppShellProps {
  title: string
  subtitle?: string
  baseEquipe?: string
  children: React.ReactNode
  extraActions?: React.ReactNode
  sidebarItems?: SidebarItem[]
  sidebarTitle?: string
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

export function AppShell({ title, subtitle, baseEquipe, children, extraActions, sidebarItems, sidebarTitle }: AppShellProps) {
  const { authUser } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [seenIds, setSeenIds] = useState<string[]>(() => getSeenIds())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [themeAnimating, setThemeAnimating] = useState(false)
  const hasSidebar = sidebarItems && sidebarItems.length > 0

  const handleToggleTheme = () => {
    setThemeAnimating(true)
    toggleTheme()
    setTimeout(() => setThemeAnimating(false), 400)
  }

  const { data: feedbackIdsComResposta = [] } = useQuery({
    queryKey: ['notificacoes-resposta-suporte-ids', authUser?.user?.id],
    queryFn: async () => {
      if (!authUser?.user?.id) return []
      const { data, error } = await supabase
        .from('feedbacks')
        .select('id')
        .eq('user_id', authUser.user.id)
        .not('resposta_suporte', 'is', null)
      if (error) throw error
      return (data ?? []).map((r: { id: string }) => r.id)
    },
    enabled: !!authUser?.user?.id,
    refetchOnWindowFocus: true,
  })

  const notificacoesNaoLidas = feedbackIdsComResposta.filter((id) => !seenIds.includes(id))
  const notificacoesRespostaSuporte = notificacoesNaoLidas.length

  const handleIrParaSuporte = useCallback(() => {
    if (feedbackIdsComResposta.length === 0) return
    setSeenIds(markAsSeen(feedbackIdsComResposta))
    navigate('/settings?tab=feedback')
  }, [feedbackIdsComResposta, navigate])

  const handleLogout = async () => {
    try {
      queryClient.clear()
      localStorage.removeItem('supabase.auth.token')
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) keysToRemove.push(key)
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 page-transition">
      {/* ═══════════ HEADER ═══════════ */}
      <header className={`sticky top-0 z-20 shadow-md transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-[hsl(222_22%_8%/0.92)] backdrop-blur-xl border-b border-[hsl(222_14%_16%)] shadow-[0_1px_0_0_hsl(222_14%_16%),0_4px_16px_rgba(0,0,0,0.4)]'
          : 'bg-gradient-to-r from-[#EA580C] to-[#D4500A]'
      }`}>
        {/* Barra de acento laranja no topo (só no dark) */}
        {theme === 'dark' && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F97316] to-transparent opacity-70" />
        )}
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Esquerda: Menu mobile + Logo + Info */}
            <div className="flex items-center gap-3 min-w-0">
              {hasSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`h-9 w-9 rounded-lg transition-all lg:hidden shrink-0 ${
                    theme === 'dark'
                      ? 'text-slate-300 hover:bg-white/8 hover:text-white'
                      : 'text-white/90 hover:bg-white/15'
                  }`}
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    const role = authUser?.profile?.role
                    navigate(role === 'chefe' || role === 'auxiliar' ? '/dashboard-chefe' : '/dashboard-gerente')
                  }}
                  className={`text-xl font-bold tracking-tight shrink-0 select-none transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'text-[#F97316] hover:text-[#FB923C] drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]'
                      : 'text-white hover:opacity-80'
                  }`}
                >
                  med+
                </button>
                <div className={`hidden sm:block h-6 w-px shrink-0 ${
                  theme === 'dark' ? 'bg-white/10' : 'bg-white/30'
                }`} />
                <div className="min-w-0 hidden sm:block">
                  <h1 className={`text-base font-semibold truncate leading-tight ${
                    theme === 'dark' ? 'text-slate-100' : 'text-white'
                  }`}>{title}</h1>
                  {subtitle && <p className={`text-sm truncate leading-tight ${
                    theme === 'dark' ? 'text-slate-400' : 'text-white/80'
                  }`}>{subtitle}</p>}
                  {baseEquipe && <p className={`text-xs truncate leading-tight ${
                    theme === 'dark' ? 'text-slate-500' : 'text-white/60'
                  }`}>{baseEquipe}</p>}
                </div>
              </div>
            </div>

            {/* Direita: Ações */}
            <div className="flex items-center gap-1 shrink-0">
              {extraActions}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`relative h-9 w-9 rounded-lg transition-all ${
                      theme === 'dark'
                        ? 'text-slate-300 hover:bg-white/8 hover:text-white'
                        : 'text-white/90 hover:bg-white/15'
                    }`}
                    title={notificacoesRespostaSuporte > 0 ? `${notificacoesRespostaSuporte} resposta(s)` : 'Notificações'}
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {notificacoesRespostaSuporte > 0 && (
                      <span className={`absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 ${
                        theme === 'dark' ? 'ring-2 ring-[hsl(222_22%_8%)]' : 'ring-2 ring-[#EA580C]'
                      }`}>
                        {notificacoesRespostaSuporte > 99 ? '99+' : notificacoesRespostaSuporte}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-4">
                  {notificacoesRespostaSuporte > 0 ? (
                    <button
                      type="button"
                      onClick={handleIrParaSuporte}
                      className="w-full text-left space-y-1 rounded-md p-2 -m-2 hover:bg-muted/60 transition-colors focus:outline-none"
                    >
                      <p className="font-medium text-sm">Seu suporte foi respondido</p>
                      <p className="text-sm text-muted-foreground">
                        {notificacoesRespostaSuporte === 1
                          ? '1 atualização do suporte.'
                          : `${notificacoesRespostaSuporte} atualizações do suporte.`}
                      </p>
                      <p className="text-sm text-primary font-medium pt-1">Ver resposta →</p>
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhuma notificação.</p>
                  )}
                </PopoverContent>
              </Popover>

              {/* Botão de tema com animação */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleTheme}
                className={`h-9 w-9 rounded-lg transition-all ${
                  theme === 'dark'
                    ? 'text-amber-400 hover:bg-amber-400/10 hover:text-amber-300'
                    : 'text-white/90 hover:bg-white/15'
                } ${themeAnimating ? 'theme-toggle-animate' : ''}`}
                title={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              >
                {theme === 'dark'
                  ? <Sun className="h-[18px] w-[18px]" />
                  : <Moon className="h-[18px] w-[18px]" />
                }
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className={`h-9 w-9 rounded-lg transition-all ${
                    theme === 'dark'
                      ? 'text-slate-300 hover:bg-white/8 hover:text-white'
                      : 'text-white/90 hover:bg-white/15'
                  }`}>
                    <Settings className="h-[18px] w-[18px]" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-44 p-1.5">
                  <Button variant="ghost" onClick={() => navigate('/settings')} className="w-full justify-start gap-2 h-9 text-sm">
                    <Settings className="h-4 w-4" /> Configurações
                  </Button>
                  <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-2 h-9 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:text-red-400">
                    <LogOut className="h-4 w-4" /> Sair
                  </Button>
                </PopoverContent>
              </Popover>

              <Avatar className={`h-9 w-9 ml-1 border-2 transition-all ${
                theme === 'dark'
                  ? 'border-[#F97316]/40 ring-1 ring-[#F97316]/20'
                  : 'border-white/40'
              }`}>
                <AvatarFallback className={`text-sm font-semibold ${
                  theme === 'dark'
                    ? 'bg-[#F97316]/15 text-[#FB923C]'
                    : 'bg-white/20 text-white'
                }`}>
                  {authUser?.profile?.nome ? getIniciais(authUser.profile.nome) : '?'}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════ CORPO ═══════════ */}
      {hasSidebar ? (
        <div className="flex min-h-[calc(100vh-64px)]">
          {/* Overlay mobile */}
          {sidebarOpen && (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed top-0 left-0 z-40 h-full w-[272px] border-r
            transform transition-transform duration-200 ease-in-out overflow-hidden
            lg:relative lg:top-auto lg:left-auto lg:z-auto lg:transform-none lg:shrink-0
            ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0 lg:shadow-none'}
            ${theme === 'dark'
              ? 'bg-[hsl(222_22%_8%)] border-[hsl(222_14%_14%)] shadow-[1px_0_0_0_hsl(222_14%_14%)]'
              : 'bg-[var(--sidebar-bg)] border-border'
            }
          `}>
            <div className="flex flex-col h-full">
              {/* Header sidebar */}
              <div className={`h-16 flex items-center px-5 shrink-0 lg:h-14 border-b ${
                theme === 'dark' ? 'border-[hsl(222_14%_13%)]' : 'border-border'
              }`}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex-1">
                  {sidebarTitle || 'Indicadores'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="h-7 w-7 lg:hidden text-muted-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Lista de indicadores */}
              <nav className="flex-1 overflow-y-auto scrollbar-thin py-2 px-2.5 space-y-0.5">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { item.onClick(); setSidebarOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left
                      transition-all duration-150 group ${
                      theme === 'dark'
                        ? 'text-slate-400 hover:text-[#FB923C] hover:bg-[hsl(24_90%_55%/0.08)] active:bg-[hsl(24_90%_55%/0.12)]'
                        : 'text-foreground/80 hover:text-primary hover:bg-[var(--sidebar-hover)] active:bg-[var(--sidebar-active)]'
                    }`}
                  >
                    {item.icon && (
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-150 ${
                        theme === 'dark'
                          ? 'bg-[hsl(24_90%_55%/0.08)] text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white'
                          : 'bg-primary/8 text-primary group-hover:bg-primary group-hover:text-white'
                      }`}>
                        {item.icon}
                      </span>
                    )}
                    <span className="truncate font-medium flex-1">{item.label}</span>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                      theme === 'dark'
                        ? 'text-slate-600 group-hover:text-[#F97316]/60'
                        : 'text-muted-foreground/40 group-hover:text-primary/60'
                    }`} />
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Conteúdo principal */}
          <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-full overflow-x-hidden">
            <div className="max-w-6xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
          {children}
        </main>
      )}
    </div>
  )
}
