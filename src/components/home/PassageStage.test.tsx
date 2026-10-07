import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Passage } from "@/content/fetchers";
import { PassageStage, passageSize } from "./PassageStage";

vi.mock("@/analytics", () => ({ track: vi.fn() }));

const passages: Passage[] = [
  { ref: "99:1.1", paperId: "99", paperTitle: "The Social Problems of Religion", text: "First passage text." },
  { ref: "15:14.9", paperId: "15", paperTitle: "The Seven Superuniverses", text: "Second passage text." },
];

describe("passageSize", () => {
  it("gives short text the large size and long text the small size", () => {
    expect(passageSize("x".repeat(240))).toBe("s");
    expect(passageSize("x".repeat(440))).toBe("m");
    expect(passageSize("x".repeat(500))).toBe("l");
  });
});

describe("PassageStage", () => {
  it("puts every passage in the HTML with its exact text", () => {
    const { container } = render(<PassageStage passages={passages} />);
    const quotes = [...container.querySelectorAll(".passage blockquote")].map((q) => q.textContent);
    expect(quotes).toEqual(["First passage text.", "Second passage text."]);
  });

  it("links each passage to its paragraph and names its paper", () => {
    const { container } = render(<PassageStage passages={passages} />);
    const cite = container.querySelector(".passage .cite")!;
    expect(cite).toHaveAttribute("href", "/papers/paper-99-the-social-problems-of-religion#99:1.1");
    expect(cite).toHaveTextContent("99:1.1");
    expect(cite).toHaveTextContent("Paper 99 · The Social Problems of Religion");
  });

  it("includes the inline script that selects one passage", () => {
    const { container } = render(<PassageStage passages={passages} />);
    expect(container.querySelector(".stage script")?.textContent).toContain("dataset.pick");
  });
});
