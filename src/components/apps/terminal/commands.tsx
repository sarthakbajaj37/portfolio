import type { ReactNode } from "react";
import { appMeta } from "@/components/desktop/app-meta";
import type { AppId } from "@/components/desktop/types";
import { profile } from "@/data/profile";
import {
  basename,
  displayPath,
  HOME,
  listAsync,
  mkdir,
  PROJECTS,
  readFile,
  resolve,
  stat,
  statAsync,
  touch,
  trash,
  fileClass,
  type VNode,
} from "@/lib/vfs";

export type Ctx = {
  cwd: string;
  setCwd: (p: string) => void;
  oldCwd: string;
  openApp: (id: AppId) => void;
  openPath: (p: string) => void;
  close: () => void;
  history: string[];
};

type Output = ReactNode | Promise<ReactNode>;
type Command = { help: string; hidden?: boolean; run: (args: string[], ctx: Ctx) => Output };

const BOOT = Date.now();

export const HOSTNAME = "macbook";

/** zsh's %1~ — last path component, ~ for home. */
export function shortCwd(cwd: string): string {
  if (cwd === HOME) return "~";
  if (cwd === "/") return "/";
  return basename(cwd);
}

const err = (s: string) => <span className="text-neutral-200">{s}</span>;

function parseFlags(args: string[]): { flags: Set<string>; rest: string[] } {
  const flags = new Set<string>();
  const rest: string[] = [];
  let done = false;
  for (const a of args) {
    if (!done && a === "--") done = true;
    else if (!done && a.startsWith("-") && a.length > 1) for (const ch of a.slice(1)) flags.add(ch);
    else rest.push(a);
  }
  return { flags, rest };
}

function nameClass(n: VNode): string {
  if (n.type === "dir" || n.type === "app") return "font-bold text-sky-400";
  if (fileClass(n.name) === "image") return "text-fuchsia-400";
  return "";
}

function perms(n: VNode): string {
  if (n.type === "dir" || n.type === "app") return n.readOnly ? "dr-xr-xr-x" : "drwxr-xr-x";
  return n.readOnly ? "-r--r--r--" : "-rw-r--r--";
}

function lsDate(ms?: number): string {
  if (!ms) return "            ";
  const d = new Date(ms);
  const mon = d.toLocaleString("en-US", { month: "short" });
  const day = String(d.getDate()).padStart(2, " ");
  const recent = Date.now() - ms < 180 * 86_400_000;
  const tail = recent ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : ` ${d.getFullYear()}`;
  return `${mon} ${day} ${tail}`;
}

async function ls(args: string[], ctx: Ctx): Promise<ReactNode> {
  const { flags, rest } = parseFlags(args);
  const targets = rest.length ? rest : ["."];
  const blocks: ReactNode[] = [];
  for (const t of targets) {
    const path = resolve(ctx.cwd, t);
    const node = await statAsync(path);
    if (!node) {
      blocks.push(<div key={t}>ls: {t}: No such file or directory</div>);
      continue;
    }
    let entries: VNode[];
    if (node.type === "dir") {
      const res = await listAsync(path);
      if (res.error && res.nodes.length === 0) {
        blocks.push(<div key={t}>ls: {t}: {res.error}</div>);
        continue;
      }
      entries = res.nodes;
      if (res.error) blocks.push(<div key={t + "-err"} className="text-amber-300">({res.error})</div>);
    } else {
      entries = [{ ...node, name: t }];
    }
    if (!flags.has("a")) entries = entries.filter((n) => !n.name.startsWith("."));
    entries = [...entries].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    if (flags.has("a") && node.type === "dir") {
      entries = [
        { ...node, name: "." },
        { ...(stat(resolve(path, "..")) ?? node), name: ".." },
        ...entries,
      ];
    }
    const header = targets.length > 1 ? <div key={t + "-h"}>{t}:</div> : null;
    if (flags.has("l")) {
      const total = entries.reduce((s, n) => s + Math.ceil((n.size ?? 0) / 512), 0);
      blocks.push(
        <div key={t}>
          {header}
          {node.type === "dir" && <div>total {total}</div>}
          {entries.map((n) => (
            <div key={n.name + n.path}>
              {perms(n)}  1 {n.remote ? "github " : "sarthak"}  staff  {String(n.type === "file" ? (n.size ?? 0) : 96).padStart(7)} {lsDate(n.modified)}{" "}
              <span className={nameClass(n)}>{n.name}</span>
              {n.repo && n.description ? <span className="text-neutral-500">  # {n.description}</span> : null}
            </div>
          ))}
        </div>,
      );
    } else {
      blocks.push(
        <div key={t}>
          {header}
          {entries.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-4">
              {entries.map((n) => (
                <span key={n.name + n.path} className={`truncate ${nameClass(n)}`}>
                  {n.name}
                </span>
              ))}
            </div>
          )}
        </div>,
      );
    }
  }
  return blocks;
}

