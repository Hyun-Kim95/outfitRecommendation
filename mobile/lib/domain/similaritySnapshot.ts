import type { Json } from '@/lib/database.types';
import type { WeatherSnapshot } from '@/lib/weather';

/** DB `outfit_logs.similarity_snapshot` v1 스키마 */
export type SimilaritySnapshotV1 = {
  v: 1;
  temperature_current: number;
  temperature_feels_like: number;
  humidity: number;
  wind_speed: number;
  precipitation_probability: number;
  precip_match: boolean;
  situation_tags: string[];
  activity_level: string | null;
  indoor_outdoor: string | null;
  region_label?: string;
  weather_log_id?: string | null;
};

export function feelsLikeBucket(feelsLike: number): number {
  return Math.floor(feelsLike / 2);
}

export function buildSimilaritySnapshotV1(input: {
  weather: WeatherSnapshot;
  regionLabel: string;
  situationTags: string[];
  activityLevel: string | null;
  indoorOutdoor: string | null;
  weatherLogId?: string | null;
}): SimilaritySnapshotV1 {
  const p = input.weather.precipitation_probability;
  return {
    v: 1,
    temperature_current: input.weather.temperature_current,
    temperature_feels_like: input.weather.temperature_feels_like,
    humidity: input.weather.humidity,
    wind_speed: input.weather.wind_speed,
    precipitation_probability: p,
    precip_match: p > 30,
    situation_tags: [...input.situationTags],
    activity_level: input.activityLevel,
    indoor_outdoor: input.indoorOutdoor,
    region_label: input.regionLabel,
    weather_log_id: input.weatherLogId ?? null,
  };
}

export function snapshotToJson(s: SimilaritySnapshotV1): Json {
  return s as unknown as Json;
}

export function parseSimilaritySnapshot(raw: Json | null | undefined): SimilaritySnapshotV1 | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1) return null;
  if (typeof o.temperature_current !== 'number' || typeof o.temperature_feels_like !== 'number') {
    return null;
  }
  return o as unknown as SimilaritySnapshotV1;
}
