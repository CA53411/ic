/**
 * Layout.tsx - Application Root Layout
 *
 * Manages the sidebar visibility, dark mode theme (3-state: light/dark/auto),
 * and toast notifications.
 * Integrates with AuthContext to pass auth state to the Navbar.
 */
import { useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useThemeContext } from '@/context/ThemeContext';
import { applyTheme, loadSavedTheme, getEffectiveTheme } from '@/lib/theme';
import Navbar from './Navbar';

/** Routes that should display the sidebar navigation */
const sidebarRoutes = [
  '/dashboard',
  '/plaza',
  '/chat',
  '/memory',
  '/drama',
  '/settings',
  '/payment',
  '/crowdfunding',
  '/customize',
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, user, hasCompanion, logout } = useAuth();
  const { effectiveTheme } = useThemeContext();
  const isDark = effectiveTheme === 'dark';

  // Determine if the sidebar should be visible for the current route
  const showSidebar = sidebarRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  return (
    <div className="min-h-screen bg-pink-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Global toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: isDark ? '#1f2937' : '#fff',
            color: isDark ? '#f3f4f6' : '#1f2937',
            border: isDark ? '1px solid #374151' : '1px solid #e5e7eb',
          },
        }}
      />

      {/* Conditionally render Navbar for sidebar routes */}
      {showSidebar && (
        <Navbar
          isAuthenticated={isAuthenticated}
          user={user}
          hasCompanion={hasCompanion}
          onLogout={logout}
        />
      )}

      {/* Main content area with sidebar offset */}
      <div
        className={`
          min-h-screen transition-all duration-300
          ${showSidebar ? 'ml-[220px]' : ''}
        `}
      >
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
