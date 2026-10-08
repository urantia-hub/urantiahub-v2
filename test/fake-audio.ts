// A stand-in for the browser's audio element. A test drives it with emit().
export class FakeAudio {
  static made: FakeAudio[] = [];
  static reset() {
    FakeAudio.made = [];
  }

  src = "";
  currentTime = 0;
  playbackRate = 1;
  preload = "";
  paused = true;
  ended = false;
  playCalls = 0;
  // Set this to make the next play() fail, for example { name: "NotAllowedError" }.
  rejectWith: { name: string } | null = null;
  private listeners = new Map<string, Set<() => void>>();

  constructor() {
    FakeAudio.made.push(this);
  }

  play(): Promise<void> {
    this.playCalls += 1;
    if (this.rejectWith) return Promise.reject(this.rejectWith);
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }

  addEventListener(type: string, listener: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    this.listeners.get(type)?.forEach((listener) => listener());
  }
}
