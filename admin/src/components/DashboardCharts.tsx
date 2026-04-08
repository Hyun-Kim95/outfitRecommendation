import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export type DashboardStats = {
  users: number;
  outfits: number;
  weatherSnapshots: number;
  openTickets: number;
  feedbackEntries: number;
  recommendationLogs: number;
  outfitsWithSimilaritySnapshot: number;
};

function chartColors() {
  return {
    primary: 'color-mix(in oklch, var(--primary) 88%, transparent)',
    border: 'color-mix(in oklch, var(--primary) 55%, var(--border))',
    doughnut: [
      'rgba(59, 130, 246, 0.75)',
      'rgba(16, 185, 129, 0.75)',
      'rgba(245, 158, 11, 0.75)',
      'rgba(239, 68, 68, 0.75)',
      'rgba(139, 92, 246, 0.75)',
      'rgba(236, 72, 153, 0.75)',
      'rgba(100, 116, 139, 0.75)',
    ],
  };
}

export function DashboardCharts({ stats }: { stats: DashboardStats }) {
  const c = chartColors();

  const barLabels = [
    '가입자',
    '착장 기록',
    '날씨 스냅샷',
    '감상 항목',
    '추천 로그',
    '유사일 스냅샷 착장',
    '미완료 문의',
  ];
  const barData = [
    stats.users,
    stats.outfits,
    stats.weatherSnapshots,
    stats.feedbackEntries,
    stats.recommendationLogs,
    stats.outfitsWithSimilaritySnapshot,
    stats.openTickets,
  ];

  const doughnutLabels = ['착장', '감상', '날씨 스냅샷', '가입자'];
  const doughnutData = [
    stats.outfits,
    stats.feedbackEntries,
    stats.weatherSnapshots,
    stats.users,
  ];

  const barChartData = {
    labels: barLabels,
    datasets: [
      {
        label: '건수',
        data: barData,
        backgroundColor: c.primary,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const doughnutChartData = {
    labels: doughnutLabels,
    datasets: [
      {
        data: doughnutData,
        backgroundColor: c.doughnut.slice(0, doughnutLabels.length),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
      },
    ],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: { font: { size: 11 } },
      },
    },
  };

  return (
    <div className="dashboard-charts">
      <h2 style={{ fontSize: '1.15rem', marginBottom: '0.75rem' }}>차트</h2>
      <p className="muted small" style={{ marginBottom: '1rem' }}>
        주요 테이블 건수를 막대·비율로 비교합니다. (동일 스케일 아님 — 참고용)
      </p>
      <div className="dashboard-chart-wrap" style={{ height: 300 }}>
        <Bar
          data={barChartData}
          options={{
            ...commonOptions,
            indexAxis: 'y' as const,
            plugins: {
              ...commonOptions.plugins,
              title: {
                display: true,
                text: '서비스 지표 (건수)',
                font: { size: 13, weight: 'bold' },
              },
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: { font: { size: 11 } },
                grid: { color: 'rgba(148, 163, 184, 0.35)' },
              },
              y: {
                ticks: { font: { size: 11 } },
                grid: { display: false },
              },
            },
          }}
        />
      </div>
      <div className="dashboard-chart-wrap" style={{ maxWidth: 400, marginTop: '1.5rem' }}>
        <Doughnut
          data={doughnutChartData}
          options={{
            ...commonOptions,
            plugins: {
              ...commonOptions.plugins,
              title: {
                display: true,
                text: '핵심 데이터 비율 (착장·감상·날씨·가입자)',
                font: { size: 13, weight: 'bold' },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
