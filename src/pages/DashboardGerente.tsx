import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppShell } from '@/components/AppShell'
import {
  FileSpreadsheet,
  MessageSquare,
  ClipboardList,
  Building2,
  Users,
  UserCog,
  BarChart3,
  Activity,
  ChevronRight,
} from 'lucide-react'

interface NavCardProps {
  icon: React.ReactNode
  title: string
  description: string
  badge?: React.ReactNode
  onClick: () => void
}

function NavCard({ icon, title, description, badge, onClick }: NavCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col h-full text-left bg-card border border-border rounded-xl p-5 shadow-soft
        hover:shadow-soft-md hover:border-primary/20 transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary
          group-hover:bg-primary group-hover:text-white transition-all duration-200">
          {icon}
        </div>
        {badge}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{description}</p>
      <div className="flex items-center gap-1 mt-4 text-sm font-medium text-primary/70 group-hover:text-primary transition-colors">
        Acessar <ChevronRight className="h-3.5 w-3.5" />
      </div>
    </button>
  )
}

export function DashboardGerente() {
  const { authUser } = useAuth()
  const role = authUser?.profile?.role
  const isGerenteSCI = role === 'gerente_sci' || (role === 'chefe' && authUser?.profile?.acesso_gerente_sci)
  const isChefeComAcesso = role === 'chefe' && authUser?.profile?.acesso_gerente_sci
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
      title={isGerenteSCI ? 'Gerente de SCI' : 'Administrador'}
      subtitle={authUser?.profile?.nome}
      extraActions={
        isChefeComAcesso ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard-chefe')}
            className="text-white/90 hover:bg-white/15 border border-white/20 text-sm"
          >
            Painel de Lançamentos
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Painéis e Ferramentas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isGerenteSCI && (
              <NavCard
                icon={<ClipboardList className="h-5 w-5" />}
                title="Lançamentos"
                description="Visualize o histórico de lançamentos da sua base para conferência."
                onClick={() => navigate('/lancamentos-base')}
              />
            )}

            {!isGerenteSCI && (
              <NavCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Dashboard Analytics"
                description="Gráficos e análises detalhadas dos indicadores operacionais com filtros por Base, Equipe e Período."
                onClick={() => navigate('/dashboard-analytics')}
              />
            )}

            {!isGerenteSCI && (
              <NavCard
                icon={<FileSpreadsheet className="h-5 w-5" />}
                title="Explorador de Dados"
                description="Auditoria completa, filtros avançados e exportação para Excel (CSV)."
                onClick={() => navigate('/dashboard/explorer')}
              />
            )}

            {!isGerenteSCI && (
              <NavCard
                icon={<Building2 className="h-5 w-5" />}
                title="Gestão de Bases"
                description="Cadastre novas unidades aeroportuárias ou gerencie as existentes."
                onClick={() => navigate('/admin/bases')}
              />
            )}

            <NavCard
              icon={<Users className="h-5 w-5" />}
              title="Gestão de Efetivo"
              description="Gerencie o efetivo (bombeiros/colaboradores) de cada base."
              onClick={() => navigate('/colaboradores')}
            />

            <NavCard
              icon={<UserCog className="h-5 w-5" />}
              title="Gestão de Usuários"
              description="Cadastre novos Chefes de Equipe e vincule-os às suas Bases e Equipes."
              onClick={() => navigate('/gestao-usuarios')}
            />

            {!isGerenteSCI && (
              <NavCard
                icon={<Activity className="h-5 w-5" />}
                title="Monitoramento de Aderência"
                description="Identifique quais bases cumprem a rotina de lançamentos com mapa de calor e radar de atraso."
                onClick={() => navigate('/aderencia')}
              />
            )}

            {!isGerenteSCI && (
              <NavCard
                icon={<MessageSquare className="h-5 w-5" />}
                title="Suporte / Feedback"
                description="Veja os feedbacks enviados pelos usuários e dê as tratativas necessárias."
                badge={
                  typeof feedbackPendentes === 'number' && feedbackPendentes > 0 ? (
                    <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                      {feedbackPendentes} pendente{feedbackPendentes !== 1 ? 's' : ''}
                    </span>
                  ) : undefined
                }
                onClick={() => navigate('/suporte')}
              />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
