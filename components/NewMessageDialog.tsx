"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import type { PublicUser } from "@/lib/types";
import Avatar from "./Avatar";

export default function NewMessageDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (conversationId: string, peer: PublicUser) => void;
}) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const handle = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/users?q=${encodeURIComponent(query.trim())}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("Could not load people.");
        const data = (await response.json()) as { users: PublicUser[] };
        if (!cancelled) {
          setUsers(data.users);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Could not load people.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  const startConversation = async (user: PublicUser) => {
    setCreatingId(user.id);
    setError(null);

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = (await response.json().catch(() => null)) as
        | { conversationId?: string; error?: string }
        | null;
      if (!response.ok || !data?.conversationId) {
        throw new Error(data?.error ?? "Could not start that conversation.");
      }
      onCreated(data.conversationId, user);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not start that conversation.",
      );
      setCreatingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="New message"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-surface sm:h-auto sm:max-h-[620px] sm:rounded-2xl sm:border sm:border-line">
        <div className="relative flex h-14 shrink-0 items-center justify-center border-b border-line-soft px-4">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute left-3 grid size-8 place-items-center rounded-full text-ink transition hover:bg-hover"
          >
            <X size={20} strokeWidth={1.8} />
          </button>
          <h2 className="text-[14px] font-semibold text-ink">
            New message
          </h2>
        </div>

        <div className="shrink-0 px-4 py-3">
          <div className="relative">
            <Search
              size={15}
              strokeWidth={2}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people"
              aria-label="Search people"
              className="h-9 w-full rounded-lg bg-subtle pl-9 pr-3 text-[13px] text-ink outline-none placeholder:text-muted focus:bg-hover"
            />
          </div>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto pb-2">
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[12px] text-muted">
              <Loader2 size={14} className="animate-spin" />
              Looking for people…
            </div>
          ) : null}

          {!loading && users.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-[13px] font-medium text-ink">
                No one found.
              </p>
              <p className="mt-1 text-[12px] text-muted">
                {query.trim()
                  ? "Try a different name or username."
                  : "Once someone joins HiJordan, they'll show up here."}
              </p>
            </div>
          ) : null}

          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => startConversation(user)}
              disabled={creatingId !== null}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-subtle disabled:opacity-60"
            >
              <Avatar
                seed={user.username}
                label={user.nickname}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">
                  {user.nickname}
                </p>
                <p className="truncate text-[12px] text-muted">
                  @{user.username}
                </p>
              </div>
              {creatingId === user.id ? (
                <Loader2
                  size={15}
                  className="shrink-0 animate-spin text-muted"
                />
              ) : (
                <span className="shrink-0 text-[12px] font-semibold text-accent">
                  Message
                </span>
              )}
            </button>
          ))}
        </div>

        {error ? (
          <p
            role="alert"
            className="shrink-0 border-t border-line-soft px-4 py-3 text-[12px] text-danger"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
