import { NextResponse } from "next/server";
import {
  getConversationPeer,
  getMessages,
  sendMessage,
} from "@/lib/queries";
import { getCurrentUser, isUuid } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const peer = await getConversationPeer(user.id, id);
  if (!peer) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const messages = await getMessages(user.id, id);
  return NextResponse.json({ messages, peer });
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { body?: unknown }
    | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!body) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  if (Array.from(body).length > 4000) {
    return NextResponse.json(
      { error: "Message must be 4,000 characters or fewer." },
      { status: 400 },
    );
  }

  const message = await sendMessage(user.id, id, body);
  if (!message) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({ message }, { status: 201 });
}
