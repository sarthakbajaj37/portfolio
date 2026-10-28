// Weather data layer on top of Open-Meteo (free, no API key).

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";

export type City = { id: string; name: string; region?: string; lat: number; lon: number };

export type CurrentWeather = {
  city: string;
  temp: number;
  condition: string;
  code: number;
  high: number;
  low: number;
  isDay: boolean;
};

/** Raw forecast, always in °C / km/h / metres. */
export type Forecast = {
  timezone: string;
  utcOffsetSeconds: number;
  current: {
    time: string;
    temp: number;
    apparent: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    code: number;
    isDay: boolean;
  };
  hourly: { time: string; temp: number; code: number; isDay: boolean }[];
  daily: { date: string; max: number; min: number; code: number; sunrise: string; sunset: string; uv: number }[];
  visibility: number | null;
  fetchedAt: number;
};

export const BANGALORE: City = { id: "bangalore", name: "Bangalore", region: "Karnataka, India", lat: 12.97, lon: 77.59 };

export const DEFAULT_CITIES: City[] = [
  BANGALORE,
  { id: "mumbai", name: "Mumbai", region: "Maharashtra, India", lat: 19.08, lon: 72.88 },
  { id: "new-delhi", name: "New Delhi", region: "Delhi, India", lat: 28.61, lon: 77.21 },
  { id: "gurugram", name: "Gurugram", region: "Haryana, India", lat: 28.46, lon: 77.03 },
  { id: "chandigarh", name: "Chandigarh", region: "India", lat: 30.73, lon: 76.78 },
  { id: "san-francisco", name: "San Francisco", region: "California, USA", lat: 37.77, lon: -122.42 },
  { id: "london", name: "London", region: "England, UK", lat: 51.51, lon: -0.13 },
  { id: "new-york", name: "New York", region: "New York, USA", lat: 40.71, lon: -74.01 },
];

// ---------- weather codes ----------

const CONDITIONS: Record<number, string> = {
  0: "Clear",
  1: "Mostly Clear",
  2: "Partly Cloudy",
  3: "Cloudy",
  45: "Foggy",
  48: "Freezing Fog",
  51: "Light Drizzle",
  53: "Drizzle",
  55: "Heavy Drizzle",
  56: "Freezing Drizzle",
  57: "Freezing Drizzle",
  61: "Light Rain",
  63: "Rain",
  65: "Heavy Rain",
  66: "Freezing Rain",
  67: "Freezing Rain",
  71: "Light Snow",
  73: "Snow",
  75: "Heavy Snow",
  77: "Snow Grains",
  80: "Rain Showers",
  81: "Rain Showers",
  82: "Heavy Showers",
  85: "Snow Showers",
  86: "Heavy Snow Showers",
  95: "Thunderstorms",
  96: "Thunderstorms with Hail",
  99: "Thunderstorms with Hail",
};

export function weatherCodeToCondition(code: number): string {
  return CONDITIONS[code] ?? "Unknown";
}

export type SkyKind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export function weatherCodeToSky(code: number): SkyKind {
  if (code <= 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "cloudy";
}

export function weatherCodeToIcon(code: number, isDay = true): LucideIcon {
  switch (weatherCodeToSky(code)) {
    case "clear":
      return isDay ? Sun : Moon;
    case "partly":
      return isDay ? CloudSun : CloudMoon;
    case "cloudy":
      return Cloud;
    case "fog":
      return CloudFog;
    case "drizzle":
      return CloudDrizzle;
    case "rain":
      return CloudRain;
    case "snow":
      return CloudSnow;
    case "storm":
      return CloudLightning;
  }
}

// ---------- units (shared preference) ----------

export type TempUnit = "C" | "F";
const UNIT_KEY = "sb-weather-unit";
const unitListeners = new Set<() => void>();

function readUnit(): TempUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === "F" ? "F" : "C";
  } catch {
    return "C";
  }
}

export function setTempUnit(unit: TempUnit) {
  try {
    localStorage.setItem(UNIT_KEY, unit);
  } catch {}
  unitListeners.forEach((l) => l());
}

