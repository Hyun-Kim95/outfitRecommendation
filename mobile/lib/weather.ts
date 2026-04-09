import type { Locale } from '@/contexts/LocaleContext';

export type WeatherSnapshot = {
  temperature_current: number;
  temperature_feels_like: number;
  temperature_min: number;
  temperature_max: number;
  humidity: number;
  wind_speed: number;
  precipitation_probability: number;
  precipitation_type: string;
  /** WMO 코드 — UI에서 영어 라벨 등에 사용 */
  weather_code: number;
  weather_condition: string;
  raw_json: Record<string, unknown>;
};

type HourlyPayload = {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  relative_humidity_2m: number[];
  wind_speed_10m: number[];
  weather_code: number[];
  precipitation_probability?: number[];
  precipitation?: number[];
};

function toKstDateParts(date: Date): { ymd: string; hour: number } {
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
  };
}

function pickNearestHourlyIndex(hourly: HourlyPayload, targetHour: number): number {
  if (!hourly.time.length) return 0;
  let bestIdx = 0;
  let bestGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i < hourly.time.length; i += 1) {
    const t = hourly.time[i];
    const hh = Number(t.slice(11, 13));
    const gap = Math.abs(hh - targetHour);
    if (gap < bestGap) {
      bestGap = gap;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function toSnapshotFromHourly(
  data: { hourly: HourlyPayload; daily: { temperature_2m_max: number[]; temperature_2m_min: number[] } },
  targetHour: number,
  regionName?: string
): WeatherSnapshot {
  const idx = pickNearestHourlyIndex(data.hourly, targetHour);
  const pProbFromHourly = data.hourly.precipitation_probability?.[idx];
  const pFromHourly = data.hourly.precipitation?.[idx];
  const pProb = pProbFromHourly ?? (typeof pFromHourly === 'number' && pFromHourly > 0 ? 100 : 0);
  const code = data.hourly.weather_code[idx] ?? 0;
  return {
    temperature_current: data.hourly.temperature_2m[idx] ?? 0,
    temperature_feels_like: data.hourly.apparent_temperature[idx] ?? 0,
    temperature_min: data.daily.temperature_2m_min[0] ?? data.hourly.temperature_2m[idx] ?? 0,
    temperature_max: data.daily.temperature_2m_max[0] ?? data.hourly.temperature_2m[idx] ?? 0,
    humidity: data.hourly.relative_humidity_2m[idx] ?? 0,
    wind_speed: data.hourly.wind_speed_10m[idx] ?? 0,
    precipitation_probability: pProb,
    precipitation_type: pProb > 30 ? 'rain' : 'none',
    weather_code: code,
    weather_condition: wmoLabelKo(code),
    raw_json: { ...data, _region: regionName, _hourly_index: idx },
  };
}

const WMO_CODES = [0, 1, 2, 3, 45, 48, 51, 61, 63, 65, 71, 80, 95] as const;

function wmoLabelKo(code: number): string {
  const map: Record<number, string> = {
    0: '맑음',
    1: '대체로 맑음',
    2: '구름 조금',
    3: '흐림',
    45: '안개',
    48: '안개',
    51: '이슬비',
    61: '비',
    63: '비',
    65: '강한 비',
    71: '눈',
    80: '소나기',
    95: '뇌우',
  };
  return map[code] ?? `기상코드 ${code}`;
}

function wmoLabelEn(code: number): string {
  const map: Record<number, string> = {
    0: 'Clear',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Fog',
    51: 'Drizzle',
    61: 'Rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Snow',
    80: 'Rain showers',
    95: 'Thunderstorm',
  };
  return map[code] ?? `Weather code ${code}`;
}

/** 저장된 한글 체감 날씨 문구 → 영어 (코드 없는 레거시용) */
const KO_WEATHER_TO_EN: Record<string, string> = Object.fromEntries(
  WMO_CODES.map((c) => [wmoLabelKo(c), wmoLabelEn(c)])
);

export function displayWeatherCondition(
  locale: Locale,
  saved: { weather_condition: string; weather_code?: number | null }
): string {
  if (locale === 'ko') return saved.weather_condition;
  if (saved.weather_code != null && Number.isFinite(saved.weather_code)) {
    return wmoLabelEn(saved.weather_code);
  }
  return KO_WEATHER_TO_EN[saved.weather_condition] ?? saved.weather_condition;
}

export function formatTempRange(min: number, max: number, locale: Locale): string {
  if (locale === 'en') {
    return `Low ${Math.round(min)}° / High ${Math.round(max)}°`;
  }
  return `최저 ${Math.round(min)}° / 최고 ${Math.round(max)}°`;
}

export async function fetchOpenMeteoSnapshot(
  lat: number,
  lng: number,
  regionName?: string
): Promise<WeatherSnapshot> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation_probability' +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code' +
    '&timezone=Asia%2FSeoul&forecast_days=1';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`날씨 API 오류: ${res.status}`);
  const data = (await res.json()) as {
    current: {
      temperature_2m: number;
      apparent_temperature: number;
      relative_humidity_2m: number;
      wind_speed_10m: number;
      weather_code: number;
      precipitation_probability?: number;
    };
    daily: {
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
      weather_code: number[];
    };
  };

  const cur = data.current;
  const daily = data.daily;
  const pProb =
    cur.precipitation_probability ?? daily.precipitation_probability_max[0] ?? 0;
  const code = cur.weather_code;

  return {
    temperature_current: cur.temperature_2m,
    temperature_feels_like: cur.apparent_temperature,
    temperature_min: daily.temperature_2m_min[0],
    temperature_max: daily.temperature_2m_max[0],
    humidity: cur.relative_humidity_2m,
    wind_speed: cur.wind_speed_10m,
    precipitation_probability: pProb,
    precipitation_type: pProb > 30 ? 'rain' : 'none',
    weather_code: code,
    weather_condition: wmoLabelKo(code),
    raw_json: { ...data, _region: regionName },
  };
}

export async function fetchOpenMeteoSnapshotAt(
  lat: number,
  lng: number,
  observedAtIso: string,
  regionName?: string
): Promise<WeatherSnapshot> {
  const observedAt = new Date(observedAtIso);
  if (Number.isNaN(observedAt.getTime())) {
    return fetchOpenMeteoSnapshot(lat, lng, regionName);
  }
  const kst = toKstDateParts(observedAt);
  const todayKst = toKstDateParts(new Date());
  const isPastDay = kst.ymd < todayKst.ymd;

  const endpoint = isPastDay
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';

  const url =
    `${endpoint}?latitude=${lat}&longitude=${lng}` +
    `&start_date=${kst.ymd}&end_date=${kst.ymd}` +
    '&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation_probability,precipitation' +
    '&daily=temperature_2m_max,temperature_2m_min' +
    '&timezone=Asia%2FSeoul';

  const res = await fetch(url);
  if (!res.ok) throw new Error(`날씨 API 오류: ${res.status}`);
  const data = (await res.json()) as {
    hourly: HourlyPayload;
    daily: { temperature_2m_max: number[]; temperature_2m_min: number[] };
  };
  if (!data.hourly?.time?.length) {
    return fetchOpenMeteoSnapshot(lat, lng, regionName);
  }
  return toSnapshotFromHourly(data, kst.hour, regionName);
}
