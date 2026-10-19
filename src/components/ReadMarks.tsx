"use client";

import { useEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { flushRead, queueRead } from "@/account/sync";
import { watchReading } from "@/reader/read-zone";
import { flushSections, loadStreak, noteParagraphs } from "@/streak/client";

// On a paper, for a signed-in reader: marks each paragraph as read after its time in the reading zone
// of the screen. It draws nothing, and it does nothing for a reader with no account.
export function ReadMarks({ paperId }: { paperId: string }) {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  // The key names the reader. With another reader, the time in view starts again.
  const key = account.status === "in" ? (account.user?.key ?? null) : null;

  useEffect(() => {
    if (!key || !("IntersectionObserver" in window)) return;
    void loadStreak();
    const stop = watchReading(
      ".paper .para[id]",
      (refs) => {
        queueRead(refs);
        noteParagraphs("read", refs);
      },
      // The general listener sent its batch before this one ran, so this last part goes out here.
      () => {
        void flushRead(true);
        void flushSections(true);
      },
    );
    return () => {
      // The reader leaves the paper: what was read goes out now.
      stop();
      void flushRead();
    };
  }, [key, paperId]);

  return null;
}
