"use client";

// Messages: conversation store (localStorage), scripted bots, unread hooks.
// No backend, no AI — the "Sarthak" thread answers from keyword intents built
// out of src/data/profile.ts.

import { useSyncExternalStore } from "react";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";

export type ReactionType = "heart" | "like" | "dislike" | "laugh" | "emphasize" | "question";

export type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  ts: number;
  reaction?: { type: ReactionType; from: "me" | "them" };
};

export type BotKind = "sarthak" | "terminal" | "weather";

export type Conversation = {
  id: string;
  name: string;
  initials: string;
  bot: BotKind;
  pinned: boolean;
  messages: Message[];
  /** messages from "them" with ts > lastReadTs are unread */
  lastReadTs: number;
  /** ts of my last message the bot has "read" */
  seenTs: number;
  /** quick-reply chips shown under the latest bot message */
  suggestions?: string[];
};

export type MessagesState = { conversations: Conversation[] };

export type MessagesEvent = { type: "received"; conversationId: string } | { type: "reaction"; conversationId: string };

const STORAGE_KEY = "sb-messages-v1";

const DEFAULT_SUGGESTIONS = ["What do you work on?", "Tech stack?", "Experience", "How can I reach you?"];

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

let state: MessagesState = { conversations: [] };
let loaded = false;
let typing: Record<string, boolean> = {};
const listeners = new Set<() => void>();
const typingListeners = new Set<() => void>();
const eventListeners = new Set<(e: MessagesEvent) => void>();
let idCounter = 0;

