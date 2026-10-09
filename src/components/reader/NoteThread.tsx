"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { NOTE_MAX } from "@/account/note-limit";
import type { NoteResult } from "@/account/saved";
import type { SavedNote } from "@/account/saved-data";
import { age } from "@/reader/age";

type Props = {
  reference: string;
  // The notes of one paragraph, the oldest first.
  notes: readonly SavedNote[];
  // With no `add`, the thread has no field for a new note.
  add?: (reference: string, text: string) => Promise<NoteResult>;
  change: (id: string, text: string) => Promise<NoteResult>;
  remove: (id: string) => Promise<NoteResult>;
  // A long thread shows its last notes, and a link to all of them.
  last?: number;
  allHref?: string;
  focusField?: boolean;
};

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

// The notes of one paragraph as a thread: the oldest first, and the field for a new one at the end.
// "Edit" and "Delete" work on a note in its place, one note at a time.
export function NoteThread({ reference, notes: every, add, change, remove, last, allHref, focusField }: Props) {
  const cut = last !== undefined && every.length > last;
  const notes = cut ? every.slice(-last) : every;
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
    void run(() => add!(reference, text), "The note did not save. Try again.", () => setDraft(""));
  }

  function onChange(event: FormEvent) {
    event.preventDefault();
    const text = open?.text.trim();
    if (!open || !text || busy) return;
    void run(() => change(open.id, text), "The note did not save. Try again.", () => setOpen(null));
  }

  const onDelete = (id: string) => void run(() => remove(id), "The note is still here. Try again.", () => setOpen(null));

  return (
    <>
      {cut && allHref && (
        <Link className="note-all" href={allHref} prefetch={false}>
          See all {every.length} notes
        </Link>
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
      {add && !open && (
        <form className="note-add" onSubmit={onAdd}>
          <NoteField label="Add a note" placeholder="Add a note" value={draft} onChange={setDraft} focus={focusField} />
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
    </>
  );
}
