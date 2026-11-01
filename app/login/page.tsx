import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/session";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — HiJordan",
};

const ERROR_MESSAGES: Record<string, string> = {
  "not-configured":
    "Google sign-in is not configured yet. Add your Google credentials and restart the app.",
  CredentialsSignin: "Incorrect email or password.",
  Configuration: "Sign-in is not configured correctly.",
  AccessDenied: "That account was not allowed to sign in.",
  OAuthAccountNotLinked:
    "Use the same Google account you originally signed up with.",
  OAuthCallback: "Google sent us back something we couldn't verify.",
  OAuthSignin: "Could not start Google sign-in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const user = await getSignedInUser();
  if (user) redirect(user.username ? "/" : "/onboarding");

  const params = await searchParams;
  const errorCode =
    typeof params.error === "string" ? params.error : undefined;
  const errorMessage = errorCode
    ? (ERROR_MESSAGES[errorCode] ?? "Something went wrong signing in.")
    : null;

  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );

  return <LoginForm googleEnabled={googleEnabled} initialError={errorMessage} />;
}
