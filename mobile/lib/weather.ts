export type WeatherSnapshot = {
  temperature_current: number;
  temperature_feels_like: number;
  temperature_min: number;
  temperature_max: number;
  humidity: number;
  wind_speed: number;
  precipitation_probability: number;
  precipitation_type: string;
  weather_condition: string;
  raw_json: Record<string, unknown>;
};

function wmoLabel(code: number): string {
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
    weather_condition: wmoLabel(code),
    raw_json: { ...data, _region: regionName },
  };
}

export function formatTempRange(min: number, max: number): string {
  return `최저 ${Math.round(min)}° / 최고 ${Math.round(max)}°`;
}
