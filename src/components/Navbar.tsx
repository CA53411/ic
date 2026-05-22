/**
 * Navbar.tsx - Sidebar Navigation Component
 *
 * Provides dynamic navigation based on authentication state and companion status.
 * Includes brand header, nav items, utility buttons, and auth section.
 */
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageCircle,
  Calendar,
  BookOpen,
  Zap,
  Settings,
  Heart,
  LogOut,
  LogIn,
  Sparkles,
  HelpCircle,
  Shield,
  FileText,
  Moon,
  Sun,
  Globe,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/** Navigation item definition */
interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

/** Props for the Navbar component */
interface NavbarProps {
  isAuthenticated: boolean;
  user: User | null;
  hasCompanion: boolean;
  onLogout: () => Promise<void>;
}

/** Navigation items shown when user is NOT authenticated */
const publicNavItems: NavItem[] = [
  { label: 'Home', path: '/', icon: <Sparkles size={20} /> },
  { label: 'Login', path: '/auth', icon: <LogIn size={20} /> },
];

/** Base navigation items shown when user IS authenticated */
function getAuthenticatedNavItems(hasCompanion: boolean): NavItem[] {
  // First item depends on companion status
  const firstItem: NavItem = hasCompanion
    ? { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> }
    : { label: 'Companion', path: '/customize', icon: <Sparkles size={20} /> };

  return [
    firstItem,
    { label: 'Plaza', path: '/plaza', icon: <Users size={20} /> },
    { label: 'Chat', path: '/chat', icon: <MessageCircle size={20} /> },
    { label: 'Memory', path: '/memory', icon: <Calendar size={20} /> },
    { label: 'Drama', path: '/drama', icon: <BookOpen size={20} /> },
    { label: 'Payment', path: '/payment', icon: <Zap size={20} /> },
    { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
  ];
}

export default function Navbar({
  isAuthenticated,
  user,
  hasCompanion,
  onLogout,
}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'dark';
  });
  const [language, setLanguage] = useState<'en' | 'zh'>(() => {
    const stored = localStorage.getItem('language');
    return stored === 'zh' ? 'zh' : 'en';
  });

  // Determine which nav items to show
  const navItems = isAuthenticated
    ? getAuthenticatedNavItems(hasCompanion)
    : publicNavItems;

  /** Toggle dark mode and persist preference */
  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  /** Toggle language and persist preference */
  const toggleLanguage = () => {
    const next = language === 'en' ? 'zh' : 'en';
    setLanguage(next);
    localStorage.setItem('language', next);
  };

  /** Handle logout with error handling */
  const handleLogout = async () => {
    try {
      await onLogout();
    } catch {
      // Error is already handled in AuthContext
    }
  };

  return (
    <nav className="fixed left-0 top-0 h-screen w-[220px] sidebar-gradient shadow-sidebar z-50 flex flex-col">
      {/* ========== Brand Logo ========== */}
      <div
        className="flex items-center gap-2 px-5 py-6 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <Sparkles size={24} className="text-pink-200" />
        <span className="text-pink-200 text-lg font-bold tracking-tight">
          Corolas | Platonic
        </span>
      </div>

      {/* ========== Navigation Items ========== */}
      <div className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                transition-all duration-150 ease-out
                ${
                  isActive
                    ? 'bg-sidebar-active text-white border-l-[3px] border-pink-400'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200 border-l-[3px] border-transparent'
                }
              `}
            >
              <span
                className={`
                  transition-transform duration-150
                  ${hoveredItem === item.path && !isActive ? 'scale-110' : ''}
                  ${isActive ? 'text-pink-200' : 'text-sidebar-icon'}
                `}
              >
                {item.icon}
              </span>
              <span className="font-body">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========== Bottom Section ========== */}
      <div className="px-3 pb-4 flex flex-col gap-2">
        {/* Crowdfunding link - only show for authenticated users */}
        {isAuthenticated && (
          <button
            onClick={() => navigate('/crowdfunding')}
            onMouseEnter={() => setHoveredItem('/crowdfunding')}
            onMouseLeave={() => setHoveredItem(null)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              transition-all duration-150 border-l-[3px]
              ${
                location.pathname === '/crowdfunding'
                  ? 'bg-sidebar-active text-white border-pink-400'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-rose-gold border-transparent'
              }
            `}
          >
            <Heart
              size={20}
              className={
                location.pathname === '/crowdfunding'
                  ? 'text-pink-200'
                  : 'text-rose-gold'
              }
            />
            <span className="font-body">Crowdfunding</span>
          </button>
        )}

        {/* Utility Buttons */}
        <div className="flex flex-col gap-1">
          {/* Help - opens dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                onMouseEnter={() => setHoveredItem('help')}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
                  text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
                  transition-all duration-150 w-full"
              >
                <HelpCircle
                  size={18}
                  className={hoveredItem === 'help' ? 'text-pink-200 scale-110' : 'text-sidebar-icon'}
                />
                <span className="font-body">Help</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Help Center</DialogTitle>
                <DialogDescription>
                  Need assistance? Contact us at{' '}
                  <a
                    href="mailto:corolar@corolas.top"
                    className="text-pink-400 hover:underline"
                  >
                    corolar@corolas.top
                  </a>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Welcome to Corolas | Platonic! Here you can create your own AI companion,
                  chat with them, explore memories together, and enjoy immersive drama stories.
                </p>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Getting Started</h4>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Sign up or log in to your account</li>
                    <li>Create your companion in the Companion page</li>
                    <li>Start chatting and building memories</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Privacy */}
          <button
            onClick={() => navigate('/privacy')}
            onMouseEnter={() => setHoveredItem('privacy')}
            onMouseLeave={() => setHoveredItem(null)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
              text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
              transition-all duration-150 w-full"
          >
            <Shield
              size={18}
              className={hoveredItem === 'privacy' ? 'text-pink-200 scale-110' : 'text-sidebar-icon'}
            />
            <span className="font-body">Privacy</span>
          </button>

          {/* Terms */}
          <button
            onClick={() => navigate('/terms')}
            onMouseEnter={() => setHoveredItem('terms')}
            onMouseLeave={() => setHoveredItem(null)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
              text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
              transition-all duration-150 w-full"
          >
            <FileText
              size={18}
              className={hoveredItem === 'terms' ? 'text-pink-200 scale-110' : 'text-sidebar-icon'}
            />
            <span className="font-body">Terms</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            onMouseEnter={() => setHoveredItem('darkmode')}
            onMouseLeave={() => setHoveredItem(null)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
              text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
              transition-all duration-150 w-full"
          >
            {isDark ? (
              <Sun size={18} className={hoveredItem === 'darkmode' ? 'text-pink-200 scale-110' : 'text-sidebar-icon'} />
            ) : (
              <Moon size={18} className={hoveredItem === 'darkmode' ? 'text-pink-200 scale-110' : 'text-sidebar-icon'} />
            )}
            <span className="font-body">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Language Selector */}
          <button
            onClick={toggleLanguage}
            onMouseEnter={() => setHoveredItem('language')}
            onMouseLeave={() => setHoveredItem(null)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
              text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
              transition-all duration-150 w-full"
          >
            <Globe
              size={18}
              className={hoveredItem === 'language' ? 'text-pink-200 scale-110' : 'text-sidebar-icon'}
            />
            <span className="font-body">{language === 'en' ? 'English' : '中文'}</span>
          </button>
        </div>

        {/* ========== Auth Section ========== */}
        <div className="border-t border-sidebar-hover pt-3 mt-1">
          {isAuthenticated && user ? (
            <div className="flex flex-col gap-2">
              {/* User info */}
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="relative">
                  <img
                    src={user.user_metadata?.avatar || '/default-avatar.jpg'}
                    alt={user.user_metadata?.username || user.email || 'User'}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-pink-400/30"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/default-avatar.jpg';
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-pink-400 rounded-full ring-2 ring-sidebar-bg" />
                </div>
                <div className="flex flex-col items-start overflow-hidden">
                  <span className="text-white text-[13px] font-medium leading-tight truncate max-w-[120px]">
                    {user.user_metadata?.username || user.email || 'User'}
                  </span>
                  <span className="text-sidebar-text text-[11px]">Online</span>
                </div>
              </div>
              {/* Logout button */}
              <button
                onClick={handleLogout}
                onMouseEnter={() => setHoveredItem('logout')}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm
                  text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
                  transition-all duration-150 w-full"
              >
                <LogOut
                  size={18}
                  className={hoveredItem === 'logout' ? 'text-pink-200 scale-110' : 'text-sidebar-icon'}
                />
                <span className="font-body text-xs">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              onMouseEnter={() => setHoveredItem('login')}
              onMouseLeave={() => setHoveredItem(null)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
                transition-all duration-150 w-full"
            >
              <LogIn
                size={20}
                className={hoveredItem === 'login' ? 'text-pink-200 scale-110' : 'text-sidebar-icon'}
              />
              <span className="font-body">Login</span>
            </button>
          )}
        </div>

        {/* ========== Copyright ========== */}
        <div className="px-4 pt-2 pb-1">
          <p className="text-sidebar-text text-[10px] opacity-60">
            &copy; 2026 Corolas | Platonic
          </p>
          <a
            href="mailto:corolar@corolas.top"
            className="text-sidebar-text text-[10px] opacity-60 hover:opacity-100 hover:text-pink-200 transition-opacity"
          >
            corolar@corolas.top
          </a>
        </div>
      </div>
    </nav>
  );
}
