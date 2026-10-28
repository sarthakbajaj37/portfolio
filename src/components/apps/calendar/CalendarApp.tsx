"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, PanelLeft, Plus, X } from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { useSettings } from "@/lib/settings";
import {
  CALENDAR_COLORS,
  addDays,
  minutesToTime,
  newEventId,
  setCalendarStore,
  startOfWeek,
  toDateKey,
  useCalendarStore,
  type CalendarEvent,
} from "@/lib/calendar";
import { TimeGrid, type GridHandlers } from "./TimeGrid";
import { MONTHS, MiniMonth, MonthView, YearView } from "./MonthViews";
import { EventPopover, type EditorState } from "./EventPopover";

type View = "day" | "week" | "month" | "year";
const VIEWS: { id: View; label: string }[] = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function shift(d: Date, view: View, dir: 1 | -1) {
  if (view === "day") return addDays(d, dir);
  if (view === "week") return addDays(d, 7 * dir);
  if (view === "month") {
    const target = new Date(d.getFullYear(), d.getMonth() + dir, 1);
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
  }
  return new Date(d.getFullYear() + dir, d.getMonth(), Math.min(d.getDate(), 28));
}

export function CalendarApp({ mobile }: AppProps) {
  const { settings } = useSettings();
  const hour24 = settings.clock.hour24;
  const store = useCalendarStore();
  const now = useNow();

  const [view, setView] = useState<View>(mobile ? "day" : "week");
  const [cursor, setCursor] = useState(() => new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [addingCal, setAddingCal] = useState(false);
  const [newCalName, setNewCalName] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const anchor = (x: number, y: number) => {
    const r = rootRef.current?.getBoundingClientRect();
    return r ? { x: x - r.left, y: y - r.top, bounds: { w: r.width, h: r.height } } : { x: 0, y: 0, bounds: { w: 600, h: 400 } };
  };

  const defaultCalendar = store.calendars.find((c) => c.id === "personal" && !store.hidden.includes(c.id))?.id ?? "personal";

  const openNew = (day: Date, startMin: number | null, endMin: number | null, x: number, y: number) => {
    const key = toDateKey(day);
    const event: CalendarEvent = {
      id: newEventId(),
      title: "",
      startDate: key,
      endDate: key,
      isAllDay: startMin === null,
      calendarId: defaultCalendar,
      ...(startMin !== null && endMin !== null ? { startTime: minutesToTime(startMin), endTime: minutesToTime(endMin) } : {}),
    };
    setEditor({ event, isNew: true, ...anchor(x, y) });
  };

  const handlers: GridHandlers = {
    onCreate: (day, s, e, x, y) => openNew(day, s, e, x, y),
    onCreateAllDay: (day, x, y) => openNew(day, null, null, x, y),
    onOpen: (event, x, y) => setEditor({ event, isNew: false, ...anchor(x, y) }),
    onPickDay: (d) => {
      setCursor(d);
      setView("day");
    },
  };

  const saveEvent = (ev: CalendarEvent) => {
    setCalendarStore((s) => ({
      ...s,
      events: s.events.some((e) => e.id === ev.id) ? s.events.map((e) => (e.id === ev.id ? ev : e)) : [...s.events, ev],
      hidden: s.hidden.filter((h) => h !== ev.calendarId),
    }));
    setEditor(null);
  };

  const deleteEvent = (id: string) => {
    setCalendarStore((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
    setEditor(null);
  };

  const toggleCalendar = (id: string) =>
    setCalendarStore((s) => ({ ...s, hidden: s.hidden.includes(id) ? s.hidden.filter((h) => h !== id) : [...s.hidden, id] }));

  const addCalendar = () => {
    const name = newCalName.trim();
    setAddingCal(false);
    setNewCalName("");
    if (!name) return;
    setCalendarStore((s) => ({
      ...s,
      calendars: [...s.calendars, { id: `cal-${Date.now().toString(36)}`, name, color: CALENDAR_COLORS[s.calendars.length % CALENDAR_COLORS.length] }],
    }));
  };

  const removeCalendar = (id: string) =>
    setCalendarStore((s) => ({
      ...s,
      calendars: s.calendars.filter((c) => c.id !== id),
      events: s.events.filter((e) => e.calendarId !== id),
      hidden: s.hidden.filter((h) => h !== id),
    }));

  // ---------- title ----------
  const weekStart = startOfWeek(cursor);
  const weekEnd = addDays(weekStart, 6);
  let title: ReactNode;
  if (view === "year") title = <b>{cursor.getFullYear()}</b>;
  else if (view === "day")
    title = (
      <>
        <b>
          {cursor.getDate()} {MONTHS[cursor.getMonth()]}
        </b>{" "}
        {cursor.getFullYear()}
        <span className="ml-2 text-[13px] font-normal text-neutral-500">{cursor.toLocaleDateString("en-US", { weekday: "long" })}</span>
      </>
    );
  else if (view === "week" && weekStart.getMonth() !== weekEnd.getMonth())
    title = (
      <>
        <b>
          {MONTHS[weekStart.getMonth()].slice(0, 3)} – {MONTHS[weekEnd.getMonth()].slice(0, 3)}
        </b>{" "}
        {weekEnd.getFullYear()}
      </>
    );
  else
    title = (
      <>
        <b>{MONTHS[cursor.getMonth()]}</b> {cursor.getFullYear()}
      </>
    );

  const showSidebar = !mobile && sidebarOpen;

  return (
    <div ref={rootRef} className="@container relative flex h-full bg-white text-[13px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      {showSidebar && (
        <aside className="hidden w-[220px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-black/10 bg-neutral-50/80 p-3 @[700px]:flex dark:border-white/10 dark:bg-neutral-900/60">
          <MiniMonth
            year={cursor.getFullYear()}
            month={cursor.getMonth()}
            now={now}
            selected={cursor}
            onPickDay={(d) => setCursor(d)}
            onPrev={() => setCursor(shift(cursor, "month", -1))}
            onNext={() => setCursor(shift(cursor, "month", 1))}
          />
          <div>
            <div className="mb-1 flex items-center justify-between px-1">
              <h3 className="text-[11px] font-semibold text-neutral-500">Calendars</h3>
              <button
                type="button"
                aria-label="Add calendar"
                onClick={() => setAddingCal(true)}
                className="rounded p-0.5 text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Plus size={13} />
              </button>
            </div>
            <ul className="space-y-0.5">
              {store.calendars.map((c) => {
                const on = !store.hidden.includes(c.id);
                return (
                  <li key={c.id} className="group flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-black/[0.04] dark:hover:bg-white/5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`Show ${c.name}`}
                      onClick={() => toggleCalendar(c.id)}
                      className="flex size-[14px] shrink-0 items-center justify-center rounded-[4px] border-2 text-white"
                      style={{ borderColor: c.color, backgroundColor: on ? c.color : "transparent" }}
                    >
                      {on && <Check size={10} strokeWidth={3.5} />}
                    </button>
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    {!c.builtIn && (
                      <button
                        type="button"
                        aria-label={`Delete ${c.name}`}
                        onClick={() => removeCalendar(c.id)}
                        className="hidden rounded p-0.5 text-neutral-400 group-hover:block hover:text-neutral-700 dark:hover:text-neutral-200"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </li>
                );
              })}
              {addingCal && (
                <li className="px-1">
                  <input
                    autoFocus
                    value={newCalName}
                    onChange={(e) => setNewCalName(e.target.value)}
                    onBlur={addCalendar}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCalendar();
                      if (e.key === "Escape") {
                        setNewCalName("");
                        setAddingCal(false);
                      }
                    }}
                    placeholder="Calendar name"
                    className="w-full rounded border border-black/10 bg-white px-1.5 py-0.5 text-[12px] outline-none dark:border-white/10 dark:bg-neutral-800"
                  />
                </li>
              )}
            </ul>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/10 px-3 py-2 dark:border-white/10">
          {!mobile && (
            <button
              type="button"
              aria-label="Toggle sidebar"
              onClick={() => setSidebarOpen((o) => !o)}
              className="hidden rounded-md p-1 text-neutral-500 hover:bg-black/5 @[700px]:block dark:hover:bg-white/10"
            >
              <PanelLeft size={16} />
            </button>
          )}
          <button
            type="button"
            aria-label="New event"
            onClick={() => {
              const r = rootRef.current?.getBoundingClientRect();
              const start = view === "day" || view === "week" ? Math.min(now.getHours() + 1, 23) * 60 : 9 * 60;
              openNew(cursor, start, start + 60, (r?.left ?? 0) + 60, (r?.top ?? 0) + 60);
            }}
            className="rounded-md p-1 text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Plus size={16} />
          </button>

          <div className="mx-auto flex rounded-lg bg-black/[0.06] p-0.5 dark:bg-white/10" role="tablist">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                onClick={() => setView(v.id)}
                className={`rounded-md px-2.5 py-0.5 text-[12px] font-medium sm:px-3 ${
                  view === v.id
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-600 dark:text-white"
                    : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => setCursor(shift(cursor, view, -1))}
              className="rounded-md border border-black/10 p-0.5 text-neutral-600 hover:bg-black/5 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/10"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="rounded-md border border-black/10 px-2 py-[1px] text-[12px] hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
            >
              Today
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => setCursor(shift(cursor, view, 1))}
              className="rounded-md border border-black/10 p-0.5 text-neutral-600 hover:bg-black/5 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/10"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <h2 className="shrink-0 px-4 pt-2.5 pb-1.5 text-[22px] font-normal tracking-tight [&_b]:font-bold">{title}</h2>

        {view === "week" && (
          <TimeGrid
            key="week"
            days={Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))}
            store={store}
            hour24={hour24}
            now={now}
            handlers={handlers}
            compactHeader={mobile}
          />
        )}
        {view === "day" && <TimeGrid key="day" days={[cursor]} store={store} hour24={hour24} now={now} handlers={handlers} />}
        {view === "month" && (
          <MonthView
            cursor={cursor}
            store={store}
            hour24={hour24}
            now={now}
            maxChips={mobile ? 2 : 4}
            onOpen={handlers.onOpen}
            onPickDay={handlers.onPickDay}
            onCreateOn={(d, x, y) => openNew(d, 9 * 60, 10 * 60, x, y)}
          />
        )}
        {view === "year" && (
          <YearView
            year={cursor.getFullYear()}
            now={now}
            onPickMonth={(m) => {
              setCursor(new Date(cursor.getFullYear(), m, 1));
              setView("month");
            }}
            onPickDay={handlers.onPickDay}
          />
        )}
      </div>

      {editor && (
        <EventPopover
          key={editor.event.id}
          state={editor}
          calendars={store.calendars}
          hour24={hour24}
          mobile={mobile}
          onSave={saveEvent}
          onDelete={deleteEvent}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
