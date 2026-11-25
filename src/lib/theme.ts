import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const KEY = 'planny:theme';
const EVENT = 'planny:theme';
const META_COLORS: Record<Theme, string> = { light: '#F4F0E8', dark: '#131211' };
const media = () => window.matchMedia('(prefers-color-scheme: dark)');

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/** The theme actually on screen: your explicit choice, otherwise the device setting. */
export function resolvedTheme(): Theme {
  return stored() ?? (media().matches ? 'dark' : 'light');
}

let transitionTimer: number | undefined;

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  window.clearTimeout(transitionTimer);
  transitionTimer = window.setTimeout(() => root.classList.remove('theme-transition'), 350);
  root.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode */
  }
  // Keep the browser/status bar color in sync with the forced theme.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.content = META_COLORS[theme];
  });
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(fn: () => void) {
  const mq = media();
  window.addEventListener(EVENT, fn);
  mq.addEventListener('change', fn);
  return () => {
    window.removeEventListener(EVENT, fn);
    mq.removeEventListener('change', fn);
  };
}

export function useTheme(): [Theme, () => void] {
  const theme = useSyncExternalStore(subscribe, resolvedTheme);
  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')];
}
