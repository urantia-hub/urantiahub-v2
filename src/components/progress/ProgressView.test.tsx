import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PAPERS } from "@/content/paper-index";

const state = vi.hoisted(() => ({ account: { status: "out" as string, user: null as null | { key: string } }, answer: null as unknown }));
vi.mock("@/account/client", () => ({
  accountState: () => state.account,
  serverAccountState: () => state.account,
  subscribeToAccount: () => () => {},
  signInHref: () => "/api/auth/start?to=x",
}));
vi.mock("@/account/reader-call", () => ({ readerCall: vi.fn(async () => state.answer) }));
vi.mock("@/reader/last-read", () => ({ readLastRead: () => null, subscribeToLastRead: () => () => {} }));

import { ProgressView } from "./ProgressView";

afterEach(() => {
  state.account = { status: "out", user: null };
  state.answer = null;
});

describe("the Progress page", () => {
  it("asks a reader with no account to sign in, and shows no numbers", () => {
    render(<ProgressView />);
    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText(/paragraphs$/)).toBeNull();
  });

  it("shows the share of the whole text, the three counts, the open papers, and each part", async () => {
    state.account = { status: "in", user: { key: "k" } };
    state.answer = { read: ["1"], counts: { "1": PAPERS[1].paragraphs, "2": 10 } };
    render(<ProgressView />);
    const total = PAPERS.reduce((n, paper) => n + paper.paragraphs, 0);
    expect(await screen.findByText(`${PAPERS[1].paragraphs + 10} of ${total.toLocaleString("en-US")} paragraphs`)).toBeInTheDocument();
    expect(screen.getByText("paper finished").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("in progress").previousSibling).toHaveTextContent("1");
    expect(screen.getByText("not started").previousSibling).toHaveTextContent("195");
    const next = screen.getByRole("region", { name: "Continue" });
    expect(within(next).getByRole("link", { name: new RegExp(PAPERS[2].title) })).toHaveAttribute("href", `/papers/${PAPERS[2].slug}`);
    expect(within(screen.getByRole("region", { name: "By part" })).getByText("Part IV")).toBeInTheDocument();
  });

  it("tells a reader who read nothing how the count starts", async () => {
    state.account = { status: "in", user: { key: "k" } };
    state.answer = { read: [], counts: {} };
    render(<ProgressView />);
    expect(await screen.findByText("Nothing yet")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Continue" })).toBeNull();
  });

  it("says so when the progress did not load, and offers another try", async () => {
    state.account = { status: "in", user: { key: "k" } };
    state.answer = null;
    render(<ProgressView />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Your progress did not load.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
