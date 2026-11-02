"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowLeft, AtSign, LogOut } from "lucide-react";
import type { ProfileFormState } from "@/lib/types";
import {
  normalizeNickname,
  normalizeUsername,
  validateNickname,
  validateUsername,
} from "@/lib/validation";
import Avatar from "@/components/Avatar";
import { signOutAction, updateProfileAction } from "./actions";

export default function SettingsForm({
  email,
  initialUsername,
  initialNickname,
  memberSince,
  signInMethod,
}: {
  email: string;
  initialUsername: string;
  initialNickname: string;
  memberSince: string;
  signInMethod: string;
}) {
  const [state, formAction, pending] = useActionState<
    ProfileFormState | null,
    FormData
  >(updateProfileAction, null);

  const [username, setUsername] = useState(initialUsername);
  const [nickname, setNickname] = useState(initialNickname);
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
      <header className="sticky top-0 z-10 border-b border-[#dbdbdb] bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[620px] items-center gap-2 px-4">
          <Link
            href="/"
            aria-label="Back to messages"
            className="-ml-1 grid size-8 place-items-center rounded-full text-[#262626] transition hover:bg-[#efefef]"
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </Link>
          <h1 className="text-[15px] font-semibold text-[#262626]">Settings</h1>
          <span className="ml-auto font-script text-[26px] leading-none text-[#262626]">
            HiJordan
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[620px] px-4 py-6 sm:py-9">
        <section className="overflow-hidden rounded-2xl border border-[#dbdbdb] bg-white">
          <div className="border-b border-[#efefef] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[#262626]">
              Profile
            </h2>
            <p className="mt-0.5 text-[12px] text-[#8e8e8e]">
              This is how you show up in conversations. Your avatar is
              generated automatically.
            </p>
          </div>

          <form action={formAction} className="px-5 py-5">
            <div className="mb-5 flex items-center gap-4 rounded-xl bg-[#fafafa] p-4">
              <Avatar
                seed={normalizedUsername || "hijordan"}
                label={normalizeNickname(nickname) || "Your avatar"}
                size={64}
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-[#262626]">
                  {normalizeNickname(nickname) || "Your nickname"}
                </p>
                <p className="truncate text-[12px] text-[#8e8e8e]">
                  @{normalizedUsername || "username"}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-[#8e8e8e]">
                  Your avatar is generated automatically.
                </p>
              </div>
            </div>

            <label
              htmlFor="username"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8e8e8e]"
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
                onBlur={() =>
                  setTouched((current) => ({ ...current, username: true }))
                }
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={20}
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[#262626] outline-none"
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
              className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8e8e8e]"
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
                onBlur={() =>
                  setTouched((current) => ({ ...current, nickname: true }))
                }
                maxLength={30}
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[#262626] outline-none"
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

            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-9 rounded-lg bg-[#0095f6] px-4 text-[13px] font-semibold text-white transition hover:bg-[#1877f2] disabled:cursor-not-allowed disabled:bg-[#b2dffc]"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
              {state?.success ? (
                <span className="text-[12px] font-medium text-[#1a8917]">
                  Saved
                </span>
              ) : null}
              {state?.error && !state.field ? (
                <span className="text-[12px] text-[#ed4956]">{state.error}</span>
              ) : null}
            </div>
          </form>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#dbdbdb] bg-white">
          <div className="border-b border-[#efefef] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[#262626]">Account</h2>
          </div>
          <dl className="divide-y divide-[#efefef]">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <dt className="text-[13px] text-[#8e8e8e]">Email</dt>
              <dd className="min-w-0 truncate text-[13px] text-[#262626]">
                {email}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <dt className="text-[13px] text-[#8e8e8e]">Sign-in method</dt>
              <dd className="text-[13px] text-[#262626]">{signInMethod}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <dt className="text-[13px] text-[#8e8e8e]">Member since</dt>
              <dd className="text-[13px] text-[#262626]">{memberSince}</dd>
            </div>
          </dl>
        </section>

        <form action={signOutAction} className="mt-4">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#dbdbdb] bg-white text-[13px] font-semibold text-[#ed4956] transition hover:bg-[#fff5f5]"
          >
            <LogOut size={16} strokeWidth={1.8} />
            Sign out
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-[#8e8e8e]">
          <Link href="/" className="font-medium text-[#0095f6] hover:underline">
            Back to messages
          </Link>
        </p>
      </main>
    </div>
  );
}
