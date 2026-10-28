"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Eye, Lock, LoaderCircle, Minus, Pencil, Plus, Search, TriangleAlert, X } from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { useWindows } from "@/components/desktop/WindowManager";
import {
  basename,
  createFile,
  DOCUMENTS,
  dirname,
  ensureText,
  EXPERIENCE_PATH,
  extOf,
  getText,
  GITHUB_USER,
  HOME,
  PROJECTS,
  readText,
  resolve,
  retry,
  stat,
  uniqueName,
  useVfsVersion,
  writeText,
} from "@/lib/vfs";
import { ExperienceDoc } from "./ExperienceDoc";
import { Markdown } from "./Markdown";

const CODE_EXT = new Set([
  "java", "kt", "ts", "tsx", "js", "jsx", "mjs", "py", "go", "rs", "c", "h", "cpp", "cc", "hpp", "cs", "rb", "php",
  "swift", "sh", "zsh", "bash", "sql", "html", "css", "scss", "xml", "yml", "yaml", "toml", "gradle", "json", "properties",
]);
const SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];
const isMd = (name: string) => ["md", "markdown", "mdx"].includes(extOf(name));

/** Keep the window title in sync without dispatch loops. */
function useWindowTitle(windowId: string, title: string, path: string | null) {
  const { state, setTitle, setMetadata } = useWindows();
  const win = state.windows[windowId];
  useEffect(() => {
    if (!win) return;
    if (win.title !== title) setTitle(windowId, title);
    if (path && win.metadata.path !== path) setMetadata(windowId, { path });
  }, [win, title, path, windowId, setTitle, setMetadata]);
}

export function TextEditApp({ windowId, metadata, mobile }: AppProps) {
  const [initialPath] = useState(() => (typeof metadata.path === "string" && metadata.path ? resolve(HOME, metadata.path) : null));
  useVfsVersion();
  const node = initialPath ? stat(initialPath) : null;

  if (initialPath && (initialPath === EXPERIENCE_PATH || node?.special === "experience")) {
    return <ExperienceView windowId={windowId} mobile={mobile} />;
  }
  // GitHub files, protected files, Trash items and missing paths are read-only.
  const editable = !initialPath || (node != null && node.type === "file" && !node.remote && !node.readOnly && readText(initialPath) != null);
  if (!editable) return <ReadOnlyView windowId={windowId} path={initialPath!} mobile={mobile} />;
  return <Editor windowId={windowId} initialPath={initialPath} mobile={mobile} />;
}

// ------------------------------------------------------------------ shared UI

