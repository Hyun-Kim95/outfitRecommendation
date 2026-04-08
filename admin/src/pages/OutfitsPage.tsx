import { PaginationBar, formatListRange } from '@/components/PaginationBar';
import { TableListToolbar } from '@/components/TableListToolbar';
import {
  ADMIN_PAGE_SIZE,
  isUuidString,
  parsePageParam,
  patchSearchParams,
  sanitizePostgrestOrTerm,
  totalPagesFromCount,
} from '@/lib/admin-pagination';
import { getSupabase } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

/** 목록에서 outfit_id별 감상 만족도 평균만 배치 조회 */
async function fetchFeedbackSatisfactionAverages(
  sb: SupabaseClient,
  outfitIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (outfitIds.length === 0) return map;
  try {
    const { data, error } = await sb
      .from('feedback_logs')
      .select('outfit_log_id, overall_satisfaction')
      .in('outfit_log_id', outfitIds);
    if (error) throw error;
    const buckets = new Map<string, number[]>();
    for (const row of data ?? []) {
      const oid = row.outfit_log_id;
      const s = row.overall_satisfaction;
      if (s == null || s < 1 || s > 5) continue;
      const arr = buckets.get(oid) ?? [];
      arr.push(s);
      buckets.set(oid, arr);
    }
    for (const [oid, nums] of buckets) {
      map.set(oid, Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10);
    }
  } catch (e) {
    console.warn('admin outfits: feedback_logs 배치 조회 실패(목록은 계속 표시)', e);
  }
  return map;
}

/** 레거시 종합 별점 — 목록에서는 배치 조회 */
async function fetchRatingLegacyOverall(
  sb: SupabaseClient,
  outfitIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (outfitIds.length === 0) return map;
  try {
    const { data, error } = await sb
      .from('rating_logs')
      .select('outfit_log_id, overall_rating')
      .in('outfit_log_id', outfitIds);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.overall_rating != null) {
        map.set(row.outfit_log_id, row.overall_rating);
      }
    }
  } catch (e) {
    console.warn('admin outfits: rating_logs 배치 조회 실패(목록은 계속 표시)', e);
  }
  return map;
}

/** PostgREST `or()` — ilike 값은 `%term%` (따옴표 없음, 클라이언트가 인코딩). worn_on은 date만 eq */
function buildOutfitSearchOrClause(raw: string, nicknameUserIds: string[]): string {
  const p = `%${raw}%`;
  const parts: string[] = [
    `top_category.ilike.${p}`,
    `bottom_category.ilike.${p}`,
    `outer_category.ilike.${p}`,
    `shoes_category.ilike.${p}`,
    `thickness_level.ilike.${p}`,
    `memo.ilike.${p}`,
  ];
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    parts.push(`worn_on.eq.${raw}`);
  }
  if (nicknameUserIds.length > 0) {
    parts.push(`user_id.in.(${nicknameUserIds.join(',')})`);
  }
  if (isUuidString(raw)) {
    parts.push(`id.eq.${raw}`);
    parts.push(`user_id.eq.${raw}`);
  }
  if (/^\d{1,3}$/.test(raw)) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) {
      parts.push(`feels_like_bucket.eq.${n}`);
    }
  }
  return parts.join(',');
}

type Row = {
  id: string;
  user_id: string;
  worn_on: string;
  top_category: string | null;
  bottom_category: string | null;
  outer_category: string | null;
  created_at: string;
  feels_like_bucket: number | null;
  similarity_snapshot: unknown | null;
  profiles: { nickname: string | null } | null;
  rating_logs: { overall_rating: number | null } | null;
  satisfaction_avg: number | null;
};

type SnapshotFilter = 'all' | 'yes' | 'no';

