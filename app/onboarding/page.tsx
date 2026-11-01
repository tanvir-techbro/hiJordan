import { redirect } from "next/navigation";
import { getSignedInUser } from "@/lib/session";
import OnboardingForm from "./OnboardingForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose your name — HiJordan",
};

export default async function OnboardingPage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login");
  if (user.username) redirect("/");

  return (
    <OnboardingForm
      email={user.email}
      suggestedNickname={user.google_name ?? ""}
    />
  );
}
