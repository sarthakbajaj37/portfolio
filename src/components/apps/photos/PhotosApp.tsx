"use client";

/* eslint-disable @next/next/no-img-element -- local/static & object-URL images, sized by CSS */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { format, isSameMonth, isSameYear, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  ImagePlus,
  Images,
  Info,
  Minus,
  Monitor,
  Plus,
  Upload,
  X,
} from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { useWindowSelf } from "@/components/desktop/WindowManager";
import { useSettings } from "@/lib/settings";
import { wallpapers } from "@/lib/wallpapers";
import { photos as userPhotos } from "@/data/photos";
import { createPersistedStore } from "@/components/apps/music/persisted-store";

type Photo = {
  id: string;
  src: string;
  thumb: string;
  title: string;
  date: string; // ISO
  collection: string;
  width?: number;
  height?: number;
  wallpaperId?: string;
  imported?: boolean;
};

// macOS release dates, used as the "taken" date for each wallpaper.
const WALLPAPER_DATES: Record<string, string> = {
  "leopard-server": "2007-10-26",
  "snow-leopard": "2009-08-28",
  lion: "2011-07-20",
  "mountain-lion": "2012-07-25",
  yosemite: "2014-10-16",
  elcapitan: "2015-09-30",
  sierra: "2016-09-20",
  mojave: "2018-09-24",
  sonoma: "2023-09-26",
  sequoia: "2024-09-16",
  tahoe: "2025-09-15",
};

const WALLPAPER_COLLECTION = "Wallpapers";
const IMPORTED_COLLECTION = "Imported";

const basePhotos: Photo[] = [
  ...userPhotos.map((p, i) => ({
    id: `user-${i}`,
    src: p.src,
    thumb: p.src,
    title: p.title,
    date: p.date,
    collection: p.collection,
    width: p.width,
    height: p.height,
  })),
  ...wallpapers
    .filter((w) => w.thumb)
    .map((w) => ({
      id: `wallpaper-${w.id}`,
      src: `/wallpapers/${w.id}-wallpaper.jpg`,
      thumb: w.thumb as string,
      title: `macOS ${w.name}`,
      date: WALLPAPER_DATES[w.id] ?? "2016-09-20",
      collection: WALLPAPER_COLLECTION,
      width: 2560,
      height: 1440,
      wallpaperId: w.id,
    })),
];

// ---- session-only imports (object URLs, never uploaded) --------------------
let imported: Photo[] = [];
const importListeners = new Set<() => void>();
const importStore = {
  subscribe: (l: () => void) => {
    importListeners.add(l);
    return () => {
      importListeners.delete(l);
    };
  },
  get: () => imported,
  server: (): Photo[] => [],
  add: (files: FileList) => {
    const added: Photo[] = [];
    Array.from(files).forEach((f, i) => {
      if (!f.type.startsWith("image/")) return;
      const url = URL.createObjectURL(f);
      added.push({
        id: `import-${f.lastModified}-${f.size}-${i}-${f.name}`,
        src: url,
        thumb: url,
        title: f.name.replace(/\.[^.]+$/, ""),
        date: new Date(f.lastModified || Date.now()).toISOString(),
        collection: IMPORTED_COLLECTION,
        imported: true,
      });
    });
    imported = [...added, ...imported];
    importListeners.forEach((l) => l());
    return added;
  },
};

const favStore = createPersistedStore<string[]>("sb-photos-favourites-v1", []);

type Source = { kind: "library" } | { kind: "favourites" } | { kind: "collection"; name: string };
type TimeFilter = "all" | "year" | "month";

const GRID_SIZES = ["grid-cols-[repeat(auto-fill,minmax(90px,1fr))]", "grid-cols-[repeat(auto-fill,minmax(140px,1fr))]", "grid-cols-[repeat(auto-fill,minmax(220px,1fr))]"];

