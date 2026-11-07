import { getMobileUser, json, unauthorized } from "@/lib/mobile-auth";
import { sendMessagePush } from "@/lib/push";
import {
  getConversationState,
  getMessages,
  messageBelongsToConversation,
  sendMessage,
} from "@/lib/queries";
import { isUuid } from "@/lib/validation";
import { after } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  if (!isUuid(id)) {
    return json({ error: "Conversation not found." }, 404);
  }

  const state = await getConversationState(user.id, id);
  if (!state) {
    return json({ error: "Conversation not found." }, 404);
  }

  const messages = await getMessages(user.id, id);
  return json({ messages, ...state });
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  if (!isUuid(id)) {
    return json({ error: "Conversation not found." }, 404);
  }

  const payload = (await request.json().catch(() => null)) as
    | { body?: unknown; replyToId?: unknown }
    | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";
  const replyToId =
    typeof payload?.replyToId === "string" ? payload.replyToId : null;

  if (!body) {
    return json({ error: "Message can't be empty." }, 400);
  }

  if (Array.from(body).length > 4000) {
    return json({ error: "Message must be 4,000 characters or fewer." }, 400);
  }

  if (replyToId) {
    if (!isUuid(replyToId)) {
      return json({ error: "Reply target not found." }, 400);
    }
    const target = await messageBelongsToConversation(replyToId, id);
    if (!target) {
      return json({ error: "Reply target not found." }, 400);
    }
  }

  const message = await sendMessage(user.id, id, body, replyToId);
  if (!message) {
    return json({ error: "Conversation not found." }, 404);
  }

  after(async () => {
    await sendMessagePush({
      conversationId: id,
      messageId: message.id,
      senderId: user.id,
      senderName: user.nickname ?? user.username ?? "New message",
      body: message.body,
    });
  });

  return json({ message }, 201);
}
