// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Runs the real worker file with a stand-in for the worker scope.
// `session`: the key of the reader who is signed in, null for nobody, "down" when the site does not answer.
function load(session: string | null | "down" = "k1") {
  const handlers: Record<string, (event: never) => void> = {};
  const opened: string[] = [];
  const shown: { title: string; options: { body: string; badge: string; data: { path: string } } }[] = [];
  const state = { unsubscribed: 0, deleted: [] as string[] };
  const fetch = async () => {
    if (session === "down") throw new Error("offline");
    return { ok: true, json: async () => ({ enabled: true, user: session ? { key: session } : null }) };
  };
  const self = {
    location: { origin: "https://www.urantiahub.com" },
    addEventListener: (name: string, handler: (event: never) => void) => void (handlers[name] = handler),
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (url: string) => void opened.push(url) },
    registration: {
      showNotification: async (title: string, options: never) => void shown.push({ title, options }),
      pushManager: { getSubscription: async () => ({ unsubscribe: async () => void state.unsubscribed++ }) },
    },
  };
  const caches = { keys: async () => ["hub-notices", "workbox-precache-v2"], delete: async (name: string) => void state.deleted.push(name) };
  new Function("self", "caches", "URL", "fetch", readFileSync("public/sw.js", "utf8"))(self, caches, URL, fetch);
  const run = async (name: string, event: object) => {
    let work: Promise<unknown> = Promise.resolve();
    handlers[name]({ ...event, waitUntil: (p: Promise<unknown>) => void (work = p) } as never);
    await work;
  };
  return { run, opened, shown, state };
}
const click = (path: unknown) => ({ notification: { close: () => {}, data: { path } } });

describe("the service worker", () => {
  it("opens the page of a notice on this site", async () => {
    const worker = load();
    await worker.run("notificationclick", click("/papers/paper-1-the-universal-father#1:0.1"));
    expect(worker.opened).toEqual(["https://www.urantiahub.com/papers/paper-1-the-universal-father#1:0.1"]);
  });

  // A tab or a backslash in an address is read in more than one way. None of these can leave the site.
  it.each([["//evil.example"], ["/\t/evil.example"], ["/\\evil.example"], ["/\n/evil.example"], ["https://evil.example/"], ["javascript:alert(1)"], [" /papers"], ["/papers\\..\\x"], [5], [null]])(
    "opens the home page for the address %j",
    async (path) => {
      const worker = load();
      await worker.run("notificationclick", click(path));
      expect(worker.opened).toEqual(["https://www.urantiahub.com/"]);
    },
  );

  it("shows a notice with a short title and text, and keeps only a link of this site", async () => {
    const worker = load();
    await worker.run("push", { data: { json: () => ({ for: "k1", title: "T".repeat(200), body: "B".repeat(500), path: "/\t/evil.example" }) } });
    expect(worker.shown[0].title).toHaveLength(80);
    expect(worker.shown[0].options.body).toHaveLength(240);
    expect(worker.shown[0].options.data.path).toBe("/");
    // Android draws the badge in one color. A full picture there shows as a white square.
    expect(worker.shown[0].options.badge).toBe("/badge-96.png");
  });

  const place = { for: "k1", title: "Your place in Paper 2", body: "“The first words …”", path: "/papers/paper-2#2:1" };

  // A sign-in can end by itself, and a device can have a second reader.
  it("says that the reader is signed out when nobody is signed in, and ends the device", async () => {
    const worker = load(null);
    await worker.run("push", { data: { json: () => place } });
    expect(worker.shown.map((n) => n.title)).toEqual(["You are signed out of UrantiaHub"]);
    expect(worker.shown[0].options.data.path).toBe("/notifications");
    expect(JSON.stringify(worker.shown)).not.toContain("Paper 2");
    expect(worker.state.unsubscribed).toBe(1);
  });

  it.each([
    ["another reader is signed in", "k2", place],
    ["the notice names no reader", "k1", { title: "Your place in Paper 2", body: "x" }],
  ])("shows a plain notice with no words of the reader when %s, and ends the device", async (_case, session, notice) => {
    const worker = load(session);
    await worker.run("push", { data: { json: () => notice } });
    expect(worker.shown.map((n) => n.title)).toEqual(["UrantiaHub"]);
    expect(JSON.stringify(worker.shown)).not.toContain("Paper 2");
    expect(worker.state.unsubscribed).toBe(1);
  });

  // Not known is not "signed in". The words of a reader's notice show only when the site says who is there.
  it("shows a plain notice with no words of the reader when the site does not answer, and keeps the device", async () => {
    const worker = load("down");
    await worker.run("push", { data: { json: () => ({ for: "k1", title: "Your place in Paper 2", body: "“The first words …”", path: "/papers/paper-2#2:1" }) } });
    expect(worker.shown).toHaveLength(1);
    expect(worker.shown[0].title).toBe("UrantiaHub");
    expect(worker.shown[0].options.body).toBe("Open UrantiaHub to see your notice.");
    expect(worker.shown[0].options.data.path).toBe("/");
    expect(JSON.stringify(worker.shown)).not.toContain("Paper 2");
    expect(worker.state.unsubscribed).toBe(0);
  });

  it("removes the caches of the old Hub, and of the earlier form of the notices", async () => {
    const worker = load();
    await worker.run("activate", {});
    expect(worker.state.deleted).toEqual(["hub-notices", "workbox-precache-v2"]);
  });
});
