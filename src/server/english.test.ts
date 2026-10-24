import { describe, expect, it, vi } from "vitest";
import { ContentError, ParagraphNotFound } from "@/content/fetchers";
import { handleEnglish } from "./english";

const TEXT: Record<string, string> = { "1:0.1": "THE Universal Father is the God of all creation." };
const load = vi.fn(async (_paperId: string, ref: string) => {
  if (!(ref in TEXT)) throw new ParagraphNotFound(ref);
  return TEXT[ref];
});

describe("handleEnglish", () => {
  it("answers the English text of one paragraph, and a shared cache keeps it", async () => {
    const res = await handleEnglish("1:0.1", load);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ref: "1:0.1", text: "THE Universal Father is the God of all creation." });
    expect(load).toHaveBeenCalledWith("1", "1:0.1", "en");
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  });

  it("answers 404 for an unknown paragraph and 400 for a reference that is not one", async () => {
    expect((await handleEnglish("999:1.1", load)).status).toBe(400);
    expect((await handleEnglish("1:0.999", load)).status).toBe(404);
    expect((await handleEnglish("001:0.1", load)).status).toBe(400);
  });

  it("keeps nothing when the paper does not load", async () => {
    const res = await handleEnglish("1:0.1", async () => {
      throw new ContentError("down");
    });
    expect(res.status).toBe(502);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
