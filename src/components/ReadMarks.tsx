"use client";

import { useEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { flushRead, queueRead } from "@/account/sync";
import { ReadTracker } from "@/reader/read-tracker";

// On a paper, for a signed-in reader: marks each paragraph as read after its time in the reading zone
// of the screen. It draws nothing, and it does nothing for a reader with no account.
export function ReadMarks({ paperId }: { paperId: string }) {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  // The key names the reader. With another reader, the time in view starts again.
  const key = account.status === "in" ? (account.user?.key ?? null) : null;

  useEffect(() => {
    if (!key || !("IntersectionObserver" in window)) return;
    const tracker = new ReadTracker();
    // The reading zone: the middle of the screen, away from the bars at the top and the bottom.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) tracker.enter(entry.target.id, entry.target.textContent?.length ?? 0);
          else tracker.leave(entry.target.id);
        }
      },
      { rootMargin: "-12% 0px -30% 0px" },
    );
    for (const paragraph of document.querySelectorAll(".paper .para[id]")) observer.observe(paragraph);

    const collect = () => queueRead(tracker.collect());
    const timer = window.setInterval(collect, 1000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        // The general listener sent its batch before this one ran, so this last part goes out here.
        collect();
        void flushRead(true);
        tracker.pause();
      } else tracker.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    if (document.visibilityState === "hidden") tracker.pause();
    return () => {
      // The reader leaves the paper: what was read goes out now.
      collect();
      void flushRead();
      window.clearInterval(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [key, paperId]);

  return null;
}
