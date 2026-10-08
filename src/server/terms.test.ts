import { describe, expect, it, vi } from "vitest";
import { ContentError, ParagraphNotFound } from "@/content/fetchers";
import { handleTerms, type TermsAnswer } from "./terms";

const TEXT: Record<string, string> = {
  "1:0.1": "The Universal Father lives on Paradise, and mortals of Urantia find him by faith.",
  "1:0.2": "And so it was.",
};
const load = vi.fn(async (_paperId: string, ref: string) => {
  if (!(ref in TEXT)) throw new ParagraphNotFound(ref);
  return TEXT[ref];
});

describe("handleTerms", () => {
  it("answers the names and the ideas of a paragraph, each with what an entry shows", async () => {
    const res = await handleTerms("1:0.1", load);
    expect(res.status).toBe(200);
    const body = (await res.json()) as TermsAnswer;
    expect(body.names.map((t) => t.name)).toEqual(expect.arrayContaining(["Universal Father", "Paradise", "mortals", "Urantia"]));
    expect(body.ideas.map((t) => t.name)).toContain("faith");
    const father = body.names.find((t) => t.name === "Universal Father")!;
    expect(father).toMatchObject({ id: "universal-father", kind: "Being" });
    expect(father.description.length).toBeGreaterThan(20);
    expect(father.citations).toBeGreaterThan(0);
    expect(Object.keys(father).sort()).toEqual(["aliases", "citations", "description", "id", "kind", "name", "seeAlso"]);
    // An idea is never in the names, and a name is never in the ideas.
    expect(body.ideas.every((t) => t.kind === "Idea")).toBe(true);
    expect(body.names.every((t) => t.kind !== "Idea")).toBe(true);
  });

  it("lets a shared cache keep the answer", async () => {
    const res = await handleTerms("1:0.1", load);
    expect(res.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("answers two empty groups for a paragraph with no term", async () => {
    const res = await handleTerms("1:0.2", load);
    expect(await res.json()).toEqual({ names: [], ideas: [] });
  });

  // Review Focus 2.
  it.each(["", "1", "1:0", "abc", "../etc", "1:0.1/../../x", "197:0.1", "x".repeat(5000), "1:0.1.", " 1:0.1"])(
    "answers 400 for %s, and reads no paper",
    async (ref) => {
      load.mockClear();
      const res = await handleTerms(ref, load);
      expect(res.status).toBe(400);
      expect(load).not.toHaveBeenCalled();
    },
  );

  it("asks for the one paragraph, by the paper number in its plain form", async () => {
    load.mockClear();
    await handleTerms("1:0.1", load);
    expect(load).toHaveBeenCalledWith("1", "1:0.1");
  });

  // A reference with extra zeros is not the name of a paragraph. It must not reach the loader and its cache.
  it.each(["001:0.1", "1:00.1", "1:0.01"])("answers 400 for %s", async (ref) => {
    load.mockClear();
    expect((await handleTerms(ref, load)).status).toBe(400);
    expect(load).not.toHaveBeenCalled();
  });

  it("answers 404 for a paragraph that the paper does not hold", async () => {
    const res = await handleTerms("1:0.999", load);
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 502, and keeps nothing, when the paper does not load", async () => {
    const res = await handleTerms("1:0.1", async () => {
      throw new ContentError("down");
    });
    expect(res.status).toBe(502);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
