// Serves the recorded API responses on port 4010 for the browser tests.
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
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

createServer((request, response) => {
  const { status, body } = answer(request.url ?? "/");
  response.writeHead(status, { "content-type": "application/json" });
  response.end(body);
}).listen(4010, () => console.log("fixture server on http://localhost:4010"));
