import type { HomeWeatherPreview } from '@/lib/domain/homeWeather';
import { create } from 'zustand';

/**
 * 홈에서 갱신되는 "오늘" 세션: 날씨 UI, 상황 태그, 추천 ID.
 * 착장 빠른 입력·상세에서 동일 맥락을 이어 쓰기 위해 사용합니다.
 */
type TodayRecommendState = {
  snapshotDate: string | null;
  primaryWeatherLogId: string | null;
  primaryRegionSlug: string | null;
  weatherUi: HomeWeatherPreview | null;
  situationTags: string[];
  recommendedOutfitIds: string[];
  setSession: (partial: Partial<Omit<TodayRecommendState, 'setSession' | 'reset'>>) => void;
  setSituationTags: (tags: string[]) => void;
  reset: () => void;
};

const initial: Omit<TodayRecommendState, 'setSession' | 'setSituationTags' | 'reset'> = {
  snapshotDate: null,
  primaryWeatherLogId: null,
  primaryRegionSlug: null,
  weatherUi: null,
  situationTags: [],
  recommendedOutfitIds: [],
};

export const useTodayRecommendStore = create<TodayRecommendState>((set) => ({
  ...initial,
  setSession: (partial) => set((s) => ({ ...s, ...partial })),
  setSituationTags: (tags) => set({ situationTags: tags }),
  reset: () => set(initial),
}));
