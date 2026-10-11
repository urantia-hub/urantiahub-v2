import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Notices } from "@/account/notices";

const world = vi.hoisted(() => ({
  account: { status: "in" as string, user: { key: "k", email: "reader@example.com", name: null } as null | { key: string; email: string; name: null } },
  notices: null as unknown,
  calls: [] as { path: string; method: string; body: unknown }[],
  fail: false,
  device: "allowed" as string,
  endpoint: null as string | null,
  joins: true,
  joined: [] as string[],
}));
vi.mock("@/notices/device-end", () => ({
  DEVICE_EVENT: "hub:device",
  registerDevice: vi.fn(async (key: string) => {
    world.joined.push(key);
    return world.joins;
  }),
}));
vi.mock("@/account/client", () => ({
  accountKey: () => world.account.user?.key ?? null,
  accountState: () => world.account,
  serverAccountState: () => world.account,
  subscribeToAccount: () => () => {},
  signInHref: () => "/api/auth/start?to=x",
}));
vi.mock("@/account/reader-call", () => ({
  readerCall: vi.fn(async (path: string, init?: RequestInit) => {
    if (!init?.method) return world.notices;
    world.calls.push({ path, method: init.method, body: JSON.parse(String(init.body)) });
    if (world.fail) return null;
    return init.method === "DELETE" ? { removed: true } : { saved: true };
  }),
}));
vi.mock("@/notices/push", () => ({
  deviceState: () => world.device,
  currentEndpoint: async () => world.endpoint,
  sha256Hex: async (value: string) => `hash-of-${value}`,
  unblockSteps: () => ["Step one.", "Step two."],
}));

import { hourLabel, NotificationsView } from "./NotificationsView";

const OFF = { daily: false, reminder: false, releases: false };
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const other = { id: "o", label: "Safari on Mac", kinds: [], endpointHash: "hash-of-another" };
const mine = { id: "a", label: "Chrome on Android", kinds: [], endpointHash: "hash-of-e" };
const fresh = (over: Partial<Notices["settings"]> = {}, devices: Notices["devices"] = []): Notices => ({ settings: { email: OFF, push: OFF, hour: 7, zone: null, asked: false, ...over }, devices });
const group = (name: string) => screen.findByRole("group", { name });
const chip = async (notice: string, name: string) => within(await group(notice)).getByRole("button", { name });

afterEach(() => {
  world.account = { status: "in", user: { key: "k", email: "reader@example.com", name: null } };
  Object.assign(world, { notices: null, calls: [], fail: false, device: "allowed", endpoint: null, joins: true, joined: [] });
});

