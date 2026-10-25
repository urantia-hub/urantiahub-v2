import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StreakCard } from "@/account/streak-data";
import { listenHref, StreakCardView } from "./StreakCards";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const week = ["met", "met", "grace", "met", "met", "met", "today"].map((kind, i) => ({ day: `2026-10-${String(11 + i).padStart(2, "0")}`, kind })) as never;
const card = (over: object = {}): Extract<StreakCard, { on: true }> => ({
  on: true,
  goal: 1,
  hour: 21,
  zone: "UTC",
  book: { done: 412, total: 1626 },
  marks: {},
  fresh: [],
  nextMarks: [],
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
    expect(container.querySelector(".streak-facts")).toHaveTextContent("Grace day back in 3 days · 1 section a day");
    expect(screen.getByText("longest 31")).toBeInTheDocument();
    // Today is the last day, marked by ink, never by the color of links.
    expect([...container.querySelectorAll(".streak-week li")].map((li) => li.hasAttribute("data-today"))).toEqual([false, false, false, false, false, false, true]);
    expect(screen.getByText("God’s Limitlessness")).toBeInTheDocument();
    expect(screen.getByText("The Attributes of God · about 5 min")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Read" })).toHaveAttribute("href", "/papers/paper-3-the-attributes-of-god#3:4");
    expect(screen.getByRole("link", { name: "Listen" })).toHaveAttribute("href", "/papers/paper-3-the-attributes-of-god?listen=1#3:4");
    expect(screen.queryByText(/3:4/)).toBeNull();
  });

  it("says when the grace day is ready", () => {
    render(<StreakCardView card={card({ state: { ...card().state, graceReady: true, graceBackIn: 0 } })} />);
    expect(screen.getByText(/1 grace day ready/)).toBeInTheDocument();
  });

  it("counts the whole book in one line at its foot", () => {
    const { container } = render(<StreakCardView card={card()} />);
    expect(container.querySelector(".streak-book")).toHaveTextContent("The whole book · 412 of 1,626 sections");
    expect(screen.getByRole("progressbar", { name: "Sections of the whole book" })).toHaveAttribute("aria-valuenow", "412");
  });

  it("puts the listen mark before the anchor", () => {
    expect(listenHref("/papers/foreword#paper-top")).toBe("/papers/foreword?listen=1#paper-top");
    expect(listenHref("/papers/foreword")).toBe("/papers/foreword?listen=1");
  });

  it("speaks Spanish on a Spanish page", () => {
    const { container } = render(<StreakCardView card={card({ book: { done: 1412, total: 1626 } })} lang="es" />);
    expect(screen.getByText("días de racha")).toBeInTheDocument();
    expect(screen.getByText("récord 31")).toBeInTheDocument();
    expect([...container.querySelectorAll(".streak-week li")].map((li) => li.textContent)).toEqual(["D", "L", "M", "X", "J", "V", "S"]);
    expect(container.querySelector(".streak-facts")).toHaveTextContent("El día de gracia vuelve en 3 días · 1 sección al día");
    expect(container.querySelector(".streak-book")).toHaveTextContent("El libro completo · 1412 de 1626 secciones");
    expect(screen.getByRole("link", { name: "Leer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Desactivar la racha" })).toBeInTheDocument();
  });
});
