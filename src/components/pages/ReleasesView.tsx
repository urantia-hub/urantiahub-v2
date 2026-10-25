import { RELEASES, releaseDate } from "@/content/releases";
import type { Lang } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { pageMetadata } from "@/seo/metadata";

export function releasesMetadata(lang: Lang) {
  const t = messages(lang).releasesPage;
  return pageMetadata({ title: t.title, description: t.lead, path: lang === "es" ? "/es/novedades" : "/releases", lang, twin: lang === "es" ? "/releases" : "/es/novedades" });
}

// What changed in UrantiaHub, the newest first, in the language of the page.
export function ReleasesView({ lang }: { lang: Lang }) {
  const t = messages(lang).releasesPage;
  return (
    <div className="prose listing">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      {RELEASES.map((release) => {
        const words = lang === "es" ? release.es : release;
        return (
          <article className="rel" key={`${release.date} ${release.title}`}>
            <time dateTime={release.date}>{releaseDate(release.date, lang)}</time>
            <h2>{words.title}</h2>
            <ul>
              {words.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
