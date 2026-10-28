// Calendar data layer: calendars, generated sample events (computed per day,
// never stored), Indian public holidays, and user events in localStorage.

import { useSyncExternalStore } from "react";

export type CalendarDef = { id: string; name: string; color: string; builtIn?: boolean };

export type CalendarEvent = {
  id: string;
  title: string;
  /** 'YYYY-MM-DD' */
  startDate: string;
  endDate: string;
  /** 'HH:mm' */
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  calendarId: string;
  location?: string;
  /** generated/holiday events can't be edited */
  readOnly?: boolean;
};

export type CalendarEventSummary = {
  id: string;
  title: string;
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  color: string;
};

export const DEFAULT_CALENDARS: CalendarDef[] = [
  { id: "holidays", name: "Holidays (India)", color: "#34c759", builtIn: true },
  { id: "work", name: "Work", color: "#007aff", builtIn: true },
  { id: "focus", name: "Focus", color: "#af52de", builtIn: true },
  { id: "exercise", name: "Exercise", color: "#ff9500", builtIn: true },
  { id: "personal", name: "Personal", color: "#ff2d55", builtIn: true },
];

export const CALENDAR_COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#00c7be", "#007aff", "#5856d6", "#af52de", "#ff2d55", "#a2845e"];

// ---------- date helpers ----------

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function startOfWeek(d: Date) {
  // Weeks start on Sunday, like Apple Calendar's default.
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - out.getDay());
  return out;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(min: number) {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatTime(t: string, hour24: boolean, compact = false) {
  const [h, m] = t.split(":").map(Number);
  if (hour24) return `${pad(h)}:${pad(m)}`;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (compact) return m === 0 ? `${h12} ${suffix}` : `${h12}:${pad(m)} ${suffix}`;
  return `${h12}:${pad(m)} ${suffix}`;
}

export function formatHour(h: number, hour24: boolean) {
  if (hour24) return `${pad(h)}:00`;
  if (h === 0) return "12 AM";
  if (h === 12) return "Noon";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

// ---------- holidays (India) ----------

// Fixed-date holidays repeat every year; lunar festivals use published dates.
const FIXED_HOLIDAYS: [string, string][] = [
  ["01-01", "New Year's Day"],
  ["01-26", "Republic Day"],
  ["04-14", "Ambedkar Jayanti"],
  ["08-15", "Independence Day"],
  ["10-02", "Gandhi Jayanti"],
  ["11-01", "Kannada Rajyotsava"],
  ["12-25", "Christmas"],
];

const LUNAR_HOLIDAYS: Record<string, string> = {
  // 2026
  "2026-02-15": "Maha Shivaratri",
  "2026-03-04": "Holi",
  "2026-03-21": "Eid ul-Fitr",
  "2026-03-26": "Ram Navami",
  "2026-03-31": "Mahavir Jayanti",
  "2026-04-03": "Good Friday",
  "2026-05-01": "Buddha Purnima",
  "2026-05-27": "Bakrid / Eid ul-Adha",
  "2026-06-26": "Muharram",
  "2026-08-28": "Raksha Bandhan",
  "2026-09-04": "Janmashtami",
  "2026-09-14": "Ganesh Chaturthi",
  "2026-10-20": "Dussehra",
  "2026-11-08": "Diwali",
  "2026-11-24": "Guru Nanak Jayanti",
  // 2027
  "2027-03-06": "Maha Shivaratri",
  "2027-03-10": "Eid ul-Fitr",
  "2027-03-22": "Holi",
  "2027-03-26": "Good Friday",
  "2027-04-15": "Ram Navami",
  "2027-05-17": "Bakrid / Eid ul-Adha",
  "2027-05-20": "Buddha Purnima",
  "2027-08-17": "Raksha Bandhan",
  "2027-08-25": "Janmashtami",
  "2027-09-04": "Ganesh Chaturthi",
  "2027-10-09": "Dussehra",
  "2027-10-29": "Diwali",
  "2027-11-14": "Guru Nanak Jayanti",
};

function holidaysFor(date: Date): CalendarEvent[] {
  const key = toDateKey(date);
  const y = date.getFullYear();
  const out: CalendarEvent[] = [];
  if (y === 2026 || y === 2027) {
    const fixed = FIXED_HOLIDAYS.find(([md]) => key.endsWith(md));
    if (fixed) out.push(holiday(key, fixed[1]));
    if (LUNAR_HOLIDAYS[key]) out.push(holiday(key, LUNAR_HOLIDAYS[key]));
  }
  return out;
}

function holiday(key: string, title: string): CalendarEvent {
  return { id: `hol-${key}-${title}`, title, startDate: key, endDate: key, isAllDay: true, calendarId: "holidays", readOnly: true };
}

// ---------- generated sample events ----------

// Sample schedule starts when Sarthak moved to Bangalore.
const SAMPLE_START = "2026-09-01";

const BRUNCH_SPOTS = [
  "Brunch at Third Wave Coffee, Indiranagar",
  "Breakfast at a Malleshwaram darshini",
  "Brunch in Koramangala",
  "Filter coffee & dosa in Basavanagudi",
  "Brunch at a café in HSR Layout",
];

const SUNDAY_PLANS: [string, string, string, string?][] = [
  ["Walk around Lalbagh", "08:00", "09:30", "Lalbagh Botanical Garden"],
  ["Bookstore crawl on Church Street", "16:00", "18:00", "Church Street"],
  ["Live music night", "19:30", "22:00", "Koramangala"],
  ["Sunset at Nandi Hills", "05:00", "09:00", "Nandi Hills"],
  ["Side project hacking", "15:00", "18:00", "Home"],
];

function weekIndex(date: Date) {
  return Math.floor(startOfWeek(date).getTime() / (7 * 86_400_000));
}

function sampleEventsFor(date: Date): CalendarEvent[] {
  const key = toDateKey(date);
  if (key < SAMPLE_START) return [];
  const dow = date.getDay();
  const out: CalendarEvent[] = [];
  const add = (id: string, title: string, calendarId: string, startTime: string, endTime: string, location?: string) =>
    out.push({ id: `gen-${key}-${id}`, title, startDate: key, endDate: key, startTime, endTime, isAllDay: false, calendarId, location, readOnly: true });

  const isHoliday = holidaysFor(date).length > 0;
  const weekday = dow >= 1 && dow <= 5;

  if (weekday && !isHoliday) {
    if (dow === 1) add("plan", "Plan the week", "work", "09:30", "10:00");
    add("focus", "Focus time", "focus", dow % 2 === 1 ? "10:30" : "14:00", dow % 2 === 1 ? "12:30" : "16:00");
    if (dow === 5) add("learn", "Learning hour", "work", "16:30", "17:30");
  }
  if (dow === 1 || dow === 3 || dow === 5) add("gym", "Gym", "exercise", "07:00", "08:00");
  if (dow === 2 || dow === 4) add("run", "Evening run", "exercise", "19:00", "19:45", "Cubbon Park");

  const w = weekIndex(date);
  if (dow === 6) {
    add("run-long", "Long run", "exercise", "06:30", "07:45", "Cubbon Park");
    add("brunch", BRUNCH_SPOTS[w % BRUNCH_SPOTS.length], "personal", "11:00", "12:30", "Bangalore");
  }
  if (dow === 0) {
    const [title, s, e, loc] = SUNDAY_PLANS[w % SUNDAY_PLANS.length];
    add("sunday", title, "personal", s, e, loc);
  }
  return out;
}

// ---------- user store (localStorage, shared by every subscriber) ----------

export type CalendarStore = {
  events: CalendarEvent[];
  calendars: CalendarDef[];
  hidden: string[];
};

const STORAGE_KEY = "sb-calendar-v1";
const defaultStore: CalendarStore = { events: [], calendars: DEFAULT_CALENDARS, hidden: [] };

let cache: CalendarStore | null = null;
const listeners = new Set<() => void>();

function read(): CalendarStore {
  if (cache) return cache;
  if (typeof window === "undefined") return defaultStore;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<CalendarStore>) : {};
    const custom = (saved.calendars ?? []).filter((c) => !DEFAULT_CALENDARS.some((d) => d.id === c.id));
    // built-in calendars keep their ids but can be recoloured/renamed
    const builtIns = DEFAULT_CALENDARS.map((d) => ({ ...d, ...(saved.calendars ?? []).find((c) => c.id === d.id), builtIn: true }));
    cache = {
      events: Array.isArray(saved.events) ? saved.events : [],
      calendars: [...builtIns, ...custom],
      hidden: Array.isArray(saved.hidden) ? saved.hidden : [],
    };
  } catch {
    cache = defaultStore;
  }
  return cache;
}

