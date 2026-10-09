"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SavedNote } from "@/account/saved-data";
import { age } from "@/reader/age";
import { placeCards } from "@/reader/margin-layout";

// A card shows up to this many notes in its place. A longer thread opens in "Your notes".
const IN_PLACE = 3;
const LONG = 110;

function Card({ reference, notes }: { reference: string; notes: SavedNote[] }) {
  const [all, setAll] = useState(false);
  const [whole, setWhole] = useState<ReadonlySet<string>>(new Set());
  const more = notes.length - 1;
  // The newest note is the last of the thread. With all notes open, they read from the oldest.
  const shown = all ? notes : notes.slice(-1);
  return (
    <aside className="margin-card" data-for={reference} aria-label={`Your notes on ${reference}`}>
      {shown.map((note) => {
        const long = note.text.length > LONG || note.text.includes("\n");
        const open = whole.has(note.id);
        return (
          <div className="margin-note" key={note.id}>
            <small>{age(note.at)}</small>
            {/* A press on a note opens "Your notes", where the reader edits it. The controls of the paper do that. */}
            <button type="button" className={`margin-text${long && !open ? " clamp" : ""}`} data-notes-for={reference} aria-label={`Open your notes on ${reference}`}>
              {note.text}
            </button>
            {long && (
              <button type="button" className="margin-link" aria-expanded={open} onClick={() => setWhole((was) => new Set(open ? [...was].filter((id) => id !== note.id) : [...was, note.id]))}>
                {open ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        );
      })}
      {more > 0 && notes.length <= IN_PLACE && (
        <button type="button" className="margin-more" aria-expanded={all} onClick={() => setAll((was) => !was)}>
          {all ? "Show fewer" : `${more} more ${more === 1 ? "note" : "notes"}`}
        </button>
      )}
      {notes.length > IN_PLACE && (
        <button type="button" className="margin-more" data-notes-for={reference}>
          See all {notes.length} notes
        </button>
      )}
    </aside>
  );
}

// On a wide screen: the reader's notes in the right margin, each card at the top of its paragraph.
// The cards are outside the flow of the text, so they move no line of it. CSS hides them on a narrow screen.
export default function MarginNotes({ notes }: { notes: readonly SavedNote[] }) {
  const layer = useRef<HTMLDivElement>(null);
  const paper = typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".paper");
  const threads = new Map<string, SavedNote[]>();
  for (const note of notes) threads.set(note.ref, [...(threads.get(note.ref) ?? []), note]);

  useLayoutEffect(() => {
    const box = layer.current;
    if (!paper || !box) return;
    const arrange = () => {
      const cards = [...box.querySelectorAll<HTMLElement>(".margin-card")];
      const from = paper.getBoundingClientRect().top;
      const wanted = cards.map((card) => {
        const paragraph = document.getElementById(card.dataset.for ?? "");
        return { top: paragraph ? paragraph.getBoundingClientRect().top - from : 0, height: card.offsetHeight };
      });
      placeCards(wanted).forEach((top, i) => {
        cards[i].style.top = `${Math.round(top)}px`;
      });
    };
    arrange();
    // The text size, the fonts, the window, and an opened card each change a height.
    const watch = new ResizeObserver(arrange);
    watch.observe(paper);
    for (const card of box.querySelectorAll(".margin-card")) watch.observe(card);
    return () => watch.disconnect();
  });

  if (!paper) return null;
  return createPortal(
    <div className="margin-notes" ref={layer}>
      {[...threads].map(([reference, thread]) => (
        <Card key={reference} reference={reference} notes={thread} />
      ))}
    </div>,
    paper,
  );
}
