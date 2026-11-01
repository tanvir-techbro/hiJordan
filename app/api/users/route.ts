import { NextResponse } from "next/server";
import { searchUsers } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  const users = await searchUsers(user.id, query);
  return NextResponse.json({ users });
}
