import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeAudio } from "../../../test/fake-audio";
import type { Track } from "@/audio/tracks";
import { markSignedOut, resetAccountForTest, startAccount } from "@/account/client";
import { loadSaved, resetSavedForTest } from "@/account/saved";
import { resetSyncForTest } from "@/account/sync";
import { ReadingNav } from "./ReadingNav";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

const TRACKS: Track[] = [
  { ref: "1:0.1", url: "https://cdn.urantia.dev/a.mp3", duration: 10 },
  { ref: "1:0.2", url: "https://cdn.urantia.dev/b.mp3", duration: 20 },
  { ref: "1:1.1", url: "https://cdn.urantia.dev/c.mp3", duration: 30 },
];

function tree(tracks: Track[] | null, mode: "visible" | "hidden" = "visible") {
  return (
    <Activity mode={mode}>
      <article className="paper">
        <h1 id="paper-top">The Universal Father</h1>
        {TRACKS.map((t) => (
          <p className="para" id={t.ref} key={t.ref}>
            <a className="ref" href={`#${t.ref}`}>
              {t.ref}
            </a>
            <span>Text of {t.ref}</span>
          </p>
        ))}
      </article>
      <ReadingNav
        paper={{ id: "1", title: "The Universal Father" }}
        sections={[
          { id: "0", title: null },
          { id: "1", title: "The Father’s Name" },
        ]}
        previous={{ id: "0", title: "Foreword", href: "/papers/foreword" }}
        next={{ id: "2", title: "2 · The Nature of God", href: "/papers/paper-2-the-nature-of-god" }}
        tracks={tracks}
      />
    </Activity>
  );
}

function renderNav(tracks: Track[] | null = TRACKS) {
  return render(tree(tracks));
}

const para = (ref: string) => document.getElementById(ref)!;
const text = (ref: string) => screen.getByText(`Text of ${ref}`);
// Each engine makes two elements: the one that plays, then the one that loads ahead.
const audio = () => FakeAudio.made[FakeAudio.made.length - 2];
const round = () => screen.getByTestId("round-button");
const job = () => screen.getByTestId("reading-bar").dataset.job;
async function openTerms() {
  await userEvent.click(screen.getByRole("button", { name: "More" }));
  await userEvent.click(screen.getByRole("button", { name: "Terms in this paragraph" }));
}
async function sound(type: string) {
  await act(async () => audio().emit(type));
}
// Moves the page to y and lets the scroll handler run on the next frame.
async function scrollTo(y: number) {
  await act(async () => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
  });
}

