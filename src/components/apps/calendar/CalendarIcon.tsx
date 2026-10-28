"use client";

import { useEffect, useState } from "react";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

/** Ticks over at local midnight so the dock icon never shows a stale date. */
function useToday() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    const next = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const id = setTimeout(() => setToday(new Date()), next.getTime() - Date.now() + 1000);
    return () => clearTimeout(id);
  }, [today]);
  return today;
}

// Live dock icon, macOS Big Sur style: red weekday over a big light date.
export function CalendarIcon({ size }: { size: number }) {
  const today = useToday();
  return (
    <div
      aria-label={today.toDateString()}
      className="relative flex flex-col items-center overflow-hidden rounded-[22.5%] bg-gradient-to-b from-white to-[#ececec] shadow-[0_2px_6px_rgba(0,0,0,0.28),inset_0_0_0_0.5px_rgba(0,0,0,0.12)] select-none"
      style={{ width: size, height: size }}
    >
      <span
        className="font-semibold tracking-wide text-[#ff3b30]"
        style={{ fontSize: size * 0.17, lineHeight: 1, marginTop: size * 0.12 }}
      >
        {WEEKDAYS[today.getDay()]}
      </span>
      <span
        className="font-light tracking-tight text-[#1d1d1f] tabular-nums"
        style={{ fontSize: size * 0.56, lineHeight: 1, marginTop: size * 0.02 }}
      >
        {today.getDate()}
      </span>
    </div>
  );
}