export function OutfitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = useMemo(() => parsePageParam(searchParams.get('page')), [searchParams]);
  const qParam = searchParams.get('q') ?? '';
  const snapParam = (searchParams.get('snapshot') as SnapshotFilter) || 'all';
  const snapshotFilter: SnapshotFilter = ['all', 'yes', 'no'].includes(snapParam) ? snapParam : 'all';

  const [searchDraft, setSearchDraft] = useState(qParam);
  useEffect(() => {
    setSearchDraft(qParam);
  }, [qParam]);

  const q = useQuery({
    queryKey: ['admin-outfits', page, qParam, snapshotFilter],
    queryFn: async () => {
      const sb = getSupabase();
      const from = (page - 1) * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      const term = sanitizePostgrestOrTerm(qParam);

      /** 임베드 없음 — profiles는 별도 배치(임베드/관계 오류 방지) */
      let listReq = sb.from('outfit_logs').select(
        'id, user_id, worn_on, top_category, bottom_category, outer_category, created_at, feels_like_bucket, similarity_snapshot',
        { count: 'exact' }
      );

      if (snapshotFilter === 'yes') listReq = listReq.not('similarity_snapshot', 'is', null);
      else if (snapshotFilter === 'no') listReq = listReq.is('similarity_snapshot', null);

      if (term) {
        const { data: profs, error: pe } = await sb
          .from('profiles')
          .select('id')
          .ilike('nickname', `%${term}%`);
        if (pe) throw pe;
        const uidList = (profs ?? []).map((p) => p.id);
        listReq = listReq.or(buildOutfitSearchOrClause(term, uidList));
      }

      const { data, error, count } = await listReq.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;
      const raw = (data ?? []) as Record<string, unknown>[];
      const ids = raw.map((r) => String(r.id));
      const userIds = [...new Set(raw.map((r) => String(r.user_id)))];

      let nickByUserId = new Map<string, string | null>();
      if (userIds.length > 0) {
        const { data: profs, error: pe } = await sb.from('profiles').select('id, nickname').in('id', userIds);
        if (pe) {
          console.warn('admin outfits: 닉네임 배치 조회 실패', pe);
        } else {
          nickByUserId = new Map((profs ?? []).map((p) => [p.id, p.nickname]));
        }
      }

      const [avgMap, ratingMap] = await Promise.all([
        fetchFeedbackSatisfactionAverages(sb, ids),
        fetchRatingLegacyOverall(sb, ids),
      ]);

      const rows: Row[] = raw.map((r) => {
        const id = String(r.id);
        const uid = String(r.user_id);
        const leg = ratingMap.get(id);
        return {
          id,
          user_id: uid,
          worn_on: String(r.worn_on),
          top_category: (r.top_category as string | null) ?? null,
          bottom_category: (r.bottom_category as string | null) ?? null,
          outer_category: (r.outer_category as string | null) ?? null,
          created_at: String(r.created_at),
          feels_like_bucket: (r.feels_like_bucket as number | null) ?? null,
          similarity_snapshot: r.similarity_snapshot ?? null,
          profiles: { nickname: nickByUserId.get(uid) ?? null },
          rating_logs: leg != null ? { overall_rating: leg } : null,
          satisfaction_avg: avgMap.get(id) ?? null,
        };
      });
      return { rows, totalCount: count ?? 0 };
    },
  });

  const totalCount = q.data?.totalCount ?? 0;
  const totalPages = totalPagesFromCount(totalCount, ADMIN_PAGE_SIZE);

  useEffect(() => {
    if (!q.isSuccess || totalCount === 0) return;
    if (page > totalPages) {
      setSearchParams(patchSearchParams(searchParams, { page: totalPages }), { replace: true });
    }
  }, [q.isSuccess, page, totalPages, totalCount, setSearchParams, searchParams]);

  const applySearch = () => {
    setSearchParams(
      patchSearchParams(searchParams, {
        q: sanitizePostgrestOrTerm(searchDraft) || null,
        page: 1,
      })
    );
  };

  const setSnapshot = (next: SnapshotFilter) => {
    setSearchParams(
      patchSearchParams(searchParams, { snapshot: next === 'all' ? null : next, page: 1 })
    );
  };

  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError) {
    const msg = q.error instanceof Error ? q.error.message : String(q.error);
    return (
      <div>
        <p className="error">목록을 불러오지 못했습니다.</p>
        <p className="muted small mono" style={{ marginTop: '0.5rem', wordBreak: 'break-word' }}>
          {msg}
        </p>
      </div>
    );
  }

  const rows = q.data!.rows;
  const rangeText = formatListRange(Math.min(page, totalPages), ADMIN_PAGE_SIZE, totalCount);

  return (
    <div>
      <h1>착장 기록</h1>
      <p className="muted">
        페이지당 {ADMIN_PAGE_SIZE}건 · 최신순 · 체감 버킷·유사일 스냅샷은 모바일 착장 저장 시 채워집니다.
      </p>
      <TableListToolbar rangeText={rangeText}>
        <input
          type="search"
          placeholder="카테고리·메모·닉네임·착용일(YYYY-MM-DD)·버킷"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          aria-label="착장 기록 검색"
        />
        <button type="button" className="filter-btn" onClick={applySearch}>
          검색
        </button>
        <select
          value={snapshotFilter}
          onChange={(e) => setSnapshot(e.target.value as SnapshotFilter)}
          aria-label="유사일 스냅샷 필터"
        >
          <option value="all">스냅샷 전체</option>
          <option value="yes">스냅샷 있음</option>
          <option value="no">스냅샷 없음</option>
        </select>
      </TableListToolbar>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>착용일</th>
              <th>요약</th>
              <th>회원</th>
              <th>체감 버킷</th>
              <th>스냅샷</th>
              <th>종합 만족도</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/outfits/${r.id}`} className="linkish">
                    {r.worn_on}
                  </Link>
                </td>
                <td>
                  {[r.top_category, r.bottom_category, r.outer_category].filter(Boolean).join(' · ') ||
                    '—'}
                </td>
                <td>
                  <Link to={`/users/${r.user_id}`} className="linkish">
                    {r.profiles?.nickname?.trim() || '이름 없음'}
                  </Link>
                </td>
                <td>{r.feels_like_bucket != null ? String(r.feels_like_bucket) : '—'}</td>
                <td className="small muted">{r.similarity_snapshot != null ? '✓' : '—'}</td>
                <td>
                  {r.satisfaction_avg != null
                    ? `${r.satisfaction_avg} (감상 평균)`
                    : r.rating_logs?.overall_rating != null
                      ? `${r.rating_logs.overall_rating} (레거시)`
                      : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="muted">조건에 맞는 기록이 없습니다.</p> : null}
      <PaginationBar
        page={Math.min(page, totalPages)}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={ADMIN_PAGE_SIZE}
        onPageChange={(next) =>
          setSearchParams(patchSearchParams(searchParams, { page: next }))
        }
      />
    </div>
  );
}
