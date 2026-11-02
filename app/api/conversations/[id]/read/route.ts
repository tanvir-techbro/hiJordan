import { NextResponse } from "next/server";
import { markConversationRead, touchPresence } from "@/lib/queries";
import { getCurrentUser, isUuid } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const marked = await markConversationRead(user.id, id);
  if (!marked) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  await touchPresence(user.id);
  return NextResponse.json({ ok: true });
}
