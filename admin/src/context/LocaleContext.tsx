import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'ko' | 'en';

const STORAGE_KEY = 'admin-locale';

const DICT: Record<string, { ko: string; en: string }> = {
  'layout.brand': { ko: '착장 앱 · 관리', en: 'Outfit App · Admin' },
  'layout.nav.dashboard': { ko: '대시보드', en: 'Dashboard' },
  'layout.nav.users': { ko: '사용자', en: 'Users' },
  'layout.nav.outfits': { ko: '착장 기록', en: 'Outfits' },
  'layout.nav.inquiries': { ko: '문의', en: 'Inquiries' },
  'layout.nav.notices': { ko: '공지', en: 'Notices' },
  'layout.theme': { ko: '테마', en: 'Theme' },
  'layout.theme.light': { ko: '라이트', en: 'Light' },
  'layout.theme.dark': { ko: '다크', en: 'Dark' },
  'layout.language': { ko: '언어', en: 'Language' },
  'layout.language.ko': { ko: '한국어', en: 'Korean' },
  'layout.language.en': { ko: '영어', en: 'English' },
  'layout.logout': { ko: '로그아웃', en: 'Logout' },
};

function readInitialLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' ? 'en' : 'ko';
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'ko';
  }, [locale]);

  const t = (key: string) => {
    const row = DICT[key];
    if (!row) return key;
    return row[locale];
  };

  const value = useMemo(() => ({ locale, setLocale, t }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
