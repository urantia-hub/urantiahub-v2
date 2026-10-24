import Link from "next/link";
import { HomeContinue, HomePlace } from "@/components/home/HomeContinue";
import { PassageStage } from "@/components/home/PassageStage";
import { ReadLink } from "@/components/home/ReadLink";
import type { Passage } from "@/content";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { contentsHref } from "@/i18n/paths";
import { PLACE_INIT_SCRIPT } from "@/reader/place-script";
import { JsonLd } from "@/seo/JsonLd";
import { websiteJsonLd } from "@/seo/metadata";

// The home page in each language. The site is one site, so only the English page describes it.
export function HomeView({ lang, passages }: { lang: Lang; passages: Passage[] }) {
  const t = messages(lang);
  return (
    <div className="home">
      {lang === "en" && <JsonLd data={websiteJsonLd()} />}
      <h1>{t.thePapers}</h1>
      <PassageStage passages={passages} lang={lang} />
      {/* A reader who has a place gets "Continue reading" first. The page knows it before its first paint. */}
      <script dangerouslySetInnerHTML={{ __html: PLACE_INIT_SCRIPT }} />
      <div className="actions">
        <HomeContinue lang={lang} />
        <ReadLink lang={lang} />
        <Link className="text-link all-papers" href={contentsHref(lang)}>
          {t.allPapers}
        </Link>
        <Link className="text-link" href="/about" hrefLang={lang === "en" ? undefined : "en"}>
          {t.whatArePapers}
        </Link>
      </div>
      <HomePlace lang={lang} />
    </div>
  );
}
