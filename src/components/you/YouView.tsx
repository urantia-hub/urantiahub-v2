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
import { sortEntries } from "@/saved/list";

const NOTICES_ON = process.env.NEXT_PUBLIC_NOTICES === "on";
const NEWEST = 3;
const hourLabel = (hour: number) => `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`;

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
export function dailyLine(notices: Notices): string {
  const { email, push, hour } = notices.settings;
  const ways = [email.daily && "email", push.daily && "a notification"].filter(Boolean);
  return ways.length === 0 ? "Off" : `By ${ways.join(" and ")}, at ${hourLabel(hour)}`;
}

// The reader's own page: the account, the progress, the newest saved paragraphs, the notifications,
// and the sign-out.
export function YouView() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const key = account.status === "in" ? (account.user?.key ?? null) : null;
  const saved = useReaderData<SavedEntry[]>("/api/me/saved", key, readSaved);
  const notices = useReaderData<Notices>(NOTICES_ON ? "/api/me/notices" : null, key, readNotices);

  if (account.status !== "in") {
    return (
      <div className="saved-page you-page">
        <h1>Your page</h1>
        <div className="saved-empty">
          <b>Your progress and what you saved</b>
          Sign in, and UrantiaHub keeps count of the paragraphs that you read, with your saved paragraphs and your notes.
          {account.status === "out" && <SignInLink className="saved-button" />}
        </div>
      </div>
    );
  }

  const name = account.user?.name || account.user?.email || "Your account";
  const newest = Array.isArray(saved) ? sortEntries(saved, "newest").slice(0, NEWEST) : [];
  return (
    <div className="saved-page you-page">
      <header className="you-who">
        <span className="you-face" aria-hidden="true">
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <div>
          <h1>{name}</h1>
          {account.user?.name && account.user.email && <p>{account.user.email}</p>}
        </div>
        <a href={ACCOUNT_PAGE} target="_blank" rel="noopener">
          Account
          <span className="sr-only"> (your UrantiaHub account, opens in a new tab)</span>
          <Icon name="external" />
        </a>
      </header>

      <div className="you-cols">
        <section aria-labelledby="you-progress">
          <h2 id="you-progress">Progress</h2>
          <ProgressView />
        </section>

        <div>
          <section aria-labelledby="you-saved">
            <h2 id="you-saved">
              Saved
              {Array.isArray(saved) && saved.length > 0 && <Link href="/saved">See all {saved.length}</Link>}
            </h2>
            {saved === null && <p className="progress-wait" role="status" aria-label="Loading what you saved" />}
            {saved === "failed" && (
              <p className="saved-empty">
                What you saved did not load. <Link href="/saved">Open Saved</Link>
              </p>
            )}
            {Array.isArray(saved) && saved.length === 0 && (
              <p className="saved-empty">
                <b>Nothing saved yet</b>
                Press a paragraph, then Save or Note.
              </p>
            )}
            {newest.length > 0 && (
              <div className="you-card">
                {newest.map((entry) => (
                  <Link className="you-saved" key={entry.ref} href={`/saved?ref=${encodeURIComponent(entry.ref)}`} prefetch={false}>
                    <small>
                      {entry.savedAt && <Icon name="saved" />}
                      {entry.ref}
                      {entry.notes.length > 0 && ` · ${entry.notes.length} ${entry.notes.length === 1 ? "note" : "notes"}`}
                    </small>
                    <span>{entry.text}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {NOTICES_ON && (
            <section aria-labelledby="you-notices">
              <h2 id="you-notices">Notifications</h2>
              <div className="you-card">
                <Link className="you-row" href="/notifications">
                  <Icon name="bell" />
                  <span>
                    A passage each day
                    <small>{notices && notices !== "failed" ? dailyLine(notices) : " "}</small>
                  </span>
                  <Icon name="paperAfter" />
                </Link>
              </div>
            </section>
          )}

          <div className="you-out">
            <AccountRows part="out" />
          </div>
        </div>
      </div>
    </div>
  );
}
