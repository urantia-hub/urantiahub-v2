"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import type { Notices } from "@/account/notices";
import { readerCall } from "@/account/reader-call";
import type { AllSaved, SavedEntry } from "@/account/saved-data";
import { ACCOUNT_PAGE, AccountRows } from "@/components/AccountRows";
import { Icon } from "@/components/icons";
import { ProgressView } from "@/components/progress/ProgressView";
import { SignInLink } from "@/components/SignInLink";
import { MarksCard } from "@/components/marks/MarksCard";
import { StreakCards } from "@/components/streak/StreakCards";
import { sortEntries } from "@/saved/list";
import { IN_COOKIE } from "@/account/cookies";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { pageHref, savedHref } from "@/i18n/paths";
import { MarksShell, ProgressShell, SavedShell, StreakShell, WhoShell } from "./YouShell";

const NOTICES_ON = process.env.NEXT_PUBLIC_NOTICES === "on";
const SIGN_IN_ON = process.env.NEXT_PUBLIC_SIGN_IN === "on";
const STREAKS_ON = process.env.NEXT_PUBLIC_STREAKS === "on";
// Runs before the first paint: the page from the server holds both the invitation and the shell, and the
// sign-in mark decides which one shows.
const YOU_INIT_SCRIPT = `try{if(/(^|; )${IN_COOKIE}=1/.test(document.cookie))document.documentElement.dataset.youIn=""}catch(e){}`;
const NEWEST = 3;

type Loaded<T> = { for: string | null; value: T | null | "failed" };

// One answer of the reader's data for this page. Another reader, or a sign-out: the answer goes.
function useReaderData<T>(path: string | null, key: string | null, read: (body: unknown) => T | null): T | null | "failed" {
  const [data, setData] = useState<Loaded<T>>({ for: null, value: null });
  if (data.for !== key) setData({ for: key, value: null });
  useEffect(() => {
    if (!key || !path) return;
    let current = true;
    void readerCall(path).then((body) => {
      if (current) setData({ for: key, value: read(body) ?? "failed" });
    });
    return () => {
      current = false;
    };
    // `read` is a plain function of the caller, the same at each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, path]);
  return data.value;
}

const readSaved = (body: unknown) => (Array.isArray((body as Partial<AllSaved> | null)?.entries) ? (body as AllSaved).entries : null);
const readNotices = (body: unknown) => ((body as Notices | null)?.settings ? (body as Notices) : null);

// What the notices of a passage each day do now, in one line.
export function dailyLine(notices: Notices, lang: Lang = "en"): string {
  const t = messages(lang);
  const { email, push, hour } = notices.settings;
  const ways = [email.daily && t.you.byEmail, push.daily && t.you.byPush].filter(Boolean);
  return ways.length === 0 ? t.you.off : t.you.dailyLine(ways.join(t.you.and), t.notices.hour(hour));
}

// The reader's own page: the account, the progress, the newest saved paragraphs, the notifications,
// and the sign-out.
export function YouView({ lang = "en" }: { lang?: Lang }) {
  const all = messages(lang);
  const t = all.you;
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  const saved = useReaderData<SavedEntry[]>(lang === "es" ? "/api/me/saved?lang=es" : "/api/me/saved", key, readSaved);
  const notices = useReaderData<Notices>(NOTICES_ON ? "/api/me/notices" : null, key, readNotices);

  const accountLink = (
    <a href={ACCOUNT_PAGE} target="_blank" rel="noopener">
      {t.account}
      <span className="sr-only">{t.accountHint}</span>
      <Icon name="external" />
    </a>
  );

  if (account.status !== "in") {
    const guest = (
      <div className="saved-page you-page you-guest">
        <h1>{t.title}</h1>
        <div className="saved-empty">
          <b>{t.guestTitle}</b>
          {t.guestLine}
          {account.status === "out" && <SignInLink className="saved-button" lang={lang} />}
        </div>
      </div>
    );
    // Before the page knows the reader ("off" on the server and at the first render), both wait in the page.
    if (account.status === "out" || !SIGN_IN_ON) return guest;
    return (
      <div className="you-first">
        <script dangerouslySetInnerHTML={{ __html: YOU_INIT_SCRIPT }} />
        {guest}
        <div className="saved-page you-page you-shell-page">
          <WhoShell account={accountLink} lang={lang} />
          <div className="you-cols">
            <section>
              <h2>{t.progress}</h2>
              {STREAKS_ON && <StreakShell lang={lang} />}
              <ProgressShell lang={lang} />
            </section>
            <div>
              {STREAKS_ON && <MarksShell place="side" />}
              <section>
                <h2>{t.saved}</h2>
                <SavedShell lang={lang} />
              </section>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const user = account.user;
  const name = user?.name || user?.email || "";
  const savedPage = savedHref(lang);
  const newest = Array.isArray(saved) ? sortEntries(saved, "newest").slice(0, NEWEST) : [];
  return (
    <div className="saved-page you-page">
      {user ? (
        <header className="you-who">
          <span className="you-face" aria-hidden="true">
            {name.trim().charAt(0).toUpperCase()}
          </span>
          <div>
            <h1>{name || all.yourAccount}</h1>
            {user.name && user.email && <p>{user.email}</p>}
          </div>
          {accountLink}
        </header>
      ) : (
        <WhoShell account={accountLink} lang={lang} />
      )}

      <div className="you-cols">
        <section aria-labelledby="you-progress">
          <h2 id="you-progress">{t.progress}</h2>
          <StreakCards lang={lang} />
          <ProgressView lang={lang} />
        </section>

        <div>
          <MarksCard place="side" lang={lang} />
          <section aria-labelledby="you-saved">
            <h2 id="you-saved">
              {t.saved}
              {Array.isArray(saved) && saved.length > 0 && <Link href={savedPage}>{t.seeAll(saved.length)}</Link>}
            </h2>
            {saved === null && <SavedShell lang={lang} />}
            {saved === "failed" && (
              <p className="saved-empty">
                {t.savedFailed} <Link href={savedPage}>{t.openSaved}</Link>
              </p>
            )}
            {Array.isArray(saved) && saved.length === 0 && (
              <p className="saved-empty">
                <b>{t.nothingSaved}</b>
                {t.nothingSavedLine}
              </p>
            )}
            {newest.length > 0 && (
              <div className="you-card">
                {newest.map((entry) => (
                  <Link className="you-saved" key={entry.ref} href={savedHref(lang, entry.ref)} prefetch={false}>
                    <small>
                      {entry.savedAt && <Icon name="saved" />}
                      {entry.ref}
                      {entry.notes.length > 0 && ` · ${t.noteCount(entry.notes.length)}`}
                    </small>
                    <span>{entry.text}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {NOTICES_ON && (
            <section aria-labelledby="you-notices">
              <h2 id="you-notices">{t.notifications}</h2>
              <div className="you-card">
                <Link className="you-row" href={pageHref(lang, "/notifications")}>
                  <Icon name="bell" />
                  <span>
                    {t.daily}
                    <small>{notices && notices !== "failed" ? dailyLine(notices, lang) : " "}</small>
                  </span>
                  <Icon name="paperAfter" />
                </Link>
              </div>
            </section>
          )}

          <div className="you-out">
            <AccountRows part="out" lang={lang} />
          </div>
        </div>
      </div>
    </div>
  );
}
