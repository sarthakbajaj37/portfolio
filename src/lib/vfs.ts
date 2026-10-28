// A tiny virtual file system for the desktop: a static tree generated from
// profile/projects data, a localStorage overlay for user files, and lazily
// fetched public GitHub repos under ~/Projects. Everything is client-side.

import { useSyncExternalStore } from "react";
import { appMeta, appIconSrc } from "@/components/desktop/app-meta";
import type { AppId } from "@/components/desktop/types";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";

export const HOME = "/Users/sarthak";
export const DESKTOP = `${HOME}/Desktop`;
export const DOCUMENTS = `${HOME}/Documents`;
export const DOWNLOADS = `${HOME}/Downloads`;
export const PICTURES = `${HOME}/Pictures`;
export const PROJECTS = `${HOME}/Projects`;
export const TRASH = `${HOME}/.Trash`;
export const APPLICATIONS = "/Applications";
export const EXPERIENCE_PATH = `${DESKTOP}/experience.rtf`;

export const GITHUB_USER = "sarthakbajaj37";

/** "text" opens in TextEdit, "image"/"pdf" in Preview. */
export type FileClass = "text" | "image" | "pdf" | "binary";

export type VNode = {
  path: string;
  name: string;
  type: "dir" | "file" | "app";
  /** Finder "Kind" column, e.g. "Folder", "Markdown Document" */
  kind: string;
  size?: number;
  modified?: number;
  /** app bundles in /Applications */
  appId?: AppId;
  /** image/pdf URL (public path or GitHub raw URL) */
  src?: string;
  /** icon image (apps) or thumbnail (pictures) */
  icon?: string;
  /** external page, e.g. the repo on github.com */
  url?: string;
  description?: string;
  language?: string;
  readOnly?: boolean;
  /** can't be trashed/renamed (system folders, apps, remote files) */
  protected?: boolean;
  /** lives on GitHub */
  remote?: boolean;
  /** a GitHub repo root */
  repo?: boolean;
  /** created by the visitor (overlay) */
  user?: boolean;
  /** item in ~/.Trash: where it came from */
  trashedFrom?: string;
  special?: "experience";
};

export type ListResult = { nodes: VNode[]; loading: boolean; error?: string };

// ---------------------------------------------------------------- paths

export function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}

/** Resolve user input against a cwd. Handles ~, ~/x, absolute, ., .. */
export function resolve(cwd: string, input: string): string {
  const s = input.trim();
  if (!s || s === "~") return HOME;
  if (s.startsWith("~/")) return normalize(HOME + s.slice(1));
  if (s.startsWith("/")) return normalize(s);
  return normalize(`${cwd}/${s}`);
}

export function dirname(path: string): string {
  const i = path.lastIndexOf("/");
  return i <= 0 ? "/" : path.slice(0, i);
}

export function basename(path: string): string {
  if (path === "/") return "Macintosh HD";
  return path.slice(path.lastIndexOf("/") + 1);
}

/** /Users/sarthak/Documents → ~/Documents */
export function displayPath(path: string): string {
  if (path === HOME) return "~";
  if (path.startsWith(HOME + "/")) return "~" + path.slice(HOME.length);
  return path;
}

/** Human folder name like Finder shows (Trash instead of .Trash). */
export function displayName(path: string): string {
  if (path === TRASH) return "Trash";
  if (path === HOME) return "sarthak";
  return basename(path);
}

const isUnder = (path: string, root: string) => path === root || path.startsWith(root + "/");

// ---------------------------------------------------------------- file kinds

