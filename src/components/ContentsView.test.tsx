import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { partNumeral } from "@/content/paper-index";
import { ContentsView } from "./ContentsView";

describe("partNumeral", () => {
  it("gives the Roman numeral of a part", () => {
    expect(["1", "2", "3", "4"].map(partNumeral)).toEqual(["I", "II", "III", "IV"]);
  });
});

describe("ContentsView", () => {
  it("links to all 197 papers", () => {
    render(<ContentsView />);
    const links = screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/papers/"));
    expect(links).toHaveLength(197);
    const foreword = screen.getByRole("region", { name: "Foreword" });
    expect(within(foreword).getByRole("link", { name: "Foreword" })).toHaveAttribute("href", "/papers/foreword");
    expect(screen.getByRole("link", { name: "1 The Universal Father" })).toHaveAttribute(
      "href",
      "/papers/paper-1-the-universal-father",
    );
  });

  it("shows each part with its range, title, and sponsorship line", () => {
    render(<ContentsView />);
    const part = screen.getByRole("region", { name: "The Central and Superuniverses" });
    expect(within(part).getByText("Part I · Papers 1–31")).toBeInTheDocument();
    expect(within(part).getByText(/^Sponsored by a Uversa Corps/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "The Life and Teachings of Jesus" })).toBeInTheDocument();
  });

  it("has jump links to the Foreword and the four parts", () => {
    render(<ContentsView />);
    const jump = screen.getByRole("navigation", { name: "Parts" });
    expect(within(jump).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "#foreword",
      "#part-1",
      "#part-2",
      "#part-3",
      "#part-4",
    ]);
  });
});
