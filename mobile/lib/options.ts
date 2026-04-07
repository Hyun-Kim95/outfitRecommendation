/** PRD 6.3~6.6 기반 선택지 (MVP 문자열 상수) */

export const TOP_OPTIONS = ['티셔츠', '셔츠', '니트', '후드', '블라우스', '기타'] as const;
export const BOTTOM_OPTIONS = ['청바지', '슬랙스', '치마', '반바지', '트레이닝', '기타'] as const;
export const OUTER_OPTIONS = ['없음', '가디건', '자켓', '코트', '패딩', '바람막이', '기타'] as const;
export const SHOES_OPTIONS = ['운동화', '로퍼', '부츠', '샌들', '기타'] as const;

export const SITUATION_TAGS = [
  '출근',
  '등교',
  '데이트',
  '여행',
  '카페',
  '음식점',
  '사무실',
  '전철',
  '버스',
  '도보 많음',
  '야외 대기',
  '쇼핑',
  '장시간 실내',
] as const;

export const TRANSPORT_OPTIONS = ['도보', '버스', '지하철', '자가용', '자전거', '기타'] as const;
export const ACTIVITY_OPTIONS = ['낮음', '보통', '높음'] as const;
export const INDOOR_OUTDOOR_OPTIONS = ['실내 위주', '균형', '야외 위주'] as const;

export const FEELING_OPTIONS = [
  '딱 좋음',
  '조금 추움',
  '많이 추움',
  '조금 더움',
  '많이 더움',
  '바람 때문에 추움',
  '습해서 불쾌함',
  '실내에서 더움',
  '활동하기 불편함',
] as const;

export const IMPROVEMENT_TAGS = [
  '겉옷 필요',
  '이너 더 얇게',
  '이너 더 두껍게',
  '바지 더 두껍게',
  '통풍 잘되는 옷 필요',
  '방수 필요',
  '신발 불편',
  '실내 대비 필요',
  '탈착 쉬운 아우터 필요',
] as const;

export const SENSITIVITY_OPTIONS = [
  { value: 'low' as const, label: '낮음' },
  { value: 'normal' as const, label: '보통' },
  { value: 'high' as const, label: '높음' },
];
