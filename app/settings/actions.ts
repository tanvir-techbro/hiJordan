"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { updateProfile } from "@/lib/queries";
import { getSignedInUser } from "@/lib/session";
import type { ProfileFormState } from "@/lib/types";
import {
  isUniqueViolation,
  normalizeNickname,
  normalizeUsername,
  validateNickname,
  validateUsername,
} from "@/lib/validation";

export async function updateProfileAction(
  _previousState: ProfileFormState | null,
  formData: FormData,
): Promise<ProfileFormState | null> {
  const user = await getSignedInUser();
  if (!user) redirect("/login");
  if (!user.username) redirect("/onboarding");

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

  try {
    const updated = await updateProfile(user.id, username, nickname);
    if (!updated) {
      return { error: "Your account could not be found." };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "That username is already taken.", field: "username" };
    }
    console.error("Profile update failed", error);
    return { error: "Something went wrong. Please try again." };
  }

  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
