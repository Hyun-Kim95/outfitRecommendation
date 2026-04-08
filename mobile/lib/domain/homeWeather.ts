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
  condition: string;
};
