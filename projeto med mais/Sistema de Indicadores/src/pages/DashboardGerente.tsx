import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings, LogOut, FileSpreadsheet, MessageSquare, ClipboardList } from 'lucide-react'

export function DashboardGerente() {
  const { authUser } = useAuth()
  const isGerenteSCI = authUser?.profile?.role === 'gerente_sci'
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: feedbackPendentes } = useQuery({
    queryKey: ['suporte-feedbacks-pendentes'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('feedbacks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente')
      if (error) throw error
      return count ?? 0
    },
    enabled: !!authUser?.user?.id,
  })

  const handleLogout = async () => {
    try {
      // Limpar cache do React Query
      queryClient.clear()
      
      // Limpar localStorage do Supabase antes do signOut
      localStorage.removeItem('supabase.auth.token')
      
      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Erro ao fazer logout:', error)
      } else {
        console.log('✅ Logout realizado com sucesso')
      }
      
      // Limpar qualquer estado restante no localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Aguardar um momento para o contexto ser atualizado
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Forçar reload completo da página para garantir limpeza total
      window.location.href = '/login'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      // Mesmo com erro, forçar navegação para login
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen bg-background transition-all duration-300 ease-in-out page-transition">
      <header className="bg-[#fc4d00] shadow-sm border-b border-border shadow-orange-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center min-h-[80px] gap-2">
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 min-w-0">
              <img 
                src="/logo-medmais.png" 
                alt="MedMais Logo" 
                className="h-8 sm:h-10 w-auto brightness-0 invert shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-white truncate">
                  {isGerenteSCI ? 'Dashboard - Gerente de SCI' : 'Dashboard - Admin'}
                </h1>
                <p className="text-xs sm:text-sm text-white/90 truncate">
                  {authUser?.profile?.nome}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-white hover:bg-white/20 transition-all duration-200"
                  >
                    <Settings className="h-6 w-6" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2">
                  <div className="flex flex-col gap-1">
                    <Button 
                      variant="ghost" 
                      onClick={() => navigate('/settings')} 
                      className="w-full justify-start gap-2 text-gray-700 hover:text-[#fc4d00] hover:bg-orange-50"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={handleLogout} 
                      className="w-full justify-start gap-2 text-gray-700 hover:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card Lançamentos - visível apenas para Gerente de SCI */}
          {isGerenteSCI && (
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-[#fc4d00]" />
                  <CardTitle className="text-lg">Lançamentos</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Visualize os lançamentos da sua base para conferência
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0 pb-6">
                <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                  Acesse o histórico de lançamentos da sua base em modo somente leitura.
                </p>
                <Button onClick={() => navigate('/lancamentos-base')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto shadow-orange-sm">
                  Ver Lançamentos
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card Dashboard Analytics - apenas Gerente Geral */}
          {!isGerenteSCI && (
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Dashboard Analytics</CardTitle>
                <CardDescription className="text-sm">
                  Análise de indicadores operacionais
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0 pb-6">
                <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                  Visualize gráficos e análises detalhadas dos indicadores operacionais
                  com filtros por Base, Equipe e Período.
                </p>
                <Button onClick={() => navigate('/dashboard-analytics')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto shadow-orange-sm">
                  Acessar Dashboard Analytics
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card Explorador de Dados - apenas Gerente Geral */}
          {!isGerenteSCI && (
            <Card className="flex flex-col h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-[#fc4d00]" />
                  <CardTitle className="text-lg">Explorador de Dados</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  Auditoria completa, filtros avançados e exportação para Excel (CSV)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 pt-0 pb-6">
                <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                  Acesse relatórios avançados com filtros detalhados e exporte dados
                  para análise externa em formato CSV.
                </p>
                <Button onClick={() => navigate('/dashboard/explorer')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto shadow-orange-sm">
                  Acessar Explorador de Dados
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="flex flex-col h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Gestão de Efetivo</CardTitle>
              <CardDescription className="text-sm">
                Cadastre e gerencie colaboradores das bases
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pt-0 pb-6">
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Gerencie o efetivo (bombeiros/colaboradores) de cada base. Cadastre individualmente
                ou em lote através de uma lista de nomes.
              </p>
              <Button onClick={() => navigate('/colaboradores')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto shadow-orange-sm">
                Acessar Gestão de Efetivo
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Gestão de Usuários</CardTitle>
              <CardDescription className="text-sm">
                Cadastre e gerencie usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pt-0 pb-6">
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Acesse a tela de gestão de usuários para cadastrar novos Chefes de Equipe
                e vinculá-los às suas respectivas Bases e Equipes.
              </p>
              <Button onClick={() => navigate('/gestao-usuarios')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto shadow-orange-sm">
                Acessar Gestão de Usuários
              </Button>
            </CardContent>
          </Card>

          {/* Card Aderência - apenas Gerente Geral */}
          {!isGerenteSCI && (
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Monitoramento de Aderência</CardTitle>
              <CardDescription className="text-sm">
                Auditoria de engajamento das bases
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pt-0 pb-6">
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Identifique quais bases estão cumprindo a rotina de lançamentos através
                do mapa de calor e radar de atraso.
              </p>
              <Button onClick={() => navigate('/aderencia')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto shadow-orange-sm">
                Acessar Aderência
              </Button>
            </CardContent>
          </Card>
          )}

          {/* Card Suporte - apenas Gerente Geral */}
          {!isGerenteSCI && (
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#fc4d00]" />
                <CardTitle className="text-lg">Suporte / Feedback</CardTitle>
                {typeof feedbackPendentes === 'number' && feedbackPendentes > 0 && (
                  <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {feedbackPendentes} pendente{feedbackPendentes !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <CardDescription className="text-sm">
                Veja os feedbacks enviados pelos usuários e dê as tratativas
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 pt-0 pb-6">
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Os usuários podem enviar sugestões, reportar bugs ou outros no suporte.
                Acesse a tela de suporte para visualizar e atualizar o status de cada feedback.
              </p>
              <Button onClick={() => navigate('/suporte')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto shadow-orange-sm">
                Acessar Suporte
              </Button>
            </CardContent>
          </Card>
          )}
        </div>
      </main>
    </div>
  )
}
