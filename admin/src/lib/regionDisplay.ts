import type { Locale } from '@/context/LocaleContext';

/**
 * `PRESET_REGIONS` 한글 label → `REGION_LABEL_EN` (mobile/lib/regions.ts와 동일 매핑).
 * admin은 모바일 패키지 `@/` 경로를 쓰지 않도록 여기서만 유지.
 */
const PRESET_KO_LABEL_TO_EN: Readonly<Record<string, string>> = Object.freeze({
  서울: 'Seoul',
  부산: 'Busan',
  대구: 'Daegu',
  인천: 'Incheon',
  광주: 'Gwangju',
  대전: 'Daejeon',
  울산: 'Ulsan',
  세종: 'Sejong',
  제주: 'Jeju',
  수원: 'Suwon',
  창원: 'Changwon',
  청주: 'Cheongju',
  성남: 'Seongnam',
  고양: 'Goyang',
  용인: 'Yongin',
  부천: 'Bucheon',
  안산: 'Ansan',
  안양: 'Anyang',
  의정부: 'Uijeongbu',
  화성: 'Hwaseong',
  천안: 'Cheonan',
  평택: 'Pyeongtaek',
  전주: 'Jeonju',
  포항: 'Pohang',
  구미: 'Gumi',
  강릉: 'Gangneung',
  춘천: 'Chuncheon',
  원주: 'Wonju',
  김해: 'Gimhae',
  목포: 'Mokpo',
  여수: 'Yeosu',
  순천: 'Suncheon',
  하남: 'Hanam',
  시흥: 'Siheung',
  광명: 'Gwangmyeong',
  남양주: 'Namyangju',
});

const SEP = ' · ';

/**
 * `profiles.default_region`은 앱 온보딩에서 한글 프리셋 라벨을 ` · `로 이은 문자열로 저장됨.
 * 관리자 영어 UI에서는 프리셋 매핑이 있으면 영어 도시명으로 표시.
 */
export function formatDefaultRegionDisplay(locale: Locale, raw: string | null | undefined): string {
  if (raw == null || raw.trim() === '') return '—';
  if (locale !== 'en') return raw;
  return raw
    .split(/\s*·\s*/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((seg) => PRESET_KO_LABEL_TO_EN[seg] ?? seg)
    .join(SEP);
}
