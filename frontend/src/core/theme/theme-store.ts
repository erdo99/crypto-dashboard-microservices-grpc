import { createContext } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
};

export const THEME_STORAGE_KEY = 'crypto-dashboard-theme-mode';

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'dark';
}

export function applyThemeClass(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.remove('theme-light', 'theme-dark');

  if (mode === 'light') {
    root.classList.add('theme-light');
    root.style.colorScheme = 'light';
    return;
  }
  if (mode === 'dark') {
    root.classList.add('theme-dark');
    root.style.colorScheme = 'dark';
    return;
  }

  root.style.colorScheme = '';
}
