import { verifyPassword } from "@/lib/password";
import { getUserByEmail } from "@/lib/queries";
import {
  createMobileToken,
  json,
  publicMobileUser,
} from "@/lib/mobile-auth";
import { normalizeEmail } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { email?: unknown; password?: unknown }
    | null;

  const email = normalizeEmail(
    typeof payload?.email === "string" ? payload.email : "",
  );
  const password =
    typeof payload?.password === "string" ? payload.password : "";

  if (!email) {
    return json({ error: "Enter your email address.", field: "email" }, 400);
  }
  if (!password) {
    return json({ error: "Enter your password.", field: "password" }, 400);
  }

  const user = await getUserByEmail(email);
  if (!user?.password_hash) {
    return json({ error: "Incorrect email or password." }, 401);
  }

  if (!(await verifyPassword(password, user.password_hash))) {
    return json({ error: "Incorrect email or password." }, 401);
  }

  return json({
    token: await createMobileToken(user.id),
    user: publicMobileUser(user),
  });
}