const EXT_LANG: Record<string, string> = {
  java: "Java", kt: "Kotlin", ts: "TypeScript", tsx: "TypeScript", js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript",
  py: "Python", go: "Go", rs: "Rust", c: "C", h: "C Header", cpp: "C++", cc: "C++", hpp: "C++ Header", cs: "C#",
  rb: "Ruby", php: "PHP", swift: "Swift", sh: "Shell Script", zsh: "Shell Script", bash: "Shell Script", sql: "SQL",
  html: "HTML", css: "CSS", scss: "Sass", xml: "XML", yml: "YAML", yaml: "YAML", toml: "TOML", gradle: "Gradle",
  properties: "Properties", env: "Environment", ini: "INI", csv: "CSV", lock: "Lockfile", conf: "Config",
};
const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "ico", "bmp", "avif"]);
const BINARY_EXT = new Set(["zip", "gz", "tar", "jar", "class", "exe", "dmg", "woff", "woff2", "ttf", "otf", "mp3", "mp4", "mov", "wav", "bin", "so", "dylib", "pyc"]);

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function fileClass(name: string): FileClass {
  const ext = extOf(name);
  if (IMAGE_EXT.has(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (BINARY_EXT.has(ext)) return "binary";
  return "text";
}

export function kindOf(name: string): string {
  const ext = extOf(name);
  if (ext === "md" || ext === "markdown") return "Markdown Document";
  if (ext === "txt") return "Plain Text";
  if (ext === "rtf") return "Rich Text Document";
  if (ext === "json") return "JSON";
  if (ext === "pdf") return "PDF Document";
  if (ext === "jpg" || ext === "jpeg") return "JPEG image";
  if (ext === "svg") return "SVG image";
  if (IMAGE_EXT.has(ext)) return `${ext.toUpperCase()} image`;
  if (EXT_LANG[ext]) return `${EXT_LANG[ext]} Source`;
  if (BINARY_EXT.has(ext)) return "Document";
  if (!ext) return "Plain Text";
  return "Document";
}

export function formatSize(bytes?: number): string {
  if (bytes == null) return "--";
  if (bytes < 1000) return `${bytes} bytes`;
  if (bytes < 1_000_000) return `${(bytes / 1000).toFixed(bytes < 10_000 ? 1 : 0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

const byteLength = (s: string) => new TextEncoder().encode(s).length;

// ---------------------------------------------------------------- static tree

// Fixed timestamps so server and client render the same thing.
const T0 = Date.UTC(2026, 9, 1, 9, 30);
const T_DESK = Date.UTC(2026, 9, 20, 18, 5);

type StaticEntry = VNode & { text?: string };
const staticNodes = new Map<string, StaticEntry>();
const staticChildren = new Map<string, string[]>();

function addStatic(node: Omit<StaticEntry, "name"> & { name?: string }) {
  const name = node.name ?? basename(node.path);
  const entry: StaticEntry = { ...node, name } as StaticEntry;
  if (entry.text != null && entry.size == null) entry.size = byteLength(entry.text);
  staticNodes.set(entry.path, entry);
  if (entry.path !== "/") {
    const parent = dirname(entry.path);
    const kids = staticChildren.get(parent) ?? [];
    kids.push(entry.path);
    staticChildren.set(parent, kids);
  }
}

const folder = (path: string, extra: Partial<VNode> = {}) =>
  addStatic({ path, type: "dir", kind: "Folder", modified: T0, protected: true, ...extra });
const textFile = (path: string, text: string, extra: Partial<VNode> = {}) =>
  addStatic({ path, type: "file", kind: kindOf(basename(path)), modified: T0, text, ...extra });

function buildStatic() {
  folder("/");
  folder(APPLICATIONS);
  folder("/Users");
  folder(HOME);
  folder(DESKTOP);
  folder(DOCUMENTS);
  folder(DOWNLOADS);
  folder(PICTURES);
  folder(PROJECTS);
  folder(TRASH, { name: ".Trash" });

  // Applications
  for (const id of Object.keys(appMeta) as AppId[]) {
    const m = appMeta[id];
    addStatic({
      path: `${APPLICATIONS}/${m.name}.app`,
      type: "app",
      kind: "Application",
      appId: id,
      icon: appIconSrc[id],
      modified: T0,
      protected: true,
      readOnly: true,
    });
  }

  // Desktop
  addStatic({
    path: EXPERIENCE_PATH,
    type: "file",
    kind: "Rich Text Document",
    modified: T_DESK,
    size: 4_200,
    readOnly: true,
    protected: true,
    special: "experience",
    text: experienceText(),
  });

  // Documents
  textFile(`${DOCUMENTS}/about-me.md`, aboutMd());
  textFile(`${DOCUMENTS}/skills.txt`, skillsTxt());
  textFile(`${DOCUMENTS}/now.md`, nowMd());
  textFile(`${DOCUMENTS}/contact.txt`, contactTxt());

  // Downloads
  textFile(
    `${DOWNLOADS}/definitely-not-a-virus.txt`,
    [
      "Congratulations! 🎉",
      "",
      "You opened a file called definitely-not-a-virus.txt.",
      "Good news: it's not a virus. Bad news: your curiosity is now logged",
      "(in your own browser's localStorage, which only you can see).",
      "",
      "While you're here — Sarthak is a backend engineer who likes",
      "systems that scale quietly. Say hi: " + profile.email,
    ].join("\n"),
  );
  textFile(
    `${DOWNLOADS}/HelloWorld.java`,
    [
      "public class HelloWorld {",
      "    public static void main(String[] args) {",
      '        System.out.println("Hello from ' + profile.location + '!");',
      "    }",
      "}",
      "",
    ].join("\n"),
  );
  textFile(
    `${DOWNLOADS}/coffee-order.json`,
    JSON.stringify({ drink: "filter coffee", size: "large", sugar: 0, shots: "as many as the deploy needs", status: "brewing" }, null, 2) + "\n",
  );

  // Pictures — the wallpapers
  const pics: [string, string][] = [
    ["sierra", "Sierra"], ["tahoe", "Tahoe"], ["sequoia", "Sequoia"], ["sonoma", "Sonoma"], ["mojave", "Mojave"],
    ["elcapitan", "El Capitan"], ["yosemite", "Yosemite"], ["mountain-lion", "Mountain Lion"], ["lion", "Lion"],
    ["snow-leopard", "Snow Leopard"], ["leopard-server", "Leopard Server"],
  ];
  for (const [id, name] of pics) {
    addStatic({
      path: `${PICTURES}/${name}.jpg`,
      type: "file",
      kind: "JPEG image",
      src: `/wallpapers/${id}-wallpaper.jpg`,
      icon: `/wallpapers/thumbnails/${id}-wallpaper-thumb.jpg`,
      modified: T0,
    });
  }

  // Local projects (projects.ts) as folders with a generated README
  for (const p of projects) {
    const dir = `${PROJECTS}/${p.name}`;
    folder(dir, { description: p.description, language: p.stack[0], url: p.github ?? p.live, protected: true, readOnly: true });
    const lines = [`# ${p.name}`, "", p.description, "", `**Stack:** ${p.stack.join(", ")}`];
    if (p.year) lines.push(`**Year:** ${p.year}`);
    if (p.github) lines.push("", `Source: ${p.github}`);
    if (p.live) lines.push(`Live: ${p.live}`);
    textFile(`${dir}/README.md`, lines.join("\n") + "\n", { readOnly: true, protected: true });
  }
}

function experienceText(): string {
  const out = [`${profile.name}`, `${profile.location} · ${profile.email}`, "", "EXPERIENCE", ""];
  for (const job of profile.experience) {
    out.push(`${job.company} — ${job.location}`);
    for (const r of job.roles) {
      out.push(`  ${r.title} (${r.period})`);
      for (const b of r.bullets) out.push(`    • ${b}`);
    }
    out.push("");
  }
  const e = profile.education;
  out.push("EDUCATION", `${e.school} — ${e.degree} (${e.detail}), ${e.period}`, "", "ACHIEVEMENTS");
  for (const a of profile.achievements) out.push(`  • ${a}`);
  return out.join("\n") + "\n";
}

function aboutMd(): string {
  return [
    `# ${profile.name}`,
    "",
    `> ${profile.headline}`,
    "",
    ...profile.about.flatMap((p) => [p, ""]),
    `- 📍 ${profile.location}`,
    `- 💼 ${profile.currentRole}`,
    `- 🐙 [GitHub](${profile.links.github})`,
    `- 💼 [LinkedIn](${profile.links.linkedin})`,
    `- ✉️ ${profile.email}`,
    "",
  ].join("\n");
}

function skillsTxt(): string {
  const width = Math.max(...Object.keys(profile.skills).map((k) => k.length)) + 2;
  return Object.entries(profile.skills)
    .map(([group, items]) => `${(group + ":").padEnd(width)}${items.join(", ")}`)
    .join("\n") + "\n";
}

function nowMd(): string {
  const current = profile.experience.find((j) => j.current) ?? profile.experience[0];
  const role = current?.roles[0];
  return [
    "# Now",
    "",
    "_What I'm up to these days._",
    "",
    `- 💼 ${role ? `${role.title} at ${current.company} (${role.period})` : profile.currentRole}`,
    `- 📍 Living in ${profile.location}`,
    `- 🛠️ Mostly writing ${profile.skills.Languages?.[0] ?? "code"} with ${profile.skills.Backend?.[0] ?? "good tools"}`,
    "- 🧪 Building side projects — they'll show up in ~/Projects",
    "- ☕ Probably refilling coffee",
    "",
  ].join("\n");
}

function contactTxt(): string {
  return [
    `email:    ${profile.email}`,
    `github:   ${profile.links.github}`,
    `linkedin: ${profile.links.linkedin}`,
    "",
  ].join("\n");
}

buildStatic();

// ---------------------------------------------------------------- store

type Overlay = {
  files: Record<string, { text: string; modified: number }>;
  dirs: Record<string, { modified: number }>;
  trash: { name: string; original: string; at: number }[];
  deleted: string[];
  recents: string[];
};

const STORAGE_KEY = "sb-vfs-v1";
let overlay: Overlay | null = null;
let version = 0;
const listeners = new Set<() => void>();

function emptyOverlay(): Overlay {
  return { files: {}, dirs: {}, trash: [], deleted: [], recents: [] };
}

function ov(): Overlay {
  if (overlay) return overlay;
  if (typeof window === "undefined") return emptyOverlay();
  overlay = emptyOverlay();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) overlay = { ...overlay, ...(JSON.parse(raw) as Partial<Overlay>) };
  } catch {}
  return overlay;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ov()));
  } catch {}
}

