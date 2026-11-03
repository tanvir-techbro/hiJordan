import { getMobileUser, json, unauthorized } from "@/lib/mobile-auth";
import {
  getConversationState,
  getMessages,
  sendMessage,
} from "@/lib/queries";
import { isUuid } from "@/lib/validation";

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
    | { body?: unknown }
    | null;
  const body = typeof payload?.body === "string" ? payload.body.trim() : "";

  if (!body) {
    return json({ error: "Message can't be empty." }, 400);
  }

  if (Array.from(body).length > 4000) {
    return json({ error: "Message must be 4,000 characters or fewer." }, 400);
  }

  const message = await sendMessage(user.id, id, body);
  if (!message) {
    return json({ error: "Conversation not found." }, 404);
  }

  return json({ message }, 201);
}
