"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AuthFormState } from "@/lib/types";
import {
  signInWithGoogleAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
} from "./actions";

type Mode = "signin" | "signup";

export default function LoginForm({
  googleEnabled,
  initialError,
}: {
  googleEnabled: boolean;
  initialError: string | null;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [signInState, signInAction, signInPending] = useActionState<
    AuthFormState | null,
    FormData
  >(signInWithPasswordAction, null);
  const [signUpState, signUpAction, signUpPending] = useActionState<
    AuthFormState | null,
    FormData
  >(signUpWithPasswordAction, null);

  const activeState = mode === "signin" ? signInState : signUpState;
  const pending = mode === "signin" ? signInPending : signUpPending;
  const formAction = mode === "signin" ? signInAction : signUpAction;
  const generalError =
    activeState?.error && !activeState.field
      ? activeState.error
      : mode === "signin"
        ? initialError
        : null;

  const fieldError = (field: AuthFormState["field"]) =>
    activeState && activeState.field === field ? activeState.error : null;

  const switchMode = () => {
    setMode((current) => (current === "signin" ? "signup" : "signin"));
    setPassword("");
    setConfirm("");
    setShowPassword(false);
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <main className="mx-auto flex min-h-dvh w-full max-w-[940px] flex-col items-center justify-center gap-10 px-5 py-10 lg:flex-row lg:gap-24">
        <section className="w-full max-w-[380px] text-center lg:text-left">
          <p className="font-script text-[64px] leading-none text-ink lg:text-[82px]">
            HiJordan
          </p>
          <p className="mt-3 text-[15px] leading-6 text-muted">
            Private messages, one conversation at a time.
          </p>

          <div className="mx-auto mt-8 hidden w-full max-w-[330px] flex-col gap-2 lg:flex">
            <div className="max-w-[78%] rounded-[20px] rounded-bl-md bg-bubble px-4 py-2.5 text-left text-[13.5px] text-ink">
              hey! are you free later?
            </div>
            <div className="ml-auto max-w-[78%] rounded-[20px] rounded-br-md bg-[#3797f0] px-4 py-2.5 text-left text-[13.5px] text-white">
              always. what&apos;s up?
            </div>
            <p className="mt-2 text-[11px] text-faint">
              No photos. No noise. Just names and messages.
            </p>
          </div>
        </section>

        <section className="w-full max-w-[380px]">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <h1 className="text-center text-[20px] font-semibold tracking-[-0.01em] text-ink">
              {mode === "signin" ? "Sign in to HiJordan" : "Create your account"}
            </h1>
            <p className="mt-1 text-center text-[12px] leading-4 text-muted">
              {mode === "signin"
                ? "Welcome back. Pick up where you left off."
                : "Email and password for now. Google works too when configured."}
            </p>

            <form action={formAction} className="mt-5">
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className={`h-11 w-full rounded-lg border bg-subtle px-3 text-[14px] text-ink outline-none transition placeholder:text-muted focus:bg-surface ${
                  fieldError("email")
                    ? "border-danger"
                    : "border-line focus:border-strong"
                }`}
              />
              {fieldError("email") ? (
                <p role="alert" className="mt-1.5 text-[12px] text-danger">
                  {fieldError("email")}
                </p>
              ) : null}

              <div className="relative mt-3">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    mode === "signin" ? "Password" : "Password (8+ characters)"
                  }
                  autoComplete={
                    mode === "signin" ? "current-password" : "new-password"
                  }
                  className={`h-11 w-full rounded-lg border bg-subtle pl-3 pr-11 text-[14px] text-ink outline-none transition placeholder:text-muted focus:bg-surface ${
                    fieldError("password")
                      ? "border-danger"
                      : "border-line focus:border-strong"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-hover hover:text-ink"
                >
                  {showPassword ? (
                    <EyeOff size={17} strokeWidth={1.8} />
                  ) : (
                    <Eye size={17} strokeWidth={1.8} />
                  )}
                </button>
              </div>
              {fieldError("password") ? (
                <p role="alert" className="mt-1.5 text-[12px] text-danger">
                  {fieldError("password")}
                </p>
              ) : mode === "signup" ? (
                <p className="mt-1.5 text-[11px] text-muted">
                  Use at least 8 characters.
                </p>
              ) : null}

              {mode === "signup" ? (
                <>
                  <label htmlFor="confirm" className="sr-only">
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    name="confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className={`mt-3 h-11 w-full rounded-lg border bg-subtle px-3 text-[14px] text-ink outline-none transition placeholder:text-muted focus:bg-surface ${
                      fieldError("confirm")
                        ? "border-danger"
                        : "border-line focus:border-strong"
                    }`}
                  />
                  {fieldError("confirm") ? (
                    <p
                      role="alert"
                      className="mt-1.5 text-[12px] text-danger"
                    >
                      {fieldError("confirm")}
                    </p>
                  ) : null}
                </>
              ) : null}

              {generalError ? (
                <p
                  role="alert"
                  className="mt-3 rounded-lg border border-danger/40 bg-danger-soft px-3 py-2.5 text-[12px] leading-4 text-danger"
                >
                  {generalError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="mt-4 h-11 w-full rounded-lg bg-accent text-[14px] font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-accent-soft"
              >
                {pending
                  ? mode === "signin"
                    ? "Signing in…"
                    : "Creating account…"
                  : mode === "signin"
                    ? "Sign in"
                    : "Create account"}
              </button>
            </form>

            {googleEnabled ? (
              <>
                <div className="my-5 flex items-center gap-3">
                  <span className="h-px flex-1 bg-line-soft" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">
                    or
                  </span>
                  <span className="h-px flex-1 bg-line-soft" />
                </div>

                <form action={signInWithGoogleAction}>
                  <button
                    type="submit"
                    className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-line bg-surface text-[13.5px] font-semibold text-ink transition hover:bg-subtle"
                  >
                    <GoogleMark />
                    Continue with Google
                  </button>
                </form>
              </>
            ) : null}

            <div className="mt-5 border-t border-line-soft pt-4 text-center">
              <p className="text-[12.5px] text-muted">
                {mode === "signin" ? (
                  <>
                    New to HiJordan?{" "}
                    <button
                      type="button"
                      onClick={switchMode}
                      className="font-semibold text-accent transition hover:text-accent-hover"
                    >
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={switchMode}
                      className="font-semibold text-accent transition hover:text-accent-hover"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>

          <p className="mt-4 px-2 text-center text-[11.5px] leading-4 text-muted">
            No photos. No noise. Just a name, a username, and messages.
          </p>
        </section>
      </main>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-[18px] shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.97 11.97 0 0 0 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}