function emit() {
  version++;
  for (const l of listeners) l();
}

function commit() {
  persist();
  emit();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getVersion(): number {
  return version;
}

/** Re-render when anything in the VFS (overlay or GitHub cache) changes. */
export function useVfsVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}

// ---------------------------------------------------------------- GitHub

type GhRepo = {
  name: string;
  description: string | null;
  language: string | null;
  html_url: string;
  pushed_at: string;
  updated_at: string;
  size: number;
  stargazers_count: number;
  fork: boolean;
  default_branch: string;
};

type GhItem = {
  name: string;
  path: string;
  type: "file" | "dir" | "symlink" | "submodule";
  size: number;
  download_url: string | null;
  html_url: string;
};

type Remote<T> = { status: "loading" } | { status: "ok"; data: T } | { status: "error"; error: string };

let repos: Remote<GhRepo[]> | null = null;
const dirCache = new Map<string, Remote<GhItem[]>>(); // key: "repo/sub/path"
const textCache = new Map<string, Remote<string>>(); // key: abs path

class GitHubError extends Error {}

async function ghFetch<T>(url: string): Promise<T> {
  const cacheKey = `sb-gh:${url}`;
  try {
    const hit = sessionStorage.getItem(cacheKey);
    if (hit) return JSON.parse(hit) as T;
  } catch {}
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/vnd.github+json" } });
  } catch {
    throw new GitHubError("Couldn't reach GitHub — are you offline?");
  }
  if (!res.ok) {
    if ((res.status === 403 || res.status === 429) && res.headers.get("x-ratelimit-remaining") === "0") {
      const reset = Number(res.headers.get("x-ratelimit-reset")) * 1000;
      const mins = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 60_000)) : null;
      throw new GitHubError(
        `GitHub's rate limit (60 requests/hour) is used up${mins ? ` — try again in ~${mins} min` : ""}. Meanwhile, browse github.com/${GITHUB_USER}.`,
      );
    }
    if (res.status === 404) throw new GitHubError("Not found on GitHub.");
    throw new GitHubError(`GitHub returned an error (${res.status}).`);
  }
  const data = (await res.json()) as T;
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {}
  return data;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

