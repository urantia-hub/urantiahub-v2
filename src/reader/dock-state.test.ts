import { describe, expect, it } from "vitest";
import { isSounding, nextPick, pillJob, roundIntent, type DockInput } from "./dock-state";

const at = (over: Partial<DockInput> = {}): DockInput => ({ picked: null, status: "idle", voiceRef: null, ...over });

describe("isSounding", () => {
  it("is true while the voice plays or loads", () => {
    expect(["idle", "loading", "playing", "paused", "failed"].map((s) => isSounding(s as DockInput["status"]))).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe("pillJob", () => {
  it("is reading at rest and after a pause", () => {
    expect(pillJob(at())).toBe("reading");
    expect(pillJob(at({ status: "paused", voiceRef: "1:0.1" }))).toBe("reading");
  });
  it("is listening while the voice plays, loads, or failed", () => {
    expect(pillJob(at({ status: "playing", voiceRef: "1:0.1" }))).toBe("listening");
    expect(pillJob(at({ status: "loading", voiceRef: "1:0.1" }))).toBe("listening");
    expect(pillJob(at({ status: "failed", voiceRef: "1:0.1" }))).toBe("listening");
  });
  it("is paragraph when a paragraph is marked, in every voice state", () => {
    expect(pillJob(at({ picked: "1:0.4" }))).toBe("paragraph");
    expect(pillJob(at({ picked: "1:0.4", status: "playing", voiceRef: "1:0.1" }))).toBe("paragraph");
  });
});

describe("roundIntent", () => {
  it("plays from the first paragraph in view at rest", () => {
    expect(roundIntent(at())).toEqual({ kind: "play-in-view" });
  });
  it("pauses while the voice plays or loads", () => {
    expect(roundIntent(at({ status: "playing", voiceRef: "1:0.1" }))).toEqual({ kind: "pause" });
    expect(roundIntent(at({ status: "loading", voiceRef: "1:0.1" }))).toEqual({ kind: "pause" });
  });
  it("resumes after a pause", () => {
    expect(roundIntent(at({ status: "paused", voiceRef: "1:0.1" }))).toEqual({ kind: "resume" });
  });
  it("retries after a failure", () => {
    expect(roundIntent(at({ status: "failed", voiceRef: "1:0.1" }))).toEqual({ kind: "retry" });
  });
  // The round button acts on the paragraph that has the reader's attention.
  it("plays the marked paragraph, at rest and while another paragraph plays", () => {
    expect(roundIntent(at({ picked: "1:0.4" }))).toEqual({ kind: "play-at", ref: "1:0.4" });
    expect(roundIntent(at({ picked: "1:0.4", status: "playing", voiceRef: "1:0.1" }))).toEqual({ kind: "play-at", ref: "1:0.4" });
    expect(roundIntent(at({ picked: "1:0.4", status: "paused", voiceRef: "1:0.1" }))).toEqual({ kind: "play-at", ref: "1:0.4" });
  });
  it("resumes when the marked paragraph is the one that waits", () => {
    expect(roundIntent(at({ picked: "1:0.1", status: "paused", voiceRef: "1:0.1" }))).toEqual({ kind: "resume" });
  });
});

describe("nextPick", () => {
  it("marks the tapped paragraph", () => {
    expect(nextPick(at(), "1:0.4")).toBe("1:0.4");
  });
  it("removes the mark on a second tap", () => {
    expect(nextPick(at({ picked: "1:0.4" }), "1:0.4")).toBeNull();
  });
  it("moves the mark to another paragraph", () => {
    expect(nextPick(at({ picked: "1:0.4" }), "1:0.5")).toBe("1:0.5");
  });
  it("shows the player for a tap on the paragraph that plays, and drops any other mark", () => {
    expect(nextPick(at({ status: "playing", voiceRef: "1:0.1" }), "1:0.1")).toBeNull();
    expect(nextPick(at({ picked: "1:0.4", status: "loading", voiceRef: "1:0.1" }), "1:0.1")).toBeNull();
  });
  it("marks the paragraph that waits after a pause, like any other", () => {
    expect(nextPick(at({ status: "paused", voiceRef: "1:0.1" }), "1:0.1")).toBe("1:0.1");
  });
});