describe("the Notifications page", () => {
  it("asks a reader with no account to sign in", () => {
    world.account = { status: "out", user: null };
    render(<NotificationsView />);
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("shows each notice off for a reader who chose nothing", async () => {
    world.notices = fresh();
    render(<NotificationsView />);
    for (const notice of ["A passage each day", "A reminder of your place", "New releases"]) {
      expect(await chip(notice, "Email")).toHaveAttribute("aria-pressed", "false");
      expect(await chip(notice, "Push")).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.getByText(/Email goes to reader@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Your sign-in code always comes by email/)).toBeInTheDocument();
  });

  it("turns an email on with one press, and keeps the time zone of the device with it", async () => {
    world.notices = fresh();
    render(<NotificationsView />);
    await userEvent.click(await chip("A passage each day", "Email"));
    expect(await chip("A passage each day", "Email")).toHaveAttribute("aria-pressed", "true");
    expect(world.calls).toEqual([{ path: "/api/me/notices", method: "PUT", body: { zone: ZONE, email: { daily: true } } }]);
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(world.joined).toEqual([]);
  });

  it("goes back and says so when the account did not take a change", async () => {
    world.notices = fresh();
    world.fail = true;
    render(<NotificationsView />);
    await userEvent.click(await chip("New releases", "Email"));
    expect(await screen.findByText("The change was not saved. Try again.")).toBeInTheDocument();
    expect(await chip("New releases", "Email")).toHaveAttribute("aria-pressed", "false");
  });

  // A push is a setting of the account. It is the same on each device of the reader.
  it("shows a push that is on, on each device, also one that is not in the account", async () => {
    world.notices = fresh({ push: { ...OFF, daily: true } }, [other]);
    world.device = "blocked";
    render(<NotificationsView />);
    expect(await chip("A passage each day", "Push")).toHaveAttribute("aria-pressed", "true");
    expect(await chip("New releases", "Push")).toHaveAttribute("aria-pressed", "false");
  });

  it("adds this device at the first push, then saves the push", async () => {
    world.notices = fresh({ zone: "UTC" });
    render(<NotificationsView />);
    await userEvent.click(await chip("A passage each day", "Push"));
    expect(world.joined).toEqual(["k"]);
    expect(world.calls).toEqual([{ path: "/api/me/notices", method: "PUT", body: { zone: "UTC", push: { daily: true } } }]);
    expect(await chip("A passage each day", "Push")).toHaveAttribute("aria-pressed", "true");
    // The device is in the account now. A second push asks for nothing more.
    await userEvent.click(await chip("New releases", "Push"));
    expect(world.joined).toEqual(["k"]);
    expect(await screen.findByText(/A push comes to this device/)).toBeInTheDocument();
  });

  it("does not add a device that is in the account already, and none to turn a push off", async () => {
    world.notices = fresh({ zone: "UTC", push: { ...OFF, daily: true } }, [mine]);
    world.endpoint = "e";
    render(<NotificationsView />);
    await userEvent.click(await chip("New releases", "Push"));
    await userEvent.click(await chip("A passage each day", "Push"));
    expect(world.joined).toEqual([]);
    expect(world.calls.map((call) => call.body)).toEqual([{ zone: "UTC", push: { releases: true } }, { zone: "UTC", push: { daily: false } }]);
  });

  it("says so when the device did not turn on, and saves nothing", async () => {
    world.notices = fresh({ zone: "UTC" });
    world.device = "ask";
    world.joins = false;
    render(<NotificationsView />);
    await userEvent.click(await chip("A passage each day", "Push"));
    expect(await screen.findByText("This device did not turn on. Try again.")).toBeInTheDocument();
    expect(world.calls).toEqual([]);
    expect(await chip("A passage each day", "Push")).toHaveAttribute("aria-pressed", "false");
  });

  it.each([
    ["ios", /Add to Home Screen/],
    ["blocked", /A website cannot remove a block/],
    ["none", /cannot show a push of UrantiaHub/],
  ])("has no push to turn on in the case %s with no other device, and says why", async (state, words) => {
    world.notices = fresh();
    world.device = state;
    render(<NotificationsView />);
    expect(await chip("A passage each day", "Push")).toBeDisabled();
    expect(await chip("A passage each day", "Email")).toBeEnabled();
    expect(screen.getByText(words)).toBeInTheDocument();
  });

  it("lets a reader turn a push on from a device that cannot get one, for the other devices", async () => {
    world.notices = fresh({ zone: "UTC" }, [other]);
    world.device = "blocked";
    render(<NotificationsView />);
    await userEvent.click(await chip("A passage each day", "Push"));
    expect(world.joined).toEqual([]);
    expect(world.calls.map((call) => call.body)).toEqual([{ zone: "UTC", push: { daily: true } }]);
    expect(screen.getByText(/A push also goes to one other device/)).toBeInTheDocument();
  });

  it("saves the hour and the time zone", async () => {
    world.notices = fresh({ zone: "Europe/Berlin" });
    render(<NotificationsView />);
    await userEvent.selectOptions(await screen.findByLabelText("The daily passage comes at"), "21");
    await userEvent.selectOptions(screen.getByLabelText(/Your time zone/), "Europe/Paris");
    expect(world.calls.map((call) => call.body)).toEqual([{ zone: "Europe/Berlin", hour: 21 }, { zone: "Europe/Paris" }]);
    expect(hourLabel(0)).toBe("12:00 AM");
    expect(hourLabel(12)).toBe("12:00 PM");
    expect(hourLabel(21)).toBe("9:00 PM");
  });

  it("turns each email and each push off, and removes each device, with “Turn all off”", async () => {
    world.notices = fresh({ email: { ...OFF, daily: true }, push: { ...OFF, reminder: true }, zone: "UTC" }, [mine, other]);
    world.endpoint = "e";
    render(<NotificationsView />);
    await userEvent.click(await screen.findByRole("button", { name: "Turn all off" }));
    await waitFor(() => expect(world.calls).toHaveLength(2));
    expect(world.calls).toEqual([
      { path: "/api/me/notices", method: "PUT", body: { zone: "UTC", email: OFF, push: OFF } },
      { path: "/api/me/notices/device", method: "DELETE", body: { all: true } },
    ]);
    expect(await chip("A passage each day", "Email")).toHaveAttribute("aria-pressed", "false");
    expect(await chip("A reminder of your place", "Push")).toHaveAttribute("aria-pressed", "false");
  });

  // A device joins by itself after a sign-in, a moment after the page read the account.
  it("reads the account again when a device joined, and when the page shows again", async () => {
    world.notices = fresh({ zone: "UTC" });
    render(<NotificationsView />);
    expect(await chip("A passage each day", "Push")).toHaveAttribute("aria-pressed", "false");
    world.notices = fresh({ zone: "UTC", push: { ...OFF, daily: true } }, [mine]);
    act(() => void window.dispatchEvent(new Event("hub:device")));
    await waitFor(async () => expect(await chip("A passage each day", "Push")).toHaveAttribute("aria-pressed", "true"));
    world.notices = fresh({ zone: "UTC" });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    await waitFor(async () => expect(await chip("A passage each day", "Push")).toHaveAttribute("aria-pressed", "false"));
  });

  it("says so when the notices did not load", async () => {
    world.notices = null;
    render(<NotificationsView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your notifications did not load.");
  });
});
