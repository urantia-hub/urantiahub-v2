// Who is signed in, as the browser knows it. The pages are static, so the server does not put the
// reader into the page. A signed-out reader costs no request: the mark cookie says that no one is there.

import { IN_COOKIE, PROBLEM_COOKIE } from "./cookies";

// `key` names the reader for the server. See `readerKey` in handlers.ts.
export type AccountUser = { name: string | null; email: string | null; key: string | null };
export type AccountState =
  // "off": the sign-in is not set up on this site. Nothing of it shows.
  | { status: "off" }
  | { status: "out" }
  // `user` is null until the server answered.
  | { status: "in"; user: AccountUser | null };

let enabled = process.env.NEXT_PUBLIC_SIGN_IN === "on";
let state: AccountState = { status: "off" };
let started: Promise<void> | null = null;
const listeners = new Set<() => void>();

const OFF: AccountState = { status: "off" };
const OUT: AccountState = { status: "out" };

function set(next: AccountState) {
  state = next;
  for (const listener of listeners) listener();
}

const hasCookie = (name: string) => document.cookie.split(";").some((part) => part.trim() === `${name}=1`);

export const accountState = (): AccountState => state;
export const serverAccountState = (): AccountState => OFF;

export function subscribeToAccount(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Runs one time for each page load.
export function startAccount(): Promise<void> {
  started ??= (async () => {
    if (!enabled) return set(OFF);
    if (!hasCookie(IN_COOKIE)) return set(OUT);
    set({ status: "in", user: null });
    try {
      const response = await fetch("/api/auth/session", { headers: { accept: "application/json" } });
      if (!response.ok) return;
      const body = (await response.json()) as { user: AccountUser | null };
      set(body.user ? { status: "in", user: { name: body.user.name ?? null, email: body.user.email ?? null, key: typeof body.user.key === "string" ? body.user.key : null } } : OUT);
    } catch {
      // No answer. The reader stays as the mark says; the next page load asks again.
    }
  })();
  return started;
}

// The key of the reader that this page believes is signed in.
export const accountKey = (): string | null => (state.status === "in" ? (state.user?.key ?? null) : null);

// Asks again who is signed in: another tab signed out, or another reader signed in.
export function refreshAccount(): Promise<void> {
  started = null;
  return startAccount();
}

// The server said that the session is gone (the reader removed the access, or deleted the account).
export function markSignedOut(): void {
  if (state.status === "in") set(OUT);
}

// True when the server ended the session. Only the server can end it: the session is a cookie that a
// script cannot read. If the server did not, the reader is still signed in, and the page says so.
export async function signOut(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/signout", { method: "POST", headers: { accept: "application/json" } });
    if (!response.ok) return false;
  } catch {
    return false;
  }
  set(OUT);
  return true;
}

// The link to the sign-in. It is a plain link, so it works with no script too.
export function signInHref(): string {
  const here = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/api/auth/start?next=${encodeURIComponent(here)}`;
}

// True one time after a sign-in that did not finish.
export function takeProblem(): boolean {
  if (!hasCookie(PROBLEM_COOKIE)) return false;
  document.cookie = `${PROBLEM_COOKIE}=; max-age=0; path=/`;
  return true;
}

// The same answer for the life of the page, so that each part of the page can show the line.
let problem: boolean | null = null;
export function signInProblem(): boolean {
  problem ??= takeProblem();
  return problem;
}
export const noSignInProblem = (): boolean => false;
export const never = (): (() => void) => () => {};

export function resetAccountForTest(on: boolean): void {
  problem = null;
  enabled = on;
  state = OFF;
  started = null;
}
