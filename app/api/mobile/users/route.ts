import { getMobileUser, json, unauthorized } from "@/lib/mobile-auth";
import { searchUsers } from "@/lib/queries";

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const users = await searchUsers(user.id, query);
  return json({ users });
}
