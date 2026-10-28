// Notes data layer: public seed notes (generated from profile.ts, read-only) plus
// private notes that visitors create, stored per browser in localStorage.

import { profile } from "@/data/profile";

export type Note = {
  id: string;
  title: string;
  emoji: string;
  /** markdown */
  content: string;
  /** ISO timestamps */
  createdAt: string;
  updatedAt: string;
  /** public notes are authored by Sarthak and read-only for visitors */
  public: boolean;
  /** default pin state (visitors can override it) */
  pinned?: boolean;
};

export type NotesState = {
  privateNotes: Note[];
  /** per-browser pin overrides, keyed by note id */
  pins: Record<string, boolean>;
  /** per-browser task-list state for public notes (full markdown with toggled boxes) */
  publicContent: Record<string, string>;
};

const STORAGE_KEY = "sb-notes-v1";

export const NOTE_EMOJIS = [
  "📝", "💡", "📌", "✅", "🚀", "🧠", "☕️", "📚", "🎯", "🛠️", "🎧", "✈️",
  "🍜", "🏃", "🎮", "💬", "🌱", "🔥", "⭐️", "🗓️", "💻", "🐛", "🎉", "❤️",
];

// ---------- seed notes ----------

function daysAgo(n: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function seed(id: string, emoji: string, title: string, content: string, ago: number, hour: number, minute: number, pinned = false): Note {
  const ts = daysAgo(ago, hour, minute);
  return { id, emoji, title, content: content.trim(), createdAt: ts, updatedAt: ts, public: true, pinned };
}

export function buildPublicNotes(): Note[] {
  const [current, ...previous] = profile.experience;
  const city = current.location.split(",")[0];

  const aboutMe = `
${profile.about.join("\n\n")}

### currently
- ${current.roles[0].title.toLowerCase()} at **${current.company}**, ${city}
- building side projects — they'll show up in the Projects folder soon

### previously
${previous
  .flatMap((job) => job.roles.map((r) => `- ${r.title.toLowerCase()} at **${job.company}** (${r.period})`))
  .join("\n")}
- ${profile.education.degree.toLowerCase()} at **${profile.education.school}** (${profile.education.detail})

### elsewhere
[github](${profile.links.github}) · [linkedin](${profile.links.linkedin}) · [email](mailto:${profile.email})
`;

  const skills = `
the tools i reach for, roughly in order of how often.

| area | stack |
| --- | --- |
${Object.entries(profile.skills)
  .map(([group, items]) => `| **${group.toLowerCase()}** | ${items.join(" · ")} |`)
  .join("\n")}

> day to day it's mostly \`Java\` + \`Spring Boot\` services talking over \`Kafka\`, backed by \`MySQL\`/\`PostgreSQL\` and \`Redis\`.
`;

  const wins = `
${profile.achievements.map((a) => `- 🏆 ${a}`).join("\n")}
- ⚡️ **4x throughput** on a Kafka-based async bulk stock ingestion engine
- 🕸️ **60% faster** bulk stock confirmation & invoicing by modelling distributor hierarchies as a graph
- 🧱 designed the **Credit and Accounting** modules from scratch — ledgers, credit/debit notes
- 👥 grew from software engineer to **leading a team of 3** at Salescode.ai
- 🎓 graduated with a **${profile.education.detail}** from ${profile.education.school}
`;

  const work = `
- **own it end to end** — design, ship, and stay on call for it.
- **boring is a feature** — the best infra is the kind nobody has to think about.
- **measure, then optimize** — every big win i've had started with a profiler.
- **leave the codebase nicer** — reviews are for teaching, not gatekeeping.
`;

  const experience = "where i've worked, newest first.\n\n" + profile.experience
    .map((job) => {
      const roles = job.roles
        .map((r) => `#### ${r.title}\n*${r.period}*\n\n${r.bullets.map((b) => `- ${b}`).join("\n")}`)
        .join("\n\n");
      const stack = job.stack ? `\n\n**stack:** ${job.stack}` : "";
      return `### ${job.company}${job.current ? " (current)" : ""}\n${job.location}\n\n${roles}${stack}`;
    })
    .join("\n\n---\n\n");

  const now = `
a [now page](https://nownownow.com/about) — what i'm focused on at the moment.

### life
- new city, new team: settling into **${current.company}** in ${city} 🌆
- learning which café has the best filter coffee (research is ongoing)

### building
- side projects, starting with this site — a little macOS in your browser
- poking at system design ideas i never had time for

### checklist
- [x] move to ${city}
- [x] start as an ${current.roles[0].title.toLowerCase()} at ${current.company}
- [x] ship this portfolio
- [ ] learn the new codebases end to end
- [ ] find the best filter coffee in ${city}
- [ ] write more things down
`;

  const howThisWorks = `
welcome! this site is a tiny desktop — poke around the dock and the menu bar.

### notes
- notes with a 🔒 are mine and read-only
- hit the **compose** button to write your own — they're **private to this browser** (stored in localStorage, nobody else sees them)
- notes are markdown, so \`**bold**\`, lists, links, tables and checklists all work:

\`\`\`md
- [ ] try a checklist
- [x] like this one
\`\`\`

- [ ] create a note
- [ ] pin it to the top
- [ ] say hi via [email](mailto:${profile.email})
`;

  return [
    seed("about-me", "👋", "about me", aboutMe, 0, 9, 41, true),
    seed("now", "📍", "now", now, 0, 8, 12),
    seed("experience", "💼", "experience", experience, 1, 22, 5),
    seed("wins", "🏆", "wins", wins, 3, 19, 30),
    seed("how-this-works", "🧭", "how this site works", howThisWorks, 5, 11, 2),
    seed("skills", "🧰", "stack & skills", skills, 12, 17, 45),
    seed("how-i-work", "🛠️", "how i like to work", work, 41, 21, 15),
  ];
}

// ---------- storage ----------

const emptyState: NotesState = { privateNotes: [], pins: {}, publicContent: {} };

export function loadNotesState(): NotesState {
  if (typeof window === "undefined") return emptyState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const saved = JSON.parse(raw) as Partial<NotesState>;
    return {
      privateNotes: Array.isArray(saved.privateNotes) ? saved.privateNotes : [],
      pins: saved.pins ?? {},
      publicContent: saved.publicContent ?? {},
    };
  } catch {
    return emptyState;
  }
}

