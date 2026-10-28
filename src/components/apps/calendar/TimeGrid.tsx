"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  calendarColor,
  formatHour,
  formatTime,
  sameDay,
  timeToMinutes,
  visibleEventsOnDay,
  type CalendarEvent,
  type CalendarStore,
} from "@/lib/calendar";

const HOUR_H = 48;
const SNAP = 15;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Drag = { dayIdx: number; anchor: number; current: number; moved: boolean };

export type GridHandlers = {
  /** create a new timed event; client coords anchor the popover */
  onCreate: (day: Date, startMin: number, endMin: number, x: number, y: number) => void;
  onCreateAllDay: (day: Date, x: number, y: number) => void;
  onOpen: (event: CalendarEvent, x: number, y: number) => void;
  onPickDay: (day: Date) => void;
};

type Placed = { event: CalendarEvent; start: number; end: number; col: number; cols: number };

/** Side-by-side layout for overlapping timed events. */
function layout(events: CalendarEvent[]): Placed[] {
  const items = events
    .filter((e) => !e.isAllDay && e.startTime)
    .map((event) => {
      const start = timeToMinutes(event.startTime!);
      const end = Math.max(start + 15, event.endTime ? timeToMinutes(event.endTime) : start + 60);
      return { event, start, end, col: 0, cols: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  let cluster: Placed[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    cluster.forEach((p) => (p.cols = colEnds.length));
    cluster = [];
    colEnds = [];
  };
  for (const item of items) {
    if (item.start >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= item.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(item.end);
    } else colEnds[col] = item.end;
    item.col = col;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();
  return items;
}

const snap = (min: number) => Math.max(0, Math.min(24 * 60 - SNAP, Math.floor(min / SNAP) * SNAP));

export function TimeGrid({
  days,
  store,
  hour24,
  now,
  handlers,
  compactHeader,
}: {
  days: Date[];
  store: CalendarStore;
  hour24: boolean;
  now: Date;
  handlers: GridHandlers;
  compactHeader?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  // Start scrolled to the morning, like Apple Calendar.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = Math.max(0, 7.5 * HOUR_H);
    }
  }, []);

  const perDay = days.map((d) => visibleEventsOnDay(d, store));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayIdx = days.findIndex((d) => sameDay(d, now));
  const single = days.length === 1;

  const minuteAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return ((e.clientY - rect.top) / HOUR_H) * 60;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* day headers */}
      <div className="flex shrink-0 border-b border-black/10 pr-[var(--sbw,0px)] dark:border-white/10">
        <div className="w-14 shrink-0" />
        {days.map((d, i) => {
          const isToday = i === todayIdx;
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => handlers.onPickDay(d)}
              className={`flex min-w-0 flex-1 items-baseline gap-1 px-1.5 py-1.5 text-[13px] ${single ? "justify-start" : "justify-center sm:justify-start"} ${
                d.getDay() === 0 || d.getDay() === 6 ? "text-neutral-400" : "text-neutral-600 dark:text-neutral-300"
              }`}
            >
              <span className={compactHeader ? "text-[11px]" : ""}>{WEEKDAYS[d.getDay()]}</span>
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 font-medium ${
                  isToday ? "bg-[#ff3b30] text-white" : "text-neutral-900 dark:text-neutral-100"
                }`}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* all-day row */}
      <div className="flex max-h-24 shrink-0 overflow-y-auto border-b border-black/10 dark:border-white/10">
        <div className="w-14 shrink-0 py-1 pr-2 text-right text-[10px] text-neutral-400">all-day</div>
        {perDay.map((events, i) => (
          <div
            key={i}
            onDoubleClick={(e) => handlers.onCreateAllDay(days[i], e.clientX, e.clientY)}
            className="min-h-7 min-w-0 flex-1 space-y-0.5 border-l border-black/5 p-0.5 dark:border-white/5"
          >
            {events
              .filter((e) => e.isAllDay)
              .map((ev) => {
                const color = calendarColor(store, ev.calendarId);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={(e) => handlers.onOpen(ev, e.clientX, e.clientY)}
                    onDoubleClick={(e) => e.stopPropagation()}
                    className="block w-full truncate rounded px-1.5 py-px text-left text-[11px] font-medium"
                    style={{ backgroundColor: `${color}33`, color }}
                  >
                    {ev.title}
                  </button>
                );
              })}
          </div>
        ))}
      </div>

      {/* hour grid */}
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: 24 * HOUR_H }}>
          {/* gutter */}
          <div className="relative w-14 shrink-0 select-none">
            {HOURS.map((h) =>
              h === 0 ? null : (
                <span
                  key={h}
                  className={`absolute right-2 -translate-y-1/2 text-[10px] text-neutral-400 ${
                    todayIdx !== -1 && Math.abs(nowMin - h * 60) < 12 ? "opacity-0" : ""
                  }`}
                  style={{ top: h * HOUR_H }}
                >
                  {formatHour(h, hour24)}
                </span>
              ),
            )}
            {todayIdx !== -1 && (
              <span
                className="absolute right-1.5 z-20 -translate-y-1/2 rounded-sm bg-white px-0.5 text-[10px] font-semibold text-[#ff3b30] dark:bg-neutral-900"
                style={{ top: (nowMin / 60) * HOUR_H }}
              >
                {formatTime(`${now.getHours()}:${now.getMinutes()}`, hour24, false)}
              </span>
            )}
          </div>

          {/* hour lines */}
          <div className="pointer-events-none absolute inset-y-0 right-0 left-14">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute inset-x-0 border-t border-black/[0.07] dark:border-white/[0.07]"
                style={{ top: h * HOUR_H }}
              />
            ))}
          </div>

          {days.map((day, i) => {
            const placed = layout(perDay[i]);
            const draftActive = drag && drag.dayIdx === i && drag.moved;
            const dStart = drag ? Math.min(drag.anchor, drag.current) : 0;
            const dEnd = drag ? Math.max(drag.anchor, drag.current) + SNAP : 0;
            return (
              <div
                key={day.toISOString()}
                className={`relative min-w-0 flex-1 touch-pan-y border-l border-black/5 dark:border-white/5 ${
                  day.getDay() === 0 || day.getDay() === 6 ? "bg-black/[0.015] dark:bg-white/[0.015]" : ""
                }`}
                onPointerDown={(e) => {
                  if (e.button !== 0 || (e.target as HTMLElement).closest("[data-event]")) return;
                  const m = snap(minuteAt(e));
                  if (e.pointerType === "mouse") e.currentTarget.setPointerCapture(e.pointerId);
                  setDrag({ dayIdx: i, anchor: m, current: m, moved: false });
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.dayIdx !== i) return;
                  const m = snap(minuteAt(e));
                  if (m !== drag.current) setDrag({ ...drag, current: m, moved: true });
                }}
                onPointerUp={(e) => {
                  if (!drag || drag.dayIdx !== i) return;
                  setDrag(null);
                  if (drag.moved) {
                    const start = Math.min(drag.anchor, drag.current);
                    const end = Math.max(drag.anchor, drag.current) + SNAP;
                    handlers.onCreate(day, start, end, e.clientX, e.clientY);
                  }
                }}
                onPointerCancel={() => setDrag(null)}
                onDoubleClick={(e) => {
                  if ((e.target as HTMLElement).closest("[data-event]")) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const start = Math.floor(((e.clientY - rect.top) / HOUR_H) * 2) * 30;
                  handlers.onCreate(day, start, Math.min(start + 60, 24 * 60 - 1), e.clientX, e.clientY);
                }}
              >
                {placed.map(({ event, start, end, col, cols }) => {
                  const color = calendarColor(store, event.calendarId);
                  const height = Math.max(((end - start) / 60) * HOUR_H - 2, 18);
                  const short = height < 36;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      data-event
                      onClick={(e) => handlers.onOpen(event, e.clientX, e.clientY)}
                      className="absolute z-10 overflow-hidden rounded-[5px] border-l-[3px] px-1.5 py-0.5 text-left text-[11px] leading-tight hover:brightness-95"
                      style={{
                        top: (start / 60) * HOUR_H + 1,
                        height,
                        left: `calc(${(col / cols) * 100}% + 1px)`,
                        width: `calc(${100 / cols}% - 3px)`,
                        borderLeftColor: color,
                        backgroundColor: `${color}2e`,
                      }}
                    >
                      <span className={`block font-semibold ${short ? "truncate" : "line-clamp-2"}`} style={{ color }}>
                        {event.title}
                        {short && event.startTime && (
                          <span className="ml-1 font-normal opacity-80">{formatTime(event.startTime, hour24, true)}</span>
                        )}
                      </span>
                      {!short && (
                        <span className="block truncate opacity-80" style={{ color }}>
                          {event.startTime && formatTime(event.startTime, hour24, true)}
                          {event.location ? ` · ${event.location}` : ""}
                        </span>
                      )}
                    </button>
                  );
                })}

                {draftActive && (
                  <div
                    className="pointer-events-none absolute inset-x-0.5 z-20 rounded-[5px] border border-[#007aff] bg-[#007aff]/20 px-1.5 py-0.5 text-[11px] font-semibold text-[#007aff]"
                    style={{ top: (dStart / 60) * HOUR_H, height: ((dEnd - dStart) / 60) * HOUR_H }}
                  >
                    {formatTime(`${Math.floor(dStart / 60)}:${dStart % 60}`, hour24, true)} –{" "}
                    {formatTime(`${Math.floor(dEnd / 60) % 24}:${dEnd % 60}`, hour24, true)}
                  </div>
                )}

                {i === todayIdx && (
                  <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: (nowMin / 60) * HOUR_H }}>
                    <div className="h-[2px] bg-[#ff3b30]" />
                    <div className="absolute -top-[4px] -left-[5px] size-[10px] rounded-full bg-[#ff3b30]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
