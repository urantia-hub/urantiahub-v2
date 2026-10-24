import Link from "next/link";
import { CONTACT_EMAIL } from "@/content/contact";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";

// The pages of the footer are in English. On a Spanish page the words are Spanish, and each link says so.
export function SiteFooter({ lang = "en" }: { lang?: Lang }) {
  const t = messages(lang);
  const hrefLang = lang === "en" ? undefined : "en";
  return (
    <footer className="site-footer">
      <span>{t.footerLine}</span>
      <nav className="links" aria-label={t.footerNav}>
        <Link href="/about" hrefLang={hrefLang}>
          {t.about}
        </Link>
        <Link href="/resources" hrefLang={hrefLang}>
          {t.resources}
        </Link>
        <Link href="/releases" hrefLang={hrefLang}>
          {t.releases}
        </Link>
        <Link href="/privacy" hrefLang={hrefLang}>
          {t.privacy}
        </Link>
        <Link href="/terms" hrefLang={hrefLang}>
          {t.terms}
        </Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        <span>
          {t.forDevelopers} <a href="https://urantia.dev">urantia.dev</a>
        </span>
      </nav>
    </footer>
  );
}
