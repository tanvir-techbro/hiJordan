import { NextResponse } from "next/server";
import { after } from "next/server";
import {
  getConversationPeer,
  getMessages,
  messageBelongsToConversation,
  sendMessage,
} from "@/lib/queries";
import { sendMessagePush } from "@/lib/push";
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
    | { body?: unknown; replyToId?: unknown }
    | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const replyToId =
    typeof payload?.replyToId === "string" ? payload.replyToId : null;

  if (!body) {
    return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  }

  if (Array.from(body).length > 4000) {
    return NextResponse.json(
      { error: "Message must be 4,000 characters or fewer." },
      { status: 400 },
    );
  }

  if (replyToId) {
    if (!isUuid(replyToId)) {
      return NextResponse.json(
        { error: "Reply target not found." },
        { status: 400 },
      );
    }
    const target = await messageBelongsToConversation(replyToId, id);
    if (!target) {
      return NextResponse.json(
        { error: "Reply target not found." },
        { status: 400 },
      );
    }
  }

  const message = await sendMessage(user.id, id, body, replyToId);
  if (!message) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  after(async () => {
    await sendMessagePush({
      conversationId: id,
      messageId: message.id,
      senderId: user.id,
      senderName: user.nickname,
      body: message.body,
    });
  });

  return NextResponse.json({ message }, { status: 201 });
}
