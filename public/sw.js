/* Awn service worker — web push receipt + click routing.
   Kept dependency-free and defensive: a malformed payload must never throw
   inside the push handler. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Awn", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Awn";
  const options = {
    body: data.body || "",
    icon: "/logo.jpeg",
    badge: "/logo.jpeg",
    tag: data.tag || undefined,
    data: { url: data.url || "/dashboard" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        // Focus an existing tab already on the target, else navigate one.
        if ("focus" in w) {
          if (w.url === target) return w.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
