"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  Copy,
  MoreVertical,
  Pencil,
  Reply,
  Search,
  Send,
  Settings,
  Smile,
  SquarePen,
  Trash2,
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
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [menu, setMenu] = useState<{
    message: ChatMessage;
    x: number;
    y: number;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChatMessage | null>(null);

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
      if (menu) {
        setMenu(null);
      } else if (confirmDelete) {
        setConfirmDelete(null);
      } else if (editing) {
        setEditing(null);
        setDraft("");
      } else if (replyTarget) {
        setReplyTarget(null);
      } else if (emojiOpen) {
        setEmojiOpen(false);
      } else if (composerOpen) {
        setComposerOpen(false);
      } else {
        setMobileChatOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [composerOpen, emojiOpen, menu, confirmDelete, editing, replyTarget]);

  useEffect(() => {
    if (!menu && !confirmDelete) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        target?.closest(
          "[data-message-menu], [data-delete-dialog], [data-message-menu-trigger]",
        )
      ) {
        return;
      }
      setMenu(null);
      setConfirmDelete(null);
    };
    const close = () => setMenu(null);

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menu, confirmDelete]);

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
    setReplyTarget(null);
    setEditing(null);
    setMenu(null);
    setConfirmDelete(null);
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

  const senderNameFor = (message: ChatMessage) =>
    message.senderId === currentUser.id
      ? currentUser.nickname
      : selected?.peer.nickname ?? "Unknown";

  const openMessageMenu = (message: ChatMessage, x: number, y: number) => {
    if (message.id.startsWith("temp-")) return;
    const mine = message.senderId === currentUser.id;
    const width = 190;
    const height = mine ? 214 : 140;
    setMenu((current) =>
      current?.message.id === message.id
        ? null
        : {
            message,
            x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
            y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
          },
    );
  };

  const startReply = (message: ChatMessage) => {
    setMenu(null);
    setEditing(null);
    setDraft("");
    setReplyTarget(message);
    setEmojiOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const startEdit = (message: ChatMessage) => {
    if (message.senderId !== currentUser.id) return;
    setMenu(null);
    setReplyTarget(null);
    setEditing(message);
    setDraft(message.body);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      const end = message.body.length;
      inputRef.current?.setSelectionRange(end, end);
    });
  };

  const cancelComposerMode = () => {
    if (editing) {
      setEditing(null);
      setDraft("");
    }
    setReplyTarget(null);
  };

  const copyMessage = async (message: ChatMessage) => {
    setMenu(null);
    try {
      await navigator.clipboard.writeText(message.body);
    } catch {
      const area = document.createElement("textarea");
      area.value = message.body;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  };

  const deleteMessageAndRefresh = async (message: ChatMessage) => {
    setConfirmDelete(null);
    setMenu(null);

    const conversationId = message.conversationId;
    const previous = messages;
    const next = previous.filter((item) => item.id !== message.id);

    setMessages(next);
    messageCache.current.set(conversationId, next);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              lastMessage: next[next.length - 1] ?? null,
            }
          : conversation,
      ),
    );
    if (replyTarget?.id === message.id) setReplyTarget(null);
    if (editing?.id === message.id) {
      setEditing(null);
      setDraft("");
    }

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages/${message.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Could not delete the message.");
      }
      void refreshConversations();
    } catch (caught) {
      setMessages(previous);
      messageCache.current.set(conversationId, previous);
      setError(
        caught instanceof Error ? caught.message : "Could not delete the message.",
      );
      void refreshConversations();
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;

    setEmojiOpen(false);
    const conversationId = selectedId;

    if (editing) {
      const target = editing;
      const optimisticAt = new Date().toISOString();

      setError(null);
      setSending(true);
      setDraft("");
      setEditing(null);
      setMessages((current) => {
        const next = current.map((message) =>
          message.id === target.id
            ? { ...message, body: text, editedAt: optimisticAt }
            : message,
        );
        messageCache.current.set(conversationId, next);
        return next;
      });

      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages/${target.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text }),
          },
        );
        const data = (await response.json().catch(() => null)) as
          | { message?: ChatMessage; error?: string }
          | null;

        if (!response.ok || !data?.message) {
          throw new Error(data?.error ?? "Could not edit the message.");
        }

        const saved = data.message;
        if (selectedIdRef.current === conversationId) {
          setMessages((current) => {
            const next = current.map((message) =>
              message.id === target.id ? saved : message,
            );
            messageCache.current.set(conversationId, next);
            return next;
          });
        }
        void refreshConversations();
        requestAnimationFrame(() => inputRef.current?.focus());
      } catch (caught) {
        if (selectedIdRef.current === conversationId) {
          setMessages((current) => {
            const next = current.map((message) =>
              message.id === target.id ? target : message,
            );
            messageCache.current.set(conversationId, next);
            return next;
          });
          setDraft(text);
          setEditing(target);
        }
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not edit the message.",
        );
      } finally {
        setSending(false);
      }
      return;
    }

    const reply = replyTarget;
    const temporaryId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const temporaryMessage: ChatMessage = {
      id: temporaryId,
      conversationId,
      senderId: currentUser.id,
      body: text,
      createdAt: new Date().toISOString(),
      replyTo: reply
        ? {
            id: reply.id,
            body: reply.body,
            senderId: reply.senderId,
            senderName: senderNameFor(reply),
          }
        : null,
      editedAt: null,
    };

    setDraft("");
    setReplyTarget(null);
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
          body: JSON.stringify({ body: text, replyToId: reply?.id ?? null }),
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
        setMessages((current) => {
          const next = current.filter(
            (message) => message.id !== temporaryId,
          );
          messageCache.current.set(conversationId, next);
          return next;
        });
        setDraft(text);
        if (reply) setReplyTarget(reply);
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
                <div className="mx-auto flex min-h-full w-full max-w-[920px] flex-col justify-end px-4 py-3 sm:px-6">
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
                          onOpenMenu={openMessageMenu}
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
                <div className="relative mx-auto w-full max-w-[920px]">
                  {editing || replyTarget ? (
                    <div className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-subtle px-3 py-2">
                      <span className="h-8 w-1 shrink-0 rounded-full bg-accent" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-accent">
                          {editing
                            ? "Editing message"
                            : replyTarget
                              ? `Replying to ${senderNameFor(replyTarget)}`
                              : ""}
                        </p>
                        <p className="truncate text-[12px] leading-4 text-muted">
                          {editing ? editing.body : replyTarget?.body}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={cancelComposerMode}
                        aria-label="Cancel reply or edit"
                        className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition hover:bg-hover hover:text-ink"
                      >
                        <X size={15} strokeWidth={2.2} />
                      </button>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
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
                        placeholder={editing ? "Edit message..." : "Message..."}
                        aria-label={
                          editing
                            ? "Edit message"
                            : `Message ${selected.peer.nickname}`
                        }
                        className="h-6 min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted"
                      />
                    </div>
                    {draft.trim() ? (
                      <button
                        onClick={() => void send()}
                        disabled={sending}
                        className="shrink-0 text-[14px] font-semibold text-accent transition hover:text-accent-hover disabled:opacity-60"
                      >
                        {editing ? "Save" : "Send"}
                      </button>
                    ) : null}
                  </div>

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

      {menu ? (
        <div
          data-message-menu
          role="menu"
          aria-label="Message actions"
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-50 w-[190px] overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-2xl"
        >
          <div
            className="mb-1 border-b border-line-soft px-3 pb-2 pt-1.5"
          >
            <p
              suppressHydrationWarning
              className="text-[11px] font-medium text-muted"
            >
              {dayLabel(menu.message.createdAt)} ·{" "}
              {clockTime(menu.message.createdAt)}
            </p>
          </div>
          <MenuItem
            icon={<Reply size={15} strokeWidth={2} />}
            label="Reply"
            onClick={() => startReply(menu.message)}
          />
          <MenuItem
            icon={<Copy size={15} strokeWidth={2} />}
            label="Copy"
            onClick={() => void copyMessage(menu.message)}
          />
          {menu.message.senderId === currentUser.id ? (
            <>
              <div className="my-1 h-px bg-line-soft" />
              <MenuItem
                icon={<Pencil size={15} strokeWidth={2} />}
                label="Edit"
                onClick={() => startEdit(menu.message)}
              />
              <MenuItem
                icon={<Trash2 size={15} strokeWidth={2} />}
                label="Delete"
                danger
                onClick={() => {
                  setMenu(null);
                  setConfirmDelete(menu.message);
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            data-delete-dialog
            role="dialog"
            aria-modal="true"
            aria-label="Delete message"
            className="w-full max-w-[320px] rounded-2xl border border-line bg-surface p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-ink">
              Delete message?
            </h3>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              This removes the message for everyone in this chat.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-ink transition hover:bg-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteMessageAndRefresh(confirmDelete)}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-[13px] font-semibold text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
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
  onOpenMenu,
}: {
  message: ChatMessage;
  mine: boolean;
  newGroup: boolean;
  onOpenMenu: (message: ChatMessage, x: number, y: number) => void;
}) {
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const cancelLongPress = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    origin.current = null;
  };

  return (
    <div
      className={`group flex ${mine ? "justify-end" : "justify-start"} ${
        newGroup ? "mt-2.5" : "mt-[3px]"
      }`}
    >
      <div
        className={`flex max-w-[85%] items-center gap-1 lg:max-w-[660px] ${
          mine ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex min-w-0 flex-col ${
            mine ? "items-end" : "items-start"
          }`}
        >
          <div
            suppressHydrationWarning
            data-message-id={message.id}
            data-mine={mine ? "true" : "false"}
            data-reply-to={message.replyTo?.id}
            onContextMenu={(event) => {
              event.preventDefault();
              onOpenMenu(message, event.clientX, event.clientY);
            }}
            onTouchStart={(event) => {
              if (message.id.startsWith("temp-")) return;
              const touch = event.touches[0];
              if (!touch) return;
              cancelLongPress();
              origin.current = { x: touch.clientX, y: touch.clientY };
              timer.current = window.setTimeout(() => {
                timer.current = null;
                onOpenMenu(message, touch.clientX, touch.clientY);
              }, 450);
            }}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              const start = origin.current;
              if (!touch || !start) return;
              if (
                Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10
              ) {
                cancelLongPress();
              }
            }}
            onTouchEnd={cancelLongPress}
            onTouchCancel={cancelLongPress}
            title={`${dayLabel(message.createdAt)} ${clockTime(message.createdAt)}`}
            className={`max-w-full whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2 text-[14px] leading-[1.4] ${
              mine ? "bg-[#3797f0] text-white" : "bg-bubble text-ink"
            } ${message.id.startsWith("temp-") ? "opacity-70" : ""}`}
          >
            {message.replyTo ? (
              <div
                className={`mb-1.5 overflow-hidden rounded-lg border-l-[3px] px-2 py-1 ${
                  mine
                    ? "border-white/70 bg-white/15"
                    : "border-[#3797f0] bg-black/[0.05] dark:bg-white/[0.07]"
                }`}
              >
                <p
                  className={`truncate text-[11px] font-semibold leading-4 ${
                    mine ? "text-white" : "text-accent"
                  }`}
                >
                  {message.replyTo.senderName}
                </p>
                <p
                  className={`line-clamp-2 text-[12px] leading-4 ${
                    mine ? "text-white/80" : "text-muted"
                  }`}
                >
                  {message.replyTo.body}
                </p>
              </div>
            ) : null}
            {message.body}
          </div>
          {message.editedAt && !message.id.startsWith("temp-") ? (
            <span className="mt-0.5 px-1 text-[10px] leading-3 text-muted">
              Edited
            </span>
          ) : null}
        </div>

        {message.id.startsWith("temp-") ? null : (
          <button
            type="button"
            data-message-menu-trigger
            aria-label="Message options"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              onOpenMenu(message, rect.left, rect.bottom + 4);
            }}
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted opacity-70 transition hover:bg-hover hover:text-ink focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
          >
            <MoreVertical size={16} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition ${
        danger ? "text-red-500 hover:bg-red-500/10" : "text-ink hover:bg-hover"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
