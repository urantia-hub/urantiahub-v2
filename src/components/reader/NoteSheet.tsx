"use client";

import { useSyncExternalStore } from "react";
import { track } from "@/analytics";
import { failureWords } from "@/account/limited";
import { addNote, changeNote, deleteNote, loadSaved, type NoteResult, noSaved, savedState, subscribeToSaved } from "@/account/saved";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { savedHref } from "@/i18n/paths";
import { NoteThread } from "./NoteThread";
import { Sheet } from "./Sheet";
import { earnToolMark } from "@/streak/client";

type Props = { reference: string; paperId: string; onClose: () => void; lang?: Lang };

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
export default function NoteSheet({ reference, paperId, onClose, lang = "en" }: Props) {
  const t = messages(lang);
  const saved = useSyncExternalStore(subscribeToSaved, savedState, noSaved);
  const notes = saved.notes.filter((note) => note.ref === reference);

  return (
    <Sheet label={t.notesOn(reference)} onClose={onClose} className="notes">
      <h2>{t.notesOn(reference)}</h2>
      <p>{t.notesOnly}</p>
      {saved.status === "loading" && (
        <div className="waiting" role="status" aria-label={t.notesLoading}>
          <span />
          <span />
        </div>
      )}
      {saved.status === "failed" && (
        <p className="note-problem" role="alert">
          {failureWords(t.notesFailed, lang)}{" "}
          <button type="button" onClick={() => void loadSaved(paperId)}>
            {t.tryAgain}
          </button>
        </p>
      )}

      <NoteThread
        reference={reference}
        notes={notes}
        add={counted(addNote, () => {
          track("note_saved", { paper_id: paperId, kind: "new" });
          void earnToolMark("note");
        })}
        change={counted(changeNote, () => track("note_saved", { paper_id: paperId, kind: "change" }))}
        remove={counted(deleteNote, () => track("note_deleted", { paper_id: paperId }))}
        last={IN_SHEET}
        allHref={savedHref(lang, reference)}
        focusField={saved.status === "ready" && notes.length === 0}
        lang={lang}
      />
    </Sheet>
  );
}
