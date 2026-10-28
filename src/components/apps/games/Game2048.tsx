"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { bestStore, reportScore } from "./store";
import { Overlay, PrimaryButton, Stat, swipeDir, type GameProps } from "./shared";

type Board = number[]; // 16 cells, 0 = empty
type Dir = "up" | "down" | "left" | "right";

const TILE: Record<number, string> = {
  2: "bg-[#eee4da] text-[#776e65]",
  4: "bg-[#ede0c8] text-[#776e65]",
  8: "bg-[#f2b179] text-white",
  16: "bg-[#f59563] text-white",
  32: "bg-[#f67c5f] text-white",
  64: "bg-[#f65e3b] text-white",
  128: "bg-[#edcf72] text-white",
  256: "bg-[#edcc61] text-white",
  512: "bg-[#edc850] text-white",
  1024: "bg-[#edc53f] text-white",
  2048: "bg-[#edc22e] text-white",
};
const BIG = "bg-[#3c3a32] text-white";

function addRandom(b: Board): Board {
  const empty = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (!empty.length) return b;
  const n = [...b];
  n[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  return n;
}

function newBoard(): Board {
  return addRandom(addRandom(Array(16).fill(0)));
}

function lineIndices(dir: Dir): number[][] {
  const lines: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const line: number[] = [];
    for (let j = 0; j < 4; j++) {
      if (dir === "left") line.push(i * 4 + j);
      if (dir === "right") line.push(i * 4 + (3 - j));
      if (dir === "up") line.push(j * 4 + i);
      if (dir === "down") line.push((3 - j) * 4 + i);
    }
    lines.push(line);
  }
  return lines;
}

function slide(b: Board, dir: Dir): { board: Board; gained: number; moved: boolean; merged: Set<number> } {
  const out = [...b];
  let gained = 0;
  const merged = new Set<number>();
  for (const idx of lineIndices(dir)) {
    const vals = idx.map((i) => b[i]).filter(Boolean);
    const res: number[] = [];
    const mergedAt: boolean[] = [];
    for (let k = 0; k < vals.length; k++) {
      if (k + 1 < vals.length && vals[k] === vals[k + 1]) {
        res.push(vals[k] * 2);
        mergedAt.push(true);
        gained += vals[k] * 2;
        k++;
      } else {
        res.push(vals[k]);
        mergedAt.push(false);
      }
    }
    idx.forEach((cell, k) => {
      out[cell] = res[k] ?? 0;
      if (mergedAt[k]) merged.add(cell);
    });
  }
  return { board: out, gained, moved: out.some((v, i) => v !== b[i]), merged };
}

function canMove(b: Board) {
  return (["up", "down", "left", "right"] as Dir[]).some((d) => slide(b, d).moved);
}

export function Game2048({ active }: GameProps) {
  const [board, setBoard] = useState<Board>(newBoard);
  const [score, setScore] = useState(0);
  const [merged, setMerged] = useState<Set<number>>(new Set());
  const [over, setOver] = useState(false);
  const [won, setWon] = useState<"no" | "showing" | "dismissed">("no");
  const best = bestStore.use()["2048"] ?? 0;
  const touch = useRef<{ x: number; y: number } | null>(null);

  const move = useCallback(
    (dir: Dir) => {
      if (over || won === "showing") return;
      const r = slide(board, dir);
      if (!r.moved) return;
      const next = addRandom(r.board);
      const total = score + r.gained;
      setBoard(next);
      setMerged(r.merged);
      setTimeout(() => setMerged(new Set()), 120);
      setScore(total);
      reportScore("2048", total);
      if (won === "no" && next.includes(2048)) setWon("showing");
      if (!canMove(next)) setOver(true);
    },
    [board, score, over, won],
  );

  const restart = () => {
    setBoard(newBoard());
    setScore(0);
    setMerged(new Set());
    setOver(false);
    setWon("no");
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
      const d = map[e.key];
      if (!d) return;
      e.preventDefault();
      move(d);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, move]);

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-auto p-4">
      <div className="flex items-center gap-2">
        <Stat label="Score" value={score} />
        <Stat label="Best" value={best} />
        <button type="button" onClick={restart} aria-label="New game" className="rounded-lg bg-black/5 p-2.5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      <div
        className="relative grid aspect-square w-full max-w-[380px] touch-none select-none grid-cols-4 gap-2.5 rounded-xl bg-[#bbada0] p-2.5 dark:bg-[#4a443e]"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const d = swipeDir(e.changedTouches[0].clientX - touch.current.x, e.changedTouches[0].clientY - touch.current.y);
          touch.current = null;
          if (d) move(d);
        }}
      >
        {board.map((v, i) => (
          <div
            key={i}
            className={
              v
                ? `flex items-center justify-center rounded-md font-bold transition-transform duration-100 ${TILE[v] ?? BIG} ${v >= 1024 ? "text-[22px]" : v >= 128 ? "text-[26px]" : "text-[30px]"} ${merged.has(i) ? "scale-110" : "scale-100"}`
                : "rounded-md bg-[#cdc1b4] dark:bg-[#5e5750]"
            }
          >
            {v || ""}
          </div>
        ))}
        {over && (
          <Overlay title="Game Over" subtitle={`Score: ${score}`}>
            <PrimaryButton onClick={restart}>Try Again</PrimaryButton>
          </Overlay>
        )}
        {won === "showing" && (
          <Overlay title="You made 2048! 🎉" subtitle="Keep going for a higher score?">
            <PrimaryButton onClick={() => setWon("dismissed")}>Keep Going</PrimaryButton>
            <PrimaryButton onClick={restart}>New Game</PrimaryButton>
          </Overlay>
        )}
      </div>
      <p className="text-[12px] text-neutral-500 dark:text-neutral-400">Arrow keys or swipe to merge tiles.</p>
    </div>
  );
}
