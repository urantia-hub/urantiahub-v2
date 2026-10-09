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

  // The card of the marked paragraph has the first right to its place, as in Notion: the cards before it move up.
  it("put the chosen card at its paragraph, and move the cards before it up", () => {
    const cards = [{ top: 100, height: 600 }, { top: 300, height: 50 }, { top: 900, height: 50 }];
    expect(placeCards(cards, 12)).toEqual([100, 712, 900]);
    expect(placeCards(cards, 12, 1)).toEqual([-312, 300, 900]);
  });

  it("move the cards after the chosen card down from it", () => {
    expect(placeCards([{ top: 100, height: 40 }, { top: 120, height: 300 }, { top: 200, height: 40 }], 12, 1)).toEqual([68, 120, 432]);
  });

  it("are no cards for no notes", () => {
    expect(placeCards([])).toEqual([]);
  });
});
