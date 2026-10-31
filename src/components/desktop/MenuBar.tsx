"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Moon } from "lucide-react";
import { AppleIcon } from "@/components/BrandIcons";
import { useWindows } from "./WindowManager";
import { appById } from "./apps";
import { appMeta } from "./app-meta";
import { MenuList, MenuPanel, type MenuItem } from "./Menu";
import { StatusMenus } from "./StatusMenus";
import { useSettings, type Settings } from "@/lib/settings";
import { profile } from "@/data/profile";

export type SystemActions = {
  about: () => void;
  sleep: () => void;
  restart: () => void;
  shutDown: () => void;
  lock: () => void;
  logOut: () => void;
  toggleNotifications: () => void;
};

/** Formats the menu-bar clock like macOS, e.g. "Thu 29 Oct  12:51 AM". */
export function formatClock(now: Date, c: Settings["clock"], blink: boolean) {
  const day = c.showDay ? now.toLocaleDateString("en-GB", { weekday: "short" }) : "";
  const date = c.showDate ? now.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  let time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: c.showSeconds ? "2-digit" : undefined,
    hour12: !c.hour24,
  });
  if (c.flashSeparators && blink) time = time.replace(/:/g, " ");
  return [day, date, time].filter(Boolean).join(" ");
}

function useNow(fast: boolean) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), fast ? 500 : 5000);
    return () => clearInterval(t);
  }, [fast]);
  return now;
}

export function MenuBar({ actions }: { actions: SystemActions }) {
  const { state, focusedApp, openApp, close, minimize, toggleMaximize, focus, quitApp } = useWindows();
  const { settings } = useSettings();
  const [open, setOpen] = useState<string | null>(null);
  const barRef = useRef<HTMLElement>(null);
  const now = useNow(settings.clock.showSeconds || settings.clock.flashSeparators);
  const blink = now.getMilliseconds() >= 500;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(null);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const app = focusedApp ? appById[focusedApp] : appById.finder;
  const focusedId = state.focused;
  const openWindows = Object.values(state.windows)
    .filter((w) => w.open)
    .sort((a, b) => a.z - b.z);

  const menus: { id: string; label: ReactNode; bold?: boolean; items: MenuItem[] }[] = [
    {
      id: "apple",
      label: <AppleIcon size={15} />,
      items: [
        { label: "About This Mac", action: actions.about },
        { separator: true },
        { label: "System Settings…", action: () => openApp("settings") },
        { separator: true },
        { label: "Sleep", action: actions.sleep },
        { label: "Restart…", action: actions.restart },
        { label: "Shut Down…", action: actions.shutDown },
        { separator: true },
        { label: "Lock Screen", action: actions.lock },
        { label: `Log Out ${profile.name}…`, action: actions.logOut },
      ],
    },
    {
      id: "app",
      label: app.name,
      bold: true,
      items: [
        { label: `About ${app.name}`, action: () => openApp("notes") },
        { separator: true },
        { label: "Settings…", action: () => openApp("settings") },
        { separator: true },
        { label: `Quit ${app.name}`, action: focusedApp ? () => quitApp(focusedApp) : undefined },
      ],
    },
    {
      id: "file",
      label: "File",
      items: [
        { label: appMeta[app.id].multiWindow ? `New ${app.name} Window` : `Open ${app.name}`, action: () => openApp(app.id) },
        { label: "New Note", action: () => openApp("notes") },
        { separator: true },
        { label: "Close Window", action: focusedId ? () => close(focusedId) : undefined },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [{ label: "Undo" }, { label: "Redo" }, { separator: true }, { label: "Cut" }, { label: "Copy" }, { label: "Paste" }, { label: "Select All" }],
    },
    {
      id: "view",
      label: "View",
      items: [{ label: "Enter Full Screen", action: focusedId ? () => toggleMaximize(focusedId) : undefined }],
    },
    {
      id: "window",
      label: "Window",
      items: [
        { label: "Minimize", action: focusedId ? () => minimize(focusedId) : undefined },
        { label: "Zoom", action: focusedId ? () => toggleMaximize(focusedId) : undefined },
        { separator: true },
        ...openWindows.map((w) => ({
          label: w.title ?? appById[w.appId].title,
          checked: w.id === focusedId,
          action: () => focus(w.id),
        })),
      ],
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Say hi to Sarthak", action: () => openApp("mail") },
        { label: "Open Terminal (try `help`)", action: () => openApp("terminal") },
        { label: "View Source on GitHub", action: () => window.open(`${profile.links.github}/portfolio`, "_blank") },
      ],
    },
  ];

  return (
    <nav
      ref={barRef}
      aria-label="Menu bar"
      className={`fixed inset-x-0 top-0 z-[10000] flex h-7 select-none items-center justify-between px-2 text-[13px] text-black dark:text-white ${
        settings.menuBarBackground ? "bg-white/40 backdrop-blur-2xl dark:bg-black/35" : ""
      } [text-shadow:0_0_1px_rgba(255,255,255,0.2)]`}
    >
      <div className="flex min-w-0 items-center">
        {menus.map((m) => (
          <div key={m.id} className={`relative ${["edit", "view", "help"].includes(m.id) ? "hidden lg:block" : ""}`}>
            <button
              type="button"
              aria-label={m.id === "apple" ? "Apple menu" : undefined}
              onClick={() => setOpen(open === m.id ? null : m.id)}
              onPointerEnter={() => open && setOpen(m.id)}
              className={`rounded px-2.5 py-0.5 ${m.bold ? "font-bold" : ""} ${open === m.id ? "bg-black/10 dark:bg-white/20" : ""}`}
            >
              {m.label}
            </button>
            {open === m.id && (
              <MenuPanel className="left-0">
                <MenuList items={m.items} onDone={() => setOpen(null)} />
              </MenuPanel>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1">
        {settings.focus && <Moon size={14} className="mx-1.5 fill-current" aria-label="Focus is on" />}
        <StatusMenus open={open} setOpen={setOpen} />
        <button
          type="button"
          onClick={() => {
            setOpen(null);
            actions.toggleNotifications();
          }}
          aria-label="Notification Center"
          className="rounded px-2 py-0.5 tabular-nums hover:bg-black/10 dark:hover:bg-white/15"
        >
          <time suppressHydrationWarning>{formatClock(now, settings.clock, blink)}</time>
        </button>
      </div>
    </nav>
  );
}
