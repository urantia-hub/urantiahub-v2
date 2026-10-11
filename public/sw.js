// The service worker of UrantiaHub. It shows a notice and opens its link. It caches nothing.
// The Hub before this one had a worker at this address. Its caches are removed here.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

// A link of this site only. Any other value opens the home page.
function path(value) {
  return typeof value === "string" && /^\/[^/\\]/.test(value) ? value : "/";
}

self.addEventListener("push", (event) => {
  let notice = {};
  try {
    notice = event.data ? event.data.json() : {};
  } catch {
    notice = {};
  }
  const title = typeof notice.title === "string" && notice.title ? notice.title.slice(0, 80) : "UrantiaHub";
  const body = typeof notice.body === "string" ? notice.body.slice(0, 240) : "";
  event.waitUntil(self.registration.showNotification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", data: { path: path(notice.path) } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(path(event.notification.data && event.notification.data.path), self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((open) => {
      const same = open.find((client) => client.url === target);
      return same ? same.focus() : self.clients.openWindow(target);
    }),
  );
});
