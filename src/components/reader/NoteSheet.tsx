"use client";

import { useSyncExternalStore } from "react";
import { addNote, changeNote, deleteNote, loadSaved, noSaved, savedState, subscribeToSaved } from "@/account/saved";
import { NoteThread } from "./NoteThread";
import { Sheet } from "./Sheet";

type Props = { reference: string; paperId: string; onClose: () => void };

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
          Your notes did not load.{" "}
          <button type="button" onClick={() => void loadSaved(paperId)}>
            Try again
          </button>
        </p>
      )}

      <NoteThread
        reference={reference}
        notes={notes}
        add={addNote}
        change={changeNote}
        remove={deleteNote}
        last={IN_SHEET}
        allHref={`/saved?ref=${encodeURIComponent(reference)}`}
        focusField={saved.status === "ready" && notes.length === 0}
      />
    </Sheet>
  );
}
