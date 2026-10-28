"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useWindows, type AppId, type Rect } from "./WindowManager";

export const MENU_BAR_H = 28;
const MIN_W = 320;
const MIN_H = 220;

type DragMode = "move" | "resize";

export function Window({
  id,
  title,
  children,
  bodyClassName = "",
}: {
  id: AppId;
  title: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  const { state, close, minimize, toggleMaximize, focus, setRect } = useWindows();
  const win = state.windows[id];
  const isFocused = state.focused === id;

  // Live rect while dragging; committed to the store on pointerup.
  const [live, setLive] = useState<Rect | null>(null);
  const drag = useRef<{ mode: DragMode; px: number; py: number; start: Rect } | null>(null);
  const rect = live ?? win.rect;

  // Keep windows reachable if the browser window shrinks.
  useEffect(() => {
    const onResize = () => setRect(id, clamp(win.rect, "move"));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [id, win.rect, setRect]);

  function startDrag(mode: DragMode, e: ReactPointerEvent) {
    if (e.button !== 0 || win.maximized) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, px: e.clientX, py: e.clientY, start: win.rect };
    focus(id);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    const next =
      d.mode === "move"
        ? { ...d.start, x: d.start.x + dx, y: d.start.y + dy }
        : { ...d.start, w: d.start.w + dx, h: d.start.h + dy };
    setLive(clamp(next, d.mode));
  }

  function onPointerUp() {
    if (drag.current && live) setRect(id, live);
    drag.current = null;
    setLive(null);
  }

  const style = win.maximized
    ? { left: 0, top: MENU_BAR_H, width: "100vw", height: `calc(100vh - ${MENU_BAR_H}px - 84px)`, zIndex: win.z }
    : { left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: win.z };

  return (
    <section
      role="dialog"
      aria-label={title}
      onPointerDown={() => !isFocused && focus(id)}
      style={style}
      className={`window-enter absolute flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white text-neutral-900 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.45)] dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100 ${
        win.minimized ? "pointer-events-none translate-y-[60vh] scale-[0.15] opacity-0" : ""
      } ${win.maximized ? "rounded-none" : ""} ${live ? "" : "transition-[transform,opacity] duration-300 ease-out"}`}
    >
      {/* Title bar: drag handle + traffic lights */}
      <header
        onPointerDown={(e) => startDrag("move", e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => toggleMaximize(id)}
        className="relative flex h-9 shrink-0 cursor-default select-none items-center border-b border-black/5 bg-neutral-100/90 px-3 dark:border-white/5 dark:bg-neutral-800/90"
      >
        <div className="group flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
          <TrafficLight color="bg-[#ff5f57]" hoverColor="group-hover:bg-[#ff5f57]" label="Close" glyph="×" active={isFocused} onClick={() => close(id)} />
          <TrafficLight color="bg-[#febc2e]" hoverColor="group-hover:bg-[#febc2e]" label="Minimize" glyph="−" active={isFocused} onClick={() => minimize(id)} />
          <TrafficLight color="bg-[#28c840]" hoverColor="group-hover:bg-[#28c840]" label="Maximize" glyph="+" active={isFocused} onClick={() => toggleMaximize(id)} />
        </div>
        <h2
          className={`pointer-events-none absolute inset-x-0 text-center text-[13px] font-semibold ${
            isFocused ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-400"
          }`}
        >
          {title}
        </h2>
      </header>

      <div className={`min-h-0 flex-1 overflow-auto ${bodyClassName}`}>{children}</div>

      {/* Resize handle (bottom-right corner) */}
      {!win.maximized && (
        <div
          aria-hidden
          onPointerDown={(e) => startDrag("resize", e)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
        />
      )}
    </section>
  );
}

function TrafficLight({
  color,
  hoverColor,
  label,
  glyph,
  active,
  onClick,
}: {
  color: string;
  hoverColor: string;
  label: string;
  glyph: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-3 w-3 items-center justify-center rounded-full text-[10px] font-bold leading-none text-black/0 group-hover:text-black/60 ${
        active ? color : `bg-neutral-300 dark:bg-neutral-600 ${hoverColor}`
      }`}
    >
      {glyph}
    </button>
  );
}

function clamp(r: Rect, mode: DragMode): Rect {
  if (typeof window === "undefined") return r;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (mode === "resize") {
    return {
      ...r,
      w: Math.min(Math.max(r.w, MIN_W), vw - r.x),
      h: Math.min(Math.max(r.h, MIN_H), vh - r.y),
    };
  }
  // Keep at least part of the title bar on screen.
  return {
    ...r,
    x: Math.min(Math.max(r.x, -r.w + 120), vw - 120),
    y: Math.min(Math.max(r.y, MENU_BAR_H), vh - 60),
  };
}
