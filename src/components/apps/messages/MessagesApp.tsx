"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Pin, PinOff, Search, SquarePen, Trash2 } from "lucide-react";
import type { AppProps } from "@/components/desktop/types";
import { useWindowSelf } from "@/components/desktop/WindowManager";
import { useSettings } from "@/lib/settings";
import {
  deleteConversation,
  ensureSarthakConversation,
  markRead,
  onMessagesEvent,
  sendMessage,
  togglePin,
  unreadCount,
  useMessagesState,
  useTypingMap,
  type Conversation,
} from "@/lib/messages";
import { playSfx } from "@/components/apps/music/persisted-store";
import { Avatar, Chat, formatListTime } from "./Chat";

const SFX = {
  sent: "/messages/sound-effects/sent.m4a",
  received: "/messages/sound-effects/received.m4a",
  reaction: "/messages/sound-effects/reaction.m4a",
  unread: "/messages/sound-effects/unread.m4a",
};

export function MessagesApp({ metadata, mobile }: AppProps) {
  const { conversations } = useMessagesState();
  const typingMap = useTypingMap();
  const { isFocused } = useWindowSelf();
  const { settings, resolvedTheme } = useSettings();
  const initial = typeof metadata.conversationId === "string" ? metadata.conversationId : mobile ? null : "sarthak";
  const [selectedId, setSelectedId] = useState<string | null>(initial);
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? (mobile ? null : (conversations[0] ?? null));
  const muted = settings.focus;

  // Mark the open conversation as read while the window is focused.
  const selectedUnread = selected ? unreadCount(selected) : 0;
  useEffect(() => {
    if (selected && isFocused && !composing && selectedUnread > 0) markRead(selected.id);
  }, [selected, isFocused, composing, selectedUnread]);

  // Sound effects for incoming messages / reactions.
  useEffect(() => {
    return onMessagesEvent((e) => {
      if (e.type === "reaction") playSfx(SFX.reaction, settings.volume, muted);
      else playSfx(e.conversationId === selected?.id && isFocused ? SFX.received : SFX.unread, settings.volume, muted);
    });
  }, [settings.volume, muted, selected?.id, isFocused]);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? conversations.filter((c) => c.name.toLowerCase().includes(q) || c.messages.some((m) => m.text.toLowerCase().includes(q)))
      : conversations;
    return [...list].sort((a, b) => (b.messages.at(-1)?.ts ?? 0) - (a.messages.at(-1)?.ts ?? 0));
  }, [conversations, query]);

  const pinned = query ? [] : sorted.filter((c) => c.pinned);
  const others = query ? sorted : sorted.filter((c) => !c.pinned);

  const open = (id: string) => {
    setComposing(false);
    setSelectedId(id);
    setMenu(null);
  };

  const onSend = (convId: string) => (text: string) => {
    playSfx(SFX.sent, settings.volume, muted);
    sendMessage(convId, text);
  };

  const compose = () => {
    setComposing(true);
    setSelectedId(ensureSarthakConversation());
  };

  const showList = !mobile || (!selected && !composing);
  const showChat = !mobile || !!selected || composing;
  const sarthak = conversations.find((c) => c.id === "sarthak");

  return (
    <div className="relative flex h-full bg-white text-[13px] text-neutral-900 dark:bg-[#1e1e1e] dark:text-neutral-100" onClick={() => setMenu(null)}>
      {showList && (
        <aside
          className={
            mobile
              ? "flex w-full flex-col bg-white dark:bg-[#1e1e1e]"
              : "flex w-[270px] shrink-0 flex-col border-r border-black/5 bg-neutral-50/80 dark:border-white/10 dark:bg-neutral-900/60"
          }
        >
          <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-3">
            <label className="flex flex-1 items-center gap-1.5 rounded-md bg-black/5 px-2 py-1 dark:bg-white/10">
              <Search className="h-3.5 w-3.5 text-neutral-500" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full bg-transparent outline-none placeholder:text-neutral-500" />
            </label>
            <button type="button" onClick={compose} aria-label="New message" title="New message" className="rounded-md p-1 text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10">
              <SquarePen className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {pinned.length > 0 && (
              <div className="grid grid-cols-3 gap-1 pb-2 pt-1">
                {pinned.map((c) => {
                  const active = !mobile && selected?.id === c.id && !composing;
                  const unread = unreadCount(c);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => open(c.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setMenu({ id: c.id, x: e.clientX, y: e.clientY });
                      }}
                      className={active ? "relative flex flex-col items-center gap-1 rounded-lg bg-[#0b84fe] px-1 py-2 text-white" : "relative flex flex-col items-center gap-1 rounded-lg px-1 py-2 hover:bg-black/5 dark:hover:bg-white/5"}
                    >
                      <div className="relative">
                        <Avatar conv={c} size="lg" />
                        {unread > 0 && <span className="absolute -left-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#0b84fe] dark:border-neutral-900" />}
                        {typingMap[c.id] && (
                          <span className="absolute -right-2 -top-1 flex gap-0.5 rounded-full bg-[#e9e9eb] px-1.5 py-1 dark:bg-[#3b3b3d]">
                            <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-500" />
                            <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-500 [animation-delay:0.15s]" />
                            <span className="h-1 w-1 animate-bounce rounded-full bg-neutral-500 [animation-delay:0.3s]" />
                          </span>
                        )}
                      </div>
                      <span className="w-full truncate text-center text-[11px]">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {others.map((c) => (
              <ConversationRow
                key={c.id}
                conv={c}
                active={!mobile && selected?.id === c.id && !composing}
                typing={!!typingMap[c.id]}
                onClick={() => open(c.id)}
                onMenu={(x, y) => setMenu({ id: c.id, x, y })}
              />
            ))}
            {sorted.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-neutral-400">
                <MessageSquare className="h-6 w-6" />
                {query ? "No results" : "No conversations"}
              </div>
            )}
          </div>
        </aside>
      )}

      {showChat &&
        (composing && sarthak ? (
          <Chat
            conv={{ ...sarthak, messages: [] }}
            composeTo="Sarthak"
            typing={false}
            theme={resolvedTheme}
            mobile={mobile}
            onBack={() => {
              setComposing(false);
              setSelectedId(null);
            }}
            onSend={(t) => {
              onSend("sarthak")(t);
              open("sarthak");
            }}
          />
        ) : selected ? (
          <Chat
            key={selected.id}
            conv={selected}
            typing={!!typingMap[selected.id]}
            theme={resolvedTheme}
            mobile={mobile}
            onBack={() => setSelectedId(null)}
            onSend={onSend(selected.id)}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-neutral-400">No conversation selected</div>
        ))}

      {menu && (
        <div
          className="fixed z-50 min-w-40 rounded-lg border border-black/10 bg-white/95 p-1 text-[13px] shadow-xl backdrop-blur dark:border-white/10 dark:bg-neutral-800/95"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const c = conversations.find((x) => x.id === menu.id);
            if (!c) return null;
            return (
              <>
                <MenuItem
                  icon={c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  label={c.pinned ? "Unpin" : "Pin"}
                  onClick={() => {
                    togglePin(c.id);
                    setMenu(null);
                  }}
                />
                <MenuItem
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  label="Delete Conversation"
                  onClick={() => {
                    deleteConversation(c.id);
                    if (selectedId === c.id) setSelectedId(null);
                    setMenu(null);
                  }}
                />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-[#0b84fe] hover:text-white">
      {icon}
      {label}
    </button>
  );
}

function ConversationRow({
  conv,
  active,
  typing,
  onClick,
  onMenu,
}: {
  conv: Conversation;
  active: boolean;
  typing: boolean;
  onClick: () => void;
  onMenu: (x: number, y: number) => void;
}) {
  const last = conv.messages.at(-1);
  const unread = unreadCount(conv);
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.clientX, e.clientY);
      }}
      className={active ? "flex w-full items-center gap-2 rounded-lg bg-[#0b84fe] px-2 py-2 text-left text-white" : "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5"}
    >
      <span className={unread > 0 ? "h-2.5 w-2.5 shrink-0 rounded-full bg-[#0b84fe]" : "h-2.5 w-2.5 shrink-0"} />
      <Avatar conv={conv} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-semibold">{conv.name}</span>
          {last && <span className={active ? "shrink-0 text-[11px] text-white/80" : "shrink-0 text-[11px] text-neutral-400"}>{formatListTime(last.ts)}</span>}
        </div>
        <div className={active ? "line-clamp-2 text-[12px] leading-snug text-white/85" : "line-clamp-2 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400"}>
          {typing ? "typing…" : (last?.text ?? "")}
        </div>
      </div>
    </button>
  );
}
