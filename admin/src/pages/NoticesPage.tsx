import { PaginationBar, formatListRange } from '@/components/PaginationBar';
import { TableListToolbar } from '@/components/TableListToolbar';
import {
  ADMIN_PAGE_SIZE,
  parsePageParam,
  patchSearchParams,
  sanitizePostgrestOrTerm,
  totalPagesFromCount,
} from '@/lib/admin-pagination';
import { useLocale } from '@/context/LocaleContext';
import { localeDateTimeString } from '@/lib/dateLocale';
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
  created_at: string;
  updated_at: string;
};

type ActiveFilter = 'all' | 'active' | 'inactive';

export function NoticesPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
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
          'id, title, is_active, is_pinned, starts_at, ends_at, created_at, updated_at',
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

  if (q.isLoading) return <p className="muted">{isEn ? 'Loading…' : '불러오는 중…'}</p>;
  if (q.isError) return <p className="error">{isEn ? 'Failed to load notices.' : '목록을 불러오지 못했습니다.'}</p>;

  const rows = q.data!.rows;
  const rangeText = formatListRange(Math.min(page, totalPages), ADMIN_PAGE_SIZE, totalCount, locale);

  return (
    <div>
      <h1>{isEn ? 'Notices' : '공지'}</h1>
      <div className="notices-header-actions">
        <Link to="/notices/new" className="btn-link">
          {isEn ? '+ New Notice' : '+ 공지 등록'}
        </Link>
      </div>
      <TableListToolbar rangeText={rangeText}>
        <input
          type="search"
          placeholder={isEn ? 'Search title/body' : '제목·본문 검색'}
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          aria-label={isEn ? 'Search notice title/body' : '공지 제목·본문 검색'}
        />
        <button type="button" className="filter-btn" onClick={applySearch}>
          {isEn ? 'Search' : '검색'}
        </button>
        <select
          value={activeFilter}
          onChange={(e) => setActive(e.target.value as ActiveFilter)}
          aria-label={isEn ? 'Active status filter' : '활성 여부 필터'}
        >
          <option value="all">{isEn ? 'All' : '활성 전체'}</option>
          <option value="active">{isEn ? 'Active only' : '활성만'}</option>
          <option value="inactive">{isEn ? 'Inactive only' : '비활성만'}</option>
        </select>
      </TableListToolbar>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{isEn ? 'Pinned' : '고정'}</th>
              <th>{isEn ? 'Title' : '제목'}</th>
              <th>{isEn ? 'Active' : '활성'}</th>
              <th>{isEn ? 'Start' : '시작'}</th>
              <th>{isEn ? 'End' : '종료'}</th>
              <th>{isEn ? 'Created' : '등록일'}</th>
              <th>{isEn ? 'Updated' : '수정일'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.is_pinned ? (isEn ? '📌 Yes' : '📌 예') : '—'}</td>
                <td>
                  <Link to={`/notices/${r.id}/edit`} className="linkish">
                    {r.title}
                  </Link>
                </td>
                <td>{r.is_active ? (isEn ? 'Yes' : '예') : isEn ? 'No' : '아니오'}</td>
                <td className="small">{localeDateTimeString(locale, r.starts_at)}</td>
                <td className="small">
                  {r.ends_at ? localeDateTimeString(locale, r.ends_at) : '—'}
                </td>
                <td className="small">{localeDateTimeString(locale, r.created_at)}</td>
                <td className="small">{localeDateTimeString(locale, r.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="muted">{isEn ? 'No notices match the filter.' : '조건에 맞는 공지가 없습니다.'}</p> : null}
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
