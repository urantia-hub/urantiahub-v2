// The service worker of UrantiaHub. It shows a notice and opens its link. For a reader who turned
// "Read offline" on, it answers a page from the copy on the device when the network does not.
// The Hub before this one had a worker at this address. Its caches are removed here.

// Read offline. The page puts the papers in this cache (src/reader/offline.ts), and the names match.
const OFFLINE = "offline-v1";
// True while this device keeps the papers. Null until the first look. With false, the worker
// leaves each request to the browser, so a reader with no copy pays nothing for this.
let kept = null;
const look = () =>
  caches
    .has(OFFLINE)
    .then((has) => (kept = has))
    .catch(() => (kept = false));
look();
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "offline") event.waitUntil(look());
});

// The page for an address that is not on the device. It takes the theme of the reader.
function missing(paper) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>No connection</title><style>html{background:#fbf8f2;color:#26221c}html[data-theme=dark]{background:#17150f;color:#e6dfd0}body{margin:0;padding:18vh 24px 0;font:17px/1.6 system-ui,sans-serif;text-align:center}h1{font:500 26px/1.2 Georgia,serif;margin:0 0 10px}p{margin:0 0 22px;opacity:.75}a{display:inline-block;padding:11px 20px;border-radius:999px;background:#26221c;color:#fbf8f2;text-decoration:none;font-weight:500;font-size:15px}html[data-theme=dark] a{background:#e6dfd0;color:#17150f}</style><script>try{if(localStorage.getItem("theme")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}</script></head><body><h1>No connection</h1><p>${paper ? "This paper is not on this device." : "This page is not on this device."}</p><a href="/papers">All papers</a></body></html>`;
  return new Response(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

// A page: the network first, so the reader gets the page of today, and the copy takes it too. With no
// answer in five seconds, or with no network, the copy answers.
async function page(event) {
  const request = event.request;
  const path = new URL(request.url).pathname;
  const cache = await caches.open(OFFLINE);
  const copy = await cache.match(path);
  const fromNetwork = fetch(request).then((response) => {
    if (copy && response.ok && !response.redirected && response.type === "basic") event.waitUntil(cache.put(path, response.clone()).catch(() => undefined));
    return response;
  });
  if (!copy) return fromNetwork.catch(() => missing(path.startsWith("/papers/")));
  const slow = new Promise((resolve) => setTimeout(() => resolve(copy), 5000));
  return Promise.race([fromNetwork.catch(() => copy), slow]);
}

// A file of a build never changes: the copy answers, and a file with no copy is added.
async function file(event) {
  const path = new URL(event.request.url).pathname;
  const cache = await caches.open(OFFLINE);
  const copy = await cache.match(path);
  if (copy) return copy;
  const response = await fetch(event.request);
  if (response.ok && response.type === "basic") event.waitUntil(cache.put(path, response.clone()).catch(() => undefined));
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (kept === false || request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isPage = request.mode === "navigate" && !url.pathname.startsWith("/api/");
  const isFile = url.pathname.startsWith("/_next/static/");
  if (!isPage && !isFile) return;
  event.respondWith((kept === null ? look() : Promise.resolve(kept)).then((has) => (!has ? fetch(request) : isPage ? page(event) : file(event))));
});

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
      .then((names) => Promise.all(names.filter((name) => name !== OFFLINE).map((name) => caches.delete(name))))
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
