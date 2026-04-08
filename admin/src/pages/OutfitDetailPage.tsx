import { StorageImage } from '@/components/StorageImage';
import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

function jsonPreview(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

const TIMING_KO: Record<string, string> = {
  first: '출발 직후',
  middle: '중간',
  last: '귀가 후',
};

/** 모바일: 3단계 회고(timing) 우선, 구 이동/장소 모드는 보조 */
function feedbackContextLabel(f: Record<string, unknown>): string {
  const tt = f.timing_type;
  if (typeof tt === 'string' && TIMING_KO[tt]) {
    return `타이밍 · ${TIMING_KO[tt]}`;
  }
  const mode = f.context_mode;
  if (mode === 'transit') return `이동 · ${f.transport_type != null ? String(f.transport_type) : '—'}`;
  if (mode === 'place')
    return `한 장소 · ${f.place_singular != null ? String(f.place_singular) : '—'}`;
  if (f.timing_type) return `타이밍 · ${String(f.timing_type)}`;
  return '—';
}

function similaritySnapshotSummary(raw: unknown): string {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return '—';
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return jsonPreview(raw);
  const feels = o.temperature_feels_like;
  const cur = o.temperature_current;
  const tags = o.situation_tags;
  const tagStr =
    Array.isArray(tags) && tags.every((x) => typeof x === 'string')
      ? (tags as string[]).join(', ')
      : '—';
  const bits: string[] = [];
  if (typeof feels === 'number') bits.push(`체감 ${Math.round(feels)}°`);
  if (typeof cur === 'number') bits.push(`기온 ${Math.round(cur)}°`);
  bits.push(`상황 태그: ${tagStr}`);
  if (typeof o.activity_level === 'string') bits.push(`활동 ${o.activity_level}`);
  if (typeof o.indoor_outdoor === 'string') bits.push(`실내외 ${o.indoor_outdoor}`);
  return bits.join(' · ');
}

function avgFeedbackSatisfaction(rows: Record<string, unknown>[]): number | null {
  const nums = rows
    .map((r) => r.overall_satisfaction)
    .filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 5);
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

function feedbackWeatherShort(f: Record<string, unknown>): string {
  const w = f.weather_snapshot;
  if (!w || typeof w !== 'object') return '—';
  const o = w as Record<string, unknown>;
  const te = o.temperature_current;
  const cond = o.weather_condition;
  const r = o.region_label;
  if (typeof te === 'number') {
    const bits = [`${Math.round(te)}°`];
    if (typeof cond === 'string') bits.push(cond);
    if (typeof r === 'string') bits.push(`(${r})`);
    return bits.join(' · ');
  }
  return jsonPreview(w);
}

export function OutfitDetailPage() {
  const { id } = useParams<{ id: string }>();

  const q = useQuery({
    queryKey: ['admin-outfit', id],
    enabled: !!id,
    queryFn: async () => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('outfit_logs')
        .select(
          `
          id, user_id, worn_on, memo, top_category, bottom_category, outer_category, shoes_category,
          accessory_tags, thickness_level, photo_path, created_at, weather_log_id,
          similarity_snapshot, feels_like_bucket,
          profiles ( nickname ),
          weather_logs ( snapshot_date, temperature_current, weather_condition, region_name ),
          context_logs ( transport_type, activity_level, indoor_outdoor_ratio, situation_tags ),
          rating_logs ( overall_rating ),
          feedback_logs ( id, created_at, timing_type, context_mode, transport_type, place_tags, place_singular, time_period, weather_snapshot, feeling_type, discomfort_tags, note, overall_satisfaction, improvement_tags )
        `
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!id) return <p className="error">잘못된 경로입니다.</p>;
  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError || !q.data) return <p className="error">착장 기록을 찾을 수 없습니다.</p>;

  const o = q.data as Record<string, unknown>;
  const profileRow = (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles) as {
    nickname?: string | null;
  } | null;
  const memberName = profileRow?.nickname?.trim() || '이름 없음';
  const weather = (Array.isArray(o.weather_logs) ? o.weather_logs[0] : o.weather_logs) as Record<
    string,
    unknown
  > | null;
  const ctx = (Array.isArray(o.context_logs) ? o.context_logs[0] : o.context_logs) as Record<
    string,
    unknown
  > | null;
  const rating = (Array.isArray(o.rating_logs) ? o.rating_logs[0] : o.rating_logs) as Record<
    string,
    unknown
  > | null;
  const feedbacksRaw = (Array.isArray(o.feedback_logs)
    ? o.feedback_logs
    : o.feedback_logs
      ? [o.feedback_logs]
      : []) as Record<string, unknown>[];
  const feedbacks = [...feedbacksRaw].sort((a, b) => {
    const ta = new Date(String(a.created_at ?? 0)).getTime();
    const tb = new Date(String(b.created_at ?? 0)).getTime();
    return tb - ta;
  });

  const avgSat = avgFeedbackSatisfaction(feedbacks);
  const legacyOverall =
    rating?.overall_rating != null && typeof rating.overall_rating === 'number'
      ? rating.overall_rating
      : null;
  const combinedSat = avgSat ?? legacyOverall;
  const memos = feedbacks.filter((f) => f.note && String(f.note).trim().length > 0);

  return (
    <div>
      <p className="muted small">
        <Link to="/outfits" className="linkish">
          ← 착장 목록
        </Link>
      </p>
      <h1>착장 상세</h1>
      <p className="muted mono small">{String(o.id)}</p>
      <p>
        회원{' '}
        <Link to={`/users/${String(o.user_id)}`} className="linkish">
          <strong>{memberName}</strong>
        </Link>
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <tbody>
            <tr>
              <th>착용일</th>
              <td>{String(o.worn_on)}</td>
            </tr>
            <tr>
              <th>상의 / 하의 / 아우터 / 신발</th>
              <td>
                {[o.top_category, o.bottom_category, o.outer_category, o.shoes_category]
                  .filter(Boolean)
                  .join(' · ') || '—'}
              </td>
            </tr>
            <tr>
              <th>메모</th>
              <td>{o.memo ? String(o.memo) : '—'}</td>
            </tr>
            <tr>
              <th>사진 (스토리지)</th>
              <td>
                {o.photo_path ? (
                  <>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <StorageImage bucket="outfit-photos" path={String(o.photo_path)} alt="착장" />
                    </div>
                    <span className="mono small muted">{String(o.photo_path)}</span>
                  </>
                ) : (
                  '—'
                )}
              </td>
            </tr>
            <tr>
              <th>날씨 로그 FK</th>
              <td className="mono small">{o.weather_log_id ? String(o.weather_log_id) : '—'}</td>
            </tr>
            <tr>
              <th>날씨 스냅샷 (연동)</th>
              <td>
                {weather
                  ? `${weather.snapshot_date ?? ''} · ${weather.temperature_current ?? '—'}° · ${weather.weather_condition ?? ''} (${weather.region_name ?? ''})`
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>유사일용 스냅샷</th>
              <td className="small">
                <strong>체감 버킷</strong>:{' '}
                {o.feels_like_bucket != null ? String(o.feels_like_bucket) : '—'}{' '}
                <span className="muted">(2°C 단위, 인덱스·비슷한 날)</span>
                <br />
                <span className="muted">요약:</span> {similaritySnapshotSummary(o.similarity_snapshot)}
              </td>
            </tr>
            <tr>
              <th>similarity_snapshot (원본)</th>
              <td className="mono small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {jsonPreview(o.similarity_snapshot)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>상황 (context)</h2>
      <div className="table-wrap">
        <table className="data-table">
          <tbody>
            <tr>
              <th>이동</th>
              <td>{ctx?.transport_type ? String(ctx.transport_type) : '—'}</td>
            </tr>
            <tr>
              <th>활동량</th>
              <td>{ctx?.activity_level ? String(ctx.activity_level) : '—'}</td>
            </tr>
            <tr>
              <th>실내외</th>
              <td>{ctx?.indoor_outdoor_ratio ? String(ctx.indoor_outdoor_ratio) : '—'}</td>
            </tr>
            <tr>
              <th>상황 태그</th>
              <td className="small">{jsonPreview(ctx?.situation_tags)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>종합 만족도</h2>
      <p>
        감상 기록 평균:{' '}
        <strong>{combinedSat != null ? `${combinedSat} / 5` : '—'}</strong>
        {avgSat == null && legacyOverall != null ? (
          <span className="muted small"> (레거시 단일 평가만 있음)</span>
        ) : null}
      </p>

      {memos.length > 0 ? (
        <>
          <h2 style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>감상 메모</h2>
          <ul className="small" style={{ paddingLeft: '1.25rem' }}>
            {memos.map((f) => (
              <li key={String(f.id)} style={{ marginBottom: '0.75rem' }}>
                <span className="muted">
                  {typeof f.timing_type === 'string' && TIMING_KO[f.timing_type]
                    ? `${TIMING_KO[f.timing_type]} · `
                    : ''}
                  {f.time_period != null ? `${String(f.time_period)} · ` : ''}
                  {f.created_at ? String(f.created_at) : ''}
                </span>
                <br />
                {String(f.note)}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>감상 (feedback)</h2>
      {feedbacks.length === 0 ? (
        <p className="muted">기록 없음</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>기록 시각</th>
                <th>맥락</th>
                <th>장소 태그(JSON)</th>
                <th>시간대</th>
                <th>만족</th>
                <th>저장 시 날씨</th>
                <th>체감(느낌)</th>
                <th>불편 태그</th>
                <th>개선 태그</th>
                <th>메모</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f) => (
                <tr key={String(f.id ?? f.created_at)}>
                  <td className="mono small">{f.created_at ? String(f.created_at) : '—'}</td>
                  <td>{feedbackContextLabel(f)}</td>
                  <td className="small">{jsonPreview(f.place_tags)}</td>
                  <td>{f.time_period != null ? String(f.time_period) : '—'}</td>
                  <td>{f.overall_satisfaction != null ? String(f.overall_satisfaction) : '—'}</td>
                  <td className="small">{feedbackWeatherShort(f)}</td>
                  <td>{f.feeling_type ? String(f.feeling_type) : '—'}</td>
                  <td className="small">{jsonPreview(f.discomfort_tags)}</td>
                  <td className="small">{jsonPreview(f.improvement_tags)}</td>
                  <td>{f.note ? String(f.note) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
