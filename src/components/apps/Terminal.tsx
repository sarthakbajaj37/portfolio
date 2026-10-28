"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { useWindows, type AppId } from "@/components/desktop/WindowManager";

type Line = { id: number; content: ReactNode };

const PROMPT = `${profile.handle}@macbook ~ %`;

const commands: Record<string, { help: string; run: (args: string[], openApp: (id: AppId) => void) => ReactNode }> = {
  help: {
    help: "list available commands",
    run: () => (
      <div className="grid grid-cols-[110px_1fr] gap-x-3">
        {Object.entries(commands).map(([name, c]) => (
          <div key={name} className="contents">
            <span className="text-emerald-400">{name}</span>
            <span className="text-neutral-400">{c.help}</span>
          </div>
        ))}
      </div>
    ),
  },
  whoami: {
    help: "who is this guy?",
    run: () => `${profile.name} — ${profile.currentRole}, ${profile.location}. ${profile.headline}`,
  },
  experience: {
    help: "where I've worked",
    run: () =>
      profile.experience.flatMap((job) =>
        job.roles.map((r) => (
          <div key={job.company + r.title}>
            <span className="text-sky-400">{job.company}</span> · {r.title}{" "}
            <span className="text-neutral-500">({r.period})</span>
          </div>
        )),
      ),
  },
  skills: {
    help: "what I work with",
    run: () =>
      Object.entries(profile.skills).map(([group, items]) => (
        <div key={group}>
          <span className="text-amber-300">{group.padEnd(17)}</span>
          {items.join(", ")}
        </div>
      )),
  },
  projects: {
    help: "things I've built",
    run: (_, openApp) => {
      openApp("finder");
      return projects.length ? `${projects.length} project(s) — opening Finder…` : "Nothing yet — currently cooking 🍳";
    },
  },
  contact: {
    help: "how to reach me",
    run: () => (
      <>
        <div>email     <a className="underline" href={`mailto:${profile.email}`}>{profile.email}</a></div>
        <div>github    <a className="underline" href={profile.links.github} target="_blank" rel="noreferrer">{profile.links.github}</a></div>
        <div>linkedin  <a className="underline" href={profile.links.linkedin} target="_blank" rel="noreferrer">{profile.links.linkedin}</a></div>
      </>
    ),
  },
  open: {
    help: "open an app: notes | finder | textedit | mail",
    run: (args, openApp) => {
      const app = args[0] as AppId;
      if (!["notes", "finder", "textedit", "mail", "terminal"].includes(app)) return "usage: open <notes|finder|textedit|mail>";
      openApp(app);
      return `opening ${app}…`;
    },
  },
  sudo: {
    help: "try it",
    run: (args) =>
      args.join(" ") === "hire sarthak"
        ? `[sudo] permission granted ✅ — drop a line at ${profile.email}`
        : "nice try. (hint: sudo hire sarthak)",
  },
  date: { help: "current date", run: () => new Date().toString() },
  echo: { help: "print text", run: (args) => args.join(" ") },
  clear: { help: "clear the screen", run: () => null },
};

const banner: ReactNode = (
  <div className="text-neutral-400">
    Last login: {new Date().toDateString()} on ttys000
    <br />
    Type <span className="text-emerald-400">help</span> to see what you can do.
  </div>
);

export function Terminal() {
  const { open } = useWindows();
  const [lines, setLines] = useState<Line[]>([{ id: 0, content: banner }]);
  const [input, setInput] = useState("");
  const history = useRef<string[]>([]);
  const historyIdx = useRef(0);
  const nextId = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Braces matter: scrollIntoView can return a Promise, and anything returned from an
  // effect is treated as its cleanup function.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  function run(raw: string) {
    const [name, ...args] = raw.trim().split(/\s+/);
    const echo: Line = {
      id: nextId.current++,
      content: (
        <div>
          <span className="text-emerald-400">{PROMPT}</span> {raw}
        </div>
      ),
    };
    if (name === "clear") return setLines([]);
    const cmd = commands[name];
    const output = !name ? null : cmd ? cmd.run(args, open) : `zsh: command not found: ${name}`;
    setLines((prev) => [...prev, echo, ...(output ? [{ id: nextId.current++, content: output }] : [])]);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      if (input.trim()) history.current.push(input);
      historyIdx.current = history.current.length;
      run(input);
      setInput("");
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      historyIdx.current = Math.min(Math.max(historyIdx.current + (e.key === "ArrowUp" ? -1 : 1), 0), h.length);
      setInput(h[historyIdx.current] ?? "");
    } else if (e.key === "Tab") {
      e.preventDefault();
      const match = Object.keys(commands).find((c) => c.startsWith(input));
      if (match) setInput(match);
    }
  }

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="h-full min-h-full space-y-1 bg-[#1e1e1e]/95 p-3 font-mono text-[12.5px] leading-relaxed text-neutral-200"
    >
      {lines.map((l) => (
        <div key={l.id} className="whitespace-pre-wrap break-words">
          {l.content}
        </div>
      ))}
      <div className="flex">
        <span className="shrink-0 text-emerald-400">{PROMPT}&nbsp;</span>
        <input
          ref={inputRef}
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="Terminal input"
          className="min-w-0 flex-1 bg-transparent caret-neutral-200 outline-none"
        />
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
