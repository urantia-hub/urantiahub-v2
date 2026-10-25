import { describe, expect, it, vi } from "vitest";

const pages = [
  { key: "1", division: 1, subdivision: null, title: "The Twin-Verses", firstRef: "Dhp 1", lastRef: "Dhp 20", count: 20 },
  { key: "2", division: 2, subdivision: null, title: "On Earnestness", firstRef: "Dhp 21", lastRef: "Dhp 32", count: 12 },
];
const edda = [
  { key: "8", division: 8, subdivision: null, title: null, firstRef: "Skáldskaparmál 8.1", lastRef: "Skáldskaparmál 8.3", count: 3 },
  { key: "9", division: 9, subdivision: null, title: null, firstRef: "Skáldskaparmál 9.1", lastRef: "Skáldskaparmál 9.2", count: 2 },
];
const japji = [{ key: "1", division: 1, subdivision: null, title: null, firstRef: "Japji 1", lastRef: "Japji 40", count: 40 }];
vi.mock("@/content", () => ({
  getLibrary: async () => [{ slug: "dhammapada", refLevels: 1 }, { slug: "prose-edda", refLevels: 2 }, { slug: "japji", refLevels: 1 }],
  getWorkPages: async (slug: string) => (slug === "prose-edda" ? edda : slug === "japji" ? japji : pages),
  getWorkPage: async (slug: string, key: string) =>
    slug === "japji" ? [{ ref: "Japji 5", number: "5", text: "x", url: null }] : slug === "prose-edda" ? ["Skáldskaparmál 8.1", "Skáldskaparmál 8.2", "Skáldskaparmál 8.3"].map((ref) => ({ ref, number: ref.slice(15), text: "x", url: null })) : key === "2" ? ["Dhp 21", "Dhp 22", "Dhp 23", "Dhp 24", "Dhp 25", "Dhp 26-27"].map((ref) => ({ ref, number: ref.slice(4), text: "x", url: null })) : [],
}));
const { handleLibraryAt } = await import("./at");

describe("the address of one passage in the Library", () => {
  it("goes to the page of the passage, at the passage", async () => {
    const res = await handleLibraryAt({ work: "dhammapada", ref: "Dhp 25" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/texts/dhammapada/2#Dhp_25");
  });

  it("stays in Spanish on a Spanish address", async () => {
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 25", lang: "es" })).headers.get("location")).toBe("/es/textos/dhammapada/2#Dhp_25");
    expect((await handleLibraryAt({ work: "japji", ref: "Japji 5", lang: "es" })).headers.get("location")).toBe("/es/textos/japji#Japji_5");
  });

  it("lands on the first passage of a range, and on a passage that holds the number", async () => {
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 21-23" })).headers.get("location")).toBe("/texts/dhammapada/2#Dhp_21");
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 26" })).headers.get("location")).toBe("/texts/dhammapada/2#Dhp_26-27");
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 26-27" })).headers.get("location")).toBe("/texts/dhammapada/2#Dhp_26-27");
  });

  // A raw "á" in a Location header goes out as Latin-1, and the browser reads it as UTF-8 (Prose Edda, 2026-10-19).
  it("encodes the passage in the address, so a letter outside ASCII arrives whole", async () => {
    const location = (await handleLibraryAt({ work: "prose-edda", ref: "Skáldskaparmál 8.2" })).headers.get("location") ?? "";
    expect(location).toBe("/texts/prose-edda/8#Sk%C3%A1ldskaparm%C3%A1l_8.2");
    expect(decodeURIComponent(location.split("#")[1])).toBe("Skáldskaparmál_8.2");
  });

  it("keeps the chosen units of a pair link, with the count of passages of a range", async () => {
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 21-23", search: "?s=p2" })).headers.get("location")).toBe("/texts/dhammapada/2?s=p2&n=3#Dhp_21");
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 26", search: "?s=1" })).headers.get("location")).toBe("/texts/dhammapada/2?s=1#Dhp_26-27");
    // A code of another form is dropped.
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 25", search: "?s=x<y" })).headers.get("location")).toBe("/texts/dhammapada/2#Dhp_25");
  });

  it("goes to the page of the work for a work of one page: its text is there", async () => {
    expect((await handleLibraryAt({ work: "japji", ref: "Japji 5" })).headers.get("location")).toBe("/texts/japji#Japji_5");
    expect((await handleLibraryAt({ work: "japji", ref: "Japji 99" })).headers.get("location")).toBe("/texts/japji");
  });

  it("goes to the first page for a passage that it cannot place, and 404s for an unknown work", async () => {
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 999" })).headers.get("location")).toBe("/texts/dhammapada/1");
    expect((await handleLibraryAt({ work: "bible", ref: "John 3:16" })).status).toBe(404);
  });
});
