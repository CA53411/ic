/**
 * Navbar.tsx - Responsive Sidebar + Mobile Bottom Tab Bar
 *
 * Desktop (≥md): Fixed left sidebar (original design)
 * Mobile (<md):  Bottom tab bar with 5 main entries + "More" sheet
 */
import { useState, useEffect, useRef, useMemo } from 'react';
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
  Trophy,
  LogOut,
  LogIn,
  Sparkles,
  Sun,
  Moon,
  Monitor,
  Globe,
  Check,
  MoreVertical,
  ChevronDown,
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

  // Language dropdown state (desktop only)
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  // Mobile "More" sheet state
  const [moreOpen, setMoreOpen] = useState(false);

  // Close language dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Desktop nav items with i18n labels
  const navItems = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { label: t('nav.home'), path: '/', icon: <Sparkles size={20} /> },
        { label: t('auth.login'), path: '/auth', icon: <LogIn size={20} /> },
      ];
    }
    return [
      ...(hasCompanion
        ? [{ label: t('nav.dashboard'), path: '/dashboard', icon: <LayoutDashboard size={20} /> }]
        : [{ label: t('nav.plaza'), path: '/plaza', icon: <Users size={20} /> }]),
      { label: t('nav.chat'), path: '/chat', icon: <MessageCircle size={20} /> },
      { label: t('nav.memory'), path: '/memory', icon: <Calendar size={20} /> },
      { label: t('nav.drama'), path: '/drama', icon: <BookOpen size={20} /> },
      { label: t('nav.achievement'), path: '/achievement', icon: <Trophy size={20} /> },
      { label: t('nav.payment'), path: '/payment', icon: <Zap size={20} /> },
      { label: t('nav.settings'), path: '/settings', icon: <Settings size={20} /> },
      { label: t('nav.crowdfunding'), path: '/crowdfunding', icon: <Heart size={20} /> },
    ];
  }, [isAuthenticated, hasCompanion, t]);

  // Mobile bottom tab items (max 5, last one is "More")
  const bottomTabs = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { label: t('nav.home'), path: '/', icon: <Sparkles size={22} /> },
        { label: t('auth.login'), path: '/auth', icon: <LogIn size={22} /> },
      ];
    }
    return [
      {
        label: hasCompanion ? t('nav.dashboard') : t('nav.plaza'),
        path: hasCompanion ? '/dashboard' : '/plaza',
        icon: <LayoutDashboard size={22} />,
      },
      { label: t('nav.chat'), path: '/chat', icon: <MessageCircle size={22} /> },
      { label: t('nav.memory'), path: '/memory', icon: <Calendar size={22} /> },
      { label: t('nav.drama'), path: '/drama', icon: <BookOpen size={22} /> },
      { label: t('nav.more'), path: '#more', icon: <MoreVertical size={22} /> },
    ];
  }, [isAuthenticated, hasCompanion, t]);

  // Items inside the "More" sheet
  const moreItems = useMemo(() => {
    if (!isAuthenticated) return [];
    return [
      { label: t('nav.achievement'), path: '/achievement', icon: <Trophy size={20} /> },
      { label: t('nav.payment'), path: '/payment', icon: <Zap size={20} /> },
      { label: t('nav.crowdfunding'), path: '/crowdfunding', icon: <Heart size={20} /> },
      { label: t('nav.settings'), path: '/settings', icon: <Settings size={20} /> },
    ];
  }, [isAuthenticated, t]);

  /** Handle logout */
  const handleLogout = async () => {
    try {
      await onLogout();
    } catch {
      // Error is already handled in AuthContext
    }
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (≥ md)
          ═══════════════════════════════════════════════════════════ */}
      <nav className="fixed left-0 top-0 h-screen w-[220px] sidebar-gradient shadow-sidebar z-50 hidden md:flex flex-col">
        {/* Brand Logo */}
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

        {/* Navigation Items */}
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

        {/* Bottom Section */}
        <div className="px-3 pb-4 flex flex-col gap-2">
          <div className="border-t border-sidebar-hover my-1" />

          {/* Dark Mode Toggle */}
          <button
            onClick={cycleTheme}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm
              text-sidebar-text hover:bg-sidebar-hover hover:text-pink-200
              transition-all duration-150 w-full"
          >
            <ThemeIcon theme={theme} size={18} className="text-sidebar-icon" />
            <span className="font-body">{useThemeLabel(theme, t)}</span>
          </button>

          {/* Language Selector */}
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
                <ChevronDown size={12} className="opacity-50" />
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

          {/* Auth Section */}
          <div className="border-t border-sidebar-hover pt-3 mt-1">
            {isAuthenticated && user ? (
              <div className="flex flex-col gap-2">
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

          {/* Copyright */}
          <div className="px-4 pt-2 pb-1">
            <a className="text-sidebar-text text-[10px] opacity-60" href="mailto:corolar@corolas.top">
              &copy; 2026 Corolas | Platonic
            </a>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════
          MOBILE BOTTOM TAB BAR (< md)
          ═══════════════════════════════════════════════════════════ */}
      {isAuthenticated && (
        <>
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-[12px] border-t border-pink-100 md:hidden pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-around h-16">
              {bottomTabs.map((item) => {
                const isActive = location.pathname === item.path;
                const isMore = item.path === '#more';

                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (isMore) {
                        setMoreOpen(true);
                      } else {
                        navigate(item.path);
                      }
                    }}
                    className={`
                      flex flex-col items-center justify-center gap-0.5 w-full h-full
                      transition-colors duration-150
                      ${isActive ? 'text-pink-500' : 'text-[#A093A5]'}
                    `}
                  >
                    <span>{item.icon}</span>
                    <span className="text-[10px] font-medium font-body">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile "More" Sheet */}
          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] md:hidden"
                onClick={() => setMoreOpen(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-xl border-t border-pink-100 pb-[env(safe-area-inset-bottom)]"
                >
                  {/* Drag indicator */}
                  <div className="w-full flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-pink-200" />
                  </div>

                  <div className="px-4 py-2">
                    <h3 className="text-xs font-semibold text-[#A093A5] uppercase tracking-wider mb-3 px-2">
                      {t('nav.more')}
                    </h3>

                    <div className="grid grid-cols-4 gap-2">
                      {moreItems.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMoreOpen(false);
                          }}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-pink-50 transition-colors active:scale-95"
                        >
                          <span className="text-pink-400">{item.icon}</span>
                          <span className="text-[11px] text-[#6B5B6E] font-medium text-center leading-tight">
                            {item.label}
                          </span>
                        </button>
                      ))}

                      {/* Logout */}
                      <button
                        onClick={() => {
                          handleLogout();
                          setMoreOpen(false);
                        }}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-red-50 transition-colors active:scale-95"
                      >
                        <LogOut size={20} className="text-red-400" />
                        <span className="text-[11px] text-red-500 font-medium text-center leading-tight">
                          {t('common.logout')}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="h-4" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Unauthenticated mobile: no bottom bar, keep clean landing */}
    </>
  );
}