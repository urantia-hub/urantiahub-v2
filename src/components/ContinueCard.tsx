"use client";

import Link from "next/link";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { paperById, referenceHref } from "@/content/paper-index";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";

const none = () => null;

// On the contents page: the way back to the paper and the section that the reader left.
export function ContinueCard() {
  const last = useSyncExternalStore(subscribeToLastRead, readLastRead, none);
  const paper = last ? paperById(last.paperId) : undefined;
  const shown = Boolean(last && paper);
  // The page kept room for this card before its first paint. With no card, the room goes.
  useLayoutEffect(() => {
    if (shown) document.documentElement.dataset.place = "";
    else delete document.documentElement.dataset.place;
  }, [shown]);
  if (!last || !paper) return <div className="continue-slot" />;
  const where = [paper.id === "0" ? null : `Paper ${paper.id}`, last.label].filter(Boolean).join(" · ");
  return (
    <div className="continue-slot">
      <Link className="continue" href={referenceHref({ paperId: last.paperId, sectionId: last.sectionId })}>
        <span>
          <small>Continue</small>
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
