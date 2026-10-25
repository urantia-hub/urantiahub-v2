import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

const slots = () => [...screen.getByRole("navigation", { name: "Site" }).querySelectorAll("[data-slot]")].map((el) => el.getAttribute("data-slot"));

// One header on every page: the controls keep their order, so none moves (spec 2026-10-24).
describe("SiteHeader", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("keeps the name for a screen reader, as a link to the home page", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: "UrantiaHub" })).toHaveAttribute("href", "/");
  });
  it("has no text links, and the four controls in their order", () => {
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "on");
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Site" });
    expect(within(nav).queryByRole("link", { name: "Papers" })).toBeNull();
    expect(within(nav).queryByRole("link", { name: "About" })).toBeNull();
    expect(slots()).toEqual(["search", "contents", "lang", "account"]);
  });
  it("with Spanish off, has three controls and no pill", () => {
    vi.stubEnv("NEXT_PUBLIC_SPANISH", "");
    render(<SiteHeader />);
    expect(slots()).toEqual(["search", "contents", "account"]);
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
  it("links a Spanish page to each Spanish twin", () => {
    render(<SiteFooter lang="es" />);
    const about = screen.getByRole("link", { name: "Acerca de" });
    expect(about).toHaveAttribute("href", "/es/acerca-de");
    expect(about).not.toHaveAttribute("hreflang");
    expect(screen.getByRole("link", { name: "Privacidad" })).toHaveAttribute("href", "/es/privacidad");
    const terms = screen.getByRole("link", { name: "Términos" });
    expect(terms).toHaveAttribute("href", "/es/terminos");
    expect(terms).not.toHaveAttribute("hreflang");
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
  it("links the Spanish contents and the Spanish home from the header", () => {
    render(<SiteHeader lang="es" />);
    expect(screen.getByRole("link", { name: "UrantiaHub" })).toHaveAttribute("href", "/es");
    expect(screen.getByRole("link", { name: "Todos los documentos" })).toHaveAttribute("href", "/es/documentos");
    expect(screen.getByRole("link", { name: "Buscar" })).toHaveAttribute("href", "/es/buscar");
  });

  it("says what the site is in Spanish, and links the Spanish twins", () => {
    render(<SiteFooter lang="es" />);
    expect(screen.getByText("UrantiaHub es un lugar para leer y estudiar los Documentos de Urantia. Es un proyecto independiente, sin afiliación con Urantia Foundation.")).toBeInTheDocument();
    const privacy = screen.getByRole("link", { name: "Privacidad" });
    expect(privacy).toHaveAttribute("href", "/es/privacidad");
    expect(privacy).not.toHaveAttribute("hreflang");
    expect(screen.getByRole("navigation", { name: "Acerca de UrantiaHub" })).toBeInTheDocument();
    const links = [...screen.getByRole("contentinfo").querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(links.at(-1)).toBe("https://urantia.dev");
  });
});
