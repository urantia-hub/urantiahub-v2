import { beforeEach, describe, expect, it, vi } from "vitest";
import { LANG_MOVE_SCRIPT, VISIT_KEY } from "./lang-move-script";

// Runs the script as the page runs it, with a stand-in for the address and the two stores.
function run({ lang, stored, visit = null, alternate }: { lang: string; stored: string | null; visit?: string | null; alternate?: [string, string] }) {
  document.documentElement.lang = lang;
  document.head.innerHTML = alternate ? `<link rel="alternate" hreflang="${alternate[0]}" href="${alternate[1]}">` : "";
  const session = new Map<string, string>(visit ? [[VISIT_KEY, visit]] : []);
  const sessionStorage = { getItem: (key: string) => session.get(key) ?? null, setItem: (key: string, value: string) => void session.set(key, value) };
  const localStorage = { getItem: (key: string) => (key === "hub:lang" ? stored : null) };
  const location = { href: "http://localhost:3100/papers?x=1#2:1.3", pathname: "/papers", search: "?x=1", hash: "#2:1.3", replace: vi.fn() };
  new Function("location", "localStorage", "sessionStorage", LANG_MOVE_SCRIPT)(location, localStorage, sessionStorage);
  return { replace: location.replace, session };
}

describe("the move to the reader's language", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("opens the twin of the first page of a visit in the language that the reader chose", () => {
    const { replace, session } = run({ lang: "en", stored: "es", alternate: ["es", "http://localhost:3100/es/documentos"] });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/es/documentos?x=1#2:1.3");
    expect(session.get(VISIT_KEY)).toBe("1");
  });

  it("does nothing after the first page of a visit", () => {
    const { replace } = run({ lang: "en", stored: "es", visit: "1", alternate: ["es", "http://localhost:3100/es/documentos"] });
    expect(replace).not.toHaveBeenCalled();
  });

  it("does nothing for a page with no twin, and still marks the visit", () => {
    const { replace, session } = run({ lang: "en", stored: "es" });
    expect(replace).not.toHaveBeenCalled();
    expect(session.get(VISIT_KEY)).toBe("1");
  });

  it("does nothing when the page is in the chosen language, or no language was chosen", () => {
    expect(run({ lang: "es", stored: "es", alternate: ["es", "http://localhost:3100/es"] }).replace).not.toHaveBeenCalled();
    expect(run({ lang: "en", stored: null, alternate: ["es", "http://localhost:3100/es"] }).replace).not.toHaveBeenCalled();
    expect(run({ lang: "en", stored: "fr", alternate: ["fr", "http://localhost:3100/fr"] }).replace).not.toHaveBeenCalled();
  });

  it("does nothing, and throws nothing, when the browser blocks storage", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    const location = { href: "http://localhost/", pathname: "/", search: "", hash: "", replace: vi.fn() };
    document.documentElement.lang = "en";
    document.head.innerHTML = '<link rel="alternate" hreflang="es" href="http://localhost/es">';
    expect(() => new Function("location", "localStorage", "sessionStorage", LANG_MOVE_SCRIPT)(location, blocked, blocked)).not.toThrow();
    expect(() => new Function("location", "localStorage", "sessionStorage", LANG_MOVE_SCRIPT)(location, blocked, { getItem: () => null, setItem: () => {} })).not.toThrow();
    expect(location.replace).not.toHaveBeenCalled();
  });
});
