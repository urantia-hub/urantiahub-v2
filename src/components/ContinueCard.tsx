"use client";

import Link from "next/link";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { accountState, serverAccountState, subscribeToAccount } from "@/account/client";
import { accountPlaceKnown, accountPlaceUnknown, subscribeToAccountPlace } from "@/account/sync";
import { Icon } from "@/components/icons";
import { paperById, referenceHref } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";
import { usePlaceLabel } from "@/reader/place-label";

const none = () => null;

// On the contents page: the way back to the paper and the section that the reader left.
export function ContinueCard({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
  const last = useSyncExternalStore(subscribeToLastRead, readLastRead, none);
  const paper = last ? paperById(last.paperId, lang) : undefined;
  const label = usePlaceLabel(last, lang);
  const shown = Boolean(last && paper);
  // The place of a signed-in reader can come from the account, a moment after the page.
  const account = useSyncExternalStore(subscribeToAccount, accountState, serverAccountState);
  const answered = useSyncExternalStore(subscribeToAccountPlace, accountPlaceKnown, accountPlaceUnknown);
  const coming = account.status === "in" && !answered;
  // The page kept room for this card before its first paint. With no card, and none to come, the room goes.
  useLayoutEffect(() => {
    if (shown || coming) document.documentElement.dataset.place = "";
    else delete document.documentElement.dataset.place;
  }, [shown, coming]);
  if (!last || !paper) return <div className="continue-slot" />;
  const where = [paper.id === "0" ? null : t.paperNumber(paper.id), label].filter(Boolean).join(" · ");
  return (
    <div className="continue-slot">
      <Link className="continue" href={referenceHref({ paperId: last.paperId, sectionId: last.sectionId }, lang)}>
        <span>
          <small>{t.continue}</small>
          <strong>{paper.title}</strong>
          {where && <em>{where}</em>}
        </span>
        <span className="go">
          <Icon name="paperAfter" />
        </span>
      </Link>
    </div>
  );
}