beforeEach(() => {
  track.mockClear();
  FakeAudio.reset();
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("scrollTo", vi.fn());
  window.history.replaceState(null, "", "/papers/paper-1-the-universal-father");
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  Object.defineProperty(document.documentElement, "scrollHeight", { value: 5000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the reading job", () => {
  it("reports that the paper opened, with the paper id only", () => {
    renderNav();
    expect(track).toHaveBeenCalledWith("paper_opened", { paper_id: "1" });
  });

  it("shows the paper, both paper arrows, and a round button named Listen", () => {
    renderNav();
    expect(job()).toBe("reading");
    expect(screen.getByTestId("reading-bar-label")).toHaveTextContent("The Universal Father");
    expect(screen.getByRole("link", { name: "Previous: Foreword" })).toHaveAttribute("href", "/papers/foreword");
    expect(screen.getByRole("link", { name: "Next: 2 · The Nature of God" })).toHaveAttribute("href", "/papers/paper-2-the-nature-of-god");
    expect(round()).toHaveAccessibleName("Listen");
  });

  it("has an accessible name on the center that contains the words on it", () => {
    renderNav();
    expect(screen.getByRole("button", { name: /Open the navigator/ })).toHaveAccessibleName(
      "Paper 1 The Universal Father. Open the navigator",
    );
  });

  it("has no round button when the paper has no audio", () => {
    renderNav(null);
    expect(screen.queryByTestId("round-button")).toBeNull();
    expect(job()).toBe("reading");
  });

  it("leaves on a scroll down and returns on a scroll up", async () => {
    renderNav();
    const dock = screen.getByTestId("reading-bar");
    await scrollTo(300);
    expect(dock).toHaveClass("away");
    await scrollTo(240);
    expect(dock).not.toHaveClass("away");
  });

  it("hides the paper arrows after the reader scrolls into the paper", async () => {
    renderNav();
    const dock = screen.getByTestId("reading-bar");
    expect(dock).not.toHaveClass("deep");
    await scrollTo(400);
    expect(dock).toHaveClass("deep");
    await scrollTo(0);
    expect(dock).not.toHaveClass("deep");
  });

  it("shows the reading position", async () => {
    const { container } = renderNav();
    await scrollTo(2100);
    expect(container.querySelector<HTMLElement>(".fill")!.style.width).toBe("50%");
  });
});

describe("the top bar", () => {
  // The header of the page leaves and returns with the bottom controls. CSS reads these marks.
  it("tells the page when the bars are away, and when the page is not at its top", async () => {
    const view = renderNav();
    const root = document.documentElement;
    expect(root.dataset.bars).toBe("shown");
    await scrollTo(300);
    expect(root.dataset.bars).toBe("away");
    expect(root.dataset.scrolled).toBe("");
    await scrollTo(240);
    expect(root.dataset.bars).toBe("shown");
    await scrollTo(0);
    expect(root.dataset.scrolled).toBeUndefined();
    view.unmount();
    expect(root.dataset.bars).toBeUndefined();
  });
});

describe("the place the reader left", () => {
  it("is kept in this browser as the paper and the section in view", async () => {
    window.localStorage.clear();
    renderNav();
    await scrollTo(100);
    expect(JSON.parse(window.localStorage.getItem("hub:last-read")!)).toMatchObject({ paperId: "1", sectionId: "0", label: null });
  });
});

describe("a tap on a paragraph", () => {
  it("marks the paragraph and shows its actions", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    expect(para("1:0.2")).toHaveAttribute("data-picked");
    expect(job()).toBe("paragraph");
    expect(screen.getByTestId("picked-ref")).toHaveTextContent("1:0.2");
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(round()).toHaveAccessibleName("Listen from 1:0.2");
    expect(track).toHaveBeenCalledWith("paragraph_picked", { paper_id: "1" });
  });

  it("removes the mark on a second tap, and on the close control", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(text("1:0.2"));
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
    expect(job()).toBe("reading");
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
  });

  it("moves the mark to another paragraph, so only one is marked", async () => {
    renderNav();
    await userEvent.click(text("1:0.1"));
    await userEvent.click(text("1:0.2"));
    expect(document.querySelectorAll("[data-picked]")).toHaveLength(1);
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  // Review Focus 4.
  it("marks nothing when words are selected", async () => {
    renderNav();
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "Text of" } as Selection);
    await userEvent.click(text("1:0.2"));
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
    expect(job()).toBe("reading");
  });

  it("treats a click on the reference as a tap, and does not follow the link", async () => {
    renderNav();
    await userEvent.click(screen.getByRole("link", { name: "1:0.2" }));
    expect(para("1:0.2")).toHaveAttribute("data-picked");
    expect(window.location.hash).toBe("");
  });

  it("removes the mark on Escape", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.keyboard("{Escape}");
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
  });

  // Review Focus 3: a reader who arrives by a link to a paragraph.
  it("marks the paragraph that the address names, and takes the mark over from CSS", () => {
    window.history.replaceState(null, "", "/papers/paper-1-the-universal-father#1%3A0.2");
    renderNav();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
    expect(document.documentElement).toHaveAttribute("data-reader");
    expect(round()).toHaveAccessibleName("Listen from 1:0.2");
  });
});

describe("Share", () => {
  it("copies the paragraph link where there is no share sheet, and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/papers/paper-1-the-universal-father#1:0.2`);
    expect(await screen.findByText("Link copied")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("paragraph_shared", { ref: "1:0.2", method: "copy" });
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
  });

  it("gives the share sheet the link and a title with the reference and the paper", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith({
      title: "1:0.2 · Paper 1, The Universal Father",
      url: `${window.location.origin}/papers/paper-1-the-universal-father#1:0.2`,
    });
    await act(async () => {});
    expect(track).toHaveBeenCalledWith("paragraph_shared", { ref: "1:0.2", method: "sheet" });
    expect(screen.queryByText("Link copied")).toBeNull();
  });
});

