import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TermsView } from "./TermsView";

afterEach(() => vi.unstubAllEnvs());

// The shape of a page: each heading, paragraph, and item, in order. The line that the English page binds is on
// the Spanish page only.
const shape = (container: HTMLElement) => [...container.querySelectorAll("h1, h2, p:not(.binding), li")].map((e) => e.tagName);
const sentences = (container: HTMLElement) => [...container.querySelectorAll("p, li")].map((e) => e.textContent ?? "").filter((t) => t.length > 12);

describe("the English Terms page", () => {
  for (const signIn of ["", "on"]) {
    it(`is word for word as before with sign-in ${signIn || "off"}`, () => {
      vi.stubEnv("NEXT_PUBLIC_SIGN_IN", signIn);
      expect(render(<TermsView lang="en" />).container.textContent).toMatchSnapshot();
    });
  }
});

describe("the Spanish Terms page", () => {
  for (const signIn of ["", "on"]) {
    it(`has the shape of the English page, and none of its sentences, with sign-in ${signIn || "off"}`, () => {
      vi.stubEnv("NEXT_PUBLIC_SIGN_IN", signIn);
      const en = render(<TermsView lang="en" />).container;
      const es = render(<TermsView lang="es" />).container;
      expect(shape(es)).toEqual(shape(en));
      for (const sentence of sentences(en)) expect(es.textContent).not.toContain(sentence);
      expect(es.textContent?.includes("Tu cuenta")).toBe(signIn === "on");
    });
  }

  it("is in Spanish, links the Spanish Privacy page, and says that the English page binds", () => {
    vi.stubEnv("NEXT_PUBLIC_SIGN_IN", "on");
    render(<TermsView lang="es" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Términos");
    expect(screen.getByText(/^Última actualización: 25 de octubre de 2026$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "La página de privacidad" })).toHaveAttribute("href", "/es/privacidad");
    const english = screen.getByRole("link", { name: "versión en inglés" });
    expect(english).toHaveAttribute("href", "/terms");
    expect(english).toHaveAttribute("hreflang", "en");
    expect(english.closest("p")).toHaveTextContent("La traducción al español se hizo con IA. Si difiere de la versión en inglés, prevalece la versión en inglés.");
  });
});

// The Spanish text is the AI translation of urantia.dev, released as CC0 (2026-10-25).
describe("what the Terms say of the text", () => {
  it("names the Spanish text and its release while Spanish is on", () => {
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "on");
    const en = render(<TermsView lang="en" />).container.textContent ?? "";
    expect(en).toContain("The Spanish text on this site is an AI translation that we made, and we release it to the public domain (CC0).");
    expect(en).toContain("Last updated: October 25, 2026");
    const es = render(<TermsView lang="es" />).container.textContent ?? "";
    expect(es).toContain("El texto en español de este sitio es una traducción con IA que hicimos nosotros, y la liberamos al dominio público (CC0).");
  });

  it("says nothing of a Spanish text while Spanish is off", () => {
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "");
    expect(render(<TermsView lang="en" />).container.textContent).not.toContain("Spanish text");
  });
});
