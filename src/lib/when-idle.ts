// Runs work after the browser is idle, so it stays off the path to the first paint.
export function whenIdle(work: () => void): void {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => work(), { timeout: 4000 });
  else window.setTimeout(work, 1);
}
