"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import {
  disablePushNotifications,
  enablePushNotifications,
  existingSubscription,
  isPushSupported,
  notificationPermission,
  PushError,
  syncPushSubscription,
} from "@/lib/push-client";

type Status = "checking" | "off" | "on" | "unsupported" | "blocked";

export default function NotificationsToggle({
  publicKey,
}: {
  publicKey: string;
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!isPushSupported()) {
        if (!cancelled) setStatus("unsupported");
        return;
      }
      if (notificationPermission() === "denied") {
        if (!cancelled) setStatus("blocked");
        return;
      }

      const subscription = await existingSubscription();
      if (!cancelled) setStatus(subscription ? "on" : "off");
      if (subscription) void syncPushSubscription();
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle() {
    if (busy || status === "checking" || status === "unsupported") return;

    setBusy(true);
    setMessage(null);
    try {
      if (status === "on") {
        await disablePushNotifications();
        setStatus("off");
        setMessage("Notifications are off for this browser.");
      } else {
        await enablePushNotifications(publicKey);
        setStatus("on");
        setMessage("Notifications are on for this browser.");
      }
    } catch (error) {
      if (error instanceof PushError) {
        setMessage(error.message);
        if (error.code === "blocked") setStatus("blocked");
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const on = status === "on";
  const disabled =
    busy || status === "checking" || status === "unsupported" || status === "blocked";

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-[#dbdbdb] bg-white">
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fafafa] text-[#262626]">
          {on ? (
            <Bell size={18} strokeWidth={1.8} />
          ) : (
            <BellOff size={18} strokeWidth={1.8} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-[#262626]">
            Notifications
          </h2>
          <p className="mt-0.5 text-[12px] leading-4 text-[#8e8e8e]">
            Get a notification when someone messages you, even when this tab is
            closed. On iPhone, add HiJordan to your Home Screen first.
          </p>

          {status === "unsupported" ? (
            <p className="mt-2 text-[12px] text-[#8e8e8e]">
              This browser doesn&apos;t support notifications.
            </p>
          ) : null}

          {status === "blocked" ? (
            <p className="mt-2 text-[12px] text-[#ed4956]">
              Notifications are blocked. Allow them in your browser settings,
              then reload this page.
            </p>
          ) : null}

          {message && status !== "blocked" ? (
            <p
              role="status"
              className={`mt-2 text-[12px] ${
                on ? "text-[#1a8917]" : "text-[#8e8e8e]"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Browser notifications"
          onClick={() => void toggle()}
          disabled={disabled}
          className={`mt-0.5 flex h-[26px] w-[46px] shrink-0 items-center rounded-full p-[3px] transition ${
            on ? "bg-[#0095f6]" : "bg-[#dbdbdb]"
          } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          <span
            className={`size-5 rounded-full bg-white shadow-sm transition ${
              on ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </section>
  );
}
