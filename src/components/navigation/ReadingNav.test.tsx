import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingNav } from "./ReadingNav";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

function renderNav() {
  return render(
    <ReadingNav
      paper={{ id: "1", title: "The Universal Father" }}
      sections={[
        { id: "0", title: null },
        { id: "1", title: "The Father’s Name" },
      ]}
      previous={{ id: "0", title: "Foreword", href: "/papers/foreword" }}
      next={{ id: "2", title: "2 · The Nature of God", href: "/papers/paper-2-the-nature-of-god" }}
    />,
  );
}

// Moves the page to y and lets the scroll handler run on the next frame.
async function scrollTo(y: number) {
  await act(async () => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
  });
}

beforeEach(() => {
  track.mockClear();
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  // A page taller than the window, so the position changes on each scroll as it does in a browser.
  Object.defineProperty(document.documentElement, "scrollHeight", { value: 5000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

describe("ReadingNav", () => {
  it("reports that the paper opened, with the paper id only", () => {
    renderNav();
    expect(track).toHaveBeenCalledWith("paper_opened", { paper_id: "1" });
  });

  it("shows the paper title before the reader reaches a section", () => {
    renderNav();
    expect(screen.getByTestId("reading-bar-label")).toHaveTextContent("The Universal Father");
  });

  it("leaves on a scroll down and returns on a scroll up", async () => {
    renderNav();
    const bar = screen.getByTestId("reading-bar");
    expect(bar).not.toHaveClass("away");

    await scrollTo(300);
    expect(bar).toHaveClass("away");

    await scrollTo(420);
    expect(bar).toHaveClass("away");

    await scrollTo(360);
    expect(bar).not.toHaveClass("away");
  });

  it("shows the position in the paper", async () => {
    const { container } = renderNav();
    await scrollTo(2100);
    expect(container.querySelector<HTMLElement>(".fill")!.style.width).toBe("50%");
  });

  it("stays in view near the top of the page", async () => {
    renderNav();
    await scrollTo(60);
    expect(screen.getByTestId("reading-bar")).not.toHaveClass("away");
  });

  // Speech control users say the words they see, so the accessible name must contain them.
  it("has an accessible name that contains the words on the button", () => {
    renderNav();
    const button = screen.getByRole("button", { name: /Open the navigator/ });
    expect(button).toHaveAccessibleName("Paper 1 The Universal Father. Open the navigator");
    expect(button).toHaveTextContent("Paper 1");
    expect(button).toHaveTextContent("The Universal Father");
  });

  it("links the arrows to the previous and the next paper", () => {
    renderNav();
    expect(screen.getByRole("link", { name: "Previous: Foreword" })).toHaveAttribute("href", "/papers/foreword");
    expect(screen.getByRole("link", { name: "Next: 2 · The Nature of God" })).toHaveAttribute(
      "href",
      "/papers/paper-2-the-nature-of-god",
    );
  });
});
