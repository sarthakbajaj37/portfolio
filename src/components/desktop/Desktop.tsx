"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import { MenuBar, type SystemActions } from "./MenuBar";
import { Dock } from "./Dock";
import { Window } from "./Window";
import { NotificationCenter } from "./NotificationCenter";
import { AboutThisMac, BlackScreen, BootScreen, LockScreen, type SystemMode } from "./SystemScreens";
import { MenuList, MenuPanel } from "./Menu";
import { AppIcon, apps, appById } from "./apps";
import { useWindows, WindowManagerProvider, WindowSelfContext } from "./WindowManager";
import type { AppId } from "./types";
import { profile } from "@/data/profile";
import { SettingsProvider, useSettings } from "@/lib/settings";
import { wallpaperCss } from "@/lib/wallpapers";
import { MusicProvider } from "@/components/apps/music/MusicProvider";
import { useOpenPath } from "@/components/apps/finder/useOpenPath";
import { DESKTOP, EXPERIENCE_PATH, PROJECTS } from "@/lib/vfs";

const MOBILE_BREAKPOINT = 768;
/** First visit: Messages behind, Notes in front (last = on top). */
const DEFAULT_APPS: AppId[] = ["messages", "notes"];

// Subscribe to viewport size; null on the server so SSR renders only a backdrop.
function subscribe(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
function useViewport() {
  const key = useSyncExternalStore(
    subscribe,
    () => `${window.innerWidth}x${window.innerHeight}`,
    () => null,
  );
  if (!key) return null;
  const [w, h] = key.split("x").map(Number);
  return { w, h };
}

export function Desktop() {
  const viewport = useViewport();
  if (!viewport) return <main className="wallpaper fixed inset-0" />;

  return (
    <SettingsProvider>
      <MusicProvider>
        <WindowManagerProvider viewport={viewport} defaultApps={DEFAULT_APPS}>
          {viewport.w < MOBILE_BREAKPOINT ? <MobileHome /> : <DesktopView />}
        </WindowManagerProvider>
      </MusicProvider>
    </SettingsProvider>
  );
}

function DesktopView() {
  const { state, openApp, reset } = useWindows();
  const { settings } = useSettings();
  const openPath = useOpenPath();
  const [mode, setMode] = useState<SystemMode>("active");
  const [about, setAbout] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const afterBoot = useCallback(() => {
    reset(DEFAULT_APPS);
    setMode("locked");
  }, [reset]);

  const actions: SystemActions = {
    about: () => setAbout(true),
    sleep: () => setMode("sleeping"),
    restart: () => setMode("booting"),
    shutDown: () => setMode("off"),
    lock: () => setMode("locked"),
    logOut: () => {
      reset(DEFAULT_APPS);
      setMode("locked");
    },
    toggleNotifications: () => setNotifications((v) => !v),
  };

  useEffect(() => {
    if (!contextMenu) return;
    const onDown = () => setContextMenu(null);
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [contextMenu]);

  const shortcuts: { label: string; app: AppId; open: () => void }[] = [
    { label: "Projects", app: "finder", open: () => openPath(PROJECTS) },
    { label: "experience.rtf", app: "textedit", open: () => openPath(EXPERIENCE_PATH) },
    { label: "Terminal", app: "terminal", open: () => openApp("terminal") },
    { label: "Say hi", app: "mail", open: () => openApp("mail") },
  ];

  const openWindows = Object.values(state.windows).filter((w) => w.open);

  return (
    <main className="fixed inset-0 overflow-hidden" style={{ background: wallpaperCss(settings.wallpaper) }}>
      {mode !== "off" && mode !== "booting" && (
        <>
          <MenuBar actions={actions} />

          {/* Empty desktop: clears selection, right-click menu */}
          <div
            className="absolute inset-0"
            onPointerDown={() => {
              setSelected(null);
              setNotifications(false);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY });
            }}
          />

          <ul className="absolute right-4 top-10 flex flex-col items-center gap-3">
            {shortcuts.map((s) => (
              <li key={s.label}>
                <button
                  type="button"
                  onClick={() => setSelected(s.label)}
                  onDoubleClick={s.open}
                  onKeyDown={(e) => e.key === "Enter" && s.open()}
                  className="flex w-20 flex-col items-center gap-1"
                >
                  <span className={`rounded-md p-1 ${selected === s.label ? "bg-black/25" : ""}`}>
                    <AppIcon app={appById[s.app]} size={56} />
                  </span>
                  <span
                    className={`rounded px-1 text-center text-[12px] font-medium text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.7)] ${
                      selected === s.label ? "bg-[#0a7cff]" : ""
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {openWindows.map((w) => {
            const app = appById[w.appId];
            return (
              <Window key={w.id} win={w} title={w.title ?? app.title} bodyClassName={app.bodyClassName}>
                <app.Component windowId={w.id} metadata={w.metadata} />
              </Window>
            );
          })}

          <Dock />
          <NotificationCenter open={notifications} onClose={() => setNotifications(false)} />

          {contextMenu && (
            <div className="fixed z-[9500]" style={{ left: contextMenu.x, top: contextMenu.y - 26 }}>
              <MenuPanel className="left-0">
                <MenuList
                  onDone={() => setContextMenu(null)}
                  items={[
                    { label: "New Finder Window", action: () => openPath(DESKTOP) },
                    { label: "Open Terminal Here", action: () => openApp("terminal") },
                    { separator: true },
                    { label: "Change Wallpaper…", action: () => openApp("settings", { metadata: { pane: "wallpaper" } }) },
                    { label: "About This Mac", action: () => setAbout(true) },
                  ]}
                />
              </MenuPanel>
            </div>
          )}
          {about && <AboutThisMac onClose={() => setAbout(false)} />}
        </>
      )}

      {mode === "booting" && <BootScreen onDone={afterBoot} />}
      {mode === "locked" && <LockScreen onUnlock={() => setMode("active")} />}
      {mode === "sleeping" && <BlackScreen hint="Click to wake" onWake={() => setMode("locked")} />}
      {mode === "off" && <BlackScreen hint="Click to turn on" onWake={() => setMode("booting")} />}

      {/* Display brightness from Control Center */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[30000] bg-black"
        style={{ opacity: ((100 - settings.brightness) / 100) * 0.85 }}
      />
    </main>
  );
}

function MobileHome() {
  const { state, openApp, close } = useWindows();
  const { settings } = useSettings();
  const focused = state.focused ? state.windows[state.focused] : null;
  const active = focused?.open ? focused : null;
  const activeApp = active ? appById[active.appId] : null;
  const time = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <main className="fixed inset-0 overflow-hidden" style={{ background: wallpaperCss(settings.wallpaper) }}>
      <div className="flex h-full flex-col text-white">
        <div className="px-6 pb-2 pt-3 text-[14px] font-semibold">
          <span suppressHydrationWarning>{time}</span>
        </div>

        {/* iOS-style widget */}
        <button
          type="button"
          onClick={() => openApp("notes")}
          className="mx-5 mt-4 rounded-3xl border border-white/20 bg-black/20 p-5 text-left backdrop-blur-xl"
        >
          <p className="text-[12px] font-semibold uppercase tracking-wide text-white/70">hello, I&apos;m</p>
          <p className="text-[26px] font-bold leading-tight">{profile.name}</p>
          <p className="mt-1 text-[14px] text-white/85">
            {profile.currentRole} · {profile.location}
          </p>
        </button>

        <div className="grid flex-1 auto-rows-min grid-cols-4 gap-x-2 gap-y-6 px-5 pt-8">
          {apps
            .filter((a) => a.mobile)
            .map((app) => (
              <button key={app.id} type="button" onClick={() => openApp(app.id)} className="flex flex-col items-center gap-1.5">
                <AppIcon app={app} size={60} />
                <span className="text-[11px] [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">{app.mobileName}</span>
              </button>
            ))}
        </div>

        {active && activeApp && (
          <div className="window-enter fixed inset-0 z-50 flex flex-col bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
            <header className="relative flex h-12 shrink-0 items-center border-b border-black/5 px-2 dark:border-white/10">
              <button type="button" onClick={() => close(active.id)} className="relative z-10 flex items-center text-[15px] text-[#0a7cff]">
                <ChevronLeft size={22} /> Home
              </button>
              <span className="absolute inset-x-0 text-center text-[15px] font-semibold">{active.title ?? activeApp.mobileName}</span>
            </header>
            <div className={`relative min-h-0 flex-1 overflow-auto ${activeApp.bodyClassName ?? ""}`}>
              <WindowSelfContext.Provider value={{ windowId: active.id, isFocused: true }}>
                <activeApp.Component windowId={active.id} metadata={active.metadata} mobile />
              </WindowSelfContext.Provider>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
