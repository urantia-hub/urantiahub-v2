import { describe, expect, it, vi } from "vitest";
import type { LibraryWork, WorkPage, WorkPassage } from "@/content/library";

import { ContentError, ParagraphNotFound } from "@/content/fetchers";
import { PageNotFound } from "@/content/library";

vi.mock("server-only", () => ({}));
// The gateway reads the cache of Next.js; the tests give each answer through `deps`.
vi.mock("@/content", () => ({}));
const { pairOf } = await import("./pair");

const RV: LibraryWork = {
  slug: "rig-veda",
  corpusId: "rig-veda-griffith-1896",
  title: "The Rig Veda",
  tradition: "Hindu",
  kind: "scripture",
  summary: "",
  translator: "Ralph T. H. Griffith",
  year: 1896,
  byline: "Ralph T. H. Griffith, 1896",
  refPrefix: "RV",
  refLevels: 3,
  divisionLabel: "book",
  unitLabel: "verse",
  units: null,
  urantiaSection: null,
  sourceUrl: null,
};
const PAGES: WorkPage[] = [{ key: "10-10", division: 10, subdivision: 10, title: null, firstRef: "RV 10.10.1", lastRef: "RV 10.10.3", count: 3 }];
const PASSAGES: WorkPassage[] = ["RV 10.10.1", "RV 10.10.2", "RV 10.10.3"].map((ref) => ({ ref, number: ref.slice(9), text: `First of ${ref}. Second of ${ref}.`, url: null }));
const PARAGRAPH = "One is here. Two is here. Three is here.";

function deps(over: Partial<Parameters<typeof pairOf>[1] & object> = {}) {
  return {
    paragraphText: async (_paperId: string, ref: string) => {
      if (ref !== "63:0.1") throw new ParagraphNotFound(ref);
      return PARAGRAPH;
    },
    library: async () => [RV],
    workPages: async () => PAGES,
    workPage: async (_slug: string, key: string) => {
      if (key !== "10-10") throw new PageNotFound(key);
      return PASSAGES;
    },
    ...over,
  };
}

describe("a pair", () => {
  it("has both sides, each with its choice and the address that opens it", async () => {
    const pair = await pairOf(["63.0.1", "1", "rig-veda", "10.10.3", "1"], deps());
    expect(pair).toMatchObject({
      path: "/s/63.0.1/1/rig-veda/10.10.3/1",
      work: "rig-veda",
      a: { eyebrow: "The Urantia Papers", kind: null, words: "One is here.", source: "63:0.1 · The First Human Family", shortRef: "63:0.1", target: "/papers/paper-63-the-first-human-family?s=1#63:0.1" },
      b: { eyebrow: "The Rig Veda", kind: "Hindu scripture", words: "First of RV 10.10.3.", source: "RV 10.10.3 · Griffith, 1896", shortRef: "RV 10.10.3", target: "/texts/rig-veda/at/RV%2010.10.3?s=1" },
    });
  });

  it("is the whole of each side with no choice", async () => {
    const pair = await pairOf(["63.0.1", "rig-veda", "10.10.3"], deps());
    expect(pair).toMatchObject({ a: { words: PARAGRAPH, target: "/papers/paper-63-the-first-human-family#63:0.1" }, b: { words: "First of RV 10.10.3. Second of RV 10.10.3.", target: "/texts/rig-veda/at/RV%2010.10.3" } });
  });

  it("goes to the address without a code that does not fit", async () => {
    expect(await pairOf(["63.0.1", "9", "rig-veda", "10.10.3", "1"], deps())).toEqual({ go: "/s/63.0.1/rig-veda/10.10.3/1" });
    expect(await pairOf(["63.0.1", "rig-veda", "10.10.3", "p7"], deps())).toEqual({ go: "/s/63.0.1/rig-veda/10.10.3" });
  });

  it("goes to the one form of the same pair", async () => {
    expect(await pairOf(["063.0.01", "rig-veda", "10.10.3"], deps())).toEqual({ go: "/s/63.0.1/rig-veda/10.10.3" });
  });

  it("is nothing for a paragraph, a work, or a passage that is not there", async () => {
    expect(await pairOf(["63.0.2", "rig-veda", "10.10.3"], deps())).toBeNull();
    expect(await pairOf(["63.0.1", "quran", "1.1"], deps())).toBeNull();
    expect(await pairOf(["63.0.1", "rig-veda", "10.10.9"], deps())).toBeNull();
    expect(await pairOf(["63.0.1", "rig-veda", "9.9.9"], deps())).toBeNull();
    expect(await pairOf(["63.0.1", "rig-veda"], deps())).toBeNull();
  });

  it("fails, and is not a missing page, when the API fails", async () => {
    const down = async () => {
      throw new ContentError("down");
    };
    await expect(pairOf(["63.0.1", "rig-veda", "10.10.3"], deps({ workPage: down }))).rejects.toThrow("down");
    await expect(pairOf(["63.0.1", "rig-veda", "10.10.3"], deps({ paragraphText: down }))).rejects.toThrow("down");
  });
});
