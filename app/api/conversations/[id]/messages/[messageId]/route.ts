import { NextResponse } from "next/server";
import { deleteMessage, editMessage } from "@/lib/queries";
import { getCurrentUser, isUuid } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string; messageId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  if (!isUuid(id) || !isUuid(messageId)) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
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

  const message = await editMessage(user.id, id, messageId, body);
  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  return NextResponse.json({ message });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  if (!isUuid(id) || !isUuid(messageId)) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  const deleted = await deleteMessage(user.id, id, messageId);
  if (!deleted) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
