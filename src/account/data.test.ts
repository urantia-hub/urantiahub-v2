// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { type Gateway, readReader, savePlace, saveSettings } from "./data";

const NOW = 1_800_000_000_000;
function gateway(stored: Record<string, unknown> = {}): Gateway & { saved: Record<string, unknown>[] } {
  const saved: Record<string, unknown>[] = [];
  return {
    saved,
    preferences: vi.fn(async () => stored),
    savePreferences: vi.fn(async (_token, patch) => {
      saved.push(patch);
    }),
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
