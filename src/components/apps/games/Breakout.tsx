"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/lib/settings";
import { bestStore, reportScore } from "./store";
import { Overlay, PrimaryButton, Stat, type GameProps } from "./shared";

const W = 480;
const H = 360;
const PW = 80;
const PH = 10;
const PY = H - 24;
const R = 6;
const ROWS = 6;
const COLS = 10;
const BW = 44;
const BH = 14;
const GAP = 4;
const LEFT = (W - (COLS * BW + (COLS - 1) * GAP)) / 2;
const TOP = 44;
const ROW_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7"];

type Status = "ready" | "running" | "over" | "won";

function freshBricks() {
  return Array.from({ length: ROWS * COLS }, () => true);
}

export function Breakout({ active, mobile }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useRef({ px: W / 2 - PW / 2, bx: W / 2, by: PY - R - 1, vx: 0, vy: 0, bricks: freshBricks(), score: 0, lives: 3, keys: { left: false, right: false } });
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [newBest, setNewBest] = useState(false);
  const best = bestStore.use().breakout ?? 0;
  const { resolvedTheme } = useSettings();
  const dark = resolvedTheme === "dark";

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const s = g.current;
    ctx.fillStyle = dark ? "#111827" : "#f8fafc";
    ctx.fillRect(0, 0, W, H);
    s.bricks.forEach((alive, i) => {
      if (!alive) return;
      const r = Math.floor(i / COLS);
      const c = i % COLS;
      ctx.fillStyle = ROW_COLORS[r];
      ctx.beginPath();
      ctx.roundRect(LEFT + c * (BW + GAP), TOP + r * (BH + GAP), BW, BH, 3);
      ctx.fill();
    });
    ctx.fillStyle = dark ? "#e5e7eb" : "#1f2937";
    ctx.beginPath();
    ctx.roundRect(s.px, PY, PW, PH, 5);
    ctx.fill();
    ctx.fillStyle = dark ? "#fbbf24" : "#2563eb";
    ctx.beginPath();
    ctx.arc(s.bx, s.by, R, 0, Math.PI * 2);
    ctx.fill();
  }, [dark]);

  useEffect(() => {
    draw();
  }, [draw, status]);

  const launch = useCallback(() => {
    const s = g.current;
    const angle = (Math.random() * 0.6 - 0.3) * Math.PI;
    s.vx = 300 * Math.sin(angle);
    s.vy = -300 * Math.cos(angle);
    setStatus("running");
  }, []);

  const restart = useCallback(() => {
    g.current = { ...g.current, px: W / 2 - PW / 2, bx: W / 2, by: PY - R - 1, vx: 0, vy: 0, bricks: freshBricks(), score: 0, lives: 3 };
    setScore(0);
    setLives(3);
    setNewBest(false);
    setStatus("ready");
  }, []);

  // Game loop (runs while focused; serving state just tracks the paddle).
  useEffect(() => {
    if (!active || (status !== "running" && status !== "ready")) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const s = g.current;
      if (s.keys.left) s.px -= 420 * dt;
      if (s.keys.right) s.px += 420 * dt;
      s.px = Math.max(0, Math.min(W - PW, s.px));

      if (status === "ready") {
        s.bx = s.px + PW / 2;
        s.by = PY - R - 1;
      } else {
        // sub-step to avoid tunnelling
        const steps = 3;
        for (let k = 0; k < steps; k++) {
          s.bx += (s.vx * dt) / steps;
          s.by += (s.vy * dt) / steps;
          if (s.bx < R) { s.bx = R; s.vx = Math.abs(s.vx); }
          if (s.bx > W - R) { s.bx = W - R; s.vx = -Math.abs(s.vx); }
          if (s.by < R) { s.by = R; s.vy = Math.abs(s.vy); }
          // paddle
          if (s.vy > 0 && s.by + R >= PY && s.by + R <= PY + PH + 4 && s.bx >= s.px - R && s.bx <= s.px + PW + R) {
            const hit = (s.bx - (s.px + PW / 2)) / (PW / 2);
            const speed = Math.min(520, Math.hypot(s.vx, s.vy) * 1.02);
            const ang = hit * (Math.PI / 3);
            s.vx = speed * Math.sin(ang);
            s.vy = -speed * Math.cos(ang);
            s.by = PY - R;
          }
          // bricks
          for (let i = 0; i < s.bricks.length; i++) {
            if (!s.bricks[i]) continue;
            const r = Math.floor(i / COLS);
            const c = i % COLS;
            const x = LEFT + c * (BW + GAP);
            const y = TOP + r * (BH + GAP);
            if (s.bx + R > x && s.bx - R < x + BW && s.by + R > y && s.by - R < y + BH) {
              s.bricks[i] = false;
              const overlapX = Math.min(s.bx + R - x, x + BW - (s.bx - R));
              const overlapY = Math.min(s.by + R - y, y + BH - (s.by - R));
              if (overlapX < overlapY) s.vx = -s.vx;
              else s.vy = -s.vy;
              s.score += (ROWS - r) * 10;
              setScore(s.score);
              if (s.bricks.every((b) => !b)) {
                setNewBest(reportScore("breakout", s.score));
                setStatus("won");
                draw();
                return;
              }
              break;
            }
          }
          if (s.by > H + R) {
            s.lives -= 1;
            setLives(s.lives);
            if (s.lives <= 0) {
              setNewBest(reportScore("breakout", s.score) && s.score > 0);
              setStatus("over");
            } else {
              s.vx = 0;
              s.vy = 0;
              setStatus("ready");
            }
            draw();
            return;
          }
        }
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, status, draw]);

  useEffect(() => {
    if (!active) return;
    const s = g.current;
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") { s.keys.left = true; e.preventDefault(); }
      else if (e.key === "ArrowRight" || e.key === "d") { s.keys.right = true; e.preventDefault(); }
      else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (status === "ready") launch();
        else if (status === "over" || status === "won") restart();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "a") s.keys.left = false;
      if (e.key === "ArrowRight" || e.key === "d") s.keys.right = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      s.keys.left = false;
      s.keys.right = false;
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [active, status, launch, restart]);

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    g.current.px = Math.max(0, Math.min(W - PW, x - PW / 2));
    if (status !== "running") {
      if (status === "ready") g.current.bx = g.current.px + PW / 2;
      draw();
    }
  };

  return (
    <div className="flex h-full flex-col items-center gap-3 overflow-auto p-4">
      <div className="flex gap-2">
        <Stat label="Score" value={score} />
        <Stat label="Lives" value={"♥".repeat(Math.max(0, lives)) || "—"} />
        <Stat label="Best" value={best} />
      </div>
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-xl shadow-lg ring-1 ring-black/10 dark:ring-white/10">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block w-full touch-none"
          onPointerMove={onPointer}
          onPointerDown={(e) => {
            onPointer(e);
            if (status === "ready" && active) launch();
          }}
        />
        {status === "ready" && score === 0 && lives === 3 && (
          <Overlay title="Breakout" subtitle={mobile ? "Drag to move · tap to launch" : "Mouse or ←/→ to move · click or Space to launch"}>
            <PrimaryButton onClick={launch}>Start</PrimaryButton>
          </Overlay>
        )}
        {status === "over" && (
          <Overlay title="Game Over" subtitle={newBest ? `New best: ${score} 🎉` : `Score: ${score}`}>
            <PrimaryButton onClick={restart}>Play Again</PrimaryButton>
          </Overlay>
        )}
        {status === "won" && (
          <Overlay title="Cleared! 🎉" subtitle={newBest ? `New best: ${score}` : `Score: ${score}`}>
            <PrimaryButton onClick={restart}>Play Again</PrimaryButton>
          </Overlay>
        )}
        {status === "running" && !active && <Overlay title="Paused" subtitle="Click the window to resume" />}
      </div>
    </div>
  );
}
