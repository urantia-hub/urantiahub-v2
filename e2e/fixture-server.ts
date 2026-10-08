// Serves the recorded API responses on port 4010 for the browser tests.
import { existsSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = fileURLToPath(new URL("./fixtures", import.meta.url));

function json(status: number, body: string | Buffer) {
  return { status, body };
}

function answer(url: string) {
  let path: string;
  try {
    path = decodeURIComponent(new URL(url, "http://localhost").pathname).slice(1);
  } catch {
    return json(400, JSON.stringify({ error: "bad path" }));
  }
  if (!/^[a-z]+\/[0-9:.]+$/.test(path)) return json(400, JSON.stringify({ error: "bad path" }));
  const file = join(dir, `${path.replace(/[/:]/g, "_")}.json`);
  if (!existsSync(file)) return json(404, JSON.stringify({ error: "not recorded" }));
  return json(200, readFileSync(file));
}

const slug = (q: string) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// A search is a POST with the text in the body. A text with no record gives an empty result.
// The text "fail related" makes the semantic search fail, for the test of one failed group.
function search(kind: "search" | "semantic", body: string) {
  let params: { q?: unknown; page?: unknown; limit?: unknown };
  try {
    params = JSON.parse(body);
  } catch {
    return json(400, JSON.stringify({ error: "bad body" }));
  }
  const q = typeof params.q === "string" ? params.q : "";
  // The live API refuses a text with no letter and no number.
  if (!/[A-Za-z0-9]/.test(q)) return json(400, JSON.stringify({ title: "q has no word" }));
  if (kind === "semantic" && q === "fail related") return json(500, JSON.stringify({ title: "recorded failure" }));
  const file = join(dir, `${kind}_${slug(q)}.json`);
  const limit = Number(params.limit) || 20;
  const page = Number(params.page) || 0;
  if (!existsSync(file)) return json(200, JSON.stringify({ data: [], meta: { page, limit, total: 0, totalPages: 0 } }));
  const recorded = JSON.parse(readFileSync(file, "utf8")) as { data: unknown[]; meta: { total: number } };
  // The record holds the first 50 rows. The total is the count of rows that the server can page through.
  const total = kind === "search" ? recorded.data.length : recorded.meta.total;
  return json(200, JSON.stringify({ data: recorded.data.slice(page * limit, page * limit + limit), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } }));
}

function read(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body));
  });
}

createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  const text = request.method === "POST" ? await read(request) : "";
  // The text "slow search" takes a second and a half, for the test of the sign that a search runs.
  if (text.includes('"slow search"')) await new Promise((resolve) => setTimeout(resolve, 1500));
  const { status, body } =
    request.method === "POST" && path === "/search"
      ? search("search", text)
      : request.method === "POST" && path === "/search/semantic"
        ? search("semantic", text)
        : answer(request.url ?? "/");
  response.writeHead(status, { "content-type": "application/json" });
  response.end(body);
}).listen(4010, () => console.log("fixture server on http://localhost:4010"));
