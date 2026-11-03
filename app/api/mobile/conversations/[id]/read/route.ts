import { getMobileUser, json, unauthorized } from "@/lib/mobile-auth";
import { markConversationRead } from "@/lib/queries";
import { isUuid } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const user = await getMobileUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  if (!isUuid(id)) {
    return json({ error: "Conversation not found." }, 404);
  }

  const marked = await markConversationRead(user.id, id);
  if (!marked) {
    return json({ error: "Conversation not found." }, 404);
  }

  return json({ ok: true });
}
