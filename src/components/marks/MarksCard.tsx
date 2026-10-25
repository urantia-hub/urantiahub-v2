"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { MARKS, markById, TIERS } from "@/marks/list";
import type { NextMark } from "@/marks/next";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { MarksShell } from "@/components/you/YouShell";
import { serverStreakView, streakView, streaksOn, subscribeToStreak } from "@/streak/client";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { markWords } from "@/marks/words";
import { MarkSymbol } from "./MarkSymbol";

const SHOWN = 8;

// The marks on /you: the earned ones, the newest first, then the 3 nearest. "See all" opens the four
// tiers in place. `place` puts the card below the streak on a phone and in the right column on a computer.
export function MarksCard({ place, lang = "en" }: { place: "stack" | "side"; lang?: Lang }) {
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  if (!view.card) return streaksOn() && account.status === "in" && !view.failed ? <MarksShell place={place} /> : null;
  if (!view.card.on) return null;
  return <MarksView marks={view.card.marks} next={view.card.nextMarks ?? []} place={place} lang={lang} />;
}

export function MarksView({ marks, next, place, lang = "en" }: { marks: Record<string, string>; next: readonly NextMark[]; place: "stack" | "side"; lang?: Lang }) {
  const t = messages(lang).marks;
  const words = markWords(lang);
  const [open, setOpen] = useState(false);
  const allId = useId();
  const earned = earnedNewestFirst(marks);
  return (
    <section className={`you-card marks-card marks-${place}`} aria-label={t.title}>
      <p className="marks-head">
        <b>{t.title}</b>
        <span>{t.of(earned.length, MARKS.length)}</span>
      </p>
      {earned.length > 0 && (
        <ul className="marks-got" aria-label={t.earned}>
          {earned.slice(0, SHOWN).map((id) => {
            const mark = markById(id);
            return mark ? (
              <li key={id}>
                <MarkSymbol tier={mark.tier} symbol={mark.symbol} />
                <small>{words.name(mark.id)}</small>
              </li>
            ) : null;
          })}
          {earned.length > SHOWN && <li className="marks-more-count">+{earned.length - SHOWN}</li>}
        </ul>
      )}
      {next.length > 0 && (
        <>
          <p className="marks-sub">{t.next}</p>
          <ul className="marks-next">
            {next.map((item) => {
              const mark = markById(item.id);
              if (!mark) return null;
              return (
                <li key={item.id}>
                  <MarkSymbol tier={mark.tier} symbol={mark.symbol} />
                  <div>
                    <b>{words.name(mark.id)}</b>
                    <small>{item.line}</small>
                    {item.progress !== null && (
                      <span className="marks-bar" role="progressbar" aria-label={t.progress(words.name(mark.id))} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.progress * 100)}>
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
        {open ? t.less : t.seeAll(MARKS.length)}
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
                <b>{words.tier(tier.tier).name}</b>
                <small>{words.tier(tier.tier).line}</small>
                <span>{t.of(list.filter((mark) => marks[mark.id]).length, list.length)}</span>
              </p>
              <ul>
                {list.map((mark) => (
                  <li key={mark.id} data-earned={marks[mark.id] ? "" : undefined}>
                    <MarkSymbol tier={mark.tier} symbol={mark.symbol} />
                    <b>{words.name(mark.id)}</b>
                    <small>{marks[mark.id] ? t.earnedMark : words.effort(mark.id)}</small>
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
