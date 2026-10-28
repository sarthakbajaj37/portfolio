"use client";

import { useEffect, useRef, useState } from "react";
import { Flag } from "lucide-react";
import { bestStore, reportScore } from "./store";
import { Segmented, Stat, type GameProps } from "./shared";

type Level = "easy" | "medium" | "hard";
const LEVELS: Record<Level, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
};

type Cell = { mine: boolean; adj: number; open: boolean; flag: boolean };
type Status = "ready" | "playing" | "won" | "lost";

const NUM_COLOR: Record<number, string> = {
  1: "text-blue-600 dark:text-blue-400",
  2: "text-green-600 dark:text-green-400",
  3: "text-red-600 dark:text-red-400",
  4: "text-indigo-800 dark:text-indigo-300",
  5: "text-amber-800 dark:text-amber-400",
  6: "text-teal-600 dark:text-teal-300",
  7: "text-neutral-900 dark:text-neutral-100",
  8: "text-neutral-500",
};

const emptyBoard = (rows: number, cols: number): Cell[] => Array.from({ length: rows * cols }, () => ({ mine: false, adj: 0, open: false, flag: false }));

function neighbours(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  return out;
}

function generate(rows: number, cols: number, mines: number, safe: number): Cell[] {
  const b = emptyBoard(rows, cols);
  const forbidden = new Set([safe, ...neighbours(safe, rows, cols)]);
  let placed = 0;
  while (placed < mines) {
    const i = Math.floor(Math.random() * rows * cols);
    if (b[i].mine || forbidden.has(i)) continue;
    b[i].mine = true;
    placed++;
  }
  b.forEach((cell, i) => {
    cell.adj = neighbours(i, rows, cols).filter((n) => b[n].mine).length;
  });
  return b;
}

function flood(b: Cell[], start: number, rows: number, cols: number) {
  const stack = [start];
  while (stack.length) {
    const i = stack.pop()!;
    const cell = b[i];
    if (cell.open || cell.flag) continue;
    cell.open = true;
    if (cell.adj === 0 && !cell.mine) stack.push(...neighbours(i, rows, cols));
  }
}

