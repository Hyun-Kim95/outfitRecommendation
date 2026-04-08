import { PaginationBar, formatListRange } from '@/components/PaginationBar';
import { TableListToolbar } from '@/components/TableListToolbar';
import {
  ADMIN_PAGE_SIZE,
  parsePageParam,
  patchSearchParams,
  sanitizePostgrestOrTerm,
  totalPagesFromCount,
} from '@/lib/admin-pagination';
import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type Row = {
  id: string;
  title: string;
  is_active: boolean;
  is_pinned: boolean;
  starts_at: string;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type ActiveFilter = 'all' | 'active' | 'inactive';

export function NoticesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = useMemo(() => parsePageParam(searchParams.get('page')), [searchParams]);
  const qParam = searchParams.get('q') ?? '';
  const activeParam = (searchParams.get('active') as ActiveFilter) || 'all';
  const activeFilter: ActiveFilter = ['all', 'active', 'inactive'].includes(activeParam)
    ? activeParam
    : 'all';

  const [searchDraft, setSearchDraft] = useState(qParam);
  useEffect(() => {
    setSearchDraft(qParam);
  }, [qParam]);

  const q = useQuery({
    queryKey: ['admin-notices', page, qParam, activeFilter],
    queryFn: async () => {
      const sb = getSupabase();
      const from = (page - 1) * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      let req = sb
        .from('app_notices')
        .select(
          'id, title, is_active, is_pinned, starts_at, ends_at, sort_order, created_at, updated_at',
          { count: 'exact' }
        );
      if (activeFilter === 'active') req = req.eq('is_active', true);
      else if (activeFilter === 'inactive') req = req.eq('is_active', false);
      const term = sanitizePostgrestOrTerm(qParam);
      if (term) {
        const p = `%${term}%`;
        req = req.or(`title.ilike.${p},body.ilike.${p}`);
      }
      const { data, error, count } = await req
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as Row[], totalCount: count ?? 0 };
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

  const setActive = (next: ActiveFilter) => {
    setSearchParams(patchSearchParams(searchParams, { active: next === 'all' ? null : next, page: 1 }));
  };

  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError) return <p className="error">목록을 불러오지 못했습니다.</p>;

  const rows = q.data!.rows;
  const rangeText = formatListRange(Math.min(page, totalPages), ADMIN_PAGE_SIZE, totalCount);

  return (
    <div>
      <h1>공지</h1>
      <p className="muted">
        <Link to="/notices/new" className="linkish">
          + 새 공지 작성
        </Link>
        {' · '}
        페이지당 {ADMIN_PAGE_SIZE}건 · 고정 글은 항상 위에, 그다음 최신 등록순입니다.
      </p>
      <TableListToolbar rangeText={rangeText}>
        <input
          type="search"
          placeholder="제목·본문 검색"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          aria-label="공지 제목·본문 검색"
        />
        <button type="button" className="filter-btn" onClick={applySearch}>
          검색
        </button>
        <select
          value={activeFilter}
          onChange={(e) => setActive(e.target.value as ActiveFilter)}
          aria-label="활성 여부 필터"
        >
          <option value="all">활성 전체</option>
          <option value="active">활성만</option>
          <option value="inactive">비활성만</option>
        </select>
      </TableListToolbar>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>고정</th>
              <th>제목</th>
              <th>활성</th>
              <th>시작</th>
              <th>종료</th>
              <th>등록일</th>
              <th>수정일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.is_pinned ? '📌 예' : '—'}</td>
                <td>
                  <Link to={`/notices/${r.id}/edit`} className="linkish">
                    {r.title}
                  </Link>
                </td>
                <td>{r.is_active ? '예' : '아니오'}</td>
                <td className="small">{new Date(r.starts_at).toLocaleString('ko-KR')}</td>
                <td className="small">
                  {r.ends_at ? new Date(r.ends_at).toLocaleString('ko-KR') : '—'}
                </td>
                <td className="small">{new Date(r.created_at).toLocaleString('ko-KR')}</td>
                <td className="small">{new Date(r.updated_at).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="muted">조건에 맞는 공지가 없습니다.</p> : null}
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
