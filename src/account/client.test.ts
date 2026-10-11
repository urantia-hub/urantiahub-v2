import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endDevice, syncDevice } from "@/notices/device-end";
import { accountState, markSignedOut, refreshAccount, resetAccountForTest, signInHref, signOut, startAccount, takeProblem } from "./client";

vi.mock("@/notices/device-end", () => ({ endDevice: vi.fn(async () => {}), syncDevice: vi.fn(async () => {}) }));

const clearCookies = () => {
  for (const part of document.cookie.split(";")) document.cookie = `${part.split("=")[0].trim()}=; max-age=0; path=/`;
};
beforeEach(() => {
  clearCookies();
  resetAccountForTest(true);
});
afterEach(() => vi.unstubAllGlobals());

describe("who is signed in, in the browser", () => {
  it("is no one with no mark, and asks the server nothing", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await startAccount();
    expect(accountState()).toEqual({ status: "out" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is the reader of the session when the mark is there", async () => {
    document.cookie = "hub_in=1; path=/";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: true, user: { name: "Ana", email: "ana@example.com" } })));
    const started = startAccount();
    expect(accountState()).toEqual({ status: "in", user: null });
    await started;
    expect(accountState()).toEqual({ status: "in", user: { name: "Ana", email: "ana@example.com", key: null } });
  });

  it("is no one when the server says so, and stays as it is when the server does not answer", async () => {
    document.cookie = "hub_in=1; path=/";
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: true, user: null })));
    await startAccount();
    expect(accountState()).toEqual({ status: "out" });

    resetAccountForTest(true);
    document.cookie = "hub_in=1; path=/";
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    await startAccount();
    expect(accountState()).toEqual({ status: "in", user: null });
  });

  it("is off when the sign-in is not set up", async () => {
    resetAccountForTest(false);
    document.cookie = "hub_in=1; path=/";
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await startAccount();
    expect(accountState()).toEqual({ status: "off" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("signs out with one request", async () => {
    document.cookie = "hub_in=1; path=/";
    const fetch = vi.fn(async () => Response.json({ enabled: true, user: { name: null, email: "a@b.c" } }));
    vi.stubGlobal("fetch", fetch);
    await startAccount();
    fetch.mockImplementationOnce(async () => Response.json({ signedOut: true }));
    expect(await signOut()).toBe(true);
    expect(fetch).toHaveBeenLastCalledWith("/api/auth/signout", expect.objectContaining({ method: "POST" }));
    expect(accountState()).toEqual({ status: "out" });
  });

  // The session is a cookie that only the server can end. If the server did not end it, the reader is
  // still signed in, and the page must not say something else: on a shared computer that is a risk.
  it("stays signed in when the sign-out did not reach the server, or the server refused it", async () => {
    document.cookie = "hub_in=1; path=/";
    const user = { name: null, email: "a@b.c", key: "k1" };
    const fetch = vi.fn(async () => Response.json({ enabled: true, user }));
    vi.stubGlobal("fetch", fetch);
    await startAccount();
    fetch.mockImplementationOnce(async () => { throw new Error("offline"); });
    expect(await signOut()).toBe(false);
    expect(accountState()).toEqual({ status: "in", user });
    fetch.mockImplementationOnce(async () => Response.json({ detail: "no" }, { status: 403 }));
    expect(await signOut()).toBe(false);
    expect(accountState()).toEqual({ status: "in", user });
  });
});

describe("the link to the sign-in", () => {
  it("returns the reader to this page and this paragraph", () => {
    window.history.replaceState(null, "", "/papers/foreword?x=1#0:1.2");
    expect(signInHref()).toBe(`/api/auth/start?next=${encodeURIComponent("/papers/foreword?x=1#0:1.2")}`);
  });
});

describe("a sign-in that did not finish", () => {
  it("is said one time", () => {
    document.cookie = "hub_signin_problem=1; path=/";
    expect(takeProblem()).toBe(true);
    expect(takeProblem()).toBe(false);
  });

  // A notice can show a reader's place. A device must not get the notices of a reader who left it.
  it("ends this device for notices before a sign-out, with the key of the reader", async () => {
    document.cookie = "hub_in=1; path=/";
    const fetch = vi.fn(async () => Response.json({ enabled: true, user: { name: null, email: "a@b.c", key: "k1" } }));
    vi.stubGlobal("fetch", fetch);
    await startAccount();
    vi.mocked(endDevice).mockClear();
    fetch.mockImplementationOnce(async () => Response.json({ signedOut: true }));
    await signOut();
    expect(endDevice).toHaveBeenCalledWith("k1");
    expect(vi.mocked(endDevice).mock.invocationCallOrder[0]).toBeLessThan(fetch.mock.invocationCallOrder.at(-1) ?? 0);
  });

  it("adds this device for a signed-in reader one time, and again for another reader", async () => {
    document.cookie = "hub_in=1; path=/";
    const fetch = vi.fn(async () => Response.json({ enabled: true, user: { name: null, email: "a@b.c", key: "k1" } }));
    vi.stubGlobal("fetch", fetch);
    vi.mocked(syncDevice).mockClear();
    await startAccount();
    await refreshAccount();
    expect(vi.mocked(syncDevice).mock.calls).toEqual([["k1"]]);
    fetch.mockImplementation(async () => Response.json({ enabled: true, user: { name: null, email: "b@b.c", key: "k2" } }));
    await refreshAccount();
    expect(syncDevice).toHaveBeenLastCalledWith("k2");
    markSignedOut();
    expect(syncDevice).toHaveBeenCalledTimes(2);
  });
});
