"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { AppProps } from "@/components/desktop/types";
import { useWindows, useWindowSelf } from "@/components/desktop/WindowManager";
import { profile } from "@/data/profile";
import { HOME, list, listAsync, resolve } from "@/lib/vfs";
import { useOpenPath } from "@/components/apps/finder/useOpenPath";
import { commands, HOSTNAME, shortCwd, type Ctx } from "./commands";

type Line = { id: number; content: ReactNode };

const prompt = (cwd: string) => `${profile.handle}@${HOSTNAME} ${shortCwd(cwd)} %`;

/** Split a command line into words, honouring quotes and backslash escapes. */
function tokenize(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let has = false;
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === "\\" && i + 1 < s.length) {
      cur += s[++i];
      has = true;
    } else if (c === '"' || c === "'") {
      quote = c;
      has = true;
    } else if (/\s/.test(c)) {
      if (has) out.push(cur);
      cur = "";
      has = false;
    } else {
      cur += c;
      has = true;
    }
  }
  if (has) out.push(cur);
  return out;
}

/** Index where the last (unescaped, unquoted) word of `s` starts. */
function lastWordStart(s: string): number {
  let start = 0;
  let quote: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === "\\") i++;
    else if (c === '"' || c === "'") quote = c;
    else if (/\s/.test(c)) start = i + 1;
  }
  return start;
}