describe("the voice", () => {
  it("starts at the first paragraph in view, and reports where it started from", async () => {
    renderNav();
    await userEvent.click(round());
    expect(audio().src).toBe(TRACKS[0].url);
    expect(track).toHaveBeenCalledWith("audio_started", { paper_id: "1", from: "bar" });
    expect(job()).toBe("listening");
    expect(round()).toHaveAccessibleName("Pause");
  });

  // A slow connection: the reader must see that the press worked.
  it("shows a loading ring on the round button until the sound starts, and again when it stalls", async () => {
    renderNav();
    expect(round()).not.toHaveClass("loading");
    await userEvent.click(round());
    expect(round()).toHaveClass("loading");
    await sound("playing");
    expect(round()).not.toHaveClass("loading");
    await sound("waiting");
    expect(round()).toHaveClass("loading");
  });

  it("starts at the marked paragraph, and removes the mark", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(round());
    expect(audio().src).toBe(TRACKS[1].url);
    expect(track).toHaveBeenCalledWith("audio_started", { paper_id: "1", from: "paragraph" });
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
  });

  it("marks the paragraph that plays in green, and shows its reference and the time", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    expect(para("1:0.1")).toHaveAttribute("data-voice");
    expect(screen.getByTestId("voice-ref")).toHaveTextContent("1:0.1");
    audio().currentTime = 4;
    await sound("timeupdate");
    expect(screen.getByTestId("voice-time")).toHaveTextContent("0:04 / 0:10");
  });

  it("moves the green mark when a paragraph ends", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    await sound("ended");
    await sound("playing");
    expect(para("1:0.1")).not.toHaveAttribute("data-voice");
    expect(para("1:0.2")).toHaveAttribute("data-voice");
  });

  // The line sits beside "0:05 / 0:20", so it shows the same thing: the progress through this paragraph.
  it("shows the progress through the paragraph that plays as the green line", async () => {
    const { container } = renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(round());
    await sound("playing");
    audio().currentTime = 10;
    await sound("timeupdate");
    const fill = container.querySelector<HTMLElement>(".fill")!;
    expect(fill).toHaveClass("voice");
    expect(fill.style.width).toBe("50%");
  });

  it("removes the green mark on pause, holds the place, and resumes there", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(round());
    await sound("playing");
    audio().currentTime = 7;
    await sound("timeupdate");

    await userEvent.click(round());
    expect(para("1:0.2")).not.toHaveAttribute("data-voice");
    expect(job()).toBe("reading");
    expect(round()).toHaveAccessibleName("Listen");

    await userEvent.click(round());
    expect(audio().src).toBe(TRACKS[1].url);
    expect(audio().currentTime).toBe(7);
    await sound("playing");
    expect(para("1:0.2")).toHaveAttribute("data-voice");
  });

  // Found in the browser tests: the page scrolls down to follow the voice, so a pause hid the controls.
  it("keeps the controls in view after a pause, and after the mark is closed", async () => {
    renderNav();
    const dock = screen.getByTestId("reading-bar");
    await userEvent.click(round());
    await sound("playing");
    await scrollTo(300);
    await userEvent.click(round());
    expect(job()).toBe("reading");
    expect(dock).not.toHaveClass("away");

    await userEvent.click(text("1:0.2"));
    await scrollTo(600);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(dock).not.toHaveClass("away");
  });

  it("moves between paragraphs and changes the speed from the player", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    await userEvent.click(screen.getByRole("button", { name: "Next paragraph" }));
    expect(audio().src).toBe(TRACKS[1].url);
    await userEvent.click(screen.getByRole("button", { name: "Previous paragraph" }));
    expect(audio().src).toBe(TRACKS[0].url);
    await userEvent.click(screen.getByRole("button", { name: "Speed 1×" }));
    expect(screen.getByRole("button", { name: "Speed 1.25×" })).toBeInTheDocument();
    expect(audio().playbackRate).toBe(1.25);
  });

  it("while it plays: a tap on another paragraph shows its actions, and the round button moves the voice there", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    await userEvent.click(text("1:1.1"));
    expect(job()).toBe("paragraph");
    expect(para("1:0.1")).toHaveAttribute("data-voice");
    expect(round()).toHaveAccessibleName("Listen from 1:1.1");
    await userEvent.click(round());
    expect(audio().src).toBe(TRACKS[2].url);
    expect(para("1:1.1")).not.toHaveAttribute("data-picked");
  });

  it("while it plays: a tap on the paragraph that plays shows the player and drops any other mark", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    await userEvent.click(text("1:1.1"));
    await userEvent.click(text("1:0.1"));
    expect(job()).toBe("listening");
    expect(document.querySelectorAll("[data-picked]")).toHaveLength(0);
  });

  it("removes the mark when the voice reaches the marked paragraph", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    await userEvent.click(text("1:0.2"));
    await sound("ended");
    await sound("playing");
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
    expect(para("1:0.2")).toHaveAttribute("data-voice");
    expect(job()).toBe("listening");
  });

  it("stops at the end of the paper, and reports it with the speed", async () => {
    renderNav();
    await userEvent.click(text("1:1.1"));
    await userEvent.click(round());
    await sound("playing");
    await sound("ended");
    expect(job()).toBe("reading");
    expect(document.querySelectorAll("[data-voice]")).toHaveLength(0);
    expect(track).toHaveBeenCalledWith("audio_finished_paper", { paper_id: "1", speed: 1 });
  });

  // Review Focus 5.
  it("shows a message and a retry when a file does not load", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("error");
    expect(screen.getByText("The audio did not load")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith("audio_failed", { paper_id: "1" });
    const calls = audio().playCalls;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(audio().playCalls).toBe(calls + 1);
    expect(audio().src).toBe(TRACKS[0].url);
  });

  // Review Focus 2.
  it("stays in the reading job, with no message, when the browser refuses to start", async () => {
    renderNav();
    audio().rejectWith = { name: "NotAllowedError" };
    await userEvent.click(round());
    await act(async () => {});
    expect(job()).toBe("reading");
    expect(screen.queryByText("The audio did not load")).toBeNull();
  });

  it("uses Space for play and pause when no control has the focus", async () => {
    renderNav();
    await userEvent.keyboard(" ");
    expect(audio().src).toBe(TRACKS[0].url);
    await sound("playing");
    await userEvent.keyboard(" ");
    expect(job()).toBe("reading");
  });

  it("leaves Space alone when a control has the focus", async () => {
    renderNav();
    screen.getByRole("link", { name: "Previous: Foreword" }).focus();
    await userEvent.keyboard(" ");
    expect(audio().src).toBe("");
  });
});

