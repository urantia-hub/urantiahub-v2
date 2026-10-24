import { describe, expect, it } from "vitest";
import recorded from "../../e2e/fixtures/papers_1.es.json";
import type { GlossaryEntry } from "./glossary";
import { createMatcher, ES_RULES, termsIn } from "./match";

const entry = (id: string, name: string, type: GlossaryEntry["type"] = "being", aliases: string[] = []): GlossaryEntry => ({
  id,
  name,
  type,
  aliases,
  description: `Sobre ${name}.`,
  seeAlso: [],
  citations: 1,
});
const names = (found: GlossaryEntry[]) => found.map((e) => e.name);
const text = (ref: string) => recorded.data.paragraphs.find((p) => p.standardReferenceId === ref)?.text ?? "";

describe("termsIn, Spanish, with the real glossary", () => {
  it("finds the names and the idea of 1:0.1", () => {
    const found = names(termsIn(text("1:0.1"), "es"));
    for (const name of ["Padre Universal", "Dios", "Hijos de Dios", "universo", "mortales", "verdad"]) expect(found).toContain(name);
  });

  it("does not take the article El for the name El", () => {
    expect(termsIn("El Creador se envuelve en luz.", "es").map((e) => e.id)).not.toContain("el");
  });

  it("takes no name of one word that English gives to no entry, and no plain word for a name", () => {
    const ids = termsIn("Josué ben José sabía muy bien que era un hombre. Esta barca se llamaba Simón. Sin embargo, obró mal.", "es").map((e) => e.id);
    for (const id of ["joseph-father-of-jesus", "joshua-old-testament", "esta", "sin-god", "evil"]) expect(ids).not.toContain(id);
    expect(ids).toContain("jesus");
  });

  it("finds no entry for a word in its everyday sense", () => {
    expect(termsIn("El Creador se envuelve en luz como en una vestidura.", "es").map((e) => e.id)).not.toContain("light");
  });

  it("matches an accented name only with its accents", () => {
    expect(names(termsIn("Los mortales van al Paraíso.", "es"))).toContain("Paraíso");
    expect(names(termsIn("Los mortales van al Paraiso.", "es"))).not.toContain("Paraíso");
  });
});

describe("createMatcher with the Spanish rules", () => {
  const match = createMatcher(
    [
      entry("andites", "Anditas", "race"),
      entry("nation", "nación", "concept"),
      entry("voice-test", "voz", "concept"),
      entry("ruler", "Gobernante", "being"),
      entry("sons", "Hijos de Dios", "order", ["los Hijos", "Hijos Creadores"]),
      entry("cosmos", "Cosmos", "place"),
    ],
    ES_RULES,
  );

  it("reads a word with an accent or an ñ as one word", () => {
    expect(names(match("La nación y el niño."))).toEqual(["nación"]);
    expect(names(match("La naciónal."))).toEqual([]);
  });

  it("finds a plural by -s, by -es after a consonant, and by -ces for a final z", () => {
    expect(names(match("Las naciones antiguas."))).toEqual(["nación"]);
    expect(names(match("Las voces del cielo."))).toEqual(["voz"]);
    expect(names(match("Los Gobernantes del sistema."))).toEqual(["Gobernante"]);
  });

  it("finds one member of a race in the singular", () => {
    expect(names(match("Un Andita llegó."))).toEqual(["Anditas"]);
  });

  it("keeps an article before a name, and no other name that starts with one", () => {
    expect(names(match("Así hablaron los Hijos de Dios."))).toEqual(["Hijos de Dios"]);
    expect(names(match("Así hablaron los Hijos."))).toEqual([]);
  });

  it("needs the capitals of a name", () => {
    expect(names(match("El cosmos entero."))).toEqual([]);
    expect(names(match("El Cosmos entero."))).toEqual(["Cosmos"]);
  });
});
