// The service worker of UrantiaHub. It shows a notice and opens its link. It caches nothing.
// The Hub before this one had a worker at this address. Its caches are removed here.
// Whose device this is. The page writes the mark when a reader turns this device on, and removes it
// when that reader signs out or another reader signs in (src/notices/device-end.ts).
const OWNER_CACHE = "hub-notices";
const OWNER_PATH = "/__notices-owner";
async function owner() {
  try {
    const kept = await (await caches.open(OWNER_CACHE)).match(OWNER_PATH);
    return kept ? await kept.text() : null;
  } catch {
    return null;
  }
}

async function forget() {
  try {
    await (await caches.open(OWNER_CACHE)).delete(OWNER_PATH);
  } catch {
    // Nothing was kept.
  }
}

// The key of the reader who is signed in here, or null for no reader. Undefined when the site did
// not answer: that says nothing about the reader, so the notice shows.
async function signedIn() {
  try {
    const response = await fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) return undefined;
    const session = await response.json();
    return session && session.user && typeof session.user.key === "string" ? session.user.key : null;
  } catch {
    return undefined;
  }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== OWNER_CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

// A link of this site only. Any other value opens the home page. Only plain characters pass: a tab,
// a line end, or a backslash is read in more than one way, and the parser must agree on the site.
function path(value) {
  if (typeof value !== "string" || !/^\/[A-Za-z0-9\-._~/?&=%#:+]*$/.test(value) || value.startsWith("//")) return "/";
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.pathname + url.search + url.hash : "/";
  } catch {
    return "/";
  }
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
  event.waitUntil(
    owner().then(async (reader) => {
      const show = (heading, text, to) => self.registration.showNotification(heading, { body: text, icon: "/icon-192.png", badge: "/badge-96.png", data: { path: to } });
      const end = async () => {
        await forget();
        const current = await self.registration.pushManager.getSubscription();
        if (current) await current.unsubscribe();
      };
      // A notice shows only for the reader who turned this device on. In each other case nothing
      // shows, and this device ends: it gets no more notices.
      if (!reader || typeof notice.for !== "string" || notice.for !== reader) return end();
      // And only while that reader is signed in here. A sign-in can end by itself, and a device can
      // have a second reader. Then the notice of the reader does not show. One plain notice says
      // that the sign-in ended, and the device ends.
      const who = await signedIn();
      if (who === reader || who === undefined) return show(title, body, path(notice.path));
      await show("You are signed out of UrantiaHub", "Sign in to get your notices on this device again.", "/notifications");
      return end();
    }),
  );
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
