import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

type Row = {
  id: string;
  user_id: string;
  worn_on: string;
  top_category: string | null;
  bottom_category: string | null;
  outer_category: string | null;
  created_at: string;
  rating_logs: { overall_rating: number | null } | null;
};

export function OutfitsPage() {
  const q = useQuery({
    queryKey: ['admin-outfits'],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('outfit_logs')
        .select('id, user_id, worn_on, top_category, bottom_category, outer_category, created_at, rating_logs(overall_rating)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []).map((r) => {
        const x = r as Record<string, unknown>;
        const rl = x.rating_logs;
        const rating = Array.isArray(rl) ? rl[0] : rl;
        return {
          ...r,
          rating_logs: rating as { overall_rating: number | null } | null,
        } as Row;
      });
    },
  });

  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError) return <p className="error">목록을 불러오지 못했습니다.</p>;

  return (
    <div>
      <h1>착장 기록</h1>
      <p className="muted">최근 100건</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>착용일</th>
              <th>요약</th>
              <th>만족도</th>
              <th>user_id</th>
            </tr>
          </thead>
          <tbody>
            {q.data!.map((r) => (
              <tr key={r.id}>
                <td>{r.worn_on}</td>
                <td>
                  {[r.top_category, r.bottom_category, r.outer_category].filter(Boolean).join(' · ') ||
                    '—'}
                </td>
                <td>{r.rating_logs?.overall_rating ?? '—'}</td>
                <td className="mono small">{r.user_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
