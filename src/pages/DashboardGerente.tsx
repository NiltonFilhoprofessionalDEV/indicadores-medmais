import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function DashboardGerente() {
  const { authUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Dashboard - Administrador</h1>
              <p className="text-sm text-gray-600">
                {authUser?.profile?.nome} - {authUser?.profile?.role}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/gestao-usuarios')}>
                Gestão de Usuários
              </Button>
              <Button onClick={() => navigate('/dashboard-analytics')} variant="outline">
                Dashboard Analytics
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Usuários</CardTitle>
              <CardDescription>
                Cadastre e gerencie usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Acesse a tela de gestão de usuários para cadastrar novos Chefes de Equipe
                e vinculá-los às suas respectivas Bases e Equipes.
              </p>
              <Button onClick={() => navigate('/gestao-usuarios')} className="w-full">
                Acessar Gestão de Usuários
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dashboard Analytics</CardTitle>
              <CardDescription>
                Análise de indicadores operacionais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Visualize gráficos e análises detalhadas dos indicadores operacionais
                com filtros por Base, Equipe e Período.
              </p>
              <Button onClick={() => navigate('/dashboard-analytics')} className="w-full" variant="outline">
                Acessar Dashboard Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
