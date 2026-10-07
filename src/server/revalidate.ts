import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { paperPath } from "@/content/paper-index";
import { absoluteUrl } from "@/site";

const TAG = /^(?:paper:(?:\d|[1-9]\d|1[0-8]\d|19[0-6])|passages)$/;
const Body = z.object({ tags: z.array(z.string().regex(TAG)).min(1).max(200) });

type Deps = {
  secret: string | undefined;
  revalidate(tag: string): void;
  notify(urls: string[]): Promise<unknown>;
};

function sameSecret(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function urlForTag(tag: string): string {
  return tag === "passages" ? absoluteUrl("/") : absoluteUrl(paperPath(tag.slice("paper:".length)));
}

// Refreshes pages by tag. The caller must send the shared secret.
export async function handleRevalidate(request: Request, { secret, revalidate, notify }: Deps): Promise<Response> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!secret || !token || !sameSecret(token, secret)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "tags must be paper:{0-196} or passages" }, { status: 400 });
  }

  const { tags } = parsed.data;
  for (const tag of tags) revalidate(tag);
  // A fault in IndexNow must not fail a refresh that already happened.
  await notify(tags.map(urlForTag)).catch(() => undefined);
  return Response.json({ revalidated: tags });
}
