"use client";

import type { ReactNode } from "react";

export type GameProps = {
  /** window focused — accept keyboard input & run loops only when true */
  active: boolean;
  mobile?: boolean;
  /** system volume 0–100 */
  volume: number;
};

export function Overlay({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-black/55 p-4 text-center text-white backdrop-blur-[2px]">
      <div className="text-xl font-bold">{title}</div>
      {subtitle && <div className="text-[13px] text-white/80">{subtitle}</div>}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function PrimaryButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-neutral-900 shadow hover:bg-neutral-100">
      {children}
    </button>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-16 flex-col items-center rounded-lg bg-black/5 px-3 py-1 dark:bg-white/10">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-[15px] font-bold tabular-nums">{value}</span>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-md bg-black/5 p-0.5 dark:bg-white/10">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={
            o.value === value
              ? "rounded-[5px] bg-white px-2.5 py-0.5 text-[12px] font-medium shadow-sm dark:bg-neutral-600"
              : "rounded-[5px] px-2.5 py-0.5 text-[12px] text-neutral-600 dark:text-neutral-300"
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Returns a direction for a swipe gesture, or null if it was a tap. */
export function swipeDir(dx: number, dy: number, min = 24): "up" | "down" | "left" | "right" | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < min) return null;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
