import { getSupabase } from '@/lib/supabase';

/** 오늘 날씨 스냅샷과 추천 착장 ID 목록을 `recommendation_logs`에 반영 (날씨↔추천 추적) */
export async function upsertTodayRecommendationLog(input: {
  userId: string;
  logDate: string;
  weatherLogId: string | null;
  recommendedOutfitLogIds: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: 'no supabase' };

  const { data: existing, error: selErr } = await sb
    .from('recommendation_logs')
    .select('id')
    .eq('user_id', input.userId)
    .eq('log_date', input.logDate)
    .maybeSingle();

  if (selErr) return { ok: false, error: selErr.message };

  const payload = {
    weather_log_id: input.weatherLogId,
    recommended_outfit_log_ids: input.recommendedOutfitLogIds,
  };

  if (existing?.id) {
    const { error } = await sb.from('recommendation_logs').update(payload).eq('id', existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await sb.from('recommendation_logs').insert({
    user_id: input.userId,
    log_date: input.logDate,
    ...payload,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
