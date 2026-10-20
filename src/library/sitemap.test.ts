import { describe, expect, it, vi } from "vitest";
import { libraryPaths } from "./sitemap";

const works = [{ slug: "dhammapada" }, { slug: "rig-veda" }, { slug: "japji" }];
// A work of one page has no first page of its own: its text is the page of the work.
const firstKeys: Record<string, string> = { dhammapada: "1", "rig-veda": "1-1" };

describe("the Library in the sitemap", () => {
  it("lists nothing, and loads nothing, while the Library is unlinked", async () => {
    const load = vi.fn();
    expect(await libraryPaths(false, load)).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });

  it("lists World texts, the page of each work, and the first page of each work of more than one page", async () => {
    expect(await libraryPaths(true, async () => ({ works, firstKeys }))).toEqual(["/texts", "/texts/how-it-works", "/texts/dhammapada", "/texts/dhammapada/1", "/texts/rig-veda", "/texts/rig-veda/1-1", "/texts/japji"]);
  });

  it("lists nothing of the Library when its list does not load, so the sitemap stands", async () => {
    expect(await libraryPaths(true, async () => Promise.reject(new Error("down")))).toEqual([]);
  });
});
