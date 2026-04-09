/** 홈 날씨 히어로 카드용 (API·더미 공통) */
export type HomeWeatherPreview = {
  regionLabel: string;
  temp: number;
  feelsLike: number;
  min: number;
  max: number;
  windMs: number;
  humidity: number;
  rainLikely: boolean;
  /** API·DB 기준 한글 등 원문 (표시는 Locale + weatherCode로 변환) */
  conditionKo: string;
  weatherCode: number;
};
