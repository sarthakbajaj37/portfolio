"use client";

import { useEffect, useState } from "react";
import { Apple, ArrowRight } from "lucide-react";
import { profile } from "@/data/profile";
import { useSettings } from "@/lib/settings";
import { wallpaperCss } from "@/lib/wallpapers";

export type SystemMode = "active" | "booting" | "locked" | "sleeping" | "off";

const initials = profile.name
  .split(" ")
  .map((p) => p[0])
  .join("");

/** Apple logo + progress bar, then calls onDone. */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setProgress((p) => Math.min(100, p + 5)), 120);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (progress < 100) return;
    const t = setTimeout(onDone, 300);
    return () => clearTimeout(t);
  }, [progress, onDone]);

  return (
    <div className="fixed inset-0 z-[20000] flex flex-col items-center justify-center gap-14 bg-black">
      <Apple size={84} className="fill-white text-white" />
      <div className="h-1 w-52 overflow-hidden rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white transition-[width] duration-150" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { settings } = useSettings();
  const [now, setNow] = useState(() => new Date());
  const [password, setPassword] = useState("");
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-[20000] text-white" onClick={onUnlock}>
      <div className="absolute inset-0 scale-110 blur-md brightness-75" style={{ background: wallpaperCss(settings.wallpaper) }} />
      <div className="relative flex h-full flex-col items-center">
        <p className="mt-[9vh] text-[22px] font-semibold drop-shadow">
          {now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <p className="text-[96px] font-semibold leading-none tracking-tight drop-shadow-lg [font-variant-numeric:tabular-nums]">
          {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: !settings.clock.hour24 }).replace(/\s?[AP]M/, "")}
        </p>
        <div className="mt-auto mb-[12vh] flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-neutral-300 to-neutral-500 text-[30px] font-semibold shadow-lg">
            {initials}
          </div>
          <p className="text-[15px] font-semibold drop-shadow">{profile.name}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUnlock();
            }}
            className="flex items-center rounded-full bg-white/25 pl-3 pr-1 backdrop-blur-xl"
          >
            <input
              autoFocus
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Password"
              aria-label="Password (anything works)"
              className="w-40 bg-transparent py-1 text-[13px] text-white outline-none placeholder:text-white/70"
            />
            <button type="submit" aria-label="Unlock" className="flex h-6 w-6 items-center justify-center rounded-full border border-white/50">
              <ArrowRight size={14} />
            </button>
          </form>
          <p className="text-[12px] text-white/80">Touch ID or Enter Password · any password works 😉</p>
        </div>
      </div>
    </div>
  );
}

/** Black screen for sleep / shut down; click to continue. */
export function BlackScreen({ hint, onWake }: { hint: string; onWake: () => void }) {
  return (
    <button type="button" onClick={onWake} className="fixed inset-0 z-[20000] flex items-end justify-center bg-black pb-10 text-[12px] text-white/0 transition-colors duration-[2s] hover:text-white/40">
      {hint}
    </button>
  );
}

export function AboutThisMac({ onClose }: { onClose: () => void }) {
  const current = profile.experience[0];
  const specs: [string, string][] = [
    ["Chip", "Java 25 + Spring Boot"],
    ["Memory", "Redis-cached, Kafka-streamed"],
    ["Role", `${current.roles[0].title} @ ${current.company}`],
    ["Location", profile.location],
    ["Startup Disk", `${profile.education.school} (${profile.education.period})`],
    ["macOS", "Sarthak OS 26"],
  ];
  return (
    <div className="fixed inset-0 z-[15000] flex items-center justify-center" onPointerDown={onClose}>
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="window-enter relative w-[300px] rounded-xl border border-black/10 bg-neutral-100/95 px-6 pb-6 pt-9 text-center text-neutral-900 shadow-2xl backdrop-blur-2xl dark:border-white/15 dark:bg-neutral-800/95 dark:text-neutral-100"
      >
        <button type="button" aria-label="Close" onClick={onClose} className="absolute left-3 top-3 h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-600 text-[40px] font-bold text-white shadow-lg">
          {initials}
        </div>
        <h2 className="text-[20px] font-bold">{profile.name}</h2>
        <p className="mb-4 text-[12px] text-neutral-500">Backend Engineer, 2024</p>
        <dl className="space-y-1 text-[12px]">
          {specs.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[90px_1fr] gap-2 text-left">
              <dt className="text-right font-semibold">{k}</dt>
              <dd className="text-neutral-600 dark:text-neutral-300">{v}</dd>
            </div>
          ))}
        </dl>
        <a
          href={`mailto:${profile.email}`}
          className="mt-5 inline-block rounded-md border border-black/10 bg-white px-3 py-1 text-[13px] shadow-sm dark:border-white/15 dark:bg-neutral-700"
        >
          More Info…
        </a>
      </div>
    </div>
  );
}
