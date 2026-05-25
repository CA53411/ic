/**
 * Theme utility for 3-state theme support: light / dark / auto
 */

export type Theme = 'light' | 'dark' | 'auto';

/**
 * Apply the given theme to the document.
 * - 'light': forces light mode
 * - 'dark': forces dark mode
 * - 'auto': follows system preference
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // auto: follow system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

/**
 * Get the effective theme (resolved 'auto' to actual light/dark)
 */
export function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Load saved theme from localStorage, default to 'auto'
 */
export function loadSavedTheme(): Theme {
  const stored = localStorage.getItem('theme') as Theme | null;
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored;
  }
  return 'auto';
}

/**
 * Listen for system theme changes when in auto mode.
 * Returns a cleanup function.
 */
export function listenToSystemThemeChanges(callback: (theme: 'light' | 'dark') => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
