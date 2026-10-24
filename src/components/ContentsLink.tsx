"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";
import { Icon } from "./icons";

// The list icon of the header: the way to the list of all papers. On that page it shows as the current page.
export function ContentsLink({ lang }: { lang: Lang }) {
  const t = messages(lang);
  const href = contentsHref(lang);
  return (
    <Link className="icon-link contents-link" data-slot="contents" href={href} aria-label={t.allPapers} title={t.allPapers} aria-current={usePathname() === href ? "page" : undefined}>
      <Icon name="list" />
    </Link>
  );
}
