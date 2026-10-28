"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import { MenuBar } from "./MenuBar";
import { Dock } from "./Dock";
import { Window } from "./Window";
import { AppIcon, apps, appById } from "./apps";
import { profile } from "@/data/profile";
import { useWindows, WindowManagerProvider, type AppId, type WindowState } from "./WindowManager";

const MOBILE_BREAKPOINT = 768;

// Subscribe to viewport size; null on the server so SSR renders only the wallpaper.
function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
const useViewport = () =>
  useSyncExternalStore(
    subscribe,
    () => `${window.innerWidth}x${window.innerHeight}`,
    () => null,
  );

function initialWindows(vw: number, vh: number): Record<AppId, WindowState> {
  const isMobile = vw < MOBILE_BREAKPOINT;
  return Object.fromEntries(
    apps.map((app, i) => [
      app.id,
      {
        // Desktop boots with Notes open, like the inspiration; mobile boots to the home screen.
        open: app.id === "notes" && !isMobile,
        minimized: false,
        maximized: false,
        z: i + 1,
        rect: app.rect(vw, vh),
      },
    ]),
  ) as Record<AppId, WindowState>;
}

export function Desktop() {
  const viewport = useViewport();
  // Freeze the initial window layout from the first viewport we see.
  const [initial, setInitial] = useState<Record<AppId, WindowState> | null>(null);

  if (viewport && !initial) {
    const [vw, vh] = viewport.split("x").map(Number);
    setInitial(initialWindows(vw, vh));
  }

  const isMobile = viewport ? Number(viewport.split("x")[0]) < MOBILE_BREAKPOINT : false;

  return (
    <main className="wallpaper fixed inset-0 overflow-hidden">
      {initial && (
        <WindowManagerProvider initial={initial}>
          {isMobile ? <MobileHome /> : <DesktopView />}
        </WindowManagerProvider>
      )}
    </main>
  );
}

function DesktopView() {
  const { state, open } = useWindows();
  const [selected, setSelected] = useState<string | null>(null);

  const shortcuts: { label: string; app: AppId }[] = [
    { label: "Projects", app: "finder" },
    { label: "experience.rtf", app: "textedit" },
    { label: "Terminal", app: "terminal" },
    { label: "Say hi", app: "mail" },
  ];

  return (
    <>
      <MenuBar />
      {/* Clicking empty desktop clears icon selection */}
      <div className="absolute inset-0" onPointerDown={() => setSelected(null)} />

      <ul className="absolute right-4 top-10 flex flex-col items-center gap-3">
        {shortcuts.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => setSelected(s.label)}
              onDoubleClick={() => open(s.app)}
              onKeyDown={(e) => e.key === "Enter" && open(s.app)}
              className="flex w-20 flex-col items-center gap-1"
            >
              <span className={`rounded-md p-1 ${selected === s.label ? "bg-black/25" : ""}`}>
                <AppIcon app={appById[s.app]} size={52} />
              </span>
              <span
                className={`rounded px-1 text-center text-[12px] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] ${
                  selected === s.label ? "bg-sky-600" : ""
                }`}
              >
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {apps.map(({ id, title, Component, bodyClassName }) =>
        state.windows[id].open ? (
          <Window key={id} id={id} title={title} bodyClassName={bodyClassName}>
            <Component />
          </Window>
        ) : null,
      )}

      <Dock />
    </>
  );
}

function MobileHome() {
  const { state, open, close } = useWindows();
  const active = state.focused && state.windows[state.focused].open ? appById[state.focused] : null;
  const time = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <div className="flex h-full flex-col text-white">
      <div className="px-6 pb-2 pt-3 text-[14px] font-semibold">
        <span suppressHydrationWarning>{time}</span>
      </div>

      {/* iOS-style widget */}
      <button
        type="button"
        onClick={() => open("notes")}
        className="mx-5 mt-4 rounded-3xl border border-white/20 bg-white/20 p-5 text-left backdrop-blur-xl"
      >
        <p className="text-[12px] font-semibold uppercase tracking-wide text-white/70">hello, I&apos;m</p>
        <p className="text-[26px] font-bold leading-tight">{profile.name}</p>
        <p className="mt-1 text-[14px] text-white/85">
          {profile.currentRole} · {profile.location}
        </p>
      </button>

      <div className="grid flex-1 auto-rows-min grid-cols-4 gap-x-2 gap-y-6 px-5 pt-8">
        {apps.map((app) => (
          <button key={app.id} type="button" onClick={() => open(app.id)} className="flex flex-col items-center gap-1.5">
            <AppIcon app={app} size={60} />
            <span className="text-[11px] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{app.mobileName}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="window-enter fixed inset-0 z-50 flex flex-col bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
          <header className="flex h-12 shrink-0 items-center border-b border-black/5 px-2 dark:border-white/10">
            <button type="button" onClick={() => close(active.id)} className="flex items-center text-[15px] text-sky-500">
              <ChevronLeft size={22} /> Home
            </button>
            <span className="absolute inset-x-0 -z-10 text-center text-[15px] font-semibold">{active.mobileName}</span>
          </header>
          <div className={`min-h-0 flex-1 overflow-auto ${active.bodyClassName ?? ""}`}>
            <active.Component />
          </div>
        </div>
      )}
    </div>
  );
}
