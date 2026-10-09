import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSignedOut, resetAccountForTest, startAccount } from "./client";
import { loadSaved, resetSavedForTest, savedState, subscribeToSaved, toggleBookmark } from "./saved";
import { resetSyncForTest } from "./sync";

type Other = (url: string, init?: RequestInit) => Promise<Response> | Response;
let session = "k1";

async function signedIn(other: Other) {
  document.cookie = "hub_in=1; path=/";
  const fetch = vi.fn(async (url: string, init?: RequestInit) => (url === "/api/auth/session" ? Response.json({ enabled: true, user: { name: "Ana", email: null, key: session } }) : other(url, init)));
  vi.stubGlobal("fetch", fetch);
  await startAccount();
  return fetch;
}
const saved = (bookmarks: string[] = []) => Response.json({ bookmarks, notes: [{ id: "n1", ref: "1:0.3", text: "A note.", at: "2026-10-02T00:00:00.000Z" }] });
const calls = (fetch: ReturnType<typeof vi.fn>) => fetch.mock.calls.filter(([url]) => String(url).startsWith("/api/me/")).map(([url, init]) => `${(init as RequestInit | undefined)?.method ?? "GET"} ${url}`);

beforeEach(() => {
  window.localStorage.clear();
  for (const part of document.cookie.split(";")) document.cookie = `${part.split("=")[0].trim()}=; max-age=0; path=/`;
  session = "k1";
  resetAccountForTest(true);
  resetSyncForTest();
  resetSavedForTest();
});
afterEach(() => vi.unstubAllGlobals());

describe("what the reader saved in the open paper", () => {
  it("loads for the signed-in reader, with the reader's key", async () => {
    const fetch = await signedIn(() => saved(["1:0.3"]));
    await loadSaved("1");
    expect(savedState()).toMatchObject({ status: "ready", paperId: "1" });
    expect([...savedState().bookmarks]).toEqual(["1:0.3"]);
    expect(savedState().notes).toHaveLength(1);
    const [, init] = fetch.mock.calls.find(([url]) => url === "/api/me/saved?paper=1")!;
    expect((init as RequestInit).headers).toMatchObject({ "x-hub-reader": "k1" });
  });

  it("asks nothing for a reader with no account", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await startAccount();
    await loadSaved("1");
    expect(fetch).not.toHaveBeenCalled();
    expect(savedState().status).toBe("none");
  });

  it("says that the load failed, and a save still works", async () => {
    await signedIn((url) => (url.startsWith("/api/me/saved") ? new Response("", { status: 503 }) : Response.json({ ok: true })));
    await loadSaved("1");
    expect(savedState().status).toBe("failed");
    expect(await toggleBookmark("1:0.3")).toBe(true);
    expect(savedState().bookmarks.has("1:0.3")).toBe(true);
  });

  it("is empty after a sign-out, and drops an answer that arrives late", async () => {
    let answer: (response: Response) => void = () => {};
    await signedIn(() => new Promise<Response>((resolve) => (answer = resolve)));
    const loading = loadSaved("1");
    markSignedOut();
    answer(saved(["1:0.3"]));
    await loading;
    expect(savedState()).toMatchObject({ status: "none", paperId: null });
    expect(savedState().bookmarks.size).toBe(0);
  });
});

describe("a press on Save", () => {
  it("shows at once, and goes to the account", async () => {
    const fetch = await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : Response.json({ ok: true })));
    await loadSaved("1");
    const seen: boolean[] = [];
    subscribeToSaved(() => seen.push(savedState().bookmarks.has("1:0.3")));
    const done = toggleBookmark("1:0.3");
    expect(seen).toEqual([true]);
    expect(await done).toBe(true);
    expect(await toggleBookmark("1:0.3")).toBe(true);
    expect(savedState().bookmarks.has("1:0.3")).toBe(false);
    expect(calls(fetch).slice(1)).toEqual(["POST /api/me/bookmarks", "DELETE /api/me/bookmarks?ref=1%3A0.3"]);
  });

  it.each([
    ["the server is down", () => new Response("", { status: 503 })],
    ["the value is refused", () => Response.json({ ok: false, why: "bad" })],
    ["there is no connection", () => Promise.reject(new TypeError("offline"))],
  ])("goes back when %s", async (_name, answer) => {
    await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : answer()));
    await loadSaved("1");
    expect(await toggleBookmark("1:0.3")).toBe(false);
    expect(savedState().bookmarks.has("1:0.3")).toBe(false);
  });

  it("sends two fast presses in their order, and the last one wins", async () => {
    const waiting: ((response: Response) => void)[] = [];
    const fetch = await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : new Promise<Response>((resolve) => waiting.push(resolve))));
    await loadSaved("1");
    const first = toggleBookmark("1:0.3");
    const second = toggleBookmark("1:0.3");
    await vi.waitFor(() => expect(waiting).toHaveLength(1));
    // The removal waits for the answer to the save.
    expect(calls(fetch).slice(1)).toEqual(["POST /api/me/bookmarks"]);
    waiting[0](Response.json({ ok: true }));
    await vi.waitFor(() => expect(waiting).toHaveLength(2));
    waiting[1](Response.json({ ok: true }));
    expect([await first, await second]).toEqual([true, true]);
    expect(savedState().bookmarks.has("1:0.3")).toBe(false);
  });

  it("keeps what the server holds when the second of two presses fails", async () => {
    let n = 0;
    await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : ++n === 1 ? Response.json({ ok: true }) : new Response("", { status: 503 })));
    await loadSaved("1");
    const first = toggleBookmark("1:0.3");
    const second = toggleBookmark("1:0.3");
    expect([await first, await second]).toEqual([true, false]);
    expect(savedState().bookmarks.has("1:0.3")).toBe(true);
  });

  it("does nothing for a reader with no account", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await startAccount();
    expect(await toggleBookmark("1:0.3")).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("asks who is here when the server says that the reader changed, and keeps nothing of the reader before", async () => {
    const fetch = await signedIn((url) => (url.startsWith("/api/me/saved") ? saved(["1:0.5"]) : Response.json({ changed: true }, { status: 409 })));
    await loadSaved("1");
    session = "k2";
    expect(await toggleBookmark("1:0.3")).toBe(false);
    await vi.waitFor(() => expect(fetch.mock.calls.filter(([url]) => url === "/api/auth/session")).toHaveLength(2));
    await vi.waitFor(() => expect(savedState().bookmarks.size).toBe(0));
  });
});
