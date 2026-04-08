import { useMemo } from 'react';

type Props = {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (next: number) => void;
};

/** 테이블 하단 중앙: ‹ › 꺽쇠 + 페이지 번호 (한 줄) */
function buildPageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 0) return [];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let d = -1; d <= 1; d++) {
    const p = current + d;
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && prev !== undefined && n - prev > 1) out.push('gap');
    out.push(n);
  }
  return out;
}

export function PaginationBar({ page, totalPages, totalCount, pageSize: _pageSize, onPageChange }: Props) {
  const pageItems = useMemo(() => buildPageList(page, totalPages), [page, totalPages]);

  if (totalCount === 0) return null;

  return (
    <nav className="pagination-shell pagination-shell--footer" aria-label="페이지 이동">
      <div className="pagination-nav">
        <button
          type="button"
          className="pagination-chevron"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="이전 페이지"
        >
          ‹
        </button>
        <div className="pagination-pages">
          {pageItems.map((item, i) =>
            item === 'gap' ? (
              <span key={`gap-${i}`} className="pagination-gap" aria-hidden>
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                className={`pagination-page${item === page ? ' is-current' : ''}`}
                onClick={() => onPageChange(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            )
          )}
        </div>
        <button
          type="button"
          className="pagination-chevron"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="다음 페이지"
        >
          ›
        </button>
      </div>
    </nav>
  );
}

/** 상단 좌측 건수 문구용 */
export function formatListRange(page: number, pageSize: number, totalCount: number): string {
  if (totalCount === 0) return '전체 0건';
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  return `${from}–${to} / 전체 ${totalCount}건`;
}
