"use client";

import { useEffect, useRef, useState } from "react";
import { Apple, BatteryFull, Search, Wifi } from "lucide-react";
import { useWindows } from "./WindowManager";
import { appById } from "./apps";
import { profile } from "@/data/profile";

const MENUS = ["File", "Edit", "View", "Window", "Help"];

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function MenuBar() {
  const { state, open } = useWindows();
  const now = useClock();
  const [appleOpen, setAppleOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeName = state.focused ? appById[state.focused].name : "Finder";

  // Close the Apple menu on any outside click.
  useEffect(() => {
    if (!appleOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setAppleOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [appleOpen]);

  const items: { label: string; action: () => void }[] = [
    { label: `About ${profile.name.split(" ")[0]}`, action: () => open("notes") },
    { label: "Experience…", action: () => open("textedit") },
    { label: "Projects…", action: () => open("finder") },
    { label: "Contact…", action: () => open("mail") },
  ];

  const time = now.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <nav className="fixed inset-x-0 top-0 z-[10000] flex h-7 select-none items-center justify-between bg-white/30 px-3 text-[13px] text-black backdrop-blur-2xl dark:bg-black/30 dark:text-white">
      <div className="flex items-center gap-1">
        <div ref={menuRef} className="relative">
          <button
            type="button"
            aria-label="Apple menu"
            onClick={() => setAppleOpen((v) => !v)}
            className={`rounded px-2 py-0.5 ${appleOpen ? "bg-white/40 dark:bg-white/20" : ""}`}
          >
            <Apple size={15} className="fill-current" />
          </button>
          {appleOpen && (
            <div className="absolute left-0 top-7 w-56 rounded-lg border border-black/10 bg-white/80 p-1 shadow-xl backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-800/80">
              {items.map((it, i) => (
                <div key={it.label}>
                  <button
                    type="button"
                    onClick={() => {
                      it.action();
                      setAppleOpen(false);
                    }}
                    className="w-full rounded px-2.5 py-1 text-left hover:bg-sky-500 hover:text-white"
                  >
                    {it.label}
                  </button>
                  {i === 0 && <hr className="mx-2 my-1 border-black/10 dark:border-white/10" />}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="px-2 font-bold">{activeName}</span>
        {MENUS.map((m) => (
          <span key={m} className="hidden cursor-default rounded px-2 py-0.5 md:inline">
            {m}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3.5">
        <BatteryFull size={18} />
        <Wifi size={15} />
        <Search size={14} />
        <time suppressHydrationWarning>{time}</time>
      </div>
    </nav>
  );
}
