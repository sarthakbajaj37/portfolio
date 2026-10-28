"use client";

/* eslint-disable @next/next/no-img-element -- small static icon */

import { useMemo, useState, type ComponentType } from "react";
import { ChevronLeft, Clock, Trophy } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import type { AppProps } from "@/components/desktop/types";
import { useWindowSelf } from "@/components/desktop/WindowManager";
import { useSettings } from "@/lib/settings";
import { bestStore, markPlayed, recentStore, type GameId } from "./store";
import type { GameProps } from "./shared";
import { Snake } from "./Snake";
import { Game2048 } from "./Game2048";
import { Minesweeper } from "./Minesweeper";
import { Memory } from "./Memory";
import { Breakout } from "./Breakout";
import { Chess } from "./Chess";

type GameDef = {
  id: GameId;
  name: string;
  genre: string;
  blurb: string;
  Component: ComponentType<GameProps>;
  art: React.ReactNode;
  best: (b: Record<string, number>) => string | null;
};

const GAMES: GameDef[] = [
  {
    id: "chess",
    name: "Chess",
    genre: "Strategy",
    blurb: "Play the computer on easy, medium or hard.",
    Component: Chess,
    art: (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-700 via-amber-900 to-stone-900">
        <img src="/icons/chess.png" alt="" className="h-3/5 w-auto drop-shadow-xl" />
      </div>
    ),
    best: (b) => {
      const w = (b["chess-wins-easy"] ?? 0) + (b["chess-wins-medium"] ?? 0) + (b["chess-wins-hard"] ?? 0);
      return w ? `${w} win${w === 1 ? "" : "s"}` : null;
    },
  },
  {
    id: "2048",
    name: "2048",
    genre: "Puzzle",
    blurb: "Slide, merge, reach 2048.",
    Component: Game2048,
    art: (
      <div className="grid h-full w-full grid-cols-2 gap-2 bg-gradient-to-br from-amber-200 to-orange-400 p-5">
        <div className="flex items-center justify-center rounded-lg bg-[#edc22e] text-2xl font-black text-white shadow">20</div>
        <div className="flex items-center justify-center rounded-lg bg-[#f65e3b] text-2xl font-black text-white shadow">48</div>
        <div className="flex items-center justify-center rounded-lg bg-[#eee4da] text-xl font-black text-[#776e65] shadow">2</div>
        <div className="flex items-center justify-center rounded-lg bg-[#f2b179] text-xl font-black text-white shadow">8</div>
      </div>
    ),
    best: (b) => (b["2048"] ? `Best ${b["2048"]}` : null),
  },
  {
    id: "snake",
    name: "Snake",
    genre: "Arcade",
    blurb: "Eat, grow, don't bite yourself.",
    Component: Snake,
    art: (
      <div className="relative h-full w-full bg-gradient-to-br from-lime-400 to-emerald-700">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:16px_16px]" />
        <div className="absolute left-[20%] top-[55%] h-4 w-24 rounded-full bg-emerald-950/80" />
        <div className="absolute left-[calc(20%+5.5rem)] top-[30%] h-[calc(25%+1rem)] w-4 rounded-full bg-emerald-950/80" />
        <div className="absolute right-[22%] top-[28%] h-4 w-4 rounded-full bg-red-500 shadow" />
      </div>
    ),
    best: (b) => (b.snake ? `Best ${b.snake}` : null),
  },
  {
    id: "minesweeper",
    name: "Minesweeper",
    genre: "Puzzle",
    blurb: "Classic logic, three sizes.",
    Component: Minesweeper,
    art: (
      <div className="grid h-full w-full grid-cols-4 gap-1 bg-gradient-to-br from-slate-400 to-slate-700 p-4 text-lg">
        {["1", "", "🚩", "2", "", "1", "2", "💣", "1", "1", "", "", "🚩", "3", "1", ""].map((c, i) => (
          <div key={i} className={c ? "flex items-center justify-center rounded bg-white/85 font-bold text-blue-700" : "rounded bg-white/35"}>
            {c}
          </div>
        ))}
      </div>
    ),
    best: (b) => (b["minesweeper-easy"] ? `Easy ${b["minesweeper-easy"]}s` : null),
  },
  {
    id: "breakout",
    name: "Breakout",
    genre: "Arcade",
    blurb: "Bounce the ball, smash the bricks.",
    Component: Breakout,
    art: (
      <div className="relative h-full w-full bg-gradient-to-b from-slate-900 to-indigo-950 p-4">
        <div className="grid grid-cols-6 gap-1">
          {["bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-green-500", "bg-blue-500", "bg-purple-500"].flatMap((c, r) =>
            Array.from({ length: 6 }, (_, i) => <div key={`${r}-${i}`} className={`h-2.5 rounded-sm ${c}`} />),
          )}
        </div>
        <div className="absolute bottom-[30%] left-[58%] h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.8)]" />
        <div className="absolute bottom-4 left-[42%] h-2 w-16 rounded-full bg-neutral-200" />
      </div>
    ),
    best: (b) => (b.breakout ? `Best ${b.breakout}` : null),
  },
  {
    id: "memory",
    name: "Memory Match",
    genre: "Casual",
    blurb: "Flip cards, find the pairs.",
    Component: Memory,
    art: (
      <div className="grid h-full w-full grid-cols-3 gap-2 bg-gradient-to-br from-fuchsia-500 to-violet-700 p-5">
        {["🚀", "", "🥝", "", "🚀", "", "", "🥝", ""].map((c, i) => (
          <div key={i} className={c ? "flex items-center justify-center rounded-lg bg-white text-xl shadow" : "rounded-lg bg-white/25"}>
            {c}
          </div>
        ))}
      </div>
    ),
    best: (b) => (b.memory ? `Best ${b.memory} moves` : null),
  },
];

