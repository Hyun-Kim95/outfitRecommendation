import { darkColors, lightColors, type ThemeColors } from '@/lib/theme-colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

const STORAGE_KEY = 'mobile-theme-preference';

/** 저장 없음 → OS 설정 자동 반영 */
export type ThemePreference = 'light' | 'dark' | null;

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (p: 'light' | 'dark') => void;
  resolvedScheme: 'light' | 'dark';
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPrefState] = useState<ThemePreference>(null);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw === 'system') {
        void AsyncStorage.removeItem(STORAGE_KEY);
        setPrefState(null);
        return;
      }
      if (raw === 'light' || raw === 'dark') setPrefState(raw);
      else setPrefState(null);
    });
  }, []);

  const resolvedScheme = useMemo((): 'light' | 'dark' => {
    if (preference === 'light') return 'light';
    if (preference === 'dark') return 'dark';
    return systemScheme === 'dark' ? 'dark' : 'light';
  }, [preference, systemScheme]);

  const colors = resolvedScheme === 'dark' ? darkColors : lightColors;

  const setPreference = useCallback((p: 'light' | 'dark') => {
    setPrefState(p);
    void AsyncStorage.setItem(STORAGE_KEY, p);
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference, resolvedScheme, colors }),
    [preference, setPreference, resolvedScheme, colors]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
