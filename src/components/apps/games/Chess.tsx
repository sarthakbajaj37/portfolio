"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess as ChessGame, type Square, type Move } from "chess.js";
import { RotateCcw, Undo2 } from "lucide-react";
import { playSfx } from "@/components/apps/music/persisted-store";
import { chooseMove, type ChessLevel, type EngineMove } from "./chess-engine";
import { bestStore, increment } from "./store";
import { Segmented, type GameProps } from "./shared";

const START = new ChessGame().fen();
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const GLYPH: Record<string, string> = { k: "♚︎", q: "♛︎", r: "♜︎", b: "♝︎", n: "♞︎", p: "♟︎" };
const SOUND = { move: "/sounds/chess/move-self.mp3", capture: "/sounds/chess/capture.mp3", notify: "/sounds/chess/notify.mp3" };

type Ply = { fen: string; san: string; from: string; to: string };

export function Chess({ active, mobile, volume }: GameProps) {
  const [history, setHistory] = useState<Ply[]>([]);
  const [player, setPlayer] = useState<"w" | "b">("w");
  const [level, setLevel] = useState<ChessLevel>("medium");
  const [selected, setSelected] = useState<Square | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const reqId = useRef(0);
  const wins = bestStore.use();

  const fen = history.length ? history[history.length - 1].fen : START;
  const game = useMemo(() => new ChessGame(fen), [fen]);
  const last = history[history.length - 1];
  const turn = game.turn();
  const over = game.isGameOver();
  const computer = player === "w" ? "b" : "w";
  const thinking = turn === computer && !over;

  const targets = useMemo(() => {
    if (!selected) return new Map<string, Move>();
    return new Map(game.moves({ square: selected, verbose: true }).map((m) => [m.to, m] as const));
  }, [game, selected]);

  const commit = (move: EngineMove | Move, by: "w" | "b") => {
    const g = new ChessGame(fen);
    let m: Move;
    try {
      m = g.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
    } catch {
      return;
    }
    setHistory((h) => [...h, { fen: g.fen(), san: m.san, from: m.from, to: m.to }]);
    setSelected(null);
    if (g.isGameOver() || g.inCheck()) playSfx(SOUND.notify, volume);
    else playSfx(m.captured ? SOUND.capture : SOUND.move, volume);
    if (g.isCheckmate() && by === player) increment(`chess-wins-${level}`);
  };

  // Worker lifecycle.
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL("./chess.worker.ts", import.meta.url));
    } catch {
      workerRef.current = null;
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Ask the engine for a move when it's the computer's turn (and the window is focused).
  useEffect(() => {
    if (!thinking || !active) return;
    const id = ++reqId.current;
    const started = performance.now();
    let delay: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const apply = (m: EngineMove | null) => {
      if (cancelled || !m) return;
      delay = setTimeout(() => commit(m, computer), Math.max(0, 450 - (performance.now() - started)));
    };
    const fallback = () => {
      delay = setTimeout(() => apply(chooseMove(fen, level)), 30);
    };
    const w = workerRef.current;
    const onMsg = (e: MessageEvent<{ id: number; move: EngineMove | null }>) => {
      if (e.data.id === id) apply(e.data.move);
    };
    if (w) {
      w.addEventListener("message", onMsg);
      w.addEventListener("error", fallback);
      w.postMessage({ id, fen, level });
    } else {
      fallback();
    }
    return () => {
      cancelled = true;
      if (delay) clearTimeout(delay);
      w?.removeEventListener("message", onMsg);
      w?.removeEventListener("error", fallback);
    };
    // commit is recreated every render; fen/level/computer cover its inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thinking, active, fen, level, computer]);

  const onSquare = (sq: Square) => {
    if (!active || over || turn !== player) return;
    const target = targets.get(sq);
    if (selected && target) {
      commit(target, player);
      return;
    }
    const piece = game.get(sq);
    setSelected(piece && piece.color === player && sq !== selected ? sq : null);
  };

  const newGame = (color: "w" | "b") => {
    setPlayer(color);
    setHistory([]);
    setSelected(null);
  };

  const undo = () => {
    // Roll back to the last position where it's the player's turn.
    let n = history.length;
    do n--;
    while (n > 0 && new ChessGame(history[n - 1].fen).turn() !== player);
    setHistory(history.slice(0, Math.max(0, n)));
    setSelected(null);
  };

  let banner: string | null = null;
  if (game.isCheckmate()) banner = turn === player ? "Checkmate — you lost" : "Checkmate — you win! 🎉";
  else if (game.isStalemate()) banner = "Stalemate — draw";
  else if (game.isDraw()) banner = game.isThreefoldRepetition() ? "Draw by repetition" : game.isInsufficientMaterial() ? "Draw — insufficient material" : "Draw (50-move rule)";
  else if (game.inCheck()) banner = turn === player ? "Check!" : null;

  const board = game.board();
  const ranks = player === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const files = player === "w" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const moveRows: string[][] = [];
  history.forEach((p, i) => {
    if (i % 2 === 0) moveRows.push([p.san]);
    else moveRows[moveRows.length - 1].push(p.san);
  });

  return (
    <div className={mobile ? "flex h-full flex-col items-center gap-3 overflow-auto p-3" : "flex h-full items-start justify-center gap-4 overflow-auto p-4"}>
      <div className="w-full max-w-[min(480px,100%)] shrink-0">
        <div className="mb-2 flex h-6 items-center justify-between text-[13px]">
          <span className="font-medium">{thinking ? (active ? "Computer is thinking…" : "Paused") : over ? "Game over" : "Your move"}</span>
          {banner && (
            <span className={game.isCheckmate() && turn !== player ? "rounded-full bg-emerald-500 px-2.5 py-0.5 text-[12px] font-semibold text-white" : "rounded-full bg-red-500 px-2.5 py-0.5 text-[12px] font-semibold text-white"}>
              {banner}
            </span>
          )}
        </div>
        <div className="@container grid aspect-square w-full grid-cols-8 overflow-hidden rounded-md shadow-lg ring-1 ring-black/20">
          {ranks.map((r) =>
            files.map((f) => {
              const sq = `${FILES[f]}${8 - r}` as Square;
              const piece = board[r][f];
              const light = (r + f) % 2 === 0;
              const isLast = last && (last.from === sq || last.to === sq);
              const isSel = selected === sq;
              const target = targets.get(sq);
              const inCheck = piece?.type === "k" && piece.color === turn && game.inCheck();
              return (
                <button
                  key={sq}
                  type="button"
                  onClick={() => onSquare(sq)}
                  className={`relative flex aspect-square items-center justify-center ${light ? "bg-[#f0d9b5]" : "bg-[#b58863]"}`}
                  aria-label={sq}
                >
                  {isLast && <span className="absolute inset-0 bg-yellow-300/50" />}
                  {isSel && <span className="absolute inset-0 bg-yellow-400/70" />}
                  {inCheck && <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(239,68,68,0.95)_0%,rgba(239,68,68,0.5)_45%,transparent_75%)]" />}
                  {piece && (
                    <span
                      className={
                        piece.color === "w"
                          ? "relative select-none text-[10cqw] leading-none text-white [text-shadow:0_0_1px_#000,0_0_1px_#000,0_1px_2px_rgba(0,0,0,0.5)]"
                          : "relative select-none text-[10cqw] leading-none text-neutral-900 [text-shadow:0_0_1px_rgba(255,255,255,0.4)]"
                      }
                    >
                      {GLYPH[piece.type]}
                    </span>
                  )}
                  {target && !piece && <span className="absolute h-[28%] w-[28%] rounded-full bg-black/25" />}
                  {target && piece && <span className="absolute inset-[4%] rounded-full border-[0.8cqw] border-black/25" />}
                  {f === (player === "w" ? 0 : 7) && (
                    <span className={light ? "absolute left-0.5 top-0 text-[2.2cqw] font-semibold text-[#b58863]" : "absolute left-0.5 top-0 text-[2.2cqw] font-semibold text-[#f0d9b5]"}>{8 - r}</span>
                  )}
                  {r === (player === "w" ? 7 : 0) && (
                    <span className={light ? "absolute bottom-0 right-1 text-[2.2cqw] font-semibold text-[#b58863]" : "absolute bottom-0 right-1 text-[2.2cqw] font-semibold text-[#f0d9b5]"}>{FILES[f]}</span>
                  )}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <div className={mobile ? "w-full max-w-[480px] space-y-3" : "w-52 shrink-0 space-y-3"}>
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Difficulty</div>
          <Segmented
            value={level}
            onChange={(l) => {
              setLevel(l);
              newGame(player);
            }}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => newGame("w")} className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] shadow-sm hover:bg-neutral-50 dark:border-white/15 dark:bg-neutral-800 dark:hover:bg-neutral-700">
            <RotateCcw className="h-3.5 w-3.5" /> Play White
          </button>
          <button type="button" onClick={() => newGame("b")} className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] shadow-sm hover:bg-neutral-50 dark:border-white/15 dark:bg-neutral-800 dark:hover:bg-neutral-700">
            <RotateCcw className="h-3.5 w-3.5" /> Play Black
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={!history.some((_, i) => (player === "w" ? i % 2 === 0 : i % 2 === 1))}
            className="flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 py-1 text-[12px] shadow-sm hover:bg-neutral-50 disabled:opacity-40 dark:border-white/15 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
        </div>
        <div className="rounded-lg bg-black/5 p-2 dark:bg-white/5">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Moves</div>
          <div className={mobile ? "max-h-32 overflow-y-auto font-mono text-[12px]" : "max-h-64 overflow-y-auto font-mono text-[12px]"}>
            {moveRows.length === 0 ? (
              <div className="text-neutral-400">{player === "b" ? "Computer plays first." : "You play White. Click a piece to move."}</div>
            ) : (
              moveRows.map((row, i) => (
                <div key={i} className="grid grid-cols-[2rem_1fr_1fr]">
                  <span className="text-neutral-400">{i + 1}.</span>
                  <span>{row[0]}</span>
                  <span>{row[1] ?? ""}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
          Wins — Easy {wins["chess-wins-easy"] ?? 0} · Medium {wins["chess-wins-medium"] ?? 0} · Hard {wins["chess-wins-hard"] ?? 0}
        </div>
      </div>
    </div>
  );
}
