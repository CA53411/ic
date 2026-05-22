/**
 * App.tsx - Root Application Component
 *
 * Wraps the entire application with AuthProvider and defines all routes.
 * Includes route guards for authenticated pages and companion-required pages.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Plaza from './pages/Plaza'
import Customize from './pages/Customize'
import Chat from './pages/Chat'
import Memory from './pages/Memory'
import Drama from './pages/Drama'
import Payment from './pages/Payment'
import Settings from './pages/Settings'
import Crowdfunding from './pages/Crowdfunding'
import { Spinner } from './components/ui/spinner'

/**
 * ProtectedRoute - Redirects unauthenticated users to /auth.
 * Shows a loading spinner while auth state is being determined.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50 dark:bg-gray-900">
        <Spinner className="w-12 h-12 text-pink-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

/**
 * CompanionRoute - Redirects authenticated users without a companion to /customize.
 * Also acts as a protected route (redirects unauthenticated users to /auth).
 */
function CompanionRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, hasCompanion, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50 dark:bg-gray-900">
        <Spinner className="w-12 h-12 text-pink-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  if (!hasCompanion) {
    return <Navigate to="/customize" replace />
  }

  return <>{children}</>
}

/** AuthRoute - Redirects already authenticated users to dashboard. */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pink-50 dark:bg-gray-900">
        <Spinner className="w-12 h-12 text-pink-400" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Public routes - accessible without authentication */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />

          {/* Protected routes - require authentication */}
          <Route path="/plaza" element={<ProtectedRoute><Plaza /></ProtectedRoute>} />
          <Route path="/customize" element={<ProtectedRoute><Customize /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
          <Route path="/crowdfunding" element={<ProtectedRoute><Crowdfunding /></ProtectedRoute>} />

          {/* Companion routes - require both authentication AND a companion */}
          <Route path="/dashboard" element={<CompanionRoute><Dashboard /></CompanionRoute>} />
          <Route path="/chat" element={<CompanionRoute><Chat /></CompanionRoute>} />
          <Route path="/memory" element={<CompanionRoute><Memory /></CompanionRoute>} />
          <Route path="/drama" element={<CompanionRoute><Drama /></CompanionRoute>} />

          {/* Fallback: redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}
