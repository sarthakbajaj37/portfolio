"use client";

import { useState } from "react";
import { Clock, Lock, MapPin, Trash2 } from "lucide-react";
import {
  formatTime,
  fromDateKey,
  minutesToTime,
  timeToMinutes,
  type CalendarDef,
  type CalendarEvent,
} from "@/lib/calendar";

export type EditorState = {
  event: CalendarEvent;
  isNew: boolean;
  /** position relative to the app root */
  x: number;
  y: number;
  bounds: { w: number; h: number };
};

const W = 288;
const H_EDIT = 330;
const H_VIEW = 170;

function longDate(key: string) {
  return fromDateKey(key).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function EventPopover({
  state,
  calendars,
  hour24,
  mobile,
  onSave,
  onDelete,
  onClose,
}: {
  state: EditorState;
  calendars: CalendarDef[];
  hour24: boolean;
  mobile?: boolean;
  onSave: (e: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<CalendarEvent>(state.event);
  const readOnly = !!state.event.readOnly;
  const set = (patch: Partial<CalendarEvent>) => setDraft((d) => ({ ...d, ...patch }));
  const calendar = calendars.find((c) => c.id === draft.calendarId);
  const color = calendar?.color ?? "#8e8e93";

  // Place to the right of the anchor, flipping left / clamping to stay inside the app.
  const h = readOnly ? H_VIEW : H_EDIT;
  let left = state.x + 14;
  if (left + W > state.bounds.w - 8) left = state.x - W - 14;
  left = Math.max(8, Math.min(left, state.bounds.w - W - 8));
  const top = Math.max(8, Math.min(state.y - 40, state.bounds.h - h - 8));

  const save = () => {
    const out = { ...draft, title: draft.title.trim() || "New Event" };
    if (out.endDate < out.startDate) out.endDate = out.startDate;
    if (!out.isAllDay) {
      out.startTime = out.startTime || "09:00";
      out.endTime = out.endTime || minutesToTime(timeToMinutes(out.startTime) + 60);
      if (timeToMinutes(out.endTime) <= timeToMinutes(out.startTime)) {
        out.endTime = minutesToTime(timeToMinutes(out.startTime) + 30);
      }
      out.endDate = out.startDate;
    } else {
      delete out.startTime;
      delete out.endTime;
    }
    onSave(out);
  };

  const field =
    "w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[13px] outline-none focus:ring-2 focus:ring-[#007aff]/40 dark:border-white/10 dark:bg-neutral-800";

  const card = (
    <div
      role="dialog"
      aria-label={readOnly ? "Event details" : state.isNew ? "New event" : "Edit event"}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      className={
        mobile
          ? "absolute inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-black/10 bg-white/95 p-4 pb-6 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-800/95"
          : "absolute z-50 rounded-xl border border-black/10 bg-white/95 p-3 shadow-2xl backdrop-blur-xl dark:border-white/15 dark:bg-neutral-800/95"
      }
      style={mobile ? undefined : { left, top, width: W }}
    >
      {readOnly ? (
        <div className="space-y-2 text-[13px]">
          <div className="flex items-start gap-2">
            <span className="mt-1 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-[15px] leading-snug font-semibold text-neutral-900 dark:text-white">{draft.title}</h3>
          </div>
          <p className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
            <Clock size={12} className="shrink-0" />
            {longDate(draft.startDate)}
            {!draft.isAllDay && draft.startTime && draft.endTime && (
              <>
                {" · "}
                {formatTime(draft.startTime, hour24)} – {formatTime(draft.endTime, hour24)}
              </>
            )}
          </p>
          {draft.location && (
            <p className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
              <MapPin size={12} className="shrink-0" /> {draft.location}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <Lock size={10} className="shrink-0" />
            {calendar?.name ?? "Calendar"} · {draft.calendarId === "holidays" ? "public holiday" : "part of Sarthak's sample schedule"}
          </p>
        </div>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex items-center gap-2">
            <span className="size-3 shrink-0 rounded-[4px]" style={{ backgroundColor: color }} />
            <input
              autoFocus
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="New Event"
              aria-label="Title"
              className="w-full bg-transparent text-[15px] font-semibold text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white"
            />
          </div>
          <input
            value={draft.location ?? ""}
            onChange={(e) => set({ location: e.target.value || undefined })}
            placeholder="Add Location"
            aria-label="Location"
            className={field}
          />
          <label className="flex items-center gap-2 text-[12px] text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={draft.isAllDay}
              onChange={(e) =>
                set(
                  e.target.checked
                    ? { isAllDay: true }
                    : { isAllDay: false, startTime: draft.startTime ?? "09:00", endTime: draft.endTime ?? "10:00", endDate: draft.startDate },
                )
              }
              className="accent-[#007aff]"
            />
            all-day
          </label>
          <div className="grid grid-cols-[52px_1fr] items-center gap-x-2 gap-y-1.5 text-[12px] text-neutral-500">
            <span>{draft.isAllDay ? "starts" : "date"}</span>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => e.target.value && set({ startDate: e.target.value, endDate: draft.endDate < e.target.value ? e.target.value : draft.endDate })}
              aria-label="Start date"
              className={field}
            />
            {draft.isAllDay ? (
              <>
                <span>ends</span>
                <input
                  type="date"
                  value={draft.endDate}
                  min={draft.startDate}
                  onChange={(e) => e.target.value && set({ endDate: e.target.value })}
                  aria-label="End date"
                  className={field}
                />
              </>
            ) : (
              <>
                <span>time</span>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    step={900}
                    value={draft.startTime ?? "09:00"}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      const dur = timeToMinutes(draft.endTime ?? "10:00") - timeToMinutes(draft.startTime ?? "09:00");
                      set({ startTime: v, endTime: minutesToTime(timeToMinutes(v) + Math.max(15, dur)) });
                    }}
                    aria-label="Start time"
                    className={field}
                  />
                  <span className="text-neutral-400">–</span>
                  <input
                    type="time"
                    step={900}
                    value={draft.endTime ?? "10:00"}
                    onChange={(e) => e.target.value && set({ endTime: e.target.value })}
                    aria-label="End time"
                    className={field}
                  />
                </div>
              </>
            )}
            <span>calendar</span>
            <select value={draft.calendarId} onChange={(e) => set({ calendarId: e.target.value })} aria-label="Calendar" className={field}>
              {calendars
                .filter((c) => c.id !== "holidays")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {!state.isNew && (
              <button
                type="button"
                onClick={() => onDelete(draft.id)}
                aria-label="Delete event"
                className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] text-[#ff3b30] hover:bg-[#ff3b30]/10"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="ml-auto rounded-md border border-black/10 px-3 py-1 text-[12px] hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-[#007aff] px-3 py-1 text-[12px] font-medium text-white hover:bg-[#0066d6]">
              {state.isNew ? "Add" : "Save"}
            </button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <div className={mobile ? "absolute inset-0 z-40 bg-black/20" : "absolute inset-0 z-40"} onClick={onClose}>
      {card}
    </div>
  );
}
