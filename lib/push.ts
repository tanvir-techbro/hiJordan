import webpush from "web-push";
import { pool } from "@/lib/db";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
const subject =
  process.env.VAPID_SUBJECT?.trim() || "https://hi-jordan-phi.vercel.app";

export const pushPublicKey = publicKey;

let vapidReady = false;
let warned = false;

function configure(): boolean {
  if (!publicKey || !privateKey) {
    if (!warned) {
      warned = true;
      console.warn(
        "Web push is off: set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.",
      );
    }
    return false;
  }

  if (!vapidReady) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidReady = true;
  }
  return true;
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function parsePushSubscription(
  input: unknown,
): PushSubscriptionInput | null {
  if (typeof input !== "object" || input === null) return null;

  const { endpoint, keys } = input as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown } | null;
  };

  if (typeof endpoint !== "string" || endpoint.length > 4096) return null;
  if (!/^https?:\/\//i.test(endpoint)) return null;
  if (typeof keys?.p256dh !== "string" || keys.p256dh.length > 512) return null;
  if (typeof keys.auth !== "string" || keys.auth.length > 512) return null;

  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

export async function savePushSubscription(
  userId: string,
  subscription: PushSubscriptionInput,
  userAgent: string | null,
): Promise<void> {
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (endpoint) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           p256dh = EXCLUDED.p256dh,
           auth = EXCLUDED.auth,
           user_agent = EXCLUDED.user_agent,
           updated_at = now()`,
    [
      subscription.endpoint,
      userId,
      subscription.keys.p256dh,
      subscription.keys.auth,
      userAgent,
    ],
  );
}

export async function deletePushSubscription(
  userId: string,
  endpoint: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`,
    [endpoint, userId],
  );
}

function preview(body: string): string {
  const singleLine = body.replace(/\s+/g, " ").trim();
  const characters = Array.from(singleLine);
  return characters.length > 140
    ? `${characters.slice(0, 139).join("")}…`
    : singleLine;
}

interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Sends a browser notification to every other member of the conversation.
// Safe to call after the HTTP response has been sent.
export async function sendMessagePush(input: {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  body: string;
}): Promise<void> {
  if (!configure()) return;

  let subscriptions: StoredSubscription[] = [];
  try {
    const { rows } = await pool.query<StoredSubscription>(
      `SELECT ps.endpoint, ps.p256dh, ps.auth
       FROM push_subscriptions AS ps
       JOIN conversation_members AS cm ON cm.user_id = ps.user_id
       WHERE cm.conversation_id = $1
         AND ps.user_id <> $2`,
      [input.conversationId, input.senderId],
    );
    subscriptions = rows;
  } catch (error) {
    console.error("Could not load push subscriptions:", error);
    return;
  }

  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: input.senderName,
    body: preview(input.body),
    conversationId: input.conversationId,
    messageId: input.messageId,
    tag: input.conversationId,
    url: `/chat/${input.conversationId}`,
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        // The browser dropped the subscription (uninstalled, expired, or
        // permission revoked). Remove it so we stop retrying.
        if (statusCode === 404 || statusCode === 410) {
          await pool
            .query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [
              subscription.endpoint,
            ])
            .catch(() => {});
          return;
        }
        console.error("Web push failed:", statusCode, (error as Error).message);
      }
    }),
  );
}
