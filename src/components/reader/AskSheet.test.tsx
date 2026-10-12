import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { track } from "@/analytics";
import { PARAGRAPH_QUESTIONS } from "@/reader/assistant";
import AskSheet from "./AskSheet";

vi.mock("@/analytics", () => ({ track: vi.fn() }));

const build = (question: string) => `${question}\n\nTHE REST`;
const open = () => render(<AskSheet about="paragraph" label="About paragraph 1:1.3." paperId="1" questions={PARAGRAPH_QUESTIONS} build={build} onClose={() => {}} />);
const go = () => screen.getByRole("link", { name: /^Open in/ });

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(track).mockClear();
});

describe("the sheet to ask an assistant", () => {
  it("starts with the first question and with Claude, and the link holds the whole question", () => {
    open();
    expect(screen.getByRole("button", { name: PARAGRAPH_QUESTIONS[0] })).toHaveAttribute("aria-pressed", "true");
    expect(go()).toHaveAccessibleName("Open in Claude");
    expect(go()).toHaveAttribute("href", `https://claude.ai/new?q=${encodeURIComponent(build(PARAGRAPH_QUESTIONS[0]))}`);
    expect(go()).toHaveAttribute("target", "_blank");
    expect(go()).toHaveAttribute("rel", "noopener");
  });

  it("changes the link with the question and with the assistant", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: PARAGRAPH_QUESTIONS[2] }));
    await userEvent.click(screen.getByRole("button", { name: "ChatGPT" }));
    expect(go()).toHaveAttribute("href", `https://chatgpt.com/?q=${encodeURIComponent(build(PARAGRAPH_QUESTIONS[2]))}`);
  });

  it("uses the reader's own question when the field holds one, and the ready one when it is empty again", async () => {
    open();
    const field = screen.getByRole("textbox", { name: "Your own question" });
    await userEvent.type(field, "Why a name?");
    expect(go()).toHaveAttribute("href", `https://claude.ai/new?q=${encodeURIComponent(build("Why a name?"))}`);
    expect(screen.getByRole("button", { name: PARAGRAPH_QUESTIONS[0] })).toHaveAttribute("aria-pressed", "false");
    await userEvent.clear(field);
    expect(go()).toHaveAttribute("href", `https://claude.ai/new?q=${encodeURIComponent(build(PARAGRAPH_QUESTIONS[0]))}`);
  });

  it("remembers the assistant in this browser", async () => {
    const first = open();
    await userEvent.click(screen.getByRole("button", { name: "Grok" }));
    first.unmount();
    open();
    expect(go()).toHaveAccessibleName("Open in Grok");
  });

  it("shows what the assistant gets, when the reader asks", async () => {
    open();
    expect(screen.queryByTestId("ask-sent")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "See what the assistant gets" }));
    expect(screen.getByTestId("ask-sent")).toHaveTextContent("THE REST");
    await userEvent.click(screen.getByRole("button", { name: "Hide what the assistant gets" }));
    expect(screen.queryByTestId("ask-sent")).toBeNull();
  });

  it("copies the question, and says so", async () => {
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Copy the question" }));
    expect(await navigator.clipboard.readText()).toBe(build(PARAGRAPH_QUESTIONS[0]));
    expect(screen.getByRole("status")).toHaveTextContent("The question is copied.");
  });

  // Gemini reads no question from its address.
  it("for Gemini, copies the question and then opens Gemini", async () => {
    const user = userEvent.setup();
    const opened = vi.fn();
    vi.stubGlobal("open", opened);
    open();
    await user.click(screen.getByRole("button", { name: "Gemini" }));
    await user.click(screen.getByRole("button", { name: "Copy, then open Gemini" }));
    expect(await navigator.clipboard.readText()).toBe(build(PARAGRAPH_QUESTIONS[0]));
    expect(opened).toHaveBeenCalledWith("https://gemini.google.com/app", "_blank", "noopener");
    expect(screen.getByRole("status")).toHaveTextContent("The question is copied. Paste it in Gemini.");
  });

  it("says when the browser refused the copy", async () => {
    const user = userEvent.setup();
    open();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValueOnce(new Error("no"));
    await user.click(screen.getByRole("button", { name: "Copy the question" }));
    expect(screen.getByRole("status")).toHaveTextContent("The question did not copy.");
  });

  it("counts the use with labels only: never the words of the question", async () => {
    open();
    await userEvent.type(screen.getByRole("textbox", { name: "Your own question" }), "A private thought");
    await userEvent.click(go());
    expect(track).toHaveBeenCalledExactlyOnceWith("assistant_asked", { paper_id: "1", about: "paragraph", assistant: "claude", question: "own", method: "open" });
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain("private");
  });

  it("says who answers, and links to the guide for the connector", () => {
    open();
    expect(screen.getByText(/The answer comes from the assistant, not from UrantiaHub\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "How to connect it" })).toHaveAttribute("href", "https://docs.urantia.dev/assistants");
  });
});