type Sort = "recent" | "name";

export function GamesApp({ mobile }: AppProps) {
  const { isFocused } = useWindowSelf();
  const { settings } = useSettings();
  const recent = recentStore.use();
  const best = bestStore.use();
  const [current, setCurrent] = useState<GameId | null>(null);
  const [sort, setSort] = useState<Sort>("recent");

  const sorted = useMemo(() => {
    const list = [...GAMES];
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => (recent[b.id] ?? 0) - (recent[a.id] ?? 0));
    return list;
  }, [sort, recent]);

  const recentlyPlayed = useMemo(
    () => GAMES.filter((g) => recent[g.id]).sort((a, b) => (recent[b.id] ?? 0) - (recent[a.id] ?? 0)).slice(0, 3),
    [recent],
  );

  const open = (id: GameId) => {
    markPlayed(id);
    setCurrent(id);
  };

  const game = GAMES.find((g) => g.id === current);

  if (game) {
    const { Component } = game;
    return (
      <div className="flex h-full flex-col bg-white text-[13px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
        <div className="flex shrink-0 items-center gap-2 border-b border-black/5 px-3 py-2 dark:border-white/10">
          <button type="button" onClick={() => setCurrent(null)} className="flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[#0a84ff] hover:bg-black/5 dark:hover:bg-white/10">
            <ChevronLeft className="h-4 w-4" /> Library
          </button>
          <span className="flex-1 text-center font-semibold">{game.name}</span>
          <span className="w-[70px] truncate text-right text-[12px] text-neutral-500">{game.best(best) ?? ""}</span>
        </div>
        <div className="min-h-0 flex-1">
          <Component active={isFocused} mobile={mobile} volume={settings.volume} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white text-[13px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className={mobile ? "space-y-6 p-4" : "space-y-8 p-6"}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Games</h1>
            <p className="text-neutral-500 dark:text-neutral-400">Six little games. Scores stay on this device.</p>
          </div>
          <div className="flex rounded-md bg-black/5 p-0.5 dark:bg-white/10">
            {(
              [
                ["recent", "Recently Played"],
                ["name", "Name"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setSort(k)}
                className={sort === k ? "rounded-[5px] bg-white px-2.5 py-0.5 font-medium shadow-sm dark:bg-neutral-600" : "rounded-[5px] px-2.5 py-0.5 text-neutral-600 dark:text-neutral-300"}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {recentlyPlayed.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-[15px] font-semibold">
              <Clock className="h-4 w-4 text-neutral-400" /> Continue Playing
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {recentlyPlayed.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => open(g.id)}
                  className="flex w-60 shrink-0 items-center gap-3 rounded-xl border border-black/5 bg-neutral-50 p-2 text-left hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">{g.art}</div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{g.name}</div>
                    <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">
                      {formatDistanceToNowStrict(recent[g.id] ?? 0, { addSuffix: true })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-[15px] font-semibold">All Games</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-4">
            {sorted.map((g) => {
              const b = g.best(best);
              return (
                <button key={g.id} type="button" onClick={() => open(g.id)} className="group text-left">
                  <div className="aspect-[4/3] overflow-hidden rounded-xl shadow-md ring-1 ring-black/5 transition group-hover:-translate-y-0.5 group-hover:shadow-lg dark:ring-white/10">
                    {g.art}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{g.name}</span>
                    <span className="shrink-0 text-[11px] text-neutral-400">{g.genre}</span>
                  </div>
                  <div className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">{g.blurb}</div>
                  {b && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      <Trophy className="h-3 w-3" /> {b}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
