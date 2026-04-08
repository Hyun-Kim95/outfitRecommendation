/** PRD 6.3~6.6 기반 선택지 (문자열 상수) — 착장 기록 세분화 */

export const TOP_OPTIONS = [
  '반팔 티셔츠',
  '긴팔 티셔츠',
  '맨투맨',
  '후드',
  '후드 집업',
  '셔츠',
  '남방',
  '블라우스',
  '니트',
  '가디건형 상의',
  '민소매',
  '베스트',
  '기타',
] as const;

export const BOTTOM_OPTIONS = [
  '슬림 데님',
  '와이드 데님',
  '슬랙스',
  '치노·면바지',
  '조거·트레이닝',
  '숏팬츠',
  '롱 스커트',
  '미니 스커트',
  '린넨 팬츠',
  '레깅스',
  '코듀로이',
  '기타',
] as const;

export const OUTER_OPTIONS = [
  '없음',
  '얇은 가디건',
  '두꺼운 가디건',
  '데님 자켓',
  '캐주얼 자켓',
  '블레이저',
  '트렌치코트',
  '울·캐시미어 코트',
  '숏패딩',
  '롱패딩',
  '바람막이',
  '후리스·플리스',
  '가죽 자켓',
  '야상',
  '기타',
] as const;

export const SHOES_OPTIONS = [
  '러닝화',
  '캔버스 스니커즈',
  '가죽 스니커즈',
  '로퍼',
  '플랫',
  '뮬·슬리퍼',
  '샌들',
  '앵클 부츠',
  '롱부츠',
  '워커',
  '구두',
  '방한 부츠',
  '기타',
] as const;

/** 액세서리·소품 (다중 선택) */
export const ACCESSORY_OPTIONS = [
  '모자',
  '비니',
  '머플러·스카프',
  '장갑',
  '양말 두꺼움',
  '시계',
  '가방·백팩',
  '벨트',
  '귀걸이·목걸이',
  '선글라스',
  '우산·우비',
  '기타 소품',
] as const;

/** 전체 두께감 (단일) */
export const THICKNESS_OPTIONS = ['아주 얇음', '얇음', '보통', '두꺼움', '아주 두꺼움'] as const;

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
  '헬스·운동',
  '산책',
  '면접',
  '결혼식·행사',
  '등산·야외',
  '재택',
] as const;

export const TRANSPORT_OPTIONS = ['도보', '버스', '지하철', '자가용', '자전거', '킥보드', '기타'] as const;
export const ACTIVITY_OPTIONS = ['낮음', '보통', '높음'] as const;
export const INDOOR_OUTDOOR_OPTIONS = ['실내 위주', '균형', '야외 위주'] as const;

/** 감상 기록 시간대 (단일 선택) */
export const FEEDBACK_TIME_OPTIONS = [
  '이른 아침',
  '아침',
  '점심',
  '오후',
  '저녁',
  '밤',
  '심야',
] as const;

/** 감상 기록 — 한 장소 모드일 때 장소 (단일 선택) */
export const FEEDBACK_PLACE_OPTIONS = [
  '집',
  '직장·학교',
  '대중교통',
  '야외',
  '실내 매장',
  '카페',
  '식당',
  '운동·헬스',
  '운전·주차',
  '기타 장소',
] as const;

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
