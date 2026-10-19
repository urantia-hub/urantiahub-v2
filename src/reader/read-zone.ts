import { ReadTracker } from "./read-tracker";

// Watches the paragraphs that `selector` finds in the reading zone of the screen, the middle, away from
// the bars at the top and the bottom. Each second, and when the page hides, `onRead` gets the paragraphs
// read since the last time. The function that it answers stops the watch and gives the last part.
export function watchReading(selector: string, onRead: (refs: string[]) => void, onHidden: () => void = () => {}): () => void {
  const tracker = new ReadTracker();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) tracker.enter(entry.target.id, entry.target.textContent?.length ?? 0);
        else tracker.leave(entry.target.id);
      }
    },
    { rootMargin: "-12% 0px -30% 0px" },
  );
  for (const paragraph of document.querySelectorAll(selector)) observer.observe(paragraph);

  const collect = () => onRead(tracker.collect());
  const timer = window.setInterval(collect, 1000);
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      collect();
      onHidden();
      tracker.pause();
    } else tracker.resume();
  };
  document.addEventListener("visibilitychange", onVisibility);
  if (document.visibilityState === "hidden") tracker.pause();
  return () => {
    collect();
    window.clearInterval(timer);
    observer.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