function loadRepos(): Promise<void> {
  if (repos && repos.status !== "error") return Promise.resolve();
  repos = { status: "loading" };
  emit();
  return ghFetch<GhRepo[]>(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`)
    .then((data) => {
      repos = { status: "ok", data: Array.isArray(data) ? data : [] };
    })
    .catch((e) => {
      repos = { status: "error", error: errMsg(e) };
    })
    .finally(emit);
}

function loadRepoDir(key: string): Promise<void> {
  const cur = dirCache.get(key);
  if (cur && cur.status !== "error") return Promise.resolve();
  dirCache.set(key, { status: "loading" });
  emit();
  const [repo, ...rest] = key.split("/");
  const sub = rest.map(encodeURIComponent).join("/");
  return ghFetch<GhItem[] | GhItem>(`https://api.github.com/repos/${GITHUB_USER}/${encodeURIComponent(repo)}/contents/${sub}`)
    .then((data) => {
      dirCache.set(key, { status: "ok", data: Array.isArray(data) ? data : [] });
    })
    .catch((e) => {
      dirCache.set(key, { status: "error", error: errMsg(e) });
    })
    .finally(emit);
}

function repoByName(name: string): GhRepo | undefined {
  return repos?.status === "ok" ? repos.data.find((r) => r.name === name) : undefined;
}

/** For a path under ~/Projects/<repo>: { repo, sub } when <repo> isn't a local folder. */
function remoteParts(path: string): { repo: string; sub: string } | null {
  if (!path.startsWith(PROJECTS + "/")) return null;
  const rel = path.slice(PROJECTS.length + 1);
  const [repo, ...rest] = rel.split("/");
  const localRoot = `${PROJECTS}/${repo}`;
  if (staticNodes.has(localRoot) || ov().dirs[localRoot] || ov().files[localRoot]) return null;
  return { repo, sub: rest.join("/") };
}

function repoNode(r: GhRepo): VNode {
  return {
    path: `${PROJECTS}/${r.name}`,
    name: r.name,
    type: "dir",
    kind: "GitHub Repository",
    size: r.size * 1024,
    modified: Date.parse(r.pushed_at || r.updated_at),
    url: r.html_url,
    description: r.description ?? undefined,
    language: r.language ?? undefined,
    remote: true,
    repo: true,
    readOnly: true,
    protected: true,
  };
}

function itemNode(repo: GhRepo | undefined, repoName: string, it: GhItem): VNode {
  const isDir = it.type === "dir" || it.type === "submodule";
  const cls = fileClass(it.name);
  return {
    path: `${PROJECTS}/${repoName}/${it.path}`,
    name: it.name,
    type: isDir ? "dir" : "file",
    kind: isDir ? (it.type === "submodule" ? "Submodule" : "Folder") : kindOf(it.name),
    size: isDir ? undefined : it.size,
    modified: repo ? Date.parse(repo.pushed_at || repo.updated_at) : undefined,
    url: it.html_url,
    src: cls === "image" || cls === "pdf" ? (it.download_url ?? undefined) : undefined,
    remote: true,
    readOnly: true,
    protected: true,
  };
}

// ---------------------------------------------------------------- core lookup
//
// Trash model: trashing moves the visitor's overlay data (files/dirs) to
// ~/.Trash/<name>/…, and records { name, original } so static nodes under
// `original` are hidden and "Put Back" knows where to go. Static nodes stay
// where they are (hidden) and are shown inside the Trash via the mapping.

type TrashEntry = Overlay["trash"][number];

/** Static nodes under a trashed/deleted original are hidden. */
function staticHidden(path: string): boolean {
  const o = ov();
  return o.trash.some((t) => isUnder(path, t.original)) || o.deleted.some((d) => isUnder(path, d));
}

/** ~/.Trash/<name>/rest → { entry, original/rest } */
function fromTrash(path: string): { original: string; entry: TrashEntry } | null {
  if (!path.startsWith(TRASH + "/")) return null;
  const rel = path.slice(TRASH.length + 1);
  const [name, ...rest] = rel.split("/");
  const entry = ov().trash.find((t) => t.name === name);
  if (!entry) return null;
  return { original: rest.length ? `${entry.original}/${rest.join("/")}` : entry.original, entry };
}

function stripText(e: StaticEntry): VNode {
  const { text: _text, ...rest } = e;
  void _text;
  return rest;
}

/**
 * Lookup by overlay key `path`, falling back to the static node at `staticPath`
 * (which differs from `path` inside the Trash). Static hiding is the caller's job.
 */
function rawStat(path: string, staticPath: string | null = path): VNode | null {
  const o = ov();
  const userFile = o.files[path];
  const st = staticPath ? staticNodes.get(staticPath) : undefined;
  if (userFile) {
    const base: VNode = st && st.type === "file"
      ? { ...stripText(st), path, name: basename(path) }
      : { path, name: basename(path), type: "file", kind: kindOf(basename(path)), user: true };
    return { ...base, size: byteLength(userFile.text), modified: userFile.modified };
  }
  const userDir = o.dirs[path];
  if (userDir) return { path, name: basename(path), type: "dir", kind: "Folder", modified: userDir.modified, user: true };
  if (st) return { ...stripText(st), path, name: basename(path) };

  const rp = remoteParts(path);
  if (rp) {
    const repo = repoByName(rp.repo);
    if (!repo) return null;
    if (!rp.sub) return repoNode(repo);
    const it = rawGhItem(path);
    return it ? itemNode(repo, rp.repo, it) : null;
  }
  return null;
}

/** Look up a node (local, or GitHub if its listing is already cached). */
export function stat(path: string): VNode | null {
  const p = normalize(path);
  const t = fromTrash(p);
  if (t) {
    const n = rawStat(p, staticDeleted(t.original) ? null : t.original);
    if (!n) return null;
    const top = p === `${TRASH}/${t.entry.name}`;
    return { ...n, trashedFrom: top ? t.entry.original : undefined, protected: !top, readOnly: true };
  }
  if (isUnder(p, TRASH) && p !== TRASH) return null;
  return rawStat(p, staticHidden(p) ? null : p);
}

/** Inside the Trash, a static node is visible unless it was permanently deleted. */
function staticDeleted(path: string): boolean {
  return ov().deleted.some((d) => isUnder(path, d));
}

export function exists(path: string): boolean {
  return stat(path) != null;
}

export function isDir(path: string): boolean {
  return stat(path)?.type === "dir";
}

/** Children names of overlay keys and (optionally) a static dir. */
function childPaths(dir: string, staticDir: string | null): { overlayKeys: string[]; staticKeys: string[] } {
  const o = ov();
  const overlayKeys = [...Object.keys(o.dirs), ...Object.keys(o.files)].filter((k) => dirname(k) === dir);
  const staticKeys = staticDir ? (staticChildren.get(staticDir) ?? []) : [];
  return { overlayKeys, staticKeys };
}

/**
 * Synchronous listing from what's known right now. For GitHub folders call
 * `ensureLoaded(path)` (e.g. in an effect) and re-render on `useVfsVersion()`.
 */
export function list(path: string): ListResult {
  const p = normalize(path);
  const seen = new Set<string>();
  const nodes: VNode[] = [];
  const push = (n: VNode | null) => {
    if (n && !seen.has(n.path)) {
      seen.add(n.path);
      nodes.push(n);
    }
  };

  if (p === TRASH) {
    for (const t of ov().trash) push(stat(`${TRASH}/${t.name}`));
    return { nodes, loading: false };
  }

  const t = fromTrash(p);
  if (t) {
    const { overlayKeys, staticKeys } = childPaths(p, t.original);
    for (const k of overlayKeys) push(stat(k));
    for (const k of staticKeys) push(stat(p + k.slice(t.original.length)));
    return { nodes, loading: false };
  }

  const self = stat(p);
  if (self && self.type !== "dir") return { nodes: [], loading: false, error: "Not a folder." };
  if (!self && !remoteParts(p)) return { nodes: [], loading: false, error: "No such folder." };

  const { overlayKeys, staticKeys } = childPaths(p, staticHidden(p) ? null : p);
  for (const k of staticKeys) if (!staticHidden(k)) push(stat(k));
  for (const k of overlayKeys) push(stat(k));
  if (p === HOME) {
    // .Trash is shown via the sidebar, not in the home listing
    const i = nodes.findIndex((n) => n.path === TRASH);
    if (i >= 0) nodes.splice(i, 1);
  }

  let loading = false;
  let error: string | undefined;
  if (p === PROJECTS) {
    if (!repos || repos.status === "loading") loading = true;
    else if (repos.status === "error") error = repos.error;
    else for (const r of repos.data) if (!seen.has(`${PROJECTS}/${r.name}`)) push(repoNode(r));
  } else {
    const rp = remoteParts(p);
    if (rp) {
      if (!repos || repos.status === "loading") loading = true;
      else if (repos.status === "error") error = repos.error;
      else if (!repoByName(rp.repo)) error = "No such folder.";
      else {
        const repo = repoByName(rp.repo)!;
        const listing = dirCache.get(rp.sub ? `${rp.repo}/${rp.sub}` : rp.repo);
        if (!listing || listing.status === "loading") loading = true;
        else if (listing.status === "error") error = listing.error;
        else for (const it of listing.data) push(itemNode(repo, rp.repo, it));
      }
    }
  }
  return { nodes, loading, error };
}

/** Kick off any GitHub fetches needed to list/stat `path`. Safe to call repeatedly. */
export async function ensureLoaded(path: string): Promise<void> {
  const p = normalize(path);
  if (p !== PROJECTS && !remoteParts(p)) return;
  await loadRepos();
  if (p === PROJECTS) return;
  const rp = remoteParts(p);
  if (!rp || !repoByName(rp.repo)) return;
  // load every ancestor listing so stat() works for deep paths
  const parts = rp.sub ? rp.sub.split("/") : [];
  await loadRepoDir(rp.repo);
  for (let i = 1; i <= parts.length; i++) {
    const sub = parts.slice(0, i).join("/");
    const node = rawStat(`${PROJECTS}/${rp.repo}/${sub}`);
    if (!node || node.type !== "dir") break;
    await loadRepoDir(`${rp.repo}/${sub}`);
  }
}

/** Retry after a GitHub error (clears cached errors), then reload `path`. */
export function retry(path: string): Promise<void> {
  if (repos?.status === "error") repos = null;
  for (const [k, v] of dirCache) if (v.status === "error") dirCache.delete(k);
  for (const [k, v] of textCache) if (v.status === "error") textCache.delete(k);
  emit();
  return ensureLoaded(path);
}

export async function listAsync(path: string): Promise<ListResult> {
  await ensureLoaded(path);
  return list(path);
}

export async function statAsync(path: string): Promise<VNode | null> {
  const p = normalize(path);
  await ensureLoaded(p);
  return stat(p);
}

// ---------------------------------------------------------------- reading

/** Text of a local file (null for folders, remote or missing files). */
export function readText(path: string): string | null {
  const p = normalize(path);
  const node = stat(p);
  if (!node || node.type !== "file") return null;
  const user = ov().files[p];
  if (user) return user.text;
  const t = fromTrash(p);
  return staticNodes.get(t ? t.original : p)?.text ?? null;
}

export type TextState = { status: "loading" } | { status: "ok"; text: string } | { status: "error"; error: string };

/** Sync snapshot of a file's text (local or cached remote). Pair with ensureText(). */
export function getText(path: string): TextState {
  const local = readText(path);
  if (local != null) return { status: "ok", text: local };
  const p = normalize(path);
  const cached = textCache.get(p);
  if (cached) return cached.status === "ok" ? { status: "ok", text: cached.data } : cached;
  if (!remoteParts(p) || (repos?.status === "ok" && !repoByName(remoteParts(p)!.repo))) {
    return { status: "error", error: "File not found." };
  }
  return { status: "loading" };
}

const MAX_REMOTE_TEXT = 512 * 1024;

function rawGhItem(path: string): GhItem | undefined {
  const rp = remoteParts(path);
  if (!rp || !rp.sub) return undefined;
  const parentSub = rp.sub.includes("/") ? rp.sub.slice(0, rp.sub.lastIndexOf("/")) : "";
  const listing = dirCache.get(parentSub ? `${rp.repo}/${parentSub}` : rp.repo);
  return listing?.status === "ok" ? listing.data.find((i) => i.path === rp.sub) : undefined;
}

/** Fetch a GitHub file's text into the cache (no-op for local files). */
export async function ensureText(path: string): Promise<void> {
  const p = normalize(path);
  if (readText(p) != null || !remoteParts(p)) return;
  const cur = textCache.get(p);
  if (cur && cur.status !== "error") return;
  await ensureLoaded(dirname(p));
  const node = stat(p);
  const it = rawGhItem(p);
  const fail = (error: string) => {
    textCache.set(p, { status: "error", error });
    emit();
  };
  if (!node || !it) {
    const parentErr = list(dirname(p)).error;
    return fail(parentErr ?? (repos?.status === "error" ? repos.error : "File not found."));
  }
  if (node.type !== "file" || fileClass(node.name) !== "text") return fail("This isn't a text file.");
  if (it.size > MAX_REMOTE_TEXT || !it.download_url) return fail("This file is too large to show here — open it on GitHub.");
  textCache.set(p, { status: "loading" });
  emit();
  try {
    const res = await fetch(it.download_url);
    if (!res.ok) throw new Error(`GitHub returned an error (${res.status}).`);
    textCache.set(p, { status: "ok", data: await res.text() });
  } catch (e) {
    textCache.set(p, { status: "error", error: e instanceof TypeError ? "Couldn't reach GitHub — are you offline?" : errMsg(e) });
  }
  emit();
}

/** Read any text file, fetching from GitHub if needed. Throws with a friendly message. */
export async function readFile(path: string): Promise<string> {
  await ensureText(path);
  const s = getText(path);
  if (s.status === "ok") return s.text;
  if (s.status === "error") throw new Error(s.error);
  throw new Error("Still loading…");
}

// ---------------------------------------------------------------- writing

export class VfsError extends Error {}

/** Can the visitor create/edit things at this path? */
export function canWrite(path: string): boolean {
  const p = normalize(path);
  if (!p.startsWith(HOME + "/")) return false;
  if (isUnder(p, TRASH)) return false;
  const rp = remoteParts(p);
  if (rp && rp.sub && repoByName(rp.repo)) return false;
  if (staticNodes.get(p)?.readOnly) return false;
  if (staticNodes.get(dirname(p))?.readOnly) return false;
  return true;
}

function assertParent(path: string) {
  const parent = stat(dirname(path));
  if (!parent || parent.type !== "dir") throw new VfsError(`no such file or directory: ${displayPath(dirname(path))}`);
  if (!canWrite(path) || parent.remote) throw new VfsError(`permission denied: ${displayPath(path)}`);
}

function undelete(path: string) {
  const o = ov();
  o.deleted = o.deleted.filter((d) => !isUnder(d, path));
}

/** Create or overwrite a text file. */
export function writeText(path: string, text: string): void {
  const p = normalize(path);
  const cur = stat(p);
  if (cur && cur.type !== "file") throw new VfsError(`${displayPath(p)} is a directory`);
  if (cur && (cur.readOnly || !canWrite(p))) throw new VfsError(`${displayPath(p)} is read-only`);
  if (!cur) assertParent(p);
  undelete(p);
  ov().files[p] = { text, modified: Date.now() };
  commit();
}

/** Create a new empty (or seeded) file; throws if it already exists. */
export function createFile(path: string, text = ""): VNode {
  const p = normalize(path);
  if (stat(p)) throw new VfsError(`file exists: ${displayPath(p)}`);
  assertParent(p);
  undelete(p);
  ov().files[p] = { text, modified: Date.now() };
  commit();
  return stat(p)!;
}

/** touch: create if missing, else bump the modified time of a visitor file. */
export function touch(path: string): void {
  const p = normalize(path);
  if (!stat(p)) {
    createFile(p);
    return;
  }
  const f = ov().files[p];
  if (f) {
    f.modified = Date.now();
    commit();
  }
}

export function mkdir(path: string): VNode {
  const p = normalize(path);
  if (stat(p)) throw new VfsError(`file exists: ${displayPath(p)}`);
  assertParent(p);
  undelete(p);
  ov().dirs[p] = { modified: Date.now() };
  commit();
  return stat(p)!;
}

/** A non-clashing name in `dir`, e.g. "untitled folder 2". */
export function uniqueName(dir: string, base: string): string {
  const ext = extOf(base);
  const stem = ext ? base.slice(0, -(ext.length + 1)) : base;
  let name = base;
  for (let i = 2; stat(`${dir}/${name}`); i++) name = ext ? `${stem} ${i}.${ext}` : `${stem} ${i}`;
  return name;
}

/** Move overlay keys under `from` to `to`. */
function moveOverlay(from: string, to: string) {
  const o = ov();
  const move = <T>(rec: Record<string, T>) => {
    for (const k of Object.keys(rec)) {
      if (isUnder(k, from)) {
        const v = rec[k];
        delete rec[k];
        rec[to + k.slice(from.length)] = v;
      }
    }
  };
  move(o.files);
  move(o.dirs);
}

/** Can this node be renamed? (visitor-created items only) */
export function canRename(node: VNode | null): boolean {
  return !!node && !!node.user && !isUnder(node.path, TRASH);
}

/** Rename a visitor-created file/folder in place. Returns the new path. */
export function rename(path: string, newName: string): string {
  const p = normalize(path);
  const node = stat(p);
  const name = newName.trim();
  if (!node) throw new VfsError(`no such file: ${displayPath(p)}`);
  if (!canRename(node)) throw new VfsError(`“${node.name}” can't be renamed.`);
  if (!name || name.includes("/") || name === "." || name === "..") throw new VfsError("That name isn't valid.");
  const target = `${dirname(p)}/${name}`;
  if (target === p) return p;
  if (stat(target)) throw new VfsError(`The name “${name}” is already taken.`);
  moveOverlay(p, target);
  const o = ov();
  o.recents = o.recents.map((r) => (isUnder(r, p) ? target + r.slice(p.length) : r));
  commit();
  return target;
}

/** Can this node be moved to the Trash? */
export function canTrash(node: VNode | null): boolean {
  return !!node && !node.protected && !node.remote && node.type !== "app" && !isUnder(node.path, TRASH);
}

/** Move to ~/.Trash. Returns the path inside the Trash. */
export function trash(path: string): string {
  const p = normalize(path);
  const node = stat(p);
  if (!node) throw new VfsError(`no such file or directory: ${displayPath(p)}`);
  if (!canTrash(node)) throw new VfsError(`“${node.name}” can't be moved to the Trash.`);
  const o = ov();
  const used = new Set(o.trash.map((t) => t.name));
  const ext = node.type === "file" ? extOf(node.name) : "";
  const stem = ext ? node.name.slice(0, -(ext.length + 1)) : node.name;
  let name = node.name;
  for (let i = 2; used.has(name); i++) name = ext ? `${stem} ${i}.${ext}` : `${stem} ${i}`;
  const dest = `${TRASH}/${name}`;
  moveOverlay(p, dest);
  o.trash.push({ name, original: p, at: Date.now() });
  o.recents = o.recents.filter((r) => !isUnder(r, p));
  commit();
  return dest;
}

/** "Put Back" an item from the Trash. Returns the restored path. */
export function restore(trashPath: string): string {
  const p = normalize(trashPath);
  const t = fromTrash(p);
  if (!t || p !== `${TRASH}/${t.entry.name}`) throw new VfsError("Only top-level Trash items can be put back.");
  const o = ov();
  const original = t.entry.original;
  o.trash = o.trash.filter((x) => x !== t.entry);
  const parent = stat(dirname(original));
  const clash = stat(original);
  if (!parent || clash) {
    o.trash.push(t.entry);
    throw new VfsError(
      clash ? `An item named “${basename(original)}” already exists in ${displayName(dirname(original))}.` : "The original folder no longer exists.",
    );
  }
  moveOverlay(p, original);
  commit();
  return original;
}

/** Permanently delete one top-level Trash item, or everything. */
export function emptyTrash(trashPath?: string): void {
  const o = ov();
  const victims = trashPath ? o.trash.filter((t) => `${TRASH}/${t.name}` === normalize(trashPath)) : [...o.trash];
  for (const v of victims) {
    const at = `${TRASH}/${v.name}`;
    for (const k of Object.keys(o.files)) if (isUnder(k, at)) delete o.files[k];
    for (const k of Object.keys(o.dirs)) if (isUnder(k, at)) delete o.dirs[k];
    if ([...staticNodes.keys()].some((k) => isUnder(k, v.original))) o.deleted.push(v.original);
  }
  o.trash = o.trash.filter((t) => !victims.includes(t));
  commit();
}

export function trashCount(): number {
  return ov().trash.length;
}

// ---------------------------------------------------------------- recents

export function addRecent(path: string): void {
  const p = normalize(path);
  if (isUnder(p, TRASH)) return;
  const o = ov();
  if (o.recents[0] === p) return;
  o.recents = [p, ...o.recents.filter((r) => r !== p)].slice(0, 20);
  commit();
}

/** Recently opened files that still exist (remote ones only once their listing is cached). */
export function recents(): VNode[] {
  return ov()
    .recents.map((p) => stat(p))
    .filter((n): n is VNode => n != null && n.type === "file");
}

// ---------------------------------------------------------------- search

/** Case-insensitive name search below `root` over the local tree + cached GitHub listings. */
export function search(root: string, query: string, limit = 200): VNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: VNode[] = [];
  const walk = (dir: string, depth: number) => {
    if (out.length >= limit || depth > 8) return;
    for (const n of list(dir).nodes) {
      if (n.name.toLowerCase().includes(q)) out.push(n);
      if (out.length >= limit) return;
      if (n.type === "dir") walk(n.path, depth + 1);
    }
  };
  walk(normalize(root), 0);
  return out;
}

// ---------------------------------------------------------------- routing

export type OpenTarget =
  | { app: "finder"; path: string }
  | { app: "textedit"; path: string; name: string }
  | { app: "preview"; path: string; name: string; src?: string }
  | { app: "launch"; appId: AppId }
  | { app: "external"; url: string }
  | { app: "none"; reason: string };

/** Decide which app should open a node. */
export function openTarget(node: VNode): OpenTarget {
  if (node.type === "app" && node.appId) return { app: "launch", appId: node.appId };
  if (node.type === "dir") {
    if (node.kind === "Submodule" && node.url) return { app: "external", url: node.url };
    return { app: "finder", path: node.path };
  }
  const cls = fileClass(node.name);
  if (cls === "image") return { app: "preview", path: node.path, name: node.name, src: node.src };
  if (cls === "pdf") {
    if (node.remote) return node.url ? { app: "external", url: node.url } : { app: "none", reason: "Can't preview this PDF." };
    return { app: "preview", path: node.path, name: node.name, src: node.src };
  }
  if (cls === "binary") return node.url ? { app: "external", url: node.url } : { app: "none", reason: `“${node.name}” can't be opened.` };
  return { app: "textedit", path: node.path, name: node.name };
}
