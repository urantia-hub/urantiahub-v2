"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/icons";
import { paperById, paperPath, referenceHref } from "@/content/paper-index";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { readLastRead, subscribeToLastRead } from "@/reader/last-read";
import { usePlaceLabel } from "@/reader/place-label";

const none = () => null;

// In the settings: the way back to the paper and the section that the reader left.
// On that paper itself the row does not show: the reader is there.
export function ContinueRow({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
  const last = useSyncExternalStore(subscribeToLastRead, readLastRead, none);
  const label = usePlaceLabel(last, lang);
  const path = usePathname();
  const paper = last ? paperById(last.paperId, lang) : undefined;
  if (!last || !paper || path === paperPath(paper.id, lang)) return null;
  const where = [paper.id === "0" ? paper.title : t.paperNumber(paper.id), label].filter(Boolean).join(" · ");
  return (
    <div className="account-rows place-rows">
      <Link className="account-row" href={referenceHref({ paperId: last.paperId, sectionId: last.sectionId }, lang)}>
        <Icon name="arrow" />
        <span>
          {t.continue}
          <small>{where}</small>
        </span>
        <Icon name="paperAfter" />
      </Link>
    </div>
  );
}
