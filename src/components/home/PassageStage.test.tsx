import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Passage } from "@/content/fetchers";
import { PassageStage, passageSize } from "./PassageStage";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

beforeEach(() => track.mockClear());

// Two passages can come from one paragraph.
const passages: Passage[] = [
  { ref: "99:1.1", paperId: "99", paperTitle: "The Social Problems of Religion", text: "First passage text." },
  { ref: "99:1.1", paperId: "99", paperTitle: "The Social Problems of Religion", text: "Second passage text." },
];

describe("passageSize", () => {
  it("gives short text the large size and long text the small size", () => {
    expect(passageSize("x".repeat(240))).toBe("s");
    expect(passageSize("x".repeat(440))).toBe("m");
    expect(passageSize("x".repeat(500))).toBe("l");
  });
});

describe("PassageStage", () => {
  it("has a display rule for each passage in the real list", async () => {
    const { HOME_PASSAGES } = await import("@/content/passages");
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/styles/home.css", "utf8");
    HOME_PASSAGES.forEach((_, i) => {
      expect(css).toContain(`.home .stage[data-pick="${i}"] .passage:nth-of-type(${i + 1})`);
    });
  });

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

  // React does not run an inline script that it inserts on the client, so the tracker must pick.
  it("picks a passage when the inline script did not run, and reports that one", () => {
    const { container } = render(<PassageStage passages={passages} />);
    const pick = container.querySelector<HTMLElement>(".stage")!.dataset.pick;
    expect(["0", "1"]).toContain(pick);
    expect(track).toHaveBeenCalledWith("home_passage_shown", { ref: "99:1.1", position: Number(pick) + 1 });
    expect(track).toHaveBeenCalledTimes(1);
  });

  it("keeps the pick of the inline script when it ran", () => {
    const { container, rerender } = render(<PassageStage passages={passages} />);
    container.querySelector<HTMLElement>(".stage")!.dataset.pick = "1";
    rerender(<PassageStage passages={passages} />);
    expect(container.querySelector<HTMLElement>(".stage")!.dataset.pick).toBe("1");
  });

  it("includes the inline script that selects one passage", () => {
    const { container } = render(<PassageStage passages={passages} />);
    expect(container.querySelector(".stage script")?.textContent).toContain("dataset.pick");
  });
});

describe("PassageStage in Spanish", () => {
  it("names the paper in Spanish and links to the Spanish paper", () => {
    const es: Passage[] = [
      { ref: "99:1.1", paperId: "99", paperTitle: "Los problemas sociales de la religión", text: "Texto." },
      { ref: "0:1.1", paperId: "0", paperTitle: "Prólogo", text: "Texto." },
    ];
    const { container } = render(<PassageStage passages={es} lang="es" />);
    const cites = container.querySelectorAll("a.cite");
    expect(cites[0]).toHaveTextContent("99:1.1Documento 99 · Los problemas sociales de la religión");
    expect(cites[0].getAttribute("href")).toMatch(/^\/es\/documentos\/documento-99-[a-z0-9-]+#99:1\.1$/);
    expect(cites[1]).toHaveTextContent("0:1.1Prólogo");
  });
});
