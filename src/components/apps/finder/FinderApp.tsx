"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { format } from "date-fns";
import {
  AppWindow,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  FileText,
  FolderGit2,
  Image as ImageGlyph,
  LayoutGrid,
  List as ListGlyph,
  LoaderCircle,
  Monitor,
  RefreshCw,
  Search,
  Trash2,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { GithubIcon } from "@/components/BrandIcons";
import type { AppProps } from "@/components/desktop/types";
import { useWindows } from "@/components/desktop/WindowManager";
import { profile } from "@/data/profile";
import {
  APPLICATIONS,
  canRename,
  canTrash,
  canWrite,
  createFile,
  DESKTOP,
  displayName,
  displayPath,
  DOCUMENTS,
  DOWNLOADS,
  emptyTrash,
  ensureLoaded,
  formatSize,
  HOME,
  list,
  mkdir,
  normalize,
  PICTURES,
  PROJECTS,
  recents,
  rename,
  resolve,
  restore,
  retry,
  search,
  stat,
  trash,
  TRASH,
  uniqueName,
  useVfsVersion,
  type VNode,
} from "@/lib/vfs";
import { FileIcon } from "./FileIcon";
import { openNode } from "./useOpenPath";

const RECENTS = "recents:";

type SortKey = "name" | "modified" | "size" | "kind";
type Menu = { x: number; y: number; node: VNode | null };

const favourites: { path: string; label: string; Icon: LucideIcon }[] = [
  { path: RECENTS, label: "Recents", Icon: Clock },
  { path: APPLICATIONS, label: "Applications", Icon: AppWindow },
  { path: DESKTOP, label: "Desktop", Icon: Monitor },
  { path: DOCUMENTS, label: "Documents", Icon: FileText },
  { path: DOWNLOADS, label: "Downloads", Icon: Download },
  { path: PICTURES, label: "Pictures", Icon: ImageGlyph },
  { path: PROJECTS, label: "Projects", Icon: FolderGit2 },
];

function initialPath(meta: Record<string, unknown>): string {
  const raw = typeof meta.path === "string" ? meta.path : "";
  if (raw === RECENTS) return RECENTS;
  return raw ? resolve(HOME, raw) : DESKTOP;
}

const titleFor = (p: string) => (p === RECENTS ? "Recents" : displayName(p));

function kindLabel(n: VNode) {
  if (n.repo) return n.language ? `${n.language} repo` : "GitHub repo";
  return n.kind;
}

function compare(a: VNode, b: VNode, key: SortKey): number {
  switch (key) {
    case "modified":
      return (a.modified ?? 0) - (b.modified ?? 0);
    case "size":
      return (a.size ?? -1) - (b.size ?? -1);
    case "kind":
      return kindLabel(a).localeCompare(kindLabel(b)) || a.name.localeCompare(b.name, undefined, { numeric: true });
    default:
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  }
}

export function FinderApp({ windowId, metadata, mobile }: AppProps) {
  const { openApp, focus, state, setTitle, setMetadata } = useWindows();
  const version = useVfsVersion();
  const [nav, setNav] = useState(() => ({ stack: [initialPath(metadata)], index: 0 }));
  const path = nav.stack[nav.index];
  const [view, setView] = useState<"icons" | "list">(mobile ? "list" : "icons");
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "name", asc: true });
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<Menu | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Lazily fetch GitHub listings for the current folder.
  useEffect(() => {
    if (path !== RECENTS) void ensureLoaded(path);
  }, [path]);

  // Keep the window title + metadata in sync with the folder (guarded: no loops).
  const win = state.windows[windowId];
  const wantTitle = titleFor(path);
  useEffect(() => {
    if (!win) return;
    if (win.title !== wantTitle) setTitle(windowId, wantTitle);
    if (win.metadata.path !== path) setMetadata(windowId, { path });
  }, [win, wantTitle, path, windowId, setTitle, setMetadata]);

  // ------------------------------------------------------------ data
  void version; // listing below is recomputed on every VFS change
  const listing = path === RECENTS ? { nodes: recents(), loading: false, error: undefined } : list(path);
  const q = query.trim();
  const searching = q.length > 0;
  const raw = searching
    ? path === RECENTS
      ? listing.nodes.filter((n) => n.name.toLowerCase().includes(q.toLowerCase()))
      : search(path, q)
    : listing.nodes;
  const nodes = [...raw].sort((a, b) => (sort.asc ? 1 : -1) * compare(a, b, sort.key));
  const selectedNode = nodes.find((n) => n.path === selected) ?? null;
  const infoNode = info ? stat(info) : null;
  const inTrash = path === TRASH;

  // ------------------------------------------------------------ actions
  function flash(msg: string) {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }

  function navigate(p: string) {
    const target = p === RECENTS ? RECENTS : normalize(p);
    setMenu(null);
    setSelected(null);
    setQuery("");
    setRenaming(null);
    if (target === path) return;
    setNav((n) => ({ stack: [...n.stack.slice(0, n.index + 1), target], index: n.index + 1 }));
  }

  function go(delta: -1 | 1) {
    setNav((n) => ({ ...n, index: Math.min(Math.max(n.index + delta, 0), n.stack.length - 1) }));
    setSelected(null);
    setQuery("");
    setMenu(null);
  }

  function open(node: VNode) {
    setMenu(null);
    if (node.type === "dir" && node.kind !== "Submodule") {
      navigate(node.path);
      return;
    }
    const err = openNode(node, openApp, state.windows, focus);
    if (err) flash(err);
  }

  function attempt(fn: () => void) {
    try {
      fn();
    } catch (e) {
      flash(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  function moveToTrash(node: VNode) {
    setMenu(null);
    if (!canTrash(node)) {
      flash(`“${node.name}” can't be moved to the Trash.`);
      return;
    }
    attempt(() => {
      trash(node.path);
      setSelected(null);
    });
  }

  function newItem(kind: "folder" | "file") {
    setMenu(null);
    attempt(() => {
      const name = uniqueName(path, kind === "folder" ? "untitled folder" : "untitled.txt");
      const node = kind === "folder" ? mkdir(`${path}/${name}`) : createFile(`${path}/${name}`);
      setQuery("");
      setSelected(node.path);
      setRenaming(node.path);
    });
  }

  function commitRename(node: VNode, value: string) {
    setRenaming(null);
    if (value.trim() === node.name || !value.trim()) return;
    attempt(() => setSelected(rename(node.path, value)));
  }

  function openMenu(e: MouseEvent, node: VNode | null) {
    e.preventDefault();
    e.stopPropagation();
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSelected(node?.path ?? null);
    setMenu({
      x: Math.min(e.clientX - rect.left, rect.width - 190),
      y: Math.min(e.clientY - rect.top, rect.height - 200),
      node,
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "Escape") {
      setMenu(null);
      setInfo(null);
      return;
    }
    if (e.metaKey && e.key === "[") return go(-1);
    if (e.metaKey && e.key === "]") return go(1);
    if (e.metaKey && e.key === "ArrowUp" && path !== RECENTS && path !== "/") return navigate(path.slice(0, path.lastIndexOf("/")) || "/");
    if (!nodes.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const i = nodes.findIndex((n) => n.path === selected);
      const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
      const next = i < 0 ? 0 : Math.min(Math.max(i + step, 0), nodes.length - 1);
      setSelected(nodes[next].path);
      return;
    }
    if (!selectedNode) return;
    if (e.key === "Enter" || (e.metaKey && e.key === "ArrowDown") || (e.metaKey && e.key === "o")) {
      e.preventDefault();
      open(selectedNode);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      if (inTrash) attempt(() => emptyTrash(selectedNode.path));
      else moveToTrash(selectedNode);
    }
  }

  // ------------------------------------------------------------ pieces
  const empty = !listing.loading && nodes.length === 0;
  const projectsEmpty = path === PROJECTS && empty && !listing.error && !searching;

  const sidebar = (
    <aside className="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-black/10 bg-neutral-50/80 p-2 pt-3 dark:border-white/10 dark:bg-neutral-900/60">
      <p className="px-2 pb-1 text-[11px] font-semibold text-neutral-400">Favourites</p>
      {favourites.map((f) => (
        <SidebarItem key={f.path} active={path === f.path} onClick={() => navigate(f.path)} Icon={f.Icon} label={f.label} />
      ))}
      <p className="px-2 pb-1 pt-3 text-[11px] font-semibold text-neutral-400">Locations</p>
      <SidebarItem active={inTrash} onClick={() => navigate(TRASH)} Icon={Trash2} label="Trash" />
      <a
        href={profile.links.github}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-md px-2 py-1 text-neutral-700 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/5"
      >
        <GithubIcon size={14} className="text-sky-500" /> GitHub
      </a>
    </aside>
  );

  const segments = path === RECENTS ? [RECENTS] : pathSegments(path);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={() => setMenu(null)}
      className="relative flex h-full select-none text-[13px] text-neutral-800 outline-none dark:text-neutral-100"
    >
      {!mobile && <div className="hidden sm:flex">{sidebar}</div>}

      <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-neutral-900">
        {/* toolbar */}
        <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-black/10 px-2 dark:border-white/10">
          <ToolButton label="Back" disabled={nav.index === 0} onClick={() => go(-1)}>
            <ChevronLeft size={18} />
          </ToolButton>
          <ToolButton label="Forward" disabled={nav.index >= nav.stack.length - 1} onClick={() => go(1)}>
            <ChevronRight size={18} />
          </ToolButton>
          <span className="ml-1 min-w-0 flex-1 truncate font-semibold">{titleFor(path)}</span>
          {listing.loading && <LoaderCircle size={14} className="animate-spin text-neutral-400" />}
          <div className="flex rounded-md bg-black/5 p-0.5 dark:bg-white/10">
            <ViewButton active={view === "icons"} label="Icons" onClick={() => setView("icons")}>
              <LayoutGrid size={14} />
            </ViewButton>
            <ViewButton active={view === "list"} label="List" onClick={() => setView("list")}>
              <ListGlyph size={14} />
            </ViewButton>
          </div>
          {inTrash && (
            <button
              type="button"
              disabled={nodes.length === 0}
              onClick={() => attempt(() => emptyTrash())}
              className="rounded-md border border-black/10 px-2 py-0.5 text-[12px] hover:bg-black/5 disabled:opacity-40 dark:border-white/15 dark:hover:bg-white/10"
            >
              Empty
            </button>
          )}
          <label className="flex w-28 items-center gap-1 rounded-md bg-black/5 px-1.5 py-1 focus-within:ring-2 focus-within:ring-sky-500/60 sm:w-40 dark:bg-white/10">
            <Search size={13} className="shrink-0 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setQuery("")}
              placeholder="Search"
              aria-label="Search"
              className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-neutral-400"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={12} className="text-neutral-400" />
              </button>
            )}
          </label>
        </div>

        {mobile && (
          <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-black/10 px-2 py-2 dark:border-white/10">
            {[...favourites, { path: TRASH, label: "Trash", Icon: Trash2 }].map((f) => (
              <button
                key={f.path}
                type="button"
                onClick={() => navigate(f.path)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] ${
                  path === f.path ? "bg-sky-500 text-white" : "bg-black/5 dark:bg-white/10"
                }`}
              >
                <f.Icon size={14} /> {f.label}
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="shrink-0 border-b border-black/5 px-3 py-1 text-[11px] text-neutral-500 dark:border-white/5">
            Searching “{titleFor(path)}”{path === PROJECTS || path.startsWith(PROJECTS + "/") ? " (GitHub folders you've opened)" : ""}
          </div>
        )}

        {listing.error && (
          <div className="flex shrink-0 items-start gap-2 border-b border-amber-500/20 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <span className="flex-1">{listing.error}</span>
            {(path === PROJECTS || path.startsWith(PROJECTS + "/")) && (
              <button type="button" onClick={() => void retry(path)} className="flex items-center gap-1 font-medium hover:underline">
                <RefreshCw size={12} /> Retry
              </button>
            )}
          </div>
        )}

        {/* content */}
        <div
          className="@container min-h-0 flex-1 overflow-auto"
          onClick={() => setSelected(null)}
          onContextMenu={(e) => openMenu(e, null)}
        >
          {projectsEmpty ? (
            <EmptyState>
              Nothing here yet — something&apos;s being built 🚧
              <br />
              <a href={profile.links.github} target="_blank" rel="noreferrer" className="text-sky-600 underline dark:text-sky-400">
                Peek at GitHub
              </a>
            </EmptyState>
          ) : empty && !listing.error ? (
            <EmptyState>
              {searching ? "No results" : inTrash ? "Trash is empty" : path === RECENTS ? "Files you open will show up here" : "This folder is empty"}
            </EmptyState>
          ) : view === "icons" ? (
            <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1 p-3">
              {nodes.map((n) => (
                <div
                  key={n.path}
                  role="button"
                  tabIndex={-1}
                  title={n.description ?? n.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenu(null);
                    if (mobile) open(n);
                    else setSelected(n.path);
                  }}
                  onDoubleClick={() => open(n)}
                  onContextMenu={(e) => openMenu(e, n)}
                  className="flex cursor-default flex-col items-center gap-1 p-1"
                >
                  <div className={`flex h-16 w-16 items-center justify-center rounded-md ${selected === n.path ? "bg-black/10 dark:bg-white/15" : ""}`}>
                    <FileIcon node={n} size={52} />
                  </div>
                  {renaming === n.path ? (
                    <RenameInput node={n} onDone={commitRename} onCancel={() => setRenaming(null)} />
                  ) : (
                    <span
                      className={`line-clamp-2 max-w-full break-words rounded px-1 text-center text-[12px] leading-tight ${
                        selected === n.path ? "bg-sky-500 text-white" : ""
                      }`}
                    >
                      {n.type === "app" ? n.name.replace(/\.app$/, "") : n.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="min-w-0">
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_88px] border-b border-black/10 bg-white/95 text-[11px] text-neutral-500 backdrop-blur @lg:grid-cols-[minmax(0,1fr)_150px_76px_130px] dark:border-white/10 dark:bg-neutral-900/95">
                <HeaderCell label="Name" k="name" sort={sort} setSort={setSort} />
                <HeaderCell label="Date Modified" k="modified" sort={sort} setSort={setSort} className="hidden @lg:flex" />
                <HeaderCell label="Size" k="size" sort={sort} setSort={setSort} className="hidden @lg:flex" />
                <HeaderCell label="Kind" k="kind" sort={sort} setSort={setSort} />
              </div>
              {nodes.map((n, i) => {
                const sel = selected === n.path;
                return (
                  <div
                    key={n.path}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(null);
                      if (mobile) open(n);
                      else setSelected(n.path);
                    }}
                    onDoubleClick={() => open(n)}
                    onContextMenu={(e) => openMenu(e, n)}
                    className={`grid cursor-default grid-cols-[minmax(0,1fr)_88px] items-center px-0 @lg:grid-cols-[minmax(0,1fr)_150px_76px_130px] ${
                      mobile ? "py-1.5" : ""
                    } ${sel ? "bg-sky-500 text-white" : i % 2 ? "bg-black/[0.025] dark:bg-white/[0.03]" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-2 px-3 py-[3px]">
                      <span className="flex w-4 shrink-0 justify-center">
                        <FileIcon node={n} size={16} />
                      </span>
                      {renaming === n.path ? (
                        <RenameInput node={n} onDone={commitRename} onCancel={() => setRenaming(null)} />
                      ) : (
                        <span className="min-w-0 truncate">
                          {n.name}
                          {n.description && (
                            <span className={`ml-2 text-[11px] ${sel ? "text-white/80" : "text-neutral-400"}`}>{n.description}</span>
                          )}
                          {searching && (
                            <span className={`ml-2 text-[11px] ${sel ? "text-white/70" : "text-neutral-400"}`}>{displayPath(n.path.slice(0, n.path.lastIndexOf("/")))}</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className={`hidden truncate px-2 text-[12px] @lg:block ${sel ? "" : "text-neutral-500"}`}>
                      {n.modified ? format(n.modified, "d MMM yyyy 'at' HH:mm") : "--"}
                    </div>
                    <div className={`hidden truncate px-2 text-[12px] @lg:block ${sel ? "" : "text-neutral-500"}`}>
                      {n.type === "file" ? formatSize(n.size) : "--"}
                    </div>
                    <div className={`truncate px-2 text-[12px] ${sel ? "" : "text-neutral-500"}`}>{kindLabel(n)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* path bar + status bar */}
        <div className="flex h-6 shrink-0 items-center gap-0.5 overflow-x-auto border-t border-black/10 px-2 text-[11px] text-neutral-500 dark:border-white/10">
          {segments.map((s, i) => (
            <span key={s} className="flex shrink-0 items-center gap-0.5">
              {i > 0 && <ChevronRight size={10} className="text-neutral-400" />}
              <button type="button" onClick={() => navigate(s)} className="rounded px-1 hover:bg-black/5 dark:hover:bg-white/10">
                {titleFor(s)}
              </button>
            </span>
          ))}
        </div>
        <div className="flex h-6 shrink-0 items-center justify-center border-t border-black/5 bg-neutral-50 px-2 text-[11px] text-neutral-500 dark:border-white/5 dark:bg-neutral-900/80">
          {notice ? (
            <span className="truncate text-amber-600 dark:text-amber-400">{notice}</span>
          ) : (
            <span className="truncate">
              {nodes.length} {nodes.length === 1 ? "item" : "items"}
              {selectedNode ? `, “${selectedNode.name}” selected` : ""}
              {listing.loading ? " · loading from GitHub…" : ""}
            </span>
          )}
        </div>
      </div>

      {menu && (
        <ContextMenu x={menu.x} y={menu.y}>
          {menu.node ? (
            <>
              <MenuItem onClick={() => open(menu.node!)}>Open</MenuItem>
              {menu.node.url && (
                <MenuItem
                  onClick={() => {
                    setMenu(null);
                    window.open(menu.node!.url, "_blank", "noopener,noreferrer");
                  }}
                >
                  {menu.node.remote ? "Open on GitHub" : "Open Link"}
                </MenuItem>
              )}
              <MenuSep />
              {menu.node.trashedFrom ? (
                <>
                  <MenuItem
                    onClick={() => {
                      setMenu(null);
                      attempt(() => restore(menu.node!.path));
                    }}
                  >
                    Put Back
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      setMenu(null);
                      attempt(() => emptyTrash(menu.node!.path));
                    }}
                  >
                    Delete Immediately…
                  </MenuItem>
                </>
              ) : (
                <MenuItem disabled={!canTrash(menu.node)} onClick={() => moveToTrash(menu.node!)}>
                  Move to Trash
                </MenuItem>
              )}
              <MenuSep />
              <MenuItem
                onClick={() => {
                  setInfo(menu.node!.path);
                  setMenu(null);
                }}
              >
                Get Info
              </MenuItem>
              {canRename(menu.node) && (
                <MenuItem
                  onClick={() => {
                    setRenaming(menu.node!.path);
                    setMenu(null);
                  }}
                >
                  Rename
                </MenuItem>
              )}
            </>
          ) : (
            <>
              <MenuItem disabled={path === RECENTS || !canWrite(`${path}/x`)} onClick={() => newItem("folder")}>
                New Folder
              </MenuItem>
              <MenuItem disabled={path === RECENTS || !canWrite(`${path}/x`)} onClick={() => newItem("file")}>
                New Text File
              </MenuItem>
              <MenuSep />
              <MenuItem
                onClick={() => {
                  setView(view === "icons" ? "list" : "icons");
                  setMenu(null);
                }}
              >
                {view === "icons" ? "View as List" : "View as Icons"}
              </MenuItem>
              {inTrash && (
                <MenuItem
                  disabled={nodes.length === 0}
                  onClick={() => {
                    setMenu(null);
                    attempt(() => emptyTrash());
                  }}
                >
                  Empty Trash
                </MenuItem>
              )}
              {path !== RECENTS && path.startsWith(PROJECTS) && (
                <MenuItem
                  onClick={() => {
                    setMenu(null);
                    void retry(path);
                  }}
                >
                  Refresh
                </MenuItem>
              )}
            </>
          )}
        </ContextMenu>
      )}

      {infoNode && <InfoPanel node={infoNode} onClose={() => setInfo(null)} />}
    </div>
  );
}

function pathSegments(p: string): string[] {
  const out = ["/"];
  let acc = "";
  for (const part of p.split("/").filter(Boolean)) {
    acc += "/" + part;
    out.push(acc);
  }
  // Start breadcrumbs at the home folder for anything inside it.
  const home = out.indexOf(HOME);
  return home >= 0 ? out.slice(home) : out;
}

function SidebarItem({ active, onClick, Icon, label }: { active: boolean; onClick: () => void; Icon: LucideIcon; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-2 py-1 text-left ${
        active ? "bg-black/10 dark:bg-white/15" : "hover:bg-black/5 dark:hover:bg-white/5"
      }`}
    >
      <Icon size={14} className="shrink-0 text-sky-500" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ToolButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-md p-1 text-neutral-600 hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent dark:text-neutral-300 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function ViewButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 ${active ? "bg-white shadow-sm dark:bg-neutral-600" : "text-neutral-500"}`}
    >
      {children}
    </button>
  );
}

function HeaderCell({
  label,
  k,
  sort,
  setSort,
  className = "flex",
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; asc: boolean };
  setSort: (s: { key: SortKey; asc: boolean }) => void;
  className?: string;
}) {
  const active = sort.key === k;
  return (
    <button
      type="button"
      onClick={() => setSort({ key: k, asc: active ? !sort.asc : true })}
      className={`${className} items-center justify-between border-r border-black/5 px-3 py-1 text-left last:border-r-0 hover:bg-black/5 dark:border-white/5 dark:hover:bg-white/5 ${
        active ? "font-semibold text-neutral-700 dark:text-neutral-200" : ""
      }`}
    >
      <span className="truncate">{label}</span>
      {active && (sort.asc ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
    </button>
  );
}

function RenameInput({ node, onDone, onCancel }: { node: VNode; onDone: (n: VNode, v: string) => void; onCancel: () => void }) {
  // Enter commits and unmounts the input, which can also fire blur — only finish once.
  const finished = useRef(false);
  const finish = (fn: () => void) => {
    if (finished.current) return;
    finished.current = true;
    fn();
  };
  return (
    <input
      autoFocus
      defaultValue={node.name}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => {
        const dot = node.type === "file" ? node.name.lastIndexOf(".") : -1;
        e.currentTarget.setSelectionRange(0, dot > 0 ? dot : node.name.length);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        const value = e.currentTarget.value;
        if (e.key === "Enter") finish(() => onDone(node, value));
        if (e.key === "Escape") finish(onCancel);
      }}
      onBlur={(e) => {
        const value = e.currentTarget.value;
        finish(() => onDone(node, value));
      }}
      aria-label="New name"
      className="w-full min-w-0 rounded border border-sky-500 bg-white px-1 text-center text-[12px] text-neutral-900 outline-none dark:bg-neutral-800 dark:text-neutral-100"
    />
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-40 items-center justify-center p-8 text-center text-neutral-400">{children}</div>;
}

function ContextMenu({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      role="menu"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ left: Math.max(4, x), top: Math.max(4, y) }}
      className="absolute z-50 min-w-44 rounded-lg border border-black/10 bg-white/95 p-1 text-[13px] shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-800/95"
    >
      {children}
    </div>
  );
}

function MenuItem({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="block w-full rounded px-2.5 py-1 text-left hover:bg-sky-500 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-inherit"
    >
      {children}
    </button>
  );
}

function MenuSep() {
  return <div className="mx-2 my-1 h-px bg-black/10 dark:bg-white/10" />;
}

function InfoPanel({ node, onClose }: { node: VNode; onClose: () => void }) {
  const rows: [string, string][] = [
    ["Kind", kindLabel(node)],
    ["Size", node.type === "file" ? formatSize(node.size) : "--"],
    ["Where", displayPath(node.trashedFrom ?? node.path.slice(0, node.path.lastIndexOf("/")) ?? "/")],
    ["Modified", node.modified ? format(node.modified, "d MMMM yyyy 'at' HH:mm") : "--"],
  ];
  if (node.language) rows.push(["Language", node.language]);
  if (node.readOnly) rows.push(["Sharing", "Read only"]);
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-3 top-14 z-40 w-64 rounded-xl border border-black/10 bg-white/95 p-3 text-[12px] shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-800/95"
    >
      <div className="mb-2 flex items-center gap-2">
        <FileIcon node={node} size={32} />
        <p className="min-w-0 flex-1 truncate font-semibold">{node.name}</p>
        <button type="button" aria-label="Close info" onClick={onClose} className="rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10">
          <X size={14} />
        </button>
      </div>
      {node.description && <p className="mb-2 text-neutral-600 dark:text-neutral-300">{node.description}</p>}
      <dl className="grid grid-cols-[70px_1fr] gap-x-2 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-right text-neutral-400">{k}:</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
      {node.url && (
        <a href={node.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sky-600 hover:underline dark:text-sky-400">
          {node.remote ? "View on GitHub ↗" : "Open link ↗"}
        </a>
      )}
    </div>
  );
}
