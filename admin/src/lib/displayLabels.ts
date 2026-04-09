import type { Locale } from '@/context/LocaleContext';

/** DB 영문 값 → 관리자 화면 한글 */

export function sensitivityKo(v: string | null | undefined): string {
  if (v == null || v === '') return '—';
  const m: Record<string, string> = {
    low: '낮음',
    normal: '보통',
    high: '높음',
  };
  return m[v] ?? v;
}

export function ticketStatusKo(status: string): string {
  const m: Record<string, string> = {
    open: '접수됨',
    in_progress: '처리 중',
    answered: '답변 완료',
    closed: '종료',
  };
  return m[status] ?? status;
}

const TICKET_STATUS_EN: Record<string, string> = {
  open: 'Open',
  in_progress: 'In progress',
  answered: 'Answered',
  closed: 'Closed',
};

export function ticketStatusLabel(status: string, locale: Locale): string {
  if (locale === 'en') return TICKET_STATUS_EN[status] ?? status.replace(/_/g, ' ');
  return ticketStatusKo(status);
}
