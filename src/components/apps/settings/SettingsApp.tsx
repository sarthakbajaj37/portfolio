"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { Bluetooth, Clock, Info, LayoutPanelLeft, Monitor, Moon, Palette, Image as ImageIcon, Search, Wifi, type LucideIcon } from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { Switch } from "@/components/desktop/StatusMenus";
import { profile } from "@/data/profile";
import { useSettings, type Settings, type ThemePref } from "@/lib/settings";
import { wallpapers } from "@/lib/wallpapers";

type PaneId = "wifi" | "bluetooth" | "focus" | "appearance" | "wallpaper" | "dock" | "menubar" | "display" | "about";

const PANES: { id: PaneId; label: string; Icon: LucideIcon; color: string; group: number }[] = [
  { id: "wifi", label: "Wi-Fi", Icon: Wifi, color: "bg-[#0a7cff]", group: 0 },
  { id: "bluetooth", label: "Bluetooth", Icon: Bluetooth, color: "bg-[#0a7cff]", group: 0 },
  { id: "focus", label: "Focus", Icon: Moon, color: "bg-[#5e5ce6]", group: 1 },
  { id: "appearance", label: "Appearance", Icon: Palette, color: "bg-neutral-800", group: 2 },
  { id: "wallpaper", label: "Wallpaper", Icon: ImageIcon, color: "bg-[#32ade6]", group: 2 },
  { id: "dock", label: "Desktop & Dock", Icon: LayoutPanelLeft, color: "bg-neutral-800", group: 2 },
  { id: "menubar", label: "Menu Bar & Clock", Icon: Clock, color: "bg-neutral-500", group: 2 },
  { id: "display", label: "Displays & Sound", Icon: Monitor, color: "bg-[#0a7cff]", group: 2 },
  { id: "about", label: "About", Icon: Info, color: "bg-neutral-500", group: 3 },
];

