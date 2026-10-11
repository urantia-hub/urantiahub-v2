import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({ done: null as null | ((ok: boolean) => void), calls: 0, state: { status: "in", user: { name: "Ana", email: "ana@example.com", key: "k" } } }));
vi.mock("@/account/client", () => ({
  accountState: () => world.state,
  serverAccountState: () => world.state,
  subscribeToAccount: () => () => {},
  never: () => () => {},
  signInProblem: () => false,
  noSignInProblem: () => false,
  signInHref: () => "/api/auth/start",
  signOut: () => {
    world.calls += 1;
    return new Promise<boolean>((resolve) => void (world.done = resolve));
  },
}));

import { AccountRows } from "./AccountRows";

afterEach(() => {
  world.calls = 0;
  world.done = null;
});

// Kelson, 2026-10-11: a sign-out takes a moment, and a reader who sees nothing presses again and again.
describe("the sign-out row", () => {
  it("says that it works, and takes no second press while it does", async () => {
    render(<AccountRows />);
    const row = screen.getByRole("button", { name: "Sign out" });
    await userEvent.click(row);
    const busy = screen.getByRole("button", { name: "Signing out…" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    await userEvent.click(busy);
    expect(world.calls).toBe(1);
  });

  it("comes back and says so when the sign-out did not finish", async () => {
    render(<AccountRows />);
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    world.done?.(false);
    expect(await screen.findByRole("status")).toHaveTextContent("The sign-out did not finish");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });
});
