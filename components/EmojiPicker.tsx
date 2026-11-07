"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { EMOJI_GROUPS } from "@/lib/emojis";

const ALL_EMOJIS = EMOJI_GROUPS.flatMap((group) => group.emojis);

export default function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useState(EMOJI_GROUPS[0].id);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const emojis = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      const group =
        EMOJI_GROUPS.find((item) => item.id === groupId) ?? EMOJI_GROUPS[0];
      return group.emojis;
    }
    return ALL_EMOJIS.filter(
      (emoji) => emoji.n.includes(term) || emoji.e.includes(term),
    );
  }, [query, groupId]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Emoji picker"
      className="absolute bottom-full right-0 z-30 mb-2 flex w-[320px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-xl"
    >
      <div className="border-b border-line-soft p-2">
        <div className="relative">
          <Search
            size={14}
            strokeWidth={2}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search emoji"
            aria-label="Search emoji"
            className="h-8 w-full rounded-lg bg-subtle pl-8 pr-2 text-[12px] text-ink outline-none transition placeholder:text-muted focus:bg-hover"
          />
        </div>
      </div>

      {query.trim() ? null : (
        <div
          role="tablist"
          aria-label="Emoji categories"
          className="thin-scrollbar flex gap-0.5 overflow-x-auto border-b border-line-soft px-1.5 py-1.5"
        >
          {EMOJI_GROUPS.map((group) => {
            const active = group.id === groupId;
            return (
              <button
                key={group.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={group.label}
                title={group.label}
                onClick={() => setGroupId(group.id)}
                className={`grid size-8 shrink-0 place-items-center rounded-lg text-[17px] leading-none transition ${
                  active ? "bg-hover" : "hover:bg-subtle"
                }`}
              >
                {group.icon}
              </button>
            );
          })}
        </div>
      )}

      <div className="thin-scrollbar grid max-h-[240px] grid-cols-8 gap-0.5 overflow-y-auto p-1.5">
        {emojis.map((emoji, index) => (
          <button
            key={`${emoji.e}-${index}`}
            type="button"
            onClick={() => onPick(emoji.e)}
            title={emoji.n}
            aria-label={emoji.n}
            className="grid size-8 place-items-center rounded-lg text-[19px] leading-none transition hover:bg-hover"
          >
            {emoji.e}
          </button>
        ))}
      </div>

      {emojis.length === 0 ? (
        <p className="px-3 py-6 text-center text-[12px] text-muted">
          No emoji found.
        </p>
      ) : null}
    </div>
  );
}
