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
    expect(screen.getByText(/^Última actualización: 10 de octubre de 2026$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "La página de privacidad" })).toHaveAttribute("href", "/es/privacidad");
    const english = screen.getByRole("link", { name: "versión en inglés" });
    expect(english).toHaveAttribute("href", "/terms");
    expect(english).toHaveAttribute("hreflang", "en");
    expect(english.closest("p")).toHaveTextContent("La traducción al español es automática. Si difiere de la versión en inglés, vale la versión en inglés.");
  });
});
