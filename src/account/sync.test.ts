import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LAST_READ_KEY, saveLastRead } from "@/reader/last-read";
import { resetAccountForTest, startAccount } from "./client";
import { ACCOUNT_DATA_KEY, forgetAccountData, markAccountData, flushRead, pullFromAccount, queueRead, resetSyncForTest, SETTINGS_AT_KEY, startSync } from "./sync";

const place = (paperId: string, at: number) => JSON.stringify({ paperId, sectionId: "1", label: null, at });
const clearCookies = () => {
  for (const part of document.cookie.split(";")) document.cookie = `${part.split("=")[0].trim()}=; max-age=0; path=/`;
};

beforeEach(() => {
  window.localStorage.clear();
  clearCookies();
  resetAccountForTest(true);
  resetSyncForTest();
});
afterEach(() => vi.unstubAllGlobals());

// Answers the session as the reader with this key, and each other request through `other`.
async function signedInAs(key: string, other: (url: string, init?: RequestInit) => Promise<Response>) {
  document.cookie = "hub_in=1; path=/";
  const fetch = vi.fn(async (url: string, init?: RequestInit) => (url === "/api/auth/session" ? Response.json({ enabled: true, user: { name: "Ana", email: null, key } }) : other(url, init)));
  vi.stubGlobal("fetch", fetch);
  await startAccount();
  return fetch;
}

