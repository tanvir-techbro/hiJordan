import { NextResponse } from "next/server";
import {
  deletePushSubscription,
  parsePushSubscription,
  savePushSubscription,
} from "@/lib/push";
import { getSignedInUser } from "@/lib/session";

export async function POST(request: Request) {
  const user = await getSignedInUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const subscription = parsePushSubscription(payload);
  if (!subscription) {
    return NextResponse.json(
      { error: "That notification subscription is not valid." },
      { status: 400 },
    );
  }

  await savePushSubscription(
    user.id,
    subscription,
    request.headers.get("user-agent"),
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getSignedInUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    endpoint?: unknown;
  } | null;
  const endpoint =
    typeof payload?.endpoint === "string" ? payload.endpoint : "";

  if (!endpoint || endpoint.length > 4096) {
    return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
  }

  await deletePushSubscription(user.id, endpoint);
  return NextResponse.json({ ok: true });
}
