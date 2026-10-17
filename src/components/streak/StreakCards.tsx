"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { StreakCard } from "@/account/streak-data";
import { changeStreakSettings, loadStreak, openStreakQuestion, serverStreakView, streakView, streaksOn, subscribeToStreak } from "@/streak/client";
import { GRACE_RETURNS_AFTER } from "@/streak/rules";

const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const weekday = (day: string) => LETTERS[new Date(`${day}T12:00:00Z`).getUTCDay()];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const KIND_WORDS = { met: "goal met", grace: "grace day", missed: "missed", today: "today", none: "no reading" } as const;

type On = Extract<StreakCard, { on: true }>;

// The streak and the whole book, at the top of the progress on /you. A reader with no streak sees one
// row that opens the question.
export function StreakCards() {
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  useEffect(() => void loadStreak(), []);
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
    <>
      <StreakCardView card={view.card} />
      <BookCardView book={view.card.book} />
    </>
  );
}

export function StreakCardView({ card }: { card: On }) {
  const { state, next } = card;
  const [busy, setBusy] = useState(false);
  const filled = state.graceReady ? GRACE_RETURNS_AFTER : GRACE_RETURNS_AFTER - state.graceBackIn;
  return (
    <div className="you-card streak-card">
      <p className="streak-label">Streak</p>
      <p className="streak-big">
        <b>{state.current}</b>
        <span>day streak</span>
      </p>
      <ol className="streak-week" aria-label="The last 7 days">
        {state.week.map((cell) => (
          <li key={cell.day} data-kind={cell.kind} aria-label={`${cell.day}: ${KIND_WORDS[cell.kind]}`}>
            <i />
            {weekday(cell.day)}
          </li>
        ))}
      </ol>
      <div className="streak-facts">
        <div>
          <b className="streak-pips" aria-hidden="true">
            {Array.from({ length: GRACE_RETURNS_AFTER }, (_, i) => (
              <i key={i} data-full={i < filled ? "" : undefined} />
            ))}
          </b>
          <small>{state.graceReady ? "1 grace day ready" : `grace day back in ${plural(state.graceBackIn, "day", "days")}`}</small>
        </div>
        <div>
          <b>{state.longest}</b>
          <small>longest streak</small>
        </div>
        <div>
          <b>{card.goal}</b>
          <small>{card.goal === 1 ? "section a day" : "sections a day"}</small>
        </div>
      </div>
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

export function BookCardView({ book }: { book: On["book"] }) {
  const share = book.total > 0 ? Math.floor((book.done / book.total) * 100) : 0;
  return (
    <div className="you-card streak-card">
      <p className="streak-label">The whole book</p>
      <p className="streak-big">
        <b>{book.done.toLocaleString("en-US")}</b>
        <span>of {book.total.toLocaleString("en-US")} sections</span>
      </p>
      <div className="streak-line" role="progressbar" aria-valuemin={0} aria-valuemax={book.total} aria-valuenow={book.done} aria-label="Sections of the whole book">
        <i style={{ width: `${(book.done / Math.max(1, book.total)) * 100}%` }} />
      </div>
      <small>{share}% · this number never goes down</small>
    </div>
  );
}
