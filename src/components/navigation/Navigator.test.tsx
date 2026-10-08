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
    await userEvent.type(screen.getByLabelText("Search, or go to a reference"), "99:1.1{Enter}");
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/papers/paper-99-the-social-problems-of-religion#99:1.1", true),
    );
    expect(track).toHaveBeenCalledWith("navigator_used", { kind: "reference" });
    // The event must not carry what the reader typed.
    expect(JSON.stringify(track.mock.calls)).not.toContain("99:1.1");
  });

  it("opens the search for text that is not a reference", async () => {
    const { navigate } = setup();
    await userEvent.type(screen.getByRole("textbox", { name: "Search, or go to a reference" }), "thought  adjuster{Enter}");
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/search?q=thought%20adjuster", true));
    expect(track).toHaveBeenCalledWith("search_started", { source: "navigator" });
    expect(JSON.parse(window.localStorage.getItem("hub:recent-searches")!)).toEqual(["thought adjuster"]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does nothing for an empty field", async () => {
    const { navigate } = setup();
    await userEvent.type(screen.getByRole("textbox", { name: "Search, or go to a reference" }), "   {Enter}");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("says that the papers go from 1 to 196 for a number that is too high", async () => {
    const { navigate } = setup();
    await userEvent.type(screen.getByRole("textbox", { name: "Search, or go to a reference" }), "197{Enter}");
    expect(screen.getByRole("alert")).toHaveTextContent("The papers go from 1 to 196.");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("goes to the Foreword for the word foreword", async () => {
    const { navigate } = setup();
    await userEvent.type(screen.getByRole("textbox", { name: "Search, or go to a reference" }), "foreword{Enter}");
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/papers/foreword", true));
  });

  // After a reload, the entry that the open navigator added is still in the history. It is the same page twice.
  it("steps back over its own history entry when the page loads with one", () => {
    window.history.pushState({ navigator: true }, "");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    setup({ open: false });
    expect(back).toHaveBeenCalledTimes(1);
    back.mockRestore();
    window.history.replaceState(null, "");
  });

  it("empties the field when it closes", async () => {
    const view = render(<Navigator open onClose={() => {}} navigate={() => {}} paper={{ id: "1", title: "The Universal Father" }} sections={sections} current="1" previous={null} next={null} />);
    const field = screen.getByRole("textbox", { name: "Search, or go to a reference" });
    await userEvent.type(field, "197{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    view.rerender(<Navigator open={false} onClose={() => {}} navigate={() => {}} paper={{ id: "1", title: "The Universal Father" }} sections={sections} current="1" previous={null} next={null} />);
    expect(screen.getByRole("textbox", { name: "Search, or go to a reference", hidden: true })).toHaveValue("");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says which paper the reader is in, at the top", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Navigator", hidden: true });
    expect(within(dialog).getByRole("heading", { name: "The Universal Father" })).toBeInTheDocument();
    expect(within(dialog).getByText("Paper 1")).toBeInTheDocument();
  });

  it("closes with an icon control that has a name", () => {
    setup();
    const close = screen.getByRole("button", { name: "Close" });
    expect(close.querySelector("svg")).not.toBeNull();
    expect(close).toHaveTextContent("");
  });

  it("gives an example in the reference field", () => {
    setup();
    expect(screen.getByRole("textbox", { name: "Search, or go to a reference" })).toHaveAttribute("placeholder", "Search, or go to a reference");
  });

  it("has no tabs, no paper grid, and no theme control", () => {
    setup();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("button", { name: "99" })).toBeNull();
    expect(screen.queryByRole("button", { name: /theme/i })).toBeNull();
  });

  it("goes to the contents page for all papers", async () => {
    const { navigate } = setup();
    await userEvent.click(screen.getByRole("button", { name: "All papers" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/papers", true));
    expect(track).toHaveBeenCalledWith("navigator_used", { kind: "contents" });
  });

  it("goes to the previous and the next paper, and shows each number and full title", async () => {
    const { navigate } = setup();
    expect(screen.getByRole("button", { name: "Previous paper: Foreword" })).toHaveTextContent("Foreword");
    const next = screen.getByRole("button", { name: "Next paper: Paper 2, The Nature of God" });
    expect(next).toHaveTextContent("Paper 2");
    expect(next).toHaveTextContent("The Nature of God");
    await userEvent.click(next);
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/papers/paper-2-the-nature-of-god", true));
    expect(track).toHaveBeenCalledWith("navigator_used", { kind: "paper" });
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