function subscribeUnit(cb: () => void) {
  unitListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === UNIT_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    unitListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTempUnit(): TempUnit {
  return useSyncExternalStore(subscribeUnit, readUnit, () => "C");
}

/** Convert a °C value to the chosen unit and round. */
export function toUnit(celsius: number, unit: TempUnit) {
  return Math.round(unit === "F" ? (celsius * 9) / 5 + 32 : celsius);
}

// ---------- fetching ----------

export async function fetchForecast(lat: number, lon: number, signal?: AbortSignal): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day",
    hourly: "temperature_2m,weather_code,is_day,visibility",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
    timezone: "auto",
    forecast_days: "10",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!res.ok) throw new Error(`Forecast request failed (${res.status})`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j: any = await res.json();

  const curTime: string = j.current.time;
  const curHour = curTime.slice(0, 13); // 'YYYY-MM-DDTHH'
  const times: string[] = j.hourly.time;
  let startIdx = times.findIndex((t) => t.slice(0, 13) >= curHour);
  if (startIdx < 0) startIdx = 0;

  return {
    timezone: j.timezone,
    utcOffsetSeconds: j.utc_offset_seconds ?? 0,
    current: {
      time: curTime,
      temp: j.current.temperature_2m,
      apparent: j.current.apparent_temperature,
      humidity: j.current.relative_humidity_2m,
      windSpeed: j.current.wind_speed_10m,
      windDirection: j.current.wind_direction_10m,
      code: j.current.weather_code,
      isDay: j.current.is_day === 1,
    },
    hourly: times.slice(startIdx, startIdx + 25).map((t, k) => ({
      time: t,
      temp: j.hourly.temperature_2m[startIdx + k],
      code: j.hourly.weather_code[startIdx + k],
      isDay: j.hourly.is_day[startIdx + k] === 1,
    })),
    daily: (j.daily.time as string[]).map((d, k) => ({
      date: d,
      max: j.daily.temperature_2m_max[k],
      min: j.daily.temperature_2m_min[k],
      code: j.daily.weather_code[k],
      sunrise: j.daily.sunrise[k],
      sunset: j.daily.sunset[k],
      uv: j.daily.uv_index_max[k],
    })),
    visibility: j.hourly.visibility?.[startIdx] ?? null,
    fetchedAt: Date.now(),
  };
}

export type GeoResult = City & { country?: string };

export async function searchCities(name: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=5&language=en&format=json`,
    { signal },
  );
  if (!res.ok) throw new Error("Search failed");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const j: any = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((j.results ?? []) as any[]).map((r) => ({
    id: `geo-${r.id}`,
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(", "),
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
  }));
}

// ---------- current weather hook (Notification Center widget) ----------

const CURRENT_KEY = "sb-weather-current-v1";
const TTL = 10 * 60 * 1000;

type CachedCurrent = { ts: number; temp: number; code: number; high: number; low: number; isDay: boolean };

function readCachedCurrent(): CachedCurrent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as CachedCurrent;
    return Date.now() - c.ts < TTL ? c : null;
  } catch {
    return null;
  }
}

/** Current Bangalore weather, cached in sessionStorage for 10 minutes, in the user's °C/°F unit. */
export function useCurrentWeather(): CurrentWeather | null {
  const unit = useTempUnit();
  const [data, setData] = useState<CachedCurrent | null>(readCachedCurrent);

  useEffect(() => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      const cached = readCachedCurrent();
      if (cached) {
        setData(cached);
        timer = setTimeout(load, Math.max(5_000, TTL - (Date.now() - cached.ts)));
        return;
      }
      fetchForecast(BANGALORE.lat, BANGALORE.lon, ctrl.signal)
        .then((f) => {
          const next: CachedCurrent = {
            ts: Date.now(),
            temp: f.current.temp,
            code: f.current.code,
            high: f.daily[0]?.max ?? f.current.temp,
            low: f.daily[0]?.min ?? f.current.temp,
            isDay: f.current.isDay,
          };
          try {
            sessionStorage.setItem(CURRENT_KEY, JSON.stringify(next));
          } catch {}
          setData(next);
          timer = setTimeout(load, TTL);
        })
        .catch(() => {
          if (!ctrl.signal.aborted) timer = setTimeout(load, 60_000);
        });
    };
    // Defer so we never set state synchronously inside the effect body.
    timer = setTimeout(load, 0);
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, []);

  if (!data) return null;
  return {
    city: BANGALORE.name,
    temp: toUnit(data.temp, unit),
    condition: weatherCodeToCondition(data.code),
    code: data.code,
    high: toUnit(data.high, unit),
    low: toUnit(data.low, unit),
    isDay: data.isDay,
  };
}