export function SettingsApp({ metadata, mobile }: AppProps) {
  const initial = PANES.some((p) => p.id === metadata.pane) ? (metadata.pane as PaneId) : "appearance";
  const [pane, setPane] = useState<PaneId>(initial);
  const [query, setQuery] = useState("");
  const current = PANES.find((p) => p.id === pane)!;
  const visible = PANES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex h-full text-[13px]">
      <aside className={`${mobile ? "w-40" : "w-56"} shrink-0 overflow-y-auto border-r border-black/5 bg-neutral-100/80 p-2.5 dark:border-white/5 dark:bg-neutral-900/70`}>
        <label className="mb-3 flex items-center gap-1.5 rounded-md bg-black/5 px-2 py-1 text-neutral-500 dark:bg-white/10">
          <Search size={12} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full bg-transparent outline-none" />
        </label>
        <button type="button" onClick={() => setPane("about")} className="mb-3 flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-neutral-300 to-neutral-500 text-[13px] font-semibold text-white">SB</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{profile.name}</span>
            <span className="block truncate text-[11px] text-neutral-500">Apple Account</span>
          </span>
        </button>
        {visible.map((p, i) => (
          <div key={p.id}>
            {i > 0 && visible[i - 1].group !== p.group && <div className="h-3" />}
            <button
              type="button"
              onClick={() => setPane(p.id)}
              className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left ${pane === p.id ? "bg-[#0a7cff] text-white" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] text-white ${p.color}`}>
                <p.Icon size={12} />
              </span>
              <span className="truncate">{p.label}</span>
            </button>
          </div>
        ))}
      </aside>

      <section className="min-w-0 flex-1 overflow-y-auto bg-neutral-50 px-6 py-4 dark:bg-neutral-900">
        <h1 className="mb-4 text-[15px] font-bold">{current.label}</h1>
        <PaneContent pane={pane} />
      </section>
    </div>
  );
}

function PaneContent({ pane }: { pane: PaneId }) {
  const { settings, update } = useSettings();
  const clock = (patch: Partial<Settings["clock"]>) => update({ clock: { ...settings.clock, ...patch } });
  const dock = (patch: Partial<Settings["dock"]>) => update({ dock: { ...settings.dock, ...patch } });

  switch (pane) {
    case "wifi":
      return (
        <Group>
          <Row label="Wi-Fi" control={<Switch label="Wi-Fi" on={settings.wifi} onChange={(v) => update({ wifi: v })} />} />
          {settings.wifi && <Row label="Namma Wi-Fi 5G" detail="Connected" />}
        </Group>
      );
    case "bluetooth":
      return (
        <Group>
          <Row label="Bluetooth" control={<Switch label="Bluetooth" on={settings.bluetooth} onChange={(v) => update({ bluetooth: v })} />} />
          {settings.bluetooth && <Row label="Sarthak's AirPods Pro" detail="Connected" />}
        </Group>
      );
    case "focus":
      return (
        <Group>
          <Row label="Do Not Disturb" detail="Silences Messages sounds and notifications" control={<Switch label="Do Not Disturb" on={settings.focus} onChange={(v) => update({ focus: v })} />} />
        </Group>
      );
    case "appearance":
      return (
        <Group>
          <div className="flex gap-5 p-3">
            {(["auto", "light", "dark"] as ThemePref[]).map((t) => (
              <button key={t} type="button" onClick={() => update({ theme: t })} className="flex flex-col items-center gap-1.5">
                <span
                  className={`h-14 w-20 overflow-hidden rounded-lg border-2 ${settings.theme === t ? "border-[#0a7cff]" : "border-transparent"} ${
                    t === "light" ? "bg-[#e8e8ed]" : t === "dark" ? "bg-[#1c1c1e]" : "bg-gradient-to-r from-[#e8e8ed] from-50% to-[#1c1c1e] to-50%"
                  }`}
                >
                  <span className={`m-2 block h-6 rounded ${t === "dark" ? "bg-neutral-700" : "bg-white"}`} />
                </span>
                <span className="text-[12px] capitalize">{t}</span>
              </button>
            ))}
          </div>
        </Group>
      );
    case "wallpaper":
      return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-3">
          {wallpapers.map((w) => (
            <button key={w.id} type="button" onClick={() => update({ wallpaper: w.id })} className="flex flex-col items-center gap-1">
              <span className={`relative block aspect-video w-full overflow-hidden rounded-lg border-2 ${settings.wallpaper === w.id ? "border-[#0a7cff]" : "border-transparent"}`}>
                {w.thumb ? (
                  <Image src={w.thumb} alt={w.name} fill sizes="160px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0" style={{ background: w.css }} />
                )}
              </span>
              <span className="text-[12px]">{w.name}</span>
            </button>
          ))}
        </div>
      );
    case "dock":
      return (
        <Group>
          <Row label="Magnification" control={<Switch label="Magnification" on={settings.dock.magnification} onChange={(v) => dock({ magnification: v })} />} />
          <Row label="Show indicators for open applications" control={<Switch label="Indicators" on={settings.dock.showIndicators} onChange={(v) => dock({ showIndicators: v })} />} />
        </Group>
      );
    case "menubar":
      return (
        <>
          <Group>
            <Row label="Show menu bar background" control={<Switch label="Menu bar background" on={settings.menuBarBackground} onChange={(v) => update({ menuBarBackground: v })} />} />
          </Group>
          <Group title="Clock">
            <Row label="Show the day of the week" control={<Switch label="Day" on={settings.clock.showDay} onChange={(v) => clock({ showDay: v })} />} />
            <Row label="Show date" control={<Switch label="Date" on={settings.clock.showDate} onChange={(v) => clock({ showDate: v })} />} />
            <Row label="Display the time with seconds" control={<Switch label="Seconds" on={settings.clock.showSeconds} onChange={(v) => clock({ showSeconds: v })} />} />
            <Row label="Use a 24-hour clock" control={<Switch label="24-hour" on={settings.clock.hour24} onChange={(v) => clock({ hour24: v })} />} />
            <Row label="Flash the time separators" control={<Switch label="Flash" on={settings.clock.flashSeparators} onChange={(v) => clock({ flashSeparators: v })} />} />
          </Group>
        </>
      );
    case "display":
      return (
        <Group>
          <Row label="Brightness" control={<Range label="Brightness" value={settings.brightness} min={20} onChange={(v) => update({ brightness: v })} />} />
          <Row label="Output volume" control={<Range label="Volume" value={settings.volume} onChange={(v) => update({ volume: v })} />} />
          <Row label="Low Power Mode" control={<Switch label="Low Power Mode" on={settings.lowPower} onChange={(v) => update({ lowPower: v })} />} />
        </Group>
      );
    case "about":
      return (
        <Group>
          <Row label="Name" detail={profile.name} />
          <Row label="Role" detail={profile.currentRole} />
          <Row label="Location" detail={profile.location} />
          <Row label="Email" detail={profile.email} />
          <Row label="macOS" detail="Sarthak OS 26 (built with Next.js)" />
        </Group>
      );
  }
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      {title && <p className="mb-1.5 px-1 text-[12px] font-semibold text-neutral-500">{title}</p>}
      <div className="divide-y divide-black/5 rounded-lg border border-black/5 bg-white dark:divide-white/5 dark:border-white/5 dark:bg-neutral-800">{children}</div>
    </div>
  );
}

function Row({ label, detail, control }: { label: string; detail?: string; control?: ReactNode }) {
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 px-3 py-2">
      <div className="min-w-0">
        <p>{label}</p>
        {detail && control && <p className="text-[11px] text-neutral-500">{detail}</p>}
      </div>
      {control ?? (detail && <span className="truncate text-neutral-500">{detail}</span>)}
    </div>
  );
}

function Range({ label, value, min = 0, onChange }: { label: string; value: number; min?: number; onChange: (v: number) => void }) {
  return <input type="range" aria-label={label} min={min} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-48 accent-[#0a7cff]" />;
}
