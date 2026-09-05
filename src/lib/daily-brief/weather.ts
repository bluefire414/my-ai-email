import { fetchWithTimeout } from "./fetch";
import type { Weather } from "./types";

/** Taipei City Hall — the default when the caller does not pass coordinates. */
export const DEFAULT_LOCATION = { name: "台北", latitude: 25.033, longitude: 121.5654 };

/** WMO weather interpretation codes used by Open-Meteo. */
const WEATHER_CODES: Record<number, string> = {
  0: "晴朗",
  1: "大致晴朗",
  2: "多雲時晴",
  3: "陰天",
  45: "有霧",
  48: "凍霧",
  51: "毛毛雨",
  53: "毛毛雨",
  55: "毛毛雨（較大）",
  56: "凍毛毛雨",
  57: "凍毛毛雨（較大）",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "凍雨",
  67: "強凍雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪珠",
  80: "陣雨",
  81: "較強陣雨",
  82: "劇烈陣雨",
  85: "陣雪",
  86: "強陣雪",
  95: "雷雨",
  96: "雷雨伴冰雹",
  99: "強雷雨伴冰雹",
};

interface OpenMeteoResponse {
  current?: { temperature_2m?: number };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
  };
}

/** Today's forecast from Open-Meteo (free, no API key). */
export async function getWeather(
  location = DEFAULT_LOCATION,
  timezone = "Asia/Taipei",
): Promise<Weather> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${location.latitude}&longitude=${location.longitude}` +
    "&current=temperature_2m" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    `&timezone=${encodeURIComponent(timezone)}&forecast_days=1`;

  const res = await fetchWithTimeout(url);
  const json: OpenMeteoResponse = await res.json();
  const daily = json.daily;

  if (!daily?.time?.length) {
    throw new Error("Open-Meteo 未回傳今日預報");
  }

  const code = daily.weather_code?.[0];

  return {
    location: location.name,
    date: daily.time[0],
    description: code === undefined ? "未知" : (WEATHER_CODES[code] ?? `天氣代碼 ${code}`),
    currentTemp: json.current?.temperature_2m ?? null,
    maxTemp: daily.temperature_2m_max?.[0] ?? null,
    minTemp: daily.temperature_2m_min?.[0] ?? null,
    precipitationProbability: daily.precipitation_probability_max?.[0] ?? null,
  };
}