const uid = () => `${Date.now().toString(36)}-${(idCounter++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function seed(): MessagesState {
  const now = Date.now();
  const m = (from: "me" | "them", text: string, ago: number): Message => ({ id: uid(), from, text, ts: now - ago });
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  return {
    conversations: [
      {
        id: "sarthak",
        name: "Sarthak",
        initials: "SB",
        bot: "sarthak",
        pinned: true,
        lastReadTs: 0,
        seenTs: 0,
        suggestions: DEFAULT_SUGGESTIONS,
        messages: [
          m("them", "hey! 👋 welcome to my corner of the internet", 2 * min),
          m("them", `I'm Sarthak — ${profile.headline.charAt(0).toLowerCase()}${profile.headline.slice(1)}`, 2 * min - 4000),
          m("them", "ask me anything about my work, my stack, or how to get in touch. or just tap a suggestion below 👇", 2 * min - 9000),
        ],
      },
      {
        id: "terminal-tips",
        name: "Terminal Tips",
        initials: ">_",
        bot: "terminal",
        pinned: true,
        lastReadTs: now,
        seenTs: now,
        messages: [
          m("them", "Daily tip: `git switch -` jumps back to the branch you were just on. Like `cd -`, but for git.", 1 * day + 3 * hr),
          m("me", "ok that's actually useful", 1 * day + 2 * hr),
          m("them", "Bonus: `git log --oneline --graph --all` turns your history into a subway map 🚇", 1 * day + 2 * hr - min),
        ],
      },
      {
        id: "weather-alerts",
        name: "Weather Alerts",
        initials: "☁️",
        bot: "weather",
        pinned: false,
        lastReadTs: now,
        seenTs: now,
        messages: [
          m("them", "🌧️ Bangalore forecast: light rain expected at exactly the moment you leave the office.", 3 * day),
          m("them", "Traffic on Outer Ring Road: yes.", 3 * day - 2 * min),
        ],
      },
    ],
  };
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MessagesState;
      if (Array.isArray(parsed.conversations)) {
        state = parsed;
        return;
      }
    }
  } catch {
    // fall through to seed
  }
  state = seed();
  persist();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function setState(next: MessagesState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function updateConversation(id: string, fn: (c: Conversation) => Conversation) {
  ensureLoaded();
  setState({ conversations: state.conversations.map((c) => (c.id === id ? fn(c) : c)) });
}

function setTyping(id: string, on: boolean) {
  typing = { ...typing, [id]: on };
  typingListeners.forEach((l) => l());
}

function emit(e: MessagesEvent) {
  eventListeners.forEach((l) => l(e));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getState = () => {
  ensureLoaded();
  return state;
};
const EMPTY: MessagesState = { conversations: [] };
const getServerState = () => EMPTY;

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------

export function unreadCount(c: Conversation): number {
  return c.messages.filter((m) => m.from === "them" && m.ts > c.lastReadTs).length;
}

export function markRead(id: string) {
  ensureLoaded();
  const c = state.conversations.find((x) => x.id === id);
  if (!c || unreadCount(c) === 0) return;
  updateConversation(id, (x) => ({ ...x, lastReadTs: Date.now() }));
}

export function togglePin(id: string) {
  updateConversation(id, (c) => ({ ...c, pinned: !c.pinned }));
}

export function deleteConversation(id: string) {
  ensureLoaded();
  setState({ conversations: state.conversations.filter((c) => c.id !== id) });
}

/** Restores the Sarthak thread if it was deleted; returns its id. */
export function ensureSarthakConversation(): string {
  ensureLoaded();
  if (!state.conversations.some((c) => c.id === "sarthak")) {
    const seeded = seed().conversations[0];
    setState({ conversations: [{ ...seeded, lastReadTs: Date.now() }, ...state.conversations] });
  }
  return "sarthak";
}

export function react(conversationId: string, messageId: string, type: ReactionType | null) {
  updateConversation(conversationId, (c) => ({
    ...c,
    messages: c.messages.map((m) => (m.id === messageId ? { ...m, reaction: type ? { type, from: "me" } : undefined } : m)),
  }));
}

const pending = new Map<string, ReturnType<typeof setTimeout>[]>();

function schedule(convId: string, fn: () => void, ms: number) {
  const t = setTimeout(() => {
    pending.set(
      convId,
      (pending.get(convId) ?? []).filter((x) => x !== t),
    );
    fn();
  }, ms);
  pending.set(convId, [...(pending.get(convId) ?? []), t]);
}

/** Sends a message from "me" and schedules the bot's reply. */
export function sendMessage(conversationId: string, text: string) {
  const body = text.trim();
  if (!body) return;
  ensureLoaded();
  const conv = state.conversations.find((c) => c.id === conversationId);
  if (!conv) return;
  const mine: Message = { id: uid(), from: "me", text: body, ts: Date.now() };
  updateConversation(conversationId, (c) => ({ ...c, messages: [...c.messages, mine], suggestions: undefined }));

  // Cancel an in-flight reply so rapid-fire messages get one coherent answer.
  (pending.get(conversationId) ?? []).forEach(clearTimeout);
  pending.set(conversationId, []);
  setTyping(conversationId, false);

  const { replies, suggestions, reaction } = replyFor(conv.bot, body);

  schedule(
    conversationId,
    () => {
      updateConversation(conversationId, (c) => ({
        ...c,
        seenTs: mine.ts,
        messages: reaction ? c.messages.map((m) => (m.id === mine.id ? { ...m, reaction: { type: reaction, from: "them" } } : m)) : c.messages,
      }));
      if (reaction) emit({ type: "reaction", conversationId });
    },
    700,
  );

  let at = 1100;
  replies.forEach((r, i) => {
    const typingMs = Math.min(3200, 700 + r.length * 22);
    schedule(conversationId, () => setTyping(conversationId, true), at);
    at += typingMs;
    schedule(
      conversationId,
      () => {
        setTyping(conversationId, false);
        const last = i === replies.length - 1;
        updateConversation(conversationId, (c) => ({
          ...c,
          messages: [...c.messages, { id: uid(), from: "them", text: r, ts: Date.now() }],
          suggestions: last ? suggestions : undefined,
        }));
        emit({ type: "received", conversationId });
      },
      at,
    );
    at += 350;
  });
}

// ---------------------------------------------------------------------------
// Bots
// ---------------------------------------------------------------------------

type Reply = { replies: string[]; suggestions?: string[]; reaction?: ReactionType };

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const TERMINAL_TIPS = [
  "`Ctrl+R` in your shell searches command history. Stop pressing ↑ forty times.",
  "`git commit --fixup <sha>` + `git rebase -i --autosquash` = tidy history with zero effort.",
  "`lsof -i :8080` tells you exactly which process is squatting on your port.",
  "`jq '.items[] | {id, name}'` — curl's best friend.",
  "`!!` re-runs the last command. `sudo !!` is the classic.",
  "`git stash -p` lets you stash just some hunks, not everything.",
  "`watch -n 2 kubectl get pods` — a poor engineer's dashboard.",
  "`tail -f app.log | grep --line-buffered ERROR` to only see the scary bits.",
  "`git bisect` will find the commit that broke things faster than you can.",
  "`cd -` takes you back to the previous directory.",
];

const WEATHER = [
  "☀️ Clear skies over Bangalore. Perfect weather for not touching prod on a Friday.",
  "🌦️ 60% chance of rain, 100% chance someone says 'Bangalore weather is the best'.",
  "🌫️ Morning fog expected. Visibility: about as good as logs without trace ids.",
  "⛈️ Thunderstorm warning. Commit your changes.",
  "🌤️ 24°C and breezy. Filter coffee conditions: optimal.",
];

export function sarthakReply(input: string): Reply {
  const t = input.toLowerCase();
  const has = (...words: string[]) => words.some((w) => new RegExp(`\\b${w}`, "i").test(t));
  const salescode = profile.experience.find((j) => j.company.toLowerCase().includes("salescode"));
  const kiwi = profile.experience.find((j) => j.current);
  const skillLine = (k: string) => (profile.skills[k] ? `${k}: ${profile.skills[k].join(", ")}` : null);

  if (has("thank", "thx", "ty\\b", "cheers", "appreciate")) {
    return { replies: ["anytime! 😊", "anything else you'd like to know?"], suggestions: DEFAULT_SUGGESTIONS, reaction: "heart" };
  }
  if (has("hire", "hiring", "job", "opportunit", "role", "position", "recruit", "freelance", "open to")) {
    return {
      replies: [
        "always happy to chat about interesting backend problems 🙌",
        `the best way to reach me is email (${profile.email}) or LinkedIn: ${profile.links.linkedin}`,
      ],
      suggestions: ["Experience", "Tech stack?", "Where are you based?"],
    };
  }
  if (has("contact", "email", "mail", "reach", "linkedin", "github", "connect", "socials?")) {
    return {
      replies: [`📧 ${profile.email}`, `💼 ${profile.links.linkedin}`, `🐙 ${profile.links.github}`],
      suggestions: ["What do you work on?", "Projects?"],
    };
  }
  if (has("salescode")) {
    const senior = salescode?.roles[0];
    const swe = salescode?.roles[1];
    return {
      replies: [
        `at Salescode.ai I worked on a Distributor Management System used by thousands of distributors across multiple countries.`,
        swe ? `as a ${swe.title} (${swe.period}) I ${lc(swe.bullets[1] ?? "").replace(/\.$/, "")}, and ${lc(swe.bullets[3] ?? "")}` : "",
        senior ? `then as ${senior.title} (${senior.period}) I ${lc(senior.bullets[0])}` : "",
      ].filter(Boolean),
      suggestions: ["What about Kiwi?", "Tech stack?", "Any awards?"],
    };
  }
  if (has("kiwi", "current", "now", "these days")) {
    return {
      replies: [
        `I'm a ${kiwi?.roles[0].title ?? "Software Development Engineer"} at Kiwi in Bangalore — joined in ${kiwi?.roles[0].period.split("–")[0].trim() ?? "Sep 2026"}.`,
        "I build backend services there — Java + Spring Boot land. can't share much more than that publicly 🤐",
      ],
      suggestions: ["What did you do before?", "Tech stack?"],
    };
  }
  if (has("experience", "work", "career", "job history", "resume", "cv", "background", "before", "previous", "company", "companies")) {
    return {
      replies: [
        `right now: SDE at Kiwi, Bangalore (since ${kiwi?.roles[0].period.split("–")[0].trim() ?? "Sep 2026"}).`,
        `before that ~2 years at Salescode.ai — grew from Software Engineer to Senior Software Engineer, leading a team of 3 on a Distributor Management System.`,
        "highlights: a Kafka-based bulk stock ingestion engine (4x throughput), a graph-based optimisation that made bulk invoicing 60% faster, and building the Credit & Accounting modules from scratch.",
      ],
      suggestions: ["Tell me about Salescode", "Tech stack?", "Education?"],
    };
  }
  if (has("skill", "stack", "tech", "language", "java", "spring", "kafka", "redis", "tools?", "framework")) {
    return {
      replies: [
        "mostly Java + Spring Boot, microservices and event-driven stuff with Kafka 🛠️",
        [skillLine("Languages"), skillLine("Backend"), skillLine("Data & Messaging")].filter(Boolean).join("\n"),
        `also: ${[...(profile.skills.Practices ?? []), ...(profile.skills.Also ?? [])].join(", ")}`,
      ],
      suggestions: ["Projects?", "Experience", "How can I reach you?"],
    };
  }
  if (has("project", "built", "build", "side", "portfolio", "open source", "repo")) {
    if (projects.length) {
      return {
        replies: [
          "a few things I've built:",
          projects.map((p) => `• ${p.name} — ${p.description}`).join("\n"),
          `more on GitHub: ${profile.links.github}`,
        ],
        suggestions: ["Tech stack?", "How can I reach you?"],
      };
    }
    return {
      replies: [
        "I'm still putting my side projects together for this site 🚧",
        `meanwhile you're literally inside one — this macOS-style portfolio. code lives on GitHub: ${profile.links.github}`,
      ],
      suggestions: ["Experience", "Tech stack?"],
    };
  }
  if (has("where", "location", "based", "live", "city", "bangalore", "bengaluru", "india")) {
    return { replies: [`📍 ${profile.location}`, "say hi if you're ever around 👋"], suggestions: ["What do you work on?", "How can I reach you?"] };
  }
  if (has("educat", "college", "university", "degree", "study", "studied", "school", "cgpa", "gpa")) {
    const e = profile.education;
    return { replies: [`🎓 ${e.degree} from ${e.school} (${e.period}) — ${e.detail}.`], suggestions: ["Experience", "Any awards?"] };
  }
  if (has("award", "achievement", "proud", "recogni")) {
    return { replies: profile.achievements.map((a) => `🏆 ${a}`), suggestions: ["Experience", "Tech stack?"] };
  }
  if (has("who", "about you", "yourself", "introduce", "what do you do", "what do you work")) {
    return {
      replies: [profile.about[0], profile.about[1]],
      suggestions: ["Experience", "Tech stack?", "How can I reach you?"],
    };
  }
  if (has("hobb", "fun", "free time", "weekend", "music", "movie", "game", "favou?rite", "sport", "cricket", "food")) {
    return {
      replies: ["ha, that's classified 🤫 this version of me only knows the work stuff.", "ask me in person sometime! meanwhile, there are a few games on this desktop 🎮"],
      suggestions: ["What do you work on?", "How can I reach you?"],
    };
  }
  if (has("hi", "hey", "hello", "yo\\b", "sup", "hola", "namaste", "good (morning|afternoon|evening)")) {
    return {
      replies: [pick(["hey! 👋", "hello hello 👋", "hi there! 👋"]), `I'm Sarthak — ${profile.currentRole}, based in Bangalore. what would you like to know?`],
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }
  return {
    replies: [
      pick(["hmm, not sure I've got a good answer for that one 😅", "good question — slightly outside what this bot knows 😅"]),
      "I can tell you about my work at Kiwi and Salescode, my tech stack, education, or how to reach me.",
    ],
    suggestions: DEFAULT_SUGGESTIONS,
  };
}

function replyFor(bot: BotKind, input: string): Reply {
  if (bot === "terminal") return { replies: [pick(TERMINAL_TIPS)] };
  if (bot === "weather") return { replies: [pick(WEATHER)] };
  return sarthakReply(input);
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useMessagesState(): MessagesState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

const subscribeTyping = (l: () => void) => {
  typingListeners.add(l);
  return () => {
    typingListeners.delete(l);
  };
};

export function useTyping(conversationId: string | null): boolean {
  return useSyncExternalStore(
    subscribeTyping,
    () => (conversationId ? !!typing[conversationId] : false),
    () => false,
  );
}

export function useTypingMap(): Record<string, boolean> {
  return useSyncExternalStore(
    subscribeTyping,
    () => typing,
    () => typing,
  );
}

/** Listen for incoming messages / reactions (used for sound effects). */
export function onMessagesEvent(fn: (e: MessagesEvent) => void) {
  eventListeners.add(fn);
  return () => {
    eventListeners.delete(fn);
  };
}

/** Total unread messages across all conversations (for the Dock badge). */
export function useMessagesUnread(): number {
  return useSyncExternalStore(
    subscribe,
    () => getState().conversations.reduce((n, c) => n + unreadCount(c), 0),
    () => 0,
  );
}

let latestCache: { src: MessagesState; value: { from: string; text: string } | null } | null = null;
function latestUnread(): { from: string; text: string } | null {
  const s = getState();
  if (latestCache && latestCache.src === s) return latestCache.value;
  let best: { from: string; text: string; ts: number } | null = null;
  for (const c of s.conversations) {
    for (const m of c.messages) {
      if (m.from === "them" && m.ts > c.lastReadTs && (!best || m.ts > best.ts)) best = { from: c.name, text: m.text, ts: m.ts };
    }
  }
  const value = best ? { from: best.from, text: best.text } : null;
  latestCache = { src: s, value };
  return value;
}

/** Most recent unread message (for a Notification Center card), or null. */
export function useLatestUnread(): { from: string; text: string } | null {
  return useSyncExternalStore(subscribe, latestUnread, () => null);
}