export function saveNotesState(state: NotesState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function newNote(): Note {
  const ts = new Date().toISOString();
  return {
    id: `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    title: "",
    emoji: "📝",
    content: "",
    createdAt: ts,
    updatedAt: ts,
    public: false,
  };
}

// ---------- helpers ----------

export function isPinned(note: Note, pins: Record<string, boolean>) {
  return pins[note.id] ?? !!note.pinned;
}

export function displayTitle(note: Note) {
  return note.title.trim() || "New Note";
}

/** First meaningful line of the body with markdown syntax stripped. */
export function notePreview(note: Note) {
  for (const raw of note.content.split("\n")) {
    const line = raw
      .replace(/^\s*(#{1,6}\s|>\s?|[-*+]\s(\[[ xX]\]\s)?|\d+\.\s|\|)/, "")
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`~|]/g, "")
      .trim();
    if (line && !/^-+$/.test(line)) return line;
  }
  return "No additional text";
}

/** Flip the n-th task checkbox found on a given (1-based) source line. */
export function toggleTaskAtLine(markdown: string, line: number): string {
  const lines = markdown.split("\n");
  const i = line - 1;
  if (!lines[i]) return markdown;
  lines[i] = lines[i].replace(/\[( |x|X)\]/, (m) => (m === "[ ]" ? "[x]" : "[ ]"));
  return lines.join("\n");
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export type NoteGroup = { key: string; label: string; notes: Note[] };

/** Apple Notes-style grouping: Pinned, Today, Yesterday, Previous 7/30 Days, then by month. */
export function groupNotes(notes: Note[], pins: Record<string, boolean>, now = new Date()): NoteGroup[] {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86_400_000;
  const groups = new Map<string, NoteGroup>();
  const push = (key: string, label: string, note: Note) => {
    if (!groups.has(key)) groups.set(key, { key, label, notes: [] });
    groups.get(key)!.notes.push(note);
  };

  const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  for (const note of sorted) {
    if (isPinned(note, pins)) {
      push("pinned", "Pinned", note);
      continue;
    }
    const t = new Date(note.updatedAt).getTime();
    if (t >= startOfToday) push("today", "Today", note);
    else if (t >= startOfToday - day) push("yesterday", "Yesterday", note);
    else if (t >= startOfToday - 7 * day) push("7", "Previous 7 Days", note);
    else if (t >= startOfToday - 30 * day) push("30", "Previous 30 Days", note);
    else {
      const d = new Date(t);
      const label = d.getFullYear() === now.getFullYear() ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      push(`m-${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`, label, note);
    }
  }
  // Map preserves insertion order; make sure "pinned" comes first.
  const out = [...groups.values()];
  out.sort((a, b) => (a.key === "pinned" ? -1 : b.key === "pinned" ? 1 : 0));
  return out;
}

/** Sidebar date: time today, "Yesterday", weekday this week, else short date. */
export function formatListDate(iso: string, hour24: boolean, now = new Date()) {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= startOfToday) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: !hour24 });
  if (t >= startOfToday - 86_400_000) return "Yesterday";
  if (t >= startOfToday - 6 * 86_400_000) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Header above the note body, e.g. "29 October 2026 at 9:41 AM". */
export function formatHeaderDate(iso: string, hour24: boolean) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: !hour24 });
  return `${date} at ${time}`;
}
