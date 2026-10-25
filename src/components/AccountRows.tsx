"use client";

import Link from "next/link";
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import { accountState, never, noSignInProblem, serverAccountState, signInProblem, signOut, subscribeToAccount } from "@/account/client";
import { Icon } from "@/components/icons";
import { SignInLink, useSignInLink } from "@/components/SignInLink";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { pageHref, savedHref } from "@/i18n/paths";

// Off until the notices can be sent.
const NOTICES_ON = process.env.NEXT_PUBLIC_NOTICES === "on";

export const ACCOUNT_PAGE = "https://accounts.urantiahub.com";


const useProblem = () => useSyncExternalStore(never, signInProblem, noSignInProblem);

// The rows of the account in the reader settings, in three parts: who reads ("Sign in", or the way to
// the reader's page), "Saved", and "Sign out". With no part named, all three show. The progress and
// the notifications are on the reader's page (Kelson, 2026-10-12).
type Part = "who" | "pages" | "out";

export function AccountRows({ part, lang = "en" }: { part?: Part; lang?: Lang }) {
  const t = messages(lang);
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
            {signIn.going ? t.signInGoing : t.signIn}
            <small>{t.signInRowLine}</small>
          </span>
          <Icon name="paperAfter" />
        </a>
        {problem && <p role="status">{t.signInFailed}</p>}
      </div>
    );
  }

  const name = account.user?.name || account.user?.email || t.yourAccount;
  return (
    <div className="account-rows">
      {has("who") && (
        <Link className="account-row who" href={pageHref(lang, "/you")}>
          <span className="face" aria-hidden="true">
            {name.trim().charAt(0).toUpperCase()}
          </span>
          <span>
            {name}
            <small>{t.yourPage(NOTICES_ON)}</small>
          </span>
          <Icon name="paperAfter" />
        </Link>
      )}
      {has("pages") && (
        <>
          <Link className="account-row" href={savedHref(lang)}>
            <Icon name="save" />
            <span>{t.savedTitle}</span>
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
          <span>{leaving ? t.signingOut : t.signOut}</span>
        </button>
      )}
      {has("out") && stuck && <p role="status">{t.signOutStuck}</p>}
    </div>
  );
}

// On the contents page, under "Continue": the one place that asks a reader to sign in.
// The invitation is in the server's HTML, so it has its room from the first paint. CSS shows it only
// while the page carries the mark of a reader with no account.
const SIGN_IN_ON = process.env.NEXT_PUBLIC_SIGN_IN === "on";

export function SignInInvite({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const problem = useProblem();
  const out = account.status === "out";
  useLayoutEffect(() => {
    const marks = document.documentElement.dataset;
    if (out) marks.guest = "";
    else if (account.status === "in") delete marks.guest;
  }, [out, account.status]);
  // "off" here is the page before the account started: the server, and the first render in the browser.
  if (!out && !(SIGN_IN_ON && account.status === "off")) return null;
  return (
    <div className="invite">
      <p>
        <strong>{t.inviteTitle}</strong>
        {problem ? t.signInFailed : t.inviteLine}
      </p>
      <SignInLink lang={lang} />
    </div>
  );
}
