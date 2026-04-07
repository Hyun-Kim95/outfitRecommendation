import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

type Row = {
  id: string;
  nickname: string | null;
  default_region: string | null;
  is_admin: boolean;
  created_at: string;
};

export function UsersPage() {
  const q = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('profiles')
        .select('id, nickname, default_region, is_admin, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError) return <p className="error">목록을 불러오지 못했습니다.</p>;

  return (
    <div>
      <h1>사용자</h1>
      <p className="muted">최대 500명 (최신순)</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>닉네임</th>
              <th>지역</th>
              <th>관리자</th>
              <th>가입일</th>
              <th>id</th>
            </tr>
          </thead>
          <tbody>
            {q.data!.map((r) => (
              <tr key={r.id}>
                <td>{r.nickname ?? '—'}</td>
                <td>{r.default_region ?? '—'}</td>
                <td>{r.is_admin ? <span className="badge">admin</span> : '—'}</td>
                <td>{new Date(r.created_at).toLocaleString('ko-KR')}</td>
                <td className="mono small">{r.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
