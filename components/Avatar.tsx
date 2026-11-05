const AVATAR_EMOJIS = [
  "🦊",
  "🐼",
  "🐸",
  "🐙",
  "🐯",
  "🦁",
  "🐨",
  "🐵",
  "🐧",
  "🦄",
  "🐢",
  "🦋",
  "🐳",
  "🦉",
  "🐝",
  "🦖",
  "🐰",
  "🐻",
  "🐮",
  "🐷",
  "🐔",
  "🦕",
  "🦩",
  "🐬",
  "🦔",
  "🐹",
  "🦦",
  "🦥",
  "🦜",
  "🐠",
];

const AVATAR_PALETTES = [
  ["#fee2e2", "#fca5a5"],
  ["#ffedd5", "#fdba74"],
  ["#fef3c7", "#fcd34d"],
  ["#ecfccb", "#bef264"],
  ["#dcfce7", "#86efac"],
  ["#ccfbf1", "#5eead4"],
  ["#cffafe", "#67e8f9"],
  ["#dbeafe", "#93c5fd"],
  ["#e0e7ff", "#a5b4fc"],
  ["#ede9fe", "#c4b5fd"],
  ["#fae8ff", "#f0abfc"],
  ["#fce7f3", "#f9a8d4"],
];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function avatarFor(seed: string) {
  const key = seed.trim().toLowerCase() || "hijordan";
  const emoji = AVATAR_EMOJIS[hashString(key) % AVATAR_EMOJIS.length];
  const palette =
    AVATAR_PALETTES[hashString(`${key}:color`) % AVATAR_PALETTES.length];
  return { emoji, from: palette[0], to: palette[1] };
}

export default function Avatar({
  seed,
  label,
  size = 44,
  online = false,
  className = "",
}: {
  seed: string;
  label?: string;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  const { emoji, from, to } = avatarFor(seed);

  return (
    <span
      role="img"
      aria-label={label ? `${label}'s avatar` : "Avatar"}
      title={label}
      className={`relative inline-grid shrink-0 place-items-center rounded-full ring-1 ring-black/5 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: Math.round(size * 0.52),
        lineHeight: 1,
      }}
    >
      <span aria-hidden className="select-none">
        {emoji}
      </span>
      {online ? (
        <span
          aria-label="Online"
          title="Online"
          className="absolute bottom-0 right-0 rounded-full bg-success ring-2 ring-surface"
          style={{
            width: Math.max(9, Math.round(size * 0.26)),
            height: Math.max(9, Math.round(size * 0.26)),
          }}
        />
      ) : null}
    </span>
  );
}
