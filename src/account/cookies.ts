// The names of the account cookies. This file holds nothing else, so browser code can import it.

export const SESSION_COOKIE = "hub_session";
export const START_COOKIE = "hub_signin_start";
// Set at a sign-out, removed at the next finished sign-in. While it is there, a sign-in is not silent:
// after a sign-out the reader is still signed in on the accounts site.
export const ASK_COOKIE = "hub_ask_account";
// "1" while a reader is signed in. A script can read it, and it holds nothing else: the page reads it
// before the first paint, so a signed-in reader never sees the invitation to sign in.
export const IN_COOKIE = "hub_in";
// "1" for a minute after a sign-in that did not finish, so the page can say so one time.
export const PROBLEM_COOKIE = "hub_signin_problem";
