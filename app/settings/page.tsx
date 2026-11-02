import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/session";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings — HiJordan",
};

export default async function SettingsPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login");
  if (!user.username || !user.nickname) redirect("/onboarding");

  const memberSince = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(user.created_at);

  const signInMethod =
    user.google_sub && user.password_hash
      ? "Google or email"
      : user.google_sub
        ? "Google"
        : "Email & password";

  return (
    <SettingsForm
      email={user.email}
      initialUsername={user.username}
      initialNickname={user.nickname}
      memberSince={memberSince}
      signInMethod={signInMethod}
    />
  );
}
