import type { Locale } from '@/contexts/LocaleContext';

/** 온보딩·날씨용 프리셋 지역 (좌표 고정, 최대 3개까지 선택) */
export type PresetRegion = {
  slug: string;
  label: string;
  lat: number;
  lng: number;
};

/** 광역·주요 기초·지방 거점 위주 (Open-Meteo 근사 좌표) */
export const PRESET_REGIONS: readonly PresetRegion[] = [
  { slug: 'seoul', label: '서울', lat: 37.5665, lng: 126.978 },
  { slug: 'busan', label: '부산', lat: 35.1796, lng: 129.0756 },
  { slug: 'daegu', label: '대구', lat: 35.8714, lng: 128.6014 },
  { slug: 'incheon', label: '인천', lat: 37.4563, lng: 126.7052 },
  { slug: 'gwangju', label: '광주', lat: 35.1595, lng: 126.8526 },
  { slug: 'daejeon', label: '대전', lat: 36.3504, lng: 127.3845 },
  { slug: 'ulsan', label: '울산', lat: 35.5384, lng: 129.3114 },
  { slug: 'sejong', label: '세종', lat: 36.48, lng: 127.289 },
  { slug: 'jeju', label: '제주', lat: 33.4996, lng: 126.5312 },
  { slug: 'suwon', label: '수원', lat: 37.2636, lng: 127.0286 },
  { slug: 'changwon', label: '창원', lat: 35.2283, lng: 128.6811 },
  { slug: 'cheongju', label: '청주', lat: 36.6424, lng: 127.489 },
  { slug: 'seongnam', label: '성남', lat: 37.4201, lng: 127.1267 },
  { slug: 'goyang', label: '고양', lat: 37.6584, lng: 126.832 },
  { slug: 'yongin', label: '용인', lat: 37.2411, lng: 127.1776 },
  { slug: 'bucheon', label: '부천', lat: 37.5036, lng: 126.766 },
  { slug: 'ansan', label: '안산', lat: 37.3219, lng: 126.8309 },
  { slug: 'anyang', label: '안양', lat: 37.3925, lng: 126.9269 },
  { slug: 'uijeongbu', label: '의정부', lat: 37.7411, lng: 127.0336 },
  { slug: 'hwaseong', label: '화성', lat: 37.1996, lng: 126.8311 },
  { slug: 'cheonan', label: '천안', lat: 36.8151, lng: 127.1139 },
  { slug: 'pyeongtaek', label: '평택', lat: 36.9947, lng: 127.0889 },
  { slug: 'jeonju', label: '전주', lat: 35.8242, lng: 127.148 },
  { slug: 'pohang', label: '포항', lat: 36.019, lng: 129.3435 },
  { slug: 'gumi', label: '구미', lat: 36.1195, lng: 128.3446 },
  { slug: 'gangneung', label: '강릉', lat: 37.7519, lng: 128.8761 },
  { slug: 'chuncheon', label: '춘천', lat: 37.8813, lng: 127.7298 },
  { slug: 'wonju', label: '원주', lat: 37.3512, lng: 127.9502 },
  { slug: 'gimhae', label: '김해', lat: 35.2341, lng: 128.8811 },
  { slug: 'mokpo', label: '목포', lat: 34.8118, lng: 126.3922 },
  { slug: 'yeosu', label: '여수', lat: 34.7604, lng: 127.6622 },
  { slug: 'suncheon', label: '순천', lat: 34.9507, lng: 127.4875 },
  { slug: 'hanam', label: '하남', lat: 37.5399, lng: 127.2147 },
  { slug: 'siheung', label: '시흥', lat: 37.3806, lng: 126.8031 },
  { slug: 'gwangmyeong', label: '광명', lat: 37.4777, lng: 126.8664 },
  { slug: 'namyangju', label: '남양주', lat: 37.6367, lng: 127.2163 },
] as const;

export function findPresetBySlug(slug: string): PresetRegion | undefined {
  return PRESET_REGIONS.find((r) => r.slug === slug);
}

/** 영어 UI용 — slug 기준 (DB 저장 라벨은 한글 유지 가능) */
export const REGION_LABEL_EN: Record<string, string> = {
  seoul: 'Seoul',
  busan: 'Busan',
  daegu: 'Daegu',
  incheon: 'Incheon',
  gwangju: 'Gwangju',
  daejeon: 'Daejeon',
  ulsan: 'Ulsan',
  sejong: 'Sejong',
  jeju: 'Jeju',
  suwon: 'Suwon',
  changwon: 'Changwon',
  cheongju: 'Cheongju',
  seongnam: 'Seongnam',
  goyang: 'Goyang',
  yongin: 'Yongin',
  bucheon: 'Bucheon',
  ansan: 'Ansan',
  anyang: 'Anyang',
  uijeongbu: 'Uijeongbu',
  hwaseong: 'Hwaseong',
  cheonan: 'Cheonan',
  pyeongtaek: 'Pyeongtaek',
  jeonju: 'Jeonju',
  pohang: 'Pohang',
  gumi: 'Gumi',
  gangneung: 'Gangneung',
  chuncheon: 'Chuncheon',
  wonju: 'Wonju',
  gimhae: 'Gimhae',
  mokpo: 'Mokpo',
  yeosu: 'Yeosu',
  suncheon: 'Suncheon',
  hanam: 'Hanam',
  siheung: 'Siheung',
  gwangmyeong: 'Gwangmyeong',
  namyangju: 'Namyangju',
};

/** `default_region` 문자열(한글 프리셋 라벨을 ` · `로 연결) → 영어 표기 */
const PRESET_KO_LABEL_TO_EN: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(PRESET_REGIONS.map((r) => [r.label, REGION_LABEL_EN[r.slug] ?? r.label]))
);

export function formatDefaultRegionForLocale(locale: Locale, raw: string | null | undefined): string {
  if (!raw?.trim()) return '';
  if (locale !== 'en') return raw;
  return raw
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => PRESET_KO_LABEL_TO_EN[seg] ?? seg)
    .join(' · ');
}

export function presetRegionDisplayLabel(p: PresetRegion, locale: Locale): string {
  if (locale === 'ko') return p.label;
  return REGION_LABEL_EN[p.slug] ?? p.label;
}

/** activity_regions JSON 등 — 슬러그가 알려진 프리셋이면 영어 라벨 */
export function activityRegionDisplayLabel(
  r: { slug: string; label: string },
  locale: Locale
): string {
  if (locale === 'ko') return r.label;
  const preset = findPresetBySlug(r.slug);
  if (preset) return presetRegionDisplayLabel(preset, locale);
  return r.label;
}
