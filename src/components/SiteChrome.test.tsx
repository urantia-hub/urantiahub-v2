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
  it("has the theme control in the header", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("banner").querySelector("button[aria-label='Dark theme']")).not.toBeNull();
  });

  it("states that the project is independent", () => {
    render(<SiteFooter />);
    expect(
      screen.getByText("UrantiaHub is an independent project. It is not affiliated with Urantia Foundation."),
    ).toBeInTheDocument();
  });
  it("links to urantia.dev and to the privacy page", () => {
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "urantia.dev" })).toHaveAttribute("href", "https://urantia.dev");
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
  });
});
