import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContentsLink } from "./ContentsLink";

const path = vi.hoisted(() => vi.fn(() => "/papers"));
vi.mock("next/navigation", () => ({ usePathname: path }));

// The list icon keeps its place on the contents page, and shows there as the page the reader is on.
describe("ContentsLink", () => {
  it("is the current page on the English contents", () => {
    path.mockReturnValue("/papers");
    render(<ContentsLink lang="en" />);
    expect(screen.getByRole("link", { name: "All papers" })).toHaveAttribute("aria-current", "page");
  });
  it("is the current page on the Spanish contents", () => {
    path.mockReturnValue("/es/documentos");
    render(<ContentsLink lang="es" />);
    expect(screen.getByRole("link", { name: "Todos los documentos" })).toHaveAttribute("aria-current", "page");
  });
  it("is not the current page on a paper", () => {
    path.mockReturnValue("/papers/paper-1-the-universal-father");
    render(<ContentsLink lang="en" />);
    expect(screen.getByRole("link", { name: "All papers" })).not.toHaveAttribute("aria-current");
  });
});
