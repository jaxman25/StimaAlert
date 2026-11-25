import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { MapPage } from './pages/MapPage'
import { MorePage } from './pages/MorePage'
import { ReportPage } from './pages/ReportPage'
import { ScheduledPage } from './pages/ScheduledPage'
import { StatusPage } from './pages/StatusPage'

/** Blocks its children until someone is signed in, sending others to /login. */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  // Wait for the stored session to be read back, so a reload doesn't bounce
  // a signed-in admin to the login screen.
  if (loading) return null
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/scheduled" element={<ScheduledPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<MapPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
