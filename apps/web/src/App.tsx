import { Suspense, lazy, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { SeoMeta } from './lib/seo'

/*
 * Each screen is its own chunk. The map page carries Leaflet, so without this
 * every other route would download and parse a map library it never uses.
 */
const MapPage = lazy(() => import('./pages/MapPage').then((m) => ({ default: m.MapPage })))
const ReportPage = lazy(() => import('./pages/ReportPage').then((m) => ({ default: m.ReportPage })))
const StatusPage = lazy(() => import('./pages/StatusPage').then((m) => ({ default: m.StatusPage })))
const ScheduledPage = lazy(() =>
  import('./pages/ScheduledPage').then((m) => ({ default: m.ScheduledPage })),
)
const MorePage = lazy(() => import('./pages/MorePage').then((m) => ({ default: m.MorePage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })))

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
        <SeoMeta />
        <Suspense fallback={<div className="route-loading" aria-busy="true" />}>
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
