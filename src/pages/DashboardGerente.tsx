import { useAuth } from '@/contexts/AuthContext'
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
    <div className="min-h-screen bg-gray-50 transition-all duration-300 ease-in-out page-transition">
      <header className="bg-[#fc4d00] shadow-sm border-b">
        <div className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-0 py-4">
          <div className="flex justify-between items-center min-h-[80px]">
            <div className="flex items-center gap-4 pl-4 sm:pl-6 lg:pl-8">
              <img 
                src="/logo-medmais.png" 
                alt="MedMais Logo" 
                className="h-10 w-auto brightness-0 invert"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard - Administrador</h1>
                <p className="text-sm text-white/90">
                  {authUser?.profile?.nome} - {authUser?.profile?.role}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/gestao-usuarios')} className="bg-white text-[#fc4d00] hover:bg-white/90 transition-all duration-200">
                Gestão de Usuários
              </Button>
              <Button onClick={() => navigate('/dashboard-analytics')} className="bg-white text-[#fc4d00] hover:bg-white/90 border-white transition-all duration-200">
                Dashboard Analytics
              </Button>
              <Button onClick={handleLogout} className="bg-white text-[#fc4d00] hover:bg-white/90 border-white transition-all duration-200">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Gestão de Usuários</CardTitle>
              <CardDescription>
                Cadastre e gerencie usuários do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <p className="text-gray-600 mb-4 flex-1">
                Acesse a tela de gestão de usuários para cadastrar novos Chefes de Equipe
                e vinculá-los às suas respectivas Bases e Equipes.
              </p>
              <Button onClick={() => navigate('/gestao-usuarios')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto">
                Acessar Gestão de Usuários
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Gestão de Efetivo</CardTitle>
              <CardDescription>
                Cadastre e gerencie colaboradores das bases
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <p className="text-gray-600 mb-4 flex-1">
                Gerencie o efetivo (bombeiros/colaboradores) de cada base. Cadastre individualmente
                ou em lote através de uma lista de nomes.
              </p>
              <Button onClick={() => navigate('/colaboradores')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto">
                Acessar Gestão de Efetivo
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Dashboard Analytics</CardTitle>
              <CardDescription>
                Análise de indicadores operacionais
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <p className="text-gray-600 mb-4 flex-1">
                Visualize gráficos e análises detalhadas dos indicadores operacionais
                com filtros por Base, Equipe e Período.
              </p>
              <Button onClick={() => navigate('/dashboard-analytics')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto">
                Acessar Dashboard Analytics
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Monitoramento de Aderência</CardTitle>
              <CardDescription>
                Auditoria de engajamento das bases
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1">
              <p className="text-gray-600 mb-4 flex-1">
                Identifique quais bases estão cumprindo a rotina de lançamentos através
                do mapa de calor e radar de atraso.
              </p>
              <Button onClick={() => navigate('/aderencia')} className="w-full bg-[#fc4d00] hover:bg-[#e04400] text-white mt-auto">
                Acessar Aderência
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
