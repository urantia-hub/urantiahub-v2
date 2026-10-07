import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReferenceLink } from "./ReferenceLink";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

describe("ReferenceLink", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    track.mockClear();
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    window.history.replaceState(null, "", "/papers/paper-1-the-universal-father?x=1");
  });

  it("is a link to the paragraph", () => {
    render(<ReferenceLink reference="1:0.1" />);
    expect(screen.getByRole("link", { name: "1:0.1" })).toHaveAttribute("href", "#1:0.1");
  });

  it("copies the full link without the query string, and reports the event with the reference only", async () => {
    render(<ReferenceLink reference="1:0.1" />);
    await userEvent.click(screen.getByRole("link", { name: "1:0.1" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/papers/paper-1-the-universal-father#1:0.1`);
    expect(track).toHaveBeenCalledWith("reference_link_copied", { ref: "1:0.1" });
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
  });

  it("still works as a link when the clipboard is not available", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<ReferenceLink reference="1:0.1" />);
    await userEvent.click(screen.getByRole("link", { name: "1:0.1" }));
    expect(screen.queryByText("Link copied")).toBeNull();
  });
});
