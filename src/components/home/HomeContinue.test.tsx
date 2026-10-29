import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveLastRead } from "@/reader/last-read";
import { HomeContinue, HomePlace } from "./HomeContinue";

const replace = vi.fn();
vi.mock("@/analytics", () => ({ track: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  replace.mockClear();
});

describe("Continue reading on the home page", () => {
  it("goes to the section that the reader left, and the line below names it", () => {
    saveLastRead({ paperId: "38", sectionId: "1", label: "1. Origin of Seraphim" });
    render(
      <>
        <HomeContinue />
        <HomePlace />
      </>,
    );
    expect(screen.getByRole("link", { name: "Continue reading" })).toHaveAttribute("href", "/papers/paper-38-ministering-spirits-of-the-local-universe#38:1");
    expect(screen.getByText("Paper 38 · Ministering Spirits of the Local Universe · 1. Origin of Seraphim")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-place");
  });

  it("takes the mark of a place off the page for a reader with none, so the first button shows", () => {
    document.documentElement.dataset.place = "";
    render(<HomeContinue />);
    expect(document.documentElement).not.toHaveAttribute("data-place");
    expect(screen.getByRole("link", { name: "Continue reading" })).toHaveAttribute("href", "/papers");
  });
});

describe("Continue reading on the Spanish home page", () => {
  it("goes to the Spanish paper, and the line below names it in Spanish", () => {
    saveLastRead({ paperId: "1", sectionId: "1", label: null });
    render(
      <>
        <HomeContinue lang="es" />
        <HomePlace lang="es" />
      </>,
    );
    expect(screen.getByRole("link", { name: "Seguir leyendo" })).toHaveAttribute("href", "/es/documentos/documento-1-el-padre-universal#1:1");
    expect(screen.getByText(/^Documento 1 · El Padre Universal/)).toBeInTheDocument();
  });

  it("goes to the Spanish contents for a reader with no place", () => {
    render(<HomeContinue lang="es" />);
    expect(screen.getByRole("link", { name: "Seguir leyendo" })).toHaveAttribute("href", "/es/documentos");
  });
});

describe("the home page at an app launch", () => {
  afterEach(() => document.documentElement.removeAttribute("data-launch"));

  it("goes to the section that the reader left while the still mark shows", () => {
    document.documentElement.setAttribute("data-launch", "");
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    render(<HomeContinue />);
    expect(replace).toHaveBeenCalledWith("/papers/paper-38-ministering-spirits-of-the-local-universe#38:1");
  });

  it("stays on the home page with no still mark", () => {
    saveLastRead({ paperId: "38", sectionId: "1", label: null });
    render(<HomeContinue />);
    expect(replace).not.toHaveBeenCalled();
  });
});
