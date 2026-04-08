import { effectiveOutfitSatisfaction } from '@/lib/feedbackSatisfaction';
import type { OutfitWithRelations } from '@/lib/similarDays';

export type InsightSummary = {
  outfitCount: number;
  distinctDays: number;
  feedbackEntryCount: number;
  outfitsWithAnyFeedback: number;
  avgSatisfaction: number | null;
  /** 상황 태그 빈도 (상위 5) */
  topSituationTags: { tag: string; count: number }[];
};

function situationTagCounts(outfits: OutfitWithRelations[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of outfits) {
    const raw = o.context_logs?.situation_tags;
    const tags = Array.isArray(raw) ? (raw as string[]) : [];
    for (const t of tags) {
      if (typeof t !== 'string' || !t.trim()) continue;
      m.set(t, (m.get(t) ?? 0) + 1);
    }
  }
  return m;
}

export function computeInsightSummary(outfits: OutfitWithRelations[]): InsightSummary {
  const days = new Set(outfits.map((o) => o.worn_on));
  let feedbackEntryCount = 0;
  let satSum = 0;
  let satN = 0;
  let outfitsWithAnyFeedback = 0;

  for (const o of outfits) {
    const fb = o.feedback_logs ?? [];
    if (fb.length > 0) outfitsWithAnyFeedback++;
    feedbackEntryCount += fb.length;
    const eff = effectiveOutfitSatisfaction(fb, o.rating_logs?.overall_rating ?? null);
    if (eff != null) {
      satSum += eff;
      satN++;
    }
  }

  const tagMap = situationTagCounts(outfits);
  const topSituationTags = [...tagMap.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    outfitCount: outfits.length,
    distinctDays: days.size,
    feedbackEntryCount,
    outfitsWithAnyFeedback,
    avgSatisfaction: satN > 0 ? Math.round((satSum / satN) * 10) / 10 : null,
    topSituationTags,
  };
}
