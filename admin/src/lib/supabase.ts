import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anon);

export function getSupabase() {
  if (!url || !anon) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를 설정하세요.');
  }
  return createClient(url, anon);
}
