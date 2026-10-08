import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RECENT_KEY, saveRecent } from "@/search/recent";
import { STARTER_GROUPS } from "@/search/starters";
import { SearchBox } from "./SearchBox";

const STARTERS = STARTER_GROUPS.flatMap((group) => group.questions);

const track = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
vi.mock("@/analytics", () => ({ track }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const field = () => screen.getByRole("searchbox", { name: "Search the Papers" });

beforeEach(() => {
  track.mockClear();
  router.push.mockClear();
  router.back.mockClear();
  window.localStorage.clear();
});

describe("before the reader types", () => {
  it("is a real form that works with no JavaScript", () => {
    render(<SearchBox initial="" />);
    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/search");
    expect(form).toHaveAttribute("method", "get");
    expect(field()).toHaveAttribute("name", "q");
    expect(field()).toHaveAttribute("placeholder", "Search, ask, or type 99:1.1");
  });

  it("holds each starter question as a link, and picks one in each group", () => {
    const { container } = render(<SearchBox initial="" />);
    const list = screen.getByRole("region", { name: "Ask in your own words" });
    expect(within(list).getAllByRole("link").map((a) => a.textContent)).toEqual(STARTERS);
    expect(within(list).getAllByRole("link")[0]).toHaveAttribute("href", `/search?q=${encodeURIComponent(STARTERS[0])}`);
    const groups = [...container.querySelectorAll<HTMLElement>(".starter-group")];
    expect(groups).toHaveLength(5);
    groups.forEach((group, i) => {
      const pick = Number(group.dataset.pick);
      expect(Number.isInteger(pick)).toBe(true);
      expect(pick).toBeGreaterThanOrEqual(0);
      expect(pick).toBeLessThan(STARTER_GROUPS[i].questions.length);
    });
    expect(track).toHaveBeenCalledWith("search_opened");
  });

  it("picks at random, not the first question each time", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.99);
    const { container } = render(<SearchBox initial="" />);
    expect([...container.querySelectorAll<HTMLElement>(".starter-group")].map((g) => g.dataset.pick)).toEqual(["2", "2", "2", "3", "2"]);
    random.mockRestore();
  });

  it("shows the recent searches in place of the starter questions, and clears them", async () => {
    saveRecent("thought adjuster");
    render(<SearchBox initial="" />);
    const recent = screen.getByRole("region", { name: "Recent" });
    expect(within(recent).getByRole("link", { name: "thought adjuster" })).toHaveAttribute("href", "/search?q=thought%20adjuster");
    expect(screen.queryByRole("region", { name: "Ask in your own words" })).toBeNull();
    await userEvent.click(within(recent).getByRole("button", { name: "Clear" }));
    expect(screen.getByRole("region", { name: "Ask in your own words" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(RECENT_KEY)!)).toEqual([]);
  });

  it("reports the source of a starter question and of a recent search, and never the text", async () => {
    saveRecent("soul");
    const view = render(<SearchBox initial="" />);
    await userEvent.click(screen.getByRole("link", { name: "soul" }));
    expect(track).toHaveBeenCalledWith("search_started", { source: "recent" });
    view.unmount();
    window.localStorage.clear();
    render(<SearchBox initial="" />);
    await userEvent.click(screen.getByRole("link", { name: STARTERS[0] }));
    expect(track).toHaveBeenCalledWith("search_started", { source: "starter" });
    expect(JSON.stringify(track.mock.calls)).not.toContain("soul");
  });
});

describe("while the reader types", () => {
  it("shows papers by title, then the search row", async () => {
    render(<SearchBox initial="" />);
    await userEvent.type(field(), "nature");
    const go = screen.getByRole("region", { name: "Go to" });
    expect(within(go).getByRole("link", { name: /The Nature of God/ })).toHaveAttribute("href", "/papers/paper-2-the-nature-of-god");
    expect(screen.getByRole("button", { name: "Search the Papers for “nature”" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ask in your own words" })).toBeNull();
  });

  it("shows only the search row for text that names no paper", async () => {
    render(<SearchBox initial="" />);
    await userEvent.type(field(), "what happens after death");
    expect(screen.queryByRole("region", { name: "Go to" })).toBeNull();
    expect(screen.getByRole("button", { name: "Search the Papers for “what happens after death”" })).toBeInTheDocument();
  });

  it("shows only the jump for a reference: no search row", async () => {
    render(<SearchBox initial="" />);
    await userEvent.type(field(), "99:1.1");
    expect(screen.getByRole("link", { name: /Go to 99:1\.1/ })).toHaveAttribute("href", "/papers/paper-99-the-social-problems-of-religion#99:1.1");
    expect(screen.queryByRole("button", { name: /Search the Papers for/ })).toBeNull();
  });

  it("jumps on Enter for a reference", async () => {
    render(<SearchBox initial="" />);
    await userEvent.type(field(), "99:1.1{Enter}");
    expect(router.push).toHaveBeenCalledWith("/papers/paper-99-the-social-problems-of-religion#99:1.1");
    expect(track).toHaveBeenCalledWith("search_direct_hit", { kind: "reference" });
    expect(window.localStorage.getItem(RECENT_KEY)).toBeNull();
  });

  it("searches on Enter for other text, in its normal form, and remembers it", async () => {
    render(<SearchBox initial="" />);
    await userEvent.type(field(), "  thought   adjuster {Enter}");
    expect(router.push).toHaveBeenCalledWith("/search?q=thought%20adjuster");
    expect(track).toHaveBeenCalledWith("search_started", { source: "typed" });
    expect(JSON.parse(window.localStorage.getItem(RECENT_KEY)!)).toEqual(["thought adjuster"]);
  });

  it("searches from the search row", async () => {
    render(<SearchBox initial="" />);
    await userEvent.type(field(), "nature");
    await userEvent.click(screen.getByRole("button", { name: "Search the Papers for “nature”" }));
    expect(router.push).toHaveBeenCalledWith("/search?q=nature");
  });

  it("does nothing on Enter with an empty field", async () => {
    render(<SearchBox initial="" />);
    await userEvent.type(field(), "   {Enter}");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("empties the field with the clear control, and puts the focus back", async () => {
    render(<SearchBox initial="" />);
    expect(screen.queryByRole("button", { name: "Clear the field" })).toBeNull();
    await userEvent.type(field(), "nature");
    await userEvent.click(screen.getByRole("button", { name: "Clear the field" }));
    expect(field()).toHaveValue("");
    expect(field()).toHaveFocus();
  });
});

describe("on the results page", () => {
  it("holds the searched text, shows the direct hits for it, and no search row", () => {
    render(<SearchBox initial="thought adjuster" />);
    expect(field()).toHaveValue("thought adjuster");
    expect(within(screen.getByRole("region", { name: "Go to" })).getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Search the Papers for/ })).toBeNull();
    expect(track).not.toHaveBeenCalledWith("search_opened");
  });

  it("shows the search row again when the reader changes the text", async () => {
    render(<SearchBox initial="thought adjuster" />);
    await userEvent.type(field(), "s");
    expect(screen.getByRole("button", { name: "Search the Papers for “thought adjusters”" })).toBeInTheDocument();
  });
});

describe("the way back", () => {
  it("goes back in the history, and is a link to the home page with no JavaScript", async () => {
    window.history.pushState(null, "", "/search");
    render(<SearchBox initial="" />);
    const back = screen.getByRole("link", { name: "Back" });
    expect(back).toHaveAttribute("href", "/");
    await userEvent.click(back);
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
