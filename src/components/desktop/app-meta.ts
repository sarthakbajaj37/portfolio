import type { AppId, Rect } from "./types";

// Plain data about each app (no components), used by the window manager.
// Visual bits (icon, component) live in apps.tsx.

export const MENU_BAR_H = 28;
export const DOCK_H = 84;

export type AppMeta = {
  id: AppId;
  name: string; // dock tooltip + bold menu-bar title
  title: string; // default window title
  multiWindow?: boolean;
  /** false = only shown in the dock while open */
  inDock: boolean;
  /** shown on the phone home screen */
  mobile: boolean;
  min: { w: number; h: number };
  size: { w: number; h: number };
  /** offset from the centre of the desktop, so windows don't all stack */
  offset?: { x: number; y: number };
};

export const appMeta: Record<AppId, AppMeta> = {
  finder: { id: "finder", name: "Finder", title: "Finder", multiWindow: true, inDock: true, mobile: true, min: { w: 520, h: 320 }, size: { w: 860, h: 520 }, offset: { x: -120, y: 30 } },
  notes: { id: "notes", name: "Notes", title: "Notes", inDock: true, mobile: true, min: { w: 520, h: 360 }, size: { w: 940, h: 620 } },
  messages: { id: "messages", name: "Messages", title: "Messages", inDock: true, mobile: true, min: { w: 560, h: 380 }, size: { w: 820, h: 560 }, offset: { x: -180, y: -20 } },
  mail: { id: "mail", name: "Mail", title: "New Message", inDock: true, mobile: true, min: { w: 420, h: 340 }, size: { w: 600, h: 460 }, offset: { x: 100, y: 40 } },
  calendar: { id: "calendar", name: "Calendar", title: "Calendar", inDock: true, mobile: true, min: { w: 640, h: 440 }, size: { w: 1000, h: 640 } },
  weather: { id: "weather", name: "Weather", title: "Weather", inDock: false, mobile: true, min: { w: 420, h: 480 }, size: { w: 760, h: 600 }, offset: { x: 80, y: 0 } },
  photos: { id: "photos", name: "Photos", title: "Photos", inDock: true, mobile: true, min: { w: 560, h: 380 }, size: { w: 900, h: 600 } },
  music: { id: "music", name: "Music", title: "Music", inDock: true, mobile: true, min: { w: 640, h: 420 }, size: { w: 980, h: 620 } },
  terminal: { id: "terminal", name: "Terminal", title: "sarthak — zsh — 80×24", inDock: true, mobile: false, min: { w: 400, h: 260 }, size: { w: 680, h: 430 }, offset: { x: 160, y: 70 } },
  textedit: { id: "textedit", name: "TextEdit", title: "Untitled", multiWindow: true, inDock: false, mobile: true, min: { w: 360, h: 280 }, size: { w: 720, h: 600 }, offset: { x: 60, y: 10 } },
  preview: { id: "preview", name: "Preview", title: "Preview", multiWindow: true, inDock: false, mobile: true, min: { w: 360, h: 280 }, size: { w: 760, h: 620 }, offset: { x: 40, y: 0 } },
  games: { id: "games", name: "Games", title: "Games", inDock: true, mobile: false, min: { w: 640, h: 460 }, size: { w: 920, h: 640 } },
  settings: { id: "settings", name: "System Settings", title: "System Settings", inDock: true, mobile: false, min: { w: 640, h: 440 }, size: { w: 780, h: 560 }, offset: { x: 40, y: 20 } },
};

export const appIds = Object.keys(appMeta) as AppId[];

/** macOS icon artwork in /public/icons (Mail has none and uses a drawn icon). */
export const appIconSrc: Partial<Record<AppId, string>> = {
  finder: "/icons/finder.png",
  notes: "/icons/notes.png",
  messages: "/icons/messages.png",
  calendar: "/icons/calendar.png",
  weather: "/icons/weather.png",
  photos: "/icons/photos.png",
  music: "/icons/music.png",
  terminal: "/icons/iterm.png",
  textedit: "/icons/textedit.png",
  preview: "/icons/preview.png",
  games: "/icons/games.png",
  settings: "/icons/settings.png",
};

/** Default frame for an app, centred on the desktop and clamped to the viewport. */
export function defaultRect(appId: AppId, vw: number, vh: number, cascade = 0): Rect {
  const m = appMeta[appId];
  const availH = vh - MENU_BAR_H - DOCK_H;
  const w = Math.min(m.size.w, vw - 40);
  const h = Math.min(m.size.h, availH - 20);
  const x = (vw - w) / 2 + (m.offset?.x ?? 0) + cascade * 30;
  const y = MENU_BAR_H + (availH - h) / 2 + (m.offset?.y ?? 0) + cascade * 30;
  return clampRect({ x, y, w, h }, vw, vh);
}

export function clampRect(r: Rect, vw: number, vh: number): Rect {
  return {
    ...r,
    x: Math.min(Math.max(r.x, -r.w + 100), vw - 100),
    y: Math.min(Math.max(r.y, MENU_BAR_H), vh - DOCK_H - 30),
  };
}
