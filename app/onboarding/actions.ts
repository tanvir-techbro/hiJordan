"use server";

import { redirect } from "next/navigation";
import { completeOnboarding } from "@/lib/queries";
import { getSignedInUser } from "@/lib/session";
import type { ProfileFormState } from "@/lib/types";
import {
  isUniqueViolation,
  normalizeNickname,
  normalizeUsername,
  validateNickname,
  validateUsername,
} from "@/lib/validation";

export async function completeOnboardingAction(
  _previousState: ProfileFormState | null,
  formData: FormData,
): Promise<ProfileFormState | null> {
  const user = await getSignedInUser();
  if (!user) redirect("/login");
  if (user.username) redirect("/");

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const nickname = normalizeNickname(String(formData.get("nickname") ?? ""));

  const usernameError = validateUsername(username);
  if (usernameError) {
    return { error: usernameError, field: "username" };
  }

  const nicknameError = validateNickname(nickname);
  if (nicknameError) {
    return { error: nicknameError, field: "nickname" };
  }

  let updated: Awaited<ReturnType<typeof completeOnboarding>> = null;
  try {
    updated = await completeOnboarding(user.id, username, nickname);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That username is already taken.", field: "username" };
    }
    console.error("Onboarding failed", error);
    return { error: "Something went wrong. Please try again." };
  }

  if (!updated) redirect("/");
  redirect("/");
}
