import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, type IconName } from "./icons";

const PLAYER: IconName[] = ["play", "pause", "previous", "next"];
const TOOLS: IconName[] = ["share", "close", "paperBefore", "paperAfter", "search", "list", "moon", "sun", "back", "arrow", "clock", "question", "page", "settings", "terms"];

describe("Icon", () => {
  it.each(PLAYER)("draws the player icon %s as a solid shape", (name) => {
    const svg = render(<Icon name={name} />).container.querySelector("svg")!;
    expect(svg).toHaveAttribute("fill", "currentColor");
    expect(svg).not.toHaveAttribute("stroke");
    expect(svg.querySelectorAll("path").length).toBeGreaterThan(0);
  });

  it.each(TOOLS)("draws the tool icon %s as a line of 1.9 with round ends", (name) => {
    const svg = render(<Icon name={name} />).container.querySelector("svg")!;
    expect(svg).toHaveAttribute("fill", "none");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("stroke-width", "1.9");
    expect(svg).toHaveAttribute("stroke-linecap", "round");
    expect(svg).toHaveAttribute("stroke-linejoin", "round");
  });

  it("is hidden from a screen reader, because its control has the name", () => {
    const svg = render(<Icon name="share" />).container.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("viewBox", "0 0 24 24");
  });

  // Two icons that look alike confuse a reader. An early parallels icon looked like pause.
  it("gives each icon its own shape", () => {
    const shapes = [...PLAYER, ...TOOLS].map((name) => render(<Icon name={name} />).container.innerHTML);
    expect(new Set(shapes).size).toBe(shapes.length);
  });
});
