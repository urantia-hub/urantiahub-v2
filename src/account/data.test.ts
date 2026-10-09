// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { type Gateway, readProgress, readReader, savePlace, saveRead, saveSettings } from "./data";

const NOW = 1_800_000_000_000;
function gateway(stored: Record<string, unknown> = {}): Gateway & { saved: Record<string, unknown>[] } {
  const saved: Record<string, unknown>[] = [];
  return {
    saved,
    preferences: vi.fn(async () => stored),
    savePreferences: vi.fn(async (_token, patch) => {
      saved.push(patch);
    }),
    markRead: vi.fn(async () => {}),
    progress: vi.fn(async () => []),
  };
}

describe("what the reader has in the account", () => {
  it("is the place and the settings, and nothing else of the record", async () => {
    const g = gateway({ "hub.place": { paperId: "2", sectionId: "3", at: 5 }, "hub.reader": { theme: "dark", textSize: 3, at: 6 }, "other.app": { secret: 1 } });
    expect(await readReader(g, "t", NOW)).toEqual({ place: { paperId: "2", sectionId: "3", at: 5, label: null }, settings: { theme: "dark", textSize: 3, at: 6 } });
  });

  it("is null for what is not there, or not of the right form", async () => {
    expect(await readReader(gateway({ "hub.place": "x" }), "t", NOW)).toEqual({ place: null, settings: null });
  });
});

describe("a save of the place", () => {
  it("writes the one key, with the checked value only", async () => {
    const g = gateway();
    expect(await savePlace(g, "t", { paperId: "2", sectionId: "3", at: NOW - 10, label: "x", more: 1 }, NOW)).toEqual({ saved: true });
    expect(g.saved).toEqual([{ "hub.place": { paperId: "2", sectionId: "3", at: NOW - 10, label: "x" } }]);
  });

  it("writes nothing for a value that is not a place", async () => {
    const g = gateway();
    expect(await savePlace(g, "t", { paperId: "900", sectionId: "3", at: 1 }, NOW)).toEqual({ saved: false });
    expect(g.saved).toEqual([]);
  });
});

describe("a save of the settings", () => {
  it("writes the one key", async () => {
    const g = gateway();
    await saveSettings(g, "t", { theme: "dark", textSize: 4, at: NOW }, NOW);
    expect(g.saved).toEqual([{ "hub.reader": { theme: "dark", textSize: 4, at: NOW } }]);
  });

  it("writes nothing for a value outside the choices", async () => {
    const g = gateway();
    expect(await saveSettings(g, "t", { theme: "pink", textSize: 4, at: NOW }, NOW)).toEqual({ saved: false });
    expect(g.saved).toEqual([]);
  });
});

describe("a batch of read paragraphs", () => {
  it("goes to the API as references of paragraphs that can exist", async () => {
    const g = gateway();
    expect(await saveRead(g, "t", { refs: ["1:0.1", "1:0.2", "196:10.5"] })).toEqual({ saved: 3 });
    expect(g.markRead).toHaveBeenCalledWith("t", ["1:0.1", "1:0.2", "196:10.5"]);
  });

  it("drops what is not a reference, and each repeat", async () => {
    const g = gateway();
    expect(await saveRead(g, "t", { refs: ["1:0.1", "1:0.1", "999:1.1", "x", 5, "1:0.1; drop table", "1.0.1"] })).toEqual({ saved: 1 });
    expect(g.markRead).toHaveBeenCalledWith("t", ["1:0.1"]);
  });

  it("asks the API nothing for an empty batch, or for a body of another form", async () => {
    const g = gateway();
    for (const bad of [null, {}, { refs: "1:0.1" }, { refs: [] }, { refs: ["nope"] }]) expect(await saveRead(g, "t", bad)).toEqual({ saved: 0 });
    expect(g.markRead).not.toHaveBeenCalled();
  });

  it("takes 200 at most in one request", async () => {
    const g = gateway();
    const refs = Array.from({ length: 300 }, (_, i) => `1:${Math.floor(i / 100)}.${(i % 100) + 1}`);
    expect(await saveRead(g, "t", { refs })).toEqual({ saved: 200 });
  });
});

describe("which papers the reader read", () => {
  it("is each paper with nine of ten paragraphs read, as ids only", async () => {
    const g = gateway();
    g.progress = vi.fn(async () => [
      { paperId: "1", readCount: 60, totalParagraphs: 60 },
      { paperId: "2", readCount: 55, totalParagraphs: 60 },
      { paperId: "3", readCount: 20, totalParagraphs: 60 },
      { paperId: "999", readCount: 5, totalParagraphs: 5 },
      { paperId: "4", readCount: 0, totalParagraphs: 0 },
    ]);
    expect(await readProgress(g, "t")).toEqual({ read: ["1", "2"] });
  });
});
