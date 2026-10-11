"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

const NOTICES_ON = process.env.NEXT_PUBLIC_NOTICES === "on";
const NAMES: Record<string, string> = { daily: "A passage each day", reminder: "A reminder of your place", releases: "New releases" };
type State = { status: "ask" } | { status: "busy" } | { status: "off"; kind: string } | { status: "failed" };

// The page of the link "Turn this email off". The email turns off with one press, not when the page
// loads: a mail scanner opens each link of an email.
export function EmailOff() {
  const token = useSearchParams().get("off");
  const [state, setState] = useState<State>({ status: "ask" });

  async function turnOff() {
    setState({ status: "busy" });
    try {
      const response = await fetch("/api/notices/off", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ token }) });
      const answer = (await response.json().catch(() => null)) as { off?: unknown; kind?: unknown } | null;
      setState(response.ok && answer?.off === true && typeof answer.kind === "string" ? { status: "off", kind: answer.kind } : { status: "failed" });
    } catch {
      setState({ status: "failed" });
    }
  }

  if (!token) {
    // While the notices are off, the page promises nothing more than what is true, and links to no page that is not there.
    if (!NOTICES_ON) {
      return (
        <>
          <p>UrantiaHub sends no daily emails at this time. You get none, and you do not need to do anything.</p>
          <p>The only email from UrantiaHub is the one with your code when you sign in.</p>
          <p>
            <Link className="btn" href="/papers">
              All papers
            </Link>
          </p>
        </>
      );
    }
    return (
      <>
        <p>Each email of UrantiaHub is off until you turn it on.</p>
        <p>The only other email is the one with your code when you sign in.</p>
        <p>
          <Link className="btn" href="/notifications">
            Notification settings
          </Link>
        </p>
      </>
    );
  }
  if (state.status === "off") {
    return (
      <>
        <p role="status">The email “{NAMES[state.kind] ?? "This email"}” is off. You get no more of it.</p>
        {NOTICES_ON && (
          <p>
            <Link href="/notifications">All notification settings</Link>
          </p>
        )}
      </>
    );
  }
  return (
    <>
      <p>Press the button to stop this email. You do not need to sign in.</p>
      <p>
        <button type="button" className="btn" disabled={state.status === "busy"} onClick={() => void turnOff()}>
          Turn this email off
        </button>
      </p>
      {state.status === "failed" && <p role="alert">The email is still on. Try again, or use the link in a newer email.</p>}
    </>
  );
}
