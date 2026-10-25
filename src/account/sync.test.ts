import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LAST_READ_KEY, saveLastRead } from "@/reader/last-read";
import { setReadingLang } from "@/reader/reading-lang";
import { refreshAccount, resetAccountForTest, startAccount } from "./client";
import { ACCOUNT_DATA_KEY, forgetAccountData, markAccountData, flushRead, onPageShown, pullFromAccount, queueRead, resetSyncForTest, startSync } from "./sync";

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
  it("is removed when the reader is signed out: the place", () => {
    window.localStorage.setItem(LAST_READ_KEY, place("5", 100));
    window.localStorage.setItem("theme", "dark");
    markAccountData("k1");
    forgetAccountData();
    expect(window.localStorage.getItem(LAST_READ_KEY)).toBeNull();
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

// The reader can change with no sign-out on this page: another tab signed out, and another person
// signed in there. What this page collected is the first reader's, and must not go out under the second.
describe("what a page collected for one reader", () => {
  async function becomes(key: string, fetch: ReturnType<typeof vi.fn>) {
    fetch.mockImplementation(async (url: string) => (url === "/api/auth/session" ? Response.json({ enabled: true, user: { name: "Ben", email: null, key } }) : Response.json({ saved: 1, place: null, settings: null })));
    await refreshAccount();
  }

  it("does not go out as read paragraphs of the next reader", async () => {
    const fetch = await signedInAs("k1", async () => Response.json({ saved: 1 }));
    queueRead(["5:1.1", "5:1.2"]);
    await becomes("k2", fetch);
    queueRead(["9:2.1"]);
    await flushRead();
    const sent = fetch.mock.calls.filter(([url]) => url === "/api/me/read").map(([, init]) => JSON.parse(String((init as RequestInit).body)).refs);
    expect(sent).toEqual([["9:2.1"]]);
  });

  it("does not go out as the place of the next reader", async () => {
    startSync();
    const fetch = await signedInAs("k1", async () => Response.json({ saved: true }));
    saveLastRead({ paperId: "5", sectionId: "1", label: null });
    saveLastRead({ paperId: "5", sectionId: "2", label: null });
    const before = fetch.mock.calls.filter(([url]) => url === "/api/me/place").length;
    await becomes("k2", fetch);
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    await Promise.resolve();
    expect(fetch.mock.calls.filter(([url]) => url === "/api/me/place").length).toBe(before);
  });
});

// The browser can show a page again as it was, from its memory, when the reader presses Back. That
// page can be from before a sign-out, and it then shows the name and the place of the reader before.
describe("a page that the browser shows again from its memory", () => {
  it("loads again when the reader of the page is not the reader of the browser now", async () => {
    await signedInAs("k1", async () => Response.json({ place: null, settings: null }));
    await pullFromAccount();
    const reload = vi.fn();
    onPageShown(true, reload);
    expect(reload).not.toHaveBeenCalled();
    window.localStorage.removeItem(ACCOUNT_DATA_KEY);
    onPageShown(false, reload);
    expect(reload).not.toHaveBeenCalled();
    onPageShown(true, reload);
    expect(reload).toHaveBeenCalledTimes(1);
    window.localStorage.setItem(ACCOUNT_DATA_KEY, "k2");
    onPageShown(true, reload);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("stays as it is for a reader with no account", () => {
    const reload = vi.fn();
    onPageShown(true, reload);
    expect(reload).not.toHaveBeenCalled();
  });
});

// The theme and the text size belong to the device (Kelson, 2026-10-11): a phone and a computer need
// different sizes. Nothing of them goes to the account, and nothing of them comes from it.
describe("the theme and the text size", () => {
  it("do not go to the account when the reader changes one", async () => {
    const fetch = await signedInAs("k1", async () => Response.json({ place: null }));
    startSync();
    const { applyTheme } = await import("@/lib/theme");
    const { applyTextSize } = await import("@/lib/text-size");
    applyTheme("dark");
    applyTextSize(4);
    await Promise.resolve();
    expect(fetch.mock.calls.filter(([url]) => String(url).startsWith("/api/me/")).map(([url]) => url)).toEqual([]);
    applyTheme("light");
  });

  it("do not come from the account, also when an old record holds them", async () => {
    window.localStorage.setItem("theme", "light");
    await signedInAs("k1", async () => Response.json({ place: null, settings: { theme: "dark", textSize: 4, at: Date.now() } }));
    await pullFromAccount();
    expect(window.localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.dataset.theme).not.toBe("dark");
  });
});

// The language follows the reader: the last choice on any device wins (Kelson, 2026-10-24).
describe("the language", () => {
  const langPuts = (fetch: ReturnType<typeof vi.fn>) => fetch.mock.calls.filter(([url]) => url === "/api/me/lang").map(([, init]) => JSON.parse(String((init as RequestInit).body)));

  it("comes from the account when the account holds a newer choice", async () => {
    window.localStorage.setItem("hub:lang", "en");
    const fetch = await signedInAs("k1", async () => Response.json({ place: null, lang: { lang: "es", at: 10 } }));
    startSync();
    await pullFromAccount();
    expect(window.localStorage.getItem("hub:lang")).toBe("es");
    // A value applied from the account is not sent back.
    expect(langPuts(fetch)).toEqual([]);
  });

  it("goes to the account when the browser holds a newer choice", async () => {
    window.localStorage.setItem("hub:lang", "es");
    window.localStorage.setItem("hub:lang-at", "20");
    const fetch = await signedInAs("k1", async () => Response.json({ place: null, lang: { lang: "en", at: 10 } }));
    await pullFromAccount();
    expect(langPuts(fetch)).toEqual([{ lang: "es", at: 20 }]);
  });

  it("goes to the account at each new choice of a signed-in reader, and the last choice wins", async () => {
    const fetch = await signedInAs("k1", async () => Response.json({ place: null, lang: null }));
    startSync();
    await pullFromAccount();
    setReadingLang("es");
    setReadingLang("en");
    await vi.waitFor(() => expect(langPuts(fetch)).toHaveLength(2));
    expect(langPuts(fetch).map((value) => value.lang)).toEqual(["es", "en"]);
    // The page loads the other language at once, so the request must outlive it.
    const call = fetch.mock.calls.find(([url]) => url === "/api/me/lang");
    expect((call?.[1] as RequestInit).keepalive).toBe(true);
  });

  it("does not go out for a reader who is not signed in", async () => {
    const fetch = vi.fn<(url: string) => Promise<Response>>(async () => Response.json({}));
    vi.stubGlobal("fetch", fetch);
    startSync();
    setReadingLang("es");
    expect(fetch.mock.calls.some(([url]) => url === "/api/me/lang")).toBe(false);
  });
});
