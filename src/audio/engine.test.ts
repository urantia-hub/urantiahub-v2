import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeAudio } from "../../test/fake-audio";
import { createAudioEngine, paperProgress, SPEEDS } from "./engine";
import type { Track } from "./tracks";

const tracks: Track[] = [
  { ref: "1:0.1", url: "https://cdn.urantia.dev/a.mp3", duration: 10 },
  { ref: "1:0.2", url: "https://cdn.urantia.dev/b.mp3", duration: 20 },
  { ref: "1:1.1", url: "https://cdn.urantia.dev/c.mp3", duration: 30 },
];

function setup() {
  const onFinished = vi.fn();
  const engine = createAudioEngine(tracks, { createAudio: () => new FakeAudio(), onFinished });
  const [audio, ahead] = FakeAudio.made;
  return { engine, audio, ahead, onFinished };
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => FakeAudio.reset());

describe("paperProgress", () => {
  it("is the part of the whole paper that the voice passed", () => {
    expect(paperProgress(tracks, 0, 0)).toBe(0);
    expect(paperProgress(tracks, 0, 5)).toBeCloseTo(5 / 60);
    expect(paperProgress(tracks, 1, 10)).toBeCloseTo(20 / 60);
    expect(paperProgress(tracks, 2, 30)).toBe(1);
  });
  it("never passes the end of a paragraph, and never goes over one", () => {
    expect(paperProgress(tracks, 0, 99)).toBeCloseTo(10 / 60);
    expect(paperProgress(tracks, 2, 99)).toBe(1);
  });
  it("is zero with no paragraph", () => {
    expect(paperProgress(tracks, -1, 5)).toBe(0);
    expect(paperProgress([], 0, 5)).toBe(0);
  });
});

