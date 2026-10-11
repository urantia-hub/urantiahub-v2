// The service worker of UrantiaHub. It shows a notice and opens its link. It caches nothing.
// The Hub before this one had a worker at this address. Its caches are removed here.
// The key of the reader who is signed in here, or null for no reader. Undefined when the site did
// not answer: then it is not known who is signed in.
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
      .then((names) => Promise.all(names.map((name) => caches.delete(name))))
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
    signedIn().then(async (who) => {
      const show = (heading, text, to) => self.registration.showNotification(heading, { body: text, icon: "/icon-192.png", badge: "/badge-96.png", data: { path: to } });
      const end = async () => {
        const current = await self.registration.pushManager.getSubscription();
        if (current) await current.unsubscribe();
      };
      // A notice shows only while its reader is signed in on this device. A device can have a second
      // reader, and a sign-in can end by itself.
      if (typeof notice.for === "string" && who === notice.for) return show(title, body, path(notice.path));
      // The site did not answer, so it is not known who is signed in. The words of the notice do not
      // show then. A plain notice shows, and the device stays: the next notice asks again.
      if (who === undefined) return show("UrantiaHub", "Open UrantiaHub to see your notice.", "/");
      // Nobody is signed in: one plain notice says so. Another reader is signed in: a plain notice with
      // no words of the first reader. In both cases this device ends for that reader. A reader who
      // signs in here gets the device again with no press.
      if (who === null) await show("You are signed out of UrantiaHub", "Sign in to get your notices on this device again.", "/notifications");
      else await show("UrantiaHub", "Open UrantiaHub to see your notice.", "/");
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
