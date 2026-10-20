import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { units } from "@/image/compose";
import PairShareSheet from "./PairShareSheet";
import type { Chosen, ViewPair } from "./view";

vi.mock("@/analytics", () => ({ track: vi.fn() }));
vi.mock("@/streak/client", () => ({ earnToolMark: vi.fn() }));

const PAIR: ViewPair = {
  work: "dhammapada",
  refPart: "1.0.3",
  passagePart: "21",
  a: { eyebrow: "The Urantia Papers", card: "The Urantia Papers", kind: null, units: units("One is here. Two is here. Three is here."), source: "1:0.3 · The Universal Father", shortRef: "1:0.3", base: "/papers/paper-1-the-universal-father", hash: "#1:0.3" },
  b: { eyebrow: "The Dhammapada", card: "Dhammapada", kind: "Buddhist scripture", units: units("First is here. Second is here."), source: "Dhp 21 · Muller, 1881", shortRef: "Dhp 21", base: "/texts/dhammapada/at/Dhp%2021", hash: "" },
};

function open(chosen: Chosen = { a: new Set(), b: new Set() }) {
  const onChoose = vi.fn();
  render(<PairShareSheet pair={PAIR} chosen={chosen} onChoose={onChoose} onClose={() => {}} onCopied={() => {}} />);
  return onChoose;
}

describe("the share sheet of a pair", () => {
  it("says the whole passage for a side with no choice, and has the pair address", () => {
    open();
    expect(screen.getByRole("heading", { name: "Share these two passages" })).toBeInTheDocument();
    expect(screen.getAllByText("Whole passage")).toHaveLength(2);
    expect(screen.getByTestId("share-url").textContent).toBe("localhost:3000/s/1.0.3/dhammapada/21");
  });

  it("gives the page a press on a unit of the world text", async () => {
    const onChoose = open();
    await userEvent.click(screen.getByRole("button", { name: "Second is here." }));
    expect(onChoose).toHaveBeenCalledWith("b", 1);
  });

  it("names the choice in the address and in the count", () => {
    open({ a: new Set([0, 2]), b: new Set([1]) });
    expect(screen.getByTestId("share-url").textContent).toBe("localhost:3000/s/1.0.3/1.3/dhammapada/21/2");
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.getByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Second is here." })).toHaveAttribute("aria-pressed", "true");
  });
});
