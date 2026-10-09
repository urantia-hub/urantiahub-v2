"use client";

import { useEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { loadProgress, noReadPapers, readPapers, subscribeToProgress } from "@/account/progress";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";

const none = () => null;

function useKey() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  return account.status === "in" ? (account.user?.key ?? null) : null;
}

// Asks for the read papers when the contents page opens, for a signed-in reader. It draws nothing.
export function ProgressLoader() {
  const key = useKey();
  useEffect(() => {
    if (key) void loadProgress();
  }, [key]);
  return null;
}

// One quiet word beside a paper on the contents page, for a signed-in reader: "Read", or the section
// where the reader is. Other papers show nothing.
export function PaperMark({ id, sections }: { id: string; sections: number }) {
  const key = useKey();
  const read = useSyncExternalStore(subscribeToProgress, readPapers, noReadPapers);
  const place = useSyncExternalStore(subscribeToLastRead, readLastRead, none);
  if (!key) return null;
  if (read.has(id)) return <em className="mark">Read</em>;
  if (place?.paperId !== id || place.sectionId === "0") return null;
  const section = Number(place.sectionId);
  return <em className="mark">{sections >= section ? `Section ${section} of ${sections}` : `Section ${section}`}</em>;
}
