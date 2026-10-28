"use client";

import type { ReactNode } from "react";
import { BatteryFull, BatteryLow, Bluetooth, Lock, Moon, Radio, SlidersHorizontal, Sun, SunMoon, Volume2, Wifi, WifiOff } from "lucide-react";
import { MenuList, MenuPanel } from "./Menu";
import { useWindows } from "./WindowManager";
import { useSettings } from "@/lib/settings";

const NETWORKS = ["Sarthak's iPhone", "Namma Wi-Fi 5G", "Third Wave Coffee"];

export function StatusMenus({ open, setOpen }: { open: string | null; setOpen: (id: string | null) => void }) {
  const { settings, update, resolvedTheme } = useSettings();
  const { openApp } = useWindows();

  const trigger = (id: string, icon: ReactNode, label: string) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => setOpen(open === id ? null : id)}
      onPointerEnter={() => open && setOpen(id)}
      className={`flex h-[22px] items-center rounded px-2 ${open === id ? "bg-black/10 dark:bg-white/20" : ""}`}
    >
      {icon}
    </button>
  );

  return (
    <>
      <div className="relative">
        {trigger(
          "battery",
          <span className="flex items-center gap-1 text-[12px]">
            97%
            {settings.lowPower ? <BatteryLow size={20} className="text-amber-500" /> : <BatteryFull size={20} />}
          </span>,
          "Battery",
        )}
        {open === "battery" && (
          <MenuPanel className="right-0">
            <div className="flex justify-between px-2.5 py-1 font-semibold">
              Battery <span className="font-normal text-neutral-500">97%</span>
            </div>
            <p className="px-2.5 pb-1 text-[12px] text-neutral-500">Power Source: Chai ☕</p>
            <MenuList
              onDone={() => setOpen(null)}
              items={[
                { separator: true },
                { label: "Low Power Mode", checked: settings.lowPower, action: () => update({ lowPower: !settings.lowPower }) },
                { label: "Battery Settings…", action: () => openApp("settings") },
              ]}
            />
          </MenuPanel>
        )}
      </div>

      <div className="relative">
        {trigger("wifi", settings.wifi ? <Wifi size={16} /> : <WifiOff size={16} />, "Wi-Fi")}
        {open === "wifi" && (
          <MenuPanel className="right-0">
            <div className="flex items-center justify-between px-2.5 py-1">
              <span className="font-semibold">Wi-Fi</span>
              <Switch on={settings.wifi} onChange={(v) => update({ wifi: v })} label="Wi-Fi" />
            </div>
            {settings.wifi && (
              <>
                <p className="px-2.5 pt-1 text-[11px] font-semibold text-neutral-500">Known Network</p>
                <MenuList
                  onDone={() => setOpen(null)}
                  items={NETWORKS.map((n, i) => ({ label: n, checked: i === 1, action: () => {} }))}
                />
              </>
            )}
            <MenuList onDone={() => setOpen(null)} items={[{ separator: true }, { label: "Wi-Fi Settings…", action: () => openApp("settings") }]} />
          </MenuPanel>
        )}
      </div>

      <div className="relative">
        {trigger("control", <SlidersHorizontal size={15} />, "Control Center")}
        {open === "control" && (
          <MenuPanel className="right-0 w-80 p-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-2 rounded-xl bg-black/5 p-2.5 dark:bg-white/10">
                <Tile icon={<Wifi size={14} />} label="Wi-Fi" sub={settings.wifi ? "Namma Wi-Fi 5G" : "Off"} on={settings.wifi} onClick={() => update({ wifi: !settings.wifi })} />
                <Tile icon={<Bluetooth size={14} />} label="Bluetooth" sub={settings.bluetooth ? "On" : "Off"} on={settings.bluetooth} onClick={() => update({ bluetooth: !settings.bluetooth })} />
                <Tile icon={<Radio size={14} />} label="AirDrop" sub={settings.airdrop ? "Everyone" : "Off"} on={settings.airdrop} onClick={() => update({ airdrop: !settings.airdrop })} />
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex-1 rounded-xl bg-black/5 p-2.5 dark:bg-white/10">
                  <Tile icon={<Moon size={14} />} label="Focus" sub={settings.focus ? "Do Not Disturb" : "Off"} on={settings.focus} onClick={() => update({ focus: !settings.focus })} />
                </div>
                <div className="grid flex-1 grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => update({ theme: resolvedTheme === "dark" ? "light" : "dark" })}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-black/5 p-2 text-[11px] dark:bg-white/10"
                  >
                    <SunMoon size={16} /> {resolvedTheme === "dark" ? "Light" : "Dark"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(null);
                      openApp("settings");
                    }}
                    className="flex flex-col items-center justify-center gap-1 rounded-xl bg-black/5 p-2 text-[11px] dark:bg-white/10"
                  >
                    <Lock size={16} /> Settings
                  </button>
                </div>
              </div>
            </div>
            <Slider label="Display" icon={<Sun size={14} />} value={settings.brightness} min={20} onChange={(v) => update({ brightness: v })} />
            <Slider label="Sound" icon={<Volume2 size={14} />} value={settings.volume} onChange={(v) => update({ volume: v })} />
          </MenuPanel>
        )}
      </div>
    </>
  );
}

function Tile({ icon, label, sub, on, onClick }: { icon: ReactNode; label: string; sub: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 text-left">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${on ? "bg-[#0a7cff] text-white" : "bg-black/10 dark:bg-white/15"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold leading-tight">{label}</span>
        <span className="block truncate text-[11px] leading-tight text-neutral-500">{sub}</span>
      </span>
    </button>
  );
}

function Slider({ label, icon, value, min = 0, onChange }: { label: string; icon: ReactNode; value: number; min?: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-2.5 rounded-xl bg-black/5 p-2.5 dark:bg-white/10">
      <p className="mb-1.5 text-[12px] font-semibold">{label}</p>
      <label className="flex items-center gap-2">
        {icon}
        <input
          type="range"
          min={min}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="h-1.5 w-full cursor-pointer accent-white dark:accent-neutral-200"
        />
      </label>
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${on ? "bg-[#0a7cff]" : "bg-black/15 dark:bg-white/20"}`}
    >
      <span className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-[left] ${on ? "left-[18px]" : "left-[2px]"}`} />
    </button>
  );
}
