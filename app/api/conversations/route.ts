import { NextResponse } from "next/server";
import {
  createOrGetConversation,
  listConversations,
  touchPresence,
} from "@/lib/queries";
import { getCurrentUser, isUuid } from "@/lib/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await touchPresence(user.id);
  const conversations = await listConversations(user.id);
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { userId?: unknown }
    | null;
  const peerId = typeof payload?.userId === "string" ? payload.userId : "";

  if (!isUuid(peerId)) {
    return NextResponse.json({ error: "Choose a valid person." }, { status: 400 });
  }

  const conversationId = await createOrGetConversation(user.id, peerId);
  if (!conversationId) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ conversationId }, { status: 201 });
}
