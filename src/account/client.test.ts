import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountState, resetAccountForTest, signInHref, signOut, startAccount, takeProblem } from "./client";

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
    expect(accountState()).toEqual({ status: "in", user: { name: "Ana", email: "ana@example.com" } });
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

  it("signs out with one request, and is signed out also when the request fails", async () => {
    document.cookie = "hub_in=1; path=/";
    const fetch = vi.fn(async () => Response.json({ enabled: true, user: { name: null, email: "a@b.c" } }));
    vi.stubGlobal("fetch", fetch);
    await startAccount();
    fetch.mockImplementationOnce(async () => { throw new Error("offline"); });
    await signOut();
    expect(fetch).toHaveBeenLastCalledWith("/api/auth/signout", expect.objectContaining({ method: "POST" }));
    expect(accountState()).toEqual({ status: "out" });
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
});