async function cd(args: string[], ctx: Ctx): Promise<ReactNode> {
  const target = args[0] === "-" ? ctx.oldCwd : resolve(ctx.cwd, args[0] ?? "~");
  const node = await statAsync(target);
  if (!node) {
    const parent = await listAsync(target.slice(0, target.lastIndexOf("/")) || "/");
    if (parent.error && target.startsWith(PROJECTS + "/")) return err(`cd: ${parent.error}`);
    return err(`cd: no such file or directory: ${args[0]}`);
  }
  if (node.type !== "dir" && node.type !== "app") return err(`cd: not a directory: ${args[0]}`);
  if (node.type === "app") return err(`cd: permission denied: ${args[0]} (try: open ${args[0]})`);
  ctx.setCwd(target);
  return args[0] === "-" ? displayPath(target) : null;
}

async function cat(args: string[], ctx: Ctx): Promise<ReactNode> {
  if (!args.length) return "usage: cat <file> ...";
  const out: ReactNode[] = [];
  for (const a of args) {
    const path = resolve(ctx.cwd, a);
    const node = await statAsync(path);
    if (!node) out.push(<div key={a}>cat: {a}: No such file or directory</div>);
    else if (node.type !== "file") out.push(<div key={a}>cat: {a}: Is a directory</div>);
    else if (fileClass(node.name) !== "text")
      out.push(
        <div key={a}>
          cat: {a}: binary file — try <span className="text-emerald-400">open {a}</span>
        </div>,
      );
    else {
      try {
        out.push(<div key={a}>{await readFile(path)}</div>);
      } catch (e) {
        out.push(<div key={a}>cat: {a}: {e instanceof Error ? e.message : "read error"}</div>);
      }
    }
  }
  return out;
}

function findApp(name: string): AppId | null {
  const n = name.toLowerCase().replace(/\.app$/, "");
  for (const id of Object.keys(appMeta) as AppId[]) {
    const m = appMeta[id];
    if (id === n || m.name.toLowerCase() === n || (n === "iterm" && id === "terminal")) return id;
  }
  return null;
}

async function open(args: string[], ctx: Ctx): Promise<ReactNode> {
  const { flags, rest } = parseFlags(args);
  if (!rest.length) return "usage: open <file|folder|app>   e.g. open ~/Documents/about-me.md, open -a Notes, open .";
  const target = rest.join(" ");
  if (flags.has("a")) {
    const id = findApp(target);
    if (!id) return err(`Unable to find application named '${target}'`);
    ctx.openApp(id);
    return null;
  }
  if (/^https?:\/\//.test(target)) {
    window.open(target, "_blank", "noopener,noreferrer");
    return null;
  }
  const path = resolve(ctx.cwd, target);
  const node = await statAsync(path);
  if (node) {
    ctx.openPath(path);
    return null;
  }
  const id = findApp(target);
  if (id) {
    ctx.openApp(id);
    return null;
  }
  return err(`The file ${path} does not exist.`);
}

function guard(fn: () => void, prefix: string): ReactNode {
  try {
    fn();
    return null;
  } catch (e) {
    return err(`${prefix}: ${e instanceof Error ? e.message : "failed"}`);
  }
}

async function mkdirCmd(args: string[], ctx: Ctx): Promise<ReactNode> {
  const { flags, rest } = parseFlags(args);
  if (!rest.length) return "usage: mkdir [-p] directory ...";
  const out: ReactNode[] = [];
  for (const a of rest) {
    const path = resolve(ctx.cwd, a);
    if (flags.has("p")) {
      const parts = path.split("/").filter(Boolean);
      let acc = "";
      for (const part of parts) {
        acc += "/" + part;
        const n = stat(acc);
        if (n && n.type === "dir") continue;
        const r = guard(() => mkdir(acc), "mkdir");
        if (r) {
          out.push(<div key={a}>{r}</div>);
          break;
        }
      }
    } else {
      const r = guard(() => mkdir(path), "mkdir");
      if (r) out.push(<div key={a}>{r}</div>);
    }
  }
  return out.length ? out : null;
}

function touchCmd(args: string[], ctx: Ctx): ReactNode {
  if (!args.length) return "usage: touch file ...";
  const out = args.map((a) => guard(() => touch(resolve(ctx.cwd, a)), "touch")).filter(Boolean);
  return out.length ? out.map((o, i) => <div key={i}>{o}</div>) : null;
}

