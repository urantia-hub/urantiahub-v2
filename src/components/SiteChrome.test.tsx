import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("shows the name as a link to the home page, and the two links", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "UrantiaHub" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Papers" })).toHaveAttribute("href", "/papers");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });
});

describe("SiteFooter", () => {
  it("has a search link in the header, as an icon with a name", () => {
    render(<SiteHeader />);
    const link = screen.getByRole("link", { name: "Search" });
    expect(link).toHaveAttribute("href", "/search");
    expect(link.querySelector("svg")).not.toBeNull();
  });

  // The theme is in the header, or in the reader settings. A second control in the footer was noise.
  it("has no theme control in the footer", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("contentinfo").querySelector("button")).toBeNull();
  });

  // The theme is in the settings, with the account, on each page (Kelson, 2026-10-11).
  it("has the settings in the header, and no second theme control", () => {
    render(<SiteHeader />);
    const header = screen.getByRole("banner");
    expect(header.querySelector("button[aria-label='Account and settings']")).not.toBeNull();
    expect(header.querySelector("button[aria-label='Dark theme']")).toBeNull();
  });

  // The footer is on the home page too. It names the site and says what it is for.
  it("says what the site is, and that the project is independent", () => {
    render(<SiteFooter />);
    expect(screen.getByText("UrantiaHub is a free place to read, listen to, and study the Urantia Papers. It is an independent project, not affiliated with Urantia Foundation.")).toBeInTheDocument();
  });
  it("links to urantia.dev and to the privacy page", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "urantia.dev" })).toHaveAttribute("href", "https://urantia.dev");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
  it("links to the resources and the releases", () => {
    render(<SiteFooter />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.querySelector('a[href="/resources"]')).toHaveTextContent("Resources");
    expect(footer.querySelector('a[href="/releases"]')).toHaveTextContent("Releases");
  });
  it("has the contact address, and the line for developers comes last", () => {
    render(<SiteFooter />);
    const links = [...screen.getByRole("contentinfo").querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links).toContain("mailto:hi@urantiahub.com");
    expect(links.at(-1)).toBe("https://urantia.dev");
  });
});

describe("the chrome of a Spanish page", () => {
  it("names the Spanish contents in the header, and the brand goes to the Spanish home", () => {
    render(<SiteHeader lang="es" />);
    expect(screen.getByRole("link", { name: "UrantiaHub" })).toHaveAttribute("href", "/es");
    expect(screen.getByRole("link", { name: "Documentos" })).toHaveAttribute("href", "/es");
    const about = screen.getByRole("link", { name: "Acerca de" });
    expect(about).toHaveAttribute("href", "/about");
    expect(about).toHaveAttribute("hreflang", "en");
    expect(screen.getByRole("link", { name: "Todos los documentos" })).toHaveAttribute("href", "/es");
  });

  // The pages of the footer are in English. The words that lead to them are in Spanish.
  it("says what the site is in Spanish, with links to the English pages", () => {
    render(<SiteFooter lang="es" />);
    expect(screen.getByText("UrantiaHub es un lugar para leer y estudiar los Documentos de Urantia. Es un proyecto independiente, sin afiliación con la Fundación Urantia.")).toBeInTheDocument();
    const privacy = screen.getByRole("link", { name: "Privacidad" });
    expect(privacy).toHaveAttribute("href", "/privacy");
    expect(privacy).toHaveAttribute("hreflang", "en");
    expect(screen.getByRole("navigation", { name: "Acerca de UrantiaHub" })).toBeInTheDocument();
    const links = [...screen.getByRole("contentinfo").querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links.at(-1)).toBe("https://urantia.dev");
  });
});
