import type { Locale } from '@/context/LocaleContext';

export const SIGNUP_CHART_DAYS = 30;

/** 로컬 자정 기준 최근 `days`일, 일별 가입 건수·축 라벨 */
export function buildSignupDailySeries(
  rows: { created_at: string }[],
  locale: Locale,
  days: number = SIGNUP_CHART_DAYS
): { labels: string[]; counts: number[] } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const startMs = start.getTime();
  const dayMs = 86_400_000;
  const counts = new Array(days).fill(0);
  const labels: string[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(startMs + i * dayMs);
    labels.push(
      d.toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
        month: 'short',
        day: 'numeric',
      })
    );
  }

  for (const row of rows) {
    const t = new Date(row.created_at).getTime();
    const idx = Math.floor((t - startMs) / dayMs);
    if (idx >= 0 && idx < days) {
      counts[idx]++;
    }
  }

  return { labels, counts };
}
