import { act, fireEvent, render, screen } from "@testing-library/react";
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
    expect(screen.getByText("A new mark · 1 of 35")).toBeInTheDocument();
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
  const next = [
    { id: "terms", line: "Open the terms of a paragraph · 1 min", progress: null },
    { id: "papers-5", line: "4 papers left · about 4 hours", progress: 0.2 },
  ];

  it("shows the earned marks, the newest first, and the nearest marks with what each takes", () => {
    const { container } = render(<MarksView marks={{ "first-section": "2026-10-17T10:00:00Z", "papers-1": "2026-10-17T11:00:00Z" }} next={next} place="stack" />);
    expect(container.querySelector(".marks-head")).toHaveTextContent("Marks2 of 35");
    expect([...container.querySelectorAll(".marks-got li")].map((li) => li.querySelector("small")?.textContent)).toEqual(["1 paper", "First section"]);
    expect(screen.getByText("Open the terms of a paragraph · 1 min")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "5 papers, progress" })).toHaveAttribute("aria-valuenow", "20");
  });

  it("keeps the four tiers closed until See all, and closes them again with Show less", () => {
    const { container } = render(<MarksView marks={{ "first-section": "t", "papers-1": "t" }} next={next} place="stack" />);
    const all = container.querySelector(".marks-all") as HTMLElement;
    expect(all).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "See all 35 marks" }));
    expect(all).toBeVisible();
    expect(screen.getAllByText("✓ earned")).toHaveLength(2);
    expect(screen.getByText("a year")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show less" }));
    expect(all).not.toBeVisible();
  });

  it("shows only Next for a reader with no mark yet", () => {
    const { container } = render(<MarksView marks={{}} next={next} place="stack" />);
    expect(container.querySelector(".marks-got")).toBeNull();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });

  it("puts a count after the eighth earned mark", () => {
    const ids = ["first-section", "first-listen", "search", "parallels", "terms", "note", "image", "share", "papers-1", "foreword"];
    const { container } = render(<MarksView marks={Object.fromEntries(ids.map((id) => [id, "t"]))} next={[]} place="stack" />);
    expect(container.querySelectorAll(".marks-got li")).toHaveLength(9);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("names the marks and the tiers in Spanish on a Spanish page", () => {
    const { container } = render(<MarksView marks={{ "first-section": "t" }} next={[]} place="stack" lang="es" />);
    expect(container.querySelector(".marks-head")).toHaveTextContent("Marcas1 de 35");
    expect(container.querySelector(".marks-got")).toHaveTextContent("Primera sección");
    expect(screen.getByRole("button", { name: "Ver las 35 marcas" })).toBeInTheDocument();
    expect([...container.querySelectorAll(".marks-tier-head b")].map((b) => b.textContent)).toEqual(["Cinta", "Seda", "Dorado", "Iluminado"]);
    expect(container.textContent).toContain("Racha de 7 días");
  });

  it("shows the moment in Spanish on a Spanish page", async () => {
    state.moments = ["papers-1"];
    render(<MarkMoment lang="es" />);
    expect(await screen.findByRole("dialog", { name: "Una marca nueva: 1 documento" })).toBeInTheDocument();
    expect(screen.getByText("Cerca de 1 hora de lectura.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeInTheDocument();
  });

  it("says a year of days in a row one time, in both languages", async () => {
    state.moments = ["streak-365"];
    const { unmount } = render(<MarkMoment />);
    expect(await screen.findByText("A year of days in a row.")).toBeInTheDocument();
    unmount();
    render(<MarkMoment lang="es" />);
    expect(await screen.findByText("Un año de días seguidos.")).toBeInTheDocument();
  });
});
