import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Locale = 'ko' | 'en';

type Dict = Record<string, { ko: string; en: string }>;

const STORAGE_KEY = 'mobile-locale';

const DICT: Dict = {
  'stack.setup': { ko: '환경 설정 안내', en: 'Setup Guide' },
  'stack.outfit.new': { ko: '착장 기록', en: 'Outfit Log' },
  'stack.outfit.edit': { ko: '착장 수정', en: 'Edit Outfit' },
  'stack.outfit.detail': { ko: '착장 상세', en: 'Outfit Detail' },
  'stack.favorites': { ko: '즐겨찾기', en: 'Favorites' },
  'stack.terms': { ko: '이용약관', en: 'Terms of Service' },
  'stack.privacy': { ko: '개인정보 처리방침', en: 'Privacy Policy' },
  'stack.feeling': { ko: '감상 기록', en: 'Feedback Log' },
  'stack.similar': { ko: '비슷한 날', en: 'Similar Days' },
  'stack.insights': { ko: '통계·분석', en: 'Insights' },
  'stack.profile.edit': { ko: '프로필 수정', en: 'Edit Profile' },
  'stack.notices': { ko: '공지사항', en: 'Notices' },
  'stack.inquiry.detail': { ko: '문의 상세', en: 'Inquiry Detail' },
  'tab.home.title': { ko: '홈', en: 'Home' },
  'tab.home.label': { ko: '홈', en: 'Home' },
  'tab.history.title': { ko: '히스토리', en: 'History' },
  'tab.history.label': { ko: '기록', en: 'History' },
  'tab.settings.title': { ko: '설정', en: 'Settings' },
  'tab.settings.label': { ko: '설정', en: 'Settings' },
  'home.quickLog': { ko: '빠른 착장 기록', en: 'Quick Outfit Log' },
  'home.similarDays': { ko: '비슷한 날 보기', en: 'View Similar Days' },
  'settings.language': { ko: '언어', en: 'Language' },
  'settings.language.hint': {
    ko: '앱에서 표시되는 문구 언어를 선택할 수 있습니다.',
    en: 'Choose the language used in the app.',
  },
  'settings.language.ko': { ko: '한국어', en: 'Korean' },
  'settings.language.en': { ko: '영어', en: 'English' },
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko');

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!mounted) return;
      setLocaleState(saved === 'en' ? 'en' : 'ko');
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    void AsyncStorage.setItem(STORAGE_KEY, next);
  };

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
