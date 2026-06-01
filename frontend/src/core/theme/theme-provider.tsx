import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  applyThemeClass,
  getInitialMode,
  ThemeContext,
  type ThemeContextValue,
  THEME_STORAGE_KEY,
} from '@/core/theme/theme-store';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    applyThemeClass(mode);
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode,
      cycleMode: () => {
        setMode((prev) => {
          if (prev === 'system') return 'light';
          if (prev === 'light') return 'dark';
          return 'system';
        });
      },
    }),
    [mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
