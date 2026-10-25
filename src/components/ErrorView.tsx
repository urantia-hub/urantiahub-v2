"use client";

import Link from "next/link";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";

// A page that failed to render, in the language of the part of the site that it is in.
export function ErrorView({ lang, reset }: { lang: Lang; reset: () => void }) {
  const t = messages(lang);
  return (
    <div className="prose center">
      <h1>{t.errorTitle}</h1>
      <p>{t.errorBody}</p>
      <p>
        <button className="btn" type="button" onClick={reset}>
          {t.tryAgain}
        </button>
      </p>
      <p>
        <Link className="text-link" href={contentsHref(lang)}>
          {t.allPapers}
        </Link>
      </p>
    </div>
  );
}
