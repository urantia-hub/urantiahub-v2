import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShareSheet from "./ShareSheet";

vi.mock("@/analytics", () => ({ track: vi.fn() }));

const TEXT = "One is here. Two is here. Three is here. Four is here.";
const url = () => screen.getByTestId("share-url").textContent;

function open(text = TEXT) {
  const onCopied = vi.fn();
  const onImage = vi.fn();
  render(<ShareSheet reference="2:5.10" paperTitle="The Nature of God" text={text} onClose={() => {}} onCopied={onCopied} onImage={onImage} />);
  return { onCopied, onImage };
}

afterEach(() => vi.unstubAllGlobals());

describe("the share sheet", () => {
  it("starts with the whole paragraph", () => {
    open();
    expect(url()).toBe("localhost:3000/s/2.5.10");
    expect(screen.getByText("The whole paragraph")).toBeInTheDocument();
    expect(screen.getByText("2:5.10 · The Nature of God")).toBeInTheDocument();
  });

  it("names the chosen sentences in the link, and shows a gap in the card", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "One is here." }));
    await userEvent.click(screen.getByRole("button", { name: "Three is here." }));
    await userEvent.click(screen.getByRole("button", { name: "Four is here." }));
    expect(url()).toBe("localhost:3000/s/2.5.10/1.3-4");
    expect(screen.getByText("3 of 4 sentences")).toBeInTheDocument();
    expect(screen.getByText("“One is here. … Three is here. Four is here.”")).toBeInTheDocument();
  });

  it("returns to the whole paragraph", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Two is here." }));
    await userEvent.click(screen.getByRole("button", { name: "Whole paragraph" }));
    expect(url()).toBe("localhost:3000/s/2.5.10");
  });

  it("copies the link of the choice", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { onCopied } = open();
    await userEvent.click(screen.getByRole("button", { name: "Two is here." }));
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(writeText).toHaveBeenCalledWith("http://localhost:3000/s/2.5.10/2");
    expect(onCopied).toHaveBeenCalled();
  });

  it("says so when the browser refuses the clipboard", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("no")) }, configurable: true });
    const { onCopied } = open();
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(await screen.findByText(/The link did not copy/)).toBeInTheDocument();
    expect(onCopied).not.toHaveBeenCalled();
  });

  it("gives the image maker the chosen sentences", async () => {
    const { onImage } = open();
    await userEvent.click(screen.getByRole("button", { name: "Two is here." }));
    await userEvent.click(screen.getByRole("button", { name: "Make an image of these words" }));
    expect(onImage).toHaveBeenCalledWith(new Set([1]));
  });

  it("shows a long sentence as its clauses, and marks a cut inside it", async () => {
    // Recorded API text (works.read, Shu King, Legge 1879).
    open("The duke said, 'Prince Shih, I have heard that aforetime, when Thang the Successful had received the appointment (to the throne), he had with him Î Yin, making (his virtue) like that of great Heaven; that Thâi Kiâ had (the same Î Yin), the Pâo-hăng; that Thâi-wû had Î Kih and Khăn Hû, through whom (his virtue) was made to affect God, and Wû Hsien who regulated the royal House; that Zû-yî had Wû Hsien's son; and that Wû-ting had Kan Phan. Heaven thus determinately maintained its favouring appointment, and Shang was replenished with men.");
    await userEvent.click(screen.getByRole("button", { name: "that Thâi Kiâ had (the same Î Yin), the Pâo-hăng;" }));
    expect(url()).toBe("localhost:3000/s/2.5.10/p2");
    expect(screen.getByText("1 of 4 parts")).toBeInTheDocument();
    expect(screen.getByText(/^Press each part that you want\./)).toBeInTheDocument();
    expect(screen.getByText("“…that Thâi Kiâ had (the same Î Yin), the Pâo-hăng…”")).toBeInTheDocument();
  });

  it("has no sentences to press for a paragraph of one sentence", () => {
    open("One is here.");
    expect(screen.queryByRole("button", { name: "One is here." })).toBeNull();
    expect(url()).toBe("localhost:3000/s/2.5.10");
  });
});
