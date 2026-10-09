"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { loadSaved, noSaved, savedState, subscribeToSaved } from "@/account/saved";
import { Icon } from "@/components/icons";

// On a paper, for a signed-in reader: a small mark beside the reference of each saved paragraph.
// Each paragraph has an empty place for its marks in the server's HTML, so a mark moves no text.
export function SavedMarks({ paperId }: { paperId: string }) {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const saved = useSyncExternalStore(subscribeToSaved, savedState, noSaved);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;

  useEffect(() => {
    if (key) void loadSaved(paperId);
  }, [key, paperId]);

  if (saved.paperId !== paperId) return null;
  return [...saved.bookmarks].map((ref) => {
    const place = document.getElementById(ref)?.querySelector(".marks");
    return place
      ? createPortal(
          <span className="mark-saved" role="img" aria-label="Saved">
            <Icon name="saved" />
          </span>,
          place,
          ref,
        )
      : null;
  });
}
