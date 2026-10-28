import { chooseMove, type ChessLevel } from "./chess-engine";

self.onmessage = (event: MessageEvent<{ id: number; fen: string; level: ChessLevel }>) => {
  const { id, fen, level } = event.data;
  self.postMessage({ id, move: chooseMove(fen, level) });
};

export {};
