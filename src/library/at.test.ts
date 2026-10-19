import { describe, expect, it, vi } from "vitest";

const pages = [
  { key: "1", division: 1, subdivision: null, title: "The Twin-Verses", firstRef: "Dhp 1", lastRef: "Dhp 20", count: 20 },
  { key: "2", division: 2, subdivision: null, title: "On Earnestness", firstRef: "Dhp 21", lastRef: "Dhp 32", count: 12 },
];
vi.mock("@/content", () => ({
  getLibrary: async () => [{ slug: "dhammapada", refLevels: 1 }],
  getWorkPages: async () => pages,
}));
const { handleLibraryAt } = await import("./at");

describe("the address of one passage in the Library", () => {
  it("goes to the page of the passage, at the passage", async () => {
    const res = await handleLibraryAt({ work: "dhammapada", ref: "Dhp 25" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/library/dhammapada/2#Dhp_25");
  });

  it("goes to the first page for a passage that it cannot place, and 404s for an unknown work", async () => {
    expect((await handleLibraryAt({ work: "dhammapada", ref: "Dhp 999" })).headers.get("location")).toBe("/library/dhammapada/1");
    expect((await handleLibraryAt({ work: "bible", ref: "John 3:16" })).status).toBe(404);
  });
});
