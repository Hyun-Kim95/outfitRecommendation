import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { Locale } from '@/context/LocaleContext';
import { useTheme } from '@/context/ThemeContext';
import { SIGNUP_CHART_DAYS } from '@/lib/dashboardSignupSeries';
import { useAdminChartPalette } from '@/lib/chartTheme';
import { ticketStatusLabel } from '@/lib/displayLabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const INQUIRY_STATUS_ORDER = ['open', 'in_progress', 'answered', 'closed'] as const;

export type DashboardStats = {
  users: number;
  signupDailyLabels: string[];
  signupDailyCounts: number[];
  onboardingCompleted: number;
  onboardingIncomplete: number;
  outfits: number;
  weatherSnapshots: number;
  openTickets: number;
  feedbackEntries: number;
  recommendationLogs: number;
  outfitsWithSimilaritySnapshot: number;
  inquiryByStatus: Record<(typeof INQUIRY_STATUS_ORDER)[number], number>;
};

type Props = {
  stats: DashboardStats;
  locale: Locale;
};

export function DashboardCharts({ stats, locale }: Props) {
  const isEn = locale === 'en';
  const { resolvedDark } = useTheme();
  const palette = useAdminChartPalette();

  const tooltipPlugin = {
    tooltip: {
      backgroundColor: resolvedDark ? 'rgba(28, 28, 30, 0.94)' : 'rgba(255, 255, 255, 0.97)',
      titleColor: palette.tickColor,
      bodyColor: palette.tickColor,
      borderColor: palette.doughnutBorder,
      borderWidth: 1,
      padding: 10,
    },
  };

  const barLabels = isEn
    ? [
        'Users',
        'Outfit logs',
        'Weather snapshots',
        'Feedback entries',
        'Recommendation logs',
        'Outfits w/ similarity snapshot',
        'Open inquiries',
      ]
    : ['가입자', '착장 기록', '날씨 스냅샷', '감상 항목', '추천 로그', '유사일 스냅샷 착장', '미완료 문의'];
  const barData = [
    stats.users,
    stats.outfits,
    stats.weatherSnapshots,
    stats.feedbackEntries,
    stats.recommendationLogs,
    stats.outfitsWithSimilaritySnapshot,
    stats.openTickets,
  ];

  const doughnutLabels = isEn
    ? ['Outfits', 'Feedback', 'Weather snapshots', 'Users']
    : ['착장', '감상', '날씨 스냅샷', '가입자'];
  const doughnutData = [stats.outfits, stats.feedbackEntries, stats.weatherSnapshots, stats.users];

  const inquiryStatusLabels = INQUIRY_STATUS_ORDER.map((s) => ticketStatusLabel(s, locale));
  const inquiryStatusData = INQUIRY_STATUS_ORDER.map((s) => stats.inquiryByStatus[s] ?? 0);

  const inquiryDoughnutData = {
    labels: inquiryStatusLabels,
    datasets: [
      {
        data: inquiryStatusData,
        backgroundColor: palette.doughnut,
        borderWidth: 1,
        borderColor: palette.doughnutBorder,
      },
    ],
  };

  const onboardingLabels = isEn ? ['Onboarding done', 'Not completed'] : ['온보딩 완료', '미완료'];
  const onboardingDoughnutData = {
    labels: onboardingLabels,
    datasets: [
      {
        data: [stats.onboardingCompleted, stats.onboardingIncomplete],
        backgroundColor: [palette.doughnut[0] ?? palette.barFill, palette.doughnut[1] ?? palette.barBorder],
        borderWidth: 1,
        borderColor: palette.doughnutBorder,
      },
    ],
  };

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: isEn ? 'Count' : '건수',
        data: barData,
        backgroundColor: palette.barFill,
        borderColor: palette.barBorder,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const lineColor = palette.doughnut[0] ?? palette.tickColor;
  const signupLineData = {
    labels: stats.signupDailyLabels,
    datasets: [
      {
        label: isEn ? 'Signups' : '가입',
        data: stats.signupDailyCounts,
        borderColor: lineColor,
        backgroundColor: palette.barFill,
        borderWidth: 2,
        fill: true,
        tension: 0.25,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ],
  };

  const doughnutChartData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutData,
        backgroundColor: palette.doughnut,
        borderWidth: 1,
        borderColor: palette.doughnutBorder,
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      ...tooltipPlugin,
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          font: { size: 11 },
          color: palette.legendColor,
        },
      },
    },
  };

  const horizontalBarScales = {
    x: {
      beginAtZero: true,
      ticks: { font: { size: 11 }, color: palette.tickColor },
      grid: { color: palette.gridColor },
    },
    y: {
      ticks: { font: { size: 11 }, color: palette.tickColor },
      grid: { display: false },
    },
  };

  const lineScales = {
    x: {
      ticks: {
        font: { size: 10 },
        color: palette.tickColor,
        maxRotation: 45,
        minRotation: 0,
        autoSkip: true,
        maxTicksLimit: 12,
      },
      grid: { color: palette.gridColor },
    },
    y: {
      beginAtZero: true,
      ticks: {
        font: { size: 11 },
        color: palette.tickColor,
        precision: 0,
      },
      grid: { color: palette.gridColor },
    },
  };

  return (
    <div className="dashboard-charts">
      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>{isEn ? 'Charts' : '차트'}</h2>
      <div className="dashboard-charts-row">
        <div className="dashboard-chart-wrap dashboard-chart-wrap--bar">
          <Bar
            data={barChartData}
            options={{
              ...commonOptions,
              indexAxis: 'y' as const,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  display: true,
                  text: isEn ? 'Service metrics (counts)' : '서비스 지표 (건수)',
                  font: { size: 13, weight: 'bold' },
                  color: palette.tickColor,
                },
              },
              scales: horizontalBarScales,
            }}
          />
        </div>
        <div className="dashboard-chart-wrap dashboard-chart-wrap--line">
          <Line
            data={signupLineData}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  display: true,
                  text: isEn
                    ? `New signups (last ${SIGNUP_CHART_DAYS} days)`
                    : `일별 신규 가입 (최근 ${SIGNUP_CHART_DAYS}일)`,
                  font: { size: 13, weight: 'bold' },
                  color: palette.tickColor,
                },
              },
              scales: lineScales,
            }}
          />
        </div>
      </div>
      <div className="dashboard-doughnuts-row">
        <div className="dashboard-chart-wrap dashboard-chart-wrap--doughnut">
          <Doughnut
            data={doughnutChartData}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  display: true,
                  text: isEn
                    ? 'Key data mix (outfits · feedback · weather · users)'
                    : '핵심 데이터 비율 (착장·감상·날씨·가입자)',
                  font: { size: 13, weight: 'bold' },
                  color: palette.tickColor,
                },
              },
            }}
          />
        </div>
        <div className="dashboard-chart-wrap dashboard-chart-wrap--doughnut">
          <Doughnut
            data={inquiryDoughnutData}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  display: true,
                  text: isEn ? 'Inquiries by status' : '문의 상태별 건수',
                  font: { size: 13, weight: 'bold' },
                  color: palette.tickColor,
                },
              },
            }}
          />
        </div>
        <div className="dashboard-chart-wrap dashboard-chart-wrap--doughnut">
          <Doughnut
            data={onboardingDoughnutData}
            options={{
              ...commonOptions,
              plugins: {
                ...commonOptions.plugins,
                title: {
                  display: true,
                  text: isEn ? 'Onboarding completion' : '온보딩 완료 여부',
                  font: { size: 13, weight: 'bold' },
                  color: palette.tickColor,
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
