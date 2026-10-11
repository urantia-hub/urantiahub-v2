import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const world = vi.hoisted(() => ({
  key: "k" as string | null,
  path: "/papers",
  asked: false,
  calls: [] as unknown[],
  saves: true,
  device: "allowed" as string,
  turned: { ok: true, device: { id: "h", label: "Chrome on Android", kinds: ["daily"], endpointHash: "h" } } as object,
  pushed: [] as string[],
  states: {} as Record<string, object>,
  out: { status: "out" },
  off: { status: "off" },
}));
vi.mock("next/navigation", () => ({ usePathname: () => world.path, useRouter: () => ({ push: (to: string) => void world.pushed.push(to) }) }));
vi.mock("@/account/client", () => ({
  accountKey: () => world.key,
  // The same object for the same reader, as the real store gives.
  accountState: () => (world.key ? (world.states[world.key] ??= { status: "in", user: { key: world.key } }) : world.out),
  serverAccountState: () => world.off,
  subscribeToAccount: () => () => {},
}));
vi.mock("@/account/reader-call", () => ({
  readerCall: vi.fn(async (_path: string, init?: RequestInit) => {
    if (!init?.method) return { settings: { email: { daily: false, reminder: false, releases: false }, hour: 7, zone: null, asked: world.asked }, devices: [] };
    world.calls.push(JSON.parse(String(init.body)));
    return world.saves ? { saved: true } : null;
  }),
}));
vi.mock("@/notices/device-on", () => ({ turnOnDevice: vi.fn(async () => world.turned) }));
vi.mock("@/notices/push", () => ({ deviceState: () => world.device }));
vi.stubEnv("NEXT_PUBLIC_NOTICES", "on");
const { NoticeQuestion } = await import("./NoticeQuestion");

const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
async function shown() {
  render(<NoticeQuestion />);
  await act(async () => void (await vi.advanceTimersByTimeAsync(1600)));
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ref: "99:1.1", text: "Mankind is on the march toward a new and unrevealed planetary destiny." })));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.querySelector(".test-sheet")?.remove();
  Object.assign(world, { key: "k", path: "/papers", asked: false, calls: [], saves: true, device: "allowed", pushed: [] });
});

describe("the question after the first sign-in", () => {
  it("shows one time to a signed-in reader who was not asked, with the passage of today", async () => {
    await shown();
    expect(await screen.findByRole("dialog", { name: "A passage each day" })).toBeInTheDocument();
    expect(screen.getByText(/Mankind is on the march/)).toBeInTheDocument();
    expect(screen.getByText("99:1.1 · the passage of today")).toBeInTheDocument();
    expect(screen.getByText(/It is off until you turn it on/)).toBeInTheDocument();
  });

  it.each([
    ["a reader who was asked", () => void (world.asked = true)],
    ["a reader with no account", () => void (world.key = null)],
    ["the settings page", () => void (world.path = "/notifications")],
    ["the page that turns an email off", () => void (world.path = "/emails")],
    ["a page with a sheet open", () => void document.body.insertAdjacentHTML("beforeend", '<div class="panel test-sheet"></div>')],
  ])("does not show for %s", async (_case, arrange) => {
    arrange();
    await shown();
    expect(screen.queryByRole("dialog", { name: "A passage each day" })).toBeNull();
  });

  it("turns the daily email on with one press, with the time zone of the device, and says so", async () => {
    await shown();
    await user.click(await screen.findByRole("button", { name: "Send it by email" }));
    expect(world.calls).toEqual([{ email: { daily: true }, asked: true, zone: ZONE }]);
    expect(await screen.findByRole("status")).toHaveTextContent("The passage comes by email each day at 7:00 AM in your time zone.");
  });

  it("turns this device on, and keeps that the reader was asked", async () => {
    await shown();
    await user.click(await screen.findByRole("button", { name: "Send it to this device" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The passage comes to this device");
    expect(world.calls).toEqual([{ asked: true, zone: ZONE }]);
  });

  it("sends a reader whose device cannot ask here to the settings, where the steps are", async () => {
    world.device = "ios";
    await shown();
    await user.click(await screen.findByRole("button", { name: "Send it to this device" }));
    expect(world.pushed).toEqual(["/notifications"]);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps the answer “Not now”, so the question does not come back", async () => {
    await shown();
    await user.click(await screen.findByRole("button", { name: "Not now" }));
    expect(world.calls).toEqual([{ asked: true, zone: ZONE }]);
  });

  it("says that nothing changed when the account did not take the choice", async () => {
    world.saves = false;
    await shown();
    await user.click(await screen.findByRole("button", { name: "Send it by email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was changed.");
  });
});
