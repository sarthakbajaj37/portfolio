"use client";

import { createPersistedStore } from "@/components/apps/music/persisted-store";

export type GameId = "snake" | "2048" | "minesweeper" | "memory" | "breakout" | "chess";

/** gameId -> last played timestamp */
export const recentStore = createPersistedStore<Partial<Record<GameId, number>>>("sb-games-recent-v1", {});
/** score key -> best value (keys like "snake", "minesweeper-easy", "chess-wins-hard") */
export const bestStore = createPersistedStore<Record<string, number>>("sb-games-best-v1", {});

export function markPlayed(id: GameId) {
  recentStore.set((r) => ({ ...r, [id]: Date.now() }));
}

/** Records a score; returns true if it is a new best. */
export function reportScore(key: string, value: number, lowerIsBetter = false): boolean {
  const prev = bestStore.get()[key];
  const better = prev === undefined || (lowerIsBetter ? value < prev : value > prev);
  if (better) bestStore.set((b) => ({ ...b, [key]: value }));
  return better;
}

export function increment(key: string) {
  bestStore.set((b) => ({ ...b, [key]: (b[key] ?? 0) + 1 }));
}
