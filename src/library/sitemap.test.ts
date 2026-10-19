import { describe, expect, it, vi } from "vitest";
import { libraryPaths } from "./sitemap";

const works = [{ slug: "dhammapada" }, { slug: "rig-veda" }];
const firstKeys: Record<string, string> = { dhammapada: "1", "rig-veda": "1-1" };

describe("the Library in the sitemap", () => {
  it("lists nothing, and loads nothing, while the Library is unlinked", async () => {
    const load = vi.fn();
    expect(await libraryPaths(false, load)).toEqual([]);
    expect(load).not.toHaveBeenCalled();
  });

  it("lists the Library and the first page of each work when it is linked", async () => {
    expect(await libraryPaths(true, async () => ({ works, firstKeys }))).toEqual(["/library", "/library/dhammapada/1", "/library/rig-veda/1-1"]);
  });

  it("lists nothing of the Library when its list does not load, so the sitemap stands", async () => {
    expect(await libraryPaths(true, async () => Promise.reject(new Error("down")))).toEqual([]);
  });
});
