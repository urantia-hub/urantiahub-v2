import { describe, expect, it, vi } from "vitest";

const pages = [
  { key: "1", division: 1, subdivision: null, title: "The Twin-Verses", firstRef: "Dhp 1", lastRef: "Dhp 20", count: 20 },
  { key: "2", division: 2, subdivision: null, title: "On Earnestness", firstRef: "Dhp 21", lastRef: "Dhp 32", count: 12 },
];
const edda = [{ key: "8", division: 8, subdivision: null, title: null, firstRef: "Skáldskaparmál 8.1", lastRef: "Skáldskaparmál 8.3", count: 3 }];
vi.mock("@/content", () => ({
  getLibrary: async () => [{ slug: "dhammapada", refLevels: 1 }, { slug: "prose-edda", refLevels: 2 }],
  getWorkPages: async (slug: string) => (slug === "prose-edda" ? edda : pages),
  getWorkPage: async (slug: string, key: string) =>
    slug === "prose-edda" ? ["Skáldskaparmál 8.1", "Skáldskaparmál 8.2", "Skáldskaparmál 8.3"].map((ref) => ({ ref, number: ref.slice(15), text: "x", url: null })) : key === "2" ? ["Dhp 21", "Dhp 22", "Dhp 23", "Dhp 24", "Dhp 25", "Dhp 26-27"].map((ref) => ({ ref, number: ref.slice(4), text: "x", url: null })) : [],
}));
const { handleLibraryAt } = await import("./at");

describe("the address of one passage in the Library", () => {
  it("goes to the page of the passage, at the passage", async () => {
    const res = await handleLibraryAt({ work: "dhammapada", ref: "Dhp 25" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/library/dhammapada/2#Dhp_25");
  });

  it("lands on the first passage of a range, and on a passage that holds the number", async () => {
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 21-23" })).headers.get("location")).toBe("/library/dhammapada/2#Dhp_21");
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 26" })).headers.get("location")).toBe("/library/dhammapada/2#Dhp_26-27");
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 26-27" })).headers.get("location")).toBe("/library/dhammapada/2#Dhp_26-27");
  });

  // A raw "á" in a Location header goes out as Latin-1, and the browser reads it as UTF-8 (Prose Edda, 2026-10-19).
  it("encodes the passage in the address, so a letter outside ASCII arrives whole", async () => {
    const location = (await handleLibraryAt({ work: "prose-edda", ref: "Skáldskaparmál 8.2" })).headers.get("location") ?? "";
    expect(location).toBe("/library/prose-edda/8#Sk%C3%A1ldskaparm%C3%A1l_8.2");
    expect(decodeURIComponent(location.split("#")[1])).toBe("Skáldskaparmál_8.2");
  });

  it("goes to the first page for a passage that it cannot place, and 404s for an unknown work", async () => {
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 999" })).headers.get("location")).toBe("/library/dhammapada/1");
    expect((await handleLibraryAt({ work: "bible", ref: "John 3:16" })).status).toBe(404);
  });
});
