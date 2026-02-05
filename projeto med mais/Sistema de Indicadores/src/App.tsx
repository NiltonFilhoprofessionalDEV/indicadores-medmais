import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Login } from './pages/Login'
import { Logout } from './pages/Logout'
import { ProtectedRoute } from './components/ProtectedRoute'

// Lazy loading das páginas para reduzir bundle inicial
const DashboardChefe = lazy(() => import('./pages/DashboardChefe').then(m => ({ default: m.DashboardChefe })))
const DashboardGerente = lazy(() => import('./pages/DashboardGerente').then(m => ({ default: m.DashboardGerente })))
const DashboardGerenteSCI = lazy(() => import('./pages/DashboardGerenteSCI').then(m => ({ default: m.DashboardGerenteSCI })))
const DashboardAnalytics = lazy(() => import('./pages/DashboardAnalytics').then(m => ({ default: m.DashboardAnalytics })))
const GestaoUsuarios = lazy(() => import('./pages/GestaoUsuarios').then(m => ({ default: m.GestaoUsuarios })))
const Colaboradores = lazy(() => import('./pages/admin/Colaboradores').then(m => ({ default: m.Colaboradores })))
const LancamentosBase = lazy(() => import('./pages/LancamentosBase').then(m => ({ default: m.LancamentosBase })))
const Aderencia = lazy(() => import('./pages/Aderencia').then(m => ({ default: m.Aderencia })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const DataExplorer = lazy(() => import('./pages/DataExplorer').then(m => ({ default: m.DataExplorer })))
const Suporte = lazy(() => import('./pages/Suporte').then(m => ({ default: m.Suporte })))

// Componente de loading simples com opção de sair
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background transition-colors duration-300 gap-4">
      <div className="text-lg text-foreground font-semibold">Carregando...</div>
      <a
        href="/logout"
        className="text-sm text-muted-foreground hover:text-[#fc4d00] hover:underline"
      >
        Sair / Voltar ao login
      </a>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/logout" element={<Logout />} />
          <Route
            path="/dashboard-chefe"
            element={
              <ProtectedRoute allowedRoles={['chefe']}>
                <DashboardChefe />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard-gerente"
            element={
              <ProtectedRoute allowedRoles={['geral']}>
                <DashboardGerente />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard-gerente-sci"
            element={
              <ProtectedRoute allowedRoles={['gerente_sci']}>
                <DashboardGerenteSCI />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard-analytics"
            element={
              <ProtectedRoute allowedRoles={['geral']}>
                <DashboardAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestao-usuarios"
            element={
              <ProtectedRoute allowedRoles={['geral', 'gerente_sci']}>
                <GestaoUsuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/colaboradores"
            element={
              <ProtectedRoute allowedRoles={['geral', 'gerente_sci']}>
                <Colaboradores />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lancamentos-base"
            element={
              <ProtectedRoute allowedRoles={['gerente_sci']}>
                <LancamentosBase />
              </ProtectedRoute>
            }
          />
          <Route
            path="/aderencia"
            element={
              <ProtectedRoute allowedRoles={['geral']}>
                <Aderencia />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['geral', 'chefe', 'gerente_sci']}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/explorer"
            element={
              <ProtectedRoute allowedRoles={['geral']}>
                <DataExplorer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suporte"
            element={
              <ProtectedRoute allowedRoles={['geral']}>
                <Suporte />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
