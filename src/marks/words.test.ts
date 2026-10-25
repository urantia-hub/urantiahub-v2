import { describe, expect, it } from "vitest";
import { MARKS, TIERS } from "./list";
import { markWords } from "./words";

describe("the words of the marks", () => {
  it("gives the English of the list as it is", () => {
    const en = markWords("en");
    for (const mark of MARKS) {
      expect(en.name(mark.id)).toBe(mark.name);
      expect(en.effort(mark.id)).toBe(mark.effort);
    }
    expect(TIERS.map((tier) => en.tier(tier.tier))).toEqual(TIERS.map(({ name, line }) => ({ name, line })));
  });

  it("gives a Spanish name and effort for each mark, none of them English", () => {
    const es = markWords("es");
    for (const mark of MARKS) {
      expect(es.name(mark.id)).not.toBe(mark.name);
      // A time in minutes is the same in both languages.
      if (!/^\d+ min$/.test(mark.effort)) expect(es.effort(mark.id)).not.toBe(mark.effort);
      expect(es.effort(mark.id)).not.toMatch(/about|hours?\b|papers?\b|week|month|year/);
    }
    expect(es.name("streak-7")).toBe("Racha de 7 días");
    expect(es.name("papers-1")).toBe("1 documento");
    expect(es.name("papers-20")).toBe("20 documentos");
    expect(es.name("part-3")).toBe("Parte III");
    expect(es.effort("papers-20")).toBe("unas 18 horas");
    expect(es.effort("papers-1")).toBe("cerca de 1 hora");
    expect(es.effort("search")).toBe("1 min");
    expect(TIERS.map((tier) => es.tier(tier.tier).name)).toEqual(["Cinta", "Seda", "Dorado", "Iluminado"]);
  });
});