const escapeWord = (w: string) => w.replace(/([\s"'\\])/g, "\\$1");

function commonPrefix(words: string[]): string {
  if (!words.length) return "";
  let p = words[0];
  for (const w of words) while (!w.startsWith(p)) p = p.slice(0, -1);
  return p;
}

const banner: ReactNode = (
  <div className="text-neutral-400">
    Last login: {new Date().toDateString()} on ttys000
    <br />
    Type <span className="text-emerald-400">help</span> to see what you can do — try <span className="text-emerald-400">ls</span>,{" "}
    <span className="text-emerald-400">cd Projects</span> or <span className="text-emerald-400">neofetch</span>.
  </div>
);

export function TerminalApp({ mobile }: AppProps) {
  const { openApp } = useWindows();
  const self = useWindowSelf();
  const openPath = useOpenPath();
  const [lines, setLines] = useState<Line[]>([{ id: 0, content: banner }]);
  const [input, setInput] = useState("");
  const [cwd, setCwd] = useState(HOME);
  const [busy, setBusy] = useState(false);
  const oldCwd = useRef(HOME);
  const history = useRef<string[]>([]);
  const historyIdx = useRef(0);
  const draft = useRef("");
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Braces matter: scrollIntoView can return a Promise, and anything returned from an
  // effect is treated as its cleanup function.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines, busy]);

  useEffect(() => {
    if (self.isFocused) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [self.isFocused]);

  const push = (...contents: ReactNode[]) =>
    setLines((prev) => [...prev, ...contents.filter((c) => c != null && c !== false).map((content) => ({ id: nextId.current++, content }))]);

  const echoLine = (dir: string, raw: string, suffix = "") => (
    <div>
      <span className="text-emerald-400">{prompt(dir)}</span> {raw}
      {suffix}
    </div>
  );

  async function run(raw: string) {
    const [name, ...args] = tokenize(raw);
    if (name === "clear") {
      setLines([]);
      return;
    }
    push(echoLine(cwd, raw));
    if (!name) return;
    const cmd = commands[name];
    if (!cmd) {
      push(`zsh: command not found: ${name}`);
      return;
    }
    const ctx: Ctx = {
      cwd,
      oldCwd: oldCwd.current,
      setCwd: (p) => {
        oldCwd.current = cwd;
        setCwd(p);
      },
      openApp: (id) => openApp(id),
      openPath,
      close: self.close,
      history: history.current,
    };
    try {
      const out = cmd.run(args, ctx);
      if (out instanceof Promise) {
        setBusy(true);
        push(await out);
      } else push(out);
    } catch (e) {
      push(`${name}: ${e instanceof Error ? e.message : "something went wrong"}`);
    } finally {
      setBusy(false);
    }
  }

  async function complete(current: string) {
    const start = lastWordStart(current);
    const head = current.slice(0, start);
    const word = tokenize(current.slice(start))[0] ?? "";
    const isCommand = tokenize(head).length === 0;

    let candidates: { name: string; suffix: string }[];
    let base = "";
    if (isCommand && !word.includes("/")) {
      candidates = Object.keys(commands)
        .filter((c) => c.startsWith(word))
        .map((c) => ({ name: c, suffix: " " }));
    } else {
      const slash = word.lastIndexOf("/");
      base = slash >= 0 ? word.slice(0, slash + 1) : "";
      const prefix = slash >= 0 ? word.slice(slash + 1) : word;
      const dir = resolve(cwd, base || ".");
      let res = list(dir);
      if (res.loading) res = await listAsync(dir);
      candidates = res.nodes
        .filter((n) => n.name.startsWith(prefix) && (prefix.startsWith(".") || !n.name.startsWith(".")))
        .map((n) => ({ name: n.name, suffix: n.type === "dir" ? "/" : " " }));
      if (word === "~") candidates = [{ name: "~", suffix: "/" }];
    }
    if (!candidates.length) return;
    if (candidates.length === 1) {
      const c = candidates[0];
      const full = c.name === "~" ? "~" : base + c.name;
      setInput(head + escapeWord(full).replace(/^\\~/, "~") + c.suffix);
      return;
    }
    const prefix = commonPrefix(candidates.map((c) => c.name));
    const typed = word.slice(word.lastIndexOf("/") + 1);
    if (prefix.length > typed.length) {
      setInput(head + escapeWord(base + prefix).replace(/^\\~/, "~"));
      return;
    }
    push(
      echoLine(cwd, current),
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4">
        {candidates.map((c) => (
          <span key={c.name} className={`truncate ${c.suffix === "/" ? "font-bold text-sky-400" : ""}`}>
            {c.name}
            {c.suffix === "/" ? "/" : ""}
          </span>
        ))}
      </div>,
    );
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (busy) return;
      const raw = input;
      if (raw.trim() && history.current[history.current.length - 1] !== raw) history.current.push(raw);
      historyIdx.current = history.current.length;
      draft.current = "";
      setInput("");
      void run(raw);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      if (historyIdx.current === h.length) draft.current = input;
      historyIdx.current = Math.min(Math.max(historyIdx.current + (e.key === "ArrowUp" ? -1 : 1), 0), h.length);
      setInput(historyIdx.current === h.length ? draft.current : h[historyIdx.current]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      void complete(input);
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      push(echoLine(cwd, input, "^C"));
      setInput("");
    } else if ((e.ctrlKey || e.metaKey) && e.key === "l") {
      e.preventDefault();
      setLines([]);
    } else if (e.metaKey && e.key === "k") {
      e.preventDefault();
      setLines([]);
    }
  }

  return (
    <div
      onClick={() => {
        if (!window.getSelection()?.toString()) inputRef.current?.focus();
      }}
      className={`h-full min-h-full overflow-y-auto bg-[#1e1e1e] p-3 font-mono ${mobile ? "text-[12px]" : "text-[12.5px]"} leading-relaxed text-neutral-200`}
    >
      <div className="space-y-0.5">
        {lines.map((l) => (
          <div key={l.id} className="whitespace-pre-wrap break-words">
            {l.content}
          </div>
        ))}
      </div>
      {busy ? (
        <div className="text-neutral-500">…</div>
      ) : (
        <div className="flex">
          <span className="shrink-0 text-emerald-400">{prompt(cwd)}&nbsp;</span>
          <input
            ref={inputRef}
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label="Terminal input"
            className="min-w-0 flex-1 bg-transparent caret-neutral-200 outline-none"
          />
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
