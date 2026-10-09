import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { SCALES } from "@/lib/text-size";
import { ReaderSettings } from "./ReaderSettings";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.textSize;
  document.documentElement.style.removeProperty("--reader-scale");
});

const openPanel = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Account and settings" }));
  return screen.getByRole("dialog", { name: "Account and settings" });
};

describe("ReaderSettings", () => {
  it("is closed at first, and its button says so", () => {
    render(<ReaderSettings />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Account and settings" })).toHaveAttribute("aria-expanded", "false");
  });

  it("changes the theme and shows which one is on", async () => {
    render(<ReaderSettings />);
    const panel = await openPanel();
    expect(within(panel).getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(panel).getByRole("button", { name: "Dark" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(within(panel).getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem("theme")).toBe("dark");
  });

  it("makes the text larger and smaller, one step for each press, and stops at each end", async () => {
    render(<ReaderSettings />);
    const panel = await openPanel();
    const larger = within(panel).getByRole("button", { name: "Larger text" });
    const smaller = within(panel).getByRole("button", { name: "Smaller text" });
    await userEvent.click(larger);
    expect(document.documentElement.style.getPropertyValue("--reader-scale")).toBe(String(SCALES[3]));
    await userEvent.click(larger);
    expect(larger).toBeDisabled();
    for (let i = 0; i < 4; i++) await userEvent.click(smaller);
    expect(document.documentElement.style.getPropertyValue("--reader-scale")).toBe(String(SCALES[0]));
    expect(smaller).toBeDisabled();
    expect(within(panel).getByRole("status")).toHaveAccessibleName("Text size 1 of 5");
  });

  it("closes on Escape and on a second press, and gives the focus back to its button", async () => {
    render(<ReaderSettings />);
    await openPanel();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Account and settings" })).toHaveFocus();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "Account and settings" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on a press outside it", async () => {
    render(
      <>
        <ReaderSettings />
        <p>the text</p>
      </>,
    );
    await openPanel();
    await userEvent.click(screen.getByText("the text"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // A link in the panel goes to another page. The panel must not stay open over that page.
  it("closes when the reader follows a link in it", async () => {
    render(<ReaderSettings />);
    const panel = await openPanel();
    const link = document.createElement("a");
    link.href = "#somewhere";
    link.textContent = "Somewhere";
    panel.append(link);
    await userEvent.click(link);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
