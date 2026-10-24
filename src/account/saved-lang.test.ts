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

  it("leaves an English list as it is", async () => {
    const load = vi.fn();
    expect(await inLanguage(ALL, "en", load)).toBe(ALL);
    expect(load).not.toHaveBeenCalled();
  });
});
