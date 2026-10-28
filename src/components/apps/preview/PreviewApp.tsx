"use client";
/* eslint-disable @next/next/no-img-element -- arbitrary local/GitHub images at their natural size */

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ExternalLink, ImageOff, Info, Maximize, RotateCcw, RotateCw, Scan, ZoomIn, ZoomOut } from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { useWindows } from "@/components/desktop/WindowManager";
import { useOpenPath } from "@/components/apps/finder/useOpenPath";
import { basename, dirname, displayPath, ensureLoaded, extOf, formatSize, HOME, kindOf, PICTURES, resolve, stat, useVfsVersion } from "@/lib/vfs";

const MIN = 0.05;
const MAX = 8;

export function PreviewApp({ windowId, metadata, mobile }: AppProps) {
  const path = typeof metadata.path === "string" && metadata.path ? resolve(HOME, metadata.path) : null;
  useVfsVersion();
  const node = path ? stat(path) : null;
  const src = (typeof metadata.src === "string" && metadata.src) || node?.src || null;
  const name = path ? basename(path) : src ? decodeURIComponent(src.split("/").pop() ?? "Preview") : "Preview";
  const isPdf = extOf(name) === "pdf" || (src ? /\.pdf($|\?)/i.test(src) : false);

  // GitHub files opened directly (e.g. from Terminal) may need their listing for src.
  useEffect(() => {
    if (path && !src) void ensureLoaded(dirname(path));
  }, [path, src]);

  const { state, setTitle } = useWindows();
  const win = state.windows[windowId];
  useEffect(() => {
    if (win && win.title !== name) setTitle(windowId, name);
  }, [win, name, windowId, setTitle]);

  if (!src) return <Empty loading={!!path && path.includes("/Projects/")} />;
  if (isPdf) return <PdfView src={src} name={name} url={node?.url} />;
  return <ImageView key={src} src={src} name={name} path={path} url={node?.url} mobile={mobile} />;
}

function Empty({ loading }: { loading: boolean }) {
  const openPath = useOpenPath();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-neutral-200 text-[13px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
      <ImageOff size={36} strokeWidth={1.2} />
      {loading ? <p>Loading…</p> : <p>No image open.</p>}
      {!loading && (
        <button type="button" onClick={() => openPath(PICTURES)} className="text-sky-600 hover:underline dark:text-sky-400">
          Browse Pictures
        </button>
      )}
    </div>
  );
}

function PdfView({ src, name, url }: { src: string; name: string; url?: string }) {
  const local = src.startsWith("/") && !src.startsWith("//");
  if (!local) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-neutral-200 p-6 text-center text-[13px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <p>“{name}” can only be previewed on its own site.</p>
        <a href={url ?? src} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline dark:text-sky-400">
          Open in a new tab ↗
        </a>
      </div>
    );
  }
  return <iframe src={src} title={name} className="h-full w-full border-0 bg-neutral-200 dark:bg-neutral-800" />;
}

