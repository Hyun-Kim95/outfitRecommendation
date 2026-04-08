import { getSupabase } from '@/lib/supabase';
import type { OutfitWithRelations } from '@/lib/similarDays';
import type { Database } from '@/lib/database.types';

type FeedbackListRow = Pick<
  Database['public']['Tables']['feedback_logs']['Row'],
  'id' | 'overall_satisfaction' | 'improvement_tags'
>;

function single<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function fetchOutfitsWithRelations(userId: string): Promise<OutfitWithRelations[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('outfit_logs')
    .select(
      `
      *,
      weather_logs (*),
      context_logs (*),
      rating_logs (*),
      feedback_logs ( id, overall_satisfaction, improvement_tags )
    `
    )
    .eq('user_id', userId)
    .order('worn_on', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('fetchOutfitsWithRelations', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const base = { ...(r as object) } as Omit<
      OutfitWithRelations,
      'weather_logs' | 'context_logs' | 'rating_logs' | 'feedback_logs'
    >;
    const rawFb = r.feedback_logs;
    const feedback_logs = (Array.isArray(rawFb) ? rawFb : []) as FeedbackListRow[];
    return {
      ...base,
      weather_logs: single(r.weather_logs as never),
      context_logs: single(r.context_logs as never),
      rating_logs: single(r.rating_logs as never),
      feedback_logs,
    } as OutfitWithRelations;
  });
}
