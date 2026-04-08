import { DashboardCharts } from '@/components/DashboardCharts';
import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function DashboardPage() {
  const stats = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const sb = getSupabase();
      const [
        profiles,
        outfits,
        weather,
        openTickets,
        feedbacks,
        recommendations,
        outfitsWithSnapshot,
      ] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }),
        sb.from('outfit_logs').select('*', { count: 'exact', head: true }),
        sb.from('weather_logs').select('*', { count: 'exact', head: true }),
        sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        sb.from('feedback_logs').select('*', { count: 'exact', head: true }),
        sb.from('recommendation_logs').select('*', { count: 'exact', head: true }),
        sb
          .from('outfit_logs')
          .select('*', { count: 'exact', head: true })
          .not('similarity_snapshot', 'is', null),
      ]);
      if (profiles.error) throw profiles.error;
      if (outfits.error) throw outfits.error;
      if (weather.error) throw weather.error;
      if (openTickets.error) throw openTickets.error;
      if (feedbacks.error) throw feedbacks.error;
      if (recommendations.error) throw recommendations.error;
      if (outfitsWithSnapshot.error) throw outfitsWithSnapshot.error;
      return {
        users: profiles.count ?? 0,
        outfits: outfits.count ?? 0,
        weatherSnapshots: weather.count ?? 0,
        openTickets: openTickets.count ?? 0,
        feedbackEntries: feedbacks.count ?? 0,
        recommendationLogs: recommendations.count ?? 0,
        outfitsWithSimilaritySnapshot: outfitsWithSnapshot.count ?? 0,
      };
    },
  });

  if (stats.isLoading) return <p className="muted">불러오는 중…</p>;
  if (stats.isError) return <p className="error">지표를 불러오지 못했습니다.</p>;

  const d = stats.data!;

  return (
    <div>
      <h1>대시보드</h1>
      <p className="muted">KPI (Supabase RLS + 관리자 세션) · 감상·추천 로그는 모바일 앱 흐름과 연동됩니다.</p>
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
        <div className="kpi">
          <span className="kpi-label">감상(회고) 항목</span>
          <span className="kpi-value">{d.feedbackEntries}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">추천 로그</span>
          <span className="kpi-value">{d.recommendationLogs}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">유사일 스냅샷 있는 착장</span>
          <span className="kpi-value">{d.outfitsWithSimilaritySnapshot}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">미완료 문의</span>
          <span className="kpi-value">{d.openTickets}</span>
        </div>
      </div>

      <DashboardCharts stats={d} />
    </div>
  );
}