describe("the audio engine", () => {
  it("starts idle, with no paragraph", () => {
    expect(setup().engine.getState()).toEqual({ status: "idle", index: -1, time: 0, speed: 1 });
  });

  it("loads a paragraph, preloads the next one, and plays", () => {
    const { engine, audio, ahead } = setup();
    engine.playAt(0);
    expect(engine.getState()).toMatchObject({ status: "loading", index: 0, time: 0 });
    expect(audio.src).toBe(tracks[0].url);
    expect(ahead.src).toBe(tracks[1].url);
    expect(ahead.preload).toBe("auto");
    audio.emit("playing");
    expect(engine.getState().status).toBe("playing");
  });

  it("reports the time as the paragraph plays", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    audio.emit("playing");
    audio.currentTime = 4.2;
    audio.emit("timeupdate");
    expect(engine.getState().time).toBe(4.2);
  });

  // A slow connection: the sound stalls in the middle of a paragraph.
  it("reports loading when the sound stalls, and playing when it continues", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    audio.emit("playing");
    audio.emit("waiting");
    expect(engine.getState().status).toBe("loading");
    audio.emit("playing");
    expect(engine.getState().status).toBe("playing");
  });

  it("ignores a stall when the voice is paused", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    audio.emit("playing");
    engine.pause();
    audio.emit("waiting");
    expect(engine.getState().status).toBe("paused");
  });

  it("goes to the next paragraph when one ends", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    audio.emit("playing");
    audio.emit("ended");
    expect(engine.getState()).toMatchObject({ status: "loading", index: 1, time: 0 });
    expect(audio.src).toBe(tracks[1].url);
  });

  it("stops at the end of the paper and reports it one time", () => {
    const { engine, audio, onFinished } = setup();
    engine.playAt(2);
    audio.emit("playing");
    audio.emit("ended");
    expect(engine.getState()).toMatchObject({ status: "idle", index: -1, time: 0 });
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("holds the place on pause, and resumes the same file", () => {
    const { engine, audio } = setup();
    engine.playAt(1);
    audio.emit("playing");
    audio.currentTime = 7;
    audio.emit("timeupdate");
    engine.pause();
    expect(audio.paused).toBe(true);
    expect(engine.getState()).toMatchObject({ status: "paused", index: 1, time: 7 });

    const calls = audio.playCalls;
    engine.resume();
    expect(audio.src).toBe(tracks[1].url);
    expect(audio.currentTime).toBe(7);
    expect(audio.playCalls).toBe(calls + 1);
    audio.emit("playing");
    expect(engine.getState()).toMatchObject({ status: "playing", index: 1, time: 7 });
  });

  it("ignores pause when nothing plays, and resume when nothing is paused", () => {
    const { engine, audio } = setup();
    engine.pause();
    engine.resume();
    expect(engine.getState().status).toBe("idle");
    expect(audio.playCalls).toBe(0);
  });

  it("moves one paragraph back and forward, and stops at both ends", () => {
    const { engine } = setup();
    engine.playAt(1);
    engine.next();
    expect(engine.getState().index).toBe(2);
    engine.next();
    expect(engine.getState().index).toBe(2);
    engine.previous();
    engine.previous();
    expect(engine.getState().index).toBe(0);
    engine.previous();
    expect(engine.getState()).toMatchObject({ index: 0, status: "loading", time: 0 });
  });

  it("ignores a paragraph that does not exist", () => {
    const { engine } = setup();
    engine.playAt(9);
    engine.playAt(-1);
    expect(engine.getState().status).toBe("idle");
  });

  it("goes through the speeds, and keeps the speed for the next paragraph", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    const seen = [engine.getState().speed];
    for (let i = 0; i < SPEEDS.length; i++) {
      engine.cycleSpeed();
      seen.push(engine.getState().speed);
    }
    expect(seen).toEqual([1, 1.25, 1.5, 0.75, 1]);
    engine.cycleSpeed();
    expect(audio.playbackRate).toBe(1.25);
    audio.playbackRate = 1;
    audio.emit("ended");
    expect(audio.playbackRate).toBe(1.25);
  });

  // Review Focus 5.
  it("stops with a failure when a file does not load, and retries the same paragraph", () => {
    const { engine, audio } = setup();
    engine.playAt(1);
    audio.emit("error");
    expect(engine.getState()).toMatchObject({ status: "failed", index: 1 });
    const calls = audio.playCalls;
    engine.retry();
    expect(engine.getState()).toMatchObject({ status: "loading", index: 1, time: 0 });
    expect(audio.src).toBe(tracks[1].url);
    expect(audio.playCalls).toBe(calls + 1);
  });

  it("does not report a failure for an error with no paragraph", () => {
    const { engine, audio } = setup();
    audio.emit("error");
    expect(engine.getState().status).toBe("idle");
  });

  // Review Focus 2: the browser refuses sound with no gesture. That is not a broken file.
  it("goes back to idle when the browser refuses to start", async () => {
    const { engine, audio } = setup();
    audio.rejectWith = { name: "NotAllowedError" };
    engine.playAt(0);
    await settle();
    expect(engine.getState()).toMatchObject({ status: "idle", index: -1 });
  });

  it("goes back to paused when the browser refuses to resume", async () => {
    const { engine, audio } = setup();
    engine.playAt(1);
    audio.emit("playing");
    audio.currentTime = 3;
    engine.pause();
    audio.rejectWith = { name: "NotAllowedError" };
    engine.resume();
    await settle();
    expect(engine.getState()).toMatchObject({ status: "paused", index: 1, time: 3 });
  });

  // Review Focus 1: a new choice interrupts the last play() call. That is not a failure.
  it("ends on the last choice when the reader changes paragraph fast", async () => {
    const { engine, audio } = setup();
    audio.rejectWith = { name: "AbortError" };
    engine.playAt(0);
    engine.playAt(2);
    audio.rejectWith = null;
    engine.playAt(1);
    await settle();
    expect(engine.getState()).toMatchObject({ status: "loading", index: 1 });
    expect(audio.src).toBe(tracks[1].url);
    audio.emit("playing");
    expect(engine.getState().status).toBe("playing");
  });

  it("fails for any other play error", async () => {
    const { engine, audio } = setup();
    audio.rejectWith = { name: "NotSupportedError" };
    engine.playAt(0);
    await settle();
    expect(engine.getState().status).toBe("failed");
  });

  it("tells each subscriber, and stops after an unsubscribe", () => {
    const { engine } = setup();
    const listener = vi.fn();
    const off = engine.subscribe(listener);
    engine.playAt(0);
    expect(listener).toHaveBeenCalled();
    const calls = listener.mock.calls.length;
    off();
    engine.cycleSpeed();
    expect(listener).toHaveBeenCalledTimes(calls);
  });

  it("stops the sound and stops listening when it is destroyed", () => {
    const { engine, audio } = setup();
    engine.playAt(0);
    audio.emit("playing");
    engine.destroy();
    expect(audio.paused).toBe(true);
    audio.emit("ended");
    expect(engine.getState().index).toBe(0);
  });
});