describe("follow", () => {
  const visible = (ref: string, yes: boolean) =>
    vi.spyOn(para(ref), "getBoundingClientRect").mockReturnValue({ top: yes ? 200 : 4000, bottom: yes ? 400 : 4200 } as DOMRect);

  it("brings the paragraph that plays into view", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("stops following after a scroll by the reader, and offers the way back only when the voice is out of view", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 5000);

    visible("1:0.1", true);
    await scrollTo(600);
    expect(screen.queryByRole("button", { name: "Back to the voice" })).toBeNull();

    visible("1:0.1", false);
    await scrollTo(1400);
    const back = screen.getByRole("button", { name: "Back to the voice" });
    vi.mocked(window.scrollTo).mockClear();
    await userEvent.click(back);
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Back to the voice" })).toBeNull();
  });

  it("does not move the page for the next paragraph after the reader scrolled away", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 5000);
    visible("1:0.1", false);
    await scrollTo(1400);
    vi.mocked(window.scrollTo).mockClear();
    await sound("ended");
    await sound("playing");
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("follows again by itself when the reader can see the paragraph that ends", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 5000);
    visible("1:0.1", true);
    await scrollTo(600);
    vi.mocked(window.scrollTo).mockClear();
    await sound("ended");
    await sound("playing");
    expect(window.scrollTo).toHaveBeenCalledTimes(1);
  });
});

