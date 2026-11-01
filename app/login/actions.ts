"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createCredentialUser, getUserByEmail } from "@/lib/queries";
import type { AuthFormState } from "@/lib/types";
import {
  isUniqueViolation,
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "@/lib/validation";

export async function signInWithGoogleAction() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    redirect("/login?error=not-configured");
  }
  await signIn("google", { redirectTo: "/" });
}

export async function signInWithPasswordAction(
  _previousState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState | null> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email) return { error: "Enter your email address.", field: "email" };
  if (!password) return { error: "Enter your password.", field: "password" };

  const user = await getUserByEmail(email);
  if (!user?.password_hash) {
    return { error: "Incorrect email or password." };
  }

  if (!(await verifyPassword(password, user.password_hash))) {
    return { error: "Incorrect email or password." };
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });
  return null;
}

export async function signUpWithPasswordAction(
  _previousState: AuthFormState | null,
  formData: FormData,
): Promise<AuthFormState | null> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError, field: "email" };

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError, field: "password" };

  if (password !== confirm) {
    return { error: "Passwords don't match.", field: "confirm" };
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return {
      error: "An account with this email already exists. Sign in instead.",
      field: "email",
    };
  }

  try {
    await createCredentialUser(email, await hashPassword(password));
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        error: "An account with this email already exists. Sign in instead.",
        field: "email",
      };
    }
    console.error("Sign-up failed", error);
    return { error: "Could not create your account. Please try again." };
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/",
  });
  return null;
}
