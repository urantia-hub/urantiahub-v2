"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import type { StreakCard } from "@/account/streak-data";
import { Icon } from "@/components/icons";
import { MarksCard } from "@/components/marks/MarksCard";
import { StreakShell } from "@/components/you/YouShell";
import { type Lang, numberIn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { changeStreakSettings, loadStreak, openStreakQuestion, serverStreakView, streakView, streaksOn, subscribeToStreak } from "@/streak/client";

const weekday = (day: string, letters: string) => letters[new Date(`${day}T12:00:00Z`).getUTCDay()];

type On = Extract<StreakCard, { on: true }>;

// The streak and the whole book, at the top of the progress on /you. A reader with no streak sees one
// row that opens the question.
export function StreakCards({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang).streak;
  const view = useSyncExternalStore(subscribeToStreak, streakView, serverStreakView);
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  // The card loads when the page knows the reader.
  useEffect(() => void loadStreak(), [key]);
  if (!streaksOn() || account.status !== "in") return null;
  // The card keeps its room while it loads; a card that failed takes none.
  if (!view.card) return view.failed ? null : <StreakShell lang={lang} />;
  if (!view.card.on)
    return (
      <div className="you-card streak-off">
        <button type="button" className="you-row" onClick={openStreakQuestion}>
          <Icon name="progress" />
          <span>
            {t.keep}
            <small>{t.keepLine}</small>
          </span>
          <Icon name="paperAfter" />
        </button>
      </div>
    );
  return (
    <div className="streak-cards">
      <StreakCardView card={view.card} lang={lang} />
      <MarksCard place="stack" lang={lang} />
    </div>
  );
}

export function StreakCardView({ card, lang = "en" }: { card: On; lang?: Lang }) {
  const t = messages(lang).streak;
  const kinds = { met: t.met, grace: t.grace, missed: t.missed, today: t.today, none: t.none };
  const { state, next } = card;
  const [busy, setBusy] = useState(false);
  return (
    <div className="you-card streak-card">
      <p className="streak-label">{t.label}</p>
      <p className="streak-big">
        <b>{state.current}</b>
        <span>{t.dayStreak(state.current)}</span>
        {state.longest > state.current && <em>{t.longest(state.longest)}</em>}
      </p>
      <ol className="streak-week" aria-label={t.week}>
        {state.week.map((cell, i) => (
          <li key={cell.day} data-kind={cell.kind} data-today={i === state.week.length - 1 ? "" : undefined} aria-label={`${cell.day}: ${kinds[cell.kind]}`}>
            <i />
            {weekday(cell.day, t.letters)}
          </li>
        ))}
      </ol>
      <p className="streak-facts">
        {state.graceReady ? t.graceReady : t.graceBack(state.graceBackIn)} · <b>{card.goal}</b> {t.perDay(card.goal)}
      </p>
      <div className="streak-next">
        <div>
          <b>{next.title}</b>
          <small>
            {next.paper} · {t.minutes(next.minutes)}
          </small>
        </div>
        <Link href={next.href}>{t.read}</Link>
        <Link className="listen" href={listenHref(next.href)}>
          {t.listen}
        </Link>
      </div>
      <BookLine book={card.book} lang={lang} />
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
        {t.stop}
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
export function BookLine({ book, lang = "en" }: { book: On["book"]; lang?: Lang }) {
  const t = messages(lang).streak;
  const count = numberIn(lang);
  return (
    <div className="streak-book">
      <span>
        {t.book}
        <b>{count(book.done)}</b>
        {t.ofSections(count(book.total))}
      </span>
      <div className="streak-line" role="progressbar" aria-valuemin={0} aria-valuemax={book.total} aria-valuenow={book.done} aria-label={t.bookLabel}>
        <i style={{ width: `${(book.done / Math.max(1, book.total)) * 100}%` }} />
      </div>
    </div>
  );
}
