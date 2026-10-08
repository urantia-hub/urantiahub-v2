import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Term, TermsAnswer } from "@/server/terms";
import { TermsSheet } from "./TermsSheet";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

const term = (name: string, kind: string, more: Partial<Term> = {}): Term => ({
  id: name.toLowerCase().replace(/ /g, "-"),
  name,
  kind,
  description: `The meaning of ${name}.`,
  aliases: [],
  seeAlso: [],
  citations: 7,
  ...more,
});
const answer: TermsAnswer = {
  names: [term("Universal Father", "Being", { aliases: ["First Source and Center"], seeAlso: ["God", "I AM"], citations: 404 }), term("Paradise", "Place")],
  ideas: [term("personality", "Idea")],
};

let resolve: (value: Response) => void;
const fetchMock = vi.fn();
const sheet = () => screen.getByRole("dialog", { name: "Terms in 1:0.3" });

beforeEach(() => {
  track.mockClear();
  fetchMock.mockReset();
  fetchMock.mockImplementation(() => new Promise<Response>((r) => (resolve = r)));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const loaded = async (body: TermsAnswer = answer) => {
  resolve(Response.json(body));
  await waitFor(() => expect(within(sheet()).queryByRole("status")).toBeNull());
};

describe("TermsSheet", () => {
  it("opens at once with grey rows, and asks for the terms of its paragraph", () => {
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    expect(within(sheet()).getByRole("status", { name: "Loading the terms" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/terms/1%3A0.3");
  });

  it("shows the names, then the ideas, each with its kind", async () => {
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    await loaded();
    const names = within(sheet()).getByRole("list", { name: "Names" });
    const ideas = within(sheet()).getByRole("list", { name: "Ideas" });
    expect(within(names).getAllByRole("button").map((b) => b.textContent)).toEqual(["Universal FatherBeing", "ParadisePlace"]);
    expect(within(ideas).getAllByRole("button").map((b) => b.textContent)).toEqual(["personalityIdea"]);
    expect(track).toHaveBeenCalledWith("terms_opened", { paper_id: "1", names: "1-3", ideas: "1-5" });
  });

  it("opens an entry with no second request, and goes back to the list", async () => {
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    await loaded();
    await userEvent.click(within(sheet()).getByRole("button", { name: /Universal Father/ }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(within(sheet()).getByRole("heading", { name: "Universal Father" })).toBeInTheDocument();
    expect(sheet()).toHaveTextContent("The meaning of Universal Father.");
    expect(sheet()).toHaveTextContent("Also called: First Source and Center");
    expect(sheet()).toHaveTextContent("See also: God, I AM");
    expect(within(sheet()).getByRole("link", { name: /Each place in the Papers/ })).toHaveAttribute("href", "/search?q=Universal%20Father");
    expect(within(sheet()).getByRole("link", { name: /Each place in the Papers/ })).toHaveTextContent("404");
    expect(track).toHaveBeenCalledWith("term_opened", { kind: "Being", term: "universal-father" });
    await userEvent.click(within(sheet()).getByRole("button", { name: "Back to the terms" }));
    expect(within(sheet()).getByRole("list", { name: "Names" })).toBeInTheDocument();
  });

  it("leaves out the lines that an entry has nothing for", async () => {
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    await loaded();
    await userEvent.click(within(sheet()).getByRole("button", { name: /Paradise/ }));
    expect(sheet()).not.toHaveTextContent("Also called");
    expect(sheet()).not.toHaveTextContent("See also");
  });

  it("says so when the paragraph has no term, and shows no empty group", async () => {
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    await loaded({ names: [], ideas: [] });
    expect(sheet()).toHaveTextContent("No glossary term stands in this paragraph.");
    expect(within(sheet()).queryByRole("list")).toBeNull();
    expect(track).toHaveBeenCalledWith("terms_opened", { paper_id: "1", names: "0", ideas: "0" });
  });

  it("shows one group when the other is empty", async () => {
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    await loaded({ names: [], ideas: answer.ideas });
    expect(within(sheet()).queryByRole("list", { name: "Names" })).toBeNull();
    expect(within(sheet()).getByRole("list", { name: "Ideas" })).toBeInTheDocument();
  });

  // Review Focus 5.
  it("shows a message and a retry when the request fails, and the retry works", async () => {
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    resolve(Response.json({ error: "x" }, { status: 502 }));
    expect(await within(sheet()).findByText("The terms did not load.")).toBeInTheDocument();
    await userEvent.click(within(sheet()).getByRole("button", { name: "Try again" }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await loaded();
    expect(within(sheet()).getByRole("list", { name: "Names" })).toBeInTheDocument();
  });

  it("shows the same message when the network fails", async () => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    expect(await within(sheet()).findByText("The terms did not load.")).toBeInTheDocument();
  });

  // Review Focus 3.
  it("shows the terms of the last paragraph when the reader changes paragraph before the answer arrives", async () => {
    const first = { names: [term("Old Name", "Being")], ideas: [] };
    const resolvers: ((value: Response) => void)[] = [];
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => new Promise<Response>((r) => resolvers.push(r)));
    const view = render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    view.rerender(<TermsSheet reference="1:0.4" paperId="1" onClose={() => {}} />);
    resolvers[1](Response.json(answer));
    const next = await screen.findByRole("dialog", { name: "Terms in 1:0.4" });
    await waitFor(() => expect(within(next).getByRole("list", { name: "Names" })).toBeInTheDocument());
    resolvers[0](Response.json(first));
    await new Promise((r) => setTimeout(r, 20));
    expect(next).not.toHaveTextContent("Old Name");
    expect(next).toHaveTextContent("Universal Father");
  });

  it("closes with the X and with Escape", async () => {
    const onClose = vi.fn();
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={onClose} />);
    await userEvent.click(within(sheet()).getByRole("button", { name: "Close the terms" }));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("takes the focus when it opens, so a keyboard reader is in it", () => {
    render(<TermsSheet reference="1:0.3" paperId="1" onClose={() => {}} />);
    expect(sheet()).toHaveFocus();
  });
});
