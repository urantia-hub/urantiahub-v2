// @vitest-environment node
import { AuthError } from "@urantia/auth/server";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { Refused } from "./call";
import { type Deps, handleCallback, handleReader, handleSession, handleSignOut, handleStart } from "./handlers";
import { ASK_COOKIE, IN_COOKIE, PROBLEM_COOKIE, seal, SESSION_COOKIE, type Session, START_COOKIE, unseal, writeStart } from "./session";

const ORIGIN = "https://next.urantiahub.com";
const SECRET = "a-test-secret-that-is-long-enough-0123456789";
const session: Session = { accessToken: "a1", refreshToken: "r1", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "u1", email: "ana@example.com", name: "Ana" } };
const tokens = { accessToken: "a1", refreshToken: "r1", expiresAt: "2099-01-01T00:00:00.000Z", userId: "u1", email: "ana@example.com", scopes: ["profile"] };

function deps(over: Partial<Deps> = {}): Deps {
  return {
    secret: SECRET,
    origin: ORIGIN,
    authorize: vi.fn(async ({ askAccount }) => ({ url: `https://accounts.example/authorize?ask=${askAccount ? 1 : 0}`, state: "s1", codeVerifier: "v1" })),
    exchange: vi.fn(async () => tokens),
    refresh: vi.fn(async () => ({ ...tokens, accessToken: "a2", refreshToken: "r2" })),
    revoke: vi.fn(async () => {}),
    profileName: vi.fn(async () => "Ana"),
    ...over,
  };
}

