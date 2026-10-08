import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { saveLastRead } from "@/reader/last-read";
import { ContinueCard } from "./ContinueCard";

beforeEach(() => window.localStorage.clear());

describe("ContinueCard", () => {
  it("shows nothing for a new visitor", () => {
    const { container } = render(<ContinueCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links to the section the reader left, with the paper and the section named", () => {
    saveLastRead({ paperId: "26", sectionId: "4", label: "4. The Secondary Supernaphim" });
    render(<ContinueCard />);
    const link = screen.getByRole("link", { name: /Continue/ });
    expect(link).toHaveAttribute("href", "/papers/paper-26-ministering-spirits-of-the-central-universe#26:4");
    expect(link).toHaveTextContent("Ministering Spirits of the Central Universe");
    expect(link).toHaveTextContent("Paper 26 · 4. The Secondary Supernaphim");
  });

  it("links to the top of the paper for the opening section", () => {
    saveLastRead({ paperId: "0", sectionId: "0", label: null });
    render(<ContinueCard />);
    const link = screen.getByRole("link", { name: /Continue/ });
    expect(link).toHaveAttribute("href", "/papers/foreword#paper-top");
    expect(link).toHaveTextContent("Foreword");
  });
});
