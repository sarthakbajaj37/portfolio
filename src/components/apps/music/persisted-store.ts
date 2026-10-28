"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store usable from any component via
 * useSyncExternalStore. Shared by Music, Photos and Games.
 */
export type PersistedStore<T> = {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  use: () => T;
};

export function createPersistedStore<T>(key: string, initial: T): PersistedStore<T> {
  let value = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  const ensure = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) value = JSON.parse(raw) as T;
    } catch {
      // ignore corrupt/blocked storage
    }
  };

  const get = () => {
    ensure();
    return value;
  };

  const set = (next: T | ((prev: T) => T)) => {
    ensure();
    value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full / blocked: keep in memory
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getServer = () => initial;

  const use = () => useSyncExternalStore(subscribe, get, getServer);

  return { get, set, subscribe, use };
}

/** Plays a short sound effect at the given system volume (0–100). */
export function playSfx(src: string, volume: number, muted = false) {
  if (muted || volume <= 0 || typeof Audio === "undefined") return;
  try {
    const a = new Audio(src);
    a.volume = Math.min(1, Math.max(0, volume / 100));
    void a.play().catch(() => {});
  } catch {
    // autoplay blocked etc.
  }
}