function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-black/10 bg-neutral-50/80 px-2 text-[12px] text-neutral-600 dark:border-white/10 dark:bg-neutral-900/60 dark:text-neutral-300">
      {children}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, active, children }: { label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-1.5 py-1 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10 ${active ? "bg-black/10 dark:bg-white/15" : ""}`}
    >
      {children}
    </button>
  );
}

function Zoom({ size, setSize }: { size: number; setSize: (n: number) => void }) {
  const i = SIZES.indexOf(size);
  return (
    <div className="flex items-center">
      <IconBtn label="Smaller" disabled={i <= 0} onClick={() => setSize(SIZES[Math.max(0, i - 1)])}>
        <Minus size={13} />
      </IconBtn>
      <span className="w-9 text-center tabular-nums">{size}pt</span>
      <IconBtn label="Bigger" disabled={i >= SIZES.length - 1} onClick={() => setSize(SIZES[Math.min(SIZES.length - 1, i + 1)])}>
        <Plus size={13} />
      </IconBtn>
    </div>
  );
}

const zoomBy = (size: number, dir: 1 | -1) => {
  const i = SIZES.indexOf(size);
  return SIZES[Math.min(Math.max(i + dir, 0), SIZES.length - 1)];
};

function ReadOnlyBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-white/10 dark:text-neutral-400">
      <Lock size={10} /> Read only
    </span>
  );
}

function counts(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return `${words.toLocaleString()} ${words === 1 ? "word" : "words"} · ${text.length.toLocaleString()} chars`;
}

/** ⌘F find bar operating on a textarea: Enter / ⌘G selects the next match. */
function FindBar({
  query,
  setQuery,
  text,
  onFind,
  onClose,
}: {
  query: string;
  setQuery: (q: string) => void;
  text: string;
  onFind: (dir: 1 | -1) => void;
  onClose: () => void;
}) {
  const matches = query ? text.toLowerCase().split(query.toLowerCase()).length - 1 : 0;
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-black/10 bg-neutral-100/80 px-2 text-[12px] dark:border-white/10 dark:bg-neutral-800/60">
      <label className="flex flex-1 items-center gap-1 rounded-md bg-white px-1.5 py-0.5 ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10">
        <Search size={12} className="text-neutral-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onFind(e.shiftKey ? -1 : 1);
            }
            if (e.key === "Escape") onClose();
          }}
          placeholder="Find"
          aria-label="Find"
          className="min-w-0 flex-1 bg-transparent outline-none"
        />
      </label>
      <span className="w-20 shrink-0 text-neutral-500">{query ? `${matches} found` : ""}</span>
      <button type="button" onClick={() => onFind(-1)} className="rounded px-1.5 hover:bg-black/5 dark:hover:bg-white/10" disabled={!matches}>
        ‹
      </button>
      <button type="button" onClick={() => onFind(1)} className="rounded px-1.5 hover:bg-black/5 dark:hover:bg-white/10" disabled={!matches}>
        ›
      </button>
      <button type="button" aria-label="Close find" onClick={onClose} className="rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10">
        <X size={13} />
      </button>
    </div>
  );
}

function findIn(el: HTMLTextAreaElement | null, text: string, query: string, dir: 1 | -1) {
  if (!el || !query) return;
  const hay = text.toLowerCase();
  const q = query.toLowerCase();
  let i = dir === 1 ? hay.indexOf(q, el.selectionEnd) : hay.lastIndexOf(q, Math.max(0, el.selectionStart - 1));
  if (i < 0) i = dir === 1 ? hay.indexOf(q) : hay.lastIndexOf(q);
  if (i < 0) return;
  el.focus();
  el.setSelectionRange(i, i + q.length);
  // scroll the match into view
  const line = text.slice(0, i).split("\n").length;
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 18;
  el.scrollTop = Math.max(0, (line - 3) * lh);
}

const textareaClass =
  "min-h-0 w-full flex-1 resize-none bg-white p-4 leading-relaxed text-neutral-900 outline-none selection:bg-sky-500/30 dark:bg-neutral-900 dark:text-neutral-100";

// ------------------------------------------------------------------ editor

function Editor({ windowId, initialPath, mobile }: { windowId: string; initialPath: string | null; mobile?: boolean }) {
  const [path, setPath] = useState(initialPath);
  const [text, setText] = useState(() => (initialPath ? (readText(initialPath) ?? "") : ""));
  const [saved, setSaved] = useState(text);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState(mobile ? 14 : 13);
  const [preview, setPreview] = useState(false);
  const [find, setFind] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const name = path ? basename(path) : "Untitled";
  const dirty = text !== saved;
  const mono = CODE_EXT.has(extOf(name));
  const md = isMd(name);

  useWindowTitle(windowId, dirty ? `${name} — Edited` : name, path);

  // Flush pending edits if the window closes mid-debounce.
  const pending = useRef<{ path: string | null; text: string } | null>(null);
  useEffect(() => {
    return () => {
      clearTimeout(timer.current);
      const p = pending.current;
      if (p?.path) {
        try {
          writeText(p.path, p.text);
        } catch {}
      }
    };
  }, []);

  function save(value: string) {
    clearTimeout(timer.current);
    pending.current = null;
    try {
      let target = path;
      if (!target) {
        // first edit of an untitled document → ~/Documents/Untitled.txt
        target = `${DOCUMENTS}/${uniqueName(DOCUMENTS, "Untitled.txt")}`;
        createFile(target, value);
        setPath(target);
      } else {
        writeText(target, value);
      }
      setSaved(value);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  function onChange(value: string) {
    setText(value);
    clearTimeout(timer.current);
    if (path) pending.current = { path, text: value };
    timer.current = setTimeout(() => save(value), 600);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === "s") {
      e.preventDefault();
      save(text);
    } else if (e.key === "f") {
      e.preventDefault();
      setFind((f) => f ?? "");
    } else if (e.key === "g" && find) {
      e.preventDefault();
      findIn(areaRef.current, text, find, e.shiftKey ? -1 : 1);
    } else if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      setSize((s) => zoomBy(s, 1));
    } else if (e.key === "-") {
      e.preventDefault();
      setSize((s) => zoomBy(s, -1));
    }
  }

  return (
    <div className="flex h-full flex-col bg-white text-[13px] dark:bg-neutral-900" onKeyDown={onKeyDown}>
      <Toolbar>
        <Zoom size={size} setSize={setSize} />
        <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
        <IconBtn label="Find (⌘F)" active={find != null} onClick={() => setFind((f) => (f == null ? "" : null))}>
          <Search size={13} />
        </IconBtn>
        {md && (
          <IconBtn label={preview ? "Edit" : "Preview Markdown"} active={preview} onClick={() => setPreview((p) => !p)}>
            {preview ? <Pencil size={13} /> : <Eye size={13} />}
            {!mobile && <span>{preview ? "Edit" : "Preview"}</span>}
          </IconBtn>
        )}
        <span className="ml-auto truncate text-neutral-400">{error ? <span className="text-red-500">{error}</span> : dirty ? "Editing…" : path ? "Saved" : "New document"}</span>
      </Toolbar>
      {find != null && !preview && (
        <FindBar query={find} setQuery={setFind} text={text} onFind={(d) => findIn(areaRef.current, text, find, d)} onClose={() => setFind(null)} />
      )}
      {preview ? (
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4 text-neutral-900 dark:text-neutral-100" style={{ fontSize: size + 1 }}>
          <Markdown text={text} />
        </div>
      ) : (
        <textarea
          ref={areaRef}
          autoFocus={!mobile}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => dirty && save(text)}
          spellCheck={!mono}
          placeholder={path ? "" : "Start typing — it's saved to ~/Documents automatically."}
          aria-label={name}
          style={{ fontSize: size }}
          className={`${textareaClass} ${mono ? "font-mono" : ""}`}
        />
      )}
      <StatusBar>{counts(text)}</StatusBar>
    </div>
  );
}

function StatusBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-6 shrink-0 items-center justify-end border-t border-black/5 bg-neutral-50/80 px-3 text-[11px] text-neutral-500 dark:border-white/5 dark:bg-neutral-900/60">
      {children}
    </div>
  );
}

// ------------------------------------------------------------------ read-only (GitHub / protected files)

/** raw.githubusercontent.com folder URL for a file under ~/Projects/<repo>/… (for README images). */
function rawBase(path: string): string | undefined {
  if (!path.startsWith(PROJECTS + "/")) return undefined;
  const rel = path.slice(PROJECTS.length + 1);
  const [repo, ...rest] = rel.split("/");
  const dir = rest.slice(0, -1).join("/");
  return `https://raw.githubusercontent.com/${GITHUB_USER}/${repo}/HEAD/${dir ? dir + "/" : ""}`;
}

