"use client";

import Link from "next/link";
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
  const others = notes.length - 1;
  // The newest note is the last of the thread. With all notes open, they read from the oldest.
  const shown = all ? notes : notes.slice(-1);
  // A tall card scrolls inside. It fades at its end while more of it is below.
  const box = useRef<HTMLElement>(null);
  const [more, setMoreBelow] = useState(false);
  const look = () => {
    const el = box.current;
    if (el) setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 2);
  };
  useLayoutEffect(look);
  return (
    <aside className="margin-card" data-for={reference} data-more={more ? "" : undefined} aria-label={`Your notes on ${reference}`} ref={box} onScroll={look}>
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
      {others > 0 && notes.length <= IN_PLACE && (
        <button type="button" className="margin-more" aria-expanded={all} onClick={() => setAll((was) => !was)}>
          {all ? "Show fewer" : `${others} more ${others === 1 ? "note" : "notes"}`}
        </button>
      )}
      {notes.length > IN_PLACE && (
        <Link className="margin-more" href={`/saved?ref=${encodeURIComponent(reference)}`} prefetch={false}>
          See all {notes.length} notes
        </Link>
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
      // The card of the marked paragraph sits at its paragraph. The other cards make room.
      const marked = paper.querySelector(".para[data-picked]")?.id;
      const chosen = cards.findIndex((card) => card.dataset.for === marked);
      placeCards(wanted, 12, chosen).forEach((top, i) => {
        cards[i].style.top = `${Math.round(top)}px`;
      });
    };
    arrange();
    // The text size, the fonts, the window, and an opened card each change a height.
    const watch = new ResizeObserver(arrange);
    watch.observe(paper);
    for (const card of box.querySelectorAll(".margin-card")) watch.observe(card);
    const marks = new MutationObserver(arrange);
    marks.observe(paper, { subtree: true, attributes: true, attributeFilter: ["data-picked"] });
    return () => {
      watch.disconnect();
      marks.disconnect();
    };
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
