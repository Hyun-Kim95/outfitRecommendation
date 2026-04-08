import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anon);

/** 호출마다 createClient() 하면 인증·리프레시 타이머·연결이 중복되어 CPU/메모리 폭주 → 싱글톤 */
let singleton: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !anon) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 설정하세요.');
  }
  if (!singleton) {
    singleton = createClient(url, anon);
  }
  return singleton;
}
