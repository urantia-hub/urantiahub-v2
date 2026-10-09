// The session of a signed-in reader: the tokens, sealed in a cookie that scripts cannot read.
// The browser never holds a token. Each request for the reader's data goes through this server.
// These are the pure rules. `server.ts` reads and writes the cookies.

import { EncryptJWT, jwtDecrypt } from "jose";

export const SESSION_COOKIE = "hub_session";
export const START_COOKIE = "hub_signin_start";
// Set at a sign-out, removed at the next finished sign-in. While it is there, a sign-in is not silent:
// after a sign-out the reader is still signed in on the accounts site.
export const ASK_COOKIE = "hub_ask_account";
// "1" while a reader is signed in. A script can read it, and it holds nothing else: the page reads it
// before the first paint, so a signed-in reader never sees the invitation to sign in.
export const IN_COOKIE = "hub_in";
// "1" for a minute after a sign-in that did not finish, so the page can say so one time.
export const PROBLEM_COOKIE = "hub_signin_problem";
// The session lives as long as a refresh token: 90 days from the last use.
export const SESSION_SECONDS = 90 * 24 * 60 * 60;
export const START_SECONDS = 15 * 60;
// Refresh this long before the access token ends.
const REFRESH_AHEAD_MS = 2 * 60 * 1000;
const NEXT_MAX = 2000;

export type Session = {
  accessToken: string;
  refreshToken: string;
  /** When the access token ends. ISO date. */
  expiresAt: string;
  user: { id: string; email: string | null; name: string | null };
};

// A key for the cookie, made from the secret. The secret itself is never the key.
async function keyFrom(secret: string): Promise<Uint8Array> {
  if (secret.length < 32) throw new Error("The session secret is not set, or it is too short.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`hub-session-cookie:${secret}`));
  return new Uint8Array(digest);
}

export async function seal(session: Session, secret: string): Promise<string> {
  return new EncryptJWT({ s: session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .encrypt(await keyFrom(secret));
}

// The session in a cookie value, or null for anything that is not one.
export async function unseal(value: string | undefined, secret: string): Promise<Session | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtDecrypt(value, await keyFrom(secret), {
      contentEncryptionAlgorithms: ["A256GCM"],
      keyManagementAlgorithms: ["dir"],
    });
    return asSession(payload.s);
  } catch {
    return null;
  }
}

const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

function asSession(value: unknown): Session | null {
  if (typeof value !== "object" || value === null) return null;
  const s = value as Partial<Session>;
  if (typeof s.accessToken !== "string" || typeof s.refreshToken !== "string" || typeof s.expiresAt !== "string") return null;
  if (typeof s.user !== "object" || s.user === null || typeof s.user.id !== "string") return null;
  return {
    accessToken: s.accessToken,
    refreshToken: s.refreshToken,
    expiresAt: s.expiresAt,
    user: { id: s.user.id, email: text(s.user.email), name: text(s.user.name) },
  };
}

export function needsRefresh(session: Session, now: Date = new Date()): boolean {
  const end = new Date(session.expiresAt).getTime();
  return Number.isNaN(end) || end - now.getTime() < REFRESH_AHEAD_MS;
}

// Where the reader goes after a sign-in: a path of this site, or the home page. A sign-in link can
// come from anywhere, so nothing in it can send the reader to another site, or back into the sign-in.
export function safeNext(value: string | null | undefined): string {
  if (!value || value.length > NEXT_MAX) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  // No backslash and no control character: a browser reads some of them as a slash, or as nothing.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  if (/^\/(api|auth)(\/|$|\?|#)/.test(value)) return "/";
  return value;
}

export type Start = { state: string; codeVerifier: string; next: string };

// The sign-in that this browser started, for its short cookie.
export function writeStart(start: Start): string {
  return encodeURIComponent(JSON.stringify(start));
}

export function readStart(value: string | undefined): Start | null {
  if (!value) return null;
  try {
    const found = JSON.parse(decodeURIComponent(value)) as Partial<Start> | null;
    if (!found || typeof found.state !== "string" || typeof found.codeVerifier !== "string") return null;
    if (!found.state || !found.codeVerifier) return null;
    return { state: found.state, codeVerifier: found.codeVerifier, next: safeNext(text(found.next)) };
  } catch {
    return null;
  }
}

// The session is a cookie, so a request that changes something must come from a page of this site.
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

// A read of the reader's data must come from a page of this site too: a read can end or renew the
// session. A browser of today says where a request comes from, and a page cannot remove that header.
export function isFromThisSite(request: Request): boolean {
  const from = request.headers.get("sec-fetch-site");
  return from === null || from === "same-origin";
}
