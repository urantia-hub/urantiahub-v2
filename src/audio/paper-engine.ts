import type { PaperVoice, VoiceStart } from "@/content/fetchers";
import { SPEEDS, type AudioLike, type VoiceState } from "./engine";
import type { Track } from "./tracks";

// What sounds now: the key of the item ("title", "section:1", or a paragraph) and the sentence in it.
export type PaperVoiceState = VoiceState & { item: string | null; sentence: number };

type Deps = {
  createAudio: () => AudioLike;
  onFinished?: () => void;
  onSystemPause?: () => void;
};

// The paragraphs in reading order, each as long as the time up to the next start in the file.
export function voiceTracks(voice: PaperVoice, refs: string[]): Track[] {
  return refs.map((ref) => {
    const i = voice.starts.findIndex((s) => s.key === ref);
    const end = voice.starts[i + 1]?.at ?? voice.duration;
    return { ref, url: voice.url, duration: Math.round((end - voice.starts[i].at) * 100) / 100 };
  });
}

// The last of the times that is at or before `time`, by binary search. -1 when all are after it.
function lastAtOrBefore(times: number[], time: number): number {
  let low = 0;
  let high = times.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (times[mid] <= time) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  return found;
}

// Plays a paper from ONE file, and moves inside it. On a phone with the screen off, a change of file can
// be refused or stall; inside one file there is none.
export function createPaperEngine(voice: PaperVoice, refs: string[], { createAudio, onFinished, onSystemPause }: Deps) {
  const audio = createAudio();
  const starts: VoiceStart[] = voice.starts;
  const times = starts.map((s) => s.at);
  // For each start, the paragraph that it is or that comes after it.
  const paragraphOf = starts.map((_, i) => {
    const next = starts.slice(i).find((s) => refs.includes(s.key));
    return next ? refs.indexOf(next.key) : refs.length - 1;
  });

  let state: PaperVoiceState = { status: "idle", index: -1, time: 0, speed: 1, item: null, sentence: 0 };
  const listeners = new Set<() => void>();
  // Each start gets a number. A late answer from an older start is ignored.
  let attempt = 0;

  function set(patch: Partial<PaperVoiceState>) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  }

  // The place in the file as state. Only the parts that changed reach the listeners.
  function placeAt(time: number): Partial<PaperVoiceState> {
    const i = Math.max(0, lastAtOrBefore(times, time + 0.05));
    const start = starts[i];
    const isParagraph = refs.includes(start.key);
    const sentence = isParagraph && start.sentences ? Math.max(0, lastAtOrBefore(start.sentences, time + 0.05)) : 0;
    return { index: paragraphOf[i], item: start.key, time: Math.max(0, time - start.at), sentence };
  }

  function play(resumeFrom: number | null) {
    const mine = ++attempt;
    audio.playbackRate = state.speed;
    audio.play().catch((error: unknown) => {
      if (mine !== attempt) return;
      const name = (error as { name?: string } | null)?.name;
      if (name === "AbortError") return;
      // The browser refuses sound with no user action. The place is held for the next press.
      if (name === "NotAllowedError") {
        set({ status: "paused", ...placeAt(resumeFrom ?? audio.currentTime) });
        return;
      }
      set({ status: "failed" });
    });
  }

  function seek(key: string) {
    const i = starts.findIndex((s) => s.key === key);
    if (i === -1) return;
    if (!audio.src) audio.src = voice.url;
    audio.currentTime = starts[i].at;
    const place = placeAt(starts[i].at);
    // A move while the sound plays is a seek: the sound continues. A "waiting" event reports a wait.
    if (state.status === "playing") {
      set(place);
      return;
    }
    set({ status: "loading", ...place });
    play(starts[i].at);
  }

  function playAt(index: number) {
    if (index < 0 || index >= refs.length) return;
    seek(refs[index]);
  }

  const onPlaying = () => {
    if (state.status === "loading") set({ status: "playing" });
    // The system started the sound again by itself, as after a phone call.
    else if (state.status === "paused" && !audio.paused) set({ status: "playing", ...placeAt(audio.currentTime) });
  };
  const onWaiting = () => {
    if (state.status === "playing") set({ status: "loading" });
  };
  // The system paused the sound: a phone call, or headphones pulled out. Not the pause before "ended".
  const onPause = () => {
    if (state.status !== "playing" || audio.ended) return;
    set({ status: "paused", ...placeAt(audio.currentTime) });
    onSystemPause?.();
  };
  const onTime = () => {
    if (state.status !== "playing" && state.status !== "loading") return;
    const place = placeAt(audio.currentTime);
    if (place.index !== state.index || place.item !== state.item || place.sentence !== state.sentence || place.time !== state.time) set(place);
  };
  const onEnded = () => {
    if (state.status !== "playing" && state.status !== "loading") return;
    set({ status: "idle", index: -1, time: 0, item: null, sentence: 0 });
    onFinished?.();
  };
  const onError = () => {
    if (state.status === "loading" || state.status === "playing") set({ status: "failed" });
  };

  const handlers: [string, () => void][] = [
    ["playing", onPlaying],
    ["waiting", onWaiting],
    ["pause", onPause],
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
    playFromTitle() {
      seek("title");
    },
    // The time in the file, for the lock screen.
    position: () => ({ position: Math.min(audio.currentTime, voice.duration), duration: voice.duration, playbackRate: state.speed }),
    pause() {
      if (state.status !== "playing" && state.status !== "loading") return;
      attempt += 1;
      audio.pause();
      set({ status: "paused", ...placeAt(audio.currentTime) });
    },
    resume() {
      if (state.status !== "paused") return;
      set({ status: "loading" });
      play(audio.currentTime);
    },
    retry() {
      if (state.status !== "failed") return;
      const index = state.index;
      set({ status: "idle" });
      playAt(Math.max(0, index));
    },
    previous() {
      if (state.index >= 0) playAt(Math.max(0, state.index - 1));
    },
    next() {
      if (state.index >= 0 && state.index + 1 < refs.length) playAt(state.index + 1);
    },
    cycleSpeed() {
      const at = SPEEDS.indexOf(state.speed as (typeof SPEEDS)[number]);
      const speed = SPEEDS[(at + 1) % SPEEDS.length];
      audio.playbackRate = speed;
      set({ speed });
    },
    destroy() {
      attempt += 1;
      handlers.forEach(([type, handler]) => audio.removeEventListener(type, handler));
      listeners.clear();
      audio.pause();
      // Stops the download of the file.
      audio.src = "";
    },
  };
}

export type PaperEngine = ReturnType<typeof createPaperEngine>;
