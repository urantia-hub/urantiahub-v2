import Link from "next/link";
import { CONTACT_EMAIL } from "@/content/contact";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { pageHref } from "@/i18n/paths";

// Each link goes to the page in the language of the page. A page with no twin yet is English, and its link says so.
export function SiteFooter({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
  const link = (en: string, name: string) => {
    const href = pageHref(lang, en);
    return (
      <Link href={href} hrefLang={lang !== "en" && href === en ? "en" : undefined}>
        {name}
      </Link>
    );
  };
  return (
    <footer className="site-footer">
      <span>{t.footerLine}</span>
      <nav className="links" aria-label={t.footerNav}>
        {link("/about", t.about)}
        {link("/resources", t.resources)}
        {link("/releases", t.releases)}
        {link("/privacy", t.privacy)}
        {link("/terms", t.terms)}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <span>
          {t.forDevelopers} <a href="https://urantia.dev">urantia.dev</a>
        </span>
      </nav>
    </footer>
  );
}
