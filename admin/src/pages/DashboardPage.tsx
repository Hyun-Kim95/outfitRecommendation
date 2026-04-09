import { DashboardCharts } from '@/components/DashboardCharts';
import { useLocale } from '@/context/LocaleContext';
import { SIGNUP_CHART_DAYS, buildSignupDailySeries } from '@/lib/dashboardSignupSeries';
import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

export function DashboardPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const stats = useQuery({
    queryKey: ['admin-stats', locale],
    queryFn: async () => {
      const sb = getSupabase();
      const signupSince = new Date();
      signupSince.setHours(0, 0, 0, 0);
      signupSince.setDate(signupSince.getDate() - (SIGNUP_CHART_DAYS - 1));
      const signupSinceIso = signupSince.toISOString();

      const [
        profiles,
        onboardingDone,
        signupRowsRes,
        outfits,
        weather,
        ticOpen,
        ticProgress,
        ticAnswered,
        ticClosed,
        feedbacks,
        recommendations,
        outfitsWithSnapshot,
      ] = await Promise.all([
        sb.from('profiles').select('*', { count: 'exact', head: true }),
        sb.from('profiles').select('*', { count: 'exact', head: true }).eq('onboarding_completed', true),
        sb.from('profiles').select('created_at').gte('created_at', signupSinceIso),
        sb.from('outfit_logs').select('*', { count: 'exact', head: true }),
        sb.from('weather_logs').select('*', { count: 'exact', head: true }),
        sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'answered'),
        sb.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'closed'),
        sb.from('feedback_logs').select('*', { count: 'exact', head: true }),
        sb.from('recommendation_logs').select('*', { count: 'exact', head: true }),
        sb
          .from('outfit_logs')
          .select('*', { count: 'exact', head: true })
          .not('similarity_snapshot', 'is', null),
      ]);
      if (profiles.error) throw profiles.error;
      if (onboardingDone.error) throw onboardingDone.error;
      if (signupRowsRes.error) throw signupRowsRes.error;
      if (outfits.error) throw outfits.error;
      if (weather.error) throw weather.error;
      if (ticOpen.error) throw ticOpen.error;
      if (ticProgress.error) throw ticProgress.error;
      if (ticAnswered.error) throw ticAnswered.error;
      if (ticClosed.error) throw ticClosed.error;
      if (feedbacks.error) throw feedbacks.error;
      if (recommendations.error) throw recommendations.error;
      if (outfitsWithSnapshot.error) throw outfitsWithSnapshot.error;
      const openCount = ticOpen.count ?? 0;
      const totalUsers = profiles.count ?? 0;
      const completedOnboarding = onboardingDone.count ?? 0;
      const signupSeries = buildSignupDailySeries(
        (signupRowsRes.data ?? []) as { created_at: string }[],
        locale,
        SIGNUP_CHART_DAYS
      );
      return {
        users: totalUsers,
        signupDailyLabels: signupSeries.labels,
        signupDailyCounts: signupSeries.counts,
        onboardingCompleted: completedOnboarding,
        onboardingIncomplete: Math.max(0, totalUsers - completedOnboarding),
        outfits: outfits.count ?? 0,
        weatherSnapshots: weather.count ?? 0,
        openTickets: openCount,
        feedbackEntries: feedbacks.count ?? 0,
        recommendationLogs: recommendations.count ?? 0,
        outfitsWithSimilaritySnapshot: outfitsWithSnapshot.count ?? 0,
        inquiryByStatus: {
          open: openCount,
          in_progress: ticProgress.count ?? 0,
          answered: ticAnswered.count ?? 0,
          closed: ticClosed.count ?? 0,
        },
      };
    },
  });

  if (stats.isLoading) return <p className="muted">{isEn ? 'Loading…' : '불러오는 중…'}</p>;
  if (stats.isError) return <p className="error">{isEn ? 'Failed to load metrics.' : '지표를 불러오지 못했습니다.'}</p>;

  const d = stats.data!;

  return (
    <div>
      <h1>{isEn ? 'Dashboard' : '대시보드'}</h1>
      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-label">{isEn ? 'Users (profiles)' : '가입자(프로필)'}</span>
          <span className="kpi-value">{d.users}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{isEn ? 'Outfit logs' : '착장 기록'}</span>
          <span className="kpi-value">{d.outfits}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{isEn ? 'Weather snapshots' : '날씨 스냅샷'}</span>
          <span className="kpi-value">{d.weatherSnapshots}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{isEn ? 'Feedback entries' : '감상(회고) 항목'}</span>
          <span className="kpi-value">{d.feedbackEntries}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{isEn ? 'Recommendation logs' : '추천 로그'}</span>
          <span className="kpi-value">{d.recommendationLogs}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{isEn ? 'Outfits with similarity snapshot' : '유사일 스냅샷 있는 착장'}</span>
          <span className="kpi-value">{d.outfitsWithSimilaritySnapshot}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">{isEn ? 'Open inquiries' : '미완료 문의'}</span>
          <span className="kpi-value">{d.openTickets}</span>
        </div>
      </div>

      <DashboardCharts stats={d} locale={locale} />
    </div>
  );
}
