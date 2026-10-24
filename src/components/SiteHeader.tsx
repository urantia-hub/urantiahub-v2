import Link from "next/link";
import { BookmarkMark } from "@/brand/BookmarkMark";
import type { Lang } from "@/i18n/lang";
import { spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref, searchHref } from "@/i18n/paths";
import { site } from "@/site";
import { Icon } from "./icons";
import { LanguagePill } from "./LanguagePill";
import { HeaderBack } from "./library/HeaderBack";
import { ReaderSettings } from "./ReaderSettings";
import { SearchShortcut } from "./search/SearchShortcut";

export function SiteHeader({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
  return (
    <header className="site-header">
      <div className="header-start">
        <Link className="brand" href={lang === "es" ? "/es" : "/"}>
          <BookmarkMark size={22} />
          <span className="brand-name">{site.name}</span>
        </Link>
        <HeaderBack />
      </div>
      <nav aria-label="Site">
        <Link href={contentsHref(lang)}>{t.papersNav}</Link>
        <Link href="/about" hrefLang={lang === "en" ? undefined : "en"}>
          {t.about}
        </Link>
        <Link className="icon-link search-link" href={searchHref(lang)} aria-label={t.searchTitle} title={`${t.searchTitle} ( / )`}>
          <Icon name="search" />
        </Link>
        <SearchShortcut />
        {/* Where the header has icons only: the way to the list of all papers. */}
        <Link className="icon-link contents-link" href={contentsHref(lang)} aria-label={t.allPapers} title={t.allPapers}>
          <Icon name="list" />
        </Link>
        <ReaderSettings />
        {/* Only a paper and the contents show it. See chrome.css. */}
        {spanishOn() && <LanguagePill lang={lang} />}
      </nav>
    </header>
  );
}
