import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchShortcut } from "./SearchShortcut";

const pressed = vi.fn((event: Event) => event.preventDefault());
// The header's search link. The shortcut presses it.
const SearchLink = () => (
  <header className="site-header">
    <a href="/search" onClick={(event) => pressed(event.nativeEvent)}>
      Search
    </a>
  </header>
);

beforeEach(() => {
  pressed.mockClear();
  window.history.replaceState(null, "", "/papers");
});

describe("SearchShortcut", () => {
  it("opens the search screen on the slash key", async () => {
    render(
      <>
        <SearchLink />
        <SearchShortcut />
      </>,
    );
    await userEvent.keyboard("/");
    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it("leaves the key alone while the reader types in a field", async () => {
    render(
      <>
        <SearchLink />
        <SearchShortcut />
        <input aria-label="field" />
        <textarea aria-label="area" />
      </>,
    );
    for (const el of document.querySelectorAll<HTMLElement>("input, textarea")) {
      el.focus();
      await userEvent.keyboard("/");
    }
    expect(pressed).not.toHaveBeenCalled();
  });

  it("leaves the key alone with a modifier, and while a dialog is open", async () => {
    render(
      <>
        <SearchLink />
        <SearchShortcut />
        <dialog open>open</dialog>
      </>,
    );
    await userEvent.keyboard("/");
    await userEvent.keyboard("{Control>}/{/Control}");
    await userEvent.keyboard("{Meta>}/{/Meta}");
    expect(pressed).not.toHaveBeenCalled();
  });

  it("puts the focus in the field when the reader is on the search screen", async () => {
    window.history.replaceState(null, "", "/search");
    render(
      <>
        <SearchLink />
        <SearchShortcut />
        <input name="q" aria-label="Search the Papers" />
      </>,
    );
    await userEvent.keyboard("/");
    expect(pressed).not.toHaveBeenCalled();
    expect(document.querySelector("input")).toHaveFocus();
  });
});
