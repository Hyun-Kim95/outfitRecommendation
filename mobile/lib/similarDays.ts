import type { Locale } from '@/contexts/LocaleContext';
import {
  averageFeedbackSatisfaction,
  effectiveOutfitSatisfaction,
  totalImprovementTagCount,
} from '@/lib/feedbackSatisfaction';
import { parseSimilaritySnapshot } from '@/lib/domain/similaritySnapshot';
import type { Database } from '@/lib/database.types';

type OutfitRow = Database['public']['Tables']['outfit_logs']['Row'];
type WeatherRow = Database['public']['Tables']['weather_logs']['Row'];
type ContextRow = Database['public']['Tables']['context_logs']['Row'];
type RatingRow = Database['public']['Tables']['rating_logs']['Row'];
type FeedbackListRow = Pick<
  Database['public']['Tables']['feedback_logs']['Row'],
  'id' | 'overall_satisfaction' | 'improvement_tags'
>;

export type OutfitWithRelations = OutfitRow & {
  weather_logs: WeatherRow | null;
  context_logs: ContextRow | null;
  rating_logs: RatingRow | null;
  feedback_logs: FeedbackListRow[];
};

export type SimilarSort = 'similarity' | 'rating' | 'recent';

export type TodayVector = {
  temperature_current: number;
  temperature_feels_like: number;
  humidity: number;
  wind_speed: number;
  precipMatch: boolean;
  situationTags: string[];
  activityLevel: string | null;
  indoorOutdoor: string | null;
};

function tagOverlap(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0.3;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  let hit = 0;
  for (const x of a) {
    if (setB.has(x.toLowerCase())) hit++;
  }
  return hit / Math.max(a.length, b.length);
}

function weatherSimilarity(o: OutfitWithRelations, t: TodayVector): number {
  const w = o.weather_logs;
  const snap = parseSimilaritySnapshot(o.similarity_snapshot);

  const cur = w?.temperature_current ?? snap?.temperature_current ?? null;
  const feels = w?.temperature_feels_like ?? snap?.temperature_feels_like ?? null;
  const hum = w?.humidity ?? snap?.humidity ?? null;
  const ws = w?.wind_speed ?? snap?.wind_speed ?? null;
  const pProb = w?.precipitation_probability ?? snap?.precipitation_probability ?? null;

  if (cur == null || feels == null || hum == null || ws == null || pProb == null) {
    return snap || w ? 0.42 : 0.35;
  }

  const dt = Math.abs(cur - t.temperature_current);
  const df = Math.abs(feels - t.temperature_feels_like);
  const dh = Math.abs(hum - t.humidity) / 100;
  const dws = Math.abs(ws - t.wind_speed) / 20;

  const tempScore = Math.max(0, 1 - (dt * 0.04 + df * 0.04));
  const humidScore = Math.max(0, 1 - dh);
  const windScore = Math.max(0, 1 - dws);
  const rainMatch = pProb > 30 === t.precipMatch ? 1 : 0.6;

  return tempScore * 0.35 + humidScore * 0.15 + windScore * 0.15 + rainMatch * 0.15;
}

function contextSimilarity(o: OutfitWithRelations, t: TodayVector): number {
  const ctx = o.context_logs;
  const snap = parseSimilaritySnapshot(o.similarity_snapshot);
  const tagsFromCtx = Array.isArray(ctx?.situation_tags) ? (ctx.situation_tags as string[]) : [];
  const tags = tagsFromCtx.length > 0 ? tagsFromCtx : (snap?.situation_tags ?? []);
  if (!ctx && !snap) return 0.4;

  const tagS = tagOverlap(t.situationTags, tags);
  const actLevel = ctx?.activity_level ?? snap?.activity_level ?? null;
  const ioRatio = ctx?.indoor_outdoor_ratio ?? snap?.indoor_outdoor ?? null;
  const act =
    !t.activityLevel || !actLevel ? 0.5 : t.activityLevel === actLevel ? 1 : 0.4;
  const io =
    !t.indoorOutdoor || !ioRatio ? 0.5 : t.indoorOutdoor === ioRatio ? 1 : 0.4;
  return tagS * 0.5 + act * 0.25 + io * 0.25;
}

/** PRD 9.1 유사도 가중 합 (0~1 근사) */
export function similarityScore(o: OutfitWithRelations, t: TodayVector): number {
  const w = weatherSimilarity(o, t);
  const c = contextSimilarity(o, t);
  return w * 0.65 + c * 0.35;
}

export function scoreRecommendation(
  o: OutfitWithRelations,
  t: TodayVector,
  locale: Locale = 'ko'
): { score: number; similarity: number; warning: boolean; reason: string } {
  const sim = similarityScore(o, t);
  const r = o.rating_logs;
  const fb = o.feedback_logs ?? [];
  const fbAvg = averageFeedbackSatisfaction(fb);
  const eff = effectiveOutfitSatisfaction(fb, r?.overall_rating ?? null);
  const overallNorm = (eff ?? 3) / 5;
  const impFeedback = totalImprovementTagCount(fb);
  const impLegacy = Array.isArray(r?.improvement_tags) ? (r.improvement_tags as string[]).length : 0;
  const improvements = impFeedback + impLegacy;
  const impPenalty = Math.min(0.25, improvements * 0.05);
  const lowSat = (eff ?? 3) <= 2 ? 0.2 : 0;

  let score = sim * 0.55 + overallNorm * 0.45 - impPenalty - lowSat;
  const warning = (eff ?? 5) <= 2 || improvements >= 3;

  const avgLabel =
    locale === 'en'
      ? fbAvg != null
        ? `${fbAvg}/5 (feedback avg)`
        : r?.overall_rating != null
          ? `${r.overall_rating}/5 (legacy)`
          : 'Not entered'
      : fbAvg != null
        ? `${fbAvg}(감상 평균)`
        : r?.overall_rating != null
          ? `${r.overall_rating}(레거시)`
          : '미입력';
  const reason =
    locale === 'en'
      ? `Similar weather & context — satisfaction ${avgLabel}`
      : `유사 날씨·상황에서 만족도 ${avgLabel}점 기록`;

  return { score, similarity: sim, warning, reason };
}

export function sortOutfits(
  items: OutfitWithRelations[],
  t: TodayVector,
  sort: SimilarSort,
  locale: Locale = 'ko'
): { item: OutfitWithRelations; similarity: number; score: number; warning: boolean }[] {
  const enriched = items.map((item) => {
    const { score, similarity, warning } = scoreRecommendation(item, t, locale);
    return { item, similarity, score, warning };
  });

  if (sort === 'rating') {
    enriched.sort((a, b) => {
      const sa =
        effectiveOutfitSatisfaction(a.item.feedback_logs, a.item.rating_logs?.overall_rating ?? null) ??
        0;
      const sb =
        effectiveOutfitSatisfaction(b.item.feedback_logs, b.item.rating_logs?.overall_rating ?? null) ??
        0;
      return sb - sa;
    });
  } else if (sort === 'recent') {
    enriched.sort(
      (a, b) => new Date(b.item.worn_on).getTime() - new Date(a.item.worn_on).getTime()
    );
  } else {
    enriched.sort((a, b) => b.score - a.score);
  }

  return enriched;
}
