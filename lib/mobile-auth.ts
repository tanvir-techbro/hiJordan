import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { getUserById, touchPresence, type DbUser } from "@/lib/queries";

const ISSUER = "hijordan-mobile";
const AUDIENCE = "hijordan-mobile";
const TOKEN_LIFETIME = "30d";

// Derive a separate key so a mobile token can never be confused with an
// Auth.js session cookie, even though both are rooted in AUTH_SECRET.
function mobileKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return new TextEncoder().encode(`${secret}:hijordan-mobile-v1`);
}

export async function createMobileToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TOKEN_LIFETIME)
    .sign(mobileKey());
}

export async function getMobileUser(request: Request): Promise<DbUser | null> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return null;

  try {
    const { payload } = await jwtVerify(match[1], mobileKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== "string") return null;

    const user = await getUserById(payload.sub);
    if (!user) return null;

    await touchPresence(user.id);
    return user;
  } catch {
    return null;
  }
}

export function publicMobileUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    nickname: user.nickname,
    createdAt: new Date(user.created_at).toISOString(),
    signInMethod:
      user.google_sub && user.password_hash
        ? "Google or email"
        : user.google_sub
          ? "Google"
          : "Email & password",
  };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export function unauthorized() {
  return json({ error: "Please sign in again." }, 401);
}
