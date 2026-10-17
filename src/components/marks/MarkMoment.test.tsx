import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkMoment } from "./MarkMoment";
import { MarksView } from "./MarksCard";

const state = vi.hoisted(() => ({ moments: [] as string[], played: [] as string[], listeners: new Set<() => void>(), view: null as unknown, of: null as unknown }));
// The store answers the same object until the moments change, as the real store does.
const viewOf = () => {
  if (state.of !== state.moments) {
    state.of = state.moments;
    state.view = { card: { on: true, marks: { search: "t" } }, asking: false, moments: state.moments };
  }
  return state.view;
};
vi.mock("@/streak/client", () => ({
  streakView: () => viewOf(),
  serverStreakView: () => viewOf(),
  subscribeToStreak: (l: () => void) => {
    state.listeners.add(l);
    return () => state.listeners.delete(l);
  },
  momentPlayed: (id: string) => {
    state.played.push(id);
    state.moments = state.moments.filter((m) => m !== id);
    for (const l of state.listeners) l();
  },
}));
vi.mock("@/analytics", () => ({ track: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  state.moments = [];
  state.played = [];
});
afterEach(() => {
  vi.useRealTimers();
  for (const panel of document.querySelectorAll(".panel")) panel.remove();
});

describe("the moment of a new mark", () => {
  it("shows the mark, then the next one after Continue", async () => {
    state.moments = ["search", "papers-1"];
    render(<MarkMoment />);
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(screen.getByRole("dialog", { name: "A new mark: Search" })).toBeInTheDocument();
    expect(screen.getByText("A new mark · 1 of 30")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(state.played).toEqual(["search"]);
    expect(screen.getByRole("dialog", { name: "A new mark: 1 paper" })).toBeInTheDocument();
  });

  it("waits while a sheet is open", async () => {
    document.body.insertAdjacentHTML("beforeend", '<div class="panel"></div>');
    state.moments = ["search"];
    render(<MarkMoment />);
    await act(() => vi.advanceTimersByTimeAsync(2500));
    expect(screen.queryByRole("dialog")).toBeNull();
    document.querySelector(".panel")?.remove();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(screen.getByRole("dialog", { name: "A new mark: Search" })).toBeInTheDocument();
  });
});

describe("the marks card", () => {
  it("counts the earned marks, and shows what each other mark takes", () => {
    render(<MarksView marks={{ "first-section": "t", "papers-1": "t" }} place="stack" />);
    expect(screen.getByText("Marks · 2 of 30")).toBeInTheDocument();
    expect(screen.getAllByText("✓ earned")).toHaveLength(2);
    expect(screen.getByText("about 18 hours")).toBeInTheDocument();
    expect(screen.getByText("a year of days")).toBeInTheDocument();
  });
});
