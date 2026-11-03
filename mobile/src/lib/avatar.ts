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

const AVATAR_PALETTES: readonly (readonly [string, string])[] = [
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