describe("faults that the branch review found", () => {
  // Next.js keeps the last pages alive, hidden, for Back and Forward. Effects stop, state stays.
  it("has a round button that works after the page was hidden and shown again", async () => {
    const view = renderNav();
    await userEvent.click(round());
    await sound("playing");
    await userEvent.click(round());
    view.rerender(tree(TRACKS, "hidden"));
    view.rerender(tree(TRACKS, "visible"));
    expect(round()).toHaveAccessibleName("Listen");
    await userEvent.click(round());
    expect(audio().playCalls).toBe(1);
    expect(job()).toBe("listening");
  });

  it("does not show a player with no sound after the page was hidden while the voice played", async () => {
    const view = renderNav();
    await userEvent.click(round());
    await sound("playing");
    view.rerender(tree(TRACKS, "hidden"));
    view.rerender(tree(TRACKS, "visible"));
    expect(job()).toBe("reading");
    expect(document.querySelectorAll("[data-voice]")).toHaveLength(0);
  });

  // Review Focus 4: a double-click selects a word. The first click of the two has no selection yet.
  it("marks nothing for a double-click that selects a word", () => {
    renderNav();
    fireEvent.click(text("1:0.2"), { detail: 1 });
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "Text" } as Selection);
    fireEvent.click(text("1:0.2"), { detail: 2 });
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
    expect(job()).toBe("reading");
  });

  it("keeps an existing mark through a double-click that selects a word", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    fireEvent.click(text("1:0.2"), { detail: 1 });
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "Text" } as Selection);
    fireEvent.click(text("1:0.2"), { detail: 2 });
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  it("keeps the controls in view after Share", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    renderNav();
    await userEvent.click(text("1:0.2"));
    await scrollTo(600);
    // Safari does not focus a button on a click, so the focus handler cannot bring the controls back.
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Share" })));
    expect(job()).toBe("reading");
    expect(screen.getByTestId("reading-bar")).not.toHaveClass("away");
  });

  it("starts or resumes the voice from the lock screen, in every state", async () => {
    const handlers = new Map<string, (() => void) | null>();
    Object.defineProperty(navigator, "mediaSession", {
      value: { metadata: null, setActionHandler: (name: string, fn: (() => void) | null) => handlers.set(name, fn) },
      configurable: true,
    });
    renderNav();
    await act(async () => handlers.get("play")!());
    expect(audio().src).toBe(TRACKS[0].url);
    await sound("playing");
    await act(async () => handlers.get("play")!());
    expect(job()).toBe("listening");
    await act(async () => handlers.get("pause")!());
    expect(job()).toBe("reading");
    await act(async () => handlers.get("play")!());
    expect(job()).toBe("listening");
    Reflect.deleteProperty(navigator, "mediaSession");
  });
});

describe("small faults from the two reviews", () => {
  it("lets a click with Cmd or Ctrl on a reference open the link, and marks nothing", () => {
    renderNav();
    const link = screen.getByRole("link", { name: "1:0.2" });
    // The dock listens on the article. This listener runs after it, reads the result, and then stops
    // the test browser from following the link, which would change the address for the next test.
    const seen: boolean[] = [];
    const after = (event: Event) => {
      seen.push(event.defaultPrevented);
      event.preventDefault();
    };
    window.addEventListener("click", after);
    for (const key of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }]) {
      act(() => void link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: 1, ...key })));
    }
    window.removeEventListener("click", after);
    expect(seen).toEqual([false, false, false]);
    expect(para("1:0.2")).not.toHaveAttribute("data-picked");
  });

  it("ignores a held Space key, and Space with Shift", async () => {
    renderNav();
    act(() => void document.body.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true, repeat: true })));
    const shifted = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true, shiftKey: true });
    act(() => void document.body.dispatchEvent(shifted));
    expect(audio().src).toBe("");
    expect(shifted.defaultPrevented).toBe(false);
  });

  it("keeps the keyboard focus in the controls after Close", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    screen.getByRole("button", { name: "Close" }).focus();
    await userEvent.keyboard("{Enter}");
    await act(async () => {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    });
    expect(document.activeElement).toBe(round());
  });

  it("keeps the keyboard focus in the controls after Try again", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("error");
    screen.getByRole("button", { name: "Try again" }).focus();
    await userEvent.keyboard("{Enter}");
    await act(async () => {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    });
    expect(document.activeElement).toBe(round());
  });

  it("holds the paragraph when the browser refuses to start, so the next press starts it", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    audio().rejectWith = { name: "NotAllowedError" };
    await userEvent.click(round());
    await act(async () => {});
    expect(job()).toBe("reading");
    audio().rejectWith = null;
    await userEvent.click(round());
    expect(audio().src).toBe(TRACKS[1].url);
    expect(job()).toBe("listening");
  });
});

