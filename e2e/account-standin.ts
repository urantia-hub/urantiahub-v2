// A stand-in for the accounts site and for the reader's part of the API, for the browser tests.
// Each test is one reader: the test sets the cookie `e2e_reader` to an id of its own, and the stand-in
// keeps the data of each id apart. So the tests can run at the same time.
import { randomUUID } from "node:crypto";
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
  // The paragraphs that the reader saved, and the reader's notes.
  saved: { ref: string; createdAt: string }[];
  notes: { id: string; ref: string; text: string; createdAt: string }[];
};

// What the API answers for a paragraph. The text is made up: the tests of the Papers use the fixtures.
const paragraph = (ref: string) => ({ standardReferenceId: ref, paperId: ref.split(":")[0], paperTitle: `Paper ${ref.split(":")[0]}`, text: `Text of ${ref}.` });
function listed<T extends { ref: string }>(all: T[], url: URL, shape: (item: T) => object) {
  const paperId = url.searchParams.get("paperId");
  const page = Number(url.searchParams.get("page") ?? 0);
  const limit = Number(url.searchParams.get("limit") ?? 20);
  const of = paperId ? all.filter((item) => item.ref.startsWith(`${paperId}:`)) : all;
  return { data: of.slice(page * limit, page * limit + limit).map(shape), pagination: { page, limit, total: of.length } };
}

const readers = new Map<string, Reader>();
const reader = (id: string): Reader => {
  let found = readers.get(id);
  if (!found) readers.set(id, (found = { mode: "ok", name: "Ana Reader", preferences: {}, prompts: [], revoked: 0, writes: 0, tokens: 0, read: [], batches: [], progress: [], saved: [], notes: [] }));
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
    if (path === "/me/bookmarks") {
      if (request.method === "POST") {
        const ref = String(body.ref);
        const found = r.saved.find((b) => b.ref === ref) ?? { ref, createdAt: new Date().toISOString() };
        if (!r.saved.includes(found)) r.saved.push(found);
        return json(201, { data: { id: randomUUID(), category: null, createdAt: found.createdAt, updatedAt: found.createdAt, paragraph: paragraph(ref) } });
      }
      return json(200, listed(r.saved, url, (b) => ({ id: randomUUID(), category: null, createdAt: b.createdAt, updatedAt: b.createdAt, paragraph: paragraph(b.ref) })));
    }
    if (path.startsWith("/me/bookmarks/") && request.method === "DELETE") {
      const ref = decodeURIComponent(path.slice("/me/bookmarks/".length));
      const before = r.saved.length;
      r.saved = r.saved.filter((b) => b.ref !== ref);
      return r.saved.length < before ? { status: 204, body: "" } : json(404, { detail: "Bookmark not found." });
    }
    const noteShape = (n: Reader["notes"][number]) => ({ id: n.id, text: n.text, format: "plain", createdAt: n.createdAt, updatedAt: n.createdAt, paragraph: paragraph(n.ref) });
    if (path === "/me/notes") {
      if (request.method === "POST") {
        const made = { id: randomUUID(), ref: String(body.ref), text: String(body.text), createdAt: new Date().toISOString() };
        r.notes.push(made);
        return json(201, { data: noteShape(made) });
      }
      return json(200, listed(r.notes, url, noteShape));
    }
    if (path.startsWith("/me/notes/")) {
      const found = r.notes.find((n) => n.id === path.slice("/me/notes/".length));
      if (!found) return json(404, { detail: "Note not found." });
      if (request.method === "DELETE") {
        r.notes = r.notes.filter((n) => n !== found);
        return { status: 204, body: "" };
      }
      if (request.method === "PUT") found.text = String(body.text);
      return json(200, { data: noteShape(found) });
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
