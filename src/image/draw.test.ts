import { describe, expect, it } from "vitest";
import { sourceLine } from "./draw";

describe("sourceLine", () => {
  it("names the Papers in the language of the page, in capitals", () => {
    expect(sourceLine("1:0.1", "en")).toBe("THE URANTIA PAPERS · 1:0.1");
    expect(sourceLine("1:0.1", "es")).toBe("LOS DOCUMENTOS DE URANTIA · 1:0.1");
  });
});
