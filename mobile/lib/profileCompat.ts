import type { Database } from '@/lib/database.types';
import type { PresetRegion } from '@/lib/regions';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type ActivityRegion = {
  slug: string;
  label: string;
  lat: number;
  lng: number;
};

function isActivityRegion(x: unknown): x is ActivityRegion {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.slug === 'string' &&
    typeof o.label === 'string' &&
    typeof o.lat === 'number' &&
    typeof o.lng === 'number'
  );
}

/** DB activity_regions JSON 또는 구 default_lat/lng/region 에서 활동 지역 목록 (1~3개 권장) */
export function getActivityRegionsFromProfile(profile: Profile | null): ActivityRegion[] {
  if (!profile) {
    return [{ slug: 'seoul', label: '서울', lat: 37.5665, lng: 126.978 }];
  }
  const raw = profile.activity_regions;
  if (Array.isArray(raw)) {
    const parsed = raw.filter(isActivityRegion);
    if (parsed.length > 0) return parsed.slice(0, 3);
  }
  if (profile.default_lat != null && profile.default_lng != null) {
    return [
      {
        slug: 'legacy',
        label: profile.default_region?.trim() || '저장된 지역',
        lat: profile.default_lat,
        lng: profile.default_lng,
      },
    ];
  }
  return [{ slug: 'seoul', label: '서울', lat: 37.5665, lng: 126.978 }];
}

/** 추천·유사일 등 “대표 좌표” — 첫 활동 지역 */
export function getPrimaryCoords(profile: Profile | null): { lat: number; lng: number; label: string } {
  const [first] = getActivityRegionsFromProfile(profile);
  return { lat: first.lat, lng: first.lng, label: first.label };
}

/** outfit 등 오늘 날씨 FK용 — 첫 활동 지역의 slug */
export function getPrimaryRegionSlug(profile: Profile | null): string {
  const [first] = getActivityRegionsFromProfile(profile);
  return first.slug;
}

/** 주 이동 수단 배열 (구 default_transport 폴백) */
export function getDefaultTransportsFromProfile(profile: Profile | null): string[] {
  if (!profile) return [];
  const arr = profile.default_transports;
  if (Array.isArray(arr) && arr.length > 0) {
    return arr.filter((t): t is string => typeof t === 'string' && t.length > 0);
  }
  if (profile.default_transport?.trim()) {
    return [profile.default_transport.trim()];
  }
  return [];
}

export function activityLevelFromTransports(transports: string[]): '높음' | '보통' {
  return transports.includes('도보') ? '높음' : '보통';
}

/** 온보딩 저장용: 라벨 나열 · admin 목록용 */
export function summarizeRegionLabels(regions: PresetRegion[] | ActivityRegion[]): string {
  return regions.map((r) => r.label).join(' · ');
}
