"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref, pageHref } from "@/i18n/paths";
import { noticeWords } from "./NotificationsView";

const NOTICES_ON = process.env.NEXT_PUBLIC_NOTICES === "on";
type State = { status: "ask" } | { status: "busy" } | { status: "off"; kind: string } | { status: "failed" };

// The page of the link "Turn this email off". The email turns off with one press, not when the page
// loads: a mail scanner opens each link of an email.
export function EmailOff({ lang = "en" }: { lang?: Lang }) {
  const all = messages(lang);
  const t = all.notices;
  const names: Record<string, { title: string }> = noticeWords(t);
  const here = pageHref(lang, "/emails");
  const settingsPage = pageHref(lang, "/notifications");
  const inAddress = useSearchParams().get("off");
  // The proof is kept here, and it leaves the address at once: an address goes to the history of the
  // browser, and to what the page reports about itself.
  const [token] = useState(inAddress);
  const [state, setState] = useState<State>({ status: "ask" });
  useEffect(() => {
    if (inAddress) window.history.replaceState(window.history.state, "", here);
  }, [inAddress, here]);

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
          <p>{t.noEmails}</p>
          <p>{t.onlyCode}</p>
          <p>
            <Link className="btn" href={contentsHref(lang)}>
              {all.allPapers}
            </Link>
          </p>
        </>
      );
    }
    return (
      <>
        <p>{t.offByDefault}</p>
        <p>{t.onlyOther}</p>
        <p>
          <Link className="btn" href={settingsPage}>
            {t.settings}
          </Link>
        </p>
      </>
    );
  }
  if (state.status === "off") {
    return (
      <>
        <p role="status">{t.isOff(names[state.kind]?.title ?? t.thisEmail)}</p>
        {NOTICES_ON && (
          <p>
            <Link href={settingsPage}>{t.allSettings}</Link>
          </p>
        )}
      </>
    );
  }
  return (
    <>
      <p>{t.pressToStop}</p>
      <p>
        <button type="button" className="btn" disabled={state.status === "busy"} onClick={() => void turnOff()}>
          {t.turnOff}
        </button>
      </p>
      {state.status === "failed" && <p role="alert">{t.stillOnEmail}</p>}
    </>
  );
}
