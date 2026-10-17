"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import type { StreakCard } from "@/account/streak-data";
import { MarksCard } from "@/components/marks/MarksCard";
import { changeStreakSettings, loadStreak, openStreakQuestion, serverStreakView, streakView, streaksOn, subscribeToStreak } from "@/streak/client";

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const weekday = (day: string) => LETTERS[new Date(`${day}T12:00:00Z`).getUTCDay()];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const KIND_WORDS = { met: "goal met", grace: "grace day", missed: "missed", today: "today", none: "no reading" } as const;

type On = Extract<StreakCard, { on: true }>;

// The streak and the whole book, at the top of the progress on /you. A reader with no streak sees one
// row that opens the question.
export function StreakCards() {
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  // The card loads when the page knows the reader.
  useEffect(() => void loadStreak(), [key]);
  if (!streaksOn() || !view.card) return null;
  if (!view.card.on)
    return (
      <button type="button" className="streak-off" onClick={openStreakQuestion}>
        <span>
          Keep a streak
          <small>One section a day, about 5 minutes</small>
        </span>
      </button>
    );
  return (
    <div className="streak-cards">
      <StreakCardView card={view.card} />
      <MarksCard place="stack" />
    </div>
  );
}

export function StreakCardView({ card }: { card: On }) {
  const { state, next } = card;
  const [busy, setBusy] = useState(false);
  return (
    <div className="you-card streak-card">
      <p className="streak-label">Streak</p>
      <p className="streak-big">
        <b>{state.current}</b>
        <span>day streak</span>
        {state.longest > state.current && <em>longest {state.longest}</em>}
      </p>
      <ol className="streak-week" aria-label="The last 7 days">
        {state.week.map((cell, i) => (
          <li key={cell.day} data-kind={cell.kind} data-today={i === state.week.length - 1 ? "" : undefined} aria-label={`${cell.day}: ${KIND_WORDS[cell.kind]}`}>
            <i />
            {weekday(cell.day)}
          </li>
        ))}
      </ol>
      <p className="streak-facts">
        {state.graceReady ? "1 grace day ready" : `Grace day back in ${plural(state.graceBackIn, "day", "days")}`} · <b>{card.goal}</b> {card.goal === 1 ? "section a day" : "sections a day"}
      </p>
      <div className="streak-next">
        <div>
          <b>{next.title}</b>
          <small>
            {next.paper} · about {next.minutes} min
          </small>
        </div>
        <Link href={next.href}>Read</Link>
        <Link className="listen" href={listenHref(next.href)}>
          Listen
        </Link>
      </div>
      <BookLine book={card.book} />
      <button
        type="button"
        className="streak-stop"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await changeStreakSettings({ on: false });
          setBusy(false);
        }}
      >
        Turn off the streak
      </button>
    </div>
  );
}

// The paper address with `?listen=1` before its section anchor.
export function listenHref(href: string): string {
  const at = href.indexOf("#");
  return at === -1 ? `${href}?listen=1` : `${href.slice(0, at)}?listen=1${href.slice(at)}`;
}

// The whole book, as one line at the foot of the streak card. The number never goes down.
export function BookLine({ book }: { book: On["book"] }) {
  return (
    <div className="streak-book">
      <span>
        The whole book · <b>{book.done.toLocaleString("en-US")}</b> of {book.total.toLocaleString("en-US")} sections
      </span>
      <div className="streak-line" role="progressbar" aria-valuemin={0} aria-valuemax={book.total} aria-valuenow={book.done} aria-label="Sections of the whole book">
        <i style={{ width: `${(book.done / Math.max(1, book.total)) * 100}%` }} />
      </div>
    </div>
  );
}
