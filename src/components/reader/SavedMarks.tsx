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
  const notes = new Map<string, number>();
  for (const note of saved.notes) notes.set(note.ref, (notes.get(note.ref) ?? 0) + 1);
  return [...new Set([...saved.bookmarks, ...notes.keys()])].map((ref) => {
    const place = document.getElementById(ref)?.querySelector(".marks");
    const count = notes.get(ref) ?? 0;
    return place
      ? createPortal(
          <>
            {saved.bookmarks.has(ref) && (
              <span className="mark-saved" role="img" aria-label="Saved">
                <Icon name="saved" />
              </span>
            )}
            {/* The controls of the paper open the notes: they own each press on a paragraph. */}
            {count > 0 && (
              <button type="button" className="mark-notes" aria-label={`${count} ${count === 1 ? "note" : "notes"} on ${ref}`}>
                <Icon name="note" />
                {count}
              </button>
            )}
          </>,
          place,
          ref,
        )
      : null;
  });
}
