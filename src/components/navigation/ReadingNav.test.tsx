import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeAudio } from "../../../test/fake-audio";
import type { Track } from "@/audio/tracks";
import { ReadingNav } from "./ReadingNav";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/analytics", () => ({ track }));

const TRACKS: Track[] = [
  { ref: "1:0.1", url: "https://cdn.urantia.dev/a.mp3", duration: 10 },
  { ref: "1:0.2", url: "https://cdn.urantia.dev/b.mp3", duration: 20 },
  { ref: "1:1.1", url: "https://cdn.urantia.dev/c.mp3", duration: 30 },
];

function renderNav(tracks: Track[] | null = TRACKS) {
  return render(
    <>
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
    </>,
  );
}

const para = (ref: string) => document.getElementById(ref)!;
const text = (ref: string) => screen.getByText(`Text of ${ref}`);
const audio = () => FakeAudio.made[0];
const round = () => screen.getByTestId("round-button");
const job = () => screen.getByTestId("reading-bar").dataset.job;
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

  it("shows the progress through the whole paper as the green line", async () => {
    const { container } = renderNav();
    await userEvent.click(text("1:0.2"));
    await userEvent.click(round());
    await sound("playing");
    audio().currentTime = 20;
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
