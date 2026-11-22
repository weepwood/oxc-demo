import { useEffect, useState } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'oxc-demo-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

function readSavedTheme(): ThemeMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return isThemeMode(saved) ? saved : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(mode: ThemeMode, systemIsDark: boolean): void {
  const resolved = mode === 'system' ? (systemIsDark ? 'dark' : 'light') : mode;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    resolved === 'dark' ? '#151816' : '#f7f8f6',
  );
}

export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(readSavedTheme);

  useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const update = () => applyTheme(mode, media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mode]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setMode(readSavedTheme());
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const changeMode = (next: ThemeMode) => {
    setMode(next);
    try {
      if (next === 'system') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // The UI still follows the selected mode when storage is unavailable.
    }
  };

  return { mode, changeMode };
}
