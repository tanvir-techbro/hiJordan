"use client";

import { useActionState, useState } from "react";
import { AtSign } from "lucide-react";
import type { ProfileFormState } from "@/lib/types";
import {
  normalizeNickname,
  normalizeUsername,
  validateNickname,
  validateUsername,
} from "@/lib/validation";
import { completeOnboardingAction } from "./actions";
import Avatar from "@/components/Avatar";

export default function OnboardingForm({
  email,
  suggestedNickname,
}: {
  email: string;
  suggestedNickname: string;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState | null,
    FormData
  >(completeOnboardingAction, null);

  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState(
    normalizeNickname(suggestedNickname).slice(0, 30),
  );
  const [touched, setTouched] = useState<{
    username?: boolean;
    nickname?: boolean;
  }>({});

  const normalizedUsername = normalizeUsername(username);
  const usernameError = validateUsername(username);
  const nicknameError = validateNickname(nickname);

  const showUsernameError =
    state?.field === "username" ||
    (Boolean(touched.username) && Boolean(usernameError) && Boolean(username));
  const showNicknameError =
    state?.field === "nickname" ||
    (Boolean(touched.nickname) && Boolean(nicknameError));

  const canSubmit = !pending && !usernameError && !nicknameError;

  return (
    <div className="min-h-dvh bg-[#fafafa]">
      <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-5 py-10 sm:justify-center">
        <div className="text-center">
          <p className="font-script text-[46px] leading-none text-[#262626]">
            HiJordan
          </p>
          <h1 className="mt-8 text-[22px] font-semibold tracking-[-0.01em] text-[#262626]">
            Choose your name
          </h1>
          <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-5 text-[#8e8e8e]">
            Your username is how people find you. Your nickname is what they
            see in conversations.
          </p>
        </div>

        <form
          action={formAction}
          className="mt-6 rounded-2xl border border-[#dbdbdb] bg-white p-5"
        >
          <label
            htmlFor="username"
            className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8e8e8e]"
          >
            Username
          </label>
          <div
            className={`mt-2 flex h-11 items-center gap-2 rounded-lg border bg-white px-3 transition focus-within:border-[#a8a8a8] ${
              showUsernameError ? "border-[#ed4956]" : "border-[#dbdbdb]"
            }`}
          >
            <AtSign
              size={16}
              strokeWidth={1.8}
              className="shrink-0 text-[#8e8e8e]"
            />
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, username: true }))}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={20}
              placeholder="yourname"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[#262626] outline-none placeholder:text-[#c7c7c7]"
            />
          </div>
          {showUsernameError ? (
            <p role="alert" className="mt-1.5 text-[12px] text-[#ed4956]">
              {state?.field === "username" ? state.error : usernameError}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-[#8e8e8e]">
              Lowercase letters, numbers, dots, and underscores.
            </p>
          )}

          <label
            htmlFor="nickname"
            className="mt-5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8e8e8e]"
          >
            Nickname
          </label>
          <div
            className={`mt-2 flex h-11 items-center rounded-lg border bg-white px-3 transition focus-within:border-[#a8a8a8] ${
              showNicknameError ? "border-[#ed4956]" : "border-[#dbdbdb]"
            }`}
          >
            <input
              id="nickname"
              name="nickname"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, nickname: true }))}
              maxLength={30}
              placeholder="What should people call you?"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[#262626] outline-none placeholder:text-[#c7c7c7]"
            />
            <span className="shrink-0 text-[11px] tabular-nums text-[#c7c7c7]">
              {Array.from(nickname).length}/30
            </span>
          </div>
          {showNicknameError ? (
            <p role="alert" className="mt-1.5 text-[12px] text-[#ed4956]">
              {state?.field === "nickname" ? state.error : nicknameError}
            </p>
          ) : null}

          <div className="mt-5 flex items-center gap-3 rounded-xl bg-[#fafafa] px-4 py-3">
            <Avatar
              seed={normalizedUsername || "hijordan"}
              label={normalizeNickname(nickname) || "Your avatar"}
              size={46}
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8e8e8e]">
                How you&apos;ll appear
              </p>
              <p className="mt-1.5 truncate text-[14px] font-semibold text-[#262626]">
                {normalizeNickname(nickname) || "Your nickname"}
              </p>
              <p className="truncate text-[12px] text-[#8e8e8e]">
                @{normalizedUsername || "username"}
              </p>
            </div>
          </div>

          {state?.error && !state.field ? (
            <p role="alert" className="mt-4 text-[12px] text-[#ed4956]">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 h-11 w-full rounded-lg bg-[#0095f6] text-[14px] font-semibold text-white transition hover:bg-[#1877f2] disabled:cursor-not-allowed disabled:bg-[#b2dffc]"
          >
            {pending ? "Setting up…" : "Continue"}
          </button>
        </form>

        <p className="mt-4 px-4 text-center text-[11px] leading-4 text-[#8e8e8e]">
          Signed in as {email}. You can change your name later in settings.
        </p>
      </main>
    </div>
  );
}
