import { afterEach, describe, expect, it, vi } from "vitest";
import { apiLang, spanishOn } from "./lang";
import { messages } from "./messages";
import { contentsHref, counterpart, paperHref, searchHref, shareHref } from "./paths";

describe("counterpart", () => {
  it("maps an English paper to its Spanish twin", () => {
    expect(counterpart("/papers/paper-1-the-universal-father", "es")).toBe("/es/documentos/documento-1-el-padre-universal");
  });
  it("maps the Spanish Foreword to the English one", () => {
    expect(counterpart("/es/documentos/prologo", "en")).toBe("/papers/foreword");
  });
  it("keeps the paragraph of the address", () => {
    expect(counterpart("/papers/paper-1-the-universal-father#1:0.1", "es")).toBe(
      "/es/documentos/documento-1-el-padre-universal#1:0.1",
    );
  });
  it("sends a page with no twin to the contents page of the other language", () => {
    expect(counterpart("/privacy", "es")).toBe("/es");
    expect(counterpart("/es/documentos", "en")).toBe("/papers");
  });
  it("keeps the words of a search", () => {
    expect(counterpart("/es/buscar?q=fe", "en")).toBe("/search?q=fe");
    expect(counterpart("/search?q=faith", "es")).toBe("/es/buscar?q=faith");
  });
  it("maps a share link", () => {
    expect(counterpart("/s/1.0.1", "es")).toBe("/es/s/1.0.1");
    expect(counterpart("/es/s/1.0.1/1.3-4", "en")).toBe("/s/1.0.1/1.3-4");
  });
  it("gives the same address for the language it is already in", () => {
    expect(counterpart("/papers/foreword", "en")).toBe("/papers/foreword");
  });
});

describe("paths", () => {
  it("builds the address of each page in each language", () => {
    expect(paperHref("en", 1)).toBe("/papers/paper-1-the-universal-father");
    expect(paperHref("es", 0)).toBe("/es/documentos/prologo");
    expect(contentsHref("en")).toBe("/papers");
    expect(contentsHref("es")).toBe("/es");
    expect(searchHref("es", "alma")).toBe("/es/buscar?q=alma");
    expect(searchHref("en")).toBe("/search");
    expect(shareHref("es", "1:0.1")).toBe("/es/s/1.0.1");
  });
});

describe("messages", () => {
  it("has the same keys in Spanish as in English", () => {
    expect(Object.keys(messages("es")).sort()).toEqual(Object.keys(messages("en")).sort());
  });
  it("words the eyebrow of a paper", () => {
    expect(messages("es").paperEyebrow("I", 1)).toBe("Parte I · Documento 1");
  });
});

describe("lang", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("names the language as the API does", () => {
    expect(apiLang("en")).toBe("eng");
    expect(apiLang("es")).toBe("es");
  });
  it("turns Spanish on only with the flag", () => {
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "");
    expect(spanishOn()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "on");
    expect(spanishOn()).toBe(true);
  });
});
