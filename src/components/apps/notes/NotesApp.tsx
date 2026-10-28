"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, Lock, Pin, PinOff, Search, SquarePen, Trash2, X } from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { useSettings } from "@/lib/settings";
import {
  NOTE_EMOJIS,
  buildPublicNotes,
  displayTitle,
  formatHeaderDate,
  formatListDate,
  groupNotes,
  isPinned,
  loadNotesState,
  newNote,
  notePreview,
  saveNotesState,
  toggleTaskAtLine,
  type Note,
  type NotesState,
} from "@/lib/notes";
import { NoteMarkdown } from "./NoteMarkdown";

const DEFAULT_NOTE = "about-me";

export function NotesApp({ metadata, mobile }: AppProps) {
  const { settings } = useSettings();
  const hour24 = settings.clock.hour24;

  const [publicNotes] = useState(buildPublicNotes);
  const [store, setStore] = useState<NotesState>(loadNotesState);
  const [now] = useState(() => new Date());

  const metaNoteId = typeof metadata.noteId === "string" ? metadata.noteId : undefined;
  const [selectedId, setSelectedId] = useState<string>(metaNoteId ?? DEFAULT_NOTE);
  const [prevMetaNoteId, setPrevMetaNoteId] = useState(metaNoteId);
  const [mobileScreen, setMobileScreen] = useState<"list" | "note">(metaNoteId ? "note" : "list");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [focusTitle, setFocusTitle] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Another app can open a specific note via openApp("notes", { metadata: { noteId } }).
  if (metaNoteId !== prevMetaNoteId) {
    setPrevMetaNoteId(metaNoteId);
    if (metaNoteId) {
      setSelectedId(metaNoteId);
      setMobileScreen("note");
      setEditing(false);
    }
  }

  const allNotes = useMemo<Note[]>(
    () => [
      ...publicNotes.map((n) => (store.publicContent[n.id] ? { ...n, content: store.publicContent[n.id] } : n)),
      ...store.privateNotes,
    ],
    [publicNotes, store],
  );

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () => (q ? allNotes.filter((n) => `${n.title}\n${n.content}`.toLowerCase().includes(q)) : allNotes),
    [allNotes, q],
  );
  const groups = useMemo(() => groupNotes(visible, store.pins, now), [visible, store.pins, now]);
  const ordered = groups.flatMap((g) => g.notes);

  const active = allNotes.find((n) => n.id === selectedId) ?? allNotes[0];

  // ---------- mutations (state + localStorage, from event handlers) ----------
  const commit = (next: NotesState) => {
    setStore(next);
    saveNotesState(next);
  };

  const updatePrivate = (id: string, patch: Partial<Note>) =>
    commit({
      ...store,
      privateNotes: store.privateNotes.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
      ),
    });

  const select = (id: string) => {
    setSelectedId(id);
    setEditing(false);
    setEmojiOpen(false);
    setFocusTitle(false);
    setMobileScreen("note");
  };

  const create = () => {
    const note = newNote();
    commit({ ...store, privateNotes: [note, ...store.privateNotes] });
    setQuery("");
    setSelectedId(note.id);
    setEditing(false);
    setFocusTitle(true);
    setEmojiOpen(false);
    setMobileScreen("note");
  };

  const remove = (note: Note) => {
    if (note.public) return;
    const idx = ordered.findIndex((n) => n.id === note.id);
    const next = ordered[idx + 1] ?? ordered[idx - 1];
    const pins = { ...store.pins };
    delete pins[note.id];
    commit({ ...store, pins, privateNotes: store.privateNotes.filter((n) => n.id !== note.id) });
    setSelectedId(next && next.id !== note.id ? next.id : DEFAULT_NOTE);
    setEditing(false);
    if (mobile) setMobileScreen("list");
  };

  const togglePin = (note: Note) => commit({ ...store, pins: { ...store.pins, [note.id]: !isPinned(note, store.pins) } });

  const toggleTask = (note: Note, line: number) => {
    const content = toggleTaskAtLine(note.content, line);
    if (note.public) commit({ ...store, publicContent: { ...store.publicContent, [note.id]: content } });
    else updatePrivate(note.id, { content });
  };

  // ---------- views ----------
  const sidebar = (
    <aside
      className={
        mobile
          ? "flex h-full w-full flex-col bg-white dark:bg-neutral-900"
          : "flex h-full w-[260px] shrink-0 flex-col border-r border-black/10 bg-neutral-50/80 dark:border-white/10 dark:bg-neutral-900/60"
      }
    >
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <span className="text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">
          {mobile ? "Notes" : `${allNotes.length} notes`}
        </span>
        <div className="flex items-center gap-0.5 text-neutral-500 dark:text-neutral-400">
          <IconButton label="Delete note" disabled={!active || active.public} onClick={() => active && remove(active)}>
            <Trash2 size={15} />
          </IconButton>
          <IconButton label="New note" onClick={create}>
            <SquarePen size={15} />
          </IconButton>
        </div>
      </div>
      <label className="mx-3 mb-2 flex items-center gap-1.5 rounded-md border border-black/5 bg-black/[0.04] px-2 py-1 text-[13px] text-neutral-500 focus-within:ring-2 focus-within:ring-[#ffc600]/60 dark:border-white/5 dark:bg-white/10">
        <Search size={13} className="shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search notes"
          className="w-full min-w-0 bg-transparent text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="shrink-0">
            <X size={12} />
          </button>
        )}
      </label>
      <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label="Notes">
        {groups.length === 0 && <p className="px-3 py-6 text-center text-[12px] text-neutral-400">No results</p>}
        {groups.map((g) => (
          <section key={g.key} className="mb-2">
            <h2 className="px-2.5 pt-2 pb-1 text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
              {g.label}
            </h2>
            <ul>
              {g.notes.map((n, i) => {
                const selected = !mobile && n.id === active?.id;
                const prevSelected = !mobile && i > 0 && g.notes[i - 1].id === active?.id;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => select(n.id)}
                      className={`block w-full rounded-lg px-2.5 text-left ${
                        selected ? "bg-[#ffe390] dark:bg-[#ffe390]/25" : "hover:bg-black/[0.04] dark:hover:bg-white/5"
                      }`}
                    >
                      <div
                        className={`py-2 ${
                          i === 0 || selected || prevSelected ? "" : "border-t border-black/5 dark:border-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
                          <span className="text-[13px] leading-none">{n.emoji}</span>
                          <span className="truncate">{displayTitle(n)}</span>
                          {n.public && <Lock size={10} className="ml-auto shrink-0 text-neutral-400" aria-label="Read-only" />}
                        </div>
                        <div className="mt-0.5 flex gap-1.5 text-[12px]">
                          <span className="shrink-0 font-medium text-neutral-700 dark:text-neutral-300">
                            {formatListDate(n.updatedAt, hour24, now)}
                          </span>
                          <span className="truncate text-neutral-500 dark:text-neutral-400">{notePreview(n)}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    </aside>
  );

  const pinned = active ? isPinned(active, store.pins) : false;

  const noteView = active && (
    <main className="flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-neutral-900">
      <div className="flex h-10 shrink-0 items-center gap-1 px-2 text-neutral-500 dark:text-neutral-400">
        {mobile && (
          <button
            type="button"
            onClick={() => {
              setMobileScreen("list");
              setEditing(false);
            }}
            className="flex items-center gap-0.5 rounded-md px-1 py-1 text-[15px] text-[#d6a400]"
          >
            <ChevronLeft size={20} /> Notes
          </button>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {active.public && (
            <span className="mr-1 flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] dark:bg-white/10">
              <Lock size={10} /> Read-only
            </span>
          )}
          <IconButton label={pinned ? "Unpin note" : "Pin note"} onClick={() => togglePin(active)}>
            {pinned ? <PinOff size={15} /> : <Pin size={15} />}
          </IconButton>
          {!active.public && (
            <IconButton label="Delete note" onClick={() => remove(active)}>
              <Trash2 size={15} />
            </IconButton>
          )}
          {mobile && (
            <IconButton label="New note" onClick={create}>
              <SquarePen size={15} />
            </IconButton>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" key={active.id}>
        <div className="mx-auto max-w-[680px] px-6 pt-1 pb-16 text-[14px] leading-[1.65] text-neutral-800 sm:px-10 dark:text-neutral-200">
          <p className="mb-4 text-center text-[11px] font-medium text-neutral-400">{formatHeaderDate(active.updatedAt, hour24)}</p>

          <div className="relative mb-3 flex items-center gap-2">
            <button
              type="button"
              disabled={active.public}
              onClick={() => setEmojiOpen((o) => !o)}
              aria-label="Change emoji"
              className="rounded-md text-[24px] leading-none enabled:hover:bg-black/5 dark:enabled:hover:bg-white/10"
            >
              {active.emoji}
            </button>
            {active.public ? (
              <h1 className="text-[22px] leading-tight font-bold text-neutral-900 dark:text-white">{active.title}</h1>
            ) : (
              <input
                value={active.title}
                autoFocus={focusTitle}
                onChange={(e) => updatePrivate(active.id, { title: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setFocusTitle(false);
                    setEditing(true);
                  }
                }}
                placeholder="New Note"
                aria-label="Note title"
                className="w-full min-w-0 bg-transparent text-[22px] leading-tight font-bold text-neutral-900 outline-none placeholder:text-neutral-300 dark:text-white dark:placeholder:text-neutral-600"
              />
            )}
            {emojiOpen && !active.public && (
              <div className="absolute top-9 left-0 z-10 grid w-[232px] grid-cols-6 gap-1 rounded-xl border border-black/10 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-white/10 dark:bg-neutral-800/95">
                {NOTE_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      updatePrivate(active.id, { emoji: e });
                      setEmojiOpen(false);
                    }}
                    className="rounded-md p-1 text-[20px] leading-none hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {editing && !active.public ? (
            <textarea
              autoFocus
              value={active.content}
              onChange={(e) => updatePrivate(active.id, { content: e.target.value })}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") (e.target as HTMLTextAreaElement).blur();
              }}
              placeholder="Start writing… (markdown works: # heading, - list, - [ ] task, **bold**, [link](https://…))"
              aria-label="Note body (markdown)"
              className="field-sizing-content min-h-[50vh] w-full resize-none bg-transparent font-mono text-[13px] leading-[1.7] text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-200"
            />
          ) : (
            <div
              onClick={(e) => {
                if (active.public) return;
                if ((e.target as HTMLElement).closest("a,button,input")) return;
                setEditing(true);
                setFocusTitle(false);
              }}
              className={active.public ? "" : "min-h-[50vh] cursor-text"}
            >
              {active.content.trim() ? (
                <NoteMarkdown content={active.content} onToggleTask={(line) => toggleTask(active, line)} />
              ) : (
                !active.public && <p className="text-neutral-400">Click to start writing…</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );

  if (mobile) {
    return <div className="h-full text-[13px]">{mobileScreen === "list" ? sidebar : noteView}</div>;
  }

  return (
    <div className="flex h-full text-[13px]">
      {sidebar}
      {noteView}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md enabled:hover:bg-black/5 enabled:hover:text-neutral-800 disabled:opacity-30 dark:enabled:hover:bg-white/10 dark:enabled:hover:text-neutral-100"
    >
      {children}
    </button>
  );
}
