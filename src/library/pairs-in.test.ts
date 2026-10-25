import { describe, expect, it, vi } from "vitest";
import { dhammapadaPairs } from "@/components/library/library-fixtures";
import { pairsIn } from "./pairs-in";

describe("the pairs of a work in a language", () => {
  it("gives each pair the Spanish paragraph and the Spanish title of its paper", async () => {
    const text = vi.fn(async (paperId: string, ref: string) => `Texto ${paperId} ${ref}`);
    const pairs = await pairsIn(dhammapadaPairs(), "es", text);
    expect(pairs[0].paragraph).toMatchObject({ ref: "131:3.7", paperTitle: "Las religiones del mundo", text: "Texto 131 131:3.7" });
    expect(pairs[0].text).toBe(dhammapadaPairs()[0].text);
  });

  it("keeps the English paragraph of a pair whose Spanish text fails, and asks nothing in English", async () => {
    const text = vi.fn(async () => Promise.reject(new Error("down")));
    expect(await pairsIn(dhammapadaPairs(), "es", text)).toEqual(dhammapadaPairs());
    expect(await pairsIn(dhammapadaPairs(), "en", text)).toEqual(dhammapadaPairs());
    expect(text).toHaveBeenCalledTimes(3);
  });
});
