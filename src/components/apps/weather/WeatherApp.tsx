"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  Clock,
  Droplets,
  Eye,
  List,
  Loader2,
  MapPin,
  Search,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  WifiOff,
  X,
} from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { useSettings } from "@/lib/settings";
import {
  BANGALORE,
  DEFAULT_CITIES,
  fetchForecast,
  searchCities,
  setTempUnit,
  toUnit,
  useTempUnit,
  weatherCodeToCondition,
  weatherCodeToIcon,
  type City,
  type Forecast,
  type GeoResult,
  type TempUnit,
} from "@/lib/weather";
import { Sky, skyGradient } from "./Sky";

const CITIES_KEY = "sb-weather-cities-v1";
const FORECAST_KEY = "sb-weather-forecasts-v1";
const TTL = 10 * 60 * 1000;

type Entry = Forecast | { error: string };
const isError = (e: Entry | undefined): e is { error: string } => !!e && "error" in e;

function loadCities(): City[] {
  try {
    const raw = localStorage.getItem(CITIES_KEY);
    const saved = raw ? (JSON.parse(raw) as City[]) : null;
    if (Array.isArray(saved) && saved.length) {
      return saved.some((c) => c.id === BANGALORE.id) ? saved : [BANGALORE, ...saved];
    }
  } catch {}
  return DEFAULT_CITIES;
}

function saveCities(cities: City[]) {
  try {
    localStorage.setItem(CITIES_KEY, JSON.stringify(cities));
  } catch {}
}

function loadForecastCache(): Record<string, Entry> {
  try {
    const raw = sessionStorage.getItem(FORECAST_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, Forecast>) : {};
    const fresh: Record<string, Entry> = {};
    for (const [id, f] of Object.entries(all)) if (Date.now() - f.fetchedAt < TTL) fresh[id] = f;
    return fresh;
  } catch {
    return {};
  }
}

function saveForecastCache(entries: Record<string, Entry>) {
  try {
    const ok = Object.fromEntries(Object.entries(entries).filter(([, e]) => !isError(e)));
    sessionStorage.setItem(FORECAST_KEY, JSON.stringify(ok));
  } catch {}
}

function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ---------- formatting ----------

const pad = (n: number) => String(n).padStart(2, "0");

function fmtClock(h: number, m: number, hour24: boolean) {
  if (hour24) return `${pad(h)}:${pad(m)}`;
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

/** 'YYYY-MM-DDTHH:mm' (already in the city's local time) → label */
function fmtLocalTime(iso: string, hour24: boolean) {
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return fmtClock(h, m, hour24);
}

function fmtHour(iso: string, hour24: boolean) {
  const h = Number(iso.slice(11, 13));
  if (hour24) return pad(h);
  return `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "AM" : "PM"}`;
}

function cityLocalTime(f: Forecast, now: number, hour24: boolean) {
  const d = new Date(now + f.utcOffsetSeconds * 1000);
  return fmtClock(d.getUTCHours(), d.getUTCMinutes(), hour24);
}

function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short" });
}

function uvLevel(uv: number) {
  if (uv < 3) return "Low";
  if (uv < 6) return "Moderate";
  if (uv < 8) return "High";
  if (uv < 11) return "Very High";
  return "Extreme";
}

function compass(deg: number) {
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
}

// ---------- app ----------

