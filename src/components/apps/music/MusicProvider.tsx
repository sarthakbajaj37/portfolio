"use client";

/* eslint-disable @next/next/no-img-element -- remote iTunes artwork, no next/image config */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Music2, Pause, Play, SkipForward } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { findTrack, type Track } from "@/data/music";
import { createPersistedStore } from "./persisted-store";

// ---------------------------------------------------------------------------
// Persisted library state (favourites, recently played, app volume)
// ---------------------------------------------------------------------------

export const favouritesStore = createPersistedStore<string[]>("sb-music-favourites-v1", []);
export const recentStore = createPersistedStore<string[]>("sb-music-recent-v1", []);
const volumeStore = createPersistedStore<number>("sb-music-volume-v1", 0.8);

export function toggleFavourite(id: string) {
  favouritesStore.set((f) => (f.includes(id) ? f.filter((x) => x !== id) : [id, ...f]));
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export type MusicContextValue = {
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  /** seconds */
  currentTime: number;
  /** seconds (preview length, usually 30) */
  duration: number;
  /** app-level volume 0–1, multiplied by the system volume from Settings */
  volume: number;
  playTrack: (track: Track, queue?: Track[]) => void;
  playQueue: (tracks: Track[], startIndex?: number, shuffle?: boolean) => void;
  toggle: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
};

const MusicContext = createContext<MusicContextValue | null>(null);

async function refreshPreviewUrl(id: string): Promise<string | null> {
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&country=IN`);
    const data = (await res.json()) as { results?: { previewUrl?: string }[] };
    return data.results?.[0]?.previewUrl ?? null;
  } catch {
    return null;
  }
}

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Owns the single <audio> element so playback survives the Music window being
 * closed. Must be mounted inside <SettingsProvider> (it follows the system volume).
 */
export function MusicProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const audioRef = useRef<HTMLAudioElement>(null);
  const retried = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const volume = volumeStore.use();

  const current = queue[index] ?? null;

  const load = useCallback((track: Track) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.previewUrl;
    audio.currentTime = 0;
    setCurrentTime(0);
    void audio.play().catch(() => setIsPlaying(false));
    recentStore.set((r) => [track.id, ...r.filter((x) => x !== track.id)].slice(0, 30));
  }, []);

  const playQueue = useCallback(
    (tracks: Track[], startIndex = 0, shuffle = false) => {
      if (!tracks.length) return;
      let list = tracks;
      let i = Math.min(Math.max(0, startIndex), tracks.length - 1);
      if (shuffle) {
        list = shuffled(tracks);
        i = 0;
      }
      setQueue(list);
      setIndex(i);
      load(list[i]);
    },
    [load],
  );

  const playTrack = useCallback(
    (track: Track, q?: Track[]) => {
      const list = q && q.some((t) => t.id === track.id) ? q : [track];
      playQueue(
        list,
        list.findIndex((t) => t.id === track.id),
      );
    },
    [playQueue],
  );

  const go = useCallback(
    (delta: number) => {
      if (!queue.length) return;
      const audio = audioRef.current;
      if (delta < 0 && audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
      }
      const ni = (index + delta + queue.length) % queue.length;
      setIndex(ni);
      load(queue[ni]);
    },
    [index, queue, load],
  );

  const next = useCallback(() => go(1), [go]);
  const prev = useCallback(() => go(-1), [go]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.paused) void audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [current]);

  const pause = useCallback(() => audioRef.current?.pause(), []);

  const seek = useCallback((s: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = s;
    setCurrentTime(s);
  }, []);

  const setVolume = useCallback((v: number) => volumeStore.set(Math.min(1, Math.max(0, v))), []);

  // Effective volume = app volume × system volume.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.min(1, Math.max(0, volume * (settings.volume / 100)));
  }, [volume, settings.volume]);

  // Media Session (lock screen / hardware keys).
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album,
      artwork: [{ src: current.artwork, sizes: "600x600", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }, [current, toggle, next, prev]);

  const onError = () => {
    // Preview URLs occasionally rotate — re-fetch once via the lookup API.
    if (!current || retried.current.has(current.id)) {
      setIsPlaying(false);
      return;
    }
    retried.current.add(current.id);
    const id = current.id;
    void refreshPreviewUrl(id).then((url) => {
      const audio = audioRef.current;
      if (!url || !audio) return;
      setQueue((q) => q.map((t) => (t.id === id ? { ...t, previewUrl: url } : t)));
      audio.src = url;
      void audio.play().catch(() => setIsPlaying(false));
    });
  };

  const onEnded = () => {
    if (index < queue.length - 1) next();
    else setIsPlaying(false);
  };

  const value = useMemo<MusicContextValue>(
    () => ({
      current,
      queue,
      index,
      isPlaying,
      currentTime,
      duration,
      volume,
      playTrack,
      playQueue,
      toggle,
      pause,
      next,
      prev,
      seek,
      setVolume,
    }),
    [current, queue, index, isPlaying, currentTime, duration, volume, playTrack, playQueue, toggle, pause, next, prev, seek, setVolume],
  );

  return (
    <MusicContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 30)}
        onEnded={onEnded}
        onError={onError}
      />
    </MusicContext.Provider>
  );
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used inside <MusicProvider>");
  return ctx;
}

/** Returns the ids of favourited tracks (reactive). */
export function useFavourites() {
  return favouritesStore.use();
}

/** Returns recently played tracks, most recent first (reactive). */
export function useRecentlyPlayed(): Track[] {
  const ids = recentStore.use();
  return useMemo(() => ids.map((id) => findTrack(id)).filter((t): t is Track => !!t), [ids]);
}

/** Compact player card for the Notification Center (~260px wide). */
export function NowPlayingMini({ onOpen }: { onOpen?: () => void }) {
  const { current, isPlaying, toggle, next, currentTime, duration } = useMusic();
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <div className="w-[260px] rounded-2xl border border-black/5 bg-white/70 p-2.5 text-[13px] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-neutral-800/70">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onOpen}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-rose-400 to-red-500"
          aria-label="Open Music"
        >
          {current ? (
            <img src={current.artwork} alt="" className="h-full w-full object-cover" />
          ) : (
            <Music2 className="absolute inset-0 m-auto h-5 w-5 text-white" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">{current?.title ?? "Not Playing"}</div>
          <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{current?.artist ?? "Music"}</div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={!current}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-800 hover:bg-black/5 disabled:opacity-40 dark:text-neutral-100 dark:hover:bg-white/10"
        >
          {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!current}
          aria-label="Next"
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-800 hover:bg-black/5 disabled:opacity-40 dark:text-neutral-100 dark:hover:bg-white/10"
        >
          <SkipForward className="h-4 w-4 fill-current" />
        </button>
      </div>
      {current && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
          <div className="h-full rounded-full bg-neutral-700 dark:bg-neutral-200" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
