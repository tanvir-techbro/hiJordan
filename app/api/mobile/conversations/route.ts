import { getMobileUser, json, unauthorized } from "@/lib/mobile-auth";
import {
  createOrGetConversation,
  listConversations,
} from "@/lib/queries";
import { isUuid } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const conversations = await listConversations(user.id);
  return json({ conversations });
}

export async function POST(request: Request) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const payload = (await request.json().catch(() => null)) as
    | { userId?: unknown }
    | null;
  const peerId = typeof payload?.userId === "string" ? payload.userId : "";

  if (!isUuid(peerId)) {
    return json({ error: "Choose a valid person." }, 400);
  }

  const conversationId = await createOrGetConversation(user.id, peerId);
  if (!conversationId) {
    return json({ error: "Conversation not found." }, 404);
  }

  return json({ conversationId }, 201);
}
