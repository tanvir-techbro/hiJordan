import { getMobileUser, json, unauthorized } from "@/lib/mobile-auth";
import { deleteMessage, editMessage } from "@/lib/queries";
import { isUuid } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string; messageId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const { id, messageId } = await params;
  if (!isUuid(id) || !isUuid(messageId)) {
    return json({ error: "Message not found." }, 404);
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

  const message = await editMessage(user.id, id, messageId, body);
  if (!message) {
    return json({ error: "Message not found." }, 404);
  }

  return json({ message });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const { id, messageId } = await params;
  if (!isUuid(id) || !isUuid(messageId)) {
    return json({ error: "Message not found." }, 404);
  }

  const deleted = await deleteMessage(user.id, id, messageId);
  if (!deleted) {
    return json({ error: "Message not found." }, 404);
  }

  return json({ ok: true });
}
