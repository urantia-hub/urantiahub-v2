import type { VoiceStatus } from "@/audio/engine";

// What the dock knows: the marked paragraph, the voice, and the paragraph that the voice is at.
export type DockInput = { picked: string | null; status: VoiceStatus; voiceRef: string | null };

export function isSounding(status: VoiceStatus): boolean {
  return status === "playing" || status === "loading";
}

export type PillJob = "reading" | "paragraph" | "listening";

// A marked paragraph has the reader's attention, so its actions come first.
export function pillJob({ picked, status }: DockInput): PillJob {
  if (picked) return "paragraph";
  return isSounding(status) || status === "failed" ? "listening" : "reading";
}

export type RoundIntent =
  | { kind: "play-at"; ref: string }
  | { kind: "resume" }
  | { kind: "pause" }
  | { kind: "retry" }
  | { kind: "play-in-view" };

// What a press on the round button does. It acts on the paragraph that has the reader's attention.
export function roundIntent({ picked, status, voiceRef }: DockInput): RoundIntent {
  if (picked) return picked === voiceRef && status === "paused" ? { kind: "resume" } : { kind: "play-at", ref: picked };
  if (isSounding(status)) return { kind: "pause" };
  if (status === "paused") return { kind: "resume" };
  if (status === "failed") return { kind: "retry" };
  return { kind: "play-in-view" };
}

// What a tap on a paragraph does to the mark.
export function nextPick({ picked, status, voiceRef }: DockInput, tapped: string): string | null {
  // The paragraph that plays already has its controls: the player.
  if (isSounding(status) && tapped === voiceRef) return null;
  return picked === tapped ? null : tapped;
}
