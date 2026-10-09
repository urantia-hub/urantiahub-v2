import { describe, expect, it } from "vitest";
import { placeCards } from "./margin-layout";

describe("the cards in the margin", () => {
  it("sit at the top of their paragraphs when they have room", () => {
    expect(placeCards([{ top: 100, height: 80 }, { top: 400, height: 80 }])).toEqual([100, 400]);
  });

  it("move down, and never over the card before", () => {
    expect(placeCards([{ top: 100, height: 300 }, { top: 150, height: 50 }, { top: 200, height: 50 }], 12)).toEqual([100, 412, 474]);
  });

  it("go back to their paragraph after a long card ends", () => {
    expect(placeCards([{ top: 100, height: 300 }, { top: 900, height: 50 }], 12)).toEqual([100, 900]);
  });

  it("keep the order of the text when the tops arrive out of order", () => {
    expect(placeCards([{ top: 500, height: 40 }, { top: 100, height: 40 }], 12)).toEqual([500, 100]);
  });

  it("are no cards for no notes", () => {
    expect(placeCards([])).toEqual([]);
  });
});
