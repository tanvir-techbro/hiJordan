"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  Search,
  Send,
  Settings,
  Smile,
  SquarePen,
  X,
} from "lucide-react";
import { clockTime, dayLabel, messagePreview, relativeTime } from "@/lib/format";
import type {
  ChatMessage,
  ConversationSummary,
  PublicUser,
} from "@/lib/types";
import Avatar from "./Avatar";
import EmojiPicker from "./EmojiPicker";
import NewMessageDialog from "./NewMessageDialog";

export default function MessagesApp({
  currentUser,
  initialConversations,
  initialSelectedId,
}: {
  currentUser: PublicUser;
  initialConversations: ConversationSummary[];
  initialSelectedId?: string | null;
}) {
  const [conversations, setConversations] =
    useState<ConversationSummary[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(
    Boolean(initialSelectedId),
  );
  const [composerOpen, setComposerOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const messageSeq = useRef(0);
  const nearBottom = useRef(true);
  const lastMarkedMessage = useRef<Record<string, string>>({});
  const messageCache = useRef<Map<string, ChatMessage[]>>(new Map());
  const selectedIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const markRead = useCallback(async (conversationId: string) => {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId && conversation.unreadCount > 0
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );

    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: "POST",
      });
    } catch {
      // The next conversation poll will restore the unread count if this fails.
    }
  }, []);

  const loadMessages = useCallback(
    async (conversationId: string, withLoading = false) => {
      const sequence = ++messageSeq.current;
      if (withLoading) setMessagesLoading(true);

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Could not load messages.");

        const data = (await response.json()) as { messages: ChatMessage[] };
        if (sequence !== messageSeq.current) return;

        setMessages((current) => {
          const pending = current.filter((message) =>
            message.id.startsWith("temp-"),
          );
          const next = [...data.messages, ...pending];
          messageCache.current.set(conversationId, next);
          return next;
        });

        const last = data.messages[data.messages.length - 1];
        if (
          last &&
          last.senderId !== currentUser.id &&
          lastMarkedMessage.current[conversationId] !== last.id
        ) {
          lastMarkedMessage.current[conversationId] = last.id;
          void markRead(conversationId);
        }
      } catch {
        if (withLoading) setError("Couldn't load messages.");
      } finally {
        if (withLoading && sequence === messageSeq.current) {
          setMessagesLoading(false);
        }
      }
    },
    [currentUser.id, markRead],
  );

  const refreshConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const data = (await response.json()) as {
        conversations: ConversationSummary[];
      };
      setConversations(data.conversations);
    } catch {
      // Keep the current list when the network is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      messageSeq.current += 1;
      setMessages([]);
      return;
    }

    nearBottom.current = true;
    const cached = messageCache.current.get(selectedId);
    if (cached) {
      // Show the conversation immediately, then refresh in the background.
      setMessages(cached);
      setMessagesLoading(false);
      void loadMessages(selectedId, false);
    } else {
      setMessages([]);
      setMessagesLoading(true);
      void loadMessages(selectedId, true);
    }
  }, [selectedId, loadMessages]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refreshConversations();
      if (selectedId) void loadMessages(selectedId);
    };

    const interval = window.setInterval(tick, 4000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
    };
  }, [selectedId, refreshConversations, loadMessages]);

  useEffect(() => {
    if (selectedId && !conversations.some((item) => item.id === selectedId)) {
      setSelectedId(null);
      setMessages([]);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (emojiOpen) {
        setEmojiOpen(false);
      } else if (composerOpen) {
        setComposerOpen(false);
      } else {
        setMobileChatOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [composerOpen, emojiOpen]);

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  useEffect(() => {
    if (!nearBottom.current) return;
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, selectedId]);

  const sorted = useMemo(
    () =>
      [...conversations].sort((left, right) => {
        const leftTime = left.lastMessage?.createdAt ?? left.updatedAt;
        const rightTime = right.lastMessage?.createdAt ?? right.updatedAt;
        return new Date(rightTime).getTime() - new Date(leftTime).getTime();
      }),
    [conversations],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter((conversation) => {
      const haystack = `${conversation.peer.nickname} ${
        conversation.peer.username
      } ${conversation.lastMessage?.body ?? ""}`;
      return haystack.toLowerCase().includes(needle);
    });
  }, [search, sorted]);

  const selected =
    conversations.find((conversation) => conversation.id === selectedId) ??
    null;
  const unreadTotal = conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );

  const openConversation = (id: string) => {
    setSelectedId(id);
    setDraft("");
    setError(null);
    setEmojiOpen(false);
    setMobileChatOpen(true);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleCreated = (
    conversationId: string,
    peer: PublicUser,
  ) => {
    setComposerOpen(false);
    setConversations((current) => {
      if (current.some((conversation) => conversation.id === conversationId)) {
        return current;
      }
      return [
        {
          id: conversationId,
          peer,
          lastMessage: null,
          unreadCount: 0,
          updatedAt: new Date().toISOString(),
          peerLastReadAt: null,
          peerLastSeenAt: null,
          peerOnline: false,
        },
        ...current,
      ];
    });
    setSelectedId(conversationId);
    setMobileChatOpen(true);
    void refreshConversations();
  };

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;

    setDraft(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      input?.focus();
      const caret = start + emoji.length;
      input?.setSelectionRange(caret, caret);
    });
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;

    setEmojiOpen(false);
    const conversationId = selectedId;
    const temporaryId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const temporaryMessage: ChatMessage = {
      id: temporaryId,
      conversationId,
      senderId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
    };

    setDraft("");
    setError(null);
    setSending(true);
    nearBottom.current = true;
    setMessages((current) => {
      const next = [...current, temporaryMessage];
      messageCache.current.set(conversationId, next);
      return next;
    });
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              lastMessage: temporaryMessage,
              updatedAt: temporaryMessage.createdAt,
            }
          : conversation,
      ),
    );

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        },
      );
      const data = (await response.json().catch(() => null)) as
        | { message?: ChatMessage; error?: string }
        | null;

      if (!response.ok || !data?.message) {
        throw new Error(data?.error ?? "Message failed to send.");
      }

      const saved = data.message;
      if (selectedIdRef.current === conversationId) {
        setMessages((current) => {
          const withoutTemporary = current.filter(
            (message) => message.id !== temporaryId,
          );
          if (withoutTemporary.some((message) => message.id === saved.id)) {
            messageCache.current.set(conversationId, withoutTemporary);
            return withoutTemporary;
          }
          const next = [...withoutTemporary, saved];
          messageCache.current.set(conversationId, next);
          return next;
        });
      }
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessage: saved,
                updatedAt: saved.createdAt,
              }
            : conversation,
        ),
      );
      lastMarkedMessage.current[conversationId] = saved.id;
      void markRead(conversationId);
      requestAnimationFrame(() => inputRef.current?.focus());
    } catch (caught) {
      if (selectedIdRef.current === conversationId) {
        setMessages((current) =>
          current.filter((message) => message.id !== temporaryId),
        );
        setDraft(text);
      }
      setError(
        caught instanceof Error ? caught.message : "Message failed to send.",
      );
      void refreshConversations();
    } finally {
      setSending(false);
    }
  };

  const handleScroll = () => {
    const element = scrollRef.current;
    if (!element) return;
    nearBottom.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  };

  return (
    <div className="h-dvh w-full overflow-hidden bg-surface">
      <div className="mx-auto flex h-dvh w-full overflow-hidden bg-surface">
        <aside
          className={`${
            mobileChatOpen ? "hidden" : "flex"
          } w-full shrink-0 flex-col border-r border-line bg-surface sm:flex sm:w-[380px]`}
        >
          <div className="shrink-0 px-5 pb-3 pt-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="font-script text-[34px] leading-none tracking-[-0.01em] text-ink">
                HiJordan
              </h1>
              <Link
                href="/settings"
                aria-label="Settings"
                className="grid size-8 place-items-center rounded-full text-ink transition hover:bg-hover"
              >
                <Settings size={19} strokeWidth={1.7} />
              </Link>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Avatar
                seed={currentUser.username}
                label={currentUser.nickname}
                size={40}
              />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold leading-[18px] text-ink">
                  {currentUser.nickname}
                </p>
                <p className="truncate text-[11px] leading-4 text-muted">
                  @{currentUser.username}
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-ink">
                Messages
              </h2>
              <div className="flex items-center gap-2">
                {unreadTotal > 0 ? (
                  <span className="text-[11px] text-muted">
                    {unreadTotal} new
                  </span>
                ) : null}
                <button
                  onClick={() => setComposerOpen(true)}
                  aria-label="New message"
                  className="grid size-8 place-items-center rounded-full text-ink transition hover:bg-hover"
                >
                  <SquarePen size={19} strokeWidth={1.7} />
                </button>
              </div>
            </div>

            <div className="relative mt-3">
              <Search
                size={15}
                strokeWidth={2}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                aria-label="Search conversations"
                className="h-9 w-full rounded-lg bg-subtle pl-9 pr-9 text-[13px] text-ink outline-none transition placeholder:text-muted focus:bg-hover"
              />
              {search ? (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-faint text-white transition hover:bg-strong"
                >
                  <X size={12} strokeWidth={3} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="thin-scrollbar flex-1 overflow-y-auto pb-2">
            {filtered.length > 0 ? (
              filtered.map((conversation) => {
                const active = conversation.id === selectedId;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => openConversation(conversation.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                      active ? "bg-hover" : "hover:bg-subtle"
                    }`}
                  >
                    <Avatar
                      seed={conversation.peer.username}
                      label={conversation.peer.nickname}
                      size={52}
                      online={conversation.peerOnline}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p
                          className={`truncate text-[14px] leading-[18px] text-ink ${
                            conversation.unreadCount > 0
                              ? "font-semibold"
                              : "font-medium"
                          }`}
                        >
                          {conversation.peer.nickname}
                        </p>
                        {conversation.lastMessage ? (
                          <span
                            suppressHydrationWarning
                            className="shrink-0 text-[11px] leading-[17px] text-muted"
                          >
                            {mounted
                              ? relativeTime(conversation.lastMessage.createdAt)
                              : ""}
                          </span>
                        ) : null}
                      </div>

                      <p className="truncate text-[11.5px] leading-4 text-muted">
                        @{conversation.peer.username}
                      </p>

                      <div className="flex items-center gap-2">
                        <p
                          className={`min-w-0 flex-1 truncate text-[13px] leading-[17px] ${
                            conversation.unreadCount > 0
                              ? "font-medium text-ink"
                              : "text-muted"
                          }`}
                        >
                          {messagePreview(
                            conversation.lastMessage,
                            currentUser.id,
                          )}
                        </p>
                        {conversation.unreadCount > 0 ? (
                          <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-[#3797f0] px-1 text-[10px] font-semibold leading-none text-white">
                            {conversation.unreadCount > 9
                              ? "9+"
                              : conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-[14px] font-medium text-ink">
                  {search.trim() ? "No results found." : "No messages yet."}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-muted">
                  {search.trim()
                    ? "Try searching for a name or username."
                    : "Find someone and start a conversation."}
                </p>
                <button
                  onClick={() => setComposerOpen(true)}
                  className="mt-4 text-[13px] font-semibold text-accent transition hover:text-accent-hover"
                >
                  New message
                </button>
              </div>
            )}
          </div>
        </aside>

        <main
          className={`${
            mobileChatOpen ? "flex" : "hidden"
          } min-w-0 flex-1 flex-col bg-surface sm:flex`}
        >
          {selected ? (
            <>
              <header className="flex h-[70px] shrink-0 items-center gap-3 border-b border-line-soft px-4">
                <button
                  onClick={() => setMobileChatOpen(false)}
                  aria-label="Back to messages"
                  className="-ml-1 grid size-8 place-items-center rounded-full text-ink transition hover:bg-hover sm:hidden"
                >
                  <ChevronLeft size={22} strokeWidth={1.8} />
                </button>
                <Avatar
                  seed={selected.peer.username}
                  label={selected.peer.nickname}
                  size={38}
                  online={selected.peerOnline}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold leading-[18px] text-ink">
                    {selected.peer.nickname}
                  </p>
                  <p
                    suppressHydrationWarning
                    className="mt-0.5 truncate text-[12px] leading-4 text-muted"
                  >
                    @{selected.peer.username}
                    {selected.peerOnline ? (
                      <>
                        {" · "}
                        <span className="font-medium text-success">
                          Active now
                        </span>
                      </>
                    ) : selected.peerLastSeenAt ? (
                      ` · Active ${relativeTime(selected.peerLastSeenAt)} ago`
                    ) : (
                      " · Offline"
                    )}
                  </p>
                </div>
                <span className="hidden shrink-0 text-[11px] text-faint sm:block">
                  Direct message
                </span>
              </header>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="thin-scrollbar flex-1 overflow-y-auto"
              >
                <div className="mx-auto flex min-h-full w-full max-w-[700px] flex-col justify-end px-4 py-3">
                  {messagesLoading && messages.length === 0 ? (
                    <p className="py-10 text-center text-[12px] text-muted">
                      Loading messages…
                    </p>
                  ) : null}

                  {!messagesLoading && messages.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-[14px] font-medium text-ink">
                        No messages yet
                      </p>
                      <p className="mt-1 text-[12px] text-muted">
                        Say hello to {selected.peer.nickname}.
                      </p>
                    </div>
                  ) : null}

                  {messages.map((message, index) => {
                    const previous = messages[index - 1];
                    const day = dayLabel(message.createdAt);
                    const showDay =
                      index === 0 ||
                      dayLabel(previous.createdAt) !== day;
                    const mine = message.senderId === currentUser.id;
                    const isLast = index === messages.length - 1;
                    const seen =
                      isLast &&
                      mine &&
                      selected.peerLastReadAt !== null &&
                      new Date(selected.peerLastReadAt).getTime() >=
                        new Date(message.createdAt).getTime();

                    return (
                      <Fragment key={message.id}>
                        {showDay ? <TimeDivider iso={message.createdAt} /> : null}
                        <Bubble
                          message={message}
                          mine={mine}
                          newGroup={
                            !previous || previous.senderId !== message.senderId
                          }
                        />
                        {isLast && mine ? (
                          <p
                            suppressHydrationWarning
                            className="mt-1 pr-1 text-right text-[10.5px] leading-4 text-muted"
                          >
                            {message.id.startsWith("temp-")
                              ? "Sending…"
                              : seen
                                ? "Seen"
                                : "Sent"}
                          </p>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="shrink-0 border-t border-line-soft px-3 py-3 sm:px-4">
                <div className="relative mx-auto flex max-w-[700px] items-center gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-line px-2.5 py-[5px] transition focus-within:border-strong">
                    <button
                      type="button"
                      onClick={() => setEmojiOpen((current) => !current)}
                      onMouseDown={(event) => event.stopPropagation()}
                      aria-label="Insert emoji"
                      aria-expanded={emojiOpen}
                      className="grid size-8 shrink-0 place-items-center rounded-full text-ink transition hover:bg-hover"
                    >
                      <Smile size={22} strokeWidth={1.6} />
                    </button>
                    <input
                      ref={inputRef}
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void send();
                        }
                      }}
                      placeholder="Message..."
                      aria-label={`Message ${selected.peer.nickname}`}
                      className="h-6 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
                    />
                  </div>
                  {draft.trim() ? (
                    <button
                      onClick={() => void send()}
                      disabled={sending}
                      className="shrink-0 text-[14px] font-semibold text-accent transition hover:text-accent-hover disabled:opacity-60"
                    >
                      Send
                    </button>
                  ) : null}

                  {emojiOpen ? (
                    <EmojiPicker
                      onPick={insertEmoji}
                      onClose={() => setEmojiOpen(false)}
                    />
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="grid size-[96px] place-items-center rounded-full border-2 border-ink text-ink">
                <Send size={40} strokeWidth={1.2} className="-translate-x-0.5" />
              </span>
              <h2 className="mt-5 text-[20px] font-light text-ink">
                Your messages
              </h2>
              <p className="mt-1 text-[13px] text-muted">
                Send a message to start a chat.
              </p>
              <button
                onClick={() => setComposerOpen(true)}
                className="mt-4 text-[13px] font-semibold text-accent transition hover:text-accent-hover"
              >
                New message
              </button>
            </div>
          )}
        </main>
      </div>

      {composerOpen ? (
        <NewMessageDialog
          onClose={() => setComposerOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}

      {error ? (
        <div
          role="alert"
          className="pointer-events-none fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-inverse px-4 py-2 text-[12px] font-medium text-inverse-ink shadow-lg"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

function TimeDivider({ iso }: { iso: string }) {
  return (
    <div
      suppressHydrationWarning
      className="py-3 text-center text-[10.5px] font-medium text-muted"
    >
      {dayLabel(iso)} {clockTime(iso)}
    </div>
  );
}

function Bubble({
  message,
  mine,
  newGroup,
}: {
  message: ChatMessage;
  mine: boolean;
  newGroup: boolean;
}) {
  return (
    <div
      className={`flex ${mine ? "justify-end" : "justify-start"} ${
        newGroup ? "mt-2.5" : "mt-[3px]"
      }`}
    >
      <div
        suppressHydrationWarning
        title={`${dayLabel(message.createdAt)} ${clockTime(message.createdAt)}`}
        className={`max-w-[75%] whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2 text-[14px] leading-[1.4] ${
          mine ? "bg-[#3797f0] text-white" : "bg-bubble text-ink"
        } ${message.id.startsWith("temp-") ? "opacity-70" : ""}`}
      >
        {message.body}
      </div>
    </div>
  );
}
