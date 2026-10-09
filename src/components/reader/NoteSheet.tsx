"use client";

import { type FormEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { addNote, changeNote, deleteNote, loadSaved, noSaved, savedState, subscribeToSaved } from "@/account/saved";
import { NOTE_MAX } from "@/account/note-limit";
import { age } from "@/reader/age";
import { Sheet } from "./Sheet";

type Props = { reference: string; paperId: string; onClose: () => void };

// A field that is as tall as its text. It has no handle to drag.
function NoteField({ value, onChange, label, placeholder, focus }: { value: string; onChange: (text: string) => void; label: string; placeholder?: string; focus?: boolean }) {
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  useEffect(() => {
    if (!focus) return;
    const el = field.current;
    el?.focus({ preventScroll: true });
    el?.setSelectionRange(el.value.length, el.value.length);
  }, [focus]);
  return <textarea ref={field} className="note-field" rows={1} aria-label={label} placeholder={placeholder} maxLength={NOTE_MAX} value={value} onChange={(event) => onChange(event.target.value)} />;
}

const full = (text: string) => text.length >= NOTE_MAX;
const LIMIT = `A note holds ${NOTE_MAX.toLocaleString("en")} characters at most.`;

// The reader's notes on one paragraph, as a thread: the oldest first, and the field for a new one at the end.
export default function NoteSheet({ reference, paperId, onClose }: Props) {
  const saved = useSyncExternalStore(subscribeToSaved, savedState, noSaved);
  const notes = saved.notes.filter((note) => note.ref === reference);
  const [draft, setDraft] = useState("");
  // One note at a time is in "Edit" or in "Delete".
  const [open, setOpen] = useState<{ id: string; mode: "edit" | "delete"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function run(work: () => Promise<{ ok: true } | { ok: false; why: "failed" | "gone" }>, failed: string, done: () => void) {
    setBusy(true);
    setProblem(null);
    const result = await work();
    setBusy(false);
    if (result.ok) return done();
    if (result.why === "gone") {
      setOpen(null);
      return setProblem("This note is gone.");
    }
    setProblem(failed);
  }

  function onAdd(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    void run(() => addNote(reference, text), "The note did not save. Try again.", () => setDraft(""));
  }

  function onChange(event: FormEvent) {
    event.preventDefault();
    const text = open?.text.trim();
    if (!open || !text || busy) return;
    void run(() => changeNote(open.id, text), "The note did not save. Try again.", () => setOpen(null));
  }

  const onDelete = (id: string) => void run(() => deleteNote(id), "The note is still here. Try again.", () => setOpen(null));

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

      {notes.length > 0 && (
        <ul className="note-list" aria-label="Your notes">
          {notes.map((note) => (
            <li key={note.id}>
              {open?.id === note.id && open.mode === "edit" ? (
                <form onSubmit={onChange}>
                  <NoteField label="Your note" value={open.text} onChange={(text) => setOpen({ ...open, text })} focus />
                  {full(open.text) && <p className="note-limit">{LIMIT}</p>}
                  <div className="panel-actions">
                    <button type="submit" className="panel-button dark" disabled={busy || !open.text.trim()}>
                      Save
                    </button>
                    <button type="button" className="panel-button" onClick={() => setOpen(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="note-text">{note.text}</p>
                  {open?.id === note.id ? (
                    <div className="note-ask" role="group" aria-label="Delete this note?">
                      <b>Delete this note?</b>
                      <div className="panel-actions">
                        <button type="button" className="panel-button dark" disabled={busy} onClick={() => onDelete(note.id)}>
                          Delete
                        </button>
                        <button type="button" className="panel-button" onClick={() => setOpen(null)}>
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="note-meta">
                      <time dateTime={note.at}>{age(note.at)}</time>
                      <button type="button" onClick={() => setOpen({ id: note.id, mode: "edit", text: note.text })}>
                        Edit
                      </button>
                      <button type="button" onClick={() => setOpen({ id: note.id, mode: "delete", text: note.text })}>
                        Delete
                      </button>
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {problem && (
        <p className="note-problem" role="alert">
          {problem}
        </p>
      )}

      {/* While a note is in "Edit" or "Delete", the field for a new one waits. */}
      {!open && (
        <form className="note-add" onSubmit={onAdd}>
          <NoteField label="Add a note" placeholder="Add a note" value={draft} onChange={setDraft} focus={saved.status === "ready" && notes.length === 0} />
          {full(draft) && <p className="note-limit">{LIMIT}</p>}
          {draft.trim() && (
            <div className="panel-actions">
              <button type="submit" className="panel-button dark" disabled={busy}>
                Save
              </button>
            </div>
          )}
        </form>
      )}
    </Sheet>
  );
}
