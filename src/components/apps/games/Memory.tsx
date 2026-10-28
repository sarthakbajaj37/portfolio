"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { bestStore, reportScore } from "./store";
import { Overlay, PrimaryButton, Stat, type GameProps } from "./shared";

const FACES = ["☕", "🐛", "🚀", "🧩", "🔥", "🥝", "🎧", "🐳"];

type Card = { id: number; face: string };

function deal(): Card[] {
  const cards = [...FACES, ...FACES].map((face, id) => ({ id, face }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function Memory({ active }: GameProps) {
  const [cards, setCards] = useState<Card[]>(deal);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const best = bestStore.use().memory;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const done = matched.size === FACES.length;

  const flip = (idx: number) => {
    if (!active || flipped.length === 2 || flipped.includes(idx) || matched.has(cards[idx].face)) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length < 2) return;
    const m = moves + 1;
    setMoves(m);
    const [a, b] = next;
    if (cards[a].face === cards[b].face) {
      const nm = new Set(matched).add(cards[a].face);
      setMatched(nm);
      setFlipped([]);
      if (nm.size === FACES.length) setNewBest(reportScore("memory", m, true));
    } else {
      timer.current = setTimeout(() => setFlipped([]), 800);
    }
  };

  const restart = () => {
    if (timer.current) clearTimeout(timer.current);
    setCards(deal());
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setNewBest(false);
  };

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-auto p-4">
      <div className="flex items-center gap-2">
        <Stat label="Moves" value={moves} />
        <Stat label="Pairs" value={`${matched.size}/${FACES.length}`} />
        <Stat label="Best" value={best ?? "—"} />
        <button type="button" onClick={restart} aria-label="New game" className="rounded-lg bg-black/5 p-2.5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      <div className="relative grid w-full max-w-[380px] grid-cols-4 gap-2.5 [perspective:800px]">
        {cards.map((c, i) => {
          const up = flipped.includes(i) || matched.has(c.face);
          return (
            <button key={c.id} type="button" onClick={() => flip(i)} className="aspect-square" aria-label={up ? c.face : "Hidden card"}>
              <div className={up ? "relative h-full w-full transition-transform duration-300 [transform-style:preserve-3d] [transform:rotateY(180deg)]" : "relative h-full w-full transition-transform duration-300 [transform-style:preserve-3d]"}>
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-[22px] text-white/70 shadow [backface-visibility:hidden]">
                  ?
                </div>
                <div
                  className={
                    matched.has(c.face)
                      ? "absolute inset-0 flex items-center justify-center rounded-xl bg-emerald-100 text-[34px] shadow [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-emerald-900/50"
                      : "absolute inset-0 flex items-center justify-center rounded-xl bg-white text-[34px] shadow [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-neutral-700"
                  }
                >
                  {c.face}
                </div>
              </div>
            </button>
          );
        })}
        {done && (
          <Overlay title="All pairs found! 🎉" subtitle={newBest ? `New best: ${moves} moves` : `${moves} moves`}>
            <PrimaryButton onClick={restart}>Play Again</PrimaryButton>
          </Overlay>
        )}
      </div>
    </div>
  );
}
