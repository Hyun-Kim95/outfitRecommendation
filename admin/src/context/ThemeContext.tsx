import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/** 저장된 선택이 없으면 OS 설정을 따름 */
export type ThemePreference = 'light' | 'dark' | null;

const STORAGE_KEY = 'admin-theme';

function readInitialExplicit(): ThemePreference {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s === 'system') {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  if (s === 'light' || s === 'dark') return s;
  return null;
}

function systemIsDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkClass(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

type Ctx = {
  /** null이면 OS(시스템) 테마 자동 반영 */
  preference: ThemePreference;
  /** 라이트/다크만 저장. 첫 방문은 저장 없음 → 시스템 */
  setPreference: (p: 'light' | 'dark') => void;
  resolvedDark: boolean;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readInitialExplicit);
  const [systemDark, setSystemDark] = useState(systemIsDark);

  useEffect(() => {
    if (preference !== null) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const resolvedDark = useMemo(() => {
    if (preference === 'dark') return true;
    if (preference === 'light') return false;
    return systemDark;
  }, [preference, systemDark]);

  useEffect(() => {
    applyDarkClass(resolvedDark);
  }, [resolvedDark]);

  const setPreference = useCallback((p: 'light' | 'dark') => {
    localStorage.setItem(STORAGE_KEY, p);
    setPreferenceState(p);
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, resolvedDark }),
    [preference, setPreference, resolvedDark]
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error('useTheme must be used within ThemeProvider');
  return c;
}
