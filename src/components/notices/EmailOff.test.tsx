import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const address = vi.hoisted(() => ({ off: null as string | null }));
vi.mock("next/navigation", () => ({ useSearchParams: () => ({ get: (name: string) => (name === "off" ? address.off : null) }) }));

vi.stubEnv("NEXT_PUBLIC_NOTICES", "on");
const { EmailOff } = await import("./EmailOff");

afterEach(() => {
  address.off = null;
  vi.unstubAllGlobals();
});

describe("the page of “Turn this email off”", () => {
  it("says that each email is off until a reader turns it on, for a link with no proof", () => {
    render(<EmailOff />);
    expect(screen.getByText("Each email of UrantiaHub is off until you turn it on.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Notification settings" })).toHaveAttribute("href", "/notifications");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("promises no email and links to no settings page while the notices are off", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_NOTICES", "");
    const { EmailOff: Off } = await import("./EmailOff");
    render(<Off />);
    expect(screen.getByText(/sends no daily emails at this time/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_NOTICES", "on");
  });

  it("turns nothing off when the page loads", () => {
    address.off = "TOKEN";
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<EmailOff />);
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Turn this email off" })).toBeEnabled();
  });

  it("takes the proof out of the address at once, and still turns the email off with it", async () => {
    address.off = "TOKEN";
    window.history.replaceState(null, "", "/emails?off=TOKEN");
    const fetch = vi.fn(async () => Response.json({ off: true, kind: "releases" }));
    vi.stubGlobal("fetch", fetch);
    const view = render(<EmailOff />);
    expect(window.location.pathname + window.location.search).toBe("/emails");
    // The router then says that the address has no proof. The page kept it.
    address.off = null;
    view.rerender(<EmailOff />);
    await userEvent.click(screen.getByRole("button", { name: "Turn this email off" }));
    expect(await screen.findByRole("status")).toHaveTextContent("New releases");
    expect(fetch).toHaveBeenCalledWith("/api/notices/off", expect.objectContaining({ body: JSON.stringify({ token: "TOKEN" }) }));
  });

  it("turns the email off with one press, and names it", async () => {
    address.off = "TOKEN";
    const fetch = vi.fn(async () => Response.json({ off: true, kind: "daily" }));
    vi.stubGlobal("fetch", fetch);
    render(<EmailOff />);
    await userEvent.click(screen.getByRole("button", { name: "Turn this email off" }));
    expect(await screen.findByRole("status")).toHaveTextContent("The email “A passage each day” is off.");
    expect(fetch).toHaveBeenCalledWith("/api/notices/off", expect.objectContaining({ method: "POST", body: JSON.stringify({ token: "TOKEN" }) }));
  });

  it.each([
    ["the server refuses the proof", async () => Response.json({ off: false }, { status: 400 })],
    ["the server does not answer", async () => Promise.reject(new Error("offline"))],
  ])("says that the email is still on when %s", async (_case, answer) => {
    address.off = "TOKEN";
    vi.stubGlobal("fetch", vi.fn(answer));
    render(<EmailOff />);
    await userEvent.click(screen.getByRole("button", { name: "Turn this email off" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("The email is still on.");
    expect(screen.getByRole("button", { name: "Turn this email off" })).toBeEnabled();
  });
});
