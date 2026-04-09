import type { Locale } from '@/context/LocaleContext';

export function localeDateTimeString(locale: Locale, input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  return d.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR');
}