export function PhotosApp({ mobile }: AppProps) {
  const importedPhotos = useSyncExternalStore(importStore.subscribe, importStore.get, importStore.server);
  const favs = favStore.use();
  const [source, setSource] = useState<Source>({ kind: "library" });
  const [time, setTime] = useState<TimeFilter>("all");
  const [zoom, setZoom] = useState(1);
  const [viewing, setViewing] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const fileRef = useRef<HTMLInputElement>(null);

  const all = useMemo(
    () => [...importedPhotos, ...basePhotos].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [importedPhotos],
  );

  const collections = useMemo(() => {
    const names: string[] = [];
    for (const p of [...basePhotos, ...importedPhotos]) if (!names.includes(p.collection)) names.push(p.collection);
    return names;
  }, [importedPhotos]);

  const visible = useMemo(() => {
    let list = all;
    if (source.kind === "favourites") list = list.filter((p) => favs.includes(p.id));
    if (source.kind === "collection") list = list.filter((p) => p.collection === source.name);
    if (time !== "all") {
      list = list.filter((p) => {
        const d = parseISO(p.date);
        return time === "year" ? isSameYear(d, now) : isSameMonth(d, now) && isSameYear(d, now);
      });
    }
    return list;
  }, [all, source, favs, time, now]);

  const title = source.kind === "library" ? "Library" : source.kind === "favourites" ? "Favourites" : source.name;
  const viewIndex = viewing ? visible.findIndex((p) => p.id === viewing) : -1;
  const viewPhoto = viewIndex >= 0 ? visible[viewIndex] : null;

  const onImport = (files: FileList | null) => {
    if (!files?.length) return;
    const added = importStore.add(files);
    if (added.length) {
      setSource({ kind: "collection", name: IMPORTED_COLLECTION });
      setTime("all");
    }
  };

  const sources: { s: Source; label: string; icon: React.ReactNode }[] = [
    { s: { kind: "library" }, label: "Library", icon: <Images className="h-4 w-4 text-sky-500" /> },
    { s: { kind: "favourites" }, label: "Favourites", icon: <Heart className="h-4 w-4 text-sky-500" /> },
  ];
  const isActive = (s: Source) =>
    s.kind === source.kind && (s.kind !== "collection" || (source.kind === "collection" && source.name === s.name));

  return (
    <div className="relative flex h-full bg-white text-[13px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onImport(e.target.files); e.target.value = ""; }} />
      {!mobile && (
        <aside className="flex w-48 shrink-0 flex-col gap-4 overflow-y-auto border-r border-black/5 bg-neutral-50/80 px-2.5 py-3 dark:border-white/10 dark:bg-neutral-900/60">
          <div>
            <div className="px-2 pb-1 text-[11px] font-semibold text-neutral-400">Photos</div>
            {sources.map((x) => (
              <SideItem key={x.label} active={isActive(x.s)} icon={x.icon} label={x.label} onClick={() => setSource(x.s)} />
            ))}
          </div>
          <div>
            <div className="px-2 pb-1 text-[11px] font-semibold text-neutral-400">Collections</div>
            {collections.map((name) => (
              <SideItem
                key={name}
                active={isActive({ kind: "collection", name })}
                icon={name === IMPORTED_COLLECTION ? <Upload className="h-4 w-4 text-sky-500" /> : <ImageIcon className="h-4 w-4 text-sky-500" />}
                label={name}
                onClick={() => setSource({ kind: "collection", name })}
              />
            ))}
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/5 px-3 py-2 dark:border-white/10">
          {!mobile && <h1 className="mr-auto text-[15px] font-semibold">{title}</h1>}
          <div className="flex rounded-md bg-black/5 p-0.5 dark:bg-white/10">
            {(
              [
                ["all", "All Photos"],
                ["year", "This Year"],
                ["month", "This Month"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTime(k)}
                className={
                  time === k
                    ? "rounded-[5px] bg-white px-2.5 py-0.5 font-medium shadow-sm dark:bg-neutral-600"
                    : "rounded-[5px] px-2.5 py-0.5 text-neutral-600 dark:text-neutral-300"
                }
              >
                {label}
              </button>
            ))}
          </div>
          {!mobile && (
            <div className="flex items-center gap-1 text-neutral-500">
              <button type="button" aria-label="Smaller" onClick={() => setZoom((z) => Math.max(0, z - 1))} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Larger" onClick={() => setZoom((z) => Math.min(2, z + 1))} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="ml-auto flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1 shadow-sm hover:bg-neutral-50 dark:border-white/15 dark:bg-neutral-800 dark:hover:bg-neutral-700"
            title="Add photos from your device — they stay in this browser tab only"
          >
            <ImagePlus className="h-3.5 w-3.5" /> Import
          </button>
        </header>

        {mobile && (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-black/5 px-3 py-2 dark:border-white/10">
            {[...sources, ...collections.map((name) => ({ s: { kind: "collection", name } as Source, label: name }))].map((x) => (
              <button
                key={x.label}
                type="button"
                onClick={() => setSource(x.s)}
                className={isActive(x.s) ? "shrink-0 rounded-full bg-sky-500 px-3 py-1 font-medium text-white" : "shrink-0 rounded-full bg-black/5 px-3 py-1 dark:bg-white/10"}
              >
                {x.label}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {source.kind === "collection" && source.name === IMPORTED_COLLECTION && (
            <p className="mb-3 rounded-md bg-sky-500/10 px-3 py-2 text-[12px] text-sky-700 dark:text-sky-300">
              Imported photos live only in this browser tab. Nothing is uploaded, and they disappear when you reload.
            </p>
          )}
          {visible.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-neutral-500 dark:text-neutral-400">
              <ImageIcon className="h-9 w-9" />
              <p className="font-medium">No Photos</p>
              <p className="text-[12px]">
                {source.kind === "favourites"
                  ? "Tap the heart on a photo to add it to Favourites."
                  : time !== "all"
                    ? `Nothing from ${time === "year" ? "this year" : "this month"} yet.`
                    : "Use Import to add some of your own."}
              </p>
            </div>
          ) : (
            <div className={`grid gap-1 ${mobile ? GRID_SIZES[0] : GRID_SIZES[zoom]}`}>
              {visible.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setViewing(p.id)}
                  className="group relative aspect-square overflow-hidden rounded-[3px] bg-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-neutral-800"
                >
                  <img src={p.thumb} alt={p.title} loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03] group-hover:brightness-90" />
                  {favs.includes(p.id) && <Heart className="absolute bottom-1.5 left-1.5 h-3.5 w-3.5 fill-white text-white drop-shadow" />}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] text-white opacity-0 transition group-hover:opacity-100">
                    {p.title}
                  </span>
                </button>
              ))}
            </div>
          )}
          {visible.length > 0 && (
            <p className="py-4 text-center text-[12px] text-neutral-400">
              {visible.length} {visible.length === 1 ? "Photo" : "Photos"}
            </p>
          )}
        </div>
      </div>

      {viewPhoto && (
        <Viewer
          key={viewPhoto.id}
          photo={viewPhoto}
          hasPrev={viewIndex > 0}
          hasNext={viewIndex < visible.length - 1}
          onPrev={() => viewIndex > 0 && setViewing(visible[viewIndex - 1].id)}
          onNext={() => viewIndex < visible.length - 1 && setViewing(visible[viewIndex + 1].id)}
          onClose={() => setViewing(null)}
          favourite={favs.includes(viewPhoto.id)}
          mobile={mobile}
        />
      )}
    </div>
  );
}

function SideItem({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex w-full items-center gap-2 rounded-md bg-black/10 px-2 py-1 text-left dark:bg-white/15"
          : "flex w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-black/5 dark:hover:bg-white/5"
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

function Viewer({
  photo,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
  favourite,
  mobile,
}: {
  photo: Photo;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  favourite: boolean;
  mobile?: boolean;
}) {
  const { isFocused } = useWindowSelf();
  const { settings, update } = useSettings();
  const [showInfo, setShowInfo] = useState(false);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(photo.width && photo.height ? { w: photo.width, h: photo.height } : null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (!isFocused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "Escape") onClose();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFocused, onPrev, onNext, onClose]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const wallpaperValue = photo.wallpaperId ?? `url:${photo.src}`;
  const isCurrent = settings.wallpaper === wallpaperValue;

  const setDesktop = () => {
    update({ wallpaper: wallpaperValue });
    setToast(photo.imported ? "Desktop picture set (until you reload)" : "Desktop picture updated");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const btn = "flex items-center gap-1.5 rounded-md px-2 py-1 text-neutral-200 hover:bg-white/10 disabled:opacity-40";

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-neutral-950 text-[13px] text-white">
      <div className="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-1.5">
        <button type="button" onClick={onClose} className={btn} aria-label="Back to grid">
          {mobile ? <ChevronLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1 px-1">
          <div className="truncate font-medium">{photo.title}</div>
          <div className="truncate text-[11px] text-neutral-400">{format(parseISO(photo.date), "d MMMM yyyy")}</div>
        </div>
        <button type="button" onClick={() => favStore.set((f) => (f.includes(photo.id) ? f.filter((x) => x !== photo.id) : [photo.id, ...f]))} className={btn} aria-label="Favourite">
          <Heart className={favourite ? "h-4 w-4 fill-rose-500 text-rose-500" : "h-4 w-4"} />
        </button>
        <button type="button" onClick={() => setShowInfo((s) => !s)} className={showInfo ? `${btn} bg-white/15` : btn} aria-label="Info">
          <Info className="h-4 w-4" />
        </button>
        <button type="button" onClick={setDesktop} disabled={isCurrent} className={btn} title="Set as Desktop Picture">
          <Monitor className="h-4 w-4" />
          {!mobile && <span>{isCurrent ? "Current Desktop" : "Set as Desktop Picture"}</span>}
        </button>
      </div>
      <div className="flex min-h-0 flex-1">
        <div
          className="relative flex min-w-0 flex-1 items-center justify-center p-4"
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (dx > 50) onPrev();
            else if (dx < -50) onNext();
          }}
        >
          <img
            src={photo.src}
            alt={photo.title}
            className="max-h-full max-w-full select-none object-contain shadow-2xl"
            draggable={false}
            onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
          {hasPrev && (
            <button type="button" onClick={onPrev} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 hover:bg-black/60">
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {hasNext && (
            <button type="button" onClick={onNext} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 hover:bg-black/60">
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
          {toast && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-[12px] font-medium text-neutral-900 shadow">{toast}</div>}
        </div>
        {showInfo && (
          <aside className={mobile ? "absolute inset-x-0 bottom-0 z-10 space-y-3 rounded-t-xl bg-neutral-900 p-4" : "w-60 shrink-0 space-y-3 overflow-y-auto border-l border-white/10 bg-neutral-900 p-4"}>
            <div className="text-[15px] font-semibold">{photo.title}</div>
            <InfoRow label="Date" value={format(parseISO(photo.date), "EEEE, d MMMM yyyy")} />
            <InfoRow label="Dimensions" value={dims ? `${dims.w} × ${dims.h}` : "—"} />
            <InfoRow label="Album" value={photo.collection} />
            <InfoRow label="Source" value={photo.imported ? "Imported (this session only)" : photo.wallpaperId ? "macOS wallpaper" : "Library"} />
          </aside>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-neutral-200">{value}</div>
    </div>
  );
}
