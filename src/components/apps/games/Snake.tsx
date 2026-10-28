"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import { useSettings } from "@/lib/settings";
import { bestStore, reportScore } from "./store";
import { Overlay, PrimaryButton, Stat, swipeDir, type GameProps } from "./shared";

const N = 20;
const CELL = 20;
type P = { x: number; y: number };
type Status = "ready" | "running" | "paused" | "over";

function freshGame() {
  return {
    snake: [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
    ] as P[],
    dir: { x: 1, y: 0 } as P,
    queue: [] as P[],
    food: { x: 14, y: 10 } as P,
    score: 0,
  };
}

function placeFood(snake: P[]): P {
  for (;;) {
    const p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p;
  }
}

export function Snake({ active, mobile }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef(freshGame());
  const touch = useRef<P | null>(null);
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const best = bestStore.use().snake ?? 0;
  const { resolvedTheme } = useSettings();
  const dark = resolvedTheme === "dark";

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const g = game.current;
    ctx.fillStyle = dark ? "#1c2a1f" : "#e8f5e0";
    ctx.fillRect(0, 0, N * CELL, N * CELL);
    ctx.fillStyle = dark ? "#213325" : "#dcefd2";
    for (let y = 0; y < N; y++) for (let x = (y % 2); x < N; x += 2) ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
    // food
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(g.food.x * CELL + CELL / 2, g.food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    // snake
    g.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? (dark ? "#4ade80" : "#15803d") : dark ? "#22c55e" : "#16a34a";
      ctx.beginPath();
      ctx.roundRect(s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3, 6);
      ctx.fill();
    });
  }, [dark]);

  useEffect(() => {
    draw();
  }, [draw, status]);

  const start = useCallback(() => {
    game.current = freshGame();
    game.current.food = placeFood(game.current.snake);
    setScore(0);
    setNewBest(false);
    setStatus("running");
  }, []);

  const level = Math.floor(score / 5);
  const running = status === "running" && active;

  useEffect(() => {
    if (!running) return;
    const speed = Math.max(55, 125 - level * 8);
    const id = setInterval(() => {
      const g = game.current;
      const nd = g.queue.shift();
      if (nd) g.dir = nd;
      const head = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y };
      const hitWall = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N;
      const eating = head.x === g.food.x && head.y === g.food.y;
      const body = eating ? g.snake : g.snake.slice(0, -1);
      if (hitWall || body.some((s) => s.x === head.x && s.y === head.y)) {
        setStatus("over");
        setNewBest(reportScore("snake", g.score) && g.score > 0);
        return;
      }
      g.snake = [head, ...body];
      if (eating) {
        g.food = placeFood(g.snake);
        g.score += 1;
        setScore(g.score);
      }
      draw();
    }, speed);
    return () => clearInterval(id);
  }, [running, level, draw]);

  const turn = useCallback((d: "up" | "down" | "left" | "right") => {
    const v = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[d];
    const g = game.current;
    const last = g.queue[g.queue.length - 1] ?? g.dir;
    if (last.x + v.x === 0 && last.y + v.y === 0) return; // no reversing
    if (last.x === v.x && last.y === v.y) return;
    if (g.queue.length < 3) g.queue.push(v);
  }, []);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      };
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        if (status === "running") turn(d);
        return;
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (status === "running") setStatus("paused");
        else if (status === "paused") setStatus("running");
        else start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, status, start, turn]);

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-auto p-4">
      <div className="flex gap-2">
        <Stat label="Score" value={score} />
        <Stat label="Best" value={best} />
      </div>
      <div className="relative w-full max-w-[400px] overflow-hidden rounded-xl shadow-lg ring-1 ring-black/10 dark:ring-white/10">
        <canvas
          ref={canvasRef}
          width={N * CELL}
          height={N * CELL}
          className="block aspect-square w-full touch-none"
          onTouchStart={(e) => {
            touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }}
          onTouchEnd={(e) => {
            if (!touch.current) return;
            const d = swipeDir(e.changedTouches[0].clientX - touch.current.x, e.changedTouches[0].clientY - touch.current.y);
            touch.current = null;
            if (d && status === "running") turn(d);
          }}
        />
        {status === "ready" && (
          <Overlay title="Snake" subtitle={mobile ? "Swipe or use the arrows to steer." : "Arrow keys / WASD to steer · Space to pause"}>
            <PrimaryButton onClick={start}>Start</PrimaryButton>
          </Overlay>
        )}
        {status === "over" && (
          <Overlay title="Game Over" subtitle={newBest ? `New best: ${score} 🎉` : `Score: ${score}`}>
            <PrimaryButton onClick={start}>Play Again</PrimaryButton>
          </Overlay>
        )}
        {status === "paused" && (
          <Overlay title="Paused">
            <PrimaryButton onClick={() => setStatus("running")}>Resume</PrimaryButton>
          </Overlay>
        )}
        {status === "running" && !active && <Overlay title="Paused" subtitle="Click the window to resume" />}
      </div>
      {mobile && status === "running" && (
        <div className="grid grid-cols-3 gap-2">
          <span />
          <DPad onClick={() => turn("up")} label="Up">
            <ArrowUp className="h-5 w-5" />
          </DPad>
          <span />
          <DPad onClick={() => turn("left")} label="Left">
            <ArrowLeft className="h-5 w-5" />
          </DPad>
          <DPad onClick={() => setStatus("paused")} label="Pause">
            <span className="text-[11px] font-semibold">II</span>
          </DPad>
          <DPad onClick={() => turn("right")} label="Right">
            <ArrowRight className="h-5 w-5" />
          </DPad>
          <span />
          <DPad onClick={() => turn("down")} label="Down">
            <ArrowDown className="h-5 w-5" />
          </DPad>
          <span />
        </div>
      )}
    </div>
  );
}

function DPad({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 active:bg-black/15 dark:bg-white/10 dark:active:bg-white/20"
    >
      {children}
    </button>
  );
}
