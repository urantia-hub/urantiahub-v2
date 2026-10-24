import Link from "next/link";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";

// An address with no page, in the language of the part of the site that it is in.
export function NotFoundView({ lang }: { lang: Lang }) {
  const t = messages(lang);
  return (
    <div className="prose center">
      <h1>{t.notFoundTitle}</h1>
      <p>{t.notFoundLine}</p>
      <p>
        <Link className="btn" href={contentsHref(lang)}>
          {t.allPapers}
        </Link>
      </p>
    </div>
  );
}
