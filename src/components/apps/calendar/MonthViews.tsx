"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  calendarColor,
  formatTime,
  sameDay,
  startOfWeek,
  visibleEventsOnDay,
  type CalendarEvent,
  type CalendarStore,
} from "@/lib/calendar";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** 6 rows × 7 days covering the given month. */
export function monthGrid(year: number, month: number): Date[] {
  const start = startOfWeek(new Date(year, month, 1));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

// ---------- Month view ----------

export function MonthView({
  cursor,
  store,
  hour24,
  now,
  maxChips,
  onOpen,
  onPickDay,
  onCreateOn,
}: {
  cursor: Date;
  store: CalendarStore;
  hour24: boolean;
  now: Date;
  maxChips: number;
  onOpen: (e: CalendarEvent, x: number, y: number) => void;
  onPickDay: (d: Date) => void;
  onCreateOn: (d: Date, x: number, y: number) => void;
}) {
  const days = monthGrid(cursor.getFullYear(), cursor.getMonth());
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-black/10 dark:border-white/10">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-2 py-1 text-right text-[12px] text-neutral-500">
            {w}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {days.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = sameDay(d, now);
          const events = visibleEventsOnDay(d, store);
          const shown = events.length > maxChips ? events.slice(0, maxChips - 1) : events;
          const more = events.length - shown.length;
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={d.toISOString()}
              onDoubleClick={(e) => onCreateOn(d, e.clientX, e.clientY)}
              className={`flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-l border-black/5 p-0.5 first:border-l-0 dark:border-white/5 ${
                weekend ? "bg-black/[0.015] dark:bg-white/[0.015]" : ""
              }`}
            >
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onPickDay(d)}
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] ${
                    isToday
                      ? "bg-[#ff3b30] font-semibold text-white"
                      : inMonth
                        ? "text-neutral-800 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10"
                        : "text-neutral-400 hover:bg-black/5 dark:text-neutral-600 dark:hover:bg-white/10"
                  }`}
                >
                  {d.getDate() === 1 ? `${MONTHS[d.getMonth()].slice(0, 3)} 1` : d.getDate()}
                </button>
              </div>
              <div className="min-h-0 space-y-px">
                {shown.map((ev) => {
                  const color = calendarColor(store, ev.calendarId);
                  return ev.isAllDay ? (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => onOpen(ev, e.clientX, e.clientY)}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className={`block w-full truncate rounded px-1.5 text-left text-[11px] leading-[18px] font-medium ${inMonth ? "" : "opacity-50"}`}
                      style={{ backgroundColor: `${color}2e`, color }}
                    >
                      {ev.title}
                    </button>
                  ) : (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => onOpen(ev, e.clientX, e.clientY)}
                      onDoubleClick={(e) => e.stopPropagation()}
                      className={`flex w-full items-center gap-1 rounded px-1 text-left text-[11px] leading-[18px] hover:bg-black/5 dark:hover:bg-white/5 ${
                        inMonth ? "" : "opacity-50"
                      }`}
                    >
                      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">{ev.title}</span>
                      <span className="hidden shrink-0 text-neutral-400 @[640px]:inline">
                        {ev.startTime && formatTime(ev.startTime, hour24, true)}
                      </span>
                    </button>
                  );
                })}
                {more > 0 && (
                  <button
                    type="button"
                    onClick={() => onPickDay(d)}
                    className="block w-full truncate px-1.5 text-left text-[11px] leading-[18px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                  >
                    +{more} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Mini month (sidebar + year view) ----------

export function MiniMonth({
  year,
  month,
  now,
  selected,
  onPickDay,
  onPickMonth,
  onPrev,
  onNext,
  large,
}: {
  year: number;
  month: number;
  now: Date;
  selected?: Date;
  onPickDay: (d: Date) => void;
  onPickMonth?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  large?: boolean;
}) {
  const days = monthGrid(year, month);
  const rows = days.slice(35).some((d) => d.getMonth() === month) ? days : days.slice(0, 35);
  const isNowMonth = now.getFullYear() === year && now.getMonth() === month;
  return (
    <div className="select-none">
      <div className="mb-1 flex items-center justify-between px-1">
        {onPickMonth ? (
          <button
            type="button"
            onClick={onPickMonth}
            className={`text-[15px] font-semibold hover:opacity-70 ${isNowMonth ? "text-[#ff3b30]" : "text-neutral-900 dark:text-neutral-100"}`}
          >
            {MONTHS[month]}
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-neutral-700 dark:text-neutral-300">
            {MONTHS[month]} {year}
          </span>
        )}
        {onPrev && onNext && (
          <div className="flex text-neutral-500">
            <button type="button" aria-label="Previous month" onClick={onPrev} className="rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10">
              <ChevronLeft size={14} />
            </button>
            <button type="button" aria-label="Next month" onClick={onNext} className="rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-[10px] font-medium text-neutral-400">
            {w[0]}
          </span>
        ))}
        {rows.map((d) => {
          const inMonth = d.getMonth() === month;
          const isToday = sameDay(d, now);
          const isSel = selected && sameDay(d, selected);
          if (large && !inMonth) return <span key={d.toISOString()} />;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onPickDay(d)}
              className={`mx-auto flex size-6 items-center justify-center rounded-full text-[11px] ${
                isToday
                  ? "bg-[#ff3b30] font-semibold text-white"
                  : isSel
                    ? "bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900"
                    : inMonth
                      ? "text-neutral-800 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10"
                      : "text-neutral-300 dark:text-neutral-600"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Year view ----------

export function YearView({
  year,
  now,
  onPickMonth,
  onPickDay,
}: {
  year: number;
  now: Date;
  onPickMonth: (m: number) => void;
  onPickDay: (d: Date) => void;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 min-[420px]:grid-cols-2 @[640px]:grid-cols-3 @[900px]:grid-cols-4">
        {MONTHS.map((_, m) => (
          <MiniMonth key={m} year={year} month={m} now={now} large onPickDay={onPickDay} onPickMonth={() => onPickMonth(m)} />
        ))}
      </div>
    </div>
  );
}
