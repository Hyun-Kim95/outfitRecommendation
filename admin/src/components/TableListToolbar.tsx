import type { ReactNode } from 'react';

type Props = {
  /** 예: "1–20 / 전체 100건" */
  rangeText: string;
  children?: ReactNode;
};

/** 테이블 상단: 좌측 건수, 우측 검색·필터 */
export function TableListToolbar({ rangeText, children }: Props) {
  return (
    <div className="table-list-toolbar">
      <p className="table-list-count">{rangeText}</p>
      {children ? <div className="table-list-filters">{children}</div> : null}
    </div>
  );
}
