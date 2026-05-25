/**
 * ThemeContext.tsx — Unified 3-state theme management
 * light / dark / auto, persisted to localStorage
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { applyTheme, loadSavedTheme, getEffectiveTheme, listenToSystemThemeChanges } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

const ThemeContext = createContext<{
  theme: Theme;
  effectiveTheme: 'light' | 'dark';
  setTheme: (t: Theme) => void;
  cycleTheme: () => void;
}>({
  theme: 'auto',
  effectiveTheme: 'light',
  setTheme: () => {},
  cycleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => loadSavedTheme());

  const effectiveTheme = getEffectiveTheme(theme);
  const isDark = effectiveTheme === 'dark';

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme !== 'auto') return;
    return listenToSystemThemeChanges(() => applyTheme('auto'));
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  }, []);

  const cycleTheme = useCallback(() => {
    const cycle: Theme[] = ['light', 'dark', 'auto'];
    const next = cycle[(cycle.indexOf(theme) + 1) % cycle.length];
    setTheme(next);
  }, [theme, setTheme]);

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue && ['light', 'dark', 'auto'].includes(e.newValue)) {
        setThemeState(e.newValue as Theme);
        applyTheme(e.newValue as Theme);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeContext = () => useContext(ThemeContext);
