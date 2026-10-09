"use client";

import { type MouseEvent, useState, useSyncExternalStore } from "react";
import { accountState, never, noSignInProblem, serverAccountState, signInHref, signInProblem, signOut, subscribeToAccount } from "@/account/client";
import { Icon } from "@/components/icons";

export const ACCOUNT_PAGE = "https://accounts.urantiahub.com";

// The link to the sign-in. Its address holds this page and this paragraph, so it is made at the press.
const toSignIn = { href: "/api/auth/start", onClick: (event: MouseEvent<HTMLAnchorElement>) => void (event.currentTarget.href = signInHref()) };

const useProblem = () => useSyncExternalStore(never, signInProblem, noSignInProblem);

// The end of the reader settings: "Sign in", or the reader's account and "Sign out".
export function AccountRows() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const problem = useProblem();
  const [stuck, setStuck] = useState(false);
  if (account.status === "off") return null;

  if (account.status === "out") {
    return (
      <div className="account-rows">
        <a className="account-row" {...toSignIn}>
          <Icon name="person" />
          <span>
            Sign in
            <small>Keep your place and your settings on each device</small>
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
      <a className="account-row who" href={ACCOUNT_PAGE} target="_blank" rel="noopener">
        <span className="face" aria-hidden="true">
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <span>
          {name}
          {account.user?.name && account.user.email && <small>{account.user.email}</small>}
          <span className="sr-only"> (your UrantiaHub account, opens in a new tab)</span>
        </span>
        <Icon name="external" />
      </a>
      <button type="button" className="account-row" onClick={() => void signOut().then((done) => setStuck(!done))}>
        <Icon name="signOut" />
        <span>Sign out</span>
      </button>
      {stuck && <p role="status">The sign-out did not finish, so you are still signed in. Try again.</p>}
    </div>
  );
}

// On the contents page, under "Continue": the one place that asks a reader to sign in.
export function SignInInvite() {
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const problem = useProblem();
  if (account.status !== "out") return null;
  return (
    <div className="invite">
      <p>
        <strong>Keep your place and your settings</strong>
        {problem ? "The sign-in did not finish. Try again." : "Sign in, and they follow you to each device."}
      </p>
      <a {...toSignIn}>
        Sign in
      </a>
    </div>
  );
}
