self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = { title: "Sibble", body: event.data ? event.data.text() : "" };
  }
  const title = payload.title || "Sibble";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "It's your move.",
      tag: payload.tag || "tile-table",
      renotify: true,
      icon: "/icon-192.png",
      badge: "/favicon.png",
      data: { url: payload.url || "/lobby" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/lobby";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
