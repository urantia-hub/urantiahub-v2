import type { Track } from "./tracks";

export type VoiceStatus = "idle" | "loading" | "playing" | "paused" | "failed";
export type VoiceState = { status: VoiceStatus; index: number; time: number; speed: number };

export const SPEEDS = [1, 1.25, 1.5, 0.75] as const;

// The part of the browser's audio element that the engine uses. A test gives a stand-in.
export type AudioLike = {
  src: string;
  currentTime: number;
  playbackRate: number;
  preload: string;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

type Deps = { createAudio: () => AudioLike; onFinished?: () => void };

// How far the voice is through the whole paper, from 0 to 1. It only grows as the paper plays.
export function paperProgress(tracks: Track[], index: number, time: number): number {
  const total = tracks.reduce((sum, track) => sum + track.duration, 0);
  if (total <= 0 || index < 0 || index >= tracks.length) return 0;
  const before = tracks.slice(0, index).reduce((sum, track) => sum + track.duration, 0);
  return Math.min(1, (before + Math.min(Math.max(time, 0), tracks[index].duration)) / total);
}

// Plays a paper one paragraph at a time. It has no user interface: it holds the state and drives one audio element.
export function createAudioEngine(tracks: Track[], { createAudio, onFinished }: Deps) {
  const audio = createAudio();
  // A second element loads the next file ahead of time, so there is no gap between paragraphs.
  const ahead = createAudio();
  ahead.preload = "auto";

  let state: VoiceState = { status: "idle", index: -1, time: 0, speed: 1 };
  const listeners = new Set<() => void>();
  // Each start gets a number. A late answer from an older start is ignored.
  let attempt = 0;

  function set(patch: Partial<VoiceState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }

  function start(resumeFrom: number | null) {
    const mine = ++attempt;
    audio.playbackRate = state.speed;
    audio.play().catch((error: unknown) => {
      if (mine !== attempt) return;
      const name = (error as { name?: string } | null)?.name;
      // A newer choice interrupted this one. Not a fault.
      if (name === "AbortError") return;
      // The browser refuses sound with no user action. Not a fault of the file.
      if (name === "NotAllowedError") {
        set(resumeFrom === null ? { status: "idle", index: -1, time: 0 } : { status: "paused", time: resumeFrom });
        return;
      }
      set({ status: "failed" });
    });
  }

  function playAt(index: number) {
    if (index < 0 || index >= tracks.length) return;
    set({ status: "loading", index, time: 0 });
    audio.src = tracks[index].url;
    const following = tracks[index + 1];
    if (following) ahead.src = following.url;
    start(null);
  }

  const onPlaying = () => {
    if (state.status === "loading") set({ status: "playing" });
  };
  // The sound stalled, for example on a slow connection.
  const onWaiting = () => {
    if (state.status === "playing") set({ status: "loading" });
  };
  const onTime = () => {
    if (state.status === "playing" || state.status === "loading") set({ time: audio.currentTime });
  };
  const onEnded = () => {
    if (state.index < 0) return;
    if (state.index + 1 < tracks.length) {
      playAt(state.index + 1);
      return;
    }
    set({ status: "idle", index: -1, time: 0 });
    onFinished?.();
  };
  const onError = () => {
    if (state.status === "loading" || state.status === "playing") set({ status: "failed" });
  };

  const handlers: [string, () => void][] = [
    ["playing", onPlaying],
    ["waiting", onWaiting],
    ["timeupdate", onTime],
    ["ended", onEnded],
    ["error", onError],
  ];
  handlers.forEach(([type, handler]) => audio.addEventListener(type, handler));

  return {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    playAt,
    // Pause holds the place: the paragraph and the time.
    pause() {
      if (state.status !== "playing" && state.status !== "loading") return;
      attempt += 1;
      audio.pause();
      set({ status: "paused", time: audio.currentTime });
    },
    resume() {
      if (state.status !== "paused") return;
      const from = state.time;
      set({ status: "loading" });
      start(from);
    },
    retry() {
      if (state.status === "failed") playAt(state.index);
    },
    previous() {
      if (state.index >= 0) playAt(Math.max(0, state.index - 1));
    },
    next() {
      if (state.index >= 0 && state.index + 1 < tracks.length) playAt(state.index + 1);
    },
    cycleSpeed() {
      const at = SPEEDS.indexOf(state.speed as (typeof SPEEDS)[number]);
      const speed = SPEEDS[(at + 1) % SPEEDS.length];
      audio.playbackRate = speed;
      set({ speed });
    },
    destroy() {
      attempt += 1;
      audio.pause();
      handlers.forEach(([type, handler]) => audio.removeEventListener(type, handler));
      listeners.clear();
    },
  };
}

export type AudioEngine = ReturnType<typeof createAudioEngine>;
