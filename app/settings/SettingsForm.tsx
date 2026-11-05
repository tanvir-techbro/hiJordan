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
import NotificationsToggle from "./NotificationsToggle";
import ThemeToggle from "./ThemeToggle";
import { signOutAction, updateProfileAction } from "./actions";

export default function SettingsForm({
  email,
  initialUsername,
  initialNickname,
  memberSince,
  signInMethod,
  pushPublicKey,
}: {
  email: string;
  initialUsername: string;
  initialNickname: string;
  memberSince: string;
  signInMethod: string;
  pushPublicKey: string;
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
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[620px] items-center gap-2 px-4">
          <Link
            href="/"
            aria-label="Back to messages"
            className="-ml-1 grid size-8 place-items-center rounded-full text-ink transition hover:bg-hover"
          >
            <ArrowLeft size={20} strokeWidth={1.8} />
          </Link>
          <h1 className="text-[15px] font-semibold text-ink">Settings</h1>
          <span className="ml-auto font-script text-[26px] leading-none text-ink">
            HiJordan
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[620px] px-4 py-6 sm:py-9">
        <section className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line-soft px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">
              Profile
            </h2>
            <p className="mt-0.5 text-[12px] text-muted">
              This is how you show up in conversations. Your avatar is
              generated automatically.
            </p>
          </div>

          <form action={formAction} className="px-5 py-5">
            <div className="mb-5 flex items-center gap-4 rounded-xl bg-subtle p-4">
              <Avatar
                seed={normalizedUsername || "hijordan"}
                label={normalizeNickname(nickname) || "Your avatar"}
                size={64}
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-ink">
                  {normalizeNickname(nickname) || "Your nickname"}
                </p>
                <p className="truncate text-[12px] text-muted">
                  @{normalizedUsername || "username"}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-muted">
                  Your avatar is generated automatically.
                </p>
              </div>
            </div>

            <label
              htmlFor="username"
              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
            >
              Username
            </label>
            <div
              className={`mt-2 flex h-11 items-center gap-2 rounded-lg border bg-surface px-3 transition focus-within:border-strong ${
                showUsernameError ? "border-danger" : "border-line"
              }`}
            >
              <AtSign
                size={16}
                strokeWidth={1.8}
                className="shrink-0 text-muted"
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
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
              />
            </div>
            {showUsernameError ? (
              <p role="alert" className="mt-1.5 text-[12px] text-danger">
                {state?.field === "username" ? state.error : usernameError}
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-muted">
                Lowercase letters, numbers, dots, and underscores.
              </p>
            )}

            <label
              htmlFor="nickname"
              className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
            >
              Nickname
            </label>
            <div
              className={`mt-2 flex h-11 items-center rounded-lg border bg-surface px-3 transition focus-within:border-strong ${
                showNicknameError ? "border-danger" : "border-line"
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
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none"
              />
              <span className="shrink-0 text-[11px] tabular-nums text-faint">
                {Array.from(nickname).length}/30
              </span>
            </div>
            {showNicknameError ? (
              <p role="alert" className="mt-1.5 text-[12px] text-danger">
                {state?.field === "nickname" ? state.error : nicknameError}
              </p>
            ) : null}

            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-9 rounded-lg bg-accent px-4 text-[13px] font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent-soft"
              >
                {pending ? "Saving…" : "Save changes"}
              </button>
              {state?.success ? (
                <span className="text-[12px] font-medium text-success">
                  Saved
                </span>
              ) : null}
              {state?.error && !state.field ? (
                <span className="text-[12px] text-danger">{state.error}</span>
              ) : null}
            </div>
          </form>
        </section>

        <ThemeToggle />

        <NotificationsToggle publicKey={pushPublicKey} />

        <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="border-b border-line-soft px-5 py-4">
            <h2 className="text-[15px] font-semibold text-ink">Account</h2>
          </div>
          <dl className="divide-y divide-line-soft">
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <dt className="text-[13px] text-muted">Email</dt>
              <dd className="min-w-0 truncate text-[13px] text-ink">
                {email}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <dt className="text-[13px] text-muted">Sign-in method</dt>
              <dd className="text-[13px] text-ink">{signInMethod}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-3.5">
              <dt className="text-[13px] text-muted">Member since</dt>
              <dd className="text-[13px] text-ink">{memberSince}</dd>
            </div>
          </dl>
        </section>

        <form action={signOutAction} className="mt-4">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line bg-surface text-[13px] font-semibold text-danger transition hover:bg-danger-soft"
          >
            <LogOut size={16} strokeWidth={1.8} />
            Sign out
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-muted">
          <Link href="/" className="font-medium text-accent hover:underline">
            Back to messages
          </Link>
        </p>
      </main>
    </div>
  );
}
