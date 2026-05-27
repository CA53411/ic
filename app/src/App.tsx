/**
 * App.tsx - Root Application Component
 *
 * Wraps the entire application with AuthProvider and defines all routes.
 * Includes route guards for authenticated pages and companion-required pages.
 */
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { I18nProvider } from './i18n/I18nContext'
import { useI18n } from './i18n/I18nContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Plaza from './pages/Plaza'
import Customize from './pages/Customize'
import Chat from './pages/Chat'
import Memory from './pages/Memory'
import Drama from './pages/Drama'
import DramaSpace from './pages/DramaSpace'
import Payment from './pages/Payment'
import Settings from './pages/Settings'
import Crowdfunding from './pages/Crowdfunding'
import Achievement from './pages/Achievement'
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
 * CompanionRoute - Redirects authenticated users without a companion to /plaza.
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
    return <Navigate to="/plaza" replace />
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
      <I18nProvider>
        <ThemeProvider>
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
          <Route path="/achievement" element={<ProtectedRoute><Achievement /></ProtectedRoute>} />

          {/* Companion routes - require both authentication AND a companion */}
          <Route path="/dashboard" element={<CompanionRoute><Dashboard /></CompanionRoute>} />
          <Route path="/chat" element={<CompanionRoute><Chat /></CompanionRoute>} />
          <Route path="/memory" element={<CompanionRoute><Memory /></CompanionRoute>} />
          <Route path="/drama" element={<CompanionRoute><Drama /></CompanionRoute>} />
          <Route path="/drama-space/:sessionId" element={<CompanionRoute><DramaSpace /></CompanionRoute>} />

          {/* Legal pages */}
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {/* Fallback: redirect unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </Layout>
        </ThemeProvider>
      </I18nProvider>
    </AuthProvider>
  )
}

/** Simple Privacy Policy placeholder page */
function PrivacyPage() {
  const { t } = useI18n();
  return (
    <div className="p-8 max-w-[800px] mx-auto">
      <h1 className="font-body text-[28px] font-bold text-[#2D1B2E] dark:text-white mb-4">{t('settings.privacy')}</h1>
      <div className="space-y-4 text-[14px] text-[#6B5B6E] dark:text-gray-300 font-body leading-relaxed">
        <p>{t('settings.updated')}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">1. {t('settings.dataCollection') || 'Data Collection'}</h2>
        <p>{t('settings.dataCollectionDesc') || 'We only collect the minimum information necessary to provide the service, including: account info (email, username), companion configuration, conversation records, and usage statistics.'}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">2. {t('settings.dataStorage') || 'Data Storage'}</h2>
        <p>{t('settings.dataStorageDesc') || 'Your conversation data is stored on secure cloud servers. Sensitive information is encrypted. You can export or delete your data at any time.'}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">3. {t('settings.dataUsage') || 'Data Usage'}</h2>
        <p>{t('settings.dataUsageDesc') || 'We do not sell your personal data to third parties. We do not use your conversation content to train AI models (unless you explicitly consent). Data is only used for providing services and technical support.'}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">4. {t('settings.yourRights') || 'Your Rights'}</h2>
        <p>{t('settings.yourRightsDesc') || 'You have the right to access, correct, delete, and export your data.'}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">5. {t('settings.contact') || 'Contact'}</h2>
        <p>{t('settings.contactDesc') || 'For privacy-related questions, please contact'}: corolar@corolas.top</p>
      </div>
    </div>
  )
}

/** Simple Terms of Service placeholder page */
function TermsPage() {
  const { t } = useI18n();
  return (
    <div className="p-8 max-w-[800px] mx-auto">
      <h1 className="font-body text-[28px] font-bold text-[#2D1B2E] dark:text-white mb-4">{t('settings.terms')}</h1>
      <div className="space-y-4 text-[14px] text-[#6B5B6E] dark:text-gray-300 font-body leading-relaxed">
        <p>{t('settings.updated')}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">1. {t('settings.serviceDesc') || 'Service Description'}</h2>
        <p>Corolas | Platonic {t('settings.serviceDescDetail') || 'is an AI virtual companion app designed to provide emotional companionship and interactive experiences.'}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">2. {t('settings.usageRules') || 'Usage Rules'}</h2>
        <p>{t('settings.usageRulesDesc') || 'Users must be at least 13 years old. Use for illegal, fraudulent, or harassment purposes is prohibited. Reverse engineering or interfering with normal service operation is prohibited. Users are responsible for their account behavior.'}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">3. {t('settings.contentPolicy') || 'Content Policy'}</h2>
        <p>{t('settings.contentPolicyDesc') || 'Generating or distributing illegal, violent, or hateful speech is prohibited. Uploading content that infringes on others intellectual property rights is prohibited. We reserve the right to remove violating content.'}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">4. {t('settings.disclaimer') || 'Disclaimer'}</h2>
        <p>{t('settings.disclaimerDesc') || 'AI companion responses are generated by algorithms and do not constitute professional advice. The service is provided "as is" without any express or implied warranties.'}</p>
        <h2 className="font-semibold text-[#2D1B2E] dark:text-white mt-4">5. {t('settings.contact') || 'Contact Us'}</h2>
        <p>{t('settings.contactDesc') || 'For any questions, please contact'}: corolar@corolas.top</p>
      </div>
    </div>
  )
}
