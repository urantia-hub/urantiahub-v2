import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveLastRead } from "@/reader/last-read";
import { HomeContinue, HomePlace } from "./HomeContinue";

vi.mock("@/analytics", () => ({ track: vi.fn() }));
beforeEach(() => window.localStorage.clear());

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
