import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { saveTextPlace } from "@/library/text-places";
import { WorkContinue } from "./WorkContinue";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  delete document.documentElement.dataset.textPlace;
});

describe("WorkContinue", () => {
  it("shows nothing, and keeps no room, when the reader has no place in the work", () => {
    document.documentElement.dataset.textPlace = "";
    const { container } = render(<WorkContinue slug="dhammapada" start="/texts/dhammapada/1" />);
    expect(container.querySelector("a")).toBeNull();
    expect(document.documentElement.dataset.textPlace).toBeUndefined();
  });

  it("offers the page where the reader was, and the beginning", () => {
    saveTextPlace("dhammapada", { key: "2", title: "On Earnestness", label: "Chapter 2" });
    render(<WorkContinue slug="dhammapada" start="/texts/dhammapada/1" />);
    const card = screen.getByRole("link", { name: /Continue/ });
    expect(card).toHaveAttribute("href", "/texts/dhammapada/2");
    expect(card.textContent).toContain("On Earnestness");
    expect(card.textContent).toContain("Chapter 2");
    expect(screen.getByRole("link", { name: "or start at the beginning" })).toHaveAttribute("href", "/texts/dhammapada/1");
    expect(document.documentElement.dataset.textPlace).toBe("");
  });

  it("marks the page of the place in the contents, and opens its book", () => {
    saveTextPlace("bible", { key: "john-3", title: "John 3", label: "New Testament" });
    render(
      <>
        <div className="work-home">
          <details>
            <summary>John</summary>
            <span data-page="john-3">3</span>
          </details>
        </div>
        <WorkContinue slug="bible" start="/texts/bible/genesis-1" />
      </>,
    );
    const link = document.querySelector('[data-page="john-3"]') as HTMLElement;
    expect(link).toHaveAttribute("data-here");
    expect((link.closest("details") as HTMLDetailsElement).open).toBe(true);
  });

  it("follows a place that another tab saves", () => {
    render(<WorkContinue slug="quran" start="/texts/quran/1" />);
    expect(screen.queryByRole("link", { name: /Continue/ })).toBeNull();
    act(() => saveTextPlace("quran", { key: "2", title: "Surah 2", label: null }));
    expect(screen.getByRole("link", { name: /Continue/ })).toHaveAttribute("href", "/texts/quran/2");
  });
});
