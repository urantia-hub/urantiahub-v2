import Link from "next/link";
import { BookmarkMark } from "@/brand/BookmarkMark";
import type { Lang } from "@/i18n/lang";
import { spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { homeHref, searchHref } from "@/i18n/paths";
import { site } from "@/site";
import { ContentsLink } from "./ContentsLink";
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
        <Link className="brand" href={homeHref(lang)}>
          <BookmarkMark size={22} />
          <span className="brand-name">{site.name}</span>
        </Link>
        <HeaderBack />
      </div>
      {/* The same four controls on every page, in this order, so none moves (Kelson, 2026-10-24). */}
      <nav aria-label={t.siteNav}>
        <Link className="icon-link search-link" data-slot="search" href={searchHref(lang)} aria-label={t.searchTitle} title={`${t.searchTitle} ( / )`}>
          <Icon name="search" />
        </Link>
        <SearchShortcut />
        <ContentsLink lang={lang} />
        {spanishOn() && <LanguagePill lang={lang} />}
        <ReaderSettings lang={lang} />
      </nav>
    </header>
  );
}
