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
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type Row = {
  id: string;
  nickname: string | null;
  default_region: string | null;
  is_admin: boolean;
  account_disabled?: boolean;
  created_at: string;
};

type AccountFilter = 'all' | 'active' | 'disabled';

export function UsersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = useMemo(() => parsePageParam(searchParams.get('page')), [searchParams]);
  const qParam = searchParams.get('q') ?? '';
  const statusParam = (searchParams.get('status') as AccountFilter) || 'all';
  const status: AccountFilter = ['all', 'active', 'disabled'].includes(statusParam)
    ? statusParam
    : 'all';

  const [searchDraft, setSearchDraft] = useState(qParam);
  useEffect(() => {
    setSearchDraft(qParam);
  }, [qParam]);

  const q = useQuery({
    queryKey: ['admin-users', page, qParam, status],
    queryFn: async () => {
      const sb = getSupabase();
      const from = (page - 1) * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      let req = sb
        .from('profiles')
        .select('id, nickname, default_region, is_admin, account_disabled, created_at', { count: 'exact' });
      if (status === 'active') req = req.eq('account_disabled', false);
      else if (status === 'disabled') req = req.eq('account_disabled', true);
      const term = sanitizePostgrestOrTerm(qParam);
      if (term) {
        const p = `%${term}%`;
        const parts = [`nickname.ilike.${p}`, `default_region.ilike.${p}`];
        if (isUuidString(term)) {
          parts.push(`id.eq.${term}`);
        }
        req = req.or(parts.join(','));
      }
      const { data, error, count } = await req.order('created_at', { ascending: false }).range(from, to);
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

  const setStatus = (next: AccountFilter) => {
    setSearchParams(patchSearchParams(searchParams, { status: next === 'all' ? null : next, page: 1 }));
  };

  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError) return <p className="error">목록을 불러오지 못했습니다.</p>;

  const rows = q.data!.rows;
  const rangeText = formatListRange(Math.min(page, totalPages), ADMIN_PAGE_SIZE, totalCount);

  return (
    <div>
      <h1>사용자</h1>
      <p className="muted">페이지당 {ADMIN_PAGE_SIZE}명 · 최신순</p>
      <TableListToolbar rangeText={rangeText}>
        <input
          type="search"
          placeholder="닉네임·지역·사용자 ID(UUID)"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          aria-label="사용자 검색"
        />
        <button type="button" className="filter-btn" onClick={applySearch}>
          검색
        </button>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AccountFilter)}
          aria-label="계정 상태 필터"
        >
          <option value="all">전체</option>
          <option value="active">정상만</option>
          <option value="disabled">비활성만</option>
        </select>
      </TableListToolbar>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>닉네임</th>
              <th>지역</th>
              <th>관리자</th>
              <th>상태</th>
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/users/${r.id}`} className="linkish">
                    {r.nickname?.trim() || '이름 없음'}
                  </Link>
                </td>
                <td>{r.default_region ?? '—'}</td>
                <td>{r.is_admin ? <span className="badge">관리자</span> : '—'}</td>
                <td>
                  {r.account_disabled ? <span className="badge danger">비활성</span> : '정상'}
                </td>
                <td>{new Date(r.created_at).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="muted">조건에 맞는 사용자가 없습니다.</p> : null}
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
