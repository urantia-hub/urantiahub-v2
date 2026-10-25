// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { messages } from "@/i18n/messages";

// Runs the real worker file with a stand-in for the worker scope, a cache, and a network.
function load(options: { kept: boolean; copies?: Record<string, string> }) {
  const handlers: Record<string, (event: never) => void> = {};
  const store = new Map(Object.entries(options.copies ?? {}).map(([path, body]) => [path, new Response(body)]));
  const net = { down: false, calls: [] as string[], answer: (path: string) => new Response(`new ${path}`) };
  const fetch = async (request: { url: string }) => {
    net.calls.push(new URL(request.url).pathname);
    if (net.down) throw new TypeError("no connection");
    // An answer of this site, as a browser marks it.
    return Object.defineProperty(net.answer(new URL(request.url).pathname), "type", { value: "basic" });
  };
  let has = options.kept;
  const cache = {
    match: async (path: string) => store.get(path)?.clone(),
    put: async (path: string, response: Response) => void store.set(path, response),
  };
  const caches = { has: async () => has, open: async () => cache, keys: async () => [], delete: async () => true };
  const self = { location: { origin: "https://www.urantiahub.com" }, addEventListener: (name: string, handler: (event: never) => void) => void (handlers[name] = handler), skipWaiting: () => {}, clients: { claim: async () => {} } };
  new Function("self", "caches", "URL", "fetch", readFileSync("public/sw.js", "utf8"))(self, caches, URL, fetch);
  // The answer of the worker, or "browser" when the worker leaves the request alone.
  const ask = async (path: string, mode = "navigate", method = "GET") => {
    let answer: Promise<Response> | null = null;
    const waits: Promise<unknown>[] = [];
    handlers.fetch({ request: { url: `https://www.urantiahub.com${path}`, mode, method }, respondWith: (p: Promise<Response>) => void (answer = p), waitUntil: (p: Promise<unknown>) => void waits.push(p) } as never);
    if (!answer) return "browser";
    const response = await (answer as Promise<Response>);
    await Promise.all(waits);
    return { status: response.status, text: await response.text() };
  };
  const tell = async () => {
    let work: Promise<unknown> = Promise.resolve();
    handlers.message({ data: { type: "offline" }, waitUntil: (p: Promise<unknown>) => void (work = p) } as never);
    await work;
  };
  return { ask, net, store, tell, turn: (on: boolean) => void (has = on) };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("a device that keeps no papers", () => {
  it("leaves each request to the browser", async () => {
    const worker = load({ kept: false });
    await settle();
    expect(await worker.ask("/papers/foreword")).toBe("browser");
    expect(await worker.ask("/_next/static/chunks/a.js", "no-cors")).toBe("browser");
    expect(worker.net.calls).toEqual([]);
  });

  it("starts to answer when the page says that the papers are kept", async () => {
    const worker = load({ kept: false });
    await settle();
    worker.turn(true);
    await worker.tell();
    worker.net.down = true;
    expect(await worker.ask("/papers/foreword")).toMatchObject({ status: 503 });
  });
});

describe("a device that keeps the papers", () => {
  const copies = { "/papers/foreword": "old foreword", "/_next/static/chunks/a.js": "old a" };

  it("gives the page of the network, and the copy takes it", async () => {
    const worker = load({ kept: true, copies });
    expect(await worker.ask("/papers/foreword")).toEqual({ status: 200, text: "new /papers/foreword" });
    expect(await worker.store.get("/papers/foreword")!.text()).toBe("new /papers/foreword");
  });

  it("gives the copy with no network, for an address with a query too", async () => {
    const worker = load({ kept: true, copies });
    worker.net.down = true;
    expect(await worker.ask("/papers/foreword?s=1")).toEqual({ status: 200, text: "old foreword" });
  });

  it("does not let an error page of the network into the copy", async () => {
    const worker = load({ kept: true, copies });
    worker.net.answer = () => new Response("broken", { status: 500 });
    await worker.ask("/papers/foreword");
    expect(await worker.store.get("/papers/foreword")!.text()).toBe("old foreword");
  });

  it("says that a paper is not on the device", async () => {
    const worker = load({ kept: true, copies });
    worker.net.down = true;
    const answer = await worker.ask("/papers/paper-5-gods-relation-to-the-individual");
    expect(answer).toMatchObject({ status: 503 });
    expect((answer as { text: string }).text).toContain("This paper is not on this device.");
    expect(((await worker.ask("/about")) as { text: string }).text).toContain("This page is not on this device.");
  });

  it("does not keep a page that the reader did not ask to keep", async () => {
    const worker = load({ kept: true, copies });
    await worker.ask("/about");
    expect(worker.store.has("/about")).toBe(false);
  });

  it("gives a file of the build from the copy with no request, and adds a file that it does not have", async () => {
    const worker = load({ kept: true, copies });
    expect(await worker.ask("/_next/static/chunks/a.js", "no-cors")).toEqual({ status: 200, text: "old a" });
    expect(worker.net.calls).toEqual([]);
    await worker.ask("/_next/static/chunks/b.js", "no-cors");
    expect(worker.store.has("/_next/static/chunks/b.js")).toBe(true);
  });

  it("leaves the reader's data, a sign-in, and a change to the browser", async () => {
    const worker = load({ kept: true, copies });
    expect(await worker.ask("/api/me/saved", "cors")).toBe("browser");
    expect(await worker.ask("/api/auth/start", "navigate")).toBe("browser");
    expect(await worker.ask("/papers/foreword", "navigate", "POST")).toBe("browser");
    expect(await worker.ask("/papers/foreword?_rsc=1", "cors")).toBe("browser");
  });
});

describe("the page of a missing copy", () => {
  const offlineText = async (path: string) => {
    const worker = load({ kept: true });
    worker.net.down = true;
    return ((await worker.ask(path)) as { text: string }).text;
  };

  it.each([
    ["/es", "offlinePageMissing"],
    ["/es/documentos/documento-1-el-padre-universal", "offlinePaperMissing"],
    ["/es/s/1.0.1", "offlinePageMissing"],
    ["/es/buscar", "offlinePageMissing"],
  ] as const)("speaks Spanish for %s", async (path, line) => {
    const t = messages("es");
    const text = await offlineText(path);
    expect(text).toContain('<html lang="es">');
    expect(text).toContain(`<h1>${t.offlineTitle}</h1>`);
    expect(text).toContain(`<p>${t[line]}</p>`);
    expect(text).toContain(`<a href="/es/documentos">${t.allPapers}</a>`);
  });

  it.each([
    ["/", "offlinePageMissing"],
    ["/search", "offlinePageMissing"],
    ["/papers/paper-1-the-universal-father", "offlinePaperMissing"],
    ["/espanol", "offlinePageMissing"],
  ] as const)("speaks English for %s", async (path, line) => {
    const t = messages("en");
    const text = await offlineText(path);
    expect(text).toContain('<html lang="en">');
    expect(text).toContain(`<h1>${t.offlineTitle}</h1>`);
    expect(text).toContain(`<p>${t[line]}</p>`);
    expect(text).toContain(`<a href="/papers">${t.allPapers}</a>`);
  });

  it("writes the words of the messages, because the worker cannot import them", () => {
    const file = readFileSync("public/sw.js", "utf8");
    for (const lang of ["en", "es"] as const) {
      const t = messages(lang);
      for (const words of [t.offlineTitle, t.offlinePaperMissing, t.offlinePageMissing, t.allPapers]) expect(file).toContain(JSON.stringify(words));
    }
  });
});
