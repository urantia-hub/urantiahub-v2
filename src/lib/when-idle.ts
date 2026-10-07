// Runs work after the page load, when the browser is idle, so it stays off the path to the first paint.
export function whenIdle(work: () => void): void {
  const run = () => {
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => work(), { timeout: 4000 });
    // Safari has no requestIdleCallback. A short timer would run the work during the load.
    else window.setTimeout(work, 2000);
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}
