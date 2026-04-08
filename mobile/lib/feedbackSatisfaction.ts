import type { Database } from '@/lib/database.types';

type FeedbackMini = Pick<
  Database['public']['Tables']['feedback_logs']['Row'],
  'overall_satisfaction' | 'improvement_tags'
>;

/** 감상별 overall_satisfaction 평균 (1~5), 없으면 null */
export function averageFeedbackSatisfaction(
  rows: { overall_satisfaction: number | null }[] | null | undefined
): number | null {
  if (!rows?.length) return null;
  const nums = rows
    .map((r) => r.overall_satisfaction)
    .filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 5);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** 감상 평균 우선, 없으면 레거시 rating_logs.overall_rating */
export function effectiveOutfitSatisfaction(
  feedbackRows: { overall_satisfaction: number | null }[] | null | undefined,
  legacyOverall: number | null | undefined
): number | null {
  const avg = averageFeedbackSatisfaction(feedbackRows ?? []);
  if (avg != null) return avg;
  if (legacyOverall != null && legacyOverall >= 1 && legacyOverall <= 5) return legacyOverall;
  return null;
}

export function totalImprovementTagCount(feedbacks: FeedbackMini[] | null | undefined): number {
  if (!feedbacks?.length) return 0;
  let n = 0;
  for (const f of feedbacks) {
    const t = f.improvement_tags;
    if (Array.isArray(t)) n += t.filter((x): x is string => typeof x === 'string').length;
  }
  return n;
}
