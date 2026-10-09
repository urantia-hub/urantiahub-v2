"use client";

import { useSyncExternalStore } from "react";
import { track } from "@/analytics";
import { failureWords } from "@/account/limited";
import { addNote, changeNote, deleteNote, loadSaved, type NoteResult, noSaved, savedState, subscribeToSaved } from "@/account/saved";
import { NoteThread } from "./NoteThread";
import { Sheet } from "./Sheet";

type Props = { reference: string; paperId: string; onClose: () => void };

// Counts a change that the account took.
const counted =
  <A extends unknown[]>(work: (...args: A) => Promise<NoteResult>, count: () => void) =>
  async (...args: A) => {
    const result = await work(...args);
    if (result.ok) count();
    return result;
  };

// In the sheet a long thread shows its last notes. The page of the paragraph shows them all.
const IN_SHEET = 3;

// The reader's notes on one paragraph of the open paper.
export default function NoteSheet({ reference, paperId, onClose }: Props) {
  const saved = useSyncExternalStore(subscribeToSaved, savedState, noSaved);
  const notes = saved.notes.filter((note) => note.ref === reference);

  return (
    <Sheet label={`Your notes on ${reference}`} onClose={onClose} className="notes">
      <h2>Your notes on {reference}</h2>
      <p>Only you see them.</p>
      {saved.status === "loading" && (
        <div className="waiting" role="status" aria-label="Loading your notes">
          <span />
          <span />
        </div>
      )}
      {saved.status === "failed" && (
        <p className="note-problem" role="alert">
          {failureWords("Your notes did not load.")}{" "}
          <button type="button" onClick={() => void loadSaved(paperId)}>
            Try again
          </button>
        </p>
      )}

      <NoteThread
        reference={reference}
        notes={notes}
        add={counted(addNote, () => track("note_saved", { paper_id: paperId, kind: "new" }))}
        change={counted(changeNote, () => track("note_saved", { paper_id: paperId, kind: "change" }))}
        remove={counted(deleteNote, () => track("note_deleted", { paper_id: paperId }))}
        last={IN_SHEET}
        allHref={`/saved?ref=${encodeURIComponent(reference)}`}
        focusField={saved.status === "ready" && notes.length === 0}
      />
    </Sheet>
  );
}
