// When a paragraph counts as read: it was in the reading zone of the screen for a time that fits its
// length. A fast scroll marks nothing. Time while the page is hidden does not count.

const MS_PER_CHAR = 12;
const MIN_MS = 1000;
const MAX_MS = 8000;

// About a quarter of the time that a person needs to read the paragraph, between one second and eight.
export function dwellMs(chars: number): number {
  return Math.min(MAX_MS, Math.max(MIN_MS, chars * MS_PER_CHAR));
}

type Seen = { need: number; total: number; since: number | null };

export class ReadTracker {
  private readonly seen = new Map<string, Seen>();
  private readonly done = new Set<string>();
  private paused = false;

  constructor(private readonly now: () => number = () => Date.now()) {}

  // The paragraph came into the reading zone.
  enter(ref: string, chars: number): void {
    if (this.done.has(ref)) return;
    const item = this.seen.get(ref) ?? { need: dwellMs(chars), total: 0, since: null };
    if (item.since === null && !this.paused) item.since = this.now();
    this.seen.set(ref, item);
    this.inView.add(ref);
  }

  // The paragraph left the reading zone.
  leave(ref: string): void {
    this.inView.delete(ref);
    this.stop(this.seen.get(ref));
  }

  // The page is hidden, or shown again.
  pause(): void {
    this.paused = true;
    for (const item of this.seen.values()) this.stop(item);
  }

  resume(): void {
    this.paused = false;
    for (const ref of this.inView) {
      const item = this.seen.get(ref);
      if (item && item.since === null) item.since = this.now();
    }
  }

  // The paragraphs that reached their time since the last call. Each one is given one time.
  collect(): string[] {
    const now = this.now();
    const read: string[] = [];
    for (const [ref, item] of this.seen) {
      const total = item.total + (item.since === null ? 0 : now - item.since);
      if (total < item.need) continue;
      read.push(ref);
      this.done.add(ref);
      this.seen.delete(ref);
      this.inView.delete(ref);
    }
    return read;
  }

  private readonly inView = new Set<string>();

  private stop(item: Seen | undefined): void {
    if (!item || item.since === null) return;
    item.total += this.now() - item.since;
    item.since = null;
  }
}
