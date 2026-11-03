const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "auth",
  "about",
  "direct",
  "explore",
  "help",
  "hijordan",
  "inbox",
  "login",
  "logout",
  "me",
  "messages",
  "new",
  "onboarding",
  "privacy",
  "profile",
  "settings",
  "support",
  "terms",
  "user",
  "users",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateEmail(raw: string): string | null {
  const email = normalizeEmail(raw);
  if (!email) return "Email can't be empty.";
  if (email.length > 254) return "That email is too long.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  return null;
}

export function validatePassword(raw: string): string | null {
  if (raw.length < 8) return "Password must be at least 8 characters.";
  if (raw.length > 200) return "Password must be 200 characters or fewer.";
  return null;
}

export function validateUsername(raw: string): string | null {
  const username = normalizeUsername(raw);
  if (username.length < 3) return "Username must be at least 3 characters.";
  if (username.length > 20) return "Username must be 20 characters or fewer.";
  if (!/^[a-z0-9._]+$/.test(username)) {
    return "Use only lowercase letters, numbers, dots, and underscores.";
  }
  if (!/^[a-z0-9]/.test(username) || !/[a-z0-9]$/.test(username)) {
    return "Username must start and end with a letter or number.";
  }
  if (/[._]{2,}/.test(username)) {
    return "Username cannot contain two dots or underscores in a row.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "That username is reserved. Try another one.";
  }
  return null;
}

export function validateNickname(raw: string): string | null {
  const nickname = normalizeNickname(raw);
  const length = Array.from(nickname).length;
  if (length < 1) return "Nickname can't be empty.";
  if (length > 30) return "Nickname must be 30 characters or fewer.";
  return null;
}