export function Minesweeper({ active, mobile }: GameProps) {
  const [level, setLevel] = useState<Level>("easy");
  const cfg = LEVELS[level];
  const [board, setBoard] = useState<Cell[]>(() => emptyBoard(cfg.rows, cfg.cols));
  const [status, setStatus] = useState<Status>("ready");
  const [elapsed, setElapsed] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [newBest, setNewBest] = useState(false);
  const best = bestStore.use()[`minesweeper-${level}`];
  const longPress = useRef<{ t: ReturnType<typeof setTimeout>; fired: boolean } | null>(null);

  const reset = (l: Level = level) => {
    setLevel(l);
    setBoard(emptyBoard(LEVELS[l].rows, LEVELS[l].cols));
    setStatus("ready");
    setElapsed(0);
    setNewBest(false);
  };

  useEffect(() => {
    if (status !== "playing" || !active) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [status, active]);

  const finish = (b: Cell[], lost: boolean) => {
    if (lost) {
      setStatus("lost");
      setBoard(b.map((c) => (c.mine ? { ...c, open: true } : c)));
      return;
    }
    setStatus("won");
    setBoard(b.map((c) => (c.mine ? { ...c, flag: true } : c)));
    setNewBest(reportScore(`minesweeper-${level}`, Math.max(1, elapsed), true));
  };

  const reveal = (i: number) => {
    if (status === "won" || status === "lost") return;
    let b = board.map((c) => ({ ...c }));
    if (status === "ready") {
      b = generate(cfg.rows, cfg.cols, cfg.mines, i);
      setStatus("playing");
    }
    const cell = b[i];
    if (cell.flag) return;
    if (cell.open) {
      // Chord: open neighbours if the right number of flags is placed.
      const ns = neighbours(i, cfg.rows, cfg.cols);
      if (ns.filter((n) => b[n].flag).length !== cell.adj) return;
      for (const n of ns) if (!b[n].flag && !b[n].open) {
        if (b[n].mine) return finish(b, true);
        flood(b, n, cfg.rows, cfg.cols);
      }
    } else {
      if (cell.mine) return finish(b, true);
      flood(b, i, cfg.rows, cfg.cols);
    }
    if (b.every((c) => c.mine || c.open)) return finish(b, false);
    setBoard(b);
  };

  const toggleFlag = (i: number) => {
    if (status !== "playing" || board[i].open) return;
    setBoard(board.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c)));
  };

  const flags = board.filter((c) => c.flag).length;
  const face = status === "lost" ? "😵" : status === "won" ? "😎" : "🙂";
  const cellSize = level === "easy" ? "h-8 w-8 text-[15px]" : "h-6 w-6 text-[13px]";
  const gridCols = level === "hard" ? "grid-cols-[repeat(30,auto)]" : level === "medium" ? "grid-cols-[repeat(16,auto)]" : "grid-cols-[repeat(9,auto)]";

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-auto p-4">
      <Segmented
        value={level}
        onChange={(l) => reset(l)}
        options={[
          { value: "easy", label: "Easy" },
          { value: "medium", label: "Medium" },
          { value: "hard", label: "Hard" },
        ]}
      />
      <div className="flex items-center gap-2">
        <Stat label="Mines" value={cfg.mines - flags} />
        <button type="button" onClick={() => reset()} className="rounded-lg bg-black/5 px-3 py-1.5 text-[20px] hover:bg-black/10 dark:bg-white/10" aria-label="New game">
          {face}
        </button>
        <Stat label="Time" value={elapsed} />
        <Stat label="Best" value={best ?? "—"} />
      </div>
      {mobile && (
        <button
          type="button"
          onClick={() => setFlagMode((f) => !f)}
          className={flagMode ? "flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-[13px] font-medium text-white" : "flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-[13px] dark:bg-white/10"}
        >
          <Flag className="h-3.5 w-3.5" /> Flag mode {flagMode ? "on" : "off"}
        </button>
      )}
      <div className="max-w-full overflow-auto">
        <div className={`grid w-max select-none gap-px rounded-md bg-neutral-300 p-px dark:bg-neutral-700 ${gridCols}`} onContextMenu={(e) => e.preventDefault()}>
          {board.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                if (longPress.current?.fired) return;
                if (flagMode) toggleFlag(i);
                else reveal(i);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                toggleFlag(i);
              }}
              onTouchStart={() => {
                longPress.current = {
                  fired: false,
                  t: setTimeout(() => {
                    if (longPress.current) longPress.current.fired = true;
                    toggleFlag(i);
                  }, 400),
                };
              }}
              onTouchEnd={() => {
                if (longPress.current) clearTimeout(longPress.current.t);
              }}
              className={`flex items-center justify-center font-bold ${cellSize} ${
                c.open
                  ? c.mine
                    ? "bg-red-400 dark:bg-red-500/70"
                    : "bg-neutral-100 dark:bg-neutral-800"
                  : "bg-neutral-200 hover:bg-neutral-50 dark:bg-neutral-600 dark:hover:bg-neutral-500"
              } ${c.open && c.adj ? NUM_COLOR[c.adj] : ""}`}
            >
              {c.open ? (c.mine ? "💣" : c.adj || "") : c.flag ? "🚩" : ""}
            </button>
          ))}
        </div>
      </div>
      <p className="text-center text-[12px] text-neutral-500 dark:text-neutral-400">
        {status === "won"
          ? newBest
            ? `Cleared in ${elapsed}s — new best! 🎉`
            : `Cleared in ${elapsed}s 🎉`
          : status === "lost"
            ? "Boom. Tap the face to try again."
            : mobile
              ? "Tap to reveal · long-press or flag mode to flag"
              : "Click to reveal · right-click to flag · click a number to chord"}
      </p>
    </div>
  );
}
