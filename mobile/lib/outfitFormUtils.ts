/** 착장 카테고리 필드 저장 형식 (앱 내 join) */
export function joinCategories(parts: string[]): string | null {
  const u = [...new Set(parts)].filter(Boolean);
  return u.length ? u.join(' · ') : null;
}

export function splitCategoryField(s: string | null | undefined): string[] {
  if (!s?.trim()) return [];
  return s
    .split(' · ')
    .map((x) => x.trim())
    .filter(Boolean);
}
