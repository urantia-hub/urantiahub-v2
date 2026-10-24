"use client";

import Link from "next/link";
import { track } from "@/analytics";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";

export function ReadLink({ lang = "en" }: { lang?: Lang }) {
  return (
    <Link className="btn" href={contentsHref(lang)} onClick={() => track("home_read_clicked")}>
      {messages(lang).readThePapers}
    </Link>
  );
}
