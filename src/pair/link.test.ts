import { describe, expect, it } from "vitest";
import { pairPath, splitPairPath } from "./link";

describe("the address of a pair", () => {
  it("splits each of its four shapes and writes the same path back", () => {
    const shapes = [
      ["63.0.1", "rig-veda", "10.10.3"],
      ["63.0.1", "2", "rig-veda", "10.10.3"],
      ["63.0.1", "rig-veda", "10.10.3", "1-2"],
      ["131.9.2", "p2-3", "shu-king", "5.16.2", "p1"],
    ];
    for (const parts of shapes) {
      const split = splitPairPath(parts);
      expect(split).not.toBeNull();
      expect(pairPath(split!)).toBe(`/s/${parts.join("/")}`);
    }
  });

  it("reads a clause code after the paragraph as a code", () => {
    expect(splitPairPath(["63.0.1", "p3", "rig-veda", "10.10.3"])).toEqual({ ref: "63.0.1", refCode: "p3", work: "rig-veda", passage: "10.10.3", passageCode: "" });
  });

  it("reads a work with a name in its passage", () => {
    expect(splitPairPath(["63.0.1", "prose-edda", "gylfaginning.9.1"])).toEqual({ ref: "63.0.1", refCode: "", work: "prose-edda", passage: "gylfaginning.9.1", passageCode: "" });
  });

  it("is nothing for another shape", () => {
    expect(splitPairPath(["63.0.1", "rig-veda"])).toBeNull();
    expect(splitPairPath(["63.0.1", "1", "rig-veda", "10.10.3", "1", "x"])).toBeNull();
    expect(splitPairPath(["63.0.1", "Rig-Veda", "10.10.3"])).toBeNull();
    expect(splitPairPath(["63.0.1", "1", "2", "10.10.3"])).toBeNull();
    expect(splitPairPath(["63.0.1", "rig-veda", "10.10.3", "x"])).toBeNull();
  });
});
