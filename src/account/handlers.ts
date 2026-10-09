// What each account route does. The routes in `src/app` are one line each and pass the real
// dependencies (`deps.ts`); the tests pass their own.

import type { Tokens } from "@urantia/auth/server";
import { type NextRequest, NextResponse } from "next/server";
import { callForReader } from "./call";
import {
  ASK_COOKIE,
  IN_COOKIE,
  isFromThisSite,
  isSameOrigin,
  PROBLEM_COOKIE,
  readStart,
  safeNext,
  seal,
  SESSION_COOKIE,
  SESSION_SECONDS,
  type Session,
  START_COOKIE,
  START_SECONDS,
  unseal,
  writeStart,
} from "./session";

export type Deps = {
  // The app secret. Empty when the sign-in is not set up: then each route answers "signed out".
  secret: string;
  // The origin of this site, as the accounts site knows it.
  origin: string;
  authorize(input: { askAccount: boolean }): Promise<{ url: string; state: string; codeVerifier: string }>;
  exchange(input: { code: string; codeVerifier: string }): Promise<Tokens>;
  refresh(refreshToken: string): Promise<Tokens>;
  revoke(refreshToken: string): Promise<void>;
  profileName(accessToken: string): Promise<string | null>;
};

const enabled = (deps: Deps) => deps.secret.length >= 32;

// A name for the signed-in reader that a page can hold: not the id, and not a secret. A page sends it
// with each request for the reader's data, so the server knows which reader the page speaks for.
export async function readerKey(secret: string, userId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`hub-reader-key:${secret}:${userId}`));
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
const NO_STORE = { "cache-control": "no-store" };

function redirect(deps: Deps, path: string): NextResponse {
  // 307 with a path of this site only: `safeNext` made it one.
  return NextResponse.redirect(`${deps.origin}${path}`, { status: 307, headers: NO_STORE });
}

function cookie(deps: Deps, maxAge: number, more: { httpOnly?: boolean; path?: string } = {}) {
  return { httpOnly: more.httpOnly ?? true, secure: deps.origin.startsWith("https:"), sameSite: "lax" as const, path: more.path ?? "/", maxAge };
}

async function setSession(response: NextResponse, deps: Deps, session: Session) {
  response.cookies.set(SESSION_COOKIE, await seal(session, deps.secret), cookie(deps, SESSION_SECONDS));
  response.cookies.set(IN_COOKIE, "1", cookie(deps, SESSION_SECONDS, { httpOnly: false }));
}

function clearSession(response: NextResponse, deps: Deps) {
  response.cookies.set(SESSION_COOKIE, "", cookie(deps, 0));
  response.cookies.set(IN_COOKIE, "", cookie(deps, 0, { httpOnly: false }));
}

const readSession = (request: NextRequest, deps: Deps) => (enabled(deps) ? unseal(request.cookies.get(SESSION_COOKIE)?.value, deps.secret) : Promise.resolve(null));

const toSession = (tokens: Tokens, name: string | null): Session => ({
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
  expiresAt: tokens.expiresAt,
  user: { id: tokens.userId, email: tokens.email, name },
});

// GET /api/auth/start?next=<path>: to the sign-in page of the accounts site.
export async function handleStart(request: NextRequest, deps: Deps): Promise<NextResponse> {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!enabled(deps)) return redirect(deps, next);
  let started: Awaited<ReturnType<Deps["authorize"]>>;
  try {
    started = await deps.authorize({ askAccount: request.cookies.get(ASK_COOKIE)?.value === "1" });
  } catch {
    return redirect(deps, next);
  }
  const response = NextResponse.redirect(started.url, { status: 307, headers: NO_STORE });
  response.cookies.set(START_COOKIE, writeStart({ state: started.state, codeVerifier: started.codeVerifier, next }), cookie(deps, START_SECONDS, { path: "/auth/callback" }));
  return response;
}