export function WeatherApp({ mobile }: AppProps) {
  const { settings } = useSettings();
  const hour24 = settings.clock.hour24;
  const unit = useTempUnit();
  const now = useMinuteClock();

  const [cities, setCities] = useState<City[]>(loadCities);
  const [selectedId, setSelectedId] = useState(BANGALORE.id);
  const [forecasts, setForecasts] = useState<Record<string, Entry>>(loadForecastCache);
  const [screen, setScreen] = useState<"detail" | "list">("detail");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; items: GeoResult[] | null; error?: boolean }>({ q: "", items: null });
  const inflight = useRef(new Set<string>());

  // Fetch forecasts for every listed city we don't have yet.
  useEffect(() => {
    for (const city of cities) {
      if (forecasts[city.id] || inflight.current.has(city.id)) continue;
      inflight.current.add(city.id);
      fetchForecast(city.lat, city.lon)
        .then((f) => {
          setForecasts((prev) => {
            const next = { ...prev, [city.id]: f };
            saveForecastCache(next);
            return next;
          });
        })
        .catch((err: unknown) => {
          setForecasts((prev) => ({
            ...prev,
            [city.id]: { error: typeof navigator !== "undefined" && !navigator.onLine ? "You're offline." : String((err as Error)?.message ?? err) },
          }));
        })
        .finally(() => inflight.current.delete(city.id));
    }
  }, [cities, forecasts]);

  // Debounced geocoding search.
  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      searchCities(q, ctrl.signal)
        .then((items) => setResults({ q, items }))
        .catch(() => {
          if (!ctrl.signal.aborted) setResults({ q, items: [], error: true });
        });
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const searching = q.length >= 2;
  const resultItems = results.q === q ? results.items : null;

  const commitCities = (next: City[]) => {
    setCities(next);
    saveCities(next);
  };

  const addCity = (c: GeoResult) => {
    const dup = cities.find((x) => Math.abs(x.lat - c.lat) < 0.05 && Math.abs(x.lon - c.lon) < 0.05);
    if (!dup) commitCities([...cities, { id: c.id, name: c.name, region: c.region, lat: c.lat, lon: c.lon }]);
    setSelectedId(dup?.id ?? c.id);
    setQuery("");
    setScreen("detail");
  };

  const removeCity = (id: string) => {
    if (id === BANGALORE.id) return;
    commitCities(cities.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(BANGALORE.id);
  };

  const retry = (id: string) =>
    setForecasts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const selected = cities.find((c) => c.id === selectedId) ?? cities[0];
  const entry = forecasts[selected.id];

  const sidebar = (
    <aside
      className={
        mobile
          ? "flex h-full w-full flex-col bg-neutral-50 dark:bg-neutral-900"
          : "flex h-full w-[250px] shrink-0 flex-col border-r border-black/10 bg-neutral-50/80 dark:border-white/10 dark:bg-neutral-900/60"
      }
    >
      <div className="flex items-center gap-2 p-3 pb-2">
        {mobile && (
          <button type="button" onClick={() => setScreen("detail")} className="flex items-center text-[15px] text-[#007aff]">
            <ChevronLeft size={20} /> Back
          </button>
        )}
        <label className="flex flex-1 items-center gap-1.5 rounded-md border border-black/5 bg-black/[0.05] px-2 py-1 text-[13px] text-neutral-500 focus-within:ring-2 focus-within:ring-[#007aff]/40 dark:border-white/5 dark:bg-white/10">
          <Search size={13} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a city"
            aria-label="Search for a city"
            className="w-full min-w-0 bg-transparent text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
          {query && (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
              <X size={12} />
            </button>
          )}
        </label>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {searching ? (
          <div className="text-[13px]">
            {!resultItems && (
              <p className="flex items-center gap-2 px-1 py-2 text-neutral-500">
                <Loader2 size={13} className="animate-spin" /> Searching…
              </p>
            )}
            {resultItems && resultItems.length === 0 && (
              <p className="px-1 py-2 text-neutral-500">{results.error ? "Couldn't reach the search service." : "No results found."}</p>
            )}
            {resultItems?.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addCity(r)}
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/10"
              >
                <MapPin size={13} className="mt-0.5 shrink-0 text-neutral-400" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">{r.name}</span>
                  <span className="block truncate text-[11px] text-neutral-500">{r.region}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          cities.map((c) => {
            const f = forecasts[c.id];
            const ok = f && !isError(f) ? f : null;
            const active = c.id === selected.id;
            return (
              <div key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(c.id);
                    setScreen("detail");
                  }}
                  className={`relative block w-full overflow-hidden rounded-xl p-2.5 text-left text-white shadow-sm ${
                    active && !mobile ? "ring-2 ring-[#007aff] ring-offset-1 ring-offset-neutral-50 dark:ring-offset-neutral-900" : ""
                  }`}
                  style={{ background: ok ? skyGradient(ok.current.code, ok.current.isDay) : "linear-gradient(180deg,#6b7c8f,#94a3b3)" }}
                >
                  <div className="relative flex justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold">
                        {c.name}
                        {c.id === BANGALORE.id && <MapPin size={11} className="ml-1 inline align-[-1px] opacity-80" />}
                      </div>
                      <div className="text-[11px] opacity-80">{ok ? cityLocalTime(ok, now, hour24) : (c.region ?? "")}</div>
                    </div>
                    <div className="text-[28px] leading-none font-light">{ok ? `${toUnit(ok.current.temp, unit)}°` : "--"}</div>
                  </div>
                  <div className="relative mt-2 flex justify-between text-[11px] opacity-90">
                    <span className="truncate">{ok ? weatherCodeToCondition(ok.current.code) : isError(f) ? "Unavailable" : "Loading…"}</span>
                    {ok && ok.daily[0] && (
                      <span className="shrink-0">
                        H:{toUnit(ok.daily[0].max, unit)}° L:{toUnit(ok.daily[0].min, unit)}°
                      </span>
                    )}
                  </div>
                </button>
                {c.id !== BANGALORE.id && (
                  <button
                    type="button"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => removeCity(c.id)}
                    className={`absolute -top-1.5 -right-1.5 size-5 items-center justify-center rounded-full bg-neutral-700 text-white shadow ${
                      mobile ? "flex" : "hidden group-hover:flex"
                    }`}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );

  const detail = (
    <main className="relative flex h-full min-w-0 flex-1 flex-col overflow-hidden text-white">
      <Sky code={entry && !isError(entry) ? entry.current.code : 3} isDay={entry && !isError(entry) ? entry.current.isDay : true} />
      <div className="relative z-10 flex shrink-0 items-center justify-between px-3 py-2">
        {mobile ? (
          <button type="button" aria-label="City list" onClick={() => setScreen("list")} className="rounded-md p-1 hover:bg-white/15">
            <List size={18} />
          </button>
        ) : (
          <span />
        )}
        <UnitToggle unit={unit} />
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-6 [text-shadow:0_1px_2px_rgba(0,0,0,0.15)]">
        {!entry ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/85">
            <Loader2 className="animate-spin" />
            <span className="text-[13px]">Fetching the forecast for {selected.name}…</span>
          </div>
        ) : isError(entry) ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <WifiOff size={28} className="opacity-80" />
            <p className="text-[15px] font-semibold">Weather isn&apos;t available right now</p>
            <p className="max-w-[260px] text-[12px] opacity-80">{entry.error}</p>
            <button type="button" onClick={() => retry(selected.id)} className="rounded-full bg-white/20 px-4 py-1 text-[13px] hover:bg-white/30">
              Try Again
            </button>
          </div>
        ) : (
          <ForecastView city={selected} f={entry} unit={unit} hour24={hour24} />
        )}
      </div>
    </main>
  );

  if (mobile) return <div className="h-full text-[13px]">{screen === "list" ? sidebar : detail}</div>;

  return (
    <div className="flex h-full text-[13px]">
      {sidebar}
      {detail}
    </div>
  );
}

function UnitToggle({ unit }: { unit: TempUnit }) {
  return (
    <div className="flex rounded-full bg-black/20 p-0.5 text-[12px] font-medium backdrop-blur" role="radiogroup" aria-label="Temperature unit">
      {(["C", "F"] as const).map((u) => (
        <button
          key={u}
          type="button"
          role="radio"
          aria-checked={unit === u}
          onClick={() => setTempUnit(u)}
          className={`rounded-full px-2.5 py-0.5 ${unit === u ? "bg-white text-neutral-900" : "text-white/80 hover:text-white"}`}
        >
          °{u}
        </button>
      ))}
    </div>
  );
}

function Card({ icon, title, children, className = "" }: { icon: ReactNode; title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-black/[0.14] p-3 backdrop-blur-md ${className}`}>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-white/60 uppercase">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function ForecastView({ city, f, unit, hour24 }: { city: City; f: Forecast; unit: TempUnit; hour24: boolean }) {
  const today = f.daily[0];
  const condition = weatherCodeToCondition(f.current.code);
  const days = f.daily.slice(0, 10);
  const lo = Math.min(...days.map((d) => d.min));
  const hi = Math.max(...days.map((d) => d.max));
  const span = Math.max(1, hi - lo);
  const imperial = unit === "F";
  const wind = imperial ? Math.round(f.current.windSpeed * 0.621371) : Math.round(f.current.windSpeed);
  const vis = f.visibility == null ? null : imperial ? f.visibility / 1609.34 : f.visibility / 1000;
  const feelsDiff = Math.round(f.current.apparent - f.current.temp);

  return (
    <div className="mx-auto max-w-[620px]">
      <header className="py-6 text-center">
        <h2 className="text-[30px] leading-tight font-normal">{city.name}</h2>
        <div className="text-[84px] leading-none font-extralight tracking-tight">{toUnit(f.current.temp, unit)}°</div>
        <div className="mt-1 text-[17px] font-medium opacity-90">{condition}</div>
        {today && (
          <div className="text-[15px] font-medium opacity-90">
            H:{toUnit(today.max, unit)}° L:{toUnit(today.min, unit)}°
          </div>
        )}
      </header>

      <div className="space-y-3">
        <Card icon={<Clock size={12} />} title="Hourly forecast">
          <p className="-mt-1 mb-2 border-b border-white/15 pb-2 text-[13px] text-white/90">
            {condition} right now. Wind {wind} {imperial ? "mph" : "km/h"} from the {compass(f.current.windDirection)}.
          </p>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {f.hourly.slice(0, 24).map((h, i) => {
              const Icon = weatherCodeToIcon(h.code, h.isDay);
              return (
                <div key={h.time} className="flex w-11 shrink-0 flex-col items-center gap-1.5">
                  <span className="text-[12px] font-medium">{i === 0 ? "Now" : fmtHour(h.time, hour24)}</span>
                  <Icon size={20} className={h.isDay && h.code <= 2 ? "text-yellow-300" : "text-white"} />
                  <span className="text-[14px] font-medium">{toUnit(h.temp, unit)}°</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card icon={<CalendarDays size={12} />} title="10-day forecast">
          <ul>
            {days.map((d, i) => {
              const Icon = weatherCodeToIcon(d.code, true);
              const left = ((d.min - lo) / span) * 100;
              const width = Math.max(6, ((d.max - d.min) / span) * 100);
              const curPos = ((f.current.temp - lo) / span) * 100;
              return (
                <li key={d.date} className="flex items-center gap-3 border-t border-white/15 py-2 first:border-t-0">
                  <span className="w-12 shrink-0 text-[14px] font-medium">{i === 0 ? "Today" : weekdayOf(d.date)}</span>
                  <Icon size={18} className={d.code <= 2 ? "shrink-0 text-yellow-300" : "shrink-0"} />
                  <span className="w-9 shrink-0 text-right text-[14px] text-white/60">{toUnit(d.min, unit)}°</span>
                  <div className="relative h-1 min-w-12 flex-1 rounded-full bg-black/20">
                    <div
                      className="absolute inset-y-0 rounded-full"
                      style={{ left: `${left}%`, width: `${width}%`, background: "linear-gradient(90deg,#7dd3fc,#a3e635,#facc15,#fb923c)" }}
                    />
                    {i === 0 && (
                      <div
                        className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-black/20"
                        style={{ left: `${Math.min(100, Math.max(0, curPos))}%` }}
                      />
                    )}
                  </div>
                  <span className="w-9 shrink-0 text-[14px]">{toUnit(d.max, unit)}°</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {today && (
            <Card icon={<Sun size={12} />} title="UV index">
              <div className="text-[28px] leading-tight font-medium">{Math.round(today.uv)}</div>
              <div className="text-[15px] font-medium">{uvLevel(today.uv)}</div>
              <div className="relative mt-3 h-1 rounded-full" style={{ background: "linear-gradient(90deg,#4ade80,#facc15,#fb923c,#ef4444,#a855f7)" }}>
                <div
                  className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-2 ring-black/30"
                  style={{ left: `${Math.min(100, (today.uv / 11) * 100)}%` }}
                />
              </div>
            </Card>
          )}
          <Card icon={<Wind size={12} />} title="Wind">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[28px] leading-tight font-medium">{wind}</div>
                <div className="text-[13px] text-white/80">{imperial ? "mph" : "km/h"}</div>
              </div>
              <div className="relative size-14 shrink-0 rounded-full border border-white/30">
                <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[8px] text-white/70">N</span>
                <div
                  className="absolute inset-0 flex items-start justify-center"
                  style={{ transform: `rotate(${(f.current.windDirection + 180) % 360}deg)` }}
                >
                  <div className="mt-2 h-5 w-0.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
            <div className="mt-1 text-[12px] text-white/80">from the {compass(f.current.windDirection)}</div>
          </Card>
          <Card icon={<Droplets size={12} />} title="Humidity">
            <div className="text-[28px] leading-tight font-medium">{Math.round(f.current.humidity)}%</div>
            <div className="mt-2 text-[12px] text-white/80">
              {f.current.humidity > 75 ? "It's muggy out there." : f.current.humidity < 30 ? "The air is quite dry." : "Comfortable right now."}
            </div>
          </Card>
          <Card icon={<Thermometer size={12} />} title="Feels like">
            <div className="text-[28px] leading-tight font-medium">{toUnit(f.current.apparent, unit)}°</div>
            <div className="mt-2 text-[12px] text-white/80">
              {Math.abs(feelsDiff) < 2 ? "Similar to the actual temperature." : feelsDiff > 0 ? "Humidity is making it feel warmer." : "Wind is making it feel cooler."}
            </div>
          </Card>
          {today && (
            <Card icon={f.current.isDay ? <Sunset size={12} /> : <Sunrise size={12} />} title={f.current.isDay ? "Sunset" : "Sunrise"}>
              <div className="text-[24px] leading-tight font-medium">
                {fmtLocalTime(f.current.isDay ? today.sunset : (f.current.time < today.sunrise ? today.sunrise : (f.daily[1]?.sunrise ?? today.sunrise)), hour24)}
              </div>
              <div className="mt-2 text-[12px] text-white/80">
                {f.current.isDay ? "Sunrise" : "Sunset"}: {fmtLocalTime(f.current.isDay ? today.sunrise : today.sunset, hour24)}
              </div>
            </Card>
          )}
          <Card icon={<Eye size={12} />} title="Visibility">
            <div className="text-[28px] leading-tight font-medium">
              {vis == null ? "--" : `${vis >= 10 ? Math.round(vis) : vis.toFixed(1)} ${imperial ? "mi" : "km"}`}
            </div>
            <div className="mt-2 text-[12px] text-white/80">
              {vis == null ? "No data." : vis >= 10 ? "Perfectly clear view." : vis >= 4 ? "Slightly hazy." : "Visibility is reduced."}
            </div>
          </Card>
        </div>
        <p className="pt-1 text-center text-[11px] text-white/60">
          Weather data by{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline">
            Open-Meteo
          </a>
        </p>
      </div>
    </div>
  );
}
