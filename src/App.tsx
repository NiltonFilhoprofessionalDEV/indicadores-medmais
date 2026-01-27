import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { DashboardChefe } from './pages/DashboardChefe'
import { DashboardGerente } from './pages/DashboardGerente'
import { DashboardAnalytics } from './pages/DashboardAnalytics'
import { GestaoUsuarios } from './pages/GestaoUsuarios'
import { Colaboradores } from './pages/admin/Colaboradores'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
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
            <ProtectedRoute allowedRoles={['geral']}>
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
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
