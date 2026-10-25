import Link from "next/link";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";
import { pageMetadata } from "@/seo/metadata";

export function aboutMetadata(lang: Lang) {
  const t = messages(lang).aboutPage;
  return pageMetadata({ title: t.metaTitle, description: t.metaDescription, path: lang === "es" ? "/es/acerca-de" : "/about", lang, twin: lang === "es" ? "/about" : "/es/acerca-de" });
}

// What the Papers are and what this site is, in the language of the page.
export function AboutView({ lang }: { lang: Lang }) {
  const t = messages(lang).aboutPage;
  return (
    <div className="prose">
      <h1>{t.title}</h1>

      <h2>{t.papersHeading}</h2>
      {t.papers.map((line) => (
        <p key={line}>{line}</p>
      ))}

      <h2>{t.hubHeading}</h2>
      <p>
        {t.read} <Link href={contentsHref(lang)}>{t.seeAll}</Link>
      </p>
      <p>
        {t.listen} <a href="https://open.spotify.com/show/7IDP6RsZbKtUjfEwLLHtuw">{t.listenSpotify}</a>.
      </p>
      <p>{t.independent}</p>

      <h2>{t.textHeading}</h2>
      <p>{t.publicDomain}</p>
      <p>
        {t.source} <a href="https://urantia.dev">urantia.dev</a>
        {t.sourceAfter}
      </p>
    </div>
  );
}
