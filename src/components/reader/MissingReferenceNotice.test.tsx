import { render, screen } from "@testing-library/react";
import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MissingReferenceNotice } from "./MissingReferenceNotice";

function setup(hash: string, existingId?: string) {
  document.body.innerHTML = existingId ? `<p id="${existingId}"></p>` : "";
  window.history.replaceState(null, "", `/papers/paper-1-the-universal-father${hash}`);
  return render(<MissingReferenceNotice paperId="1" />);
}

const scrollTo = vi.fn();

beforeEach(() => {
  scrollTo.mockClear();
  vi.stubGlobal("scrollTo", scrollTo);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("MissingReferenceNotice", () => {
  it("shows nothing with no fragment", () => {
    setup("");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows nothing when the paragraph exists", () => {
    setup("#1:0.1", "1:0.1");
    expect(screen.queryByRole("status")).toBeNull();
  });

  // Review Focus 5.
  it("shows a notice when the paragraph does not exist", () => {
    setup("#1:99.9");
    expect(screen.getByRole("status")).toHaveTextContent("Reference 1:99.9 is not in this paper.");
  });

  // Review Focus 2: a messaging app encoded the fragment.
  it("decodes a percent-encoded fragment", () => {
    setup("#1%3A0.1", "1:0.1");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows no notice for section 0, which exists in each paper but has no heading", () => {
    setup("#1:0");
    expect(screen.queryByRole("status")).toBeNull();
  });

  // Review Focus 5, inside the current paper: the notice is at the top, so the page must go there.
  it("goes to the top of the paper when a reader in the middle of it asks for a missing paragraph", () => {
    setup("#1:0.1", "1:0.1");
    expect(scrollTo).not.toHaveBeenCalled();
    act(() => {
      window.history.replaceState(null, "", "/papers/paper-1-the-universal-father#1:99.9");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Reference 1:99.9 is not in this paper.");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("ignores a fragment that is not a reference", () => {
    setup("#paper-top");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
