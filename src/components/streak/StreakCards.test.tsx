import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StreakCard } from "@/account/streak-data";
import { BookCardView, listenHref, StreakCardView } from "./StreakCards";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const week = ["met", "met", "grace", "met", "met", "met", "today"].map((kind, i) => ({ day: `2026-10-${String(11 + i).padStart(2, "0")}`, kind })) as never;
const card = (over: object = {}): Extract<StreakCard, { on: true }> => ({
  on: true,
  goal: 1,
  hour: 21,
  zone: "UTC",
  book: { done: 412, total: 1626 },
  next: { paperId: "3", sectionId: "4", title: "God’s Limitlessness", paper: "The Attributes of God", minutes: 5, href: "/papers/paper-3-the-attributes-of-god#3:4" },
  state: { current: 12, longest: 31, todayMet: false, graceReady: false, graceBackIn: 3, graceUsedOn: "2026-10-13", endedOn: null, endedLength: 0, lastMet: "2026-10-16", week },
  ...over,
});

describe("the streak card", () => {
  it("shows the streak, the week, the grace day, and the next section by its title", () => {
    const { container } = render(<StreakCardView card={card()} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("day streak")).toBeInTheDocument();
    expect([...container.querySelectorAll(".streak-week li")].map((li) => li.getAttribute("data-kind"))).toEqual(["met", "met", "grace", "met", "met", "met", "today"]);
    expect(screen.getByText("grace day back in 3 days")).toBeInTheDocument();
    expect(container.querySelectorAll(".streak-pips i[data-full]")).toHaveLength(4);
    expect(screen.getByText("God’s Limitlessness")).toBeInTheDocument();
    expect(screen.getByText("The Attributes of God · about 5 min")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read" })).toHaveAttribute("href", "/papers/paper-3-the-attributes-of-god#3:4");
    expect(screen.getByRole("link", { name: "Listen" })).toHaveAttribute("href", "/papers/paper-3-the-attributes-of-god?listen=1#3:4");
    expect(screen.queryByText(/3:4/)).toBeNull();
  });

  it("says when the grace day is ready", () => {
    render(<StreakCardView card={card({ state: { ...card().state, graceReady: true, graceBackIn: 0 } })} />);
    expect(screen.getByText("1 grace day ready")).toBeInTheDocument();
  });

  it("counts the whole book", () => {
    render(<BookCardView book={{ done: 412, total: 1626 }} />);
    expect(screen.getByText("412")).toBeInTheDocument();
    expect(screen.getByText("of 1,626 sections")).toBeInTheDocument();
    expect(screen.getByText("25% · this number never goes down")).toBeInTheDocument();
  });

  it("puts the listen mark before the anchor", () => {
    expect(listenHref("/papers/foreword#paper-top")).toBe("/papers/foreword?listen=1#paper-top");
    expect(listenHref("/papers/foreword")).toBe("/papers/foreword?listen=1");
  });
});
