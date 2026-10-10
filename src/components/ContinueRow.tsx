"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { paperById, paperPath, referenceHref } from "@/content/paper-index";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";

const none = () => null;

// In the settings: the way back to the paper and the section that the reader left.
// On that paper itself the row does not show: the reader is there.
export function ContinueRow() {
  const last = useSyncExternalStore(subscribeToLastRead, readLastRead, none);
  const path = usePathname();
  const paper = last ? paperById(last.paperId) : undefined;
  if (!last || !paper || path === paperPath(paper.id)) return null;
  const where = [paper.id === "0" ? paper.title : `Paper ${paper.id}`, last.label].filter(Boolean).join(" · ");
  return (
    <div className="account-rows place-rows">
      <Link className="account-row" href={referenceHref({ paperId: last.paperId, sectionId: last.sectionId })}>
        <Icon name="arrow" />
        <span>
          Continue
          <small>{where}</small>
        </span>
        <Icon name="paperAfter" />
      </Link>
    </div>
  );
}
