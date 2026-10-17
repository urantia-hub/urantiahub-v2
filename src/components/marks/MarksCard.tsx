"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { MARKS, markById, TIERS } from "@/marks/list";
import type { NextMark } from "@/marks/next";
import { serverStreakView, streakView, subscribeToStreak } from "@/streak/client";
import { MarkSymbol } from "./MarkSymbol";

const SHOWN = 8;

// The marks on /you: the earned ones, the newest first, then the 3 nearest. "See all" opens the four
// tiers in place. `place` puts the card below the streak on a phone and in the right column on a computer.
export function MarksCard({ place }: { place: "stack" | "side" }) {
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  if (!view.card?.on) return null;
  return <MarksView marks={view.card.marks} next={view.card.nextMarks ?? []} place={place} />;
}

export function MarksView({ marks, next, place }: { marks: Record<string, string>; next: readonly NextMark[]; place: "stack" | "side" }) {
  const [open, setOpen] = useState(false);
  const allId = useId();
  const earned = earnedNewestFirst(marks);
  return (
    <section className={`you-card marks-card marks-${place}`} aria-label="Marks">
      <p className="marks-head">
        <b>Marks</b>
        <span>
          {earned.length} of {MARKS.length}
        </span>
      </p>
      {earned.length > 0 && (
        <ul className="marks-got" aria-label="Earned">
          {earned.slice(0, SHOWN).map((id) => {
            const mark = markById(id);
            return mark ? (
              <li key={id}>
                <MarkSymbol tier={mark.tier} symbol={mark.symbol} />
                <small>{mark.name}</small>
              </li>
            ) : null;
          })}
          {earned.length > SHOWN && <li className="marks-more-count">+{earned.length - SHOWN}</li>}
        </ul>
      )}
      {next.length > 0 && (
        <>
          <p className="marks-sub">Next</p>
          <ul className="marks-next">
            {next.map((item) => {
              const mark = markById(item.id);
              if (!mark) return null;
              return (
                <li key={item.id}>
                  <MarkSymbol tier={mark.tier} symbol={mark.symbol} />
                  <div>
                    <b>{mark.name}</b>
                    <small>{item.line}</small>
                    {item.progress !== null && (
                      <span className="marks-bar" role="progressbar" aria-label={`${mark.name}, progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)}>
                        <i style={{ width: `${item.progress * 100}%` }} />
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <button type="button" className="marks-all-toggle" aria-expanded={open} aria-controls={allId} onClick={() => setOpen(!open)}>
        {open ? "Show less" : `See all ${MARKS.length} marks`}
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <div id={allId} className="marks-all" hidden={!open}>
        {TIERS.map((tier) => {
          const list = MARKS.filter((mark) => mark.tier === tier.tier);
          return (
            <div key={tier.tier} className={`marks-tier tier-${tier.tier}`}>
              <p className="marks-tier-head">
                <b>{tier.name}</b>
                <small>{tier.line}</small>
                <span>
                  {list.filter((mark) => marks[mark.id]).length} of {list.length}
                </span>
              </p>
              <ul>
                {list.map((mark) => (
                  <li key={mark.id} data-earned={marks[mark.id] ? "" : undefined}>
                    <MarkSymbol tier={mark.tier} symbol={mark.symbol} />
                    <b>{mark.name}</b>
                    <small>{marks[mark.id] ? "✓ earned" : mark.effort}</small>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// The earned marks, the newest first; two of the same time keep the later one in the list first.
export function earnedNewestFirst(marks: Record<string, string>): string[] {
  const order = new Map(MARKS.map((mark, i) => [mark.id, i]));
  return Object.keys(marks)
    .filter((id) => order.has(id))
    .sort((a, b) => marks[b].localeCompare(marks[a]) || (order.get(b) ?? 0) - (order.get(a) ?? 0));
}
