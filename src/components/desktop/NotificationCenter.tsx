"use client";

import type { ReactNode } from "react";
import { useWindows } from "./WindowManager";
import { AppIcon, appById } from "./apps";
import type { AppId } from "./types";
import { getEventsForDay } from "@/lib/calendar";
import { useCurrentWeather } from "@/lib/weather";
import { useLatestUnread } from "@/lib/messages";
import { NowPlayingMini } from "@/components/apps/music/MusicProvider";
import { useSettings } from "@/lib/settings";

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { openApp } = useWindows();
  const { settings } = useSettings();
  const weather = useCurrentWeather();
  const unread = useLatestUnread();
  const today = new Date();
  const events = getEventsForDay(today).slice(0, 4);

  const launch = (id: AppId) => {
    openApp(id);
    onClose();
  };

  const fmtTime = (t?: string) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    if (settings.clock.hour24) return t;
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };

  return (
    <aside
      aria-hidden={!open}
      className={`fixed bottom-24 right-2 top-9 z-[9800] flex w-[344px] flex-col gap-3 overflow-y-auto pb-2 transition-[transform,opacity] duration-300 ease-out ${
        open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[110%] opacity-0"
      }`}
    >
      {unread && !settings.focus && (
        <Card onClick={() => launch("messages")}>
          <div className="flex items-start gap-3">
            <AppIcon app={appById.messages} size={34} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between text-[12px]">
                <span className="font-semibold">{unread.from}</span>
                <span className="text-neutral-500">now</span>
              </div>
              <p className="line-clamp-2 text-[13px]">{unread.text}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card onClick={() => launch("weather")} className="aspect-square bg-gradient-to-b from-[#3d8af7]/90 to-[#1f5fc9]/90 text-white dark:from-[#1d3f7a]/90 dark:to-[#0f2347]/90">
          {weather ? (
            <div className="flex h-full flex-col">
              <p className="text-[13px] font-semibold">{weather.city} ➤</p>
              <p className="text-[40px] font-light leading-none">{Math.round(weather.temp)}°</p>
              <div className="mt-auto text-[12px]">
                <p className="font-semibold">{weather.condition}</p>
                <p>
                  H:{Math.round(weather.high)}° L:{Math.round(weather.low)}°
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[13px]">Loading weather…</p>
          )}
        </Card>

        <Card onClick={() => launch("calendar")} className="aspect-square">
          <p className="text-[11px] font-semibold uppercase text-[#ff3b30]">{today.toLocaleDateString("en-GB", { weekday: "long" })}</p>
          <p className="text-[30px] font-light leading-none">{today.getDate()}</p>
          <ul className="mt-2 space-y-1">
            {events.length === 0 && <li className="text-[12px] text-neutral-500">No more events today</li>}
            {events.slice(0, 3).map((e) => (
              <li key={e.id} className="flex gap-1.5 text-[11px] leading-tight">
                <span className="w-0.5 shrink-0 rounded-full" style={{ background: e.color }} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{e.title}</span>
                  <span className="text-neutral-500">{e.isAllDay ? "All day" : fmtTime(e.startTime)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <NowPlayingMini onOpen={() => launch("music")} />
    </aside>
  );
}

function Card({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      className={`rounded-2xl border border-white/30 p-3 text-neutral-900 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:text-neutral-100 ${
        className.includes("bg-") ? "" : "bg-white/70 dark:bg-neutral-800/70"
      } ${onClick ? "cursor-default" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
