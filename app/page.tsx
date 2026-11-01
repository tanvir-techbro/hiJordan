import { redirect } from "next/navigation";
import MessagesApp from "@/components/MessagesApp";
import { listConversations } from "@/lib/queries";
import { getSignedInUser } from "@/lib/session";
import type { PublicUser } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getSignedInUser();
  if (!user) redirect("/login");
  if (!user.username || !user.nickname) redirect("/onboarding");

  const currentUser: PublicUser = {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
  };
  const conversations = await listConversations(user.id);

  return (
    <MessagesApp
      currentUser={currentUser}
      initialConversations={conversations}
    />
  );
}
