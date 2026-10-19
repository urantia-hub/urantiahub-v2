import { readFileSync } from "node:fs";
import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { fetchLibrary, type LibraryWork } from "@/content/library";
import { LibraryView } from "./LibraryView";

let works: LibraryWork[] = [];
beforeAll(async () => {
  vi.stubGlobal("fetch", async (url: string) => new Response(readFileSync(`e2e/fixtures/library/${url.endsWith("/works") ? "works" : "scriptures"}.json`, "utf8")));
  works = await fetchLibrary("https://api.test");
});
afterEach(() => vi.unstubAllGlobals());
const firstKeys = (list: LibraryWork[]) => Object.fromEntries(list.map((w) => [w.slug, w.slug === "epictetus-cynic" ? "3-22" : w.refLevels === 3 ? "1-1" : "1"]));

describe("LibraryView", () => {
  it("lists the works in two groups, Scriptures then Classics, with no Bible", () => {
    render(<LibraryView works={works} firstKeys={firstKeys(works)} />);
    expect(screen.getByRole("heading", { level: 1, name: "Library" })).toBeInTheDocument();
    expect(screen.getByText("21 texts of the world's religions, each in the US public domain.")).toBeInTheDocument();
    const groups = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(groups).toEqual(["Scriptures", "Classics"]);
    expect(screen.getByText("Texts that their traditions read as sacred.")).toBeInTheDocument();
    expect(screen.getByText("Stories, histories, and teachings of a tradition that are not read as scripture.")).toBeInTheDocument();
    expect(screen.queryByText(/Bible/)).toBeNull();
  });

  it("gives each work its line and links it to its first page", () => {
    render(<LibraryView works={works} firstKeys={firstKeys(works)} />);
    const scriptures = screen.getByRole("region", { name: "Scriptures" });
    const dhp = within(scriptures).getByRole("link", { name: /The Dhammapada/ });
    expect(dhp).toHaveAttribute("href", "/library/dhammapada/1");
    expect(within(dhp).getByText("Buddhist · F. Max Muller, 1881")).toBeInTheDocument();
    const classics = screen.getByRole("region", { name: "Classics" });
    expect(within(classics).getByRole("link", { name: /Discourses 3.22/ })).toHaveAttribute("href", "/library/epictetus-cynic/3-22");
    expect(within(scriptures).getAllByRole("link")).toHaveLength(works.filter((w) => w.kind === "scripture").length);
  });

  it("names the jumps to the two groups", () => {
    render(<LibraryView works={works} firstKeys={firstKeys(works)} />);
    const jump = screen.getByRole("navigation", { name: "Groups" });
    expect(within(jump).getByRole("link", { name: "Scriptures" })).toHaveAttribute("href", "#scriptures");
    expect(within(jump).getByRole("link", { name: "Classics" })).toHaveAttribute("href", "#classics");
  });
});
