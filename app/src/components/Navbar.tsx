/**
 * Navbar.tsx - Sidebar Navigation Component
 *
 * Provides dynamic navigation based on authentication state and companion status.
 * Includes brand header, nav items, dark mode (3-state), 4-language selector, and auth section.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Sun,
  Moon,
  Monitor,
  Globe,
  Check,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { useThemeContext } from '@/context/ThemeContext';
import { useI18n } from '@/i18n/I18nContext';
import type { Language } from '@/i18n/translations';
import type { Theme } from '@/lib/theme';

/** Props for the Navbar component */
interface NavbarProps {
  isAuthenticated: boolean;
  user: User | null;
  hasCompanion: boolean;
  onLogout: () => Promise<void>;
}

/** Theme cycle order: light -> dark -> auto -> light */
const themeCycle: Theme[] = ['light', 'dark', 'auto'];

const languageOptions: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
];

/** Theme icon map */
function ThemeIcon({ theme, size = 18, className }: { theme: Theme; size?: number; className?: string }) {
  if (theme === 'light') return <Sun size={size} className={className} />;
  if (theme === 'dark') return <Moon size={size} className={className} />;
  return <Monitor size={size} className={className} />;
}

/** Theme label via i18n */
function useThemeLabel(theme: Theme, t: (k: string) => string) {
  if (theme === 'light') return t('theme.light');
  if (theme === 'dark') return t('theme.dark');
  return t('theme.auto');
}

export default function Navbar({
  isAuthenticated,
  user,
  hasCompanion,
  onLogout,
}: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, setLang } = useI18n();
  const { theme, cycleTheme } = useThemeContext();

  // Language dropdown state
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Nav items with i18n labels
  const navItems = isAuthenticated
    ? [
        ...(hasCompanion
          ? [{ label: t('nav.dashboard'), path: '/dashboard', icon: <LayoutDashboard size={20} /> }]
          : [{ label: t('nav.plaza'), path: '/plaza', icon: <Users size={20} /> }]),
        { label: t('nav.chat'), path: '/chat', icon: <MessageCircle size={20} /> },
        { label: t('nav.memory'), path: '/memory', icon: <Calendar size={20} /> },
        { label: t('nav.drama'), path: '/drama', icon: <BookOpen size={20} /> },
        { label: t('nav.payment'), path: '/payment', icon: <Zap size={20} /> },
        { label: t('nav.settings'), path: '/settings', icon: <Settings size={20} /> },
        { label: t('nav.crowdfunding'), path: '/crowdfunding', icon: <Heart size={20} /> },
      ]
    : [
        { label: t('nav.home'), path: '/', icon: <Sparkles size={20} /> },
        { label: t('auth.login'), path: '/auth', icon: <LogIn size={20} /> },
      ];

  /** Handle logout */
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
        <img
          src="/platonic.png"
          alt="Logo"
          className="w-8 h-8 rounded-lg object-cover ring-1 ring-pink-400/40"
        />
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
        {/* Separator */}
        <div className="border-t border-sidebar-hover my-1" />

        {/* Dark Mode Toggle - 3-state */}
        <button
          onClick={cycleTheme}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
            text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
            transition-all duration-150 w-full"
        >
          <ThemeIcon theme={theme} size={18} className="text-sidebar-icon" />
          <span className="font-body">{useThemeLabel(theme, t)}</span>
        </button>

        {/* Language Selector — 4-language dropdown */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
              text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
              transition-all duration-150 w-full"
          >
            <Globe size={18} className="text-sidebar-icon" />
            <span className="font-body">
              {languageOptions.find((l) => l.code === lang)?.label ?? 'English'}
            </span>
            <motion.span
              animate={{ rotate: langOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="ml-auto"
            >
              <Monitor size={12} className="opacity-50" style={{ display: 'none' }} />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </motion.span>
          </button>

          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 right-0 mb-1.5 bg-[#2A1A3A] border border-pink-400/20 rounded-xl overflow-hidden shadow-xl z-50"
              >
                {languageOptions.map((option) => {
                  const isSelected = lang === option.code;
                  return (
                    <button
                      key={option.code}
                      onClick={() => {
                        setLang(option.code);
                        setLangOpen(false);
                      }}
                      className={`
                        flex items-center gap-2 w-full px-3 py-2.5 text-sm
                        transition-all duration-150
                        ${isSelected
                          ? 'bg-pink-400/20 text-pink-200'
                          : 'text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200'
                        }
                      `}
                    >
                      <span className="font-body flex-1 text-left">{option.label}</span>
                      {isSelected && <Check size={14} className="text-pink-400" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
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
                  <span className="text-sidebar-text text-[11px]">{t('common.online')}</span>
                </div>
              </div>
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm
                  text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
                  transition-all duration-150 w-full"
              >
                <LogOut size={18} className="text-sidebar-icon" />
                <span className="font-body text-xs">{t('common.logout')}</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
                transition-all duration-150 w-full"
            >
              <LogIn size={20} className="text-sidebar-icon" />
              <span className="font-body">{t('auth.login')}</span>
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
