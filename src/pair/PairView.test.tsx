import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { units } from "@/image/compose";
import { PairView } from "./PairView";

vi.mock("@/analytics", () => ({ track: vi.fn() }));
vi.mock("@/streak/client", () => ({ earnToolMark: vi.fn() }));

const side = (text: string, base: string, hash: string, shortRef: string) => ({ eyebrow: "E", card: "E", kind: null, units: units(text), source: "s", shortRef, base, hash });
const PAIR = { work: "dhammapada", refPart: "1.0.3", passagePart: "21", a: side("One is here. Two is here.", "/papers/paper-1", "#1:0.3", "1:0.3"), b: side("First is here. Second is here.", "/texts/dhammapada/at/Dhp%2021", "", "Dhp 21") };
const back = () => document.querySelector(".hdr-back")?.textContent ?? null;

describe("the back link of a pair from a sheet", () => {
  it("stays after each choice in the share sheet changes the address", async () => {
    document.body.innerHTML = '<header class="site-header"><div class="header-start"></div></header>';
    window.history.replaceState(null, "", "/s/1.0.3/dhammapada/21?from=paper");
    render(<PairView pair={PAIR as never} start={{ a: [], b: [] }} />, { container: document.body.appendChild(document.createElement("div")) });
    expect(back()).toBe("1:0.3");
    expect(window.location.search).toBe("");
    await userEvent.click(screen.getByRole("button", { name: /Share/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Second is here." }));
    expect(window.location.pathname).toBe("/s/1.0.3/dhammapada/21/2");
    expect(back()).toBe("1:0.3");
    await userEvent.click(await screen.findByRole("button", { name: "First is here." }));
    expect(back()).toBe("1:0.3");
  });
});
