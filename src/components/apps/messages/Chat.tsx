"use client";

/* eslint-disable @next/next/no-img-element -- small static SVG assets */

import { Fragment, useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday, differenceInCalendarDays } from "date-fns";
import { ArrowUp, ChevronLeft } from "lucide-react";
import { react, type Conversation, type Message, type ReactionType } from "@/lib/messages";

export const REACTIONS: ReactionType[] = ["heart", "like", "dislike", "laugh", "emphasize", "question"];

export const AVATAR_BG: Record<string, string> = {
  sarthak: "bg-gradient-to-b from-sky-400 to-blue-600",
  terminal: "bg-gradient-to-b from-neutral-500 to-neutral-800",
  weather: "bg-gradient-to-b from-sky-300 to-indigo-500",
};

export function Avatar({ conv, size }: { conv: Pick<Conversation, "bot" | "initials">; size: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg" ? "h-14 w-14 text-[20px]" : size === "md" ? "h-10 w-10 text-[15px]" : "h-7 w-7 text-[11px]";
  return (
    <div className={`flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ${cls} ${AVATAR_BG[conv.bot] ?? AVATAR_BG.sarthak}`}>
      {conv.initials}
    </div>
  );
}

export function formatListTime(ts: number) {
  const d = new Date(ts);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, "EEEE");
  return format(d, "d/M/yy");
}

function formatSeparator(ts: number) {
  const d = new Date(ts);
  if (isToday(d)) return `Today ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "EEE, d MMM 'at' h:mm a");
}

const TOKEN = /(`[^`]+`|https?:\/\/[^\s]+|[\w.+-]+@[\w-]+\.[\w.]+)/g;

function RichText({ text, me }: { text: string; me: boolean }) {
  const parts = text.split(TOKEN);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{p}</Fragment>;
        if (p.startsWith("`"))
          return (
            <code key={i} className={me ? "rounded bg-white/20 px-1 font-mono text-[12px]" : "rounded bg-black/10 px-1 font-mono text-[12px] dark:bg-white/15"}>
              {p.slice(1, -1)}
            </code>
          );
        const href = p.includes("@") && !p.startsWith("http") ? `mailto:${p}` : p;
        return (
          <a key={i} href={href} target="_blank" rel="noreferrer" className="break-all underline" onDoubleClick={(e) => e.stopPropagation()}>
            {p.replace(/^https?:\/\//, "")}
          </a>
        );
      })}
    </>
  );
}

type Props = {
  conv: Conversation;
  typing: boolean;
  theme: "light" | "dark";
  mobile?: boolean;
  onBack?: () => void;
  onSend: (text: string) => void;
  /** composing a new message: shows a "To:" header */
  composeTo?: string;
};

