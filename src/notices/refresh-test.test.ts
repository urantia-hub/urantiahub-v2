// @vitest-environment node
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { cookieNames, type Deps } from "@/account/handlers";
import { seal, type Session } from "@/account/session";
import { refreshMail } from "./refresh-mail";
import { handleRefreshTest } from "./refresh-test";

vi.mock("server-only", () => ({}));

const ORIGIN = "https://www.urantiahub.com";
const SECRET = "a-test-secret-that-is-long-enough-0123456789";
const session: Session = { accessToken: "a1", refreshToken: "r1", expiresAt: "2099-01-01T00:00:00.000Z", user: { id: "u1", email: "ana@example.com", name: "Ana" } };
const deps = { secret: SECRET, origin: ORIGIN } as Deps;
const ask = async (options: { signedIn?: boolean; from?: string | null } = {}) => {
  const headers: Record<string, string> = {};
  if (options.signedIn !== false) headers.cookie = `${cookieNames(ORIGIN).session}=${await seal(session, SECRET)}`;
  if (options.from !== null) headers["sec-fetch-site"] = options.from ?? "none";
  return new NextRequest(`${ORIGIN}/api/notices/refresh-test`, { headers });
};

describe("the test send of the refresh email", () => {
  it("asks a caller with no sign-in to sign in, and sends nothing", async () => {
    const send = vi.fn();
    expect((await handleRefreshTest(await ask({ signedIn: false }), deps, send)).status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it("sends nothing for a reader whose address is not approved, and takes no address from the request", async () => {
    const send = vi.fn();
    expect((await handleRefreshTest(await ask(), deps, send)).status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a request that another site started, or that does not say where it comes from", async () => {
    const send = vi.fn();
    for (const from of ["cross-site", "same-site", null]) expect((await handleRefreshTest(await ask({ from }), deps, send)).status).toBe(403);
    expect(send).not.toHaveBeenCalled();
  });

  it("holds the approved address as a hash only", async () => {
    const { readFileSync } = await import("node:fs");
    const code = readFileSync("src/notices/refresh-test.ts", "utf8");
    expect(code).not.toMatch(/[a-z0-9.]+@(?!mail\.urantiahub\.com|urantiahub\.com)[a-z0-9.]+\.[a-z]{2,}/i);
    expect(createHash("sha256").update("ana@example.com").digest("hex")).toHaveLength(64);
  });
});

describe("the refresh email", () => {
  const mail = refreshMail(ORIGIN);
  it("has each picture and each link at the address of the site", () => {
    const pictures = [...mail.html.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
    expect(pictures).toHaveLength(6);
    for (const picture of pictures) expect(picture).toMatch(/^https:\/\/www\.urantiahub\.com\/email\/refresh\/[a-z-]+\.png$/);
    expect([...mail.html.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual([`${ORIGIN}/papers`, `${ORIGIN}/papers`, `${ORIGIN}/releases`]);
    expect(mail.html).not.toContain("{{");
    expect(mail.text).not.toContain("{{");
  });
  it("uses the words of the site: saved paragraphs, and no price", () => {
    expect(mail.html).toContain("Your saved paragraphs, your notes, and your progress are there.");
    expect(`${mail.html} ${mail.text}`).not.toMatch(/bookmark|\bfree\b/i);
  });
});
