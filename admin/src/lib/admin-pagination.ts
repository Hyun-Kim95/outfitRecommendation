export const ADMIN_PAGE_SIZE = 15;

export function parsePageParam(raw: string | null): number {
  const n = parseInt(raw ?? '1', 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export function totalPagesFromCount(count: number | null | undefined, pageSize: number): number {
  const c = count ?? 0;
  return Math.max(1, Math.ceil(c / pageSize));
}

/** 목록 화면 URL 파라미터 병합 (빈 값은 키 제거) */
export function patchSearchParams(
  current: URLSearchParams,
  updates: Record<string, string | number | null | undefined>
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [k, v] of Object.entries(updates)) {
    if (v === null || v === undefined || v === '') next.delete(k);
    else next.set(k, String(v));
  }
  return next;
}

/** ilike 검색어에서 % _ 와일드카드 완화 */
export function sanitizeIlikeTerm(s: string): string {
  return s.trim().replace(/[%_]/g, '');
}

/** PostgREST `.or()` 문자열 안에서 조건을 나누는 쉼표와 충돌하지 않도록 */
export function sanitizePostgrestOrTerm(s: string): string {
  return sanitizeIlikeTerm(s).replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(s: string): boolean {
  return UUID_RE.test(s.trim());
}

