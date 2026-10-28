// Small alpha-beta chess engine on top of chess.js. Runs inside a Web Worker
// (chess.worker.ts) and falls back to the main thread if workers are unavailable.

import { Chess, type Move, type PieceSymbol, type Color } from "chess.js";

export type ChessLevel = "easy" | "medium" | "hard";
export type EngineMove = { from: string; to: string; promotion?: string };

const VALUE: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Piece-square tables from White's point of view (a8 = index 0).
const PST: Record<PieceSymbol, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5,
    -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15,
    20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10,
    10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0,
    0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10,
    5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40,
    -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

/** Static evaluation from White's perspective (centipawns). */
function evaluate(game: Chess): number {
  let score = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = board[r][f];
      if (!sq) continue;
      const idx = sq.color === "w" ? r * 8 + f : (7 - r) * 8 + f;
      const v = VALUE[sq.type] + PST[sq.type][idx];
      score += sq.color === "w" ? v : -v;
    }
  }
  return score;
}

function order(moves: Move[]): Move[] {
  const key = (m: Move) => (m.captured ? 10 * VALUE[m.captured] - VALUE[m.piece] : 0) + (m.promotion ? 800 : 0) + (m.san.includes("+") ? 50 : 0);
  return moves.sort((a, b) => key(b) - key(a));
}

const MATE = 100_000;

function negamax(game: Chess, depth: number, alpha: number, beta: number, color: 1 | -1, ply: number): number {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return game.inCheck() ? -MATE + ply : 0;
  if (game.isDraw()) return 0;
  if (depth === 0) return color * evaluate(game);
  let best = -Infinity;
  for (const m of order(moves)) {
    game.move(m);
    const score = -negamax(game, depth - 1, -beta, -alpha, (-color) as 1 | -1, ply + 1);
    game.undo();
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

const DEPTH: Record<ChessLevel, number> = { easy: 1, medium: 2, hard: 3 };

export function chooseMove(fen: string, level: ChessLevel): EngineMove | null {
  const game = new Chess(fen);
  const moves = order(game.moves({ verbose: true }));
  if (!moves.length) return null;
  const color: 1 | -1 = (game.turn() as Color) === "w" ? 1 : -1;
  const depth = DEPTH[level];

  const scored: { m: Move; s: number }[] = [];
  let alpha = -Infinity;
  for (const m of moves) {
    game.move(m);
    // Full window for easy so we get honest scores to pick randomly among.
    const s = -negamax(game, depth - 1, -Infinity, level === "easy" ? Infinity : -(alpha - 1), (-color) as 1 | -1, 1);
    game.undo();
    scored.push({ m, s });
    if (s > alpha) alpha = s;
  }
  scored.sort((a, b) => b.s - a.s);

  let pick = scored[0];
  if (level === "easy") {
    // Pick among the top few moves, occasionally blundering.
    const pool = scored.slice(0, Math.min(scored.length, Math.random() < 0.25 ? 6 : 3));
    pick = pool[Math.floor(Math.random() * pool.length)];
  } else {
    // Break ties randomly so games vary.
    const ties = scored.filter((x) => x.s === scored[0].s);
    pick = ties[Math.floor(Math.random() * ties.length)];
  }
  return { from: pick.m.from, to: pick.m.to, promotion: pick.m.promotion };
}