export function setCalendarStore(update: (s: CalendarStore) => CalendarStore) {
  cache = update(read());
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCalendarStore(): CalendarStore {
  return useSyncExternalStore(subscribe, read, () => defaultStore);
}

export function newEventId() {
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- queries ----------

function compareEvents(a: CalendarEvent, b: CalendarEvent) {
  if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
  const t = (a.startTime ?? "").localeCompare(b.startTime ?? "");
  return t || a.title.localeCompare(b.title);
}

/** Every event (generated + user) on a day, including hidden calendars. */
export function eventsOnDay(date: Date, store: CalendarStore): CalendarEvent[] {
  const key = toDateKey(date);
  const user = store.events.filter((e) => e.startDate <= key && key <= (e.endDate || e.startDate));
  return [...holidaysFor(date), ...sampleEventsFor(date), ...user].sort(compareEvents);
}

/** Events on a day, limited to calendars that are switched on. */
export function visibleEventsOnDay(date: Date, store: CalendarStore): CalendarEvent[] {
  return eventsOnDay(date, store).filter((e) => !store.hidden.includes(e.calendarId) && store.calendars.some((c) => c.id === e.calendarId));
}

export function calendarColor(store: CalendarStore, calendarId: string) {
  return store.calendars.find((c) => c.id === calendarId)?.color ?? "#8e8e93";
}

/** Used by the Notification Center widget. */
export function getEventsForDay(date: Date): CalendarEventSummary[] {
  const store = read();
  return visibleEventsOnDay(date, store).map((e) => ({
    id: e.id,
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
    isAllDay: e.isAllDay,
    color: calendarColor(store, e.calendarId),
  }));
}
