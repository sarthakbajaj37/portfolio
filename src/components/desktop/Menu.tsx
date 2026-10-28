"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

export type MenuItem =
  | { separator: true }
  | { label: string; action?: () => void; disabled?: boolean; checked?: boolean; hint?: string };

/** macOS-style dropdown panel used by the menu bar and status menus. */
export function MenuPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute top-[26px] z-[10001] min-w-56 rounded-lg border border-black/10 bg-white/80 p-1 text-[13px] text-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-2xl dark:border-white/15 dark:bg-neutral-800/80 dark:text-neutral-100 ${className}`}
    >
      {children}
    </div>
  );
}

export function MenuList({ items, onDone }: { items: MenuItem[]; onDone: () => void }) {
  return (
    <>
      {items.map((it, i) =>
        "separator" in it ? (
          <hr key={i} className="mx-2.5 my-1 border-black/10 dark:border-white/10" />
        ) : (
          <button
            key={it.label}
            type="button"
            disabled={it.disabled || !it.action}
            onClick={() => {
              it.action?.();
              onDone();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-[3px] text-left enabled:hover:bg-[#0a7cff] enabled:hover:text-white disabled:text-neutral-400 dark:disabled:text-neutral-500"
          >
            <span className="w-3 shrink-0">{it.checked && <Check size={12} strokeWidth={3} />}</span>
            <span className="flex-1 truncate">{it.label}</span>
            {it.hint && <span className="text-neutral-400">{it.hint}</span>}
          </button>
        ),
      )}
    </>
  );
}
