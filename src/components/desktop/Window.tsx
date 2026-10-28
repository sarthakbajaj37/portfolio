"use client";

import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { DOCK_H, MENU_BAR_H, appMeta, clampRect } from "./app-meta";
import { useWindows, WindowSelfContext } from "./WindowManager";
import type { Rect, WindowState } from "./types";

// "move" or one of 8 resize directions.
type Dir = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLES: { dir: Exclude<Dir, "move">; className: string }[] = [
  { dir: "n", className: "top-0 left-3 right-3 h-1.5 cursor-ns-resize" },
  { dir: "s", className: "bottom-0 left-3 right-3 h-1.5 cursor-ns-resize" },
  { dir: "e", className: "right-0 top-3 bottom-3 w-1.5 cursor-ew-resize" },
  { dir: "w", className: "left-0 top-3 bottom-3 w-1.5 cursor-ew-resize" },
  { dir: "nw", className: "left-0 top-0 h-3 w-3 cursor-nwse-resize" },
  { dir: "se", className: "right-0 bottom-0 h-3 w-3 cursor-nwse-resize" },
  { dir: "ne", className: "right-0 top-0 h-3 w-3 cursor-nesw-resize" },
  { dir: "sw", className: "left-0 bottom-0 h-3 w-3 cursor-nesw-resize" },
];

function computeRect(dir: Dir, start: Rect, dx: number, dy: number, min: { w: number; h: number }): Rect {
  if (dir === "move") return { ...start, x: start.x + dx, y: start.y + dy };
  let { x, y, w, h } = start;
  if (dir.includes("e")) w = Math.max(min.w, start.w + dx);
  if (dir.includes("s")) h = Math.max(min.h, start.h + dy);
  if (dir.includes("w")) {
    w = Math.max(min.w, start.w - dx);
    x = start.x + start.w - w;
  }
  if (dir.includes("n")) {
    h = Math.max(min.h, start.h - dy);
    y = Math.max(MENU_BAR_H, start.y + start.h - h);
    h = start.y + start.h - y;
  }
  return { x, y, w, h };
}

export function Window({
  win,
  title,
  children,
  bodyClassName = "",
}: {
  win: WindowState;
  title: string;
  children: ReactNode;
  bodyClassName?: string;
}) {
  const { state, close, minimize, toggleMaximize, focus, setRect } = useWindows();
  const isFocused = state.focused === win.id;
  const min = appMeta[win.appId].min;

  const el = useRef<HTMLElement>(null);
  const drag = useRef<{ dir: Dir; px: number; py: number; start: Rect; next: Rect; raf: number } | null>(null);

  function start(dir: Dir, e: ReactPointerEvent) {
    if (e.button !== 0 || win.maximized) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { dir, px: e.clientX, py: e.clientY, start: win.rect, next: win.rect, raf: 0 };
    focus(win.id);
  }

  // Write geometry straight to the DOM during the drag; commit to React state once on release.
  function move(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d || !el.current) return;
    if (e.buttons === 0) return end();
    let next = computeRect(d.dir, d.start, e.clientX - d.px, e.clientY - d.py, min);
    if (d.dir === "move") next = clampRect(next, window.innerWidth, window.innerHeight);
    d.next = next;
    cancelAnimationFrame(d.raf);
    d.raf = requestAnimationFrame(() => {
      const s = el.current!.style;
      s.left = `${next.x}px`;
      s.top = `${next.y}px`;
      s.width = `${next.w}px`;
      s.height = `${next.h}px`;
    });
  }

  function end() {
    const d = drag.current;
    if (!d) return;
    cancelAnimationFrame(d.raf);
    drag.current = null;
    setRect(win.id, d.next);
  }

  const style = win.maximized
    ? { left: 0, top: MENU_BAR_H, width: "100vw", height: `calc(100vh - ${MENU_BAR_H + DOCK_H}px)`, zIndex: win.z }
    : { left: win.rect.x, top: win.rect.y, width: win.rect.w, height: win.rect.h, zIndex: win.z };

  return (
    <WindowSelfContext.Provider value={{ windowId: win.id, isFocused }}>
      <section
        ref={el}
        role="dialog"
        aria-label={title}
        onPointerDownCapture={() => !isFocused && focus(win.id)}
        style={style}
        className={`window-enter absolute flex flex-col overflow-hidden border text-neutral-900 transition-[transform,opacity] duration-300 ease-in-out dark:text-neutral-100 ${
          isFocused
            ? "border-black/15 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] dark:border-white/15"
            : "border-black/10 shadow-[0_12px_30px_-10px_rgba(0,0,0,0.35)] dark:border-white/10"
        } ${win.maximized ? "rounded-none" : "rounded-xl"} ${
          win.minimized ? "pointer-events-none translate-y-[70vh] scale-[0.1] opacity-0" : ""
        } bg-white dark:bg-neutral-900`}
      >
        {/* Title bar: drag handle + traffic lights */}
        <header
          onPointerDown={(e) => start("move", e)}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onDoubleClick={() => toggleMaximize(win.id)}
          className="relative flex h-9 shrink-0 cursor-default select-none items-center border-b border-black/5 bg-neutral-100/95 px-3 dark:border-white/5 dark:bg-neutral-800/95"
        >
          <div className="group relative z-10 flex gap-2" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <TrafficLight color="bg-[#ff5f57]" hoverColor="group-hover:bg-[#ff5f57]" label="Close" glyph="×" active={isFocused} onClick={() => close(win.id)} />
            <TrafficLight color="bg-[#febc2e]" hoverColor="group-hover:bg-[#febc2e]" label="Minimize" glyph="−" active={isFocused} onClick={() => minimize(win.id)} />
            <TrafficLight color="bg-[#28c840]" hoverColor="group-hover:bg-[#28c840]" label="Zoom" glyph="+" active={isFocused} onClick={() => toggleMaximize(win.id)} />
          </div>
          <h2
            className={`pointer-events-none absolute inset-x-20 truncate text-center text-[13px] font-semibold ${
              isFocused ? "text-neutral-700 dark:text-neutral-200" : "text-neutral-400 dark:text-neutral-500"
            }`}
          >
            {title}
          </h2>
        </header>

        <div className={`relative min-h-0 flex-1 overflow-auto ${bodyClassName}`}>{children}</div>

        {!win.maximized &&
          HANDLES.map((h) => (
            <div
              key={h.dir}
              aria-hidden
              onPointerDown={(e) => start(h.dir, e)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              className={`absolute z-20 ${h.className}`}
            />
          ))}
      </section>
    </WindowSelfContext.Provider>
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
