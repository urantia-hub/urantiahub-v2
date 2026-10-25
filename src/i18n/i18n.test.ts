import { afterEach, describe, expect, it, vi } from "vitest";
import { apiLang, spanishOn } from "./lang";
import { messages } from "./messages";
import { contentsHref, counterpart, homeHref, howHref, pageHref, paperHref, searchHref, shareHref, textsHref, twinPath } from "./paths";

describe("the twin of a page", () => {
  it("is the same page in the other language, with its query", () => {
    expect(twinPath("/saved?ref=1:0.3", "es")).toBe("/es/guardados?ref=1:0.3");
    expect(twinPath("/papers", "es")).toBe("/es/documentos");
    expect(twinPath("/papers", "en")).toBe("/papers");
  });
  it("is null for a page with no twin", () => {
    expect(twinPath("/progress", "es")).toBeNull();
  });
  it("names the twins of the pages about the site", () => {
    expect(twinPath("/about", "es")).toBe("/es/acerca-de");
    expect(twinPath("/es/acerca-de", "en")).toBe("/about");
    expect(twinPath("/resources", "es")).toBe("/es/recursos");
    expect(twinPath("/releases", "es")).toBe("/es/novedades");
  });
});

describe("the twins of World texts", () => {
  it("keeps the slug, the page key, the query, and the passage", () => {
    expect(twinPath("/texts", "es")).toBe("/es/textos");
    expect(twinPath("/es/textos", "en")).toBe("/texts");
    expect(twinPath("/texts/quran/2?s=1#v2", "es")).toBe("/es/textos/quran/2?s=1#v2");
    expect(twinPath("/es/textos/bible/john-3", "en")).toBe("/texts/bible/john-3");
    expect(twinPath("/texts/how-it-works#number", "es")).toBe("/es/textos/como-funciona#number");
    expect(twinPath("/es/textos/como-funciona", "en")).toBe("/texts/how-it-works");
    expect(twinPath("/textsx", "es")).toBeNull();
  });
  it("gives the address of World texts, a work, and a page in a language", () => {
    expect(textsHref("en")).toBe("/texts");
    expect(textsHref("es")).toBe("/es/textos");
    expect(textsHref("es", "quran")).toBe("/es/textos/quran");
    expect(textsHref("es", "quran", "2")).toBe("/es/textos/quran/2");
    expect(textsHref("en", "bible", "john-3")).toBe("/texts/bible/john-3");
    expect(howHref("en")).toBe("/texts/how-it-works");
    expect(howHref("es")).toBe("/es/textos/como-funciona");
  });
});

describe("the table of twins", () => {
  it("pairs each fixed page with its twin, with the query and the paragraph", () => {
    expect(twinPath("/you", "es")).toBe("/es/tu");
    expect(twinPath("/es/tu", "en")).toBe("/you");
    expect(twinPath("/es/avisos", "en")).toBe("/notifications");
    expect(twinPath("/emails?off=x", "es")).toBe("/es/correos?off=x");
    expect(counterpart("/notifications", "es")).toBe("/es/avisos");
  });

  it("gives the address of a fixed page in a language", () => {
    expect(pageHref("es", "/notifications")).toBe("/es/avisos");
    expect(pageHref("en", "/you")).toBe("/you");
    expect(pageHref("es", "/nowhere")).toBe("/nowhere");
  });
});

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
  it("maps the home page, the contents page, and Saved to their twins", () => {
    expect(counterpart("/", "es")).toBe("/es");
    expect(counterpart("/es", "en")).toBe("/");
    expect(counterpart("/papers", "es")).toBe("/es/documentos");
    expect(counterpart("/es/documentos", "en")).toBe("/papers");
    expect(counterpart("/saved?ref=1:0.3", "es")).toBe("/es/guardados?ref=1:0.3");
    expect(counterpart("/es/guardados", "en")).toBe("/saved");
  });
  it("sends a page with no twin to the home page of the other language, with no query or hash", () => {
    expect(counterpart("/progress", "es")).toBe("/es");
    expect(counterpart("/texts/quran/1?s=1#v2", "es")).toBe("/es/textos/quran/1?s=1#v2");
    expect(counterpart("/es/nada", "en")).toBe("/");
  });
  it("keeps a pair page with its parts, a share page, and its pick", () => {
    expect(counterpart("/s/1.0.3/dhammapada/21?from=paper", "es")).toBe("/es/s/1.0.3/dhammapada/21?from=paper");
    expect(counterpart("/es/s/1.0.3/1/dhammapada/21/2", "en")).toBe("/s/1.0.3/1/dhammapada/21/2");
    expect(counterpart("/s/1.0.3?x=1", "es")).toBe("/es/s/1.0.3?x=1");
    expect(counterpart("/es/s/1.0.3/2", "en")).toBe("/s/1.0.3/2");
  });
  it("keeps the paragraph of the study page", () => {
    expect(counterpart("/parallels?ref=1:0.3", "es")).toBe("/es/paralelos?ref=1:0.3");
    expect(counterpart("/es/paralelos?ref=1:0.3", "en")).toBe("/parallels?ref=1:0.3");
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
    expect(contentsHref("es")).toBe("/es/documentos");
    expect(homeHref("en")).toBe("/");
    expect(homeHref("es")).toBe("/es");
    expect(searchHref("es", "alma")).toBe("/es/buscar?q=alma");
    expect(searchHref("en")).toBe("/search");
    expect(shareHref("es", "1:0.1")).toBe("/es/s/1.0.1");
  });
});

describe("messages", () => {
  it("has the same keys in Spanish as in English", () => {
    expect(Object.keys(messages("es")).sort()).toEqual(Object.keys(messages("en")).sort());
  });
  it("words the Spanish notices and streak question as a reader expects", () => {
    const es = messages("es");
    expect(es.notices.lead).toContain("hasta que elijas");
    expect(es.notices.dailyAt).not.toMatch(/a las$/);
    expect(es.notices.streakAt).not.toMatch(/a las$/);
    expect(es.streak.askTitle).toBe("¿Quieres llevar una racha?");
    expect(es.streak.yes).toBe("Sí, quiero llevar una racha");
  });
  it("words the eyebrow of a paper", () => {
    expect(messages("es").paperEyebrow("I", 1)).toBe("Parte I · Documento 1");
  });
});

describe("the language of a request", () => {
  it("is Spanish only for es", async () => {
    const { langParam } = await import("./lang");
    expect(langParam("es")).toBe("es");
    expect(langParam("fr")).toBe("en");
    expect(langParam(null)).toBe("en");
  });
});

describe("lang", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("writes a Spanish number in one style on each page", async () => {
    const { numberIn } = await import("./lang");
    expect(numberIn("es")(14597)).toBe("14,597");
    expect(numberIn("es")(1412)).toBe("1,412");
    expect(numberIn("en")(1412)).toBe("1,412");
  });
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
