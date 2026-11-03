import { hashPassword } from "@/lib/password";
import { createCredentialUser, getUserByEmail } from "@/lib/queries";
import {
  createMobileToken,
  json,
  publicMobileUser,
} from "@/lib/mobile-auth";
import {
  isUniqueViolation,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "@/lib/validation";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as
    | { email?: unknown; password?: unknown }
    | null;

  const email = normalizeEmail(
    typeof payload?.email === "string" ? payload.email : "",
  );
  const password =
    typeof payload?.password === "string" ? payload.password : "";

  const emailError = validateEmail(email);
  if (emailError) return json({ error: emailError, field: "email" }, 400);

  const passwordError = validatePassword(password);
  if (passwordError) {
    return json({ error: passwordError, field: "password" }, 400);
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return json(
      {
        error: "An account with this email already exists. Sign in instead.",
        field: "email",
      },
      409,
    );
  }

  try {
    const user = await createCredentialUser(
      email,
      await hashPassword(password),
    );
    return json(
      {
        token: await createMobileToken(user.id),
        user: publicMobileUser(user),
      },
      201,
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return json(
        {
          error: "An account with this email already exists. Sign in instead.",
          field: "email",
        },
        409,
      );
    }

    console.error("Mobile sign-up failed", error);
    return json({ error: "Could not create your account. Please try again." }, 500);
  }
}
