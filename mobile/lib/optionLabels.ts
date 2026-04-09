import type { Locale } from '@/contexts/LocaleContext';

const KO_TO_EN: Record<string, string> = {
  // top
  '반팔 티셔츠': 'Short-sleeve T-shirt',
  티셔츠: 'T-shirt',
  '긴팔 티셔츠': 'Long-sleeve T-shirt',
  맨투맨: 'Sweatshirt',
  후드: 'Hoodie',
  '후드 집업': 'Zip hoodie',
  셔츠: 'Shirt',
  남방: 'Button-up shirt',
  블라우스: 'Blouse',
  니트: 'Knit',
  '가디건형 상의': 'Cardigan top',
  민소매: 'Sleeveless top',
  베스트: 'Vest',
  기타: 'Other',
  // bottom
  '슬림 데님': 'Slim denim',
  '와이드 데님': 'Wide denim',
  슬랙스: 'Slacks',
  '치노·면바지': 'Chino/Cotton pants',
  '조거·트레이닝': 'Jogger/Training pants',
  '조거 트레이닝': 'Jogger/Training pants',
  숏팬츠: 'Shorts',
  '롱 스커트': 'Long skirt',
  '미니 스커트': 'Mini skirt',
  '린넨 팬츠': 'Linen pants',
  레깅스: 'Leggings',
  코듀로이: 'Corduroy',
  // outer
  없음: 'None',
  '얇은 가디건': 'Light cardigan',
  '두꺼운 가디건': 'Heavy cardigan',
  '데님 자켓': 'Denim jacket',
  '캐주얼 자켓': 'Casual jacket',
  블레이저: 'Blazer',
  트렌치코트: 'Trench coat',
  '울·캐시미어 코트': 'Wool/Cashmere coat',
  숏패딩: 'Short padded jacket',
  롱패딩: 'Long padded coat',
  바람막이: 'Windbreaker',
  '후리스·플리스': 'Fleece',
  '가죽 자켓': 'Leather jacket',
  야상: 'Field jacket',
  // shoes
  러닝화: 'Running shoes',
  '캔버스 스니커즈': 'Canvas sneakers',
  '가죽 스니커즈': 'Leather sneakers',
  로퍼: 'Loafers',
  플랫: 'Flats',
  '뮬·슬리퍼': 'Mules/Slippers',
  샌들: 'Sandals',
  '앵클 부츠': 'Ankle boots',
  롱부츠: 'Long boots',
  워커: 'Combat boots',
  구두: 'Dress shoes',
  '방한 부츠': 'Winter boots',
  // accessory
  모자: 'Hat',
  비니: 'Beanie',
  '머플러·스카프': 'Scarf',
  장갑: 'Gloves',
  '양말 두꺼움': 'Thick socks',
  시계: 'Watch',
  '가방·백팩': 'Bag/Backpack',
  벨트: 'Belt',
  '귀걸이·목걸이': 'Earrings/Necklace',
  선글라스: 'Sunglasses',
  '우산·우비': 'Umbrella/Raincoat',
  '기타 소품': 'Other accessories',
  // thickness
  '아주 얇음': 'Very light',
  얇음: 'Light',
  보통: 'Normal',
  두꺼움: 'Thick',
  '아주 두꺼움': 'Very thick',
  // situation tags
  출근: 'Work commute',
  등교: 'School commute',
  데이트: 'Date',
  여행: 'Travel',
  카페: 'Cafe',
  음식점: 'Restaurant',
  사무실: 'Office',
  전철: 'Subway',
  버스: 'Bus',
  '도보 많음': 'Lots of walking',
  '야외 대기': 'Outdoor waiting',
  쇼핑: 'Shopping',
  '장시간 실내': 'Long indoor stay',
  '헬스·운동': 'Workout',
  산책: 'Walk',
  면접: 'Interview',
  '결혼식·행사': 'Wedding/Event',
  '등산·야외': 'Hiking/Outdoor',
  재택: 'Work from home',
  // activity/indoor-outdoor
  낮음: 'Low',
  높음: 'High',
  '실내 위주': 'Mostly indoor',
  균형: 'Balanced',
  '야외 위주': 'Mostly outdoor',
  // feedback time/place/feeling/improvement
  '이른 아침': 'Early morning',
  아침: 'Morning',
  점심: 'Noon',
  오후: 'Afternoon',
  저녁: 'Evening',
  밤: 'Night',
  심야: 'Late night',
  집: 'Home',
  '직장·학교': 'Work/School',
  대중교통: 'Public transport',
  야외: 'Outdoor',
  '실내 매장': 'Indoor store',
  식당: 'Restaurant',
  '운동·헬스': 'Workout/Gym',
  '운전·주차': 'Driving/Parking',
  '기타 장소': 'Other place',
  '딱 좋음': 'Just right',
  '조금 추움': 'Slightly cold',
  '많이 추움': 'Very cold',
  '조금 더움': 'Slightly hot',
  '많이 더움': 'Very hot',
  '바람 때문에 추움': 'Cold because of wind',
  '습해서 불쾌함': 'Humid and uncomfortable',
  '실내에서 더움': 'Too hot indoors',
  '활동하기 불편함': 'Uncomfortable for activity',
  '겉옷 필요': 'Need outerwear',
  '이너 더 얇게': 'Lighter innerwear needed',
  '이너 더 두껍게': 'Thicker innerwear needed',
  '바지 더 두껍게': 'Thicker pants needed',
  '통풍 잘되는 옷 필요': 'Need breathable clothes',
  '방수 필요': 'Need waterproofing',
  '신발 불편': 'Shoes were uncomfortable',
  '실내 대비 필요': 'Need indoor adjustment',
  '탈착 쉬운 아우터 필요': 'Need easy on/off outerwear',
  // timing labels
  '출발 직후': 'Right after departure',
  중간: 'Middle',
  '귀가 후': 'After returning home',
  추가: 'More',
};

export function optionLabel(locale: Locale, value: string): string {
  if (locale !== 'en') return value;
  return KO_TO_EN[value] ?? value;
}

function splitCategoryTokens(raw: string): string[] {
  const out: string[] = [];
  for (const commaPart of raw.split(',')) {
    const part = commaPart.trim();
    if (!part) continue;
    const sub = part.split(/\s*·\s*/).map((x) => x.trim()).filter(Boolean);
    out.push(...sub);
  }
  return out;
}

/** `조거 · 트레이닝` → 두 토큰으로 잘린 경우 복합 바지 옵션으로 복원 */
function mergeSplitCompoundCategoryTokens(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i]!;
    const b = tokens[i + 1];
    if (a === '조거' && b === '트레이닝') {
      out.push('조거 트레이닝');
      i++;
      continue;
    }
    out.push(a);
  }
  return out;
}

export function optionListLabel(locale: Locale, value: string | null | undefined): string {
  if (!value) return '';
  const tokens = mergeSplitCompoundCategoryTokens(splitCategoryTokens(value));
  if (tokens.length === 0) return '';
  return tokens.map((t) => optionLabel(locale, t)).join(' · ');
}
