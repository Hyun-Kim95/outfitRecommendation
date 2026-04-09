import { StorageImage } from '@/components/StorageImage';
import { useLocale, type Locale } from '@/context/LocaleContext';
import { formatOptionArrayOrJson, optionLabel, optionListLabel } from '@/lib/optionLabels';
import { getSupabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

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
function feedbackContextLabel(f: Record<string, unknown>, locale: Locale): string {
  const isEn = locale === 'en';
  const tt = f.timing_type;
  if (typeof tt === 'string' && TIMING_KO[tt]) {
    const label = isEn ? optionLabel(locale, TIMING_KO[tt]) : TIMING_KO[tt];
    return isEn ? `Timing · ${label}` : `타이밍 · ${label}`;
  }
  const mode = f.context_mode;
  if (mode === 'transit') {
    const tr =
      f.transport_type != null ? optionLabel(locale, String(f.transport_type)) : '—';
    return isEn ? `Transit · ${tr}` : `이동 · ${tr}`;
  }
  if (mode === 'place') {
    const place = f.place_singular != null ? String(f.place_singular) : '—';
    return isEn ? `Single place · ${place}` : `한 장소 · ${place}`;
  }
  if (f.timing_type) {
    const raw = String(f.timing_type);
    return isEn ? `Timing · ${optionLabel(locale, raw)}` : `타이밍 · ${raw}`;
  }
  return '—';
}

function similaritySnapshotSummary(raw: unknown, locale: Locale): string {
  const isEn = locale === 'en';
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return '—';
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return jsonPreview(raw);
  const feels = o.temperature_feels_like;
  const cur = o.temperature_current;
  const tags = o.situation_tags;
  const tagStr =
    Array.isArray(tags) && tags.every((x) => typeof x === 'string')
      ? (tags as string[]).map((t) => optionLabel(locale, t)).join(', ')
      : '—';
  const bits: string[] = [];
  if (typeof feels === 'number') {
    bits.push(isEn ? `Feels ${Math.round(feels)}°` : `체감 ${Math.round(feels)}°`);
  }
  if (typeof cur === 'number') {
    bits.push(isEn ? `Temp ${Math.round(cur)}°` : `기온 ${Math.round(cur)}°`);
  }
  bits.push(isEn ? `Tags: ${tagStr}` : `상황 태그: ${tagStr}`);
  if (typeof o.activity_level === 'string') {
    bits.push(
      isEn ? `Activity: ${optionLabel(locale, o.activity_level)}` : `활동 ${o.activity_level}`
    );
  }
  if (typeof o.indoor_outdoor === 'string') {
    bits.push(
      isEn
        ? `Indoor/outdoor: ${optionLabel(locale, o.indoor_outdoor)}`
        : `실내외 ${o.indoor_outdoor}`
    );
  }
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
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

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
          similarity_snapshot, feels_like_bucket
        `
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const userId = String(data.user_id ?? '');
      const outfitId = String(data.id ?? '');
      const weatherLogId = data.weather_log_id ? String(data.weather_log_id) : '';
      const [profileRes, weatherRes, contextRes, ratingRes, feedbackRes] = await Promise.allSettled([
        userId
          ? sb.from('profiles').select('nickname').eq('id', userId).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        weatherLogId
          ? sb
              .from('weather_logs')
              .select('snapshot_date, temperature_current, weather_condition, region_name')
              .eq('id', weatherLogId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        sb
          .from('context_logs')
          .select('transport_type, activity_level, indoor_outdoor_ratio, situation_tags')
          .eq('outfit_log_id', outfitId)
          .maybeSingle(),
        sb.from('rating_logs').select('overall_rating').eq('outfit_log_id', outfitId).maybeSingle(),
        sb
          .from('feedback_logs')
          .select(
            'id, created_at, timing_type, context_mode, transport_type, place_tags, place_singular, time_period, weather_snapshot, feeling_type, discomfort_tags, note, overall_satisfaction, improvement_tags'
          )
          .eq('outfit_log_id', outfitId),
      ]);

      const profile =
        profileRes.status === 'fulfilled' && !profileRes.value.error ? profileRes.value.data : null;
      const weather =
        weatherRes.status === 'fulfilled' && !weatherRes.value.error ? weatherRes.value.data : null;
      const context =
        contextRes.status === 'fulfilled' && !contextRes.value.error ? contextRes.value.data : null;
      const rating =
        ratingRes.status === 'fulfilled' && !ratingRes.value.error ? ratingRes.value.data : null;
      const feedbacks =
        feedbackRes.status === 'fulfilled' && !feedbackRes.value.error
          ? (feedbackRes.value.data ?? [])
          : [];

      return {
        ...data,
        profiles: profile,
        weather_logs: weather,
        context_logs: context,
        rating_logs: rating,
        feedback_logs: feedbacks,
      };
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const sb = getSupabase();
      const { error } = await sb.from('outfit_logs').delete().eq('id', id!);
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-outfits'] });
      await qc.invalidateQueries({ queryKey: ['admin-outfit', id] });
      navigate('/outfits');
    },
  });

  if (!id) return <p className="error">{isEn ? 'Invalid route.' : '잘못된 경로입니다.'}</p>;
  if (q.isLoading) return <p className="muted">{isEn ? 'Loading…' : '불러오는 중…'}</p>;
  if (q.isError || !q.data) return <p className="error">{isEn ? 'Outfit log not found.' : '착장 기록을 찾을 수 없습니다.'}</p>;

  const o = q.data as Record<string, unknown>;
  const profileRow = (Array.isArray(o.profiles) ? o.profiles[0] : o.profiles) as {
    nickname?: string | null;
  } | null;
  const memberName = profileRow?.nickname?.trim() || (isEn ? 'No name' : '이름 없음');
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
          {isEn ? '← Outfit list' : '← 착장 목록'}
        </Link>
      </p>
      <h1>{isEn ? 'Outfit detail' : '착장 상세'}</h1>
      <div className="detail-actions" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          className="secondary danger"
          disabled={remove.isPending}
          onClick={() => {
            if (!window.confirm(isEn ? 'Delete this outfit log? Linked feedback/context data will also be removed.' : '이 착장 기록을 삭제할까요? 연결된 감상/상황 데이터도 함께 삭제됩니다.')) return;
            remove.mutate();
          }}
        >
          {remove.isPending ? (isEn ? 'Deleting…' : '삭제 중…') : isEn ? 'Delete outfit log' : '착장 기록 삭제'}
        </button>
      </div>
      <p className="muted mono small">{String(o.id)}</p>
      <p>
        {isEn ? 'User ' : '회원 '}
        <Link to={`/users/${String(o.user_id)}`} className="linkish">
          <strong>{memberName}</strong>
        </Link>
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <tbody>
            <tr>
              <th>{isEn ? 'Worn date' : '착용일'}</th>
              <td>{String(o.worn_on)}</td>
            </tr>
            <tr>
              <th>
                {isEn ? 'Top / Bottom / Outer / Shoes' : '상의 / 하의 / 아우터 / 신발'}
              </th>
              <td>
                {[o.top_category, o.bottom_category, o.outer_category, o.shoes_category]
                  .filter(Boolean)
                  .map((x) => optionListLabel(locale, String(x)))
                  .join(' · ') || '—'}
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Thickness' : '두께감'}</th>
              <td>
                {o.thickness_level != null && String(o.thickness_level).trim() !== ''
                  ? optionLabel(locale, String(o.thickness_level))
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Accessories' : '액세서리'}</th>
              <td>{formatOptionArrayOrJson(locale, o.accessory_tags)}</td>
            </tr>
            <tr>
              <th>{isEn ? 'Memo' : '메모'}</th>
              <td>{o.memo ? String(o.memo) : '—'}</td>
            </tr>
            <tr>
              <th>{isEn ? 'Photo (storage)' : '사진 (스토리지)'}</th>
              <td>
                {o.photo_path ? (
                  <>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <StorageImage bucket="outfit-photos" path={String(o.photo_path)} alt={isEn ? 'Outfit' : '착장'} />
                    </div>
                    <span className="mono small muted">{String(o.photo_path)}</span>
                  </>
                ) : (
                  '—'
                )}
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Weather log FK' : '날씨 로그 FK'}</th>
              <td className="mono small">{o.weather_log_id ? String(o.weather_log_id) : '—'}</td>
            </tr>
            <tr>
              <th>{isEn ? 'Weather snapshot (linked)' : '날씨 스냅샷 (연동)'}</th>
              <td>
                {weather
                  ? `${weather.snapshot_date ?? ''} · ${weather.temperature_current ?? '—'}° · ${weather.weather_condition ?? ''} (${weather.region_name ?? ''})`
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Similarity snapshot' : '유사일용 스냅샷'}</th>
              <td className="small">
                <strong>{isEn ? 'Feels-like bucket' : '체감 버킷'}</strong>:{' '}
                {o.feels_like_bucket != null ? String(o.feels_like_bucket) : '—'}{' '}
                <span className="muted">{isEn ? '(2°C bucket, index for similar days)' : '(2°C 단위, 인덱스·비슷한 날)'}</span>
                <br />
                <span className="muted">{isEn ? 'Summary:' : '요약:'}</span>{' '}
                {similaritySnapshotSummary(o.similarity_snapshot, locale)}
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'similarity_snapshot (raw)' : 'similarity_snapshot (원본)'}</th>
              <td className="mono small" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {jsonPreview(o.similarity_snapshot)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>{isEn ? 'Context' : '상황 (context)'}</h2>
      <div className="table-wrap">
        <table className="data-table">
          <tbody>
            <tr>
              <th>{isEn ? 'Transport' : '이동'}</th>
              <td>
                {ctx?.transport_type
                  ? optionLabel(locale, String(ctx.transport_type))
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Activity level' : '활동량'}</th>
              <td>
                {ctx?.activity_level
                  ? optionLabel(locale, String(ctx.activity_level))
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Indoor / outdoor' : '실내외'}</th>
              <td>
                {ctx?.indoor_outdoor_ratio
                  ? optionLabel(locale, String(ctx.indoor_outdoor_ratio))
                  : '—'}
              </td>
            </tr>
            <tr>
              <th>{isEn ? 'Context tags' : '상황 태그'}</th>
              <td className="small">{formatOptionArrayOrJson(locale, ctx?.situation_tags)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>{isEn ? 'Overall satisfaction' : '종합 만족도'}</h2>
      <p>
        {isEn ? 'Feedback average: ' : '감상 기록 평균:'}{' '}
        <strong>{combinedSat != null ? `${combinedSat} / 5` : '—'}</strong>
        {avgSat == null && legacyOverall != null ? (
          <span className="muted small">{isEn ? ' (legacy single rating only)' : ' (레거시 단일 평가만 있음)'}</span>
        ) : null}
      </p>

      {memos.length > 0 ? (
        <>
          <h2 style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>{isEn ? 'Feedback notes' : '감상 메모'}</h2>
          <ul className="small" style={{ paddingLeft: '1.25rem' }}>
            {memos.map((f) => (
              <li key={String(f.id)} style={{ marginBottom: '0.75rem' }}>
                <span className="muted">
                  {typeof f.timing_type === 'string' && TIMING_KO[f.timing_type]
                    ? `${isEn ? optionLabel(locale, TIMING_KO[f.timing_type]) : TIMING_KO[f.timing_type]} · `
                    : ''}
                  {f.time_period != null
                    ? `${optionLabel(locale, String(f.time_period))} · `
                    : ''}
                  {f.created_at ? String(f.created_at) : ''}
                </span>
                <br />
                {String(f.note)}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2 style={{ marginTop: '1.5rem', fontSize: '1.1rem' }}>{isEn ? 'Feedback' : '감상 (feedback)'}</h2>
      {feedbacks.length === 0 ? (
        <p className="muted">{isEn ? 'No records' : '기록 없음'}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{isEn ? 'Recorded at' : '기록 시각'}</th>
                <th>{isEn ? 'Context' : '맥락'}</th>
                <th>{isEn ? 'Place tags' : '장소 태그'}</th>
                <th>{isEn ? 'Time period' : '시간대'}</th>
                <th>{isEn ? 'Satisfaction' : '만족'}</th>
                <th>{isEn ? 'Weather at save' : '저장 시 날씨'}</th>
                <th>{isEn ? 'Feeling' : '체감(느낌)'}</th>
                <th>{isEn ? 'Discomfort tags' : '불편 태그'}</th>
                <th>{isEn ? 'Improvement tags' : '개선 태그'}</th>
                <th>{isEn ? 'Note' : '메모'}</th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f) => (
                <tr key={String(f.id ?? f.created_at)}>
                  <td className="mono small">{f.created_at ? String(f.created_at) : '—'}</td>
                  <td>{feedbackContextLabel(f, locale)}</td>
                  <td className="small">{formatOptionArrayOrJson(locale, f.place_tags)}</td>
                  <td>
                    {f.time_period != null ? optionLabel(locale, String(f.time_period)) : '—'}
                  </td>
                  <td>{f.overall_satisfaction != null ? String(f.overall_satisfaction) : '—'}</td>
                  <td className="small">{feedbackWeatherShort(f)}</td>
                  <td>
                    {f.feeling_type ? optionLabel(locale, String(f.feeling_type)) : '—'}
                  </td>
                  <td className="small">{formatOptionArrayOrJson(locale, f.discomfort_tags)}</td>
                  <td className="small">{formatOptionArrayOrJson(locale, f.improvement_tags)}</td>
                  <td>{f.note ? String(f.note) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {remove.isError ? (
        <p className="error small" style={{ marginTop: '0.75rem' }}>
          {remove.error instanceof Error ? remove.error.message : isEn ? 'Delete failed' : '삭제 실패'}
        </p>
      ) : null}
    </div>
  );
}