function ReadOnlyView({ windowId, path, mobile }: { windowId: string; path: string; mobile?: boolean }) {
  useVfsVersion();
  const name = basename(path);
  const node = stat(path);
  const md = isMd(name);
  const mono = CODE_EXT.has(extOf(name));
  const [preview, setPreview] = useState(md);
  const [size, setSize] = useState(mobile ? 14 : 13);
  const [find, setFind] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  useWindowTitle(windowId, name, path);

  useEffect(() => {
    void ensureText(path);
  }, [path]);

  const s = getText(path);
  const text = s.status === "ok" ? s.text : "";

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!(e.metaKey || e.ctrlKey)) return;
    if (e.key === "f") {
      e.preventDefault();
      setPreview(false);
      setFind((f) => f ?? "");
    } else if (e.key === "g" && find) {
      e.preventDefault();
      findIn(areaRef.current, text, find, e.shiftKey ? -1 : 1);
    } else if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      setSize((v) => zoomBy(v, 1));
    } else if (e.key === "-") {
      e.preventDefault();
      setSize((v) => zoomBy(v, -1));
    }
  }

  return (
    <div className="flex h-full flex-col bg-white text-[13px] dark:bg-neutral-900" onKeyDown={onKeyDown}>
      <Toolbar>
        <Zoom size={size} setSize={setSize} />
        <div className="h-4 w-px bg-black/10 dark:bg-white/10" />
        <IconBtn label="Find (⌘F)" active={find != null} disabled={preview} onClick={() => setFind((f) => (f == null ? "" : null))}>
          <Search size={13} />
        </IconBtn>
        {md && (
          <IconBtn label={preview ? "Show source" : "Preview Markdown"} active={preview} onClick={() => setPreview((p) => !p)}>
            <Eye size={13} />
            {!mobile && <span>{preview ? "Source" : "Preview"}</span>}
          </IconBtn>
        )}
        <span className="ml-auto flex items-center gap-2">
          {node?.url && (
            <a href={node.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline dark:text-sky-400">
              {node.remote ? "GitHub ↗" : "Link ↗"}
            </a>
          )}
          <ReadOnlyBadge />
        </span>
      </Toolbar>
      {find != null && !preview && (
        <FindBar query={find} setQuery={setFind} text={text} onFind={(d) => findIn(areaRef.current, text, find, d)} onClose={() => setFind(null)} />
      )}
      {s.status === "loading" ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-neutral-400">
          <LoaderCircle size={16} className="animate-spin" /> Loading from GitHub…
        </div>
      ) : s.status === "error" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-neutral-500">
          <TriangleAlert size={28} className="text-amber-500" />
          <p className="max-w-sm">{s.error}</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => void retry(dirname(path)).then(() => ensureText(path))} className="text-sky-600 hover:underline dark:text-sky-400">
              Try again
            </button>
            {node?.url && (
              <a href={node.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline dark:text-sky-400">
                Open on GitHub ↗
              </a>
            )}
          </div>
        </div>
      ) : preview ? (
        <div className="min-h-0 flex-1 overflow-auto px-6 py-4 text-neutral-900 dark:text-neutral-100" style={{ fontSize: size + 1 }}>
          <Markdown text={text} baseUrl={node?.remote ? rawBase(path) : undefined} />
        </div>
      ) : (
        <textarea
          ref={areaRef}
          readOnly
          value={text}
          spellCheck={false}
          aria-label={name}
          style={{ fontSize: size }}
          className={`${textareaClass} ${mono || node?.remote ? "font-mono" : ""}`}
        />
      )}
      <StatusBar>{s.status === "ok" ? counts(text) : ""}</StatusBar>
    </div>
  );
}

// ------------------------------------------------------------------ experience.rtf

function ExperienceView({ windowId, mobile }: { windowId: string; mobile?: boolean }) {
  const [zoom, setZoom] = useState(13);
  useWindowTitle(windowId, "experience.rtf", EXPERIENCE_PATH);
  return (
    <div className="flex h-full flex-col bg-white text-[13px] text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <Toolbar>
        <Zoom size={zoom} setSize={setZoom} />
        <span className="ml-auto">
          <ReadOnlyBadge />
        </span>
      </Toolbar>
      <div className="min-h-0 flex-1 overflow-auto">
        <div style={{ zoom: zoom / 13 }} className={mobile ? "[&>div]:px-4" : ""}>
          <ExperienceDoc />
        </div>
      </div>
    </div>
  );
}
