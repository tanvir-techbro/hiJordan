"use client";

export type PushPermission = "default" | "granted" | "denied";

export class PushError extends Error {
  code: "unsupported" | "blocked" | "dismissed" | "failed";

  constructor(code: PushError["code"], message: string) {
    super(message);
    this.name = "PushError";
    this.code = code;
  }
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function notificationPermission(): PushPermission {
  if (!isPushSupported()) return "default";
  return Notification.permission as PushPermission;
}

function base64UrlToBytes(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }
  return bytes;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function existingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const ready = await navigator.serviceWorker.getRegistration("/");
    if (!ready) return null;
    return await ready.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function enablePushNotifications(
  publicKey: string,
): Promise<void> {
  if (!isPushSupported()) {
    throw new PushError(
      "unsupported",
      "This browser doesn't support notifications.",
    );
  }
  if (!publicKey) {
    throw new PushError(
      "failed",
      "Notifications aren't configured on the server yet.",
    );
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission === "denied") {
    throw new PushError(
      "blocked",
      "Notifications are blocked. Allow them in your browser settings.",
    );
  }
  if (permission !== "granted") {
    throw new PushError("dismissed", "No changes were made.");
  }

  const ready = await registration();
  let subscription = await ready.pushManager.getSubscription();

  if (!subscription) {
    try {
      subscription = await Promise.race([
        ready.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(publicKey) as BufferSource,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("push subscribe timed out")),
            20000,
          ),
        ),
      ]);
    } catch (error) {
      const detail = (error as Error)?.message ?? "";
      if (/incognito|private window|private browsing/i.test(detail)) {
        throw new PushError(
          "unsupported",
          "Notifications aren't available in private windows.",
        );
      }
      throw new PushError(
        "failed",
        "Could not turn on notifications. Please try again.",
      );
    }
  }

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(subscription),
  });

  if (!response.ok) {
    await subscription.unsubscribe().catch(() => {});
    throw new PushError(
      "failed",
      "Could not save the subscription. Please try again.",
    );
  }
}

// Re-save this browser's subscription for the signed-in user. If someone else
// used this browser last, notifications now belong to the current account.
export async function syncPushSubscription(): Promise<void> {
  const subscription = await existingSubscription();
  if (!subscription) return;

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(subscription),
  }).catch(() => {});
}

export async function disablePushNotifications(): Promise<void> {
  const subscription = await existingSubscription();
  if (!subscription) return;

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => {});

  await subscription.unsubscribe().catch(() => {});
}