describe("the terms, from More", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  });

  it("opens the terms of the marked paragraph, and keeps the paragraph marked", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await openTerms();
    expect(screen.getByRole("dialog", { name: "Terms in 1:0.2" })).toBeInTheDocument();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  it("closes the terms when the reader removes the mark, and on Escape the terms close first", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await openTerms();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: /Terms in/ })).toBeNull();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
    await openTerms();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: /Terms in/ })).toBeNull();
  });

  // The voice clears the mark of a paragraph when it reaches it. A reader who reads an entry must keep it.
  it("keeps the terms open when the voice reaches the marked paragraph", async () => {
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    await userEvent.click(text("1:0.2"));
    await openTerms();
    await sound("ended");
    await sound("playing");
    expect(screen.getByRole("dialog", { name: "Terms in 1:0.2" })).toBeInTheDocument();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  it("gives the focus back to the More tile when the terms close", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await openTerms();
    await userEvent.click(screen.getByRole("button", { name: "Close the terms" }));
    await act(async () => {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    });
    expect(screen.getByRole("button", { name: "More" })).toHaveFocus();
  });

  it("follows the mark to another paragraph", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await openTerms();
    await userEvent.click(text("1:1.1"));
    expect(screen.getByRole("dialog", { name: "Terms in 1:1.1" })).toBeInTheDocument();
  });
});

describe("More", () => {
  it("holds the terms and the copy of the text, and Escape closes it before the mark goes", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    const more = screen.getByRole("dialog", { name: "More" });
    expect(more).toHaveTextContent("Terms in this paragraph");
    expect(more).toHaveTextContent("Copy the text");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "More" })).toBeNull();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  it("opens the parallels of the marked paragraph, in the place of the terms", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.click(screen.getByRole("button", { name: "Parallels" }));
    expect(await screen.findByRole("dialog", { name: "Parallels for 1:0.2" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "More" })).toBeNull();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
    // The terms take the place of the parallels, and the mark stays.
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    expect(screen.queryByRole("dialog", { name: /Parallels for/ })).toBeNull();
    await openTerms();
    expect(screen.getByRole("dialog", { name: "Terms in 1:0.2" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /Parallels for/ })).toBeNull();
  });

  it("keeps the parallels open when the reader presses Space in the list", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.click(screen.getByRole("button", { name: "Parallels" }));
    const list = await screen.findByRole("dialog", { name: "Parallels for 1:0.2" });
    list.focus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("dialog", { name: "Parallels for 1:0.2" })).toBeInTheDocument();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
    expect(job()).toBe("paragraph");
  });

  it("closes the parallels when the question to sign in opens, so that one Escape closes one thing", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    resetAccountForTest(true);
    await act(async () => startAccount());
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.click(screen.getByRole("button", { name: "Parallels" }));
    await screen.findByRole("dialog", { name: "Parallels for 1:0.2" });
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("dialog", { name: "Sign in to save this" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /Parallels for/ })).toBeNull();
    resetAccountForTest(false);
  });

  it("keeps the parallels open when the voice reaches the marked paragraph", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    renderNav();
    await userEvent.click(round());
    await sound("playing");
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.click(screen.getByRole("button", { name: "Parallels" }));
    await screen.findByRole("dialog", { name: "Parallels for 1:0.2" });
    await sound("ended");
    await sound("playing");
    expect(screen.getByRole("dialog", { name: "Parallels for 1:0.2" })).toBeInTheDocument();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  it("copies the text of the paragraph with its reference", async () => {
    const writeText = vi.fn(async () => {});
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderNav();
    await act(async () => fireEvent.click(text("1:0.2")));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "More" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Copy the text" })));
    expect(writeText).toHaveBeenCalledWith("Text of 1:0.2 (1:0.2)");
    expect(await screen.findByText("Text copied")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "More" })).toBeNull();
  });
});

