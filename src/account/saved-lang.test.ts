import { describe, expect, it, vi } from "vitest";
import type { AllSaved } from "./saved-data";
import { inLanguage } from "./saved-lang";

const ALL: AllSaved = {
  entries: [
    { ref: "1:0.3", paperId: "1", paperTitle: "The Universal Father", text: "The enlightened worlds.", savedAt: "2026-10-01", notes: [] },
    { ref: "2:3.1", paperId: "2", paperTitle: "The Nature of God", text: "The actuality of God.", savedAt: null, notes: [{ id: "n", ref: "2:3.1", text: "Mi nota.", at: "2026-10-02" }] },
  ],
  cut: false,
};

describe("the saved list in Spanish", () => {
  it("gives each entry the Spanish text and the Spanish title of its paper, and keeps the notes", async () => {
    const load = vi.fn(async (_paperId: string, ref: string) => `Texto de ${ref}`);
    const es = await inLanguage(ALL, "es", load);
    expect(es.entries.map((e) => [e.text, e.paperTitle])).toEqual([
      ["Texto de 1:0.3", "El Padre Universal"],
      ["Texto de 2:3.1", "La naturaleza de Dios"],
    ]);
    expect(es.entries[1].notes[0].text).toBe("Mi nota.");
    expect(load).toHaveBeenCalledWith("2", "2:3.1");
  });

  // A paragraph with no Spanish text keeps the English one: the reader still finds what they saved.
  it("keeps the English text of a paragraph that did not load", async () => {
    const es = await inLanguage(ALL, "es", async (_paperId, ref) => {
      if (ref === "1:0.3") throw new Error("no text");
      return "Texto";
    });
    expect(es.entries[0].text).toBe("The enlightened worlds.");
    expect(es.entries[0].paperTitle).toBe("El Padre Universal");
  });

  // After a deploy no paper is stored, so a long list would ask the API for every paper at once.
  it("asks for a few papers at a time, and for each paper one time first", async () => {
    const many: AllSaved = {
      cut: false,
      entries: Array.from({ length: 40 }, (_, i) => ({ ref: `${i % 20}:1.${i}`, paperId: String(i % 20), paperTitle: "T", text: "E", savedAt: null, notes: [] })),
    };
    let open = 0;
    let most = 0;
    const firsts = new Set<string>();
    const es = await inLanguage(many, "es", async (paperId, ref) => {
      const first = !firsts.has(paperId);
      firsts.add(paperId);
      if (first) {
        open += 1;
        most = Math.max(most, open);
        await new Promise((r) => setTimeout(r, 5));
        open -= 1;
      }
      return `Texto de ${ref}`;
    });
    expect(most).toBeLessThanOrEqual(6);
    expect(es.entries.every((e) => e.text.startsWith("Texto de "))).toBe(true);
  });

  // The list must come back before the request ends: the Spanish text is extra, the list is not.
  it("keeps the English text of each paper that is still loading when the time ends", async () => {
    vi.useFakeTimers();
    try {
      const done = inLanguage(ALL, "es", (paperId) => (paperId === "1" ? Promise.resolve("Texto") : new Promise<string>(() => {})), { budgetMs: 100 });
      await vi.advanceTimersByTimeAsync(100);
      const es = await done;
      expect(es.entries.map((e) => e.text)).toEqual(["Texto", "The actuality of God."]);
      expect(es.entries[1].paperTitle).toBe("La naturaleza de Dios");
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves an English list as it is", async () => {
    const load = vi.fn();
    expect(await inLanguage(ALL, "en", load)).toBe(ALL);
    expect(load).not.toHaveBeenCalled();
  });
});
