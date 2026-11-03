import {
  getMobileUser,
  json,
  publicMobileUser,
  unauthorized,
} from "@/lib/mobile-auth";
import { updateProfile } from "@/lib/queries";
import {
  isUniqueViolation,
  normalizeNickname,
  normalizeUsername,
  validateNickname,
  validateUsername,
} from "@/lib/validation";

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();
  return json({ user: publicMobileUser(user) });
}

export async function PATCH(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const payload = (await request.json().catch(() => null)) as
    | { username?: unknown; nickname?: unknown }
    | null;

  const username = normalizeUsername(
    typeof payload?.username === "string" ? payload.username : "",
  );
  const nickname = normalizeNickname(
    typeof payload?.nickname === "string" ? payload.nickname : "",
  );

  const usernameError = validateUsername(username);
  if (usernameError) {
    return json({ error: usernameError, field: "username" }, 400);
  }

  const nicknameError = validateNickname(nickname);
  if (nicknameError) {
    return json({ error: nicknameError, field: "nickname" }, 400);
  }

  try {
    const updated = await updateProfile(user.id, username, nickname);
    if (!updated) {
      return json({ error: "Your account could not be found." }, 404);
    }
    return json({ user: publicMobileUser(updated) });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return json(
        { error: "That username is already taken.", field: "username" },
        409,
      );
    }

    console.error("Mobile profile update failed", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
}