describe("Save", () => {
  const clearCookies = () => {
    for (const part of document.cookie.split(";")) document.cookie = `${part.split("=")[0].trim()}=; max-age=0; path=/`;
  };
  beforeEach(() => {
    clearCookies();
    resetSyncForTest();
    resetSavedForTest();
  });
  afterEach(() => {
    resetAccountForTest(false);
    clearCookies();
  });

  async function signedIn(write: () => Response) {
    document.cookie = "hub_in=1; path=/";
    resetAccountForTest(true);
    const fetch = vi.fn(async (url: string) =>
      url === "/api/auth/session" ? Response.json({ user: { name: "Ana", email: null, key: "k1" } }) : url.startsWith("/api/me/saved") ? Response.json({ bookmarks: ["1:1.1"], notes: [] }) : write(),
    );
    vi.stubGlobal("fetch", fetch);
    await act(async () => {
      await startAccount();
      await loadSaved("1");
    });
    return fetch;
  }

  it("is not in the row while the site has no sign-in", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("asks a reader with no account to sign in, and saves nothing", async () => {
    resetAccountForTest(true);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await act(async () => startAccount());
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const ask = screen.getByRole("dialog", { name: "Sign in to save this" });
    expect(ask).toHaveTextContent("Your saved paragraphs and notes stay with your account.");
    // The sign-in returns to this paragraph.
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", `/api/auth/start?next=${encodeURIComponent("/papers/paper-1-the-universal-father#1:0.2")}`);
    expect(fetch).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  it("saves the marked paragraph, and says Saved", async () => {
    const fetch = await signedIn(() => Response.json({ ok: true }));
    renderNav();
    await userEvent.click(text("1:0.2"));
    const tile = screen.getByRole("button", { name: "Save" });
    expect(tile).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(tile);
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    expect(fetch).toHaveBeenCalledWith("/api/me/bookmarks", expect.objectContaining({ method: "POST", body: JSON.stringify({ ref: "1:0.2" }) }));
    // The count for us holds the paper, and no reference.
    expect(track).toHaveBeenCalledWith("bookmark_added", { paper_id: "1" });
  });

  it("shows Saved for a paragraph that the account holds, and a press removes it", async () => {
    const fetch = await signedIn(() => Response.json({ ok: true }));
    renderNav();
    await userEvent.click(text("1:1.1"));
    await userEvent.click(screen.getByRole("button", { name: "Saved" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/me/bookmarks?ref=1%3A1.1", expect.objectContaining({ method: "DELETE" }));
    expect(track).toHaveBeenCalledWith("bookmark_removed", { paper_id: "1" });
  });

  it("says that there are too many requests when the save is refused for that", async () => {
    await signedIn(() => new Response("", { status: 429 }));
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Too many requests for now. Wait a minute, then try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
  });

  it("goes back and says so when the save fails", async () => {
    await signedIn(() => new Response("", { status: 503 }));
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("This did not save. Try again.")).toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith("bookmark_added", expect.anything());
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Note", () => {
  const clearCookies = () => {
    for (const part of document.cookie.split(";")) document.cookie = `${part.split("=")[0].trim()}=; max-age=0; path=/`;
  };
  beforeEach(() => {
    clearCookies();
    resetSyncForTest();
    resetSavedForTest();
  });
  afterEach(() => {
    resetAccountForTest(false);
    clearCookies();
  });

  it("is not in the row while the site has no sign-in", async () => {
    renderNav();
    await userEvent.click(text("1:0.2"));
    expect(screen.queryByRole("button", { name: "Note" })).toBeNull();
  });

  it("asks a reader with no account to sign in, and gives the focus back to its tile", async () => {
    resetAccountForTest(true);
    vi.stubGlobal("fetch", vi.fn());
    await act(async () => startAccount());
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(screen.getByRole("dialog", { name: "Sign in to save this" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Not now" }));
    await act(async () => {
      await new Promise((resolve) => window.requestAnimationFrame(() => resolve(null)));
    });
    expect(screen.getByRole("button", { name: "Note" })).toHaveFocus();
  });

  it("opens the notes of the marked paragraph for a signed-in reader, and Escape closes them first", async () => {
    document.cookie = "hub_in=1; path=/";
    resetAccountForTest(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url === "/api/auth/session" ? Response.json({ user: { name: "Ana", email: null, key: "k1" } }) : Response.json({ bookmarks: [], notes: [{ id: "n1", ref: "1:0.2", text: "A note.", at: "2026-10-01T00:00:00.000Z" }] }))),
    );
    await act(async () => {
      await startAccount();
      await loadSaved("1");
    });
    renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Note" }));
    expect(await screen.findByRole("dialog", { name: "Your notes on 1:0.2" })).toHaveTextContent("A note.");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  async function withNotesOpen() {
    document.cookie = "hub_in=1; path=/";
    resetAccountForTest(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url === "/api/auth/session" ? Response.json({ user: { name: "Ana", email: null, key: "k1" } }) : Response.json({ bookmarks: [], notes: [] }))));
    await act(async () => {
      await startAccount();
      await loadSaved("1");
    });
    renderNav();
  }

  // The voice clears the mark of a paragraph when it reaches it. A reader who writes a note must keep the sheet.
  it("keeps the notes open, with the text in the field, when the voice reaches the marked paragraph", async () => {
    await withNotesOpen();
    await userEvent.click(round());
    await sound("playing");
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Note" }));
    await userEvent.type(await screen.findByRole("textbox", { name: "Add a note" }), "Half a thought");
    await sound("ended");
    await sound("playing");
    expect(screen.getByRole("dialog", { name: "Your notes on 1:0.2" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Add a note" })).toHaveValue("Half a thought");
    expect(para("1:0.2")).toHaveAttribute("data-picked");
  });

  it("closes the notes when the reader is signed out, so that a text cannot go to the next reader", async () => {
    await withNotesOpen();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Note" }));
    await userEvent.type(await screen.findByRole("textbox", { name: "Add a note" }), "Mine");
    act(() => markSignedOut());
    expect(screen.queryByRole("dialog", { name: /Your notes/ })).toBeNull();
  });

  it("starts with an empty field on another paragraph", async () => {
    await withNotesOpen();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(screen.getByRole("button", { name: "Note" }));
    await userEvent.type(await screen.findByRole("textbox", { name: "Add a note" }), "For 1:0.2");
    window.history.replaceState(null, "", "#1:1.1");
    await act(async () => window.dispatchEvent(new HashChangeEvent("hashchange")));
    expect(await screen.findByRole("dialog", { name: "Your notes on 1:1.1" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Add a note" })).toHaveValue("");
  });

  it("opens from the small pen of a paragraph, and marks that paragraph", async () => {
    document.cookie = "hub_in=1; path=/";
    resetAccountForTest(true);
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url === "/api/auth/session" ? Response.json({ user: { name: "Ana", email: null, key: "k1" } }) : Response.json({ bookmarks: [], notes: [] }))));
    await act(async () => {
      await startAccount();
    });
    renderNav();
    // The pen is drawn by another component. The controls own each press on a paragraph.
    const pen = document.createElement("button");
    pen.className = "mark-notes";
    para("1:1.1").querySelector("a")!.after(pen);
    await userEvent.click(pen);
    expect(para("1:1.1")).toHaveAttribute("data-picked");
    expect(await screen.findByRole("dialog", { name: "Your notes on 1:1.1" })).toBeInTheDocument();
  });
});