async function rm(args: string[], ctx: Ctx): Promise<ReactNode> {
  const { flags, rest } = parseFlags(args);
  if (!rest.length) return "usage: rm [-r] file ...   (moves things to the Trash — this is a friendly shell)";
  const out: ReactNode[] = [];
  for (const a of rest) {
    const path = resolve(ctx.cwd, a);
    const node = await statAsync(path);
    if (!node) {
      if (!flags.has("f")) out.push(<div key={a}>rm: {a}: No such file or directory</div>);
      continue;
    }
    if (node.type === "dir" && !flags.has("r") && !flags.has("R")) {
      out.push(<div key={a}>rm: {a}: is a directory</div>);
      continue;
    }
    if (path === "/" || path === HOME) {
      out.push(<div key={a}>rm: nice try 😅 — {displayPath(path)} stays.</div>);
      continue;
    }
    const r = guard(() => trash(path), "rm");
    if (r) out.push(<div key={a}>{r}</div>);
  }
  return out.length ? out : null;
}

async function tree(args: string[], ctx: Ctx): Promise<ReactNode> {
  const root = resolve(ctx.cwd, args[0] ?? ".");
  const node = await statAsync(root);
  if (!node || node.type !== "dir") return err(`tree: ${args[0] ?? "."}: not a directory`);
  const lines: ReactNode[] = [<div key="root" className="font-bold text-sky-400">{args[0] ?? "."}</div>];
  let dirs = 0;
  let files = 0;
  const walk = async (dir: string, prefix: string, depth: number) => {
    const res = await listAsync(dir);
    const kids = res.nodes.filter((n) => !n.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name));
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      const last = i === kids.length - 1;
      lines.push(
        <div key={k.path}>
          {prefix}
          {last ? "└── " : "├── "}
          <span className={nameClass(k)}>{k.name}</span>
        </div>,
      );
      if (k.type === "dir") {
        dirs++;
        // shallow: two levels locally, one level inside GitHub repos
        const maxDepth = k.remote ? 0 : 1;
        if (depth < maxDepth) await walk(k.path, prefix + (last ? "    " : "│   "), depth + 1);
      } else files++;
    }
  };
  await walk(root, "", 0);
  lines.push(
    <div key="sum" className="mt-1">
      {dirs} directories, {files} files
    </div>,
  );
  return lines;
}

function formatUptime(): string {
  const mins = Math.floor((Date.now() - BOOT) / 60_000);
  if (mins < 1) return "less than a minute";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"}`;
  const h = Math.floor(mins / 60);
  return `${h}:${String(mins % 60).padStart(2, "0")}`;
}

const APPLE = String.raw`                    'c.
                 ,xNMM.
               .OMMMMo
               OMMM0,
     .;loddo:' loolloddol;.
   cKMMMMMMMMMMNWMMMMMMMMMM0:
 .KMMMMMMMMMMMMMMMMMMMMMMMWd.
 XMMMMMMMMMMMMMMMMMMMMMMMX.
;MMMMMMMMMMMMMMMMMMMMMMMM:
:MMMMMMMMMMMMMMMMMMMMMMMM:
.MMMMMMMMMMMMMMMMMMMMMMMMX.
 kMMMMMMMMMMMMMMMMMMMMMMMMWd.
 .XMMMMMMMMMMMMMMMMMMMMMMMMMMk
  .XMMMMMMMMMMMMMMMMMMMMMMMMK.
    kMMMMMMMMMMMMMMMMMMMMMMd
     ;KMMMMMMMWXXWMMMMMMMk.
       .cooc,.    .,coo:.`;

const APPLE_COLORS = ["text-emerald-400", "text-emerald-400", "text-emerald-400", "text-emerald-400", "text-yellow-300", "text-yellow-300", "text-orange-400", "text-orange-400", "text-red-400", "text-red-400", "text-red-400", "text-fuchsia-400", "text-fuchsia-400", "text-fuchsia-400", "text-sky-400", "text-sky-400", "text-sky-400"];

