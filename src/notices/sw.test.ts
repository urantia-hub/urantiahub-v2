// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Runs the real worker file with a stand-in for the worker scope.
function load() {
  const handlers: Record<string, (event: never) => void> = {};
  const opened: string[] = [];
  const shown: { title: string; options: { body: string; data: { path: string } } }[] = [];
  const self = {
    location: { origin: "https://www.urantiahub.com" },
    addEventListener: (name: string, handler: (event: never) => void) => void (handlers[name] = handler),
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [], openWindow: async (url: string) => void opened.push(url) },
    registration: { showNotification: async (title: string, options: never) => void shown.push({ title, options }) },
  };
  new Function("self", "caches", "URL", readFileSync("public/sw.js", "utf8"))(self, { keys: async () => [], delete: async () => true }, URL);
  const run = async (name: string, event: object) => {
    let work: Promise<unknown> = Promise.resolve();
    handlers[name]({ ...event, waitUntil: (p: Promise<unknown>) => void (work = p) } as never);
    await work;
  };
  return { run, opened, shown };
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
    await worker.run("push", { data: { json: () => ({ title: "T".repeat(200), body: "B".repeat(500), path: "/\t/evil.example" }) } });
    expect(worker.shown[0].title).toHaveLength(80);
    expect(worker.shown[0].options.body).toHaveLength(240);
    expect(worker.shown[0].options.data.path).toBe("/");
  });

  it("shows a plain notice when the message cannot be read", async () => {
    const worker = load();
    await worker.run("push", { data: { json: () => { throw new Error("not JSON"); } } });
    expect(worker.shown[0].title).toBe("UrantiaHub");
  });
});
