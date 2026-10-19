"use client";

import { useEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { watchReading } from "@/reader/read-zone";
import { loadStreak, noteTextPassages } from "@/streak/client";

// On a page of a world text, for a signed-in reader: counts the passages read, so a finished page can
// earn the marks of the world texts. It draws nothing.
export function TextMarks({ work, page }: { work: string; page: string }) {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;

  useEffect(() => {
    if (!key || !("IntersectionObserver" in window)) return;
    void loadStreak();
    return watchReading(".paper.work .para[id]", (refs) => noteTextPassages(work, page, refs));
  }, [key, work, page]);

  return null;
}