function ImageView({ src, name, path, url, mobile }: { src: string; name: string; path: string | null; url?: string; mobile?: boolean }) {
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [rotation, setRotation] = useState(0);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [failed, setFailed] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [showInfo, setShowInfo] = useState(false);
  const [bytes, setBytes] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Track the canvas size so "fit" works for any rotation.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, []);

  // File size: ask the server (same-origin only; GitHub raw files don't expose it cheaply).
  useEffect(() => {
    if (!src.startsWith("/") || src.startsWith("//")) return;
    let alive = true;
    fetch(src, { method: "HEAD" })
      .then((r) => {
        const n = Number(r.headers.get("content-length"));
        if (alive && n > 0) setBytes(n);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [src]);

  const sideways = rotation % 180 !== 0;
  const w = natural ? (sideways ? natural.h : natural.w) : 0;
  const h = natural ? (sideways ? natural.w : natural.h) : 0;
  const pad = mobile ? 16 : 40;
  const fit = natural && box.w ? Math.min((box.w - pad) / w, (box.h - pad) / h, 1) : 1;
  const scale = zoom === "fit" ? fit : zoom;

  const zoomTo = (z: number) => setZoom(Math.min(MAX, Math.max(MIN, z)));
  const zoomIn = () => zoomTo(scale * 1.25);
  const zoomOut = () => zoomTo(scale / 1.25);
  const rotate = (d: 90 | -90) => setRotation((r) => (r + d + 360) % 360);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key;
    if (k === "=" || k === "+") zoomIn();
    else if (k === "-") zoomOut();
    else if (k === "0") setZoom(1);
    else if (k === "9") setZoom("fit");
    else if (k === "r" || k === "R") rotate(e.shiftKey ? -90 : 90);
    else if (k === "i") setShowInfo((s) => !s);
    else return;
    e.preventDefault();
  }

  const info: [string, string][] = [
    ["Name", name],
    ["Kind", kindOf(name)],
    ["Dimensions", natural ? `${natural.w} × ${natural.h}` : "--"],
    ["Size", bytes != null ? formatSize(bytes) : "--"],
    ["Where", path ? displayPath(dirname(path)) : "--"],
    ["Zoom", `${Math.round(scale * 100)}%`],
  ];

  return (
    <div tabIndex={0} onKeyDown={onKeyDown} className="relative flex h-full flex-col text-[13px] outline-none">
      <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-black/10 bg-neutral-50/90 px-2 text-neutral-600 dark:border-white/10 dark:bg-neutral-900/80 dark:text-neutral-300">
        <Btn label="Zoom Out (⌘−)" onClick={zoomOut}>
          <ZoomOut size={15} />
        </Btn>
        <Btn label="Zoom In (⌘+)" onClick={zoomIn}>
          <ZoomIn size={15} />
        </Btn>
        <Btn label="Zoom to Fit (⌘9)" active={zoom === "fit"} onClick={() => setZoom("fit")}>
          <Maximize size={14} />
        </Btn>
        <Btn label="Actual Size (⌘0)" active={zoom === 1} onClick={() => setZoom(1)}>
          <Scan size={14} />
        </Btn>
        <span className="w-12 text-center text-[11px] tabular-nums text-neutral-500">{Math.round(scale * 100)}%</span>
        <div className="mx-1 h-4 w-px bg-black/10 dark:bg-white/10" />
        <Btn label="Rotate Left (⇧⌘R)" onClick={() => rotate(-90)}>
          <RotateCcw size={14} />
        </Btn>
        <Btn label="Rotate Right (⌘R)" onClick={() => rotate(90)}>
          <RotateCw size={14} />
        </Btn>
        <div className="ml-auto flex items-center gap-0.5">
          {(url || !src.startsWith("/")) && (
            <a
              href={url ?? src}
              target="_blank"
              rel="noreferrer"
              aria-label="Open original"
              title="Open original"
              className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <Btn label="Inspector (⌘I)" active={showInfo} onClick={() => setShowInfo((s) => !s)}>
            <Info size={15} />
          </Btn>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          ref={canvasRef}
          onDoubleClick={() => setZoom(zoom === "fit" ? 1 : "fit")}
          className="grid min-w-0 flex-1 place-items-center overflow-auto bg-neutral-200 dark:bg-neutral-800"
        >
          {failed ? (
            <div className="flex flex-col items-center gap-2 text-neutral-500">
              <ImageOff size={32} strokeWidth={1.2} />
              Couldn&apos;t load this image.
            </div>
          ) : (
            <div
              style={natural ? { width: w * scale, height: h * scale, margin: pad / 2 } : undefined}
              className="relative shrink-0"
            >
              <img
                src={src}
                alt={name}
                draggable={false}
                onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                onError={() => setFailed(true)}
                style={
                  natural
                    ? {
                        width: natural.w * scale,
                        height: natural.h * scale,
                        maxWidth: "none",
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                      }
                    : { opacity: 0, maxWidth: "100%", maxHeight: "100%" }
                }
                className="select-none shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-transform duration-200"
              />
            </div>
          )}
        </div>

        {showInfo && (
          <aside
            className={
              mobile
                ? "absolute inset-x-0 bottom-0 z-10 border-t border-black/10 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-neutral-900/95"
                : "w-56 shrink-0 overflow-y-auto border-l border-black/10 bg-neutral-50/90 p-3 dark:border-white/10 dark:bg-neutral-900/80"
            }
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">General Info</p>
            <dl className="grid grid-cols-[76px_1fr] gap-x-2 gap-y-1.5 text-[12px]">
              {info.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-right text-neutral-400">{k}</dt>
                  <dd className="min-w-0 break-words text-neutral-800 dark:text-neutral-100">{v}</dd>
                </div>
              ))}
            </dl>
          </aside>
        )}
      </div>
    </div>
  );
}

function Btn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded p-1 hover:bg-black/5 dark:hover:bg-white/10 ${active ? "bg-black/10 dark:bg-white/15" : ""}`}
    >
      {children}
    </button>
  );
}
