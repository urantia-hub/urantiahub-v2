import { describe, expect, it } from "vitest";
import { changeLines } from "./changes";

const flat = (parts: { text: string; changed?: boolean }[]) => parts.map((p) => (p.changed ? `[${p.text}]` : p.text)).join("");

describe("changeLines", () => {
  it("marks one changed word on each side", () => {
    const { was, now } = changeLines("the Panama Isthmus went up", "the Panama isthmus went up");
    expect(flat(was)).toBe("…the Panama [Isthmus] went up…");
    expect(flat(now)).toBe("…the Panama [isthmus] went up…");
  });

  it("marks an insertion on the new side only", () => {
    const { was, now } = changeLines("three times Bering Strait land bridge", "three times the Bering Strait land bridge");
    expect(flat(was)).toBe("…three times Bering Strait land bridge…");
    expect(flat(now)).toBe("…three times [the] Bering Strait land bridge…");
  });

  it("marks a removal on the old side only", () => {
    const { was, now } = changeLines("in all other manifestations.", "in all manifestations.");
    expect(flat(was)).toBe("…in all [other] manifestations.");
    expect(flat(now)).toBe("…in all manifestations.");
  });

  it("marks a change at the start or the end", () => {
    expect(flat(changeLines("twoscore self-elevated", "two-score self-elevated").now)).toBe("…[two-score] self-elevated…");
    expect(flat(changeLines("of the Father", "of the Father,").now)).toBe("…of the [Father,]…");
  });

  it("keeps a repeated word as plain words", () => {
    expect(flat(changeLines("the the end", "the end").was)).toBe("…the [the] end…");
  });
});
