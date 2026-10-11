import { render, screen, waitFor, within } from "@testing-library/react";
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
  subscribed: { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "BKey_0123456789", auth: "auth_0123456789", label: "Chrome on Android" } as null | object,
  unsubscribed: 0,
  claimed: [] as string[],
  canClaim: true,
  ended: 0,
  whileAsking: null as null | (() => void),
}));
vi.mock("@/notices/device-end", () => ({
  claimDevice: vi.fn(async (key: string) => (world.canClaim ? (void world.claimed.push(key), true) : false)),
  endDevice: vi.fn(async () => void world.ended++),
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
  subscribeDevice: async () => {
    world.whileAsking?.();
    return world.subscribed;
  },
  unsubscribeDevice: async () => void world.unsubscribed++,
  unblockSteps: () => ["Step one.", "Step two."],
}));

import { hourLabel, NotificationsView } from "./NotificationsView";

const OFF = { daily: false, reminder: false, releases: false };
const fresh = (over: Partial<Notices["settings"]> = {}, devices: Notices["devices"] = []): Notices => ({ settings: { email: OFF, hour: 7, zone: null, asked: false, ...over }, devices });
const group = (name: string) => screen.findByRole("group", { name });
const chip = async (notice: string, name: string) => within(await group(notice)).getByRole("button", { name });

afterEach(() => {
  world.claimed = [];
  world.canClaim = true;
  world.ended = 0;
  world.whileAsking = null;
  world.account = { status: "in", user: { key: "k", email: "reader@example.com", name: null } };
  world.notices = null;
  world.calls = [];
  world.fail = false;
  world.device = "allowed";
  world.endpoint = null;
  world.subscribed = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: "BKey_0123456789", auth: "auth_0123456789", label: "Chrome on Android" };
  world.unsubscribed = 0;
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
      expect(await chip(notice, "This device")).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.getByText(/Email goes to reader@example.com/)).toBeInTheDocument();
    expect(screen.getByText(/Your sign-in code always comes by email/)).toBeInTheDocument();
  });

  it("turns an email on with one press, and keeps the time zone of the device with it", async () => {
    world.notices = fresh();
    render(<NotificationsView />);
    await userEvent.click(await chip("A passage each day", "Email"));
    expect(await chip("A passage each day", "Email")).toHaveAttribute("aria-pressed", "true");
    expect(world.calls).toEqual([{ path: "/api/me/notices", method: "PUT", body: { zone: Intl.DateTimeFormat().resolvedOptions().timeZone, email: { daily: true } } }]);
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(await chip("New releases", "Email")).toHaveAttribute("aria-pressed", "false");
  });

  it("goes back and says so when the account did not take a change", async () => {
    world.notices = fresh();
    world.fail = true;
    render(<NotificationsView />);
    await userEvent.click(await chip("New releases", "Email"));
    expect(await screen.findByText("The change was not saved. Try again.")).toBeInTheDocument();
    expect(await chip("New releases", "Email")).toHaveAttribute("aria-pressed", "false");
  });

  it("makes this device one that gets a notice, with the kinds that it had", async () => {
    world.notices = fresh({ zone: "Europe/Berlin" }, [{ id: "a", label: "Chrome on Android", kinds: ["releases"], endpointHash: "hash-of-https://fcm.googleapis.com/fcm/send/abc" }]);
    world.endpoint = "https://fcm.googleapis.com/fcm/send/abc";
    render(<NotificationsView />);
    expect(await chip("New releases", "This device")).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(await chip("A passage each day", "This device"));
    await waitFor(() => expect(world.calls).toHaveLength(1));
    expect(world.calls[0]).toEqual({ path: "/api/me/notices/device", method: "PUT", body: { ...world.subscribed, kinds: ["releases", "daily"] } });
    // The browser keeps whose device this is, so a later reader of this browser does not get the notices.
    expect(world.claimed).toEqual(["k"]);
    expect(await chip("A passage each day", "This device")).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a choice of another device as off here", async () => {
    world.notices = fresh({}, [{ id: "a", label: "Safari on Mac", kinds: ["daily"], endpointHash: "hash-of-another" }]);
    render(<NotificationsView />);
    expect(await chip("A passage each day", "This device")).toHaveAttribute("aria-pressed", "false");
  });

  // The question of the browser can stay open for a long time. The reader can sign out in it.
  it("turns nothing on when the reader changed while the browser asked", async () => {
    world.notices = fresh({ zone: "UTC" });
    world.whileAsking = () => void (world.account = { status: "in", user: { key: "another", email: "b@example.com", name: null } });
    render(<NotificationsView />);
    await userEvent.click(await chip("A passage each day", "This device"));
    await waitFor(() => expect(world.unsubscribed).toBe(1));
    expect(world.claimed).toEqual([]);
    expect(world.calls).toEqual([]);
  });

  it("turns nothing on when the browser cannot keep whose device it is", async () => {
    world.notices = fresh({ zone: "UTC" });
    world.canClaim = false;
    render(<NotificationsView />);
    await userEvent.click(await chip("A passage each day", "This device"));
    expect(await screen.findByText("This device did not turn on. Try again.")).toBeInTheDocument();
    expect(world.ended).toBe(1);
    expect(world.calls).toEqual([]);
  });

  it("says so when the reader did not allow the device, and saves nothing", async () => {
    world.notices = fresh();
    world.device = "ask";
    world.subscribed = null;
    render(<NotificationsView />);
    await userEvent.click(await chip("A passage each day", "This device"));
    expect(await screen.findByText("This device did not turn on. Try again.")).toBeInTheDocument();
    expect(world.calls).toEqual([]);
  });

  it.each([
    ["ios", /Add to Home Screen/],
    ["blocked", /A website cannot remove a block/],
    ["none", /cannot show notifications of UrantiaHub/],
  ])("has no device button to press in the case %s, and says why", async (state, words) => {
    world.notices = fresh();
    world.device = state;
    render(<NotificationsView />);
    expect(await chip("A passage each day", "This device")).toBeDisabled();
    expect(await chip("A passage each day", "Email")).toBeEnabled();
    expect(screen.getByText(words)).toBeInTheDocument();
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

  it("turns each email off and removes each device with “Turn all off”", async () => {
    world.notices = fresh({ email: { daily: true, reminder: true, releases: false }, zone: "UTC" }, [{ id: "a", label: "x", kinds: ["daily"], endpointHash: "hash-of-e" }]);
    world.endpoint = "e";
    render(<NotificationsView />);
    await userEvent.click(await screen.findByRole("button", { name: "Turn all off" }));
    await waitFor(() => expect(world.unsubscribed).toBe(1));
    expect(world.calls).toEqual([
      { path: "/api/me/notices", method: "PUT", body: { zone: "UTC", email: OFF } },
      { path: "/api/me/notices/device", method: "DELETE", body: { all: true } },
    ]);
    expect(await chip("A passage each day", "Email")).toHaveAttribute("aria-pressed", "false");
    expect(await chip("A passage each day", "This device")).toHaveAttribute("aria-pressed", "false");
  });

  it("says so when the notices did not load", async () => {
    world.notices = null;
    render(<NotificationsView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your notifications did not load.");
  });
});
