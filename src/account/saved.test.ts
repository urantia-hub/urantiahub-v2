import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markSignedOut, resetAccountForTest, startAccount } from "./client";
import { addNote, changeNote, deleteNote, loadSaved, resetSavedForTest, savedState, subscribeToSaved, toggleBookmark } from "./saved";
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

  it("shows what the account holds when two presses both fail", async () => {
    await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : new Response("", { status: 503 })));
    await loadSaved("1");
    const first = toggleBookmark("1:0.3");
    const second = toggleBookmark("1:0.3");
    expect([await first, await second]).toEqual([false, false]);
    // The paragraph was not saved before the presses, and no press reached the account.
    expect(savedState().bookmarks.has("1:0.3")).toBe(false);
  });

  it("keeps a finished press when an older answer of the load arrives after it", async () => {
    let answerLoad: (response: Response) => void = () => {};
    await signedIn((url) => (url.startsWith("/api/me/saved") ? new Promise<Response>((resolve) => (answerLoad = resolve)) : Response.json({ ok: true })));
    const loading = loadSaved("1");
    // The reader removes a paragraph that the load, which started first, still lists. And saves another.
    expect(await toggleBookmark("1:0.5")).toBe(true);
    answerLoad(saved(["1:0.3"]));
    await loading;
    expect([...savedState().bookmarks].sort()).toEqual(["1:0.3", "1:0.5"]);
    expect(await toggleBookmark("1:0.3")).toBe(true);
    expect(await toggleBookmark("1:0.5")).toBe(true);
    let answerSecond: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", vi.fn((url: string) => (url.startsWith("/api/me/saved") ? new Promise<Response>((resolve) => (answerSecond = resolve)) : Promise.resolve(Response.json({ ok: true })))));
    const again = loadSaved("1");
    expect(await toggleBookmark("1:0.7")).toBe(true);
    // This answer is older than each press of this page.
    answerSecond(saved(["1:0.3", "1:0.5"]));
    await again;
    expect([...savedState().bookmarks]).toEqual(["1:0.7"]);
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

describe("a note", () => {
  const note = (id: string, text: string, at = "2026-10-05T00:00:00.000Z") => ({ id, ref: "1:0.3", text, at });

  it("is added at the end when the account took it", async () => {
    const fetch = await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : Response.json({ ok: true, note: note("n2", "Second.") })));
    await loadSaved("1");
    expect(await addNote("1:0.3", "Second.")).toEqual({ ok: true });
    expect(savedState().notes.map((n) => n.id)).toEqual(["n1", "n2"]);
    const [, init] = fetch.mock.calls.find(([url]) => url === "/api/me/notes")!;
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify({ ref: "1:0.3", text: "Second." }) });
  });

  it("is not added when the account did not take it", async () => {
    await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : new Response("", { status: 503 })));
    await loadSaved("1");
    expect(await addNote("1:0.3", "Second.")).toEqual({ ok: false, why: "failed" });
    expect(savedState().notes).toHaveLength(1);
  });

  it("is changed in its place", async () => {
    const fetch = await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : Response.json({ ok: true, note: note("n1", "New text.", "2026-10-02T00:00:00.000Z") })));
    await loadSaved("1");
    expect(await changeNote("n1", "New text.")).toEqual({ ok: true });
    expect(savedState().notes).toEqual([note("n1", "New text.", "2026-10-02T00:00:00.000Z")]);
    expect(calls(fetch).slice(1)).toEqual(["PUT /api/me/notes/n1"]);
  });

  it("leaves the page when the account says that it is gone", async () => {
    await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : Response.json({ ok: false, why: "gone" })));
    await loadSaved("1");
    expect(await changeNote("n1", "New text.")).toEqual({ ok: false, why: "gone" });
    expect(savedState().notes).toEqual([]);
  });

  it("is deleted", async () => {
    const fetch = await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : Response.json({ ok: true })));
    await loadSaved("1");
    expect(await deleteNote("n1")).toEqual({ ok: true });
    expect(savedState().notes).toEqual([]);
    expect(calls(fetch).slice(1)).toEqual(["DELETE /api/me/notes/n1"]);
  });

  it("stays when the delete fails", async () => {
    await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : new Response("", { status: 503 })));
    await loadSaved("1");
    expect(await deleteNote("n1")).toEqual({ ok: false, why: "failed" });
    expect(savedState().notes).toHaveLength(1);
  });

  it("stays on the page when an older answer of the load arrives after it", async () => {
    let answerLoad: (response: Response) => void = () => {};
    await signedIn((url) => (url.startsWith("/api/me/saved") ? new Promise<Response>((resolve) => (answerLoad = resolve)) : Response.json({ ok: true, note: note("n2", "Written during the load.") })));
    const loading = loadSaved("1");
    expect(await addNote("1:0.3", "Written during the load.")).toEqual({ ok: true });
    answerLoad(saved());
    await loading;
    expect(savedState().notes.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("is not added to the page of another reader", async () => {
    let answer: (response: Response) => void = () => {};
    await signedIn((url) => (url.startsWith("/api/me/saved") ? saved() : new Promise<Response>((resolve) => (answer = resolve))));
    await loadSaved("1");
    const adding = addNote("1:0.3", "Second.");
    await vi.waitFor(() => expect(answer).not.toBeUndefined());
    markSignedOut();
    answer(Response.json({ ok: true, note: note("n2", "Second.") }));
    expect(await adding).toEqual({ ok: false, why: "failed" });
    expect(savedState().notes).toEqual([]);
  });
});
