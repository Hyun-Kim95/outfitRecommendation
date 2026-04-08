import { sensitivityKo } from '@/lib/displayLabels';
import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();

  const q = useQuery({
    queryKey: ['admin-user', id],
    enabled: !!id,
    queryFn: async () => {
      const sb = getSupabase();
      const { data: profile, error: pe } = await sb
        .from('profiles')
        .select(
          'id, nickname, default_region, cold_sensitivity, heat_sensitivity, is_admin, account_disabled, onboarding_completed, created_at, default_transports'
        )
        .eq('id', id!)
        .maybeSingle();
      if (pe) throw pe;
      const { count: outfitCount, error: oe } = await sb
        .from('outfit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id!);
      if (oe) throw oe;
      return { profile, outfitCount: outfitCount ?? 0 };
    },
  });

  if (!id) return <p className="error">잘못된 경로입니다.</p>;
  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError || !q.data?.profile) return <p className="error">사용자를 찾을 수 없습니다.</p>;

  const { profile, outfitCount } = q.data;

  return (
    <div>
      <p className="muted small">
        <Link to="/users" className="linkish">
          ← 사용자 목록
        </Link>
      </p>
      <h1>{profile.nickname ?? '이름 없음'}</h1>
      <p className="muted mono small">{profile.id}</p>
      {profile.account_disabled ? (
        <p className="error" style={{ marginBottom: '1rem' }}>
          이 계정은 비활성 상태입니다. 앱에서는 로그인 후 즉시 세션이 종료됩니다.
        </p>
      ) : null}
      <div className="detail-actions" style={{ marginBottom: '1rem' }}>
        <Link to={`/users/${id}/edit`}>
          <button type="button" className="secondary">
            편집
          </button>
        </Link>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <tbody>
            <tr>
              <th>지역</th>
              <td>{profile.default_region ?? '—'}</td>
            </tr>
            <tr>
              <th>추위 민감도</th>
              <td>{sensitivityKo(profile.cold_sensitivity)}</td>
            </tr>
            <tr>
              <th>더위 민감도</th>
              <td>{sensitivityKo(profile.heat_sensitivity)}</td>
            </tr>
            <tr>
              <th>온보딩 완료</th>
              <td>{profile.onboarding_completed ? '예' : '아니오'}</td>
            </tr>
            <tr>
              <th>관리자</th>
              <td>{profile.is_admin ? <span className="badge">관리자</span> : '—'}</td>
            </tr>
            <tr>
              <th>계정 비활성</th>
              <td>
                {profile.account_disabled ? <span className="badge danger">비활성</span> : '정상'}
              </td>
            </tr>
            <tr>
              <th>이동 수단</th>
              <td>
                {Array.isArray(profile.default_transports) && profile.default_transports.length > 0
                  ? profile.default_transports.join(', ')
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>착장 기록 수</th>
              <td>{outfitCount}</td>
            </tr>
            <tr>
              <th>가입일</th>
              <td>{new Date(profile.created_at).toLocaleString('ko-KR')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
