import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { THEME_KEY } from "@/lib/theme";
import { ThemeToggle } from "./ThemeToggle";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("ThemeToggle", () => {
  it("offers the dark theme to a reader in light", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Dark theme" })).toBeInTheDocument();
  });

  it("can be an icon with a name, for the header", async () => {
    render(<ThemeToggle icon />);
    const button = screen.getByRole("button", { name: "Dark theme" });
    expect(button.querySelector("svg")).not.toBeNull();
    expect(button).toHaveTextContent("");
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "Light theme" })).toBeInTheDocument();
  });

  it("changes to dark, remembers it, and then offers light", async () => {
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    await userEvent.click(screen.getByRole("button", { name: "Light theme" }));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("keeps two toggles on one page in step", async () => {
    render(
      <>
        <ThemeToggle />
        <ThemeToggle />
      </>,
    );
    await userEvent.click(screen.getAllByRole("button", { name: "Dark theme" })[0]);
    expect(screen.getAllByRole("button", { name: "Light theme" })).toHaveLength(2);
  });
});
