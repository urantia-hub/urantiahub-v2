import { describe, expect, it } from "vitest";
import { GLOSSARY, GLOSSARY_BY_LANG, kindLabel, isName, KIND_LABEL } from "./glossary";

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

describe("the Spanish glossary", () => {
  const es = GLOSSARY_BY_LANG.es;
  const english = new Set(GLOSSARY.map((e) => e.id));

  it("has the entries that the API gives in Spanish, each one an English entry too", () => {
    expect(es.length).toBeGreaterThan(2500);
    expect(new Set(es.map((e) => e.id)).size).toBe(es.length);
    expect(es.every((e) => english.has(e.id))).toBe(true);
    expect(es.filter((e) => e.description === "").length).toBeLessThan(20);
  });

  it("has no idea in its everyday sense, and names each kind in Spanish", () => {
    expect(es.some((e) => e.sense === "ordinary")).toBe(false);
    expect(kindLabel("order", "es")).toBe("Orden de seres");
    expect(kindLabel("order")).toBe("Order of beings");
  });
});
