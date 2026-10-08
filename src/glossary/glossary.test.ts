import { describe, expect, it } from "vitest";
import { GLOSSARY, isName, KIND_LABEL } from "./glossary";

describe("the glossary", () => {
  it("holds each entry one time, with a name and a known kind", () => {
    expect(GLOSSARY.length).toBeGreaterThan(4000);
    expect(new Set(GLOSSARY.map((e) => e.id)).size).toBe(GLOSSARY.length);
    for (const entry of GLOSSARY) {
      expect(entry.name.length, entry.id).toBeGreaterThan(0);
      expect(KIND_LABEL[entry.type], entry.id).toBeTruthy();
    }
  });
  it("names the kinds for a reader", () => {
    expect(KIND_LABEL).toEqual({ being: "Being", place: "Place", order: "Order of beings", race: "Race", religion: "Religion", concept: "Idea" });
  });
  it("tells a name from an idea", () => {
    const kind = (id: string) => isName(GLOSSARY.find((e) => e.id === id)!);
    expect(kind("universal-father")).toBe(true);
    expect(kind("paradise")).toBe(true);
    expect(kind("personality")).toBe(false);
  });
});
