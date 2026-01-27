import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Login } from './pages/Login'
import { ProtectedRoute } from './components/ProtectedRoute'

// Lazy loading das páginas para reduzir bundle inicial
const DashboardChefe = lazy(() => import('./pages/DashboardChefe').then(m => ({ default: m.DashboardChefe })))
const DashboardGerente = lazy(() => import('./pages/DashboardGerente').then(m => ({ default: m.DashboardGerente })))
const DashboardAnalytics = lazy(() => import('./pages/DashboardAnalytics').then(m => ({ default: m.DashboardAnalytics })))
const GestaoUsuarios = lazy(() => import('./pages/GestaoUsuarios').then(m => ({ default: m.GestaoUsuarios })))
const Colaboradores = lazy(() => import('./pages/admin/Colaboradores').then(m => ({ default: m.Colaboradores })))
const Aderencia = lazy(() => import('./pages/Aderencia').then(m => ({ default: m.Aderencia })))

// Componente de loading simples
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-lg text-gray-700 font-semibold">Carregando...</div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
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
            path="/dashboard-analytics"
            element={
              <ProtectedRoute allowedRoles={['geral', 'chefe']}>
                <DashboardAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestao-usuarios"
            element={
              <ProtectedRoute allowedRoles={['geral']}>
                <GestaoUsuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/colaboradores"
            element={
              <ProtectedRoute allowedRoles={['geral']}>
                <Colaboradores />
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
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