function neofetch(): ReactNode {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const res = typeof window !== "undefined" ? `${window.screen.width}x${window.screen.height}` : "unknown";
  const current = profile.experience.find((j) => j.current);
  const info: [string, string][] = [
    ["OS", "macOS (in your browser)"],
    ["Host", `${profile.name}'s portfolio`],
    ["Kernel", "Next.js 16 · React 19"],
    ["Uptime", formatUptime()],
    ["Shell", "zsh (lovingly faked)"],
    ["Resolution", res],
    ["Theme", dark ? "Dark" : "Light"],
    ["Terminal", "Terminal.app"],
    ["CPU", "Caffeine-powered"],
    ["Role", current ? `SDE @ ${current.company}` : profile.currentRole],
    ["Location", profile.location],
    ["Languages", (profile.skills.Languages ?? []).slice(0, 4).join(", ")],
    ["Backend", (profile.skills.Backend ?? []).slice(0, 3).join(", ")],
  ];
  const lines = APPLE.split("\n");
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <pre className="leading-tight">
        {lines.map((l, i) => (
          <div key={i} className={APPLE_COLORS[i] ?? "text-sky-400"}>
            {l || " "}
          </div>
        ))}
      </pre>
      <div className="leading-snug">
        <div>
          <span className="font-bold text-emerald-400">{profile.handle}</span>@<span className="font-bold text-emerald-400">{HOSTNAME}</span>
        </div>
        <div>{"-".repeat(profile.handle.length + HOSTNAME.length + 1)}</div>
        {info.map(([k, v]) => (
          <div key={k}>
            <span className="font-bold text-amber-300">{k}</span>: {v}
          </div>
        ))}
        <div className="mt-2 flex">
          {["bg-neutral-800", "bg-red-500", "bg-emerald-500", "bg-yellow-400", "bg-sky-500", "bg-fuchsia-500", "bg-cyan-400", "bg-neutral-200"].map((c) => (
            <span key={c} className={`inline-block h-3.5 w-6 ${c}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export const commands: Record<string, Command> = {
  help: {
    help: "list available commands",
    run: () => (
      <div className="grid grid-cols-[100px_1fr] gap-x-3">
        {Object.entries(commands)
          .filter(([, c]) => !c.hidden)
          .map(([name, c]) => (
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
            <span className="text-sky-400">{job.company}</span> · {r.title} <span className="text-neutral-500">({r.period})</span>
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
    help: "things I've built (opens ~/Projects)",
    run: (_, ctx) => {
      ctx.openPath(PROJECTS);
      return "opening ~/Projects in Finder…";
    },
  },
  contact: {
    help: "how to reach me",
    run: () => (
      <>
        <div>
          email     <a className="underline" href={`mailto:${profile.email}`}>{profile.email}</a>
        </div>
        <div>
          github    <a className="underline" href={profile.links.github} target="_blank" rel="noreferrer">{profile.links.github}</a>
        </div>
        <div>
          linkedin  <a className="underline" href={profile.links.linkedin} target="_blank" rel="noreferrer">{profile.links.linkedin}</a>
        </div>
      </>
    ),
  },
  ls: { help: "list files  (ls -la, ls ~/Projects)", run: ls },
  cd: { help: "change directory", run: cd },
  pwd: { help: "print working directory", run: (_, ctx) => ctx.cwd },
  cat: { help: "print a file", run: cat },
  open: { help: "open a file, folder or app  (open -a Notes, open .)", run: open },
  mkdir: { help: "make a directory", run: mkdirCmd },
  touch: { help: "create an empty file", run: touchCmd },
  rm: { help: "move to the Trash  (rm -r for folders)", run: rm },
  tree: { help: "show a (shallow) directory tree", run: tree },
  history: {
    help: "command history",
    run: (_, ctx) => ctx.history.map((h, i) => <div key={i}>{`${String(i + 1).padStart(5)}  ${h}`}</div>),
  },
  hostname: { help: "print the host name", run: () => HOSTNAME },
  uptime: {
    help: "how long this tab has been up",
    run: () => {
      const d = new Date();
      const t = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
      return `${t}  up ${formatUptime()}, 1 user, load averages: 0.42 0.37 0.31`;
    },
  },
  neofetch: { help: "system info, but make it pretty", run: neofetch },
  sudo: {
    help: "try it",
    run: (args) =>
      args.join(" ") === "hire sarthak"
        ? `[sudo] permission granted ✅ — drop a line at ${profile.email}`
        : "nice try. (hint: sudo hire sarthak)",
  },
  date: { help: "current date", run: () => new Date().toString() },
  echo: { help: "print text", run: (args) => args.join(" ") },
  whatis: {
    help: "describe a command",
    hidden: true,
    run: (args) => (args[0] && commands[args[0]] ? `${args[0]} - ${commands[args[0]].help}` : `${args[0] ?? ""}: nothing appropriate`),
  },
  clear: { help: "clear the screen", run: () => null },
  exit: {
    help: "close this window",
    run: (_, ctx) => {
      ctx.close();
      return null;
    },
  },
};
