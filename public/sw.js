/* Service worker for web push notifications. Served at /sw.js. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function readPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json() || {};
  } catch {
    return { body: event.data.text() };
  }
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event);

  event.waitUntil(
    (async () => {
      // If the user is looking at HiJordan in a visible tab, the app updates
      // itself. Don't interrupt with an OS notification.
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const focused = windows.some(
        (client) => client.focused && client.visibilityState === "visible",
      );
      if (focused) return;

      await self.registration.showNotification(payload.title || "HiJordan", {
        body: payload.body || "New message",
        icon: "/notification-icon.png",
        badge: "/notification-badge.png",
        tag: payload.tag || "hijordan",
        renotify: true,
        data: { url: payload.url || "/" },
        timestamp: payload.timestamp || Date.now(),
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target);
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