// GET /auth/callback: the accounts site returns the reader here. Check the state, exchange the code,
// keep the session, and send the reader back to the page where the sign-in started.
export async function handleCallback(request: NextRequest, deps: Deps): Promise<NextResponse> {
  const start = readStart(request.cookies.get(START_COOKIE)?.value);
  const back = (problem: boolean) => {
    const response = redirect(deps, start?.next ?? "/");
    response.cookies.set(START_COOKIE, "", cookie(deps, 0, { path: "/auth/callback" }));
    if (problem) response.cookies.set(PROBLEM_COOKIE, "1", cookie(deps, 60, { httpOnly: false }));
    return response;
  };

  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  // The state must be the one that this browser was given at the start.
  if (!enabled(deps) || !start || !code || params.get("state") !== start.state) return back(true);

  let tokens: Tokens;
  try {
    tokens = await deps.exchange({ code, codeVerifier: start.codeVerifier });
  } catch {
    return back(true);
  }
  // The name is for one row of the settings sheet. The sign-in does not wait on it.
  const name = await deps.profileName(tokens.accessToken).catch(() => null);
  const response = back(false);
  await setSession(response, deps, toSession(tokens, name));
  // The reader signed in again, so the next sign-in can be silent.
  response.cookies.set(ASK_COOKIE, "", cookie(deps, 0));
  return response;
}

// GET /api/auth/session: who is signed in. No token leaves the server.
export async function handleSession(request: NextRequest, deps: Deps): Promise<NextResponse> {
  const session = await readSession(request, deps);
  const response = NextResponse.json(
    { enabled: enabled(deps), user: session ? { name: session.user.name, email: session.user.email, key: await readerKey(deps.secret, session.user.id) } : null },
    { headers: NO_STORE },
  );
  // The mark of a sign-in that is gone (the cookie ended, or the secret changed) must go too.
  if (!session && request.cookies.get(IN_COOKIE)) response.cookies.set(IN_COOKIE, "", cookie(deps, 0, { httpOnly: false }));
  return response;
}

// POST /api/auth/signout: ends the session here and on the service. The reader stays on the page.
// It does not end the session of the accounts site: an app does not do that. So the next sign-in
// asks the accounts site for its sign-in page.
export async function handleSignOut(request: NextRequest, deps: Deps): Promise<NextResponse> {
  if (!isSameOrigin(request)) return NextResponse.json({ detail: "Not from this site." }, { status: 403, headers: NO_STORE });
  const session = await readSession(request, deps);
  if (session) await deps.revoke(session.refreshToken).catch(() => {});
  const response = NextResponse.json({ signedOut: true }, { headers: NO_STORE });
  clearSession(response, deps);
  response.cookies.set(ASK_COOKIE, "1", cookie(deps, SESSION_SECONDS));
  return response;
}

// Each /api/me route: the reader's data, with the reader's token added on the server.
export async function handleReader<T>(request: NextRequest, deps: Deps, run: (accessToken: string) => Promise<T>): Promise<NextResponse> {
  const refuse = (status: number, body: object) => NextResponse.json(body, { status, headers: NO_STORE });
  if (!isFromThisSite(request)) return refuse(403, { detail: "Not from this site." });
  if (request.method !== "GET" && !isSameOrigin(request)) return refuse(403, { detail: "Not from this site." });
  const session = await readSession(request, deps);
  if (!session) return refuse(401, { signedOut: true });
  // A page from before a sign-out can still be open, in a second tab, while another reader is signed in.
  // One reader's place must never go into another reader's account.
  if (request.headers.get("x-hub-reader") !== (await readerKey(deps.secret, session.user.id))) return refuse(409, { changed: true });

  const called = await callForReader(session, {
    run,
    refresh: async (old) => toSession(await deps.refresh(old.refreshToken), old.user.name),
  });
  const response = called.ok
    ? NextResponse.json(called.value ?? {}, { headers: NO_STORE })
    : called.reason === "signed-out"
      ? refuse(401, { signedOut: true })
      : refuse(503, { detail: "Try again later." });
  if (called.session === "end") clearSession(response, deps);
  else if (called.session !== "keep") await setSession(response, deps, called.session);
  return response;
}
