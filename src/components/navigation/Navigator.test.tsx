import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Navigator } from "./Navigator";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

const sections = [
  { id: "0", title: null },
  { id: "1", title: "The Father’s Name" },
  { id: "2", title: "The Reality of God" },
];

function setup(over: Partial<React.ComponentProps<typeof Navigator>> = {}) {
  const navigate = vi.fn();
  const onClose = vi.fn();
  render(
    <Navigator
      open
      onClose={onClose}
      navigate={navigate}
      paper={{ id: "1", title: "The Universal Father" }}
      sections={sections}
      current="1"
      previous={{ id: "0", title: "Foreword", href: "/papers/foreword" }}
      next={{ id: "2", title: "The Nature of God", href: "/papers/paper-2-the-nature-of-god" }}
      {...over}
    />,
  );
  return { navigate, onClose };
}

beforeEach(() => {
  track.mockClear();
  window.history.replaceState(null, "", "/papers/paper-1-the-universal-father");
});

describe("Navigator", () => {
  it("lists the sections and marks the current one", () => {
    setup();
    expect(screen.getByRole("button", { name: "Introduction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1. The Father’s Name" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "2. The Reality of God" })).not.toHaveAttribute("aria-current", "true");
  });

  it("goes to a section", async () => {
    const { navigate, onClose } = setup();
    await userEvent.click(screen.getByRole("button", { name: "2. The Reality of God" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/papers/paper-1-the-universal-father#1:2", true));
    expect(onClose).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith("navigator_used", { kind: "section" });
  });

  it("goes to the top of the paper for the opening section", async () => {
    const { navigate } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Introduction" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/papers/paper-1-the-universal-father#paper-top", true));
  });

  it("goes to a typed reference", async () => {
    const { navigate } = setup();
    await userEvent.type(screen.getByLabelText("Go to a reference"), "99:1.1{Enter}");
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/papers/paper-99-the-social-problems-of-religion#99:1.1", true),
    );
    expect(track).toHaveBeenCalledWith("navigator_used", { kind: "reference" });
    // The event must not carry what the reader typed.
    expect(JSON.stringify(track.mock.calls)).not.toContain("99:1.1");
  });

  it("shows a message for input that is not a reference, and does not navigate", async () => {
    const { navigate } = setup();
    await userEvent.type(screen.getByLabelText("Go to a reference"), "abc{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("Use a form such as 99, 99:1, or 99:1.1.");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows the same message for a paper number that does not exist", async () => {
    const { navigate } = setup();
    await userEvent.type(screen.getByLabelText("Go to a reference"), "197{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows the title of a paper before the reader opens it", async () => {
    const { navigate } = setup();
    await userEvent.click(screen.getByRole("tab", { name: "All papers" }));
    const grid = screen.getByRole("group", { name: "Part III: The History of Urantia" });
    await userEvent.click(within(grid).getByRole("button", { name: "99" }));
    expect(screen.getByText("The Social Problems of Religion")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/papers/paper-99-the-social-problems-of-religion", true));
    expect(track).toHaveBeenCalledWith("navigator_used", { kind: "paper" });
  });

  it("offers all 196 numbered papers in the grid", async () => {
    setup();
    await userEvent.click(screen.getByRole("tab", { name: "All papers" }));
    const numbers = screen.getAllByRole("button").filter((b) => /^\d+$/.test(b.textContent ?? ""));
    expect(numbers).toHaveLength(196);
  });

  it("goes to the previous and the next paper", async () => {
    const { navigate } = setup();
    await userEvent.click(screen.getByRole("button", { name: /Next.*The Nature of God/ }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/papers/paper-2-the-nature-of-god", true));
  });

  // A step back in history makes the browser restore the old scroll position, which undoes a jump.
  it("replaces its own history entry with the destination, and does not step back", async () => {
    const back = vi.spyOn(window.history, "back");
    const { navigate } = setup();
    await userEvent.click(screen.getByRole("button", { name: "2. The Reality of God" }));
    expect(navigate).toHaveBeenCalledWith("/papers/paper-1-the-universal-father#1:2", true);
    expect(back).not.toHaveBeenCalled();
    back.mockRestore();
  });

  it("goes to a destination only one time", async () => {
    const { navigate } = setup();
    await userEvent.click(screen.getByRole("button", { name: "2. The Reality of God" }));
    screen.getByRole("dialog", { hidden: true }).dispatchEvent(new Event("close"));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("closes without a destination", async () => {
    const { navigate, onClose } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });
});
