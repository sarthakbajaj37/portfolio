"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

export type ThemePref = "auto" | "light" | "dark";

export type Settings = {
  theme: ThemePref;
  wallpaper: string;
  clock: { showDay: boolean; showDate: boolean; showSeconds: boolean; hour24: boolean; flashSeparators: boolean };
  dock: { magnification: boolean; showIndicators: boolean };
  menuBarBackground: boolean;
  brightness: number; // 0–100
  volume: number; // 0–100
  wifi: boolean;
  bluetooth: boolean;
  airdrop: boolean;
  focus: boolean;
  lowPower: boolean;
};

export const defaultSettings: Settings = {
  theme: "auto",
  wallpaper: "sierra",
  clock: { showDay: true, showDate: true, showSeconds: false, hour24: false, flashSeparators: false },
  dock: { magnification: true, showIndicators: true },
  menuBarBackground: true,
  brightness: 100,
  volume: 60,
  wifi: true,
  bluetooth: true,
  airdrop: false,
  focus: false,
  lowPower: false,
};

const STORAGE_KEY = "sb-settings-v1";

type Ctx = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  /** theme after resolving "auto" against the OS preference */
  resolvedTheme: "light" | "dark";
};

const SettingsContext = createContext<Ctx | null>(null);

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const saved = JSON.parse(raw) as Partial<Settings>;
    // Merge nested objects so new settings get defaults.
    return {
      ...defaultSettings,
      ...saved,
      clock: { ...defaultSettings.clock, ...saved.clock },
      dock: { ...defaultSettings.dock, ...saved.dock },
    };
  } catch {
    return defaultSettings;
  }
}

function subscribeDark(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const useOsDark = () =>
  useSyncExternalStore(
    subscribeDark,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Only ever rendered on the client (the desktop mounts after the viewport is known).
  const [settings, setSettings] = useState<Settings>(load);
  const osDark = useOsDark();
  const resolvedTheme = settings.theme === "auto" ? (osDark ? "dark" : "light") : settings.theme;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  return <SettingsContext.Provider value={{ settings, update, resolvedTheme }}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}
