import { describe, expect, it } from "vitest";
import { titleSize } from "./share-image";

describe("the title of a share image", () => {
  it("is smaller for a longer title, so it fits in two lines", () => {
    expect(titleSize("World texts")).toBe(84);
    expect(titleSize("The Relation of the Universal Father to the Universe")).toBe(66);
    expect(titleSize("A title of a chapter that is much longer than the title of any paper of the book")).toBe(54);
  });
});