export function Chat({ conv, typing, theme, mobile, onBack, onSend, composeTo }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [picker, setPicker] = useState<string | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);

  const msgs = conv.messages;
  const lastMine = [...msgs].reverse().find((m) => m.from === "me");

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs.length, typing, conv.id, conv.suggestions]);

  useEffect(() => {
    if (!mobile) inputRef.current?.focus();
  }, [conv.id, mobile]);

  const send = (text: string) => {
    if (!text.trim()) return;
    onSend(text);
    setDraft("");
  };

  const reactionSrc = (m: Message) => {
    if (!m.reaction) return "";
    const orientation = m.from === "me" ? "left" : "right";
    const variant = m.reaction.from === "me" ? `${theme}-blue` : theme;
    return `/messages/reactions/${orientation}-${variant}-${m.reaction.type}.svg`;
  };

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-[#1e1e1e]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-black/5 px-3 py-2 dark:border-white/10">
        {mobile && onBack && (
          <button type="button" onClick={onBack} className="flex items-center text-[15px] text-[#0b84fe]" aria-label="Back">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {composeTo ? (
          <div className="flex items-center gap-2 text-[13px]">
            <span className="text-neutral-500">To:</span>
            <span className="rounded-md bg-[#0b84fe]/10 px-2 py-0.5 font-medium text-[#0b84fe]">{composeTo}</span>
          </div>
        ) : (
          <div className={mobile ? "flex flex-1 flex-col items-center pr-6" : "flex items-center gap-2"}>
            <Avatar conv={conv} size="sm" />
            <span className="text-[13px] font-medium">{conv.name}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-3" onClick={() => setPicker(null)}>
        {composeTo ? (
          <div className="flex h-full items-center justify-center text-center text-[13px] text-neutral-400">
            Say hi — Sarthak (well, a scripted version of him) usually replies fast.
          </div>
        ) : (
          msgs.map((m, i) => {
            const prev = msgs[i - 1];
            const nextMsg = msgs[i + 1];
            const showTime = !prev || m.ts - prev.ts > 15 * 60_000;
            const lastInGroup = !nextMsg || nextMsg.from !== m.from || nextMsg.ts - m.ts > 15 * 60_000;
            const firstInGroup = !prev || prev.from !== m.from || showTime;
            const me = m.from === "me";
            const bubble = me
              ? "relative inline-block max-w-full whitespace-pre-wrap break-words rounded-[18px] bg-[#0b84fe] px-3 py-[7px] text-left text-[14px] leading-[1.35] text-white"
              : "relative inline-block max-w-full whitespace-pre-wrap break-words rounded-[18px] bg-[#e9e9eb] px-3 py-[7px] text-left text-[14px] leading-[1.35] text-black dark:bg-[#3b3b3d] dark:text-white";
            const tail = !lastInGroup
              ? ""
              : me
                ? "before:absolute before:bottom-0 before:-right-[7px] before:h-5 before:w-5 before:rounded-bl-[16px_14px] before:bg-[#0b84fe] before:content-[''] after:absolute after:bottom-0 after:-right-[10px] after:h-5 after:w-[10px] after:rounded-bl-[10px] after:bg-white after:content-[''] dark:after:bg-[#1e1e1e]"
                : "before:absolute before:bottom-0 before:-left-[7px] before:h-5 before:w-5 before:rounded-br-[16px_14px] before:bg-[#e9e9eb] before:content-[''] after:absolute after:bottom-0 after:-left-[10px] after:h-5 after:w-[10px] after:rounded-br-[10px] after:bg-white after:content-[''] dark:before:bg-[#3b3b3d] dark:after:bg-[#1e1e1e]";
            return (
              <Fragment key={m.id}>
                {showTime && <div className="py-2 text-center text-[11px] font-medium text-neutral-400">{formatSeparator(m.ts)}</div>}
                <div className={`${me ? "flex justify-end" : "flex justify-start"} ${firstInGroup ? "mt-2" : "mt-[2px]"} ${m.reaction ? "pt-3" : ""}`}>
                  <div className={me ? "relative flex max-w-[75%] flex-col items-end" : "relative flex max-w-[75%] flex-col items-start"}>
                    <div
                      className={`${bubble} ${tail} cursor-default select-text`}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setPicker(m.id);
                      }}
                      onTouchStart={() => {
                        longPress.current = setTimeout(() => setPicker(m.id), 450);
                      }}
                      onTouchEnd={() => {
                        if (longPress.current) clearTimeout(longPress.current);
                      }}
                      onTouchMove={() => {
                        if (longPress.current) clearTimeout(longPress.current);
                      }}
                    >
                      <span className="relative z-10">
                        <RichText text={m.text} me={me} />
                      </span>
                    </div>
                    {m.reaction && (
                      <img
                        src={reactionSrc(m)}
                        alt={m.reaction.type}
                        className={me ? "pointer-events-none absolute -left-4 -top-4 z-20 h-8 w-8" : "pointer-events-none absolute -right-4 -top-4 z-20 h-8 w-8"}
                      />
                    )}
                    {picker === m.id && (
                      <div
                        className={
                          me
                            ? "absolute bottom-full right-0 z-30 mb-2 flex gap-1 rounded-full border border-black/5 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-neutral-700"
                            : "absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-full border border-black/5 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-neutral-700"
                        }
                        onClick={(e) => e.stopPropagation()}
                      >
                        {REACTIONS.map((r) => {
                          const active = m.reaction?.from === "me" && m.reaction.type === r;
                          return (
                            <button
                              key={r}
                              type="button"
                              aria-label={r}
                              onClick={() => {
                                react(conv.id, m.id, active ? null : r);
                                setPicker(null);
                              }}
                              className={
                                active
                                  ? "flex h-8 w-8 items-center justify-center rounded-full bg-[#0b84fe]"
                                  : "flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                              }
                            >
                              <img src={`/messages/reactions/${r}-${active || theme === "dark" ? "white" : "gray"}.svg`} alt="" className="h-4 w-4" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {lastMine && m.id === lastMine.id && i === msgs.length - 1 && (
                      <div className="mt-0.5 pr-1 text-[11px] text-neutral-400">{conv.seenTs >= m.ts ? "Read" : "Delivered"}</div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })
        )}
        {typing && !composeTo && (
          <div className="mt-2 flex justify-start">
            <div className="relative h-[44px] w-[60px]">
              <img src={`/messages/typing-bubbles/typing-${theme}.svg`} alt="" className="h-full w-full" />
              <div className="absolute left-[5px] top-0 flex h-[40px] w-[55px] items-center justify-center gap-[5px]">
                <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {!composeTo && !typing && conv.suggestions && conv.suggestions.length > 0 && msgs[msgs.length - 1]?.from === "them" && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-3 pb-2">
          {conv.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="shrink-0 rounded-full border border-[#0b84fe]/40 px-3 py-1 text-[12px] text-[#0b84fe] hover:bg-[#0b84fe]/10"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        className="flex shrink-0 items-end gap-2 border-t border-black/5 px-3 py-2 dark:border-white/10"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <div className="flex min-h-[30px] flex-1 items-end rounded-[16px] border border-black/15 px-3 py-[5px] dark:border-white/20">
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="iMessage"
            className="max-h-24 w-full resize-none bg-transparent text-[14px] leading-5 outline-none placeholder:text-neutral-400"
          />
        </div>
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send"
          className="mb-[3px] flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b84fe] text-white disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </form>
    </div>
  );
}