async function request(path: string, init: { method?: string; cookies?: Record<string, string>; headers?: Record<string, string>; session?: Session | null; body?: unknown } = {}) {
  const cookies = { ...init.cookies };
  if (init.session) cookies[SESSION_COOKIE] = await seal(init.session, SECRET);
  const cookie = Object.entries(cookies).map(([name, value]) => `${name}=${value}`).join("; ");
  return new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers: { ...(cookie ? { cookie } : {}), ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}
const cookieOf = (response: Response, name: string) => (response as unknown as { cookies: { get(n: string): { value: string; maxAge?: number; httpOnly?: boolean; path?: string } | undefined } }).cookies.get(name);

describe("the start of a sign-in", () => {
  it("sends the reader to the accounts site, and keeps the state and the page in a short cookie", async () => {
    const response = await handleStart(await request(`/api/auth/start?next=${encodeURIComponent("/papers/foreword#0:1.2")}`), deps());
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://accounts.example/authorize?ask=0");
    const start = cookieOf(response, START_COOKIE);
    expect(start?.httpOnly).toBe(true);
    expect(decodeURIComponent(start?.value ?? "")).toContain('"next":"/papers/foreword#0:1.2"');
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("is not silent after a sign-out", async () => {
    const response = await handleStart(await request("/api/auth/start", { cookies: { [ASK_COOKIE]: "1" } }), deps());
    expect(response.headers.get("location")).toContain("ask=1");
  });

  it("never keeps a page of another site", async () => {
    const response = await handleStart(await request("/api/auth/start?next=https://evil.example/x"), deps());
    expect(decodeURIComponent(cookieOf(response, START_COOKIE)?.value ?? "")).toContain('"next":"/"');
  });

  it("goes home when the sign-in is not set up", async () => {
    const response = await handleStart(await request("/api/auth/start?next=/papers"), deps({ secret: "" }));
    expect(response.headers.get("location")).toBe(`${ORIGIN}/papers`);
  });
});

describe("the return from the accounts site", () => {
  const start = { [START_COOKIE]: writeStart({ state: "s1", codeVerifier: "v1", next: "/papers/foreword#0:1.2" }) };

  it("keeps the session and returns the reader to the page", async () => {
    const d = deps();
    const response = await handleCallback(await request("/auth/callback?code=c1&state=s1", { cookies: { ...start, [ASK_COOKIE]: "1" } }), d);
    expect(response.headers.get("location")).toBe(`${ORIGIN}/papers/foreword#0:1.2`);
    expect(d.exchange).toHaveBeenCalledWith({ code: "c1", codeVerifier: "v1" });
    const kept = cookieOf(response, SESSION_COOKIE);
    expect(kept?.httpOnly).toBe(true);
    expect(await unseal(kept?.value, SECRET)).toEqual(session);
    expect(cookieOf(response, IN_COOKIE)?.value).toBe("1");
    expect(cookieOf(response, IN_COOKIE)?.httpOnly).toBeFalsy();
    expect(cookieOf(response, START_COOKIE)?.maxAge).toBe(0);
    expect(cookieOf(response, ASK_COOKIE)?.maxAge).toBe(0);
  });

  it("signs in with no name when the profile does not load", async () => {
    const response = await handleCallback(await request("/auth/callback?code=c1&state=s1", { cookies: start }), deps({ profileName: async () => { throw new Error("down"); } }));
    expect((await unseal(cookieOf(response, SESSION_COOKIE)?.value, SECRET))?.user.name).toBeNull();
  });

  it("refuses a state that this browser did not start", async () => {
    const d = deps();
    for (const path of ["/auth/callback?code=c1&state=other", "/auth/callback?code=c1"]) {
      const response = await handleCallback(await request(path, { cookies: start }), d);
      expect(cookieOf(response, SESSION_COOKIE)).toBeUndefined();
      expect(cookieOf(response, PROBLEM_COOKIE)?.value).toBe("1");
    }
    const none = await handleCallback(await request("/auth/callback?code=c1&state=s1"), d);
    expect(none.headers.get("location")).toBe(`${ORIGIN}/`);
    expect(d.exchange).not.toHaveBeenCalled();
  });

  it("returns the reader to the page, signed out, when the exchange fails or the reader said no", async () => {
    const failed = await handleCallback(await request("/auth/callback?code=c1&state=s1", { cookies: start }), deps({ exchange: async () => { throw new AuthError("unavailable", "down"); } }));
    expect(failed.headers.get("location")).toBe(`${ORIGIN}/papers/foreword#0:1.2`);
    expect(cookieOf(failed, SESSION_COOKIE)).toBeUndefined();
    expect(cookieOf(failed, PROBLEM_COOKIE)?.value).toBe("1");
    const denied = await handleCallback(await request("/auth/callback?error=access_denied&state=s1", { cookies: start }), deps());
    expect(denied.headers.get("location")).toBe(`${ORIGIN}/papers/foreword#0:1.2`);
    expect(cookieOf(denied, SESSION_COOKIE)).toBeUndefined();
  });
});

describe("who is signed in", () => {
  it("is the reader of the cookie, with no token in the answer", async () => {
    const response = await handleSession(await request("/api/auth/session", { session }), deps());
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ enabled: true, user: { name: "Ana", email: "ana@example.com" } });
    expect(body).not.toContain("a1");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("is no one with no cookie, and removes the mark of a sign-in that is gone", async () => {
    const response = await handleSession(await request("/api/auth/session", { cookies: { [IN_COOKIE]: "1" } }), deps());
    expect(await response.json()).toEqual({ enabled: true, user: null });
    expect(cookieOf(response, IN_COOKIE)?.maxAge).toBe(0);
  });

  it("says that the sign-in is off when it is not set up", async () => {
    expect(await (await handleSession(await request("/api/auth/session"), deps({ secret: "" }))).json()).toEqual({ enabled: false, user: null });
  });
});

describe("a sign-out", () => {
  const post = (headers: Record<string, string>) => request("/api/auth/signout", { method: "POST", session, headers });

  it("ends the session here and on the service, and makes the next sign-in not silent", async () => {
    const d = deps();
    const response = await handleSignOut(await post({ origin: ORIGIN }), d);
    expect(response.status).toBe(200);
    expect(d.revoke).toHaveBeenCalledWith("r1");
    expect(cookieOf(response, SESSION_COOKIE)?.maxAge).toBe(0);
    expect(cookieOf(response, IN_COOKIE)?.maxAge).toBe(0);
    expect(cookieOf(response, ASK_COOKIE)?.value).toBe("1");
  });

  it("still signs out here when the service is down", async () => {
    const response = await handleSignOut(await post({ origin: ORIGIN }), deps({ revoke: async () => { throw new Error("down"); } }));
    expect(response.status).toBe(200);
    expect(cookieOf(response, SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("is refused from another site", async () => {
    const d = deps();
    expect((await handleSignOut(await post({ origin: "https://evil.example" }), d)).status).toBe(403);
    expect((await handleSignOut(await post({}), d)).status).toBe(403);
    expect(d.revoke).not.toHaveBeenCalled();
  });
});

describe("a request for the reader's data", () => {
  const run = vi.fn(async (token: string) => ({ token }));

  it("needs a session", async () => {
    const response = await handleReader(await request("/api/me/reader"), deps(), run);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ signedOut: true });
  });

  it("answers with the data, and never with a cache", async () => {
    const response = await handleReader(await request("/api/me/reader", { session }), deps(), run);
    expect(await response.json()).toEqual({ token: "a1" });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(cookieOf(response, SESSION_COOKIE)).toBeUndefined();
  });

  it("saves the new session after a refresh", async () => {
    const old = { ...session, expiresAt: "2000-01-01T00:00:00.000Z" };
    const response = await handleReader(await request("/api/me/reader", { session: old }), deps(), run);
    expect(await response.json()).toEqual({ token: "a2" });
    const kept = await unseal(cookieOf(response, SESSION_COOKIE)?.value, SECRET);
    expect(kept).toMatchObject({ accessToken: "a2", refreshToken: "r2", user: { name: "Ana" } });
  });

  it("signs the reader out when the API refuses, and keeps the reader in for an outage", async () => {
    const refused = await handleReader(await request("/api/me/reader", { session }), deps({ refresh: async () => { throw new AuthError("refused", "no"); } }), async () => { throw new Refused(); });
    expect(refused.status).toBe(401);
    expect(cookieOf(refused, SESSION_COOKIE)?.maxAge).toBe(0);
    expect(cookieOf(refused, IN_COOKIE)?.maxAge).toBe(0);
    const down = await handleReader(await request("/api/me/reader", { session }), deps(), async () => { throw new Error("500"); });
    expect(down.status).toBe(503);
    expect(cookieOf(down, SESSION_COOKIE)).toBeUndefined();
  });

  it("refuses a read from another site, and a write with no Origin of this site", async () => {
    const d = deps();
    const calls = vi.fn(async () => ({}));
    expect((await handleReader(await request("/api/me/reader", { session, headers: { "sec-fetch-site": "cross-site" } }), d, calls)).status).toBe(403);
    expect((await handleReader(await request("/api/me/place", { session, method: "PUT", body: {} }), d, calls)).status).toBe(403);
    expect((await handleReader(await request("/api/me/place", { session, method: "PUT", body: {}, headers: { origin: "https://evil.example" } }), d, calls)).status).toBe(403);
    expect(calls).not.toHaveBeenCalled();
    expect((await handleReader(await request("/api/me/place", { session, method: "PUT", body: {}, headers: { origin: ORIGIN } }), d, calls)).status).toBe(200);
  });
});
