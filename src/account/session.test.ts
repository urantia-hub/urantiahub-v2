// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isFromThisSite, isSameOrigin, needsRefresh, readStart, safeNext, seal, type Session, unseal, writeStart } from "./session";

const SECRET = "a-test-secret-that-is-long-enough-0123456789";
const session: Session = {
  accessToken: "access",
  refreshToken: "refresh",
  expiresAt: "2026-10-09T12:15:00.000Z",
  user: { id: "u1", email: "reader@example.com", name: "Ana" },
};

describe("the session cookie", () => {
  it("gives back what was sealed", async () => {
    expect(await unseal(await seal(session, SECRET), SECRET)).toEqual(session);
  });

  it("does not show the tokens", async () => {
    const value = await seal(session, SECRET);
    expect(value).not.toContain("access");
    expect(value).not.toContain("refresh");
  });

  it("is nothing with another secret, after a change, or with no value", async () => {
    const value = await seal(session, SECRET);
    expect(await unseal(value, `${SECRET}x`)).toBeNull();
    expect(await unseal(`${value.slice(0, -2)}AA`, SECRET)).toBeNull();
    expect(await unseal(undefined, SECRET)).toBeNull();
    expect(await unseal("not-a-cookie", SECRET)).toBeNull();
  });

  it("is nothing when it does not hold a whole session", async () => {
    const part = await seal({ ...session, refreshToken: 5 } as unknown as Session, SECRET);
    expect(await unseal(part, SECRET)).toBeNull();
  });

  it("refuses a secret that is too short", async () => {
    await expect(seal(session, "short")).rejects.toThrow();
  });
});

describe("when the access token needs a refresh", () => {
  const at = (iso: string) => new Date(iso);
  it("is two minutes before its end, and for a date that is no date", () => {
    expect(needsRefresh(session, at("2026-10-09T12:10:00.000Z"))).toBe(false);
    expect(needsRefresh(session, at("2026-10-09T12:13:30.000Z"))).toBe(true);
    expect(needsRefresh({ ...session, expiresAt: "soon" }, at("2026-10-09T12:00:00.000Z"))).toBe(true);
  });
});

describe("where the reader goes after a sign-in", () => {
  it("is a path of this site, with its query and its paragraph", () => {
    expect(safeNext("/papers/paper-1-the-universal-father#1:0.3")).toBe("/papers/paper-1-the-universal-father#1:0.3");
    expect(safeNext("/papers?x=1")).toBe("/papers?x=1");
  });

  it("is the home page for anything that can leave this site", () => {
    for (const bad of [null, "", "papers", "//evil.example", "/\\evil.example", "https://evil.example/", "/\t/evil.example", "/api/auth/start", "/auth/callback?x=1", "/ok\nSet-Cookie: x"]) {
      expect(safeNext(bad)).toBe("/");
    }
  });

  it("is the home page for a path that only looks like another one", () => {
    for (const bad of ["/x/../api/auth/start", "/papers/../../auth/callback", "/./api/me/reader", "/%2e%2e/api/auth/start"]) expect(safeNext(bad)).toBe("/");
    expect(safeNext("/papers/../about")).toBe("/about");
  });

  it("cuts a path that is too long", () => {
    expect(safeNext(`/${"a".repeat(3000)}`)).toBe("/");
  });
});

describe("the start of a sign-in", () => {
  it("keeps the state, the verifier, and the path", () => {
    const value = writeStart({ state: "s1", codeVerifier: "v1", next: "/papers/foreword#0:1.2" });
    expect(readStart(value)).toEqual({ state: "s1", codeVerifier: "v1", next: "/papers/foreword#0:1.2" });
  });

  it("is nothing for a value that is not one", () => {
    expect(readStart(undefined)).toBeNull();
    expect(readStart("abc")).toBeNull();
    expect(readStart(encodeURIComponent(JSON.stringify({ state: "s", codeVerifier: 5, next: "/" })))).toBeNull();
  });

  it("never gives back a path that leaves this site", () => {
    const value = encodeURIComponent(JSON.stringify({ state: "s", codeVerifier: "v", next: "https://evil.example" }));
    expect(readStart(value)?.next).toBe("/");
  });
});

describe("where a request comes from", () => {
  const request = (headers: Record<string, string>) => new Request("https://next.urantiahub.com/api/me/place", { method: "PUT", headers });
  it("a write needs the Origin of this site", () => {
    expect(isSameOrigin(request({ origin: "https://next.urantiahub.com" }))).toBe(true);
    expect(isSameOrigin(request({ origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(request({}))).toBe(false);
  });
  it("a read from another site is refused when the browser says so", () => {
    expect(isFromThisSite(request({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isFromThisSite(request({}))).toBe(true);
    expect(isFromThisSite(request({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isFromThisSite(request({ "sec-fetch-site": "same-site" }))).toBe(false);
  });
});
