"use client";

import { useSyncExternalStore } from "react";
import { MARKS, TIERS } from "@/marks/list";
import { serverStreakView, streakView, subscribeToStreak } from "@/streak/client";
import { MarkSymbol } from "./MarkSymbol";

// The marks on /you, in four tiers. An earned mark is at full strength; one not earned yet shows what
// it takes. `place` puts the card below the streak on a phone and in the right column on a computer.
export function MarksCard({ place }: { place: "stack" | "side" }) {
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  if (!view.card?.on) return null;
  return <MarksView marks={view.card.marks} place={place} />;
}

export function MarksView({ marks, place }: { marks: Record<string, string>; place: "stack" | "side" }) {
  const earned = MARKS.filter((mark) => marks[mark.id]).length;
  return (
    <section className={`you-card marks-card marks-${place}`} aria-label="Marks">
      <p className="streak-label">
        Marks · {earned} of {MARKS.length}
      </p>
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
    </section>
  );
}
