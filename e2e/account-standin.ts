// A stand-in for the accounts site and for the reader's part of the API, for the browser tests.
// Each test is one reader: the test sets the cookie `e2e_reader` to an id of its own, and the stand-in
// keeps the data of each id apart. So the tests can run at the same time.
import type { IncomingMessage } from "node:http";

type Reader = {
  // "ok": all works. "deny": the sign-in page sends the reader back with an error. "exchange-fails":
  // the code is not exchanged. "refused": the API refuses each token. "down": the API answers 500.
  mode: "ok" | "deny" | "exchange-fails" | "refused" | "down";
  name: string | null;
  preferences: Record<string, unknown>;
  // What the stand-in saw, for the test to read.
  prompts: (string | null)[];
  revoked: number;
  writes: number;
  tokens: number;
  // The paragraphs that the reader read, and each batch as it arrived.
  read: string[];
  batches: string[][];
  // What the API says of each paper, when the test sets it.
  progress: { paperId: string; readCount: number; totalParagraphs: number }[];
};

const readers = new Map<string, Reader>();
const reader = (id: string): Reader => {
  let found = readers.get(id);
  if (!found) readers.set(id, (found = { mode: "ok", name: "Ana Reader", preferences: {}, prompts: [], revoked: 0, writes: 0, tokens: 0, read: [], batches: [], progress: [] }));
  return found;
};

type Answer = { status: number; body: string; headers?: Record<string, string> };
const json = (status: number, body: unknown): Answer => ({ status, body: JSON.stringify(body) });
const cookieOf = (request: IncomingMessage, name: string) =>
  (request.headers.cookie ?? "").split(";").map((part) => part.trim().split("=")).find(([key]) => key === name)?.[1] ?? null;

function tokens(id: string) {
  const r = reader(id);
  r.tokens += 1;
  return { accessToken: `at.${id}.${r.tokens}`, refreshToken: `rt.${id}.${r.tokens}`, userId: `user-${id}`, email: `${id}@example.com`, scopes: ["profile", "preferences"], expiresAt: new Date(Date.now() + 15 * 60_000).toISOString() };
}
const idOf = (token: string | undefined) => /^(?:Bearer )?[ar]t\.([a-z0-9-]+)\.\d+$/.exec(token ?? "")?.[1] ?? null;

// The answer of the stand-in, or null when the request is not for it.
export function account(request: IncomingMessage, url: URL, text: string): Answer | null {
  const path = url.pathname;
  const body = (() => {
    try {
      return JSON.parse(text || "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  })();

  // The test's own controls.
  const control = /^\/__reader\/([a-z0-9-]+)$/.exec(path);
  if (control) {
    const r = reader(control[1]);
    if (request.method === "POST") Object.assign(r, body);
    return json(200, r);
  }

  // The sign-in page of the accounts site: it signs the reader in at once and returns.
  if (path === "/login" && request.method === "GET") {
    const id = cookieOf(request, "e2e_reader");
    const back = new URL(url.searchParams.get("redirect_uri") ?? "http://localhost:3100/");
    if (!id) return json(400, { detail: "the test set no reader" });
    const r = reader(id);
    r.prompts.push(url.searchParams.get("prompt"));
    back.searchParams.set("state", url.searchParams.get("state") ?? "");
    if (r.mode === "deny") back.searchParams.set("error", "access_denied");
    else back.searchParams.set("code", `code.${id}`);
    return { status: 302, body: "", headers: { location: back.toString() } };
  }

  if (request.method === "POST" && path === "/auth/token") {
    const id = /^code\.([a-z0-9-]+)$/.exec(String(body.code))?.[1];
    if (!id || !body.codeVerifier || !body.appSecret) return json(400, { detail: "bad code" });
    if (reader(id).mode === "exchange-fails") return json(500, { detail: "recorded failure" });
    return json(200, { data: tokens(id) });
  }
  if (request.method === "POST" && path === "/auth/refresh") {
    const id = idOf(String(body.refreshToken));
    if (!id || reader(id).mode === "refused") return json(401, { detail: "refused" });
    return json(200, { data: tokens(id) });
  }
  if (request.method === "POST" && path === "/auth/revoke") {
    const id = idOf(String(body.refreshToken));
    if (id) reader(id).revoked += 1;
    return json(200, { data: { revoked: true, signOutToken: null } });
  }

  if (path === "/me" || path.startsWith("/me/")) {
    const id = idOf(request.headers.authorization);
    if (!id) return json(401, { detail: "no token" });
    const r = reader(id);
    if (r.mode === "refused") return json(401, { detail: "refused" });
    if (r.mode === "down") return json(500, { detail: "recorded failure" });
    if (path === "/me") return json(200, { data: { id: `user-${id}`, email: `${id}@example.com`, name: r.name } });
    if (path === "/me/reading-progress") {
      if (request.method === "POST") {
        const refs = Array.isArray(body.refs) ? (body.refs as string[]) : [];
        r.batches.push(refs);
        r.read = [...new Set([...r.read, ...refs])];
        return json(200, { data: { marked: refs.length, alreadyRead: 0, total: refs.length } });
      }
      return json(200, { data: r.progress });
    }
    if (path === "/me/preferences") {
      if (request.method === "PUT") {
        r.writes += 1;
        r.preferences = { ...r.preferences, ...body };
      }
      return json(200, { data: r.preferences });
    }
  }
  return null;
}
