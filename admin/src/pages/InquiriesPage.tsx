import { PaginationBar, formatListRange } from '@/components/PaginationBar';
import { TableListToolbar } from '@/components/TableListToolbar';
import {
  ADMIN_PAGE_SIZE,
  parsePageParam,
  patchSearchParams,
  sanitizePostgrestOrTerm,
  totalPagesFromCount,
} from '@/lib/admin-pagination';
import { ticketStatusKo } from '@/lib/displayLabels';
import { getSupabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

type Row = {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  profiles: { nickname: string | null } | null;
};

const TICKET_STATUSES = ['open', 'in_progress', 'answered', 'closed'] as const;

export function InquiriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = useMemo(() => parsePageParam(searchParams.get('page')), [searchParams]);
  const qParam = searchParams.get('q') ?? '';
  const statusFilter = searchParams.get('ticket_status') ?? 'all';

  const [searchDraft, setSearchDraft] = useState(qParam);
  useEffect(() => {
    setSearchDraft(qParam);
  }, [qParam]);

  const q = useQuery({
    queryKey: ['admin-inquiries', page, qParam, statusFilter],
    queryFn: async () => {
      const sb = getSupabase();
      const from = (page - 1) * ADMIN_PAGE_SIZE;
      const to = from + ADMIN_PAGE_SIZE - 1;
      let req = sb
        .from('support_tickets')
        .select('id, user_id, subject, status, created_at, profiles(nickname)', { count: 'exact' });
      if (statusFilter !== 'all' && TICKET_STATUSES.includes(statusFilter as (typeof TICKET_STATUSES)[number])) {
        req = req.eq('status', statusFilter);
      }
      const term = sanitizePostgrestOrTerm(qParam);
      if (term) {
        const p = `%${term}%`;
        req = req.or(`subject.ilike.${p},body.ilike.${p}`);
      }
      const { data, error, count } = await req.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;
      const raw = (data ?? []) as Record<string, unknown>[];
      const rows: Row[] = raw.map((r) => {
        const pr = r.profiles as { nickname?: string | null } | null | undefined;
        return {
          id: String(r.id),
          user_id: String(r.user_id),
          subject: String(r.subject),
          status: String(r.status),
          created_at: String(r.created_at),
          profiles: pr != null ? { nickname: pr.nickname ?? null } : null,
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

  const setTicketStatus = (next: string) => {
    setSearchParams(
      patchSearchParams(searchParams, { ticket_status: next === 'all' ? null : next, page: 1 })
    );
  };

  if (q.isLoading) return <p className="muted">불러오는 중…</p>;
  if (q.isError) return <p className="error">목록을 불러오지 못했습니다.</p>;

  const rows = q.data!.rows;
  const rangeText = formatListRange(Math.min(page, totalPages), ADMIN_PAGE_SIZE, totalCount);

  return (
    <div>
      <h1>문의</h1>
      <p className="muted">페이지당 {ADMIN_PAGE_SIZE}건 · 상태는 답변 여부로 자동 반영됩니다.</p>
      <TableListToolbar rangeText={rangeText}>
        <input
          type="search"
          placeholder="제목·본문 검색"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySearch();
          }}
          aria-label="제목·본문 검색"
        />
        <button type="button" className="filter-btn" onClick={applySearch}>
          검색
        </button>
        <select
          value={statusFilter}
          onChange={(e) => setTicketStatus(e.target.value)}
          aria-label="문의 상태 필터"
        >
          <option value="all">상태 전체</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ticketStatusKo(s)}
            </option>
          ))}
        </select>
      </TableListToolbar>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>제목</th>
              <th>상태</th>
              <th>회원</th>
              <th>접수일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link to={`/inquiries/${r.id}`} className="linkish">
                    {r.subject}
                  </Link>
                </td>
                <td>{ticketStatusKo(r.status)}</td>
                <td>
                  <Link to={`/users/${r.user_id}`} className="linkish">
                    {r.profiles?.nickname?.trim() || '이름 없음'}
                  </Link>
                </td>
                <td>{new Date(r.created_at).toLocaleString('ko-KR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <p className="muted">조건에 맞는 문의가 없습니다.</p> : null}
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
