import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const sb = getSupabase();
      const [profiles, outfits, weather] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }),
        sb.from('outfit_logs').select('*', { count: 'exact', head: true }),
        sb.from('weather_logs').select('*', { count: 'exact', head: true }),
      ]);
      if (profiles.error) throw profiles.error;
      if (outfits.error) throw outfits.error;
      if (weather.error) throw weather.error;
      return {
        users: profiles.count ?? 0,
        outfits: outfits.count ?? 0,
        weatherSnapshots: weather.count ?? 0,
      };
    },
  });

  if (stats.isLoading) return <p className="muted">불러오는 중…</p>;
  if (stats.isError) return <p className="error">지표를 불러오지 못했습니다.</p>;

  const d = stats.data!;

  return (
    <div>
      <h1>대시보드</h1>
      <p className="muted">읽기 전용 KPI (Supabase RLS + 관리자 세션)</p>
      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">가입자(프로필)</span>
          <span className="kpi-value">{d.users}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">착장 기록</span>
          <span className="kpi-value">{d.outfits}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">날씨 스냅샷</span>
          <span className="kpi-value">{d.weatherSnapshots}</span>
        </div>
      </div>
    </div>
  );
}
