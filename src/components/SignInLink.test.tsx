import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/account/client", () => ({ signInHref: () => "/api/auth/start?next=%2Fpapers" }));

import { SignInLink } from "./SignInLink";

// The link is a real link. The test stops the browser from leaving the page.
const stay = (link: HTMLElement) => link.addEventListener("click", (event) => event.preventDefault());

describe("the sign-in link", () => {
  it("is a plain link that works with no script", () => {
    render(<SignInLink className="saved-button" />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/api/auth/start");
  });

  it("says that the sign-in opens, with the page to come back to, and takes no second press", async () => {
    render(<SignInLink />);
    const link = screen.getByRole("link", { name: "Sign in" });
    stay(link);
    await userEvent.click(link);
    const busy = screen.getByRole("link", { name: "Opening the sign-in…" });
    expect(busy).toHaveAttribute("href", "/api/auth/start?next=%2Fpapers");
    expect(busy).toHaveAttribute("aria-busy", "true");
  });

  it("works again when the reader comes back with the back button", async () => {
    render(<SignInLink />);
    const link = screen.getByRole("link", { name: "Sign in" });
    stay(link);
    await userEvent.click(link);
    act(() => void window.dispatchEvent(new Event("pageshow")));
    expect(screen.getByRole("link", { name: "Sign in" })).not.toHaveAttribute("aria-busy");
  });
});