// A second person can sign in on the same browser. What the first person read must not go into the
// second person's account, and must not show on the page after a sign-out.
describe("what a signed-in reader leaves in the browser", () => {
  it("is removed when the reader is signed out: the place, and the time of the settings", () => {
    window.localStorage.setItem(LAST_READ_KEY, place("5", 100));
    window.localStorage.setItem(SETTINGS_AT_KEY, "200");
    window.localStorage.setItem("theme", "dark");
    markAccountData("k1");
    forgetAccountData();
    expect(window.localStorage.getItem(LAST_READ_KEY)).toBeNull();
    expect(window.localStorage.getItem(SETTINGS_AT_KEY)).toBeNull();
    expect(window.localStorage.getItem(ACCOUNT_DATA_KEY)).toBeNull();
    // The theme is not personal. It stays, so the page does not flash.
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  it("stays for a reader who never signed in", () => {
    window.localStorage.setItem(LAST_READ_KEY, place("5", 100));
    forgetAccountData();
    expect(window.localStorage.getItem(LAST_READ_KEY)).toBe(place("5", 100));
  });
});

describe("a pull from the account", () => {
  it("says which reader the page speaks for", async () => {
    const fetch = await signedInAs("k1", async () => Response.json({ place: null, settings: null }));
    await pullFromAccount();
    const call = fetch.mock.calls.find(([url]) => url === "/api/me/reader");
    expect(new Headers(call?.[1]?.headers).get("x-hub-reader")).toBe("k1");
  });

  // The mark is set before the request, so a pull that fails still leaves a mark to clean up by.
  it("marks the browser as this reader's before the answer comes", async () => {
    await signedInAs("k1", async () => {
      throw new Error("offline");
    });
    await pullFromAccount();
    expect(window.localStorage.getItem(ACCOUNT_DATA_KEY)).toBe("k1");
  });

  it("does not give the place of the reader before to the reader who is here now", async () => {
    window.localStorage.setItem(LAST_READ_KEY, place("5", Date.now()));
    window.localStorage.setItem(ACCOUNT_DATA_KEY, "k1");
    const fetch = await signedInAs("k2", async () => Response.json({ place: null, settings: null }));
    await pullFromAccount();
    expect(window.localStorage.getItem(LAST_READ_KEY)).toBeNull();
    expect(fetch.mock.calls.some(([url]) => url === "/api/me/place")).toBe(false);
    expect(window.localStorage.getItem(ACCOUNT_DATA_KEY)).toBe("k2");
  });

  it("puts nothing into the browser when the reader was signed out while the answer was on its way", async () => {
    let answer: (response: Response) => void = () => {};
    await signedInAs("k1", () => new Promise<Response>((resolve) => (answer = resolve)));
    const pulling = pullFromAccount();
    forgetAccountData();
    answer(Response.json({ place: { paperId: "9", sectionId: "2", label: null, at: Date.now() }, settings: { theme: "dark", textSize: 4, at: Date.now() } }));
    await pulling;
    expect(window.localStorage.getItem(LAST_READ_KEY)).toBeNull();
    expect(document.documentElement.dataset.theme).not.toBe("dark");
  });

  it("asks who is signed in again when the server says that the reader changed", async () => {
    window.localStorage.setItem(LAST_READ_KEY, place("5", Date.now()));
    const fetch = await signedInAs("k1", async () => Response.json({ changed: true }, { status: 409 }));
    await pullFromAccount();
    expect(fetch.mock.calls.filter(([url]) => url === "/api/auth/session")).toHaveLength(2);
    expect(window.localStorage.getItem(LAST_READ_KEY)).toBeNull();
  });

  // The place is saved when the page opens, before the server said who is signed in. That must not
  // use up the one request in 20 seconds: the place still goes out when the answer is there.
  it("sends the place that was saved before the server said who is signed in", async () => {
    startSync();
    document.cookie = "hub_in=1; path=/";
    let answer: (response: Response) => void = () => {};
    const fetch = vi.fn(async (url: string) => (url === "/api/auth/session" ? new Promise<Response>((resolve) => (answer = resolve)) : Response.json({ place: null, settings: null })));
    vi.stubGlobal("fetch", fetch);
    const started = startAccount();
    saveLastRead({ paperId: "1", sectionId: "0", label: null });
    answer(Response.json({ enabled: true, user: { name: "Ana", email: null, key: "k1" } }));
    await started;
    await pullFromAccount();
    expect(fetch.mock.calls.filter(([url]) => url === "/api/me/place")).toHaveLength(1);
  });
});

describe("the paragraphs that the reader read", () => {
  const bodyOf = (call: unknown[] | undefined) => JSON.parse(String((call?.[1] as RequestInit).body)) as { refs: string[] };
  const reads = (fetch: ReturnType<typeof vi.fn>) => fetch.mock.calls.filter(([url]) => url === "/api/me/read");

  it("go out as one batch, with the reader named", async () => {
    const fetch = await signedInAs("k1", async () => Response.json({ saved: 2 }));
    queueRead(["1:0.1", "1:0.2", "1:0.1"]);
    await flushRead();
    expect(reads(fetch)).toHaveLength(1);
    expect(bodyOf(reads(fetch)[0]).refs).toEqual(["1:0.1", "1:0.2"]);
    expect(new Headers((reads(fetch)[0][1] as RequestInit).headers).get("x-hub-reader")).toBe("k1");
    await flushRead();
    expect(reads(fetch)).toHaveLength(1);
  });

  it("are kept for the next try when the request fails", async () => {
    let fail = true;
    const fetch = await signedInAs("k1", async () => {
      if (fail) throw new Error("offline");
      return Response.json({ saved: 1 });
    });
    queueRead(["1:0.1"]);
    await flushRead();
    fail = false;
    queueRead(["1:0.2"]);
    await flushRead();
    expect(bodyOf(reads(fetch)[1]).refs).toEqual(["1:0.1", "1:0.2"]);
  });

  it("are not kept for a reader who is not signed in, and leave at a sign-out", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    queueRead(["1:0.1"]);
    await flushRead();
    expect(fetch).not.toHaveBeenCalled();

    const signedIn = await signedInAs("k1", async () => Response.json({ saved: 1 }));
    queueRead(["1:0.1"]);
    forgetAccountData();
    await flushRead();
    expect(reads(signedIn)).toHaveLength(0);
  });

  it("go out 200 at a time", async () => {
    const fetch = await signedInAs("k1", async () => Response.json({ saved: 200 }));
    queueRead(Array.from({ length: 250 }, (_, i) => `1:1.${i}`));
    await flushRead();
    expect(bodyOf(reads(fetch)[0]).refs).toHaveLength(200);
    await flushRead();
    expect(bodyOf(reads(fetch)[1]).refs).toHaveLength(50);
  });
});
