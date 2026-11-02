"use client";

import { useEffect, useRef } from "react";

const EMOJIS = [
  "😀",
  "😄",
  "😁",
  "😂",
  "😊",
  "😍",
  "🥰",
  "😘",
  "😎",
  "🤔",
  "😅",
  "😭",
  "😤",
  "🙃",
  "😴",
  "🤗",
  "🫶",
  "👋",
  "👍",
  "👏",
  "🙏",
  "💪",
  "🔥",
  "✨",
  "💯",
  "🎉",
  "❤️",
  "💙",
  "💜",
  "🖤",
  "☀️",
  "🌙",
  "⭐",
  "🍕",
  "☕",
  "🎧",
  "🐶",
  "🐱",
  "🦊",
  "🐼",
  "🌈",
  "⚡",
];

export default function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Emoji picker"
      className="absolute bottom-full right-0 z-30 mb-2 w-[286px] max-w-[calc(100vw-24px)] rounded-2xl border border-[#dbdbdb] bg-white p-2 shadow-xl"
    >
      <div className="thin-scrollbar grid max-h-[220px] grid-cols-7 gap-0.5 overflow-y-auto">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            aria-label={`Insert ${emoji}`}
            className="grid size-9 place-items-center rounded-lg text-[20px] leading-none transition hover:bg-[#efefef]"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
