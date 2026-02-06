import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/AppShell'
import { FileSpreadsheet, MessageSquare, ClipboardList } from 'lucide-react'

export function DashboardGerente() {
  const { authUser } = useAuth()
  const isGerenteSCI = authUser?.profile?.role === 'gerente_sci'
  const navigate = useNavigate()

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
    enabled: !!authUser?.user?.id && authUser?.profile?.role === 'geral',
  })

  return (
    <AppShell
      title={isGerenteSCI ? 'Dashboard - Gerente de SCI' : 'Dashboard - Admin'}
      subtitle={authUser?.profile?.nome}
    >
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card Lançamentos - visível apenas para Gerente de SCI */}
          {isGerenteSCI && (
            <Card className="flex flex-col h-full shadow-soft dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
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
                <Button onClick={() => navigate('/lancamentos-base')} className="w-full mt-auto">
                  Ver Lançamentos
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card Dashboard Analytics - apenas Gerente Geral */}
          {!isGerenteSCI && (
            <Card className="flex flex-col h-full shadow-soft dark:bg-slate-800 dark:border-slate-700">
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
                <Button onClick={() => navigate('/dashboard-analytics')} className="w-full mt-auto">
                  Acessar Dashboard Analytics
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Card Explorador de Dados - apenas Gerente Geral */}
          {!isGerenteSCI && (
            <Card className="flex flex-col h-full shadow-soft dark:bg-slate-800 dark:border-slate-700">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
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
                <Button onClick={() => navigate('/dashboard/explorer')} className="w-full mt-auto">
                  Acessar Explorador de Dados
                </Button>
              </CardContent>
            </Card>
          )}

          <Card className="flex flex-col h-full shadow-soft dark:bg-slate-800 dark:border-slate-700">
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
              <Button onClick={() => navigate('/colaboradores')} className="w-full mt-auto">
                Acessar Gestão de Efetivo
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full shadow-soft dark:bg-slate-800 dark:border-slate-700">
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
              <Button onClick={() => navigate('/gestao-usuarios')} className="w-full mt-auto">
                Acessar Gestão de Usuários
              </Button>
            </CardContent>
          </Card>

          {/* Card Aderência - apenas Gerente Geral */}
          {!isGerenteSCI && (
          <Card className="flex flex-col h-full shadow-soft dark:bg-slate-800 dark:border-slate-700">
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
              <Button onClick={() => navigate('/aderencia')} className="w-full mt-auto">
                Acessar Aderência
              </Button>
            </CardContent>
          </Card>
          )}

          {/* Card Suporte - apenas Gerente Geral */}
          {!isGerenteSCI && (
          <Card className="flex flex-col h-full shadow-soft dark:bg-slate-800 dark:border-slate-700">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
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
              <Button onClick={() => navigate('/suporte')} className="w-full mt-auto">
                Acessar Suporte
              </Button>
            </CardContent>
          </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}
