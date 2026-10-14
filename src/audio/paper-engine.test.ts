import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeAudio } from "../../test/fake-audio";
import type { PaperVoice } from "@/content/fetchers";
import { SPEEDS } from "./engine";
import { createPaperEngine, voiceTracks } from "./paper-engine";

const voice: PaperVoice = {
  url: "https://cdn.urantia.dev/audio/eng/papers/1.mp3",
  duration: 120,
  starts: [
    { key: "title", at: 0 },
    { key: "1:0.1", at: 3, sentences: [3, 8, 15] },
    { key: "1:0.2", at: 20 },
    { key: "section:1", at: 50 },
    { key: "1:1.1", at: 53, sentences: [53, 70] },
  ],
};
const refs = ["1:0.1", "1:0.2", "1:1.1"];

function setup() {
  const onFinished = vi.fn();
  const onSystemPause = vi.fn();
  const engine = createPaperEngine(voice, refs, { createAudio: () => new FakeAudio(), onFinished, onSystemPause });
  const [audio] = FakeAudio.made;
  return { engine, audio, onFinished, onSystemPause };
}
const at = (audio: FakeAudio, time: number) => {
  audio.currentTime = time;
  audio.emit("timeupdate");
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => FakeAudio.reset());

describe("the paragraphs of the voice, from the map", () => {
  it("gives each paragraph its length up to the next start", () => {
    expect(voiceTracks(voice, refs)).toEqual([
      { ref: "1:0.1", url: voice.url, duration: 17 },
      { ref: "1:0.2", url: voice.url, duration: 30 },
      { ref: "1:1.1", url: voice.url, duration: 67 },
    ]);
  });
});

describe("the engine of one file for the paper", () => {
  it("uses one audio element, and starts idle", () => {
    const { engine } = setup();
    expect(FakeAudio.made).toHaveLength(1);
    expect(engine.getState()).toEqual({ status: "idle", index: -1, time: 0, speed: 1, item: null, sentence: 0 });
  });

  it("plays a paragraph from its start in the file", () => {
    const { engine, audio } = setup();
    engine.playAt(1);
    expect(audio.src).toBe(voice.url);
    expect(audio.currentTime).toBe(20);
    expect(audio.playCalls).toBe(1);
    expect(engine.getState()).toMatchObject({ status: "loading", index: 1, item: "1:0.2", time: 0 });
    audio.emit("playing");
    expect(engine.getState().status).toBe("playing");
  });

  it("plays from the paper title", () => {
    const { engine, audio } = setup();
    engine.playFromTitle();
    expect(audio.currentTime).toBe(0);
    expect(engine.getState()).toMatchObject({ status: "loading", index: 0, item: "title" });
  });

  it("follows the time: the paragraph, the time in it, and the sentence", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    audio.emit("playing");
    at(audio, 9.5);
    expect(engine.getState()).toMatchObject({ index: 0, item: "1:0.1", time: 6.5, sentence: 1 });
    at(audio, 16);
    expect(engine.getState()).toMatchObject({ index: 0, sentence: 2 });
    at(audio, 25);
    expect(engine.getState()).toMatchObject({ index: 1, item: "1:0.2", time: 5, sentence: 0 });
  });

  // While a title sounds, `index` is the paragraph that comes next, and the time is the time in the title.
  it("reads a section title as its own item", () => {
    const { engine, audio } = setup();
    engine.playAt(1);
    audio.emit("playing");
    at(audio, 51);
    expect(engine.getState()).toMatchObject({ item: "section:1", index: 2, time: 1, sentence: 0 });
  });

  it("moves inside the file for next and previous, and keeps playing", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    audio.emit("playing");
    engine.next();
    expect(audio.currentTime).toBe(20);
    expect(audio.src).toBe(voice.url);
    expect(engine.getState()).toMatchObject({ status: "playing", index: 1, item: "1:0.2" });
    engine.next();
    expect(audio.currentTime).toBe(53);
    engine.next();
    expect(audio.currentTime).toBe(53);
    engine.previous();
    expect(audio.currentTime).toBe(20);
  });

  it("finishes at the end of the file", () => {
    const { engine, audio, onFinished } = setup();
    engine.playAt(2);
    audio.emit("playing");
    audio.ended = true;
    audio.emit("ended");
    expect(engine.getState()).toMatchObject({ status: "idle", index: -1, item: null });
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("holds the place at a pause, and resumes there", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    audio.emit("playing");
    at(audio, 12);
    engine.pause();
    expect(audio.paused).toBe(true);
    expect(engine.getState()).toMatchObject({ status: "paused", index: 0, item: "1:0.1", sentence: 1 });
    engine.resume();
    expect(audio.currentTime).toBe(12);
    expect(engine.getState().status).toBe("loading");
    audio.emit("playing");
    expect(engine.getState().status).toBe("playing");
  });

  it("sees a pause by the system", () => {
    const { engine, audio, onSystemPause } = setup();
    engine.playAt(0);
    audio.emit("playing");
    audio.paused = true;
    audio.emit("pause");
    expect(engine.getState().status).toBe("paused");
    expect(onSystemPause).toHaveBeenCalledTimes(1);
  });

  it("holds the place when the browser refuses sound with no gesture", async () => {
    const { engine, audio } = setup();
    audio.rejectWith = { name: "NotAllowedError" };
    engine.playAt(1);
    await settle();
    expect(engine.getState()).toMatchObject({ status: "paused", index: 1 });
  });

  it("fails on an error, and a retry plays the same paragraph", () => {
    const { engine, audio } = setup();
    engine.playAt(1);
    audio.emit("error");
    expect(engine.getState().status).toBe("failed");
    audio.currentTime = 0;
    engine.retry();
    expect(audio.currentTime).toBe(20);
    expect(engine.getState()).toMatchObject({ status: "loading", index: 1 });
  });

  it("cycles the speed on the element", () => {
    const { engine, audio } = setup();
    engine.cycleSpeed();
    expect(engine.getState().speed).toBe(SPEEDS[1]);
    expect(audio.playbackRate).toBe(SPEEDS[1]);
  });

  it("stops the element and its download when destroyed", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    engine.destroy();
    expect(audio.paused).toBe(true);
    expect(audio.src).toBe("");
  });
});
