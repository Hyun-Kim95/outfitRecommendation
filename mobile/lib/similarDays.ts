import type { Database } from '@/lib/database.types';

type OutfitRow = Database['public']['Tables']['outfit_logs']['Row'];
type WeatherRow = Database['public']['Tables']['weather_logs']['Row'];
type ContextRow = Database['public']['Tables']['context_logs']['Row'];
type RatingRow = Database['public']['Tables']['rating_logs']['Row'];

export type OutfitWithRelations = OutfitRow & {
  weather_logs: WeatherRow | null;
  context_logs: ContextRow | null;
  rating_logs: RatingRow | null;
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
  if (!w) return 0.35;

  const dt = Math.abs((w.temperature_current ?? t.temperature_current) - t.temperature_current);
  const df = Math.abs(
    (w.temperature_feels_like ?? t.temperature_feels_like) - t.temperature_feels_like
  );
  const dh = Math.abs((w.humidity ?? t.humidity) - t.humidity) / 100;
  const dws = Math.abs((w.wind_speed ?? t.wind_speed) - t.wind_speed) / 20;

  const tempScore = Math.max(0, 1 - (dt * 0.04 + df * 0.04));
  const humidScore = Math.max(0, 1 - dh);
  const windScore = Math.max(0, 1 - dws);
  const rainMatch =
    (w.precipitation_probability ?? 0) > 30 === t.precipMatch ? 1 : 0.6;

  return tempScore * 0.35 + humidScore * 0.15 + windScore * 0.15 + rainMatch * 0.15;
}

function contextSimilarity(ctx: ContextRow | null, t: TodayVector): number {
  if (!ctx) return 0.4;
  const tags = Array.isArray(ctx.situation_tags)
    ? (ctx.situation_tags as string[])
    : [];
  const tagS = tagOverlap(t.situationTags, tags);
  const act =
    !t.activityLevel || !ctx.activity_level
      ? 0.5
      : t.activityLevel === ctx.activity_level
        ? 1
        : 0.4;
  const io =
    !t.indoorOutdoor || !ctx.indoor_outdoor_ratio
      ? 0.5
      : t.indoorOutdoor === ctx.indoor_outdoor_ratio
        ? 1
        : 0.4;
  return tagS * 0.5 + act * 0.25 + io * 0.25;
}

/** PRD 9.1 유사도 가중 합 (0~1 근사) */
export function similarityScore(o: OutfitWithRelations, t: TodayVector): number {
  const w = weatherSimilarity(o, t);
  const c = contextSimilarity(o.context_logs, t);
  return w * 0.65 + c * 0.35;
}

export function scoreRecommendation(
  o: OutfitWithRelations,
  t: TodayVector
): { score: number; similarity: number; warning: boolean; reason: string } {
  const sim = similarityScore(o, t);
  const r = o.rating_logs;
  const overall = (r?.overall_rating ?? 3) / 5;
  const wearAgain = r?.would_wear_again === false ? 0 : r?.would_wear_again === true ? 1 : 0.5;
  const improvements = Array.isArray(r?.improvement_tags)
    ? (r.improvement_tags as string[]).length
    : 0;
  const impPenalty = Math.min(0.25, improvements * 0.05);
  const lowSat = (r?.overall_rating ?? 3) <= 2 ? 0.2 : 0;

  let score = sim * 0.55 + overall * 0.3 + wearAgain * 0.15 - impPenalty - lowSat;
  const warning =
    (r?.overall_rating ?? 5) <= 2 || improvements >= 3 || r?.would_wear_again === false;

  const reason = `유사 날씨·상황에서 만족도 ${r?.overall_rating ?? '미입력'}점 기록`;

  return { score, similarity: sim, warning, reason };
}

export function sortOutfits(
  items: OutfitWithRelations[],
  t: TodayVector,
  sort: SimilarSort
): { item: OutfitWithRelations; similarity: number; score: number; warning: boolean }[] {
  const enriched = items.map((item) => {
    const { score, similarity, warning } = scoreRecommendation(item, t);
    return { item, similarity, score, warning };
  });

  if (sort === 'rating') {
    enriched.sort(
      (a, b) =>
        (b.item.rating_logs?.overall_rating ?? 0) - (a.item.rating_logs?.overall_rating ?? 0)
    );
  } else if (sort === 'recent') {
    enriched.sort(
      (a, b) => new Date(b.item.worn_on).getTime() - new Date(a.item.worn_on).getTime()
    );
  } else {
    enriched.sort((a, b) => b.score - a.score);
  }

  return enriched;
}
