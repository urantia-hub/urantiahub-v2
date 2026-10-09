// One call to the API for a signed-in reader, with what it means for the session.
// The API can refuse a token that this server still holds as good: the token ended early, the reader
// removed the Hub's access, or the account is deleted. Only a refusal ends the sign-in. An outage does not.

import { AuthError } from "@urantia/auth/server";
import { needsRefresh, type Session } from "./session";

// The API answered 401 for the reader's token.
export class Refused extends Error {
  constructor() {
    super("The API refused the token.");
  }
}

export type Called<T> =
  // "keep": the session is as it was. A session: the new one, to save.
  | { ok: true; value: T; session: "keep" | Session }
  // "end": the reader is signed out.
  | { ok: false; reason: "signed-out"; session: "end" }
  | { ok: false; reason: "unavailable"; session: "keep" | Session };

type Deps<T> = { run: (accessToken: string) => Promise<T>; refresh: (session: Session) => Promise<Session> };

const isRefusal = (error: unknown) => error instanceof AuthError && error.kind === "refused";

export async function callForReader<T>(session: Session, deps: Deps<T>, now: Date = new Date()): Promise<Called<T>> {
  let current = session;
  let renewed = false;

  if (needsRefresh(session, now)) {
    try {
      current = await deps.refresh(session);
      renewed = true;
    } catch (error) {
      if (isRefusal(error)) return { ok: false, reason: "signed-out", session: "end" };
      // The sign-in service is down. The token that is there can still be good: try it.
    }
  }
  const kept = (): "keep" | Session => (renewed ? current : "keep");

  try {
    return { ok: true, value: await deps.run(current.accessToken), session: kept() };
  } catch (error) {
    if (!(error instanceof Refused)) return { ok: false, reason: "unavailable", session: kept() };
  }

  // The token was refused. A token that is new already gets no second try.
  if (renewed) return { ok: false, reason: "signed-out", session: "end" };
  try {
    current = await deps.refresh(session);
    renewed = true;
  } catch (error) {
    return isRefusal(error) ? { ok: false, reason: "signed-out", session: "end" } : { ok: false, reason: "unavailable", session: "keep" };
  }
  try {
    return { ok: true, value: await deps.run(current.accessToken), session: current };
  } catch (error) {
    return error instanceof Refused ? { ok: false, reason: "signed-out", session: "end" } : { ok: false, reason: "unavailable", session: current };
  }
}
