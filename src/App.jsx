import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import NewLead from './pages/NewLead'
import Opportunity from './pages/Opportunity'
import Referrers from './pages/Referrers'
import Approvals from './pages/Approvals'
import Procurement from './pages/Procurement'
import Billing from './pages/Billing'
import Admin from './pages/Admin'
import Notifications from './pages/Notifications'
import { hasRole } from './lib/permissions'

function Guard({ children, roles }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !hasRole(user, ...roles)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/pipeline" element={<Pipeline />} />
        <Route path="/leads/new" element={<NewLead />} />
        <Route path="/opportunities/:id" element={<Opportunity />} />
        <Route path="/referrers" element={<Referrers />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/notifications" element={<Notifications />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
