"use client";

import Link from "next/link";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { accountState, never, noSignInProblem, serverAccountState, signInProblem, signOut, subscribeToAccount } from "@/account/client";
import { Icon } from "@/components/icons";
import { SignInLink, useSignInLink } from "@/components/SignInLink";

// Off until the notices can be sent.
const NOTICES_ON = process.env.NEXT_PUBLIC_NOTICES === "on";

export const ACCOUNT_PAGE = "https://accounts.urantiahub.com";


const useProblem = () => useSyncExternalStore(never, signInProblem, noSignInProblem);

// The rows of the account in the reader settings, in three parts: who reads ("Sign in", or the way to
// the reader's page), "Saved", and "Sign out". With no part named, all three show. The progress and
// the notifications are on the reader's page (Kelson, 2026-10-12).
type Part = "who" | "pages" | "out";

export function AccountRows({ part }: { part?: Part }) {
  const has = (name: Part) => !part || part === name;
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const problem = useProblem();
  const [stuck, setStuck] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const signIn = useSignInLink();
  if (account.status === "off") return null;

  if (account.status === "out") {
    if (!has("who")) return null;
    return (
      <div className="account-rows">
        <a className="account-row" {...signIn.link}>
          <Icon name="person" />
          <span>
            {signIn.going ? "Opening the sign-in…" : "Sign in"}
            <small>Save paragraphs, write notes, and keep your place</small>
          </span>
          <Icon name="paperAfter" />
        </a>
        {problem && <p role="status">The sign-in did not finish. Try again.</p>}
      </div>
    );
  }

  const name = account.user?.name || account.user?.email || "Your account";
  return (
    <div className="account-rows">
      {has("who") && (
        <Link className="account-row who" href="/you">
          <span className="face" aria-hidden="true">
            {name.trim().charAt(0).toUpperCase()}
          </span>
          <span>
            {name}
            <small>Your page: progress{NOTICES_ON ? " and notifications" : ""}</small>
          </span>
          <Icon name="paperAfter" />
        </Link>
      )}
      {has("pages") && (
        <>
          <Link className="account-row" href="/saved">
            <Icon name="save" />
            <span>Saved</span>
            <Icon name="paperAfter" />
          </Link>
        </>
      )}
      {/* A sign-out takes a moment. The row says so, and a second press does nothing. */}
      {has("out") && (
        <button
          type="button"
          className="account-row"
          disabled={leaving}
          aria-busy={leaving}
          onClick={() => {
            setLeaving(true);
            setStuck(false);
            void signOut().then((done) => {
              setLeaving(false);
              setStuck(!done);
            });
          }}
        >
          <Icon name="signOut" />
          <span>{leaving ? "Signing out…" : "Sign out"}</span>
        </button>
      )}
      {has("out") && stuck && <p role="status">The sign-out did not finish, so you are still signed in. Try again.</p>}
    </div>
  );
}

// On the contents page, under "Continue": the one place that asks a reader to sign in.
// The invitation is in the server's HTML, so it has its room from the first paint. CSS shows it only
// while the page carries the mark of a reader with no account.
const SIGN_IN_ON = process.env.NEXT_PUBLIC_SIGN_IN === "on";

export function SignInInvite() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const problem = useProblem();
  const out = account.status === "out";
  useLayoutEffect(() => {
    const marks = document.documentElement.dataset;
    if (out) marks.guest = "";
    else if (account.status === "in") delete marks.guest;
    // The same for the link to Saved, which a signed-in reader gets.
    if (account.status === "in") marks.member = "";
    else if (out) delete marks.member;
  }, [out, account.status]);
  // "off" here is the page before the account started: the server, and the first render in the browser.
  if (!out && !(SIGN_IN_ON && account.status === "off")) return null;
  return (
    <div className="invite">
      <p>
        <strong>Save paragraphs and write notes</strong>
        {problem ? "The sign-in did not finish. Try again." : "Sign in, and they stay with you on each device."}
      </p>
      <SignInLink />
    </div>
  );
}

// On the contents page: the way to what a signed-in reader saved. It is in the server's HTML, and CSS
// shows it only while the page carries the mark of a signed-in reader, so it moves nothing when it shows.
export function SavedLink() {
  if (!SIGN_IN_ON) return null;
  return (
    <p className="saved-way">
      <Link href="/saved">
        <Icon name="save" />
        Saved
      </Link>
    </p>
  );
}
